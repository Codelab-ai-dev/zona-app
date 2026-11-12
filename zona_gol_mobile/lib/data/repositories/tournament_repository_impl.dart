import 'package:dartz/dartz.dart';

import '../../core/errors/failures.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_exception.dart';
import '../../core/network/failure_mapper.dart';
import '../../domain/entities/tournament_entity.dart';
import '../../domain/repositories/tournament_repository.dart';
import '../mappers/tournament_mapper.dart';

/// Tournament repository backed by the Zona Gol API (`/tournaments`).
class TournamentRepositoryImpl implements TournamentRepository {
  final ApiClient api;

  TournamentRepositoryImpl({required this.api});

  @override
  Future<Either<Failure, TournamentEntity>> getTournamentById(String tournamentId) async {
    try {
      return Right(TournamentMapper.fromJson(await api.getObject('/tournaments/$tournamentId')));
    } on ApiException catch (e) {
      if (e.isNotFound) return const Left(NotFoundFailure('Torneo no encontrado'));
      return Left(failureFrom(e));
    } catch (e) {
      return Left(failureFrom(e));
    }
  }

  @override
  Future<Either<Failure, List<TournamentEntity>>> getTournamentsByLeagueId(
    String leagueId, {
    bool onlyActive = false,
  }) async {
    try {
      final rows = await api.getAll('/leagues/$leagueId/tournaments');
      final tournaments = rows.map(TournamentMapper.fromJson).where((t) => !onlyActive || t.isActive).toList()
        ..sort((a, b) => b.startDate.compareTo(a.startDate));
      return Right(tournaments);
    } catch (e) {
      return Left(failureFrom(e));
    }
  }

  @override
  Future<Either<Failure, TournamentEntity>> createTournament({
    required String name,
    required String leagueId,
    required DateTime startDate,
    required DateTime endDate,
    int? maxPlayers,
    int maxCoachingStaff = 10,
    TournamentFormat format = TournamentFormat.league,
    int? numberOfGroups,
    int teamsAdvancingPerGroup = 2,
    int roundsPerSeason = 1,
    bool hasThirdPlaceMatch = false,
  }) async {
    try {
      final created = await api.post(
        '/tournaments',
        TournamentMapper.createJson(
          name: name,
          leagueId: leagueId,
          startDate: startDate,
          endDate: endDate,
          maxPlayers: maxPlayers,
          maxCoachingStaff: maxCoachingStaff,
          format: format,
          numberOfGroups: numberOfGroups,
          teamsAdvancingPerGroup: teamsAdvancingPerGroup,
          roundsPerSeason: roundsPerSeason,
          hasThirdPlaceMatch: hasThirdPlaceMatch,
        ),
      );
      return Right(TournamentMapper.fromJson((created as Map).cast<String, dynamic>()));
    } on ApiException catch (e) {
      if (e.isConflict) return const Left(ValidationFailure('Ya existe un torneo con esos datos', 'conflict'));
      return Left(failureFrom(e));
    } catch (e) {
      return Left(failureFrom(e));
    }
  }
}
