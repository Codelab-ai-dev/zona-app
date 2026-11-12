import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';

import '../../core/errors/failures.dart';
import '../entities/finance_enums.dart';
import '../entities/finance_transaction_entity.dart';
import '../repositories/finance_repository.dart';

class RegisterPaymentParams extends Equatable {
  final String leagueId;
  final String transactionId;
  final double amount;
  final PaymentMethod paymentMethod;
  final String? paymentReference;

  const RegisterPaymentParams({
    required this.leagueId,
    required this.transactionId,
    required this.amount,
    required this.paymentMethod,
    this.paymentReference,
  });

  @override
  List<Object?> get props => [
    leagueId,
    transactionId,
    amount,
    paymentMethod,
    paymentReference,
  ];
}

class RegisterPaymentUseCase {
  final FinanceRepository repository;

  RegisterPaymentUseCase(this.repository);

  Future<Either<Failure, FinanceTransactionEntity>> call(
    RegisterPaymentParams params,
  ) async {
    if (params.amount <= 0) {
      return const Left(ValidationFailure('El monto debe ser mayor a 0'));
    }
    final reference = params.paymentReference?.trim();
    return repository.registerPayment(
      leagueId: params.leagueId,
      transactionId: params.transactionId,
      amount: params.amount,
      paymentMethod: params.paymentMethod,
      paymentReference: reference == null || reference.isEmpty
          ? null
          : reference,
    );
  }
}
