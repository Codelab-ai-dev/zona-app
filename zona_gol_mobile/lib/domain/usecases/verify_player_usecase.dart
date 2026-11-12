import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';
import '../../core/errors/failures.dart';
import '../repositories/player_repository.dart';

class VerifyPlayerParams extends Equatable {
  final String playerId;
  final bool verified;

  /// The reviewed document; required to verify.
  final String? documentKey;

  const VerifyPlayerParams({
    required this.playerId,
    required this.verified,
    this.documentKey,
  });

  @override
  List<Object?> get props => [playerId, verified, documentKey];
}

/// Identity verification of players (league admins): the league queue, the
/// decision and a temporary link to view a document.
class VerifyPlayerUseCase {
  final PlayerRepository repository;

  VerifyPlayerUseCase(this.repository);

  Future<Either<Failure, void>> call(VerifyPlayerParams params) async {
    if (params.verified && (params.documentKey == null || params.documentKey!.isEmpty)) {
      return const Left(ValidationFailure('Para verificar se requiere el documento revisado'));
    }
    return repository.setPlayerVerification(
      playerId: params.playerId,
      verified: params.verified,
      documentKey: params.verified ? params.documentKey : null,
    );
  }

  Future<Either<Failure, PlayerVerificationQueue>> queue(String leagueId) {
    if (leagueId.isEmpty) return Future.value(const Left(ValidationFailure('ID de la liga es requerido')));
    return repository.getVerificationQueue(leagueId);
  }

  Future<Either<Failure, String>> documentUrl(String documentKey) => repository.getDocumentUrl(documentKey);
}
