import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/player_entity.dart';

/// Player Repository
/// Defines the contract for player data operations
abstract class PlayerRepository {
  /// Get all players for a team
  Future<Either<Failure, List<PlayerEntity>>> getPlayersByTeamId(
    String teamId, {
    bool onlyActive = false,
  });

  /// Get a player by ID
  Future<Either<Failure, PlayerEntity>> getPlayerById(String playerId);

  /// Create a new player
  Future<Either<Failure, PlayerEntity>> createPlayer({
    required String name,
    required String teamId,
    String? position,
    int? jerseyNumber,
    String? photo,
    DateTime? birthDate,
    String? idDocumentUrl,
  });

  /// Update a player
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
  });

  /// Delete a player (soft delete - sets is_active=false)
  Future<Either<Failure, void>> deletePlayer(String playerId);

  /// Search players by name
  Future<Either<Failure, List<PlayerEntity>>> searchPlayers(
    String query, {
    String? teamId,
  });

  /// Get all players for a league (across all teams)
  Future<Either<Failure, List<PlayerEntity>>> getPlayersByLeagueId(
    String leagueId, {
    bool? idVerified,
  });
}
