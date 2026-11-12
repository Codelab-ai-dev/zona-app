import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';

import '../../core/errors/failures.dart';
import '../entities/finance_enums.dart';
import '../entities/finance_transaction_entity.dart';
import '../repositories/finance_repository.dart';

class CreateFinanceTransactionParams extends Equatable {
  final String leagueId;
  final String? teamId;
  final String? playerId;
  final String? matchId;
  final TransactionType type;
  final double amount;
  final String description;
  final String? notes;
  final DateTime? dueDate;

  const CreateFinanceTransactionParams({
    required this.leagueId,
    this.teamId,
    this.playerId,
    this.matchId,
    required this.type,
    required this.amount,
    required this.description,
    this.notes,
    this.dueDate,
  });

  @override
  List<Object?> get props => [
    leagueId,
    teamId,
    playerId,
    matchId,
    type,
    amount,
    description,
    notes,
    dueDate,
  ];
}

class CreateFinanceTransactionUseCase {
  final FinanceRepository repository;

  CreateFinanceTransactionUseCase(this.repository);

  Future<Either<Failure, FinanceTransactionEntity>> call(
    CreateFinanceTransactionParams params,
  ) async {
    if (params.type.needsTeam &&
        (params.teamId == null || params.teamId!.isEmpty)) {
      return const Left(ValidationFailure('Selecciona un equipo'));
    }
    if (params.description.trim().length < 3) {
      return const Left(
        ValidationFailure('La descripción debe tener al menos 3 caracteres'),
      );
    }
    if (params.amount <= 0 || params.amount > 999999.99) {
      return const Left(
        ValidationFailure('El monto debe ser mayor a 0 y menor a 1,000,000'),
      );
    }
    return repository.createTransaction(
      leagueId: params.leagueId,
      teamId: params.teamId,
      playerId: params.playerId,
      matchId: params.matchId,
      type: params.type,
      amount: params.amount,
      description: params.description.trim(),
      notes: params.notes,
      dueDate: params.type.isIncome ? null : params.dueDate,
    );
  }
}
