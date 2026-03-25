import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';
import '../../core/errors/failures.dart';
import '../entities/team_entity.dart';
import '../repositories/team_repository.dart';

class CreateTeamParams extends Equatable {
  final String name;
  final String slug;
  final String leagueId;
  final String ownerId;
  final String? tournamentId;
  final String? logo;
  final String? description;

  const CreateTeamParams({
    required this.name,
    required this.slug,
    required this.leagueId,
    required this.ownerId,
    this.tournamentId,
    this.logo,
    this.description,
  });

  @override
  List<Object?> get props => [name, slug, leagueId, ownerId, tournamentId, logo, description];
}

class CreateTeamUseCase {
  final TeamRepository repository;

  CreateTeamUseCase(this.repository);

  Future<Either<Failure, TeamEntity>> call(CreateTeamParams params) {
    return repository.createTeam(
      name: params.name,
      slug: params.slug,
      leagueId: params.leagueId,
      ownerId: params.ownerId,
      tournamentId: params.tournamentId,
      logo: params.logo,
      description: params.description,
    );
  }
}
