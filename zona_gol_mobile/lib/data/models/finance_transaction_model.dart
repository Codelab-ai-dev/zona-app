import 'package:freezed_annotation/freezed_annotation.dart';

part 'finance_transaction_model.freezed.dart';
part 'finance_transaction_model.g.dart';

@freezed
class FinanceTransactionModel with _$FinanceTransactionModel {
  const FinanceTransactionModel._();

  @JsonSerializable(fieldRename: FieldRename.snake)
  const factory FinanceTransactionModel({
    required String id,
    required String leagueId,
    required String teamId,
    String? playerId,
    String? matchId,
    required String transactionType,
    required double amount,
    @Default(0.0) double amountPaid,
    @Default('pending') String status,
    String? description,
    String? paymentMethod,
    DateTime? paidAt,
    DateTime? dueDate,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) = _FinanceTransactionModel;

  factory FinanceTransactionModel.fromJson(Map<String, dynamic> json) =>
      _$FinanceTransactionModelFromJson(json);

  // Status helpers
  bool get isPaid => status == 'paid';
  bool get isPending => status == 'pending';
  bool get isOverdue => status == 'overdue';
  bool get isCancelled => status == 'cancelled';

  double get amountPending => amount - amountPaid;

  String get statusDisplay {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'paid':
        return 'Pagado';
      case 'partially_paid':
        return 'Parcialmente Pagado';
      case 'overdue':
        return 'Vencido';
      case 'cancelled':
        return 'Cancelado';
      case 'waived':
        return 'Condonado';
      default:
        return status;
    }
  }

  String get transactionTypeDisplay {
    switch (transactionType) {
      case 'registration_fee':
        return 'Cuota de Inscripcion';
      case 'monthly_fee':
        return 'Mensualidad';
      case 'match_fee':
        return 'Cuota de Partido';
      case 'yellow_card_fine':
        return 'Multa Tarjeta Amarilla';
      case 'red_card_fine':
        return 'Multa Tarjeta Roja';
      case 'no_show_fine':
        return 'Multa por Inasistencia';
      case 'late_arrival_fine':
        return 'Multa por Llegada Tarde';
      case 'uniform_violation_fine':
        return 'Multa por Uniforme';
      case 'misconduct_fine':
        return 'Multa por Mala Conducta';
      case 'forfeit_fine':
        return 'Multa por Forfeit';
      default:
        return transactionType;
    }
  }
}
