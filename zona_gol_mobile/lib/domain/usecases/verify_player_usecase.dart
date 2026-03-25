import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';
import '../../core/errors/failures.dart';
import '../entities/player_entity.dart';
import '../repositories/player_repository.dart';

class VerifyPlayerParams extends Equatable {
  final String playerId;
  final bool verified;

  const VerifyPlayerParams({
    required this.playerId,
    required this.verified,
  });

  @override
  List<Object?> get props => [playerId, verified];
}

class VerifyPlayerUseCase {
  final PlayerRepository repository;

  VerifyPlayerUseCase(this.repository);

  Future<Either<Failure, PlayerEntity>> call(VerifyPlayerParams params) {
    return repository.updatePlayer(
      playerId: params.playerId,
      idVerified: params.verified,
    );
  }
}
