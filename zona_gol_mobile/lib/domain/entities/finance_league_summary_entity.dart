import 'package:equatable/equatable.dart';

/// Finance League Summary Entity
/// Represents the overall financial summary for a league
class FinanceLeagueSummaryEntity extends Equatable {
  final String leagueId;
  final double totalIncome;
  final double totalExpenses;
  final double totalPending;
  final double totalOverdue;
  final double totalPaid;
  final int teamCount;
  final int transactionCount;

  const FinanceLeagueSummaryEntity({
    required this.leagueId,
    this.totalIncome = 0.0,
    this.totalExpenses = 0.0,
    this.totalPending = 0.0,
    this.totalOverdue = 0.0,
    this.totalPaid = 0.0,
    this.teamCount = 0,
    this.transactionCount = 0,
  });

  @override
  List<Object?> get props => [
        leagueId,
        totalIncome,
        totalExpenses,
        totalPending,
        totalOverdue,
        totalPaid,
        teamCount,
        transactionCount,
      ];

  /// Net balance (income - expenses)
  double get netBalance => totalIncome - totalExpenses;
}
