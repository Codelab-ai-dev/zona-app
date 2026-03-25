import 'dart:convert';

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:http/http.dart' as http;
import 'package:logger/logger.dart';

import '../../../core/config/app_config.dart';
import '../../../core/utils/fixture_config.dart';
import '../../../core/utils/fixture_generator.dart';
import '../../../domain/entities/team_entity.dart';
import '../../../domain/entities/tournament_entity.dart';
import '../../../domain/repositories/match_repository.dart';
import '../../../domain/usecases/get_pending_matches_usecase.dart';
import '../../../domain/usecases/update_match_result_usecase.dart';
import 'match_event.dart';
import 'match_state.dart';

/// Match Bloc
/// Manages match state and handles match-related events
class MatchBloc extends Bloc<MatchEvent, MatchState> {
  final GetPendingMatchesUseCase getPendingMatchesUseCase;
  final UpdateMatchResultUseCase updateMatchResultUseCase;
  final MatchRepository matchRepository;
  final Logger logger = Logger();

  MatchBloc({
    required this.getPendingMatchesUseCase,
    required this.updateMatchResultUseCase,
    required this.matchRepository,
  }) : super(const MatchInitial()) {
    on<LoadPendingMatchesEvent>(_onLoadPendingMatches);
    on<LoadMatchesByTournamentEvent>(_onLoadMatchesByTournament);
    on<UpdateMatchResultEvent>(_onUpdateMatchResult);
    on<ResetMatchStateEvent>(_onResetMatchState);
    on<GenerateFixturesEvent>(_onGenerateFixtures);
    on<GenerateFixturesCpSatEvent>(_onGenerateFixturesCpSat);
    on<SaveFixturesEvent>(_onSaveFixtures);
    on<SaveManualRoundEvent>(_onSaveManualRound);
    on<CreateMatchEvent>(_onCreateMatch);
  }

  /// Load pending matches by league
  Future<void> _onLoadPendingMatches(
    LoadPendingMatchesEvent event,
    Emitter<MatchState> emit,
  ) async {
    emit(const MatchLoading());
    logger.i('Loading pending matches for league: ${event.leagueId}');

    final result = await getPendingMatchesUseCase(
      GetPendingMatchesParams(leagueId: event.leagueId),
    );

    result.fold(
      (failure) {
        logger.e('Error loading pending matches: ${failure.message}');
        emit(MatchError(failure.message ?? 'Error al cargar partidos'));
      },
      (matches) {
        logger.i('Successfully loaded ${matches.length} pending matches');
        emit(MatchesLoaded(matches));
      },
    );
  }

  /// Load matches by tournament
  Future<void> _onLoadMatchesByTournament(
    LoadMatchesByTournamentEvent event,
    Emitter<MatchState> emit,
  ) async {
    emit(const MatchLoading());
    logger.i('Loading matches for tournament: ${event.tournamentId}');

    final result = await matchRepository.getMatchesByTournament(event.tournamentId);

    result.fold(
      (failure) {
        logger.e('Error loading matches: ${failure.message}');
        emit(MatchError(failure.message ?? 'Error al cargar partidos'));
      },
      (matches) {
        logger.i('Successfully loaded ${matches.length} matches');
        emit(MatchesLoaded(matches));
      },
    );
  }

  /// Update match result
  Future<void> _onUpdateMatchResult(
    UpdateMatchResultEvent event,
    Emitter<MatchState> emit,
  ) async {
    emit(MatchUpdating(event.matchId));
    logger.i('Updating match result: ${event.matchId} (${event.homeScore} - ${event.awayScore})');

    final result = await updateMatchResultUseCase(
      UpdateMatchResultParams(
        matchId: event.matchId,
        homeScore: event.homeScore,
        awayScore: event.awayScore,
      ),
    );

    result.fold(
      (failure) {
        logger.e('Error updating match result: ${failure.message}');
        emit(MatchError(failure.message ?? 'Error al actualizar resultado'));
      },
      (match) {
        logger.i('Successfully updated match result: ${match.resultText}');
        emit(MatchResultUpdated(match));
      },
    );
  }

