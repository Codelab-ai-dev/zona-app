import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../repositories/suspension_repository.dart';

class CompleteSuspensionUseCase {
  final SuspensionRepository repository;

  CompleteSuspensionUseCase(this.repository);

  Future<Either<Failure, void>> call(String suspensionId) {
    return repository.completeSuspension(suspensionId);
  }
}
