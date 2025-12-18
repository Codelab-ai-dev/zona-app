import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/tournament_entity.dart';
import '../repositories/tournament_repository.dart';

/// Create Tournament Use Case
///
/// Business logic for creating a new tournament
/// Includes comprehensive validation of tournament data
class CreateTournamentUseCase {
  final TournamentRepository repository;

  CreateTournamentUseCase(this.repository);

  /// Execute the use case
  ///
  /// Parameters:
  /// - [params]: Parameters containing tournament creation data
  ///
  /// Returns:
  /// - Right([TournamentEntity]): The created tournament
  /// - Left([Failure]): Error if validation fails or creation fails
  Future<Either<Failure, TournamentEntity>> call(
    CreateTournamentParams params,
  ) async {
    // Validate name
    if (params.name.trim().isEmpty) {
      return Left(ValidationFailure('El nombre del torneo es requerido'));
    }

    if (params.name.trim().length < 3) {
      return Left(
        ValidationFailure('El nombre debe tener al menos 3 caracteres'),
      );
    }

    // Validate league ID
    if (params.leagueId.isEmpty) {
      return Left(ValidationFailure('La liga es requerida'));
    }

    // Validate dates
    if (params.startDate.isAfter(params.endDate)) {
      return Left(
        ValidationFailure(
          'La fecha de inicio debe ser anterior a la fecha de fin',
        ),
      );
    }

    // Validate max players (if provided)
    if (params.maxPlayers != null && params.maxPlayers! < 1) {
      return Left(
        ValidationFailure('El número máximo de jugadores debe ser mayor a 0'),
      );
    }

    // Validate max coaching staff
    if (params.maxCoachingStaff < 1) {
      return Left(
        ValidationFailure(
          'El número máximo de cuerpo técnico debe ser mayor a 0',
        ),
      );
    }

    // Validate group knockout specific fields
    if (params.format == TournamentFormat.groupKnockout) {
      if (params.numberOfGroups == null) {
        return Left(
          ValidationFailure(
            'El número de grupos es requerido para el formato de grupos',
          ),
        );
      }

      if (params.numberOfGroups! < 2 || params.numberOfGroups! > 8) {
        return Left(
          ValidationFailure('El número de grupos debe estar entre 2 y 8'),
        );
      }

      if (params.teamsAdvancingPerGroup < 1 ||
          params.teamsAdvancingPerGroup > 4) {
        return Left(
          ValidationFailure(
            'Los equipos que avanzan por grupo deben estar entre 1 y 4',
          ),
        );
      }
    }

    // Validate rounds per season (for league format)
    if (params.format == TournamentFormat.league) {
      if (params.roundsPerSeason < 1 || params.roundsPerSeason > 4) {
        return Left(
          ValidationFailure('Las vueltas por temporada deben estar entre 1 y 4'),
        );
      }
    }

    return await repository.createTournament(
      name: params.name,
      leagueId: params.leagueId,
      startDate: params.startDate,
      endDate: params.endDate,
      maxPlayers: params.maxPlayers,
      maxCoachingStaff: params.maxCoachingStaff,
      format: params.format,
      numberOfGroups: params.numberOfGroups,
      teamsAdvancingPerGroup: params.teamsAdvancingPerGroup,
      roundsPerSeason: params.roundsPerSeason,
      hasThirdPlaceMatch: params.hasThirdPlaceMatch,
    );
  }
}

/// Parameters for CreateTournamentUseCase
class CreateTournamentParams {
  final String name;
  final String leagueId;
  final DateTime startDate;
  final DateTime endDate;
  final int? maxPlayers;
  final int maxCoachingStaff;
  final TournamentFormat format;
  final int? numberOfGroups;
  final int teamsAdvancingPerGroup;
  final int roundsPerSeason;
  final bool hasThirdPlaceMatch;

  const CreateTournamentParams({
    required this.name,
    required this.leagueId,
    required this.startDate,
    required this.endDate,
    this.maxPlayers,
    this.maxCoachingStaff = 10,
    this.format = TournamentFormat.league,
    this.numberOfGroups,
    this.teamsAdvancingPerGroup = 2,
    this.roundsPerSeason = 1,
    this.hasThirdPlaceMatch = false,
  });
}
