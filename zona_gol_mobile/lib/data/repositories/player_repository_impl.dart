import 'package:dartz/dartz.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/errors/failures.dart';
import '../../core/network/network_info.dart';
import '../../domain/entities/player_entity.dart';
import '../../domain/repositories/player_repository.dart';
import '../datasources/remote/supabase_client.dart';
import '../mappers/player_mapper.dart';

/// Player Repository Implementation
/// Handles all player-related data operations with Supabase
class PlayerRepositoryImpl implements PlayerRepository {
  final SupabaseClientService supabaseService;
  final NetworkInfo networkInfo;

  static const _selectFields = '''
    id, team_id, name, jersey_number, photo, birth_date, position,
    is_active, id_document_url, id_verified, created_at, updated_at
  ''';

  PlayerRepositoryImpl({
    required this.supabaseService,
    required this.networkInfo,
  });

  @override
  Future<Either<Failure, List<PlayerEntity>>> getPlayersByTeamId(
    String teamId, {
    bool onlyActive = false,
  }) async {
    try {
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No hay conexión a internet'));
      }

      var query = supabaseService.client
          .from('players')
          .select(_selectFields)
          .eq('team_id', teamId);

      if (onlyActive) {
        query = query.eq('is_active', true);
      }

      final response = await query.order('jersey_number', ascending: true);

      final players = (response as List)
          .map((json) => PlayerMapper.fromJson(json as Map<String, dynamic>))
          .toList();

      return Right(players);
    } on PostgrestException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Error al obtener jugadores'));
    }
  }

  @override
  Future<Either<Failure, PlayerEntity>> getPlayerById(String playerId) async {
    try {
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No hay conexión a internet'));
      }

      final response = await supabaseService.client
          .from('players')
          .select(_selectFields)
          .eq('id', playerId)
          .single();

      final player = PlayerMapper.fromJson(response);
      return Right(player);
    } on PostgrestException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Error al obtener jugador'));
    }
  }

  @override
  Future<Either<Failure, PlayerEntity>> createPlayer({
    required String name,
    required String teamId,
    String? position,
    int? jerseyNumber,
    String? photo,
    DateTime? birthDate,
    String? idDocumentUrl,
  }) async {
    try {
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No hay conexión a internet'));
      }

      final playerData = {
        'name': name,
        'team_id': teamId,
        if (position != null) 'position': position,
        if (jerseyNumber != null) 'jersey_number': jerseyNumber,
        if (photo != null) 'photo': photo,
        if (birthDate != null) 'birth_date': birthDate.toIso8601String().split('T')[0],
        if (idDocumentUrl != null) 'id_document_url': idDocumentUrl,
      };

      final response = await supabaseService.client
          .from('players')
          .insert(playerData)
          .select(_selectFields)
          .single();

      final player = PlayerMapper.fromJson(response);
      return Right(player);
    } on PostgrestException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Error al crear jugador'));
    }
  }

  @override
  Future<Either<Failure, PlayerEntity>> updatePlayer({
    required String playerId,
    String? name,
    String? position,
    int? jerseyNumber,
    String? photo,
    DateTime? birthDate,
    bool? isActive,
    String? idDocumentUrl,
    bool? idVerified,
  }) async {
    try {
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No hay conexión a internet'));
      }

      final updateData = <String, dynamic>{};
      if (name != null) updateData['name'] = name;
      if (position != null) updateData['position'] = position;
      if (jerseyNumber != null) updateData['jersey_number'] = jerseyNumber;
      if (photo != null) updateData['photo'] = photo;
      if (birthDate != null) updateData['birth_date'] = birthDate.toIso8601String().split('T')[0];
      if (isActive != null) updateData['is_active'] = isActive;
      if (idDocumentUrl != null) updateData['id_document_url'] = idDocumentUrl;
      if (idVerified != null) updateData['id_verified'] = idVerified;

      final response = await supabaseService.client
          .from('players')
          .update(updateData)
          .eq('id', playerId)
          .select(_selectFields)
          .single();

      final player = PlayerMapper.fromJson(response);
      return Right(player);
    } on PostgrestException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Error al actualizar jugador'));
    }
  }

  @override
  Future<Either<Failure, void>> deletePlayer(String playerId) async {
    try {
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No hay conexión a internet'));
      }

      // Soft delete: set is_active to false
      await supabaseService.client
          .from('players')
          .update({'is_active': false})
          .eq('id', playerId);

      return const Right(null);
    } on PostgrestException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Error al eliminar jugador'));
    }
  }

  @override
  Future<Either<Failure, List<PlayerEntity>>> searchPlayers(
    String query, {
    String? teamId,
  }) async {
    try {
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No hay conexión a internet'));
      }

      var supaQuery = supabaseService.client
          .from('players')
          .select(_selectFields)
          .ilike('name', '%$query%');

      if (teamId != null) {
        supaQuery = supaQuery.eq('team_id', teamId);
      }

      final response = await supaQuery.order('name', ascending: true);

      final players = (response as List)
          .map((json) => PlayerMapper.fromJson(json as Map<String, dynamic>))
          .toList();

      return Right(players);
    } on PostgrestException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Error al buscar jugadores'));
    }
  }

  @override
  Future<Either<Failure, List<PlayerEntity>>> getPlayersByLeagueId(
    String leagueId, {
    bool? idVerified,
  }) async {
    try {
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No hay conexión a internet'));
      }

      // Get teams in this league first
      final teamsResponse = await supabaseService.client
          .from('teams')
          .select('id')
          .eq('league_id', leagueId);

      final teamIds = (teamsResponse as List)
          .map((t) => t['id'] as String)
          .toList();

      if (teamIds.isEmpty) {
        return const Right([]);
      }

      // Get players for all teams with team name join
      var query = supabaseService.client
          .from('players')
          .select('$_selectFields, teams!inner(name)')
          .inFilter('team_id', teamIds);

      if (idVerified != null) {
        query = query.eq('id_verified', idVerified);
      }

      final response = await query.order('name', ascending: true);

      final players = (response as List).map((json) {
        final teamData = json['teams'] as Map<String, dynamic>?;
        final player = PlayerMapper.fromJson(json as Map<String, dynamic>);
        // Attach team name via copyWith isn't available directly,
        // but the entity doesn't have teamName field.
        // We'll return the player as-is; the screen can look up team name.
        return player;
      }).toList();

      return Right(players);
    } on PostgrestException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Error al obtener jugadores de la liga'));
    }
  }
}
