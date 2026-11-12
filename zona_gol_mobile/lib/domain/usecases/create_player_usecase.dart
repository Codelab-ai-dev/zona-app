import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/player_entity.dart';
import '../repositories/player_repository.dart';

class CreatePlayerUseCase {
  final PlayerRepository repository;

  CreatePlayerUseCase(this.repository);

  Future<Either<Failure, PlayerEntity>> call(
    CreatePlayerParams params,
  ) async {
    if (params.name.trim().isEmpty) {
      return const Left(ValidationFailure('El nombre del jugador es requerido'));
    }
    if (params.teamId.isEmpty) {
      return const Left(ValidationFailure('ID del equipo es requerido'));
    }
    final position = params.position?.trim() ?? '';
    if (position.isEmpty) {
      return const Left(ValidationFailure('La posición es requerida'));
    }
    final jersey = params.jerseyNumber;
    if (jersey == null || jersey < 1 || jersey > 99) {
      return const Left(ValidationFailure('El número de camiseta debe estar entre 1 y 99'));
    }

    return await repository.createPlayer(
      name: params.name.trim(),
      teamId: params.teamId,
      position: position,
      jerseyNumber: jersey,
      photo: params.photo,
      birthDate: params.birthDate,
    );
  }
}

class CreatePlayerParams {
  final String name;
  final String teamId;
  final String? position;
  final int? jerseyNumber;
  final String? photo;
  final DateTime? birthDate;

  const CreatePlayerParams({
    required this.name,
    required this.teamId,
    this.position,
    this.jerseyNumber,
    this.photo,
    this.birthDate,
  });
}
