import 'package:equatable/equatable.dart';

import '../../../domain/entities/finance_config_entity.dart';
import '../../../domain/entities/finance_enums.dart';

abstract class FinanceEvent extends Equatable {
  const FinanceEvent();

  @override
  List<Object?> get props => [];
}

/// Load the finance dashboard (summary + balances)
class LoadFinanceDashboard extends FinanceEvent {
  final String leagueId;

  const LoadFinanceDashboard({required this.leagueId});

  @override
  List<Object?> get props => [leagueId];
}

/// Load transactions with optional filters
class LoadTransactions extends FinanceEvent {
  final String leagueId;
  final String? teamId;
  final TransactionStatus? status;
  final TransactionType? type;

  const LoadTransactions({
    required this.leagueId,
    this.teamId,
    this.status,
    this.type,
  });

  @override
  List<Object?> get props => [leagueId, teamId, status, type];
}

/// Create a new transaction
class CreateTransaction extends FinanceEvent {
  final String leagueId;
  final String? teamId;
  final String? playerId;
  final String? matchId;
  final TransactionType type;
  final double amount;
  final String description;
  final String? notes;
  final DateTime? dueDate;

  const CreateTransaction({
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

/// Cancel an open transaction (the API requires a reason)
class CancelTransaction extends FinanceEvent {
  final String transactionId;
  final String leagueId;
  final String reason;

  const CancelTransaction({
    required this.transactionId,
    required this.leagueId,
    required this.reason,
  });

  @override
  List<Object?> get props => [transactionId, leagueId, reason];
}

/// Register a payment for a transaction
class RegisterPayment extends FinanceEvent {
  final String transactionId;
  final double amount;
  final PaymentMethod paymentMethod;
  final String? paymentReference;
  final String leagueId;

  const RegisterPayment({
    required this.transactionId,
    required this.amount,
    required this.paymentMethod,
    this.paymentReference,
    required this.leagueId,
  });

  @override
  List<Object?> get props => [
    transactionId,
    amount,
    paymentMethod,
    paymentReference,
    leagueId,
  ];
}

/// Load finance configuration
class LoadConfig extends FinanceEvent {
  final String leagueId;

  const LoadConfig({required this.leagueId});

  @override
  List<Object?> get props => [leagueId];
}

/// Save the finance configuration
class UpdateConfig extends FinanceEvent {
  final FinanceConfigEntity config;

  const UpdateConfig({required this.config});

  @override
  List<Object?> get props => [config];
}

/// Generate fines from a match
class GenerateFines extends FinanceEvent {
  final String matchId;
  final String leagueId;

  const GenerateFines({required this.matchId, required this.leagueId});

  @override
  List<Object?> get props => [matchId, leagueId];
}
