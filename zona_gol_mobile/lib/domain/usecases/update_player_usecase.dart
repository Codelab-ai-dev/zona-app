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
      return Left(ValidationFailure('ID del jugador es requerido'));
    }

    return await repository.updatePlayer(
      playerId: params.playerId,
      name: params.name?.trim(),
      position: params.position,
      jerseyNumber: params.jerseyNumber,
      photo: params.photo,
      birthDate: params.birthDate,
      isActive: params.isActive,
      idDocumentUrl: params.idDocumentUrl,
      idVerified: params.idVerified,
    );
  }
}

class UpdatePlayerParams {
  final String playerId;
  final String? name;
  final String? position;
  final int? jerseyNumber;
  final String? photo;
  final DateTime? birthDate;
  final bool? isActive;
  final String? idDocumentUrl;
  final bool? idVerified;

  const UpdatePlayerParams({
    required this.playerId,
    this.name,
    this.position,
    this.jerseyNumber,
    this.photo,
    this.birthDate,
    this.isActive,
    this.idDocumentUrl,
    this.idVerified,
  });
}
