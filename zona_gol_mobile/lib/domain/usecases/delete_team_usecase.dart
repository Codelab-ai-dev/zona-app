import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';
import '../../core/errors/failures.dart';
import '../repositories/team_repository.dart';

class DeleteTeamParams extends Equatable {
  final String teamId;

  const DeleteTeamParams({required this.teamId});

  @override
  List<Object?> get props => [teamId];
}

class DeleteTeamUseCase {
  final TeamRepository repository;

  DeleteTeamUseCase(this.repository);

  Future<Either<Failure, void>> call(DeleteTeamParams params) {
    return repository.deleteTeam(params.teamId);
  }
}
