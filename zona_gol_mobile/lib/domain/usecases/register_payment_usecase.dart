import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';

import '../../core/errors/failures.dart';
import '../entities/finance_transaction_entity.dart';
import '../repositories/finance_repository.dart';

class RegisterPaymentParams extends Equatable {
  final String transactionId;
  final double amount;
  final String paymentMethod;

  const RegisterPaymentParams({
    required this.transactionId,
    required this.amount,
    required this.paymentMethod,
  });

  @override
  List<Object?> get props => [transactionId, amount, paymentMethod];
}

class RegisterPaymentUseCase {
  final FinanceRepository repository;

  RegisterPaymentUseCase(this.repository);

  Future<Either<Failure, FinanceTransactionEntity>> call(
      RegisterPaymentParams params) {
    return repository.registerPayment(
      transactionId: params.transactionId,
      amount: params.amount,
      paymentMethod: params.paymentMethod,
    );
  }
}
