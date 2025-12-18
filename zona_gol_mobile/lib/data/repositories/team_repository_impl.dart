import 'package:dartz/dartz.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/errors/failures.dart';
import '../../core/network/network_info.dart';
import '../../domain/entities/team_entity.dart';
import '../../domain/repositories/team_repository.dart';
import '../datasources/remote/supabase_client.dart';
import '../mappers/team_mapper.dart';

/// Team Repository Implementation
/// Handles all team-related data operations with Supabase
class TeamRepositoryImpl implements TeamRepository {
  final SupabaseClientService supabaseService;
  final NetworkInfo networkInfo;

  TeamRepositoryImpl({
    required this.supabaseService,
    required this.networkInfo,
  });

  @override
  Future<Either<Failure, List<TeamEntity>>> getAllTeams({
    bool onlyActive = false,
  }) async {
    try {
      print('📋 Fetching all teams (onlyActive: $onlyActive)...');

      // Check network connectivity
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No hay conexión a internet'));
      }

      var query = supabaseService.client.from('teams').select('''
        id, name, slug, league_id, tournament_id, owner_id, logo, description,
        is_active, created_at, updated_at, home_primary_color, home_secondary_color,
        home_accent_color, away_primary_color, away_secondary_color, away_accent_color, group_name
      ''');

      if (onlyActive) {
        query = query.eq('is_active', true);
      }

      final response = await query.order('name', ascending: true);

      final teams = (response as List)
          .map((json) => TeamMapper.fromJson(json as Map<String, dynamic>))
          .toList();

      print('✅ Successfully fetched ${teams.length} teams');
      return Right(teams);
    } on PostgrestException catch (e) {
      print('❌ PostgrestException fetching teams: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e) {
      print('❌ Unexpected error fetching teams: $e');
      return Left(ServerFailure('Error al obtener equipos'));
    }
  }

  @override
  Future<Either<Failure, TeamEntity>> getTeamById(String teamId) async {
    try {
      print('📋 Fetching team by ID: $teamId');

      // Check network connectivity
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No hay conexión a internet'));
      }

      final response = await supabaseService.client
          .from('teams')
          .select('''
            id, name, slug, league_id, tournament_id, owner_id, logo, description,
            is_active, created_at, updated_at, home_primary_color, home_secondary_color,
            home_accent_color, away_primary_color, away_secondary_color, away_accent_color, group_name
          ''')
          .eq('id', teamId)
          .single();

      final team = TeamMapper.fromJson(response as Map<String, dynamic>);

      print('✅ Successfully fetched team: ${team.name}');
      return Right(team);
    } on PostgrestException catch (e) {
      print('❌ PostgrestException fetching team by ID: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e) {
      print('❌ Unexpected error fetching team by ID: $e');
      return Left(ServerFailure('Error al obtener equipo'));
    }
  }

  @override
  Future<Either<Failure, List<TeamEntity>>> getTeamsByLeagueId(
    String leagueId, {
    bool onlyActive = false,
  }) async {
    try {
      print('📋 Fetching teams for league: $leagueId (onlyActive: $onlyActive)');

      // Check network connectivity
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No hay conexión a internet'));
      }

      var query = supabaseService.client
          .from('teams')
          .select('''
            id, name, slug, league_id, tournament_id, owner_id, logo, description,
            is_active, created_at, updated_at, home_primary_color, home_secondary_color,
            home_accent_color, away_primary_color, away_secondary_color, away_accent_color, group_name
          ''')
          .eq('league_id', leagueId);

      if (onlyActive) {
        query = query.eq('is_active', true);
      }

      final response = await query.order('name', ascending: true);

      final teams = (response as List)
          .map((json) => TeamMapper.fromJson(json as Map<String, dynamic>))
          .toList();

      print('✅ Successfully fetched ${teams.length} teams for league');
      return Right(teams);
    } on PostgrestException catch (e) {
      print('❌ PostgrestException fetching teams by league: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e) {
      print('❌ Unexpected error fetching teams by league: $e');
      return Left(ServerFailure('Error al obtener equipos de la liga'));
    }
  }

