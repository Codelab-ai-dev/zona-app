import 'package:equatable/equatable.dart';

import '../../../domain/entities/finance_config_entity.dart';
import '../../../domain/entities/finance_league_summary_entity.dart';
import '../../../domain/entities/finance_team_balance_entity.dart';
import '../../../domain/entities/finance_transaction_entity.dart';

abstract class FinanceState extends Equatable {
  const FinanceState();

  @override
  List<Object?> get props => [];
}

class FinanceInitial extends FinanceState {}

class FinanceLoading extends FinanceState {}

/// Dashboard loaded with summary and balances
class FinanceDashboardLoaded extends FinanceState {
  final FinanceLeagueSummaryEntity summary;
  final List<FinanceTeamBalanceEntity> balances;

  const FinanceDashboardLoaded({
    required this.summary,
    required this.balances,
  });

  @override
  List<Object?> get props => [summary, balances];
}

/// Transactions loaded
class FinanceTransactionsLoaded extends FinanceState {
  final List<FinanceTransactionEntity> transactions;

  const FinanceTransactionsLoaded({required this.transactions});

  int get pendingCount =>
      transactions.where((t) => !t.isPaid && !t.isOverdue).length;

  int get overdueCount => transactions.where((t) => t.isOverdue).length;

  int get paidCount => transactions.where((t) => t.isPaid).length;

  @override
  List<Object?> get props => [transactions];
}

/// Finance config loaded
class FinanceConfigLoaded extends FinanceState {
  final FinanceConfigEntity config;

  const FinanceConfigLoaded({required this.config});

  @override
  List<Object?> get props => [config];
}

/// Transaction created successfully
class FinanceTransactionCreated extends FinanceState {
  final String message;

  const FinanceTransactionCreated(
      {this.message = 'Transaccion creada exitosamente'});

  @override
  List<Object?> get props => [message];
}

/// Transaction cancelled successfully
class FinanceTransactionCancelled extends FinanceState {
  final String message;

  const FinanceTransactionCancelled(
      {this.message = 'Transaccion cancelada'});

  @override
  List<Object?> get props => [message];
}

/// Payment registered successfully
class FinancePaymentRegistered extends FinanceState {
  final String message;

  const FinancePaymentRegistered(
      {this.message = 'Pago registrado exitosamente'});

  @override
  List<Object?> get props => [message];
}

/// Config updated successfully
class FinanceConfigUpdated extends FinanceState {
  final String message;

  const FinanceConfigUpdated(
      {this.message = 'Configuracion actualizada'});

  @override
  List<Object?> get props => [message];
}

/// Fines generated from match
class FinanceFinesGenerated extends FinanceState {
  final int count;
  final String message;

  FinanceFinesGenerated({required this.count})
      : message = count > 0
            ? '$count multa${count > 1 ? 's' : ''} generada${count > 1 ? 's' : ''}'
            : 'No se generaron multas';

  @override
  List<Object?> get props => [count, message];
}

/// Finance error
class FinanceError extends FinanceState {
  final String message;

  const FinanceError({required this.message});

  @override
  List<Object?> get props => [message];
}
