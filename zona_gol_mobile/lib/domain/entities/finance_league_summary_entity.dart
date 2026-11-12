import 'package:equatable/equatable.dart';

/// Finance League Summary Entity
/// League-wide totals (GET /leagues/{id}/finance/summary).
class FinanceLeagueSummaryEntity extends Equatable {
  final String leagueId;

  /// Income transactions (payments received, sponsorship...), not cancelled.
  final double totalIncome;

  /// Charges and expenses, not cancelled or waived.
  final double totalCharges;

  /// Amount already paid on charges.
  final double totalCollected;

  /// Amount still owed on open charges.
  final double totalPending;

  /// Amount still owed on overdue charges.
  final double totalOverdue;
  final int teamsWithTransactions;
  final int totalTransactions;
  final int overdueTransactions;

  const FinanceLeagueSummaryEntity({
    required this.leagueId,
    this.totalIncome = 0.0,
    this.totalCharges = 0.0,
    this.totalCollected = 0.0,
    this.totalPending = 0.0,
    this.totalOverdue = 0.0,
    this.teamsWithTransactions = 0,
    this.totalTransactions = 0,
    this.overdueTransactions = 0,
  });

  @override
  List<Object?> get props => [
    leagueId,
    totalIncome,
    totalCharges,
    totalCollected,
    totalPending,
    totalOverdue,
    teamsWithTransactions,
    totalTransactions,
    overdueTransactions,
  ];
}
