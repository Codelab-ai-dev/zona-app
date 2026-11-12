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

  /// Save every editable field of [config]
  Future<Either<Failure, FinanceConfigEntity>> updateConfig(
    FinanceConfigEntity config,
  );

  /// Get transactions for a league with optional filters
  Future<Either<Failure, List<FinanceTransactionEntity>>> getTransactions(
    String leagueId, {
    String? teamId,
    TransactionStatus? status,
    TransactionType? type,
  });

  /// Create a new transaction (`is_income` follows [type])
  Future<Either<Failure, FinanceTransactionEntity>> createTransaction({
    required String leagueId,
    String? teamId,
    String? playerId,
    String? matchId,
    required TransactionType type,
    required double amount,
    required String description,
    String? notes,
    DateTime? dueDate,
  });

  /// Cancel an open transaction
  Future<Either<Failure, FinanceTransactionEntity>> cancelTransaction({
    required String leagueId,
    required String transactionId,
    required String reason,
  });

  /// Register a (full or partial) payment for a transaction
  Future<Either<Failure, FinanceTransactionEntity>> registerPayment({
    required String leagueId,
    required String transactionId,
    required double amount,
    required PaymentMethod paymentMethod,
    String? paymentReference,
  });

  /// Generate the card fines of a finished match; returns how many were created
  Future<Either<Failure, int>> generateFinesFromMatch({
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
