import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';
import '../../core/errors/failures.dart';
import '../entities/league_entity.dart';
import '../repositories/league_repository.dart';

/// Create League Use Case
///
/// Business logic for creating a new league
/// Includes validation for required fields
class CreateLeagueUseCase {
  final LeagueRepository repository;

  CreateLeagueUseCase(this.repository);

  /// Execute the use case
  ///
  /// Parameters:
  /// - [params]: Contains the league data to create
  ///
  /// Returns:
  /// - Right([LeagueEntity]): The created league
  /// - Left([Failure]): Validation or creation error
  Future<Either<Failure, LeagueEntity>> call(
    CreateLeagueParams params,
  ) async {
    // Validate name
    if (params.name.isEmpty) {
      return Left(ValidationFailure('El nombre de la liga es requerido'));
    }
    if (params.name.length < 3) {
      return Left(
        ValidationFailure('El nombre debe tener al menos 3 caracteres'),
      );
    }

    // Validate slug
    if (params.slug.isEmpty) {
      return Left(ValidationFailure('El slug es requerido'));
    }
    if (!_isValidSlug(params.slug)) {
      return Left(
        ValidationFailure(
          'El slug solo puede contener letras minúsculas, números y guiones',
        ),
      );
    }

    // Validate description
    if (params.description.isEmpty) {
      return Left(ValidationFailure('La descripción es requerida'));
    }
    if (params.description.length < 10) {
      return Left(
        ValidationFailure('La descripción debe tener al menos 10 caracteres'),
      );
    }

    // Validate admin ID
    if (params.adminId.isEmpty) {
      return Left(ValidationFailure('El administrador es requerido'));
    }

    // Check if slug is available
    final slugCheck = await repository.isSlugAvailable(params.slug);
    return slugCheck.fold(
      (failure) => Left(failure),
      (isAvailable) {
        if (!isAvailable) {
          return Left(
            ValidationFailure('El slug ya está en uso, por favor elige otro'),
          );
        }

        // Create the league
        return repository.createLeague(
          name: params.name.trim(),
          slug: params.slug.toLowerCase().trim(),
          description: params.description.trim(),
          adminId: params.adminId,
          logo: params.logo,
          productMode: params.productMode,
        );
      },
    );
  }

  /// Validate slug format
  /// Slug should only contain lowercase letters, numbers, and hyphens
  bool _isValidSlug(String slug) {
    final slugRegex = RegExp(r'^[a-z0-9]+(?:-[a-z0-9]+)*$');
    return slugRegex.hasMatch(slug);
  }
}

/// Parameters for CreateLeagueUseCase
class CreateLeagueParams extends Equatable {
  final String name;
  final String slug;
  final String description;
  final String adminId;
  final String? logo;
  final String productMode; // 'full' or 'web_only'

  const CreateLeagueParams({
    required this.name,
    required this.slug,
    required this.description,
    required this.adminId,
    this.logo,
    this.productMode = 'full',
  });

  @override
  List<Object?> get props => [name, slug, description, adminId, logo, productMode];
}
