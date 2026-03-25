import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';

import '../../core/errors/failures.dart';
import '../entities/finance_transaction_entity.dart';
import '../repositories/finance_repository.dart';

class CreateFinanceTransactionParams extends Equatable {
  final String leagueId;
  final String teamId;
  final String? playerId;
  final String? matchId;
  final String transactionType;
  final double amount;
  final String? description;
  final String? dueDate;

  const CreateFinanceTransactionParams({
    required this.leagueId,
    required this.teamId,
    this.playerId,
    this.matchId,
    required this.transactionType,
    required this.amount,
    this.description,
    this.dueDate,
  });

  @override
  List<Object?> get props => [
        leagueId,
        teamId,
        playerId,
        matchId,
        transactionType,
        amount,
        description,
        dueDate,
      ];
}

class CreateFinanceTransactionUseCase {
  final FinanceRepository repository;

  CreateFinanceTransactionUseCase(this.repository);

  Future<Either<Failure, FinanceTransactionEntity>> call(
      CreateFinanceTransactionParams params) {
    return repository.createTransaction(
      leagueId: params.leagueId,
      teamId: params.teamId,
      playerId: params.playerId,
      matchId: params.matchId,
      transactionType: params.transactionType,
      amount: params.amount,
      description: params.description,
      dueDate: params.dueDate,
    );
  }
}