  @override
  Future<Either<Failure, List<TeamEntity>>> getTeamsByTournamentId(
    String tournamentId, {
    bool onlyActive = false,
  }) async {
    try {
      print('📋 Fetching teams for tournament: $tournamentId (onlyActive: $onlyActive)');

      // Check network connectivity
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No hay conexión a internet'));
      }

      var query = supabaseService.client
          .from('teams')
          .select('''
            id, name, slug, league_id, tournament_id, owner_id, logo, description,
            is_active, created_at, updated_at, home_primary_color, home_secondary_color,
            home_accent_color, away_primary_color, away_secondary_color, away_accent_color, group_name
          ''')
          .eq('tournament_id', tournamentId);

      if (onlyActive) {
        query = query.eq('is_active', true);
      }

      final response = await query.order('name', ascending: true);

      final teams = (response as List)
          .map((json) => TeamMapper.fromJson(json as Map<String, dynamic>))
          .toList();

      print('✅ Successfully fetched ${teams.length} teams for tournament');
      return Right(teams);
    } on PostgrestException catch (e) {
      print('❌ PostgrestException fetching teams by tournament: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e) {
      print('❌ Unexpected error fetching teams by tournament: $e');
      return Left(ServerFailure('Error al obtener equipos del torneo'));
    }
  }

  @override
  Future<Either<Failure, List<TeamEntity>>> getTeamsByOwnerId(
    String ownerId, {
    bool onlyActive = false,
  }) async {
    try {
      print('📋 Fetching teams for owner: $ownerId (onlyActive: $onlyActive)');

      // Check network connectivity
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No hay conexión a internet'));
      }

      var query = supabaseService.client
          .from('teams')
          .select('''
            id, name, slug, league_id, tournament_id, owner_id, logo, description,
            is_active, created_at, updated_at, home_primary_color, home_secondary_color,
            home_accent_color, away_primary_color, away_secondary_color, away_accent_color, group_name
          ''')
          .eq('owner_id', ownerId);

      if (onlyActive) {
        query = query.eq('is_active', true);
      }

      final response = await query.order('name', ascending: true);

      final teams = (response as List)
          .map((json) => TeamMapper.fromJson(json as Map<String, dynamic>))
          .toList();

      print('✅ Successfully fetched ${teams.length} teams for owner');
      return Right(teams);
    } on PostgrestException catch (e) {
      print('❌ PostgrestException fetching teams by owner: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e) {
      print('❌ Unexpected error fetching teams by owner: $e');
      return Left(ServerFailure('Error al obtener equipos del propietario'));
    }
  }

  @override
  Future<Either<Failure, List<TeamEntity>>> getTeamsByGroup(
    String tournamentId,
    String groupName,
  ) async {
    try {
      print('📋 Fetching teams for tournament: $tournamentId, group: $groupName');

      // Check network connectivity
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No hay conexión a internet'));
      }

      final response = await supabaseService.client
          .from('teams')
          .select('''
            id, name, slug, league_id, tournament_id, owner_id, logo, description,
            is_active, created_at, updated_at, home_primary_color, home_secondary_color,
            home_accent_color, away_primary_color, away_secondary_color, away_accent_color, group_name
          ''')
          .eq('tournament_id', tournamentId)
          .eq('group_name', groupName)
          .order('name', ascending: true);

      final teams = (response as List)
          .map((json) => TeamMapper.fromJson(json as Map<String, dynamic>))
          .toList();

      print('✅ Successfully fetched ${teams.length} teams for group');
      return Right(teams);
    } on PostgrestException catch (e) {
      print('❌ PostgrestException fetching teams by group: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e) {
      print('❌ Unexpected error fetching teams by group: $e');
      return Left(ServerFailure('Error al obtener equipos del grupo'));
    }
  }

