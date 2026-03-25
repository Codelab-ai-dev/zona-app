/// Finance Enums
/// Defines transaction types, statuses, payment methods, and currencies

/// Transaction Type
enum TransactionType {
  registrationFee,
  monthlyFee,
  matchFee,
  yellowCardFine,
  redCardFine,
  noShowFine,
  lateArrivalFine,
  uniformViolationFine,
  misconductFine,
  forfeitFine,
  tournamentEntryFee,
  transferFee,
  sponsorship,
  prizeMoney,
  refund,
  discount,
  payment,
  adjustment,
  otherIncome,
  otherExpense,
  other;

  String get display {
    switch (this) {
      case TransactionType.registrationFee:
        return 'Cuota de Inscripción';
      case TransactionType.monthlyFee:
        return 'Mensualidad';
      case TransactionType.matchFee:
        return 'Cuota de Partido';
      case TransactionType.yellowCardFine:
        return 'Multa Tarjeta Amarilla';
      case TransactionType.redCardFine:
        return 'Multa Tarjeta Roja';
      case TransactionType.noShowFine:
        return 'Multa por Inasistencia';
      case TransactionType.lateArrivalFine:
        return 'Multa por Llegada Tarde';
      case TransactionType.uniformViolationFine:
        return 'Multa por Uniforme';
      case TransactionType.misconductFine:
        return 'Multa por Mala Conducta';
      case TransactionType.forfeitFine:
        return 'Multa por Forfeit';
      case TransactionType.tournamentEntryFee:
        return 'Inscripción a Torneo';
      case TransactionType.transferFee:
        return 'Cuota de Transferencia';
      case TransactionType.sponsorship:
        return 'Patrocinio';
      case TransactionType.prizeMoney:
        return 'Premio';
      case TransactionType.refund:
        return 'Reembolso';
      case TransactionType.discount:
        return 'Descuento';
      case TransactionType.payment:
        return 'Pago';
      case TransactionType.adjustment:
        return 'Ajuste';
      case TransactionType.otherIncome:
        return 'Otro Ingreso';
      case TransactionType.otherExpense:
        return 'Otro Gasto';
      case TransactionType.other:
        return 'Otro';
    }
  }

  String get dbValue {
    switch (this) {
      case TransactionType.registrationFee:
        return 'registration_fee';
      case TransactionType.monthlyFee:
        return 'monthly_fee';
      case TransactionType.matchFee:
        return 'match_fee';
      case TransactionType.yellowCardFine:
        return 'yellow_card_fine';
      case TransactionType.redCardFine:
        return 'red_card_fine';
      case TransactionType.noShowFine:
        return 'no_show_fine';
      case TransactionType.lateArrivalFine:
        return 'late_arrival_fine';
      case TransactionType.uniformViolationFine:
        return 'uniform_violation_fine';
      case TransactionType.misconductFine:
        return 'misconduct_fine';
      case TransactionType.forfeitFine:
        return 'forfeit_fine';
      case TransactionType.tournamentEntryFee:
        return 'tournament_entry_fee';
      case TransactionType.transferFee:
        return 'transfer_fee';
      case TransactionType.sponsorship:
        return 'sponsorship';
      case TransactionType.prizeMoney:
        return 'prize_money';
      case TransactionType.refund:
        return 'refund';
      case TransactionType.discount:
        return 'discount';
      case TransactionType.payment:
        return 'payment';
      case TransactionType.adjustment:
        return 'adjustment';
      case TransactionType.otherIncome:
        return 'other_income';
      case TransactionType.otherExpense:
        return 'other_expense';
      case TransactionType.other:
        return 'other';
    }
  }

  /// Whether this transaction type represents income
  bool get isIncome {
    switch (this) {
      case TransactionType.registrationFee:
      case TransactionType.monthlyFee:
      case TransactionType.matchFee:
      case TransactionType.yellowCardFine:
      case TransactionType.redCardFine:
      case TransactionType.noShowFine:
      case TransactionType.lateArrivalFine:
      case TransactionType.uniformViolationFine:
      case TransactionType.misconductFine:
      case TransactionType.forfeitFine:
      case TransactionType.tournamentEntryFee:
      case TransactionType.transferFee:
      case TransactionType.sponsorship:
      case TransactionType.payment:
      case TransactionType.otherIncome:
        return true;
      case TransactionType.prizeMoney:
      case TransactionType.refund:
      case TransactionType.discount:
      case TransactionType.adjustment:
      case TransactionType.otherExpense:
      case TransactionType.other:
        return false;
    }
  }

  /// Whether this transaction type is a fine
  bool get isFine {
    switch (this) {
      case TransactionType.yellowCardFine:
      case TransactionType.redCardFine:
      case TransactionType.noShowFine:
      case TransactionType.lateArrivalFine:
      case TransactionType.uniformViolationFine:
      case TransactionType.misconductFine:
      case TransactionType.forfeitFine:
        return true;
      default:
        return false;
    }
  }

