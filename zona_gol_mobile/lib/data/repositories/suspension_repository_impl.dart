import 'package:dartz/dartz.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/errors/failures.dart';
import '../../core/network/network_info.dart';
import '../../domain/entities/suspension_entity.dart';
import '../../domain/repositories/suspension_repository.dart';
import '../datasources/remote/supabase_client.dart';
import '../mappers/suspension_mapper.dart';

/// Suspension Repository Implementation
/// Manages player_suspensions table with Supabase
class SuspensionRepositoryImpl implements SuspensionRepository {
  final SupabaseClientService supabaseService;
  final NetworkInfo networkInfo;

  SuspensionRepositoryImpl({
    required this.supabaseService,
    required this.networkInfo,
  });

  @override
  Future<Either<Failure, List<SuspensionEntity>>> getSuspensionsByLeague(
    String leagueId,
  ) async {
    try {
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      final response = await supabaseService.client
          .from('player_suspensions')
          .select('''
            *, players(name, jersey_number, teams(name))
          ''')
          .eq('league_id', leagueId)
          .order('created_at', ascending: false);

      final rows = response as List;
      final suspensions = rows
          .map((row) => SuspensionMapper.fromRow(row as Map<String, dynamic>))
          .toList();

      return Right(suspensions);
    } on PostgrestException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(
          ServerFailure('Error al obtener suspensiones: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, SuspensionEntity>> createSuspension({
    required String playerId,
    required String teamId,
    required String leagueId,
    required String suspensionType,
    String? reason,
    required int matchesToServe,
  }) async {
    try {
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      final response = await supabaseService.client
          .from('player_suspensions')
          .insert({
            'player_id': playerId,
            'team_id': teamId,
            'league_id': leagueId,
            'suspension_type': suspensionType,
            'reason': reason,
            'matches_to_serve': matchesToServe,
            'matches_served': 0,
            'status': 'active',
          })
          .select('''
            *, players(name, jersey_number, teams(name))
          ''')
          .single();

      return Right(SuspensionMapper.fromRow(response));
    } on PostgrestException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Error al crear suspensi\u00f3n: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, void>> cancelSuspension(String suspensionId) async {
    try {
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      await supabaseService.client
          .from('player_suspensions')
          .update({
            'status': 'cancelled',
            'updated_at': DateTime.now().toIso8601String(),
          })
          .eq('id', suspensionId);

      return const Right(null);
    } on PostgrestException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(
          ServerFailure('Error al cancelar suspensi\u00f3n: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, void>> completeSuspension(
      String suspensionId) async {
    try {
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      // First get the matches_to_serve value
      final record = await supabaseService.client
          .from('player_suspensions')
          .select('matches_to_serve')
          .eq('id', suspensionId)
          .single();

      final matchesToServe = (record['matches_to_serve'] as num?)?.toInt() ?? 0;

      await supabaseService.client
          .from('player_suspensions')
          .update({
            'status': 'completed',
            'matches_served': matchesToServe,
            'updated_at': DateTime.now().toIso8601String(),
          })
          .eq('id', suspensionId);

      return const Right(null);
    } on PostgrestException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(
          ServerFailure('Error al completar suspensi\u00f3n: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, void>> updateSuspension(
    String suspensionId, {
    required int matchesToServe,
  }) async {
    try {
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      await supabaseService.client
          .from('player_suspensions')
          .update({
            'matches_to_serve': matchesToServe,
            'updated_at': DateTime.now().toIso8601String(),
          })
          .eq('id', suspensionId);

      return const Right(null);
    } on PostgrestException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(
          ServerFailure('Error al actualizar suspensi\u00f3n: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, void>> clearAllSuspensions(String leagueId) async {
    try {
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      await supabaseService.client
          .from('player_suspensions')
          .delete()
          .eq('league_id', leagueId);

      return const Right(null);
    } on PostgrestException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(
          ServerFailure('Error al limpiar suspensiones: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, List<Map<String, dynamic>>>> getLeaguePlayers(
    String leagueId,
  ) async {
    try {
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      final response = await supabaseService.client
          .from('players')
          .select('''
            id, name, jersey_number, team_id,
            teams!inner(id, name)
          ''')
          .eq('teams.league_id', leagueId)
          .eq('is_active', true)
          .order('name', ascending: true);

      final rows = (response as List).map((row) {
        final data = row as Map<String, dynamic>;
        final team = data['teams'] as Map<String, dynamic>?;
        return {
          'id': data['id'] as String,
          'name': data['name'] as String? ?? '',
          'jersey_number': data['jersey_number'] as int?,
          'team_id': data['team_id'] as String? ?? '',
          'team_name': team?['name'] as String? ?? '',
        };
      }).toList();

      return Right(rows);
    } on PostgrestException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(
          ServerFailure('Error al obtener jugadores: ${e.toString()}'));
    }
  }
}
