import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';
import '../../core/errors/failures.dart';
import '../repositories/team_repository.dart';

class CreateTeamOwnerParams extends Equatable {
  final String email;
  final String name;
  final String leagueId;

  /// The team the new account will own (it must already exist).
  final String teamId;

  const CreateTeamOwnerParams({
    required this.email,
    required this.name,
    required this.leagueId,
    required this.teamId,
  });

  @override
  List<Object?> get props => [email, name, leagueId, teamId];
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

/// Creates a team owner account for an existing team.
class CreateTeamOwnerUseCase {
  final TeamRepository repository;

  CreateTeamOwnerUseCase(this.repository);

  Future<Either<Failure, CreateTeamOwnerResult>> call(CreateTeamOwnerParams params) {
    final name = params.name.trim();
    if (name.length < 2 || name.length > 100) {
      return Future.value(const Left(ValidationFailure('El nombre del owner debe tener entre 2 y 100 caracteres')));
    }
    return repository.createTeamOwner(
      email: params.email.trim(),
      name: name,
      leagueId: params.leagueId,
      teamId: params.teamId,
    );
  }
}
