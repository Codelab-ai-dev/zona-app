import '../../domain/entities/finance_config_entity.dart';
import '../../domain/entities/finance_enums.dart';
import '../../domain/entities/finance_league_summary_entity.dart';
import '../../domain/entities/finance_team_balance_entity.dart';
import '../../domain/entities/finance_transaction_entity.dart';
import '../models/finance_config_model.dart';
import '../models/finance_transaction_model.dart';

/// Maps between finance data models/rows and domain entities
class FinanceMapper {
  /// Convert a DB row to FinanceConfigEntity
  static FinanceConfigEntity configFromRow(Map<String, dynamic> row) {
    return FinanceConfigEntity(
      id: row['id'] as String,
      leagueId: row['league_id'] as String,
      registrationFee: (row['registration_fee'] as num?)?.toDouble() ?? 0.0,
      monthlyFee: (row['monthly_fee'] as num?)?.toDouble() ?? 0.0,
      matchFee: (row['match_fee'] as num?)?.toDouble() ?? 0.0,
      yellowCardFine: (row['yellow_card_fine'] as num?)?.toDouble() ?? 0.0,
      redCardFine: (row['red_card_fine'] as num?)?.toDouble() ?? 0.0,
      noShowFine: (row['no_show_fine'] as num?)?.toDouble() ?? 0.0,
      lateArrivalFine: (row['late_arrival_fine'] as num?)?.toDouble() ?? 0.0,
      uniformViolationFine:
          (row['uniform_violation_fine'] as num?)?.toDouble() ?? 0.0,
      misconductFine: (row['misconduct_fine'] as num?)?.toDouble() ?? 0.0,
      forfeitFine: (row['forfeit_fine'] as num?)?.toDouble() ?? 0.0,
      autoGenerateFines: row['auto_generate_fines'] as bool? ?? false,
      currency: Currency.fromString(row['currency'] as String? ?? 'mxn'),
      createdAt: row['created_at'] != null
          ? DateTime.tryParse(row['created_at'] as String)
          : null,
      updatedAt: row['updated_at'] != null
          ? DateTime.tryParse(row['updated_at'] as String)
          : null,
    );
  }

  /// Convert FinanceConfigModel to FinanceConfigEntity
  static FinanceConfigEntity configToEntity(FinanceConfigModel model) {
    return FinanceConfigEntity(
      id: model.id,
      leagueId: model.leagueId,
      registrationFee: model.registrationFee,
      monthlyFee: model.monthlyFee,
      matchFee: model.matchFee,
      yellowCardFine: model.yellowCardFine,
      redCardFine: model.redCardFine,
      noShowFine: model.noShowFine,
      lateArrivalFine: model.lateArrivalFine,
      uniformViolationFine: model.uniformViolationFine,
      misconductFine: model.misconductFine,
      forfeitFine: model.forfeitFine,
      autoGenerateFines: model.autoGenerateFines,
      currency: Currency.fromString(model.currency),
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    );
  }

  /// Convert a DB row (with optional joined team/player data) to FinanceTransactionEntity
  static FinanceTransactionEntity transactionFromRow(
      Map<String, dynamic> row) {
    final team = row['teams'] as Map<String, dynamic>?;
    final player = row['players'] as Map<String, dynamic>?;

    return FinanceTransactionEntity(
      id: row['id'] as String,
      leagueId: row['league_id'] as String,
      teamId: row['team_id'] as String,
      playerId: row['player_id'] as String?,
      matchId: row['match_id'] as String?,
      transactionType: TransactionType.fromString(
          row['transaction_type'] as String? ?? 'other'),
      amount: (row['amount'] as num?)?.toDouble() ?? 0.0,
      amountPaid: (row['amount_paid'] as num?)?.toDouble() ?? 0.0,
      status: TransactionStatus.fromString(
          row['status'] as String? ?? 'pending'),
      description: row['description'] as String?,
      paymentMethod: row['payment_method'] != null
          ? PaymentMethod.fromString(row['payment_method'] as String)
          : null,
      paidAt: row['paid_at'] != null
          ? DateTime.tryParse(row['paid_at'] as String)
          : null,
      dueDate: row['due_date'] != null
          ? DateTime.tryParse(row['due_date'] as String)
          : null,
      createdAt: row['created_at'] != null
          ? DateTime.tryParse(row['created_at'] as String)
          : null,
      updatedAt: row['updated_at'] != null
          ? DateTime.tryParse(row['updated_at'] as String)
          : null,
      teamName: team?['name'] as String?,
      playerName: player?['name'] as String?,
    );
  }

  /// Convert FinanceTransactionModel to FinanceTransactionEntity (without joined data)
  static FinanceTransactionEntity transactionToEntity(
      FinanceTransactionModel model) {
    return FinanceTransactionEntity(
      id: model.id,
      leagueId: model.leagueId,
      teamId: model.teamId,
      playerId: model.playerId,
      matchId: model.matchId,
      transactionType: TransactionType.fromString(model.transactionType),
      amount: model.amount,
      amountPaid: model.amountPaid,
      status: TransactionStatus.fromString(model.status),
      description: model.description,
      paymentMethod: model.paymentMethod != null
          ? PaymentMethod.fromString(model.paymentMethod!)
          : null,
      paidAt: model.paidAt,
      dueDate: model.dueDate,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    );
  }

  /// Convert a DB row from finance_team_balances view to FinanceTeamBalanceEntity
  static FinanceTeamBalanceEntity balanceFromRow(Map<String, dynamic> row) {
    return FinanceTeamBalanceEntity(
      teamId: row['team_id'] as String,
      teamName: row['team_name'] as String? ?? 'Equipo desconocido',
      teamLogo: row['team_logo'] as String?,
      totalCharges: (row['total_charges'] as num?)?.toDouble() ?? 0.0,
      totalPaid: (row['total_paid'] as num?)?.toDouble() ?? 0.0,
      totalPending: (row['total_pending'] as num?)?.toDouble() ?? 0.0,
      totalOverdue: (row['total_overdue'] as num?)?.toDouble() ?? 0.0,
      transactionCount: (row['transaction_count'] as num?)?.toInt() ?? 0,
    );
  }

  /// Convert a DB row from finance_league_summary view to FinanceLeagueSummaryEntity
  static FinanceLeagueSummaryEntity summaryFromRow(Map<String, dynamic> row) {
    return FinanceLeagueSummaryEntity(
      leagueId: row['league_id'] as String,
      totalIncome: (row['total_income'] as num?)?.toDouble() ?? 0.0,
      totalExpenses: (row['total_expenses'] as num?)?.toDouble() ?? 0.0,
      totalPending: (row['total_pending'] as num?)?.toDouble() ?? 0.0,
      totalOverdue: (row['total_overdue'] as num?)?.toDouble() ?? 0.0,
      totalPaid: (row['total_paid'] as num?)?.toDouble() ?? 0.0,
      teamCount: (row['team_count'] as num?)?.toInt() ?? 0,
      transactionCount: (row['transaction_count'] as num?)?.toInt() ?? 0,
    );
  }
}
