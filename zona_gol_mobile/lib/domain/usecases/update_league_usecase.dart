import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';
import '../../core/errors/failures.dart';
import '../entities/league_entity.dart';
import '../repositories/league_repository.dart';

/// Update League Use Case
///
/// Business logic for updating an existing league
/// Includes validation for required fields
class UpdateLeagueUseCase {
  final LeagueRepository repository;

  UpdateLeagueUseCase(this.repository);

  /// Execute the use case
  ///
  /// Parameters:
  /// - [params]: Contains the league data to update
  ///
  /// Returns:
  /// - Right([LeagueEntity]): The updated league
  /// - Left([Failure]): Validation or update error
  Future<Either<Failure, LeagueEntity>> call(UpdateLeagueParams params) async {
    // Validate league ID
    if (params.leagueId.isEmpty) {
      return Left(ValidationFailure('El ID de la liga es requerido'));
    }

    // Validate name if provided
    if (params.name != null && params.name!.isEmpty) {
      return Left(ValidationFailure('El nombre no puede estar vacío'));
    }
    if (params.name != null && params.name!.length < 3) {
      return Left(
        ValidationFailure('El nombre debe tener al menos 3 caracteres'),
      );
    }

    // Validate slug if provided
    if (params.slug != null) {
      if (params.slug!.isEmpty) {
        return Left(ValidationFailure('El slug no puede estar vacío'));
      }
      if (!_isValidSlug(params.slug!)) {
        return Left(
          ValidationFailure(
            'El slug solo puede contener letras minúsculas, números y guiones',
          ),
        );
      }

      // Check if slug is available (excluding current league)
      final slugCheck = await repository.isSlugAvailable(
        params.slug!,
        excludeLeagueId: params.leagueId,
      );
      final isAvailable = slugCheck.fold(
        (failure) => false,
        (available) => available,
      );
      if (!isAvailable) {
        return Left(
          ValidationFailure('El slug ya está en uso, por favor elige otro'),
        );
      }
    }

    // Update the league
    return repository.updateLeague(
      leagueId: params.leagueId,
      name: params.name?.trim(),
      slug: params.slug?.toLowerCase().trim(),
      description: params.description?.trim(),
      logo: params.logo,
      isActive: params.isActive,
    );
  }

  /// Validate slug format
  bool _isValidSlug(String slug) {
    final slugRegex = RegExp(r'^[a-z0-9]+(?:-[a-z0-9]+)*$');
    return slugRegex.hasMatch(slug);
  }
}

/// Parameters for UpdateLeagueUseCase
class UpdateLeagueParams extends Equatable {
  final String leagueId;
  final String? name;
  final String? slug;
  final String? description;
  final String? logo;
  final bool? isActive;

  const UpdateLeagueParams({
    required this.leagueId,
    this.name,
    this.slug,
    this.description,
    this.logo,
    this.isActive,
  });

  @override
  List<Object?> get props => [leagueId, name, slug, description, logo, isActive];
}
