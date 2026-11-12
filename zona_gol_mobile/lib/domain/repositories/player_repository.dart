import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/player_entity.dart';
import '../entities/player_verification_entity.dart';

/// Player Repository
/// Defines the contract for player data operations
abstract class PlayerRepository {
  /// Active players of a team
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
    required String position,
    required int jerseyNumber,
    String? photo,
    DateTime? birthDate,
  });

  /// Update a player (an empty [photo] removes it)
  Future<Either<Failure, PlayerEntity>> updatePlayer({
    required String playerId,
    String? name,
    String? position,
    int? jerseyNumber,
    String? photo,
    DateTime? birthDate,
  });

  /// Deactivate a player (it leaves the team's roster)
  Future<Either<Failure, void>> deletePlayer(String playerId);

  /// Uploads a player photo and returns its public URL.
  Future<Either<Failure, String>> uploadPlayerPhoto({
    required String playerId,
    required List<int> bytes,
    required String filename,
  });

  /// Get all players for a league (across all teams)
  Future<Either<Failure, List<PlayerEntity>>> getPlayersByLeagueId(
    String leagueId, {
    bool? idVerified,
  });

  /// League verification queue (active players) and its counters.
  Future<Either<Failure, PlayerVerificationQueue>> getVerificationQueue(String leagueId);

  /// Verify (needs the reviewed [documentKey]) or unverify a player.
  Future<Either<Failure, void>> setPlayerVerification({
    required String playerId,
    required bool verified,
    String? documentKey,
  });

  /// Short-lived link to view a private document. Never store it.
  Future<Either<Failure, String>> getDocumentUrl(String documentKey);
}

/// Verification list plus the league counters.
class PlayerVerificationQueue {
  final List<PlayerVerificationEntity> players;
  final VerificationSummaryEntity summary;

  const PlayerVerificationQueue({required this.players, required this.summary});
}
