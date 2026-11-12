import 'package:dartz/dartz.dart';

import '../../core/errors/failures.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_exception.dart';
import '../../core/network/failure_mapper.dart';
import '../../domain/entities/league_entity.dart';
import '../../domain/entities/league_stats_entity.dart';
import '../../domain/repositories/league_repository.dart';
import '../mappers/league_mapper.dart';

/// League repository backed by the Zona Gol API (`/leagues`, `/admin/stats`).
class LeagueRepositoryImpl implements LeagueRepository {
  final ApiClient api;

  LeagueRepositoryImpl({required this.api});

  static const _slugTaken = ValidationFailure('El slug ya está en uso, por favor elige otro', 'conflict');

  @override
  Future<Either<Failure, List<LeagueEntity>>> getAllLeagues({bool onlyActive = false}) async {
    try {
      final rows = await api.getAll(onlyActive ? '/leagues' : '/leagues/admin');
      return Right(rows.map(LeagueMapper.fromJson).toList());
    } catch (e) {
      return Left(failureFrom(e));
    }
  }

  @override
  Future<Either<Failure, LeagueEntity>> getLeagueById(String leagueId) async {
    try {
      return Right(LeagueMapper.fromJson(await api.getObject('/leagues/$leagueId')));
    } on ApiException catch (e) {
      if (e.isNotFound) return const Left(NotFoundFailure('Liga no encontrada'));
      return Left(failureFrom(e));
    } catch (e) {
      return Left(failureFrom(e));
    }
  }

  /// `POST /leagues` -> `PUT /leagues/{id}/admin` (links the admin user to the
  /// league) -> `PATCH /leagues/{id}/product-mode` when the plan is not the
  /// default, as the web does.
  @override
  Future<Either<Failure, LeagueEntity>> createLeague({
    required String name,
    required String slug,
    required String description,
    required String adminId,
    String? logo,
    String productMode = 'full',
  }) async {
    try {
      final created = await api.post(
        '/leagues',
        LeagueMapper.createJson(name: name, slug: slug, description: description, adminId: adminId, logo: logo),
      );
      var league = LeagueMapper.fromJson((created as Map).cast<String, dynamic>());
      await api.put('/leagues/${league.id}/admin', {'admin_id': adminId});
      if (productMode != league.productMode) {
        final updated = await api.patch('/leagues/${league.id}/product-mode', {'product_mode': productMode});
        league = LeagueMapper.fromJson((updated as Map).cast<String, dynamic>());
      }
      return Right(league);
    } on ApiException catch (e) {
      if (e.isConflict) return const Left(_slugTaken);
      return Left(failureFrom(e));
    } catch (e) {
      return Left(failureFrom(e));
    }
  }

  /// Fields go to `PATCH /leagues/{id}`; [isActive] to `PATCH /leagues/{id}/status`.
  @override
  Future<Either<Failure, LeagueEntity>> updateLeague({
    required String leagueId,
    String? name,
    String? slug,
    String? description,
    String? logo,
    bool? isActive,
  }) async {
    try {
      Map<String, dynamic>? json;
      final body = LeagueMapper.updateJson(name: name, slug: slug, description: description, logo: logo);
      if (body.isNotEmpty) {
        json = ((await api.patch('/leagues/$leagueId', body)) as Map).cast<String, dynamic>();
      }
      if (isActive != null) {
        json = ((await api.patch('/leagues/$leagueId/status', {'is_active': isActive})) as Map)
            .cast<String, dynamic>();
      }
      json ??= await api.getObject('/leagues/$leagueId');
      return Right(LeagueMapper.fromJson(json));
    } on ApiException catch (e) {
      if (e.isConflict) return const Left(_slugTaken);
      return Left(failureFrom(e));
    } catch (e) {
      return Left(failureFrom(e));
    }
  }

  @override
  Future<Either<Failure, void>> deleteLeague(String leagueId) async {
    try {
      await api.delete('/leagues/$leagueId');
      return const Right(null);
    } catch (e) {
      return Left(failureFrom(e));
    }
  }

  /// `GET /leagues/{id}/stats`, plus the league's matches for the figures the
  /// endpoint does not return (results split, goals this month, pending).
  @override
  Future<Either<Failure, LeagueStatsEntity>> getLeagueStats(String leagueId) async {
    try {
      final stats = await api.getObject('/leagues/$leagueId/stats');
      return Right(LeagueStatsMapper.fromJson(stats));
    } catch (e) {
      return Left(failureFrom(e, 'Error al cargar estadísticas'));
    }
  }

  @override
  Future<Either<Failure, GlobalStatsEntity>> getGlobalStats() async {
    try {
      return Right(LeagueStatsMapper.globalFromJson(await api.getObject('/admin/stats')));
    } catch (e) {
      return Left(failureFrom(e, 'Error al cargar estadísticas'));
    }
  }
}
