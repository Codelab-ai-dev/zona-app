import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/tournament_entity.dart';

/// Tournament Repository
/// Defines the contract for tournament data operations
abstract class TournamentRepository {
  /// Get a tournament by ID
  Future<Either<Failure, TournamentEntity>> getTournamentById(
    String tournamentId,
  );

  /// Get tournaments by league ID
  Future<Either<Failure, List<TournamentEntity>>> getTournamentsByLeagueId(
    String leagueId, {
    bool onlyActive = false,
  });

  /// Create a new tournament (league admin or super admin).
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
  });
}