  @override
  Future<Either<Failure, TeamEntity>> createTeam({
    required String name,
    required String slug,
    required String leagueId,
    required String ownerId,
    String? tournamentId,
    String? logo,
    String? description,
    String? homePrimaryColor,
    String? homeSecondaryColor,
    String? homeAccentColor,
    String? awayPrimaryColor,
    String? awaySecondaryColor,
    String? awayAccentColor,
    String? groupName,
  }) async {
    try {
      print('📋 Creating team: $name');

      // Check network connectivity
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No hay conexión a internet'));
      }

      final teamData = {
        'name': name,
        'slug': slug,
        'league_id': leagueId,
        'owner_id': ownerId,
        if (tournamentId != null) 'tournament_id': tournamentId,
        if (logo != null) 'logo': logo,
        if (description != null) 'description': description,
        if (homePrimaryColor != null) 'home_primary_color': homePrimaryColor,
        if (homeSecondaryColor != null) 'home_secondary_color': homeSecondaryColor,
        if (homeAccentColor != null) 'home_accent_color': homeAccentColor,
        if (awayPrimaryColor != null) 'away_primary_color': awayPrimaryColor,
        if (awaySecondaryColor != null) 'away_secondary_color': awaySecondaryColor,
        if (awayAccentColor != null) 'away_accent_color': awayAccentColor,
        if (groupName != null) 'group_name': groupName,
      };

      final response = await supabaseService.client
          .from('teams')
          .insert(teamData)
          .select('''
            id, name, slug, league_id, tournament_id, owner_id, logo, description,
            is_active, created_at, updated_at, home_primary_color, home_secondary_color,
            home_accent_color, away_primary_color, away_secondary_color, away_accent_color, group_name
          ''')
          .single();

      final createdTeam = TeamMapper.fromJson(response as Map<String, dynamic>);

      print('✅ Successfully created team: ${createdTeam.name}');
      return Right(createdTeam);
    } on PostgrestException catch (e) {
      print('❌ PostgrestException creating team: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e) {
      print('❌ Unexpected error creating team: $e');
      return Left(ServerFailure('Error al crear equipo'));
    }
  }

  @override
  Future<Either<Failure, TeamEntity>> updateTeam({
    required String teamId,
    String? name,
    String? slug,
    String? tournamentId,
    String? logo,
    String? description,
    bool? isActive,
    String? homePrimaryColor,
    String? homeSecondaryColor,
    String? homeAccentColor,
    String? awayPrimaryColor,
    String? awaySecondaryColor,
    String? awayAccentColor,
    String? groupName,
  }) async {
    try {
      print('📋 Updating team: $teamId');

      // Check network connectivity
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No hay conexión a internet'));
      }

      final updateData = <String, dynamic>{};
      if (name != null) updateData['name'] = name;
      if (slug != null) updateData['slug'] = slug;
      if (tournamentId != null) updateData['tournament_id'] = tournamentId;
      if (logo != null) updateData['logo'] = logo;
      if (description != null) updateData['description'] = description;
      if (isActive != null) updateData['is_active'] = isActive;
      if (homePrimaryColor != null) updateData['home_primary_color'] = homePrimaryColor;
      if (homeSecondaryColor != null) updateData['home_secondary_color'] = homeSecondaryColor;
      if (homeAccentColor != null) updateData['home_accent_color'] = homeAccentColor;
      if (awayPrimaryColor != null) updateData['away_primary_color'] = awayPrimaryColor;
      if (awaySecondaryColor != null) updateData['away_secondary_color'] = awaySecondaryColor;
      if (awayAccentColor != null) updateData['away_accent_color'] = awayAccentColor;
      if (groupName != null) updateData['group_name'] = groupName;

      final response = await supabaseService.client
          .from('teams')
          .update(updateData)
          .eq('id', teamId)
          .select('''
            id, name, slug, league_id, tournament_id, owner_id, logo, description,
            is_active, created_at, updated_at, home_primary_color, home_secondary_color,
            home_accent_color, away_primary_color, away_secondary_color, away_accent_color, group_name
          ''')
          .single();

      final updatedTeam = TeamMapper.fromJson(response as Map<String, dynamic>);

      print('✅ Successfully updated team: ${updatedTeam.name}');
      return Right(updatedTeam);
    } on PostgrestException catch (e) {
      print('❌ PostgrestException updating team: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e) {
      print('❌ Unexpected error updating team: $e');
      return Left(ServerFailure('Error al actualizar equipo'));
    }
  }

  @override
  Future<Either<Failure, void>> deleteTeam(String teamId) async {
    try {
      print('📋 Deleting team: $teamId');

      // Check network connectivity
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No hay conexión a internet'));
      }

      await supabaseService.client
          .from('teams')
          .delete()
          .eq('id', teamId);

      print('✅ Successfully deleted team');
      return const Right(null);
    } on PostgrestException catch (e) {
      print('❌ PostgrestException deleting team: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e) {
      print('❌ Unexpected error deleting team: $e');
      return Left(ServerFailure('Error al eliminar equipo'));
    }
  }

