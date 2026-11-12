import 'package:dartz/dartz.dart';

import '../../core/errors/failures.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_exception.dart';
import '../../core/network/failure_mapper.dart';
import '../../core/network/json.dart';
import '../../domain/entities/match_entity.dart';
import '../../domain/repositories/match_repository.dart';
import '../mappers/match_mapper.dart';

/// Match repository backed by the Zona Gol API (`/matches`, `/tournaments/{id}/matches`,
/// fixtures and playoffs generation).
class MatchRepositoryImpl implements MatchRepository {
  final ApiClient api;

  MatchRepositoryImpl({required this.api});

  @override
  Future<Either<Failure, List<MatchEntity>>> getPendingMatchesByLeague(
    String leagueId,
  ) async {
    try {
      final rows = await api.getList('/leagues/$leagueId/matches/pending', limit: 100);
      var matches = rows.map(MatchMapper.fromJson).toList();

      // The pending list carries no tournament names; the screen groups by them.
      try {
        final tournaments = await api.getAll('/leagues/$leagueId/tournaments');
        final names = {for (final t in tournaments) t.str('id'): t.strOrNull('name')};
        matches = matches
            .map((m) => names[m.tournamentId] == null
                ? m
                : m.copyWith(tournamentName: names[m.tournamentId]))
            .toList();
      } catch (_) {
        // Names are cosmetic: keep the matches without them.
      }
      return Right(matches);
    } catch (e) {
      return Left(failureFrom(e, 'No se pudieron cargar los partidos pendientes'));
    }
  }

  @override
  Future<Either<Failure, List<MatchEntity>>> getMatchesByTournament(
    String tournamentId, {
    MatchStatus? status,
    int? round,
    MatchPhase? phase,
  }) async {
    try {
      final rows = await api.getAll('/tournaments/$tournamentId/matches', query: {
        if (status != null) 'status': status.toDbString(),
        if (round != null) 'round': round,
        if (phase != null) 'phase': MatchMapper.phaseToApi(phase),
      });
      final matches = rows.map(MatchMapper.fromJson).toList()
        ..sort((a, b) {
          final byRound = (a.round ?? 0).compareTo(b.round ?? 0);
          if (byRound != 0) return byRound;
          final byDate = a.matchDate.compareTo(b.matchDate);
          if (byDate != 0) return byDate;
          return (a.matchTime ?? '').compareTo(b.matchTime ?? '');
        });
      return Right(matches);
    } catch (e) {
      return Left(failureFrom(e, 'No se pudieron cargar los partidos'));
    }
  }

  @override
  Future<Either<Failure, MatchEntity>> getMatchById(String matchId) async {
    try {
      var match = MatchMapper.fromJson(await api.getObject('/matches/$matchId'));
      try {
        final tournament = await api.getObject('/tournaments/${match.tournamentId}');
        match = match.copyWith(tournamentName: tournament.strOrNull('name'));
      } catch (_) {
        // The tournament name is only a subtitle.
      }
      return Right(match);
    } catch (e) {
      return Left(failureFrom(e, 'No se pudo cargar el partido'));
    }
  }

  @override
  Future<Either<Failure, void>> submitMatchResult(
    String matchId,
    MatchResultInput result,
  ) async {
    try {
      await api.post('/matches/$matchId/result', MatchMapper.resultToJson(result));
      return const Right(null);
    } on ApiException catch (e) {
      if (e.isForbidden) {
        return Left(PermissionFailure(
          'No tienes permiso o algún jugador no pertenece a los equipos del partido',
          e.code,
        ));
      }
      return Left(failureFrom(e));
    } catch (e) {
      return Left(failureFrom(e, 'No se pudo guardar el resultado'));
    }
  }

  @override
  Future<Either<Failure, void>> updateMatchStatus({
    required String matchId,
    required MatchStatus status,
  }) async {
    try {
      await api.patch('/matches/$matchId/status', {'status': status.toDbString()});
      return const Right(null);
    } on ApiException catch (e) {
      if (e.isConflict) {
        return Left(ValidationFailure(
          'El partido ya finalizó; corrige su resultado en lugar de cambiar el estado',
          e.code,
        ));
      }
      return Left(failureFrom(e));
    } catch (e) {
      return Left(failureFrom(e, 'No se pudo actualizar el estado'));
    }
  }

  @override
  Future<Either<Failure, void>> setMatchPublished(String matchId, bool isPublished) async {
    try {
      await api.patch('/matches/$matchId/publish', {'is_published': isPublished});
      return const Right(null);
    } catch (e) {
      return Left(failureFrom(e, 'No se pudo cambiar la publicación'));
    }
  }

