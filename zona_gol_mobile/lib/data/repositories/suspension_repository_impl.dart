import 'package:dartz/dartz.dart';

import '../../core/errors/failures.dart';
import '../../core/network/api_client.dart';
import '../../core/network/failure_mapper.dart';
import '../../core/network/json.dart';
import '../../domain/entities/suspension_entity.dart';
import '../../domain/repositories/suspension_repository.dart';
import '../mappers/suspension_mapper.dart';

/// Player suspensions backed by the Zona Gol API (`/suspensions`,
/// `/leagues/{id}/suspensions`, `/leagues/{id}/players`).
class SuspensionRepositoryImpl implements SuspensionRepository {
  final ApiClient api;

  SuspensionRepositoryImpl({required this.api});

  @override
  Future<Either<Failure, List<SuspensionEntity>>> getSuspensionsByLeague(
    String leagueId,
  ) async {
    try {
      // The endpoint returns every suspension of the league in one response
      // (newest first) and ignores limit/offset, so it is read once.
      final rows = await api.getList('/leagues/$leagueId/suspensions');
      return Right(rows.map(SuspensionMapper.fromJson).toList());
    } catch (e) {
      return Left(failureFrom(e, 'Error al obtener suspensiones'));
    }
  }

  @override
  Future<Either<Failure, SuspensionEntity>> createSuspension({
    required String playerId,
    required String teamId,
    required String suspensionType,
    required String reason,
    required int matchesToServe,
  }) async {
    try {
      final body = await api.post('/suspensions', {
        'player_id': playerId,
        'team_id': teamId,
        'suspension_type': suspensionType,
        'reason': reason,
        'matches_to_serve': matchesToServe,
      });
      return Right(SuspensionMapper.fromJson((body as Map).cast<String, dynamic>()));
    } catch (e) {
      return Left(failureFrom(e, 'Error al crear suspensión'));
    }
  }

  @override
  Future<Either<Failure, void>> cancelSuspension(String suspensionId) async {
    try {
      await api.post('/suspensions/$suspensionId/cancel');
      return const Right(null);
    } catch (e) {
      return Left(failureFrom(e, 'Error al cancelar suspensión'));
    }
  }

  @override
  Future<Either<Failure, void>> completeSuspension(String suspensionId) async {
    try {
      await api.post('/suspensions/$suspensionId/complete');
      return const Right(null);
    } catch (e) {
      return Left(failureFrom(e, 'Error al completar suspensión'));
    }
  }

  @override
  Future<Either<Failure, void>> updateSuspension(
    String suspensionId, {
    required int matchesToServe,
  }) async {
    try {
      await api.put('/suspensions/$suspensionId', {'matches_to_serve': matchesToServe});
      return const Right(null);
    } catch (e) {
      return Left(failureFrom(e, 'Error al actualizar suspensión'));
    }
  }

  @override
  Future<Either<Failure, void>> clearAllSuspensions(String leagueId) async {
    try {
      await api.delete('/leagues/$leagueId/suspensions');
      return const Right(null);
    } catch (e) {
      return Left(failureFrom(e, 'Error al limpiar suspensiones'));
    }
  }

  @override
  Future<Either<Failure, List<Map<String, dynamic>>>> getLeaguePlayers(
    String leagueId,
  ) async {
    try {
      // Active players only (the API's default), sorted by name.
      final rows = await api.getAll('/leagues/$leagueId/players');
      final players = rows
          .map((p) => <String, dynamic>{
                'id': p.str('id'),
                'name': p.str('name'),
                'jersey_number': p.intOrNull('jersey_number'),
                'team_id': p.str('team_id'),
                'team_name': p.str('team_name'),
              })
          .toList()
        ..sort((a, b) => (a['name'] as String).toLowerCase().compareTo((b['name'] as String).toLowerCase()));
      return Right(players);
    } catch (e) {
      return Left(failureFrom(e, 'Error al obtener jugadores'));
    }
  }
}
