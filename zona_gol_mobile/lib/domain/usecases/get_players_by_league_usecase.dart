import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';
import '../../core/errors/failures.dart';
import '../entities/player_entity.dart';
import '../repositories/player_repository.dart';

class GetPlayersByLeagueParams extends Equatable {
  final String leagueId;
  final bool? idVerified;

  const GetPlayersByLeagueParams({
    required this.leagueId,
    this.idVerified,
  });

  @override
  List<Object?> get props => [leagueId, idVerified];
}

class GetPlayersByLeagueUseCase {
  final PlayerRepository repository;

  GetPlayersByLeagueUseCase(this.repository);

  Future<Either<Failure, List<PlayerEntity>>> call(GetPlayersByLeagueParams params) {
    return repository.getPlayersByLeagueId(
      params.leagueId,
      idVerified: params.idVerified,
    );
  }
}