  /// Reset match state
  Future<void> _onResetMatchState(
    ResetMatchStateEvent event,
    Emitter<MatchState> emit,
  ) async {
    logger.i('Resetting match state');
    emit(const MatchInitial());
  }

  /// Generate fixtures for a tournament
  Future<void> _onGenerateFixtures(
    GenerateFixturesEvent event,
    Emitter<MatchState> emit,
  ) async {
    emit(const MatchLoading());
    logger.i('Generating fixtures for tournament: ${event.tournament.name}');

    try {
      // 1. Get existing match pairs to avoid duplicates
      final existingResult = await matchRepository.getExistingMatchPairs(
        event.config.tournamentId,
      );

      Set<String> existingPairs = {};
      existingResult.fold(
        (failure) {
          logger.w('Could not fetch existing matches, proceeding without dedup: ${failure.message}');
        },
        (pairs) {
          existingPairs = FixtureGenerator.buildExistingPairSet(
            pairs,
            event.config.doubleRound,
          );
          logger.i('Found ${existingPairs.length} existing match pairs');
        },
      );

      // 2. Generate round-robin based on tournament format
      List<FixtureRound> rounds;
      if (event.tournament.format == TournamentFormat.groupKnockout) {
        rounds = FixtureGenerator.generateGroupRoundRobin(
          event.teams,
          doubleRound: event.config.doubleRound,
        );
      } else {
        rounds = FixtureGenerator.generateRoundRobin(
          event.teams,
          doubleRound: event.config.doubleRound,
        );
      }

      // 3. Filter existing matches
      if (existingPairs.isNotEmpty) {
        rounds = FixtureGenerator.filterExistingMatches(
          rounds,
          existingPairs,
          event.config.doubleRound,
        );
      }

      if (rounds.isEmpty) {
        emit(const MatchError('No hay partidos nuevos para generar. Todos los enfrentamientos ya existen.'));
        return;
      }

      // 4. Validate capacity
      final totalMatches = rounds.fold<int>(0, (sum, r) => sum + r.matches.length);
      final capacityError = FixtureGenerator.validateCapacity(event.config, totalMatches);
      if (capacityError != null) {
        emit(MatchError(capacityError));
        return;
      }

      // 5. Assign schedule
      final fixtures = FixtureGenerator.assignSchedule(rounds, event.config);

      final totalRounds = fixtures.isEmpty
          ? 0
          : fixtures.map((f) => f.round).reduce((a, b) => a > b ? a : b);

      logger.i('Generated ${fixtures.length} fixtures in $totalRounds rounds');
      emit(FixturesGenerated(
        fixtures: fixtures,
        totalRounds: totalRounds,
        totalMatches: fixtures.length,
      ));
    } catch (e, stackTrace) {
      logger.e('Error generating fixtures: $e', stackTrace: stackTrace);
      emit(MatchError('Error al generar fixture: ${e.toString()}'));
    }
  }

