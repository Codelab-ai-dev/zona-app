import 'package:dartz/dartz.dart';

import '../../core/errors/failures.dart';
import '../entities/finance_config_entity.dart';
import '../entities/finance_enums.dart';
import '../entities/finance_league_summary_entity.dart';
import '../entities/finance_team_balance_entity.dart';
import '../entities/finance_transaction_entity.dart';

/// Finance Repository
/// Defines the contract for finance data operations
abstract class FinanceRepository {
  /// Get the finance configuration for a league
  Future<Either<Failure, FinanceConfigEntity>> getConfig(String leagueId);

  /// Update the finance configuration for a league
  Future<Either<Failure, FinanceConfigEntity>> updateConfig({
    required String leagueId,
    double? registrationFee,
    double? monthlyFee,
    double? matchFee,
    double? yellowCardFine,
    double? redCardFine,
    double? noShowFine,
    double? lateArrivalFine,
    double? uniformViolationFine,
    double? misconductFine,
    double? forfeitFine,
    bool? autoGenerateFines,
    String? currency,
  });

  /// Get transactions for a league with optional filters
  Future<Either<Failure, List<FinanceTransactionEntity>>> getTransactions(
    String leagueId, {
    String? teamId,
    TransactionStatus? status,
    TransactionType? type,
  });

  /// Create a new transaction
  Future<Either<Failure, FinanceTransactionEntity>> createTransaction({
    required String leagueId,
    required String teamId,
    String? playerId,
    String? matchId,
    required String transactionType,
    required double amount,
    String? description,
    String? dueDate,
  });

  /// Cancel a transaction
  Future<Either<Failure, void>> cancelTransaction(String transactionId);

  /// Register a payment for a transaction via RPC
  Future<Either<Failure, FinanceTransactionEntity>> registerPayment({
    required String transactionId,
    required double amount,
    required String paymentMethod,
  });

  /// Generate fines from match events via RPC
  Future<Either<Failure, List<FinanceTransactionEntity>>>
      generateFinesFromMatch({
    required String matchId,
    required String leagueId,
  });

  /// Get team balances for a league
  Future<Either<Failure, List<FinanceTeamBalanceEntity>>> getTeamBalances(
    String leagueId,
  );

  /// Get the league financial summary
  Future<Either<Failure, FinanceLeagueSummaryEntity>> getLeagueSummary(
    String leagueId,
  );
}
