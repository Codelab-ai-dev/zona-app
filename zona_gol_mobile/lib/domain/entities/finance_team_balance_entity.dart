import 'package:equatable/equatable.dart';

/// Finance Team Balance Entity
/// One team's account (GET /leagues/{id}/finance/balances).
class FinanceTeamBalanceEntity extends Equatable {
  final String teamId;
  final String teamName;
  final String? teamLogo;

  /// Charges billed to the team (not cancelled or waived).
  final double totalCharges;

  /// Income transactions recorded for the team.
  final double totalPaid;

  /// totalPaid - totalCharges (negative = debt).
  final double balance;

  /// Amount still owed on open charges.
  final double pendingBalance;
  final int overdueCount;
  final int pendingFinesCount;
  final DateTime? lastTransactionAt;

  const FinanceTeamBalanceEntity({
    required this.teamId,
    required this.teamName,
    this.teamLogo,
    this.totalCharges = 0.0,
    this.totalPaid = 0.0,
    this.balance = 0.0,
    this.pendingBalance = 0.0,
    this.overdueCount = 0,
    this.pendingFinesCount = 0,
    this.lastTransactionAt,
  });

  @override
  List<Object?> get props => [
    teamId,
    teamName,
    teamLogo,
    totalCharges,
    totalPaid,
    balance,
    pendingBalance,
    overdueCount,
    pendingFinesCount,
    lastTransactionAt,
  ];

  /// Share of the charges already settled (0.0 to 100.0).
  double get paymentPercentage {
    if (totalCharges <= 0) return 100.0;
    return ((totalCharges - pendingBalance) / totalCharges * 100).clamp(
      0.0,
      100.0,
    );
  }
}
