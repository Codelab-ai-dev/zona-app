import 'package:dartz/dartz.dart';

import '../../core/errors/failures.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_exception.dart';
import '../../core/network/failure_mapper.dart';
import '../../core/utils/password_generator.dart';
import '../../domain/entities/team_entity.dart';
import '../../domain/entities/team_standing_entity.dart';
import '../../domain/repositories/team_repository.dart';
import '../../domain/usecases/create_team_owner_usecase.dart';
import '../mappers/team_mapper.dart';
import '../mappers/team_standing_mapper.dart';

/// Team repository backed by the Zona Gol API (`/teams`, `/my-teams`,
/// `/tournaments/{id}/standings`, `/admin/users`).
class TeamRepositoryImpl implements TeamRepository {
  final ApiClient api;

  TeamRepositoryImpl({required this.api});

  @override
  Future<Either<Failure, TeamEntity>> getTeamById(String teamId) async {
    try {
      return Right(TeamMapper.fromJson(await api.getObject('/teams/$teamId')));
    } catch (e) {
      return Left(failureFrom(e, 'Error al obtener el equipo'));
    }
  }

  @override
  Future<Either<Failure, List<TeamEntity>>> getTeamsByLeagueId(
    String leagueId, {
    bool onlyActive = false,
  }) async {
    try {
      return Right(_sorted(await _leagueTeams(leagueId), onlyActive));
    } catch (e) {
      return Left(failureFrom(e, 'Error al obtener los equipos'));
    }
  }

  @override
  Future<Either<Failure, List<TeamEntity>>> getTeamsByTournamentId(
    String tournamentId, {
    bool onlyActive = false,
    String? leagueId,
  }) async {
    try {
      // There is no per-tournament list: read the league's teams and filter.
      final league = leagueId ?? (await api.getObject('/tournaments/$tournamentId'))['league_id'] as String;
      final teams = (await _leagueTeams(league)).where((t) => t.tournamentId == tournamentId).toList();
      return Right(_sorted(teams, onlyActive));
    } catch (e) {
      return Left(failureFrom(e, 'Error al obtener los equipos del torneo'));
    }
  }

  @override
  Future<Either<Failure, List<TeamEntity>>> getMyTeams() async {
    try {
      final rows = await api.getAll('/my-teams');
      return Right(_sorted(rows.map(TeamMapper.fromJson).toList(), false));
    } catch (e) {
      return Left(failureFrom(e, 'Error al obtener tus equipos'));
    }
  }

  @override
  Future<Either<Failure, TeamEntity>> createTeam({
    required String name,
    required String slug,
    required String leagueId,
    String? tournamentId,
    String? logo,
    String? description,
  }) async {
    try {
      final json = await api.post('/teams', {
        'name': name,
        'slug': slug,
        'league_id': leagueId,
        if (tournamentId != null) 'tournament_id': tournamentId,
        if (logo != null) 'logo': logo,
        if (description != null) 'description': description,
      });
      return Right(TeamMapper.fromJson((json as Map).cast<String, dynamic>()));
    } on ApiException catch (e) {
      if (e.isConflict) return Left(ValidationFailure('Ya existe un equipo con ese slug en la liga', e.code));
      return Left(failureFrom(e));
    } catch (e) {
      return Left(failureFrom(e, 'Error al crear el equipo'));
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
  }) async {
    try {
      final body = {
        if (name != null) 'name': name,
        if (slug != null) 'slug': slug,
        if (tournamentId != null) 'tournament_id': tournamentId,
        if (logo != null) 'logo': logo,
        if (description != null) 'description': description,
      };
      var team = body.isEmpty
          ? TeamMapper.fromJson(await api.getObject('/teams/$teamId'))
          : TeamMapper.fromJson((await api.patch('/teams/$teamId', body) as Map).cast<String, dynamic>());
      if (isActive != null && isActive != team.isActive) {
        final json = await api.post('/teams/$teamId/${isActive ? 'activate' : 'deactivate'}');
        team = TeamMapper.fromJson((json as Map).cast<String, dynamic>());
      }
      return Right(team);
    } on ApiException catch (e) {
      if (e.isConflict) return Left(ValidationFailure('Ya existe un equipo con ese slug en la liga', e.code));
      return Left(failureFrom(e));
    } catch (e) {
      return Left(failureFrom(e, 'Error al actualizar el equipo'));
    }
  }

