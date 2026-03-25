import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../repositories/suspension_repository.dart';

class CancelSuspensionUseCase {
  final SuspensionRepository repository;

  CancelSuspensionUseCase(this.repository);

  Future<Either<Failure, void>> call(String suspensionId) {
    return repository.cancelSuspension(suspensionId);
  }
}
