import 'package:equatable/equatable.dart';

/// Finance Team Balance Entity
/// Represents the financial balance summary for a team
class FinanceTeamBalanceEntity extends Equatable {
  final String teamId;
  final String teamName;
  final String? teamLogo;
  final double totalCharges;
  final double totalPaid;
  final double totalPending;
  final double totalOverdue;
  final int transactionCount;

  const FinanceTeamBalanceEntity({
    required this.teamId,
    required this.teamName,
    this.teamLogo,
    this.totalCharges = 0.0,
    this.totalPaid = 0.0,
    this.totalPending = 0.0,
    this.totalOverdue = 0.0,
    this.transactionCount = 0,
  });

  @override
  List<Object?> get props => [
        teamId,
        teamName,
        teamLogo,
        totalCharges,
        totalPaid,
        totalPending,
        totalOverdue,
        transactionCount,
      ];

  /// Payment percentage (0.0 to 100.0)
  double get paymentPercentage {
    if (totalCharges == 0) return 100.0;
    return (totalPaid / totalCharges) * 100;
  }
}