  @override
  Future<Either<Failure, void>> publishRound({
    required String tournamentId,
    required int round,
    required bool isPublished,
  }) async {
    try {
      await api.post(
        '/tournaments/$tournamentId/rounds/$round/publish',
        {'is_published': isPublished},
      );
      return const Right(null);
    } catch (e) {
      return Left(failureFrom(e, 'No se pudo publicar la jornada'));
    }
  }

  @override
  Future<Either<Failure, MatchEntity>> createMatch(NewMatch match) async {
    try {
      final body = await api.post('/matches', MatchMapper.newMatchToJson(match));
      return Right(MatchMapper.fromJson((body as Map).cast<String, dynamic>()));
    } catch (e) {
      return Left(failureFrom(e, 'No se pudo crear el partido'));
    }
  }

  @override
  Future<Either<Failure, List<MatchEntity>>> createMatches(
    String tournamentId,
    List<NewMatch> matches,
  ) async {
    if (matches.isEmpty) return const Right([]);
    try {
      final body = await api.post('/tournaments/$tournamentId/matches/bulk', {
        'tournament_id': tournamentId,
        'matches': matches.map(MatchMapper.newMatchToJson).toList(),
      });
      return Right(_list(body).map(MatchMapper.fromJson).toList());
    } catch (e) {
      return Left(failureFrom(e, 'No se pudieron crear los partidos'));
    }
  }

  @override
  Future<Either<Failure, FixtureGenerationResult>> generateFixtures(
    FixtureRequest request,
  ) async {
    try {
      final body = await api.post(
        '/tournaments/${request.tournamentId}/fixtures/generate',
        MatchMapper.fixtureRequestToJson(request),
      );
      final map = (body as Map).cast<String, dynamic>();
      return Right(FixtureGenerationResult(
        matches: map.objList('matches').map(MatchMapper.fromJson).toList(),
        rounds: map.integer('rounds'),
      ));
    } catch (e) {
      return Left(failureFrom(e, 'No se pudo generar el calendario'));
    }
  }

  @override
  Future<Either<Failure, List<MatchEntity>>> generatePlayoffs(
    PlayoffRequest request,
  ) async {
    try {
      final body = await api.post(
        '/tournaments/${request.tournamentId}/playoffs/generate',
        MatchMapper.playoffRequestToJson(request),
      );
      return Right(_list(body).map(MatchMapper.fromJson).toList());
    } catch (e) {
      return Left(failureFrom(e, 'No se pudo generar la liguilla'));
    }
  }

  @override
  Future<Either<Failure, MatchEntity>> updateMatchSchedule(
    String matchId,
    MatchScheduleUpdate update,
  ) async {
    try {
      final body = await api.patch(
        '/matches/$matchId/schedule',
        MatchMapper.scheduleUpdateToJson(update),
      );
      return Right(MatchMapper.fromJson((body as Map).cast<String, dynamic>()));
    } on ApiException catch (e) {
      if (e.isConflict) {
        return Left(ValidationFailure(
          'Solo se pueden cambiar los equipos de un partido programado',
          e.code,
        ));
      }
      return Left(failureFrom(e));
    } catch (e) {
      return Left(failureFrom(e, 'No se pudo actualizar el partido'));
    }
  }

  @override
  Future<Either<Failure, void>> deleteMatches(List<String> matchIds) async {
    try {
      for (final id in matchIds) {
        await api.delete('/matches/$id');
      }
      return const Right(null);
    } on ApiException catch (e) {
      if (e.isConflict) {
        return Left(ValidationFailure(
          'Solo se pueden eliminar partidos programados (sin iniciar ni finalizar)',
          e.code,
        ));
      }
      return Left(failureFrom(e));
    } catch (e) {
      return Left(failureFrom(e, 'No se pudieron eliminar los partidos'));
    }
  }

  @override
  Future<Either<Failure, String?>> getRefereeReport(String matchId) async {
    try {
      final report = await api.getObject('/matches/$matchId/referee-report');
      return Right(report.strOrNull('general_observations'));
    } on ApiException catch (e) {
      if (e.isNotFound) return const Right(null);
      return Left(failureFrom(e));
    } catch (e) {
      return Left(failureFrom(e));
    }
  }

  static List<Map<String, dynamic>> _list(dynamic body) {
    final data = body is Map ? body['data'] : body;
    if (data is! List) return const [];
    return data.whereType<Map>().map((e) => e.cast<String, dynamic>()).toList();
  }
}