  @override
  Future<Either<Failure, List<TeamEntity>>> searchTeams(
    String query, {
    bool onlyActive = true,
  }) async {
    try {
      print('📋 Searching teams with query: $query');

      // Check network connectivity
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No hay conexión a internet'));
      }

      var supaQuery = supabaseService.client
          .from('teams')
          .select('''
            id, name, slug, league_id, tournament_id, owner_id, logo, description,
            is_active, created_at, updated_at, home_primary_color, home_secondary_color,
            home_accent_color, away_primary_color, away_secondary_color, away_accent_color, group_name
          ''')
          .ilike('name', '%$query%');

      if (onlyActive) {
        supaQuery = supaQuery.eq('is_active', true);
      }

      final response = await supaQuery.order('name', ascending: true);

      final teams = (response as List)
          .map((json) => TeamMapper.fromJson(json as Map<String, dynamic>))
          .toList();

      print('✅ Found ${teams.length} teams matching search');
      return Right(teams);
    } on PostgrestException catch (e) {
      print('❌ PostgrestException searching teams: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e) {
      print('❌ Unexpected error searching teams: $e');
      return Left(ServerFailure('Error al buscar equipos'));
    }
  }

  @override
  Future<Either<Failure, bool>> isSlugAvailable(
    String slug,
    String leagueId, {
    String? excludeTeamId,
  }) async {
    try {
      print('📋 Checking slug availability: $slug for league: $leagueId');

      // Check network connectivity
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No hay conexión a internet'));
      }

      var query = supabaseService.client
          .from('teams')
          .select('id')
          .eq('slug', slug)
          .eq('league_id', leagueId);

      if (excludeTeamId != null) {
        query = query.neq('id', excludeTeamId);
      }

      final response = await query;

      final isAvailable = (response as List).isEmpty;

      print('✅ Slug $slug is ${isAvailable ? 'available' : 'taken'}');
      return Right(isAvailable);
    } on PostgrestException catch (e) {
      print('❌ PostgrestException checking slug: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e) {
      print('❌ Unexpected error checking slug: $e');
      return Left(ServerFailure('Error al verificar slug'));
    }
  }

  @override
  Future<Either<Failure, TeamEntity>> assignToTournament(
    String teamId,
    String tournamentId, {
    String? groupName,
  }) async {
    try {
      print('📋 Assigning team $teamId to tournament $tournamentId');

      // Check network connectivity
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No hay conexión a internet'));
      }

      final updateData = {
        'tournament_id': tournamentId,
        if (groupName != null) 'group_name': groupName,
      };

      final response = await supabaseService.client
          .from('teams')
          .update(updateData)
          .eq('id', teamId)
          .select('''
            id, name, slug, league_id, tournament_id, owner_id, logo, description,
            is_active, created_at, updated_at, home_primary_color, home_secondary_color,
            home_accent_color, away_primary_color, away_secondary_color, away_accent_color, group_name
          ''')
          .single();

      final updatedTeam = TeamMapper.fromJson(response as Map<String, dynamic>);

      print('✅ Successfully assigned team to tournament');
      return Right(updatedTeam);
    } on PostgrestException catch (e) {
      print('❌ PostgrestException assigning team to tournament: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e) {
      print('❌ Unexpected error assigning team to tournament: $e');
      return Left(ServerFailure('Error al asignar equipo a torneo'));
    }
  }

  @override
  Future<Either<Failure, TeamEntity>> removeFromTournament(
    String teamId,
  ) async {
    try {
      print('📋 Removing team $teamId from tournament');

      // Check network connectivity
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No hay conexión a internet'));
      }

      final updateData = {
        'tournament_id': null,
        'group_name': null,
      };

      final response = await supabaseService.client
          .from('teams')
          .update(updateData)
          .eq('id', teamId)
          .select('''
            id, name, slug, league_id, tournament_id, owner_id, logo, description,
            is_active, created_at, updated_at, home_primary_color, home_secondary_color,
            home_accent_color, away_primary_color, away_secondary_color, away_accent_color, group_name
          ''')
          .single();

      final updatedTeam = TeamMapper.fromJson(response as Map<String, dynamic>);

      print('✅ Successfully removed team from tournament');
      return Right(updatedTeam);
    } on PostgrestException catch (e) {
      print('❌ PostgrestException removing team from tournament: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e) {
      print('❌ Unexpected error removing team from tournament: $e');
      return Left(ServerFailure('Error al remover equipo del torneo'));
    }
  }
}