  /// Generate fixtures using CP-SAT solver (server-side)
  Future<void> _onGenerateFixturesCpSat(
    GenerateFixturesCpSatEvent event,
    Emitter<MatchState> emit,
  ) async {
    emit(const MatchLoading());
    logger.i('Generating fixtures with CP-SAT for tournament: ${event.tournament.name}');

    try {
      // 1. Get existing matches for dedup context
      final existingResult = await matchRepository.getExistingMatchPairs(
        event.config.tournamentId,
      );

      List<Map<String, dynamic>> existingMatchesList = [];
      existingResult.fold(
        (failure) {
          logger.w('Could not fetch existing matches: ${failure.message}');
        },
        (pairs) {
          existingMatchesList = pairs;
          logger.i('Found ${pairs.length} existing match pairs for CP-SAT');
        },
      );

      // 2. Call CP-SAT API
      final requestBody = {
        'teams': event.teams
            .map((t) => {'id': t.id, 'name': t.name})
            .toList(),
        'existingMatches': existingMatchesList
            .map((m) => {
                  'homeTeamId': m['home_team_id'],
                  'awayTeamId': m['away_team_id'],
                  'round': m['round'],
                })
            .toList(),
        'isDoubleRound': event.config.doubleRound,
      };

      final url = Uri.parse('${AppConfig.apiBaseUrl}/api/fixtures/generate');
      logger.i('Calling CP-SAT API: $url');

      final response = await http
          .post(
            url,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode(requestBody),
          )
          .timeout(const Duration(seconds: 45));

      if (response.statusCode != 200) {
        logger.e('CP-SAT API error: ${response.statusCode} ${response.body}');
        emit(MatchError('Error del servidor CP-SAT: ${response.statusCode}'));
        return;
      }

      final responseData = jsonDecode(response.body) as Map<String, dynamic>;

      if (responseData['success'] != true) {
        final error = responseData['error'] ?? 'Error desconocido';
        emit(MatchError('CP-SAT: $error'));
        return;
      }

      // 3. Parse CP-SAT rounds into FixtureRound format
      final data = responseData['data'] as Map<String, dynamic>;
      final cpSatRounds = data['rounds'] as List;

      if (cpSatRounds.isEmpty) {
        emit(const MatchError('CP-SAT no generó partidos. Todos los enfrentamientos ya existen.'));
        return;
      }

      // Build team lookup
      final teamMap = {for (final t in event.teams) t.id: t};

      final List<FixtureRound> rounds = [];
      for (final roundData in cpSatRounds) {
        final roundNum = roundData['round'] as int;
        final matches = roundData['matches'] as List;
        final byeTeamId = roundData['byeTeamId'] as String?;

        final matchPairs = <FixtureMatchPair>[];
        for (final m in matches) {
          final homeId = m['homeTeamId'] as String;
          final awayId = m['awayTeamId'] as String;
          final home = teamMap[homeId];
          final away = teamMap[awayId];
          if (home != null && away != null) {
            matchPairs.add(FixtureMatchPair(home: home, away: away));
          }
        }

        if (matchPairs.isNotEmpty) {
          rounds.add(FixtureRound(
            round: roundNum,
            matches: matchPairs,
            byeTeam: byeTeamId != null ? teamMap[byeTeamId] : null,
          ));
        }
      }

      if (rounds.isEmpty) {
        emit(const MatchError('No se generaron partidos válidos con CP-SAT.'));
        return;
      }

      // 4. Validate capacity
      final totalMatches = rounds.fold<int>(0, (sum, r) => sum + r.matches.length);
      final capacityError = FixtureGenerator.validateCapacity(event.config, totalMatches);
      if (capacityError != null) {
        emit(MatchError(capacityError));
        return;
      }

      // 5. Assign schedule (dates, times, fields)
      final fixtures = FixtureGenerator.assignSchedule(rounds, event.config);

      final totalRounds = fixtures.isEmpty
          ? 0
          : fixtures.map((f) => f.round).reduce((a, b) => a > b ? a : b);

      logger.i('CP-SAT generated ${fixtures.length} fixtures in $totalRounds rounds');
      emit(FixturesGenerated(
        fixtures: fixtures,
        totalRounds: totalRounds,
        totalMatches: fixtures.length,
      ));
    } catch (e, stackTrace) {
      logger.e('Error with CP-SAT fixture generation: $e', stackTrace: stackTrace);
      emit(MatchError('Error al generar con CP-SAT: ${e.toString()}'));
    }
  }

