import 'package:dartz/dartz.dart';

import '../../core/errors/failures.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_exception.dart';
import '../../core/network/failure_mapper.dart';
import '../../core/network/json.dart';
import '../../domain/entities/player_entity.dart';
import '../../domain/repositories/player_repository.dart';
import '../mappers/player_mapper.dart';

/// Player repository backed by the Zona Gol API (`/teams/{id}/players`,
/// `/players/*`, `/leagues/{id}/players*`, `/storage/*`).
class PlayerRepositoryImpl implements PlayerRepository {
  final ApiClient api;

  PlayerRepositoryImpl({required this.api});

  @override
  Future<Either<Failure, List<PlayerEntity>>> getPlayersByTeamId(
    String teamId, {
    bool onlyActive = false,
  }) async {
    try {
      // The API lists the active players only (public fields).
      final rows = await api.getAll('/teams/$teamId/players');
      final players = rows.map(PlayerMapper.fromJson).toList();
      return Right(onlyActive ? players.where((p) => p.isActive).toList() : players);
    } catch (e) {
      return Left(failureFrom(e, 'Error al obtener los jugadores'));
    }
  }

  @override
  Future<Either<Failure, PlayerEntity>> getPlayerById(String playerId) async {
    try {
      var player = PlayerMapper.fromJson(await api.getObject('/players/$playerId'));
      // The verification status is private: only managers of the player see it.
      try {
        final v = await api.getObject('/players/$playerId/verification');
        player = player.copyWith(idVerified: v.boolean('id_verified'), documentKey: v.strOrNull('document_key'));
      } on ApiException catch (e) {
        if (e.isNetwork) rethrow;
      }
      return Right(player);
    } catch (e) {
      return Left(failureFrom(e, 'Error al obtener el jugador'));
    }
  }

  @override
  Future<Either<Failure, PlayerEntity>> createPlayer({
    required String name,
    required String teamId,
    required String position,
    required int jerseyNumber,
    String? photo,
    DateTime? birthDate,
  }) async {
    try {
      final json = await api.post('/teams/$teamId/players', {
        'name': name,
        'position': position,
        'jersey_number': jerseyNumber,
        if (photo != null && photo.isNotEmpty) 'photo': photo,
        if (birthDate != null) 'birth_date': apiDate(birthDate),
      });
      return Right(PlayerMapper.fromJson((json as Map).cast<String, dynamic>()));
    } on ApiException catch (e) {
      if (e.isConflict) return Left(ValidationFailure('El número $jerseyNumber ya está en uso en el equipo', e.code));
      return Left(failureFrom(e));
    } catch (e) {
      return Left(failureFrom(e, 'Error al crear el jugador'));
    }
  }

  @override
  Future<Either<Failure, PlayerEntity>> updatePlayer({
    required String playerId,
    String? name,
    String? position,
    int? jerseyNumber,
    String? photo,
    DateTime? birthDate,
  }) async {
    try {
      final json = await api.patch('/players/$playerId', {
        if (name != null) 'name': name,
        if (position != null) 'position': position,
        if (jerseyNumber != null) 'jersey_number': jerseyNumber,
        if (photo != null) 'photo': photo,
        if (birthDate != null) 'birth_date': apiDate(birthDate),
      });
      return Right(PlayerMapper.fromJson((json as Map).cast<String, dynamic>()));
    } on ApiException catch (e) {
      if (e.isConflict) return Left(ValidationFailure('Ese número ya está en uso en el equipo', e.code));
      return Left(failureFrom(e));
    } catch (e) {
      return Left(failureFrom(e, 'Error al actualizar el jugador'));
    }
  }

  @override
  Future<Either<Failure, void>> deletePlayer(String playerId) async {
    try {
      await api.post('/players/$playerId/deactivate');
      return const Right(null);
    } catch (e) {
      return Left(failureFrom(e, 'Error al dar de baja al jugador'));
    }
  }

  @override
  Future<Either<Failure, String>> uploadPlayerPhoto({
    required String playerId,
    required List<int> bytes,
    required String filename,
  }) async {
    try {
      final res = await api.upload(
        '/storage/objects',
        bytes: bytes,
        filename: filename,
        fields: {'scope': 'player', 'scope_id': playerId},
      );
      final url = res.strOrNull('url');
      if (url == null || url.isEmpty) return const Left(ServerFailure('El servidor no devolvió la URL de la foto'));
      return Right(url);
    } catch (e) {
      return Left(failureFrom(e, 'Error al subir la foto'));
    }
  }

  @override
  Future<Either<Failure, List<PlayerEntity>>> getPlayersByLeagueId(
    String leagueId, {
    bool? idVerified,
  }) async {
    try {
      final rows = await api.getAll('/leagues/$leagueId/players');
      var players = rows.map(PlayerMapper.fromJson).toList();
      if (idVerified != null) players = players.where((p) => p.idVerified == idVerified).toList();
      players.sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
      return Right(players);
    } catch (e) {
      return Left(failureFrom(e, 'Error al obtener los jugadores de la liga'));
    }
  }

  @override
  Future<Either<Failure, PlayerVerificationQueue>> getVerificationQueue(String leagueId) async {
    try {
      final results = await Future.wait([
        api.getAll('/leagues/$leagueId/players/verification'),
        api.getObject('/leagues/$leagueId/players/verification/summary'),
      ]);
      final rows = results[0] as List<Map<String, dynamic>>;
      return Right(PlayerVerificationQueue(
        players: rows.map(PlayerMapper.verificationFromJson).toList(),
        summary: PlayerMapper.summaryFromJson(results[1] as Map<String, dynamic>),
      ));
    } catch (e) {
      return Left(failureFrom(e, 'Error al obtener la verificación de jugadores'));
    }
  }

  @override
  Future<Either<Failure, void>> setPlayerVerification({
    required String playerId,
    required bool verified,
    String? documentKey,
  }) async {
    try {
      await api.patch('/players/$playerId/verification', {
        'verified': verified,
        if (documentKey != null) 'document_key': documentKey,
      });
      return const Right(null);
    } catch (e) {
      return Left(failureFrom(e, 'No se pudo actualizar la verificación'));
    }
  }

  @override
  Future<Either<Failure, String>> getDocumentUrl(String documentKey) async {
    try {
      final res = await api.getObject('/storage/url', query: {'key': documentKey});
      return Right(res.str('url'));
    } catch (e) {
      return Left(failureFrom(e, 'No se pudo abrir el documento'));
    }
  }
}
