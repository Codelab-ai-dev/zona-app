import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';
import '../../core/errors/failures.dart';
import '../entities/suspension_entity.dart';
import '../repositories/suspension_repository.dart';

class CreateSuspensionParams extends Equatable {
  final String playerId;
  final String teamId;
  final String leagueId;
  final String suspensionType;
  final String? reason;
  final int matchesToServe;

  const CreateSuspensionParams({
    required this.playerId,
    required this.teamId,
    required this.leagueId,
    required this.suspensionType,
    this.reason,
    required this.matchesToServe,
  });

  @override
  List<Object?> get props => [
        playerId,
        teamId,
        leagueId,
        suspensionType,
        reason,
        matchesToServe,
      ];
}

class CreateSuspensionUseCase {
  final SuspensionRepository repository;

  CreateSuspensionUseCase(this.repository);

  Future<Either<Failure, SuspensionEntity>> call(
      CreateSuspensionParams params) {
    return repository.createSuspension(
      playerId: params.playerId,
      teamId: params.teamId,
      leagueId: params.leagueId,
      suspensionType: params.suspensionType,
      reason: params.reason,
      matchesToServe: params.matchesToServe,
    );
  }
}
