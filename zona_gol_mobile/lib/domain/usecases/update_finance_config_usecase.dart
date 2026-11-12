import 'package:dartz/dartz.dart';

import '../../core/errors/failures.dart';
import '../entities/finance_config_entity.dart';
import '../repositories/finance_repository.dart';

class UpdateFinanceConfigUseCase {
  final FinanceRepository repository;

  UpdateFinanceConfigUseCase(this.repository);

  Future<Either<Failure, FinanceConfigEntity>> call(
    FinanceConfigEntity config,
  ) async {
    if (config.paymentDueDays < 0 || config.paymentDueDays > 90) {
      return const Left(
        ValidationFailure('Los días para pago deben estar entre 0 y 90'),
      );
    }
    if (config.overdueGraceDays < 0 || config.overdueGraceDays > 30) {
      return const Left(
        ValidationFailure('Los días de gracia deben estar entre 0 y 30'),
      );
    }
    return repository.updateConfig(config);
  }
}