  static TransactionType fromString(String value) {
    switch (value) {
      case 'registration_fee':
        return TransactionType.registrationFee;
      case 'monthly_fee':
        return TransactionType.monthlyFee;
      case 'match_fee':
        return TransactionType.matchFee;
      case 'yellow_card_fine':
        return TransactionType.yellowCardFine;
      case 'red_card_fine':
        return TransactionType.redCardFine;
      case 'no_show_fine':
        return TransactionType.noShowFine;
      case 'late_arrival_fine':
        return TransactionType.lateArrivalFine;
      case 'uniform_violation_fine':
        return TransactionType.uniformViolationFine;
      case 'misconduct_fine':
        return TransactionType.misconductFine;
      case 'forfeit_fine':
        return TransactionType.forfeitFine;
      case 'tournament_entry_fee':
        return TransactionType.tournamentEntryFee;
      case 'transfer_fee':
        return TransactionType.transferFee;
      case 'sponsorship':
        return TransactionType.sponsorship;
      case 'prize_money':
        return TransactionType.prizeMoney;
      case 'refund':
        return TransactionType.refund;
      case 'discount':
        return TransactionType.discount;
      case 'payment':
        return TransactionType.payment;
      case 'adjustment':
        return TransactionType.adjustment;
      case 'other_income':
        return TransactionType.otherIncome;
      case 'other_expense':
        return TransactionType.otherExpense;
      case 'other':
        return TransactionType.other;
      default:
        return TransactionType.other;
    }
  }
}

/// Transaction Status
enum TransactionStatus {
  pending,
  paid,
  partiallyPaid,
  overdue,
  cancelled,
  waived;

  String get display {
    switch (this) {
      case TransactionStatus.pending:
        return 'Pendiente';
      case TransactionStatus.paid:
        return 'Pagado';
      case TransactionStatus.partiallyPaid:
        return 'Parcialmente Pagado';
      case TransactionStatus.overdue:
        return 'Vencido';
      case TransactionStatus.cancelled:
        return 'Cancelado';
      case TransactionStatus.waived:
        return 'Condonado';
    }
  }

  String get dbValue {
    switch (this) {
      case TransactionStatus.pending:
        return 'pending';
      case TransactionStatus.paid:
        return 'paid';
      case TransactionStatus.partiallyPaid:
        return 'partially_paid';
      case TransactionStatus.overdue:
        return 'overdue';
      case TransactionStatus.cancelled:
        return 'cancelled';
      case TransactionStatus.waived:
        return 'waived';
    }
  }

  static TransactionStatus fromString(String value) {
    switch (value) {
      case 'pending':
        return TransactionStatus.pending;
      case 'paid':
        return TransactionStatus.paid;
      case 'partially_paid':
        return TransactionStatus.partiallyPaid;
      case 'overdue':
        return TransactionStatus.overdue;
      case 'cancelled':
        return TransactionStatus.cancelled;
      case 'waived':
        return TransactionStatus.waived;
      default:
        return TransactionStatus.pending;
    }
  }
}

/// Payment Method
enum PaymentMethod {
  cash,
  transfer,
  card,
  other;

  String get display {
    switch (this) {
      case PaymentMethod.cash:
        return 'Efectivo';
      case PaymentMethod.transfer:
        return 'Transferencia';
      case PaymentMethod.card:
        return 'Tarjeta';
      case PaymentMethod.other:
        return 'Otro';
    }
  }

  String get dbValue {
    switch (this) {
      case PaymentMethod.cash:
        return 'cash';
      case PaymentMethod.transfer:
        return 'transfer';
      case PaymentMethod.card:
        return 'card';
      case PaymentMethod.other:
        return 'other';
    }
  }

  static PaymentMethod fromString(String value) {
    switch (value) {
      case 'cash':
        return PaymentMethod.cash;
      case 'transfer':
        return PaymentMethod.transfer;
      case 'card':
        return PaymentMethod.card;
      case 'other':
        return PaymentMethod.other;
      default:
        return PaymentMethod.other;
    }
  }
}

/// Currency
enum Currency {
  mxn,
  usd;

  String get display {
    switch (this) {
      case Currency.mxn:
        return 'MXN';
      case Currency.usd:
        return 'USD';
    }
  }

  String get dbValue {
    switch (this) {
      case Currency.mxn:
        return 'mxn';
      case Currency.usd:
        return 'usd';
    }
  }

  String get symbol {
    switch (this) {
      case Currency.mxn:
        return '\$';
      case Currency.usd:
        return 'US\$';
    }
  }

  static Currency fromString(String value) {
    switch (value) {
      case 'mxn':
        return Currency.mxn;
      case 'usd':
        return Currency.usd;
      default:
        return Currency.mxn;
    }
  }
}
