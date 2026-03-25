import 'package:equatable/equatable.dart';

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
  final String teamId;
  final String? playerId;
  final String? matchId;
  final String transactionType;
  final double amount;
  final String? description;
  final String? dueDate;

  const CreateTransaction({
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

/// Cancel a transaction
class CancelTransaction extends FinanceEvent {
  final String transactionId;
  final String leagueId;

  const CancelTransaction({
    required this.transactionId,
    required this.leagueId,
  });

  @override
  List<Object?> get props => [transactionId, leagueId];
}

/// Register a payment for a transaction
class RegisterPayment extends FinanceEvent {
  final String transactionId;
  final double amount;
  final String paymentMethod;
  final String leagueId;

  const RegisterPayment({
    required this.transactionId,
    required this.amount,
    required this.paymentMethod,
    required this.leagueId,
  });

  @override
  List<Object?> get props => [transactionId, amount, paymentMethod, leagueId];
}

/// Load finance configuration
class LoadConfig extends FinanceEvent {
  final String leagueId;

  const LoadConfig({required this.leagueId});

  @override
  List<Object?> get props => [leagueId];
}

/// Update finance configuration
class UpdateConfig extends FinanceEvent {
  final String leagueId;
  final double? registrationFee;
  final double? monthlyFee;
  final double? matchFee;
  final double? yellowCardFine;
  final double? redCardFine;
  final double? noShowFine;
  final double? lateArrivalFine;
  final double? uniformViolationFine;
  final double? misconductFine;
  final double? forfeitFine;
  final bool? autoGenerateFines;
  final String? currency;

  const UpdateConfig({
    required this.leagueId,
    this.registrationFee,
    this.monthlyFee,
    this.matchFee,
    this.yellowCardFine,
    this.redCardFine,
    this.noShowFine,
    this.lateArrivalFine,
    this.uniformViolationFine,
    this.misconductFine,
    this.forfeitFine,
    this.autoGenerateFines,
    this.currency,
  });

  @override
  List<Object?> get props => [
        leagueId,
        registrationFee,
        monthlyFee,
        matchFee,
        yellowCardFine,
        redCardFine,
        noShowFine,
        lateArrivalFine,
        uniformViolationFine,
        misconductFine,
        forfeitFine,
        autoGenerateFines,
        currency,
      ];
}

/// Generate fines from a match
class GenerateFines extends FinanceEvent {
  final String matchId;
  final String leagueId;

  const GenerateFines({
    required this.matchId,
    required this.leagueId,
  });

  @override
  List<Object?> get props => [matchId, leagueId];
}
