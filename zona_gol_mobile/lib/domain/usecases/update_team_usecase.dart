import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';
import '../../core/errors/failures.dart';
import '../entities/team_entity.dart';
import '../repositories/team_repository.dart';

class UpdateTeamParams extends Equatable {
  final String teamId;
  final String? name;
  final String? slug;
  final String? tournamentId;
  final String? logo;
  final String? description;
  final bool? isActive;

  const UpdateTeamParams({
    required this.teamId,
    this.name,
    this.slug,
    this.tournamentId,
    this.logo,
    this.description,
    this.isActive,
  });

  @override
  List<Object?> get props => [teamId, name, slug, tournamentId, logo, description, isActive];
}

class UpdateTeamUseCase {
  final TeamRepository repository;

  UpdateTeamUseCase(this.repository);

  Future<Either<Failure, TeamEntity>> call(UpdateTeamParams params) {
    return repository.updateTeam(
      teamId: params.teamId,
      name: params.name,
      slug: params.slug,
      tournamentId: params.tournamentId,
      logo: params.logo,
      description: params.description,
      isActive: params.isActive,
    );
  }
}
