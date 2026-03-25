import 'package:equatable/equatable.dart';

import 'finance_enums.dart';

/// Finance Transaction Entity
/// Represents a financial transaction in the domain layer
class FinanceTransactionEntity extends Equatable {
  final String id;
  final String leagueId;
  final String teamId;
  final String? playerId;
  final String? matchId;
  final TransactionType transactionType;
  final double amount;
  final double amountPaid;
  final TransactionStatus status;
  final String? description;
  final PaymentMethod? paymentMethod;
  final DateTime? paidAt;
  final DateTime? dueDate;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  // Joined fields
  final String? teamName;
  final String? playerName;

  const FinanceTransactionEntity({
    required this.id,
    required this.leagueId,
    required this.teamId,
    this.playerId,
    this.matchId,
    required this.transactionType,
    required this.amount,
    this.amountPaid = 0.0,
    this.status = TransactionStatus.pending,
    this.description,
    this.paymentMethod,
    this.paidAt,
    this.dueDate,
    this.createdAt,
    this.updatedAt,
    this.teamName,
    this.playerName,
  });

  @override
  List<Object?> get props => [
        id,
        leagueId,
        teamId,
        playerId,
        matchId,
        transactionType,
        amount,
        amountPaid,
        status,
        description,
        paymentMethod,
        paidAt,
        dueDate,
        createdAt,
        updatedAt,
        teamName,
        playerName,
      ];

  // Computed properties

  /// Amount still pending payment
  double get amountPending => amount - amountPaid;

  /// Whether the transaction is fully paid
  bool get isPaid => status == TransactionStatus.paid;

  /// Whether the transaction is overdue
  bool get isOverdue {
    if (status == TransactionStatus.overdue) return true;
    if (dueDate == null) return false;
    if (status == TransactionStatus.paid ||
        status == TransactionStatus.cancelled ||
        status == TransactionStatus.waived) return false;
    return DateTime.now().isAfter(dueDate!);
  }

  FinanceTransactionEntity copyWith({
    String? id,
    String? leagueId,
    String? teamId,
    String? playerId,
    String? matchId,
    TransactionType? transactionType,
    double? amount,
    double? amountPaid,
    TransactionStatus? status,
    String? description,
    PaymentMethod? paymentMethod,
    DateTime? paidAt,
    DateTime? dueDate,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? teamName,
    String? playerName,
  }) {
    return FinanceTransactionEntity(
      id: id ?? this.id,
      leagueId: leagueId ?? this.leagueId,
      teamId: teamId ?? this.teamId,
      playerId: playerId ?? this.playerId,
      matchId: matchId ?? this.matchId,
      transactionType: transactionType ?? this.transactionType,
      amount: amount ?? this.amount,
      amountPaid: amountPaid ?? this.amountPaid,
      status: status ?? this.status,
      description: description ?? this.description,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      paidAt: paidAt ?? this.paidAt,
      dueDate: dueDate ?? this.dueDate,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      teamName: teamName ?? this.teamName,
      playerName: playerName ?? this.playerName,
    );
  }
}
