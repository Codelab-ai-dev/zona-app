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
      return Left(ValidationFailure('El nombre del jugador es requerido'));
    }
    if (params.teamId.isEmpty) {
      return Left(ValidationFailure('ID del equipo es requerido'));
    }

    return await repository.createPlayer(
      name: params.name.trim(),
      teamId: params.teamId,
      position: params.position,
      jerseyNumber: params.jerseyNumber,
      photo: params.photo,
      birthDate: params.birthDate,
      idDocumentUrl: params.idDocumentUrl,
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
  final String? idDocumentUrl;

  const CreatePlayerParams({
    required this.name,
    required this.teamId,
    this.position,
    this.jerseyNumber,
    this.photo,
    this.birthDate,
    this.idDocumentUrl,
  });
}
