import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/player_entity.dart';
import '../repositories/player_repository.dart';

class UpdatePlayerUseCase {
  final PlayerRepository repository;

  UpdatePlayerUseCase(this.repository);

  Future<Either<Failure, PlayerEntity>> call(
    UpdatePlayerParams params,
  ) async {
    if (params.playerId.isEmpty) {
      return const Left(ValidationFailure('ID del jugador es requerido'));
    }
    final jersey = params.jerseyNumber;
    if (jersey != null && (jersey < 1 || jersey > 99)) {
      return const Left(ValidationFailure('El número de camiseta debe estar entre 1 y 99'));
    }

    return await repository.updatePlayer(
      playerId: params.playerId,
      name: params.name?.trim(),
      position: params.position,
      jerseyNumber: jersey,
      photo: params.photo,
      birthDate: params.birthDate,
    );
  }

  /// Uploads a photo for an existing player and returns its public URL.
  Future<Either<Failure, String>> uploadPhoto({
    required String playerId,
    required List<int> bytes,
    required String filename,
  }) {
    return repository.uploadPlayerPhoto(playerId: playerId, bytes: bytes, filename: filename);
  }
}

class UpdatePlayerParams {
  final String playerId;
  final String? name;
  final String? position;
  final int? jerseyNumber;

  /// New photo URL; an empty string removes the photo.
  final String? photo;
  final DateTime? birthDate;

  const UpdatePlayerParams({
    required this.playerId,
    this.name,
    this.position,
    this.jerseyNumber,
    this.photo,
    this.birthDate,
  });
}