  @override
  Future<Either<Failure, void>> deleteTeam(String teamId) async {
    try {
      await api.delete('/teams/$teamId');
      return const Right(null);
    } catch (e) {
      return Left(failureFrom(e, 'Error al eliminar el equipo'));
    }
  }

  @override
  Future<Either<Failure, TeamEntity>> assignToTournament(
    String teamId,
    String tournamentId, {
    String? groupName,
  }) async {
    try {
      final json = await api.patch('/teams/$teamId', {
        'tournament_id': tournamentId,
        // "" clears the group.
        'group_name': groupName ?? '',
      });
      return Right(TeamMapper.fromJson((json as Map).cast<String, dynamic>()));
    } catch (e) {
      return Left(failureFrom(e, 'Error al asignar el equipo'));
    }
  }

  @override
  Future<Either<Failure, List<TeamStandingEntity>>> getStandingsByTournament(
    String tournamentId,
  ) async {
    try {
      final rows = await api.getAll('/tournaments/$tournamentId/standings');
      final standings = rows.map((r) => TeamStandingMapper.fromJson(r, tournamentId: tournamentId)).toList();
      return Right(TeamStandingMapper.sortStandings(standings));
    } catch (e) {
      return Left(failureFrom(e, 'Error al obtener la tabla de posiciones'));
    }
  }

  @override
  Future<Either<Failure, CreateTeamOwnerResult>> createTeamOwner({
    required String email,
    required String name,
    required String leagueId,
    required String teamId,
  }) async {
    try {
      final password = generatePassword(length: 12);
      final json = await api.post('/admin/users', {
        'email': email,
        'password': password,
        'name': name,
        'role': 'team_owner',
        'league_id': leagueId,
        'team_id': teamId,
      });
      final user = (json as Map).cast<String, dynamic>();
      return Right(CreateTeamOwnerResult(userId: '${user['id']}', password: password, email: email));
    } on ApiException catch (e) {
      if (e.isConflict) return Left(ValidationFailure('Ya existe un usuario con ese email', e.code));
      return Left(failureFrom(e));
    } catch (e) {
      return Left(failureFrom(e, 'Error al crear la cuenta del owner'));
    }
  }

  @override
  Future<Either<Failure, void>> updateStandings({
    required String teamId,
    required String tournamentId,
    required int matchesPlayed,
    required int matchesWon,
    required int matchesDrawn,
    required int matchesLost,
    required int goalsFor,
    required int goalsAgainst,
    int? pointsAdjustment,
    String? adjustmentReason,
  }) async {
    try {
      final reason = adjustmentReason?.trim() ?? '';
      await api.put('/tournaments/$tournamentId/standings/$teamId', {
        'matches_played': matchesPlayed,
        'matches_won': matchesWon,
        'matches_drawn': matchesDrawn,
        'matches_lost': matchesLost,
        'goals_for': goalsFor,
        'goals_against': goalsAgainst,
        'reason': reason,
      });
      if (pointsAdjustment != null) {
        await api.post('/standings/adjust', {
          'team_id': teamId,
          'tournament_id': tournamentId,
          'points_adjustment': pointsAdjustment,
          'adjustment_reason': reason,
        });
      }
      return const Right(null);
    } catch (e) {
      return Left(failureFrom(e, 'Error al actualizar la tabla de posiciones'));
    }
  }

  Future<List<TeamEntity>> _leagueTeams(String leagueId) async {
    final rows = await api.getAll('/teams', query: {'league_id': leagueId});
    return rows.map(TeamMapper.fromJson).toList();
  }

  static List<TeamEntity> _sorted(List<TeamEntity> teams, bool onlyActive) {
    final list = onlyActive ? teams.where((t) => t.isActive).toList() : List<TeamEntity>.from(teams);
    list.sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
    return list;
  }
}