  /// Save generated fixtures to the database
  Future<void> _onSaveFixtures(
    SaveFixturesEvent event,
    Emitter<MatchState> emit,
  ) async {
    emit(const FixturesSaving());
    logger.i('Saving ${event.matches.length} fixtures...');

    final result = await matchRepository.createMatches(event.matches);

    result.fold(
      (failure) {
        logger.e('Error saving fixtures: ${failure.message}');
        emit(MatchError(failure.message));
      },
      (matches) {
        logger.i('Successfully saved ${matches.length} matches');
        emit(FixturesSaved(matchCount: matches.length));
      },
    );
  }

  /// Save a manually created/edited round
  Future<void> _onSaveManualRound(
    SaveManualRoundEvent event,
    Emitter<MatchState> emit,
  ) async {
    emit(const FixturesSaving());
    logger.i(
      'Saving manual round: ${event.matchesToCreate.length} creates, '
      '${event.matchesToUpdate.length} updates, '
      '${event.matchIdsToDelete.length} deletes',
    );

    try {
      int totalSaved = 0;

      // 1. Delete matches
      if (event.matchIdsToDelete.isNotEmpty) {
        final deleteResult = await matchRepository.deleteMatches(event.matchIdsToDelete);
        final deleteOk = deleteResult.fold(
          (failure) {
            logger.e('Error deleting matches: ${failure.message}');
            emit(MatchError(failure.message));
            return false;
          },
          (_) => true,
        );
        if (!deleteOk) return;
        logger.i('Deleted ${event.matchIdsToDelete.length} matches');
      }

      // 2. Update matches
      for (final update in event.matchesToUpdate) {
        final updateResult = await matchRepository.updateMatchDetails(
          matchId: update.matchId,
          data: update.data,
        );
        final updateOk = updateResult.fold(
          (failure) {
            logger.e('Error updating match ${update.matchId}: ${failure.message}');
            emit(MatchError(failure.message));
            return false;
          },
          (_) {
            totalSaved++;
            return true;
          },
        );
        if (!updateOk) return;
      }

      // 3. Create new matches
      if (event.matchesToCreate.isNotEmpty) {
        final createResult = await matchRepository.createMatches(event.matchesToCreate);
        final createOk = createResult.fold(
          (failure) {
            logger.e('Error creating matches: ${failure.message}');
            emit(MatchError(failure.message));
            return false;
          },
          (created) {
            totalSaved += created.length;
            return true;
          },
        );
        if (!createOk) return;
      }

      logger.i('Manual round saved: $totalSaved matches processed');
      emit(FixturesSaved(matchCount: totalSaved));
    } catch (e, stackTrace) {
      logger.e('Error saving manual round: $e', stackTrace: stackTrace);
      emit(MatchError('Error al guardar jornada: ${e.toString()}'));
    }
  }

  /// Create a single match
  Future<void> _onCreateMatch(
    CreateMatchEvent event,
    Emitter<MatchState> emit,
  ) async {
    emit(const MatchLoading());
    logger.i('Creating match: ${event.homeTeamId} vs ${event.awayTeamId}');

    try {
      final matchData = <String, dynamic>{
        'tournament_id': event.tournamentId,
        'home_team_id': event.homeTeamId,
        'away_team_id': event.awayTeamId,
        'match_date': event.matchDate.toIso8601String().split('T')[0],
        'status': 'scheduled',
        'phase': 'regular',
        if (event.matchTime != null) 'match_time': event.matchTime,
        if (event.fieldNumber != null) 'field_number': event.fieldNumber,
        if (event.round != null) 'round': event.round,
      };

      final result = await matchRepository.createMatches([matchData]);

      result.fold(
        (failure) {
          logger.e('Error creating match: ${failure.message}');
          emit(MatchError(failure.message ?? 'Error al crear partido'));
        },
        (_) {
          logger.i('Match created successfully');
          emit(const MatchCreated());
        },
      );
    } catch (e, stackTrace) {
      logger.e('Error creating match: $e', stackTrace: stackTrace);
      emit(MatchError('Error al crear partido: ${e.toString()}'));
    }
  }
}
