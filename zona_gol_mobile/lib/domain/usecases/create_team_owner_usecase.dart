import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';
import '../../core/errors/failures.dart';
import '../repositories/team_repository.dart';

class CreateTeamOwnerParams extends Equatable {
  final String email;
  final String name;
  final String leagueId;

  const CreateTeamOwnerParams({
    required this.email,
    required this.name,
    required this.leagueId,
  });

  @override
  List<Object?> get props => [email, name, leagueId];
}

class CreateTeamOwnerResult extends Equatable {
  final String userId;
  final String password;
  final String email;

  const CreateTeamOwnerResult({
    required this.userId,
    required this.password,
    required this.email,
  });

  @override
  List<Object?> get props => [userId, password, email];
}

class CreateTeamOwnerUseCase {
  final TeamRepository repository;

  CreateTeamOwnerUseCase(this.repository);

  Future<Either<Failure, CreateTeamOwnerResult>> call(CreateTeamOwnerParams params) {
    return repository.createTeamOwner(
      email: params.email,
      name: params.name,
      leagueId: params.leagueId,
    );
  }
}
