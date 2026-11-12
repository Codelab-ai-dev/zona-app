/// Finance Enums
/// Mirror the TransactionType / TransactionStatus / PaymentMethod / Currency
/// values of the API (backend/internal/finance/finance.go).

/// Transaction Type
enum TransactionType {
  // Cuotas
  teamRegistration('team_registration', 'Inscripción de Equipo'),
  playerRegistration('player_registration', 'Inscripción de Jugador'),
  // Multas
  yellowCardFine('yellow_card_fine', 'Multa Tarjeta Amarilla'),
  redCardFine('red_card_fine', 'Multa Tarjeta Roja'),
  doubleYellowFine('double_yellow_fine', 'Multa Doble Amarilla'),
  absenceFine('absence_fine', 'Multa por Incomparecencia'),
  lateArrivalFine('late_arrival_fine', 'Multa por Llegada Tarde'),
  misconductFine('misconduct_fine', 'Multa por Mala Conducta'),
  uniformViolationFine('uniform_violation_fine', 'Multa por Uniforme'),
  // Operativos
  refereeFee('referee_fee', 'Pago de Árbitro'),
  fieldRental('field_rental', 'Renta de Cancha'),
  equipmentFee('equipment_fee', 'Equipo/Materiales'),
  // Pagos
  paymentReceived('payment_received', 'Pago Recibido'),
  partialPayment('partial_payment', 'Pago Parcial'),
  refund('refund', 'Devolución'),
  discount('discount', 'Descuento'),
  // Otros
  otherIncome('other_income', 'Otro Ingreso'),
  sponsorship('sponsorship', 'Patrocinio'),
  prizeMoney('prize_money', 'Premio/Bonificación'),
  otherExpense('other_expense', 'Otro Gasto'),
  adjustment('adjustment', 'Ajuste Manual');

  const TransactionType(this.dbValue, this.display);

  /// Value sent to and returned by the API.
  final String dbValue;

  /// Spanish label.
  final String display;

  /// Money coming in (payments, sponsorship...) instead of a charge or an expense.
  bool get isIncome => const {
    TransactionType.paymentReceived,
    TransactionType.partialPayment,
    TransactionType.sponsorship,
    TransactionType.otherIncome,
    TransactionType.prizeMoney,
  }.contains(this);

  /// Whether this transaction type is a fine
  bool get isFine => const {
    TransactionType.yellowCardFine,
    TransactionType.redCardFine,
    TransactionType.doubleYellowFine,
    TransactionType.absenceFine,
    TransactionType.lateArrivalFine,
    TransactionType.misconductFine,
    TransactionType.uniformViolationFine,
  }.contains(this);

  /// Registration fees and fines are billed to a team, so the team is mandatory.
  bool get needsTeam =>
      isFine ||
      this == TransactionType.teamRegistration ||
      this == TransactionType.playerRegistration;

  /// Default description used to prefill the form.
  String get defaultDescription {
    switch (this) {
      case TransactionType.teamRegistration:
        return 'Cuota de inscripción de equipo';
      case TransactionType.playerRegistration:
        return 'Cuota de inscripción de jugador';
      case TransactionType.yellowCardFine:
        return 'Multa por tarjeta amarilla';
      case TransactionType.redCardFine:
        return 'Multa por tarjeta roja';
      case TransactionType.doubleYellowFine:
        return 'Multa por doble amarilla';
      case TransactionType.absenceFine:
        return 'Multa por incomparecencia';
      case TransactionType.lateArrivalFine:
        return 'Multa por llegada tarde';
      case TransactionType.refereeFee:
        return 'Pago de arbitraje';
      default:
        return display;
    }
  }

  static TransactionType fromString(String value) {
    for (final t in TransactionType.values) {
      if (t.dbValue == value) return t;
    }
    return TransactionType.adjustment;
  }
}

/// Transaction Status
enum TransactionStatus {
  pending('pending', 'Pendiente'),
  paid('paid', 'Pagado'),
  partial('partial', 'Pago Parcial'),
  overdue('overdue', 'Vencido'),
  cancelled('cancelled', 'Cancelado'),
  waived('waived', 'Condonado');

  const TransactionStatus(this.dbValue, this.display);

  final String dbValue;
  final String display;

  /// Statuses on which the API still accepts pay / cancel.
  bool get isOpen =>
      this == TransactionStatus.pending ||
      this == TransactionStatus.partial ||
      this == TransactionStatus.overdue;

  static TransactionStatus fromString(String value) {
    for (final s in TransactionStatus.values) {
      if (s.dbValue == value) return s;
    }
    return TransactionStatus.pending;
  }
}

/// Payment Method
enum PaymentMethod {
  cash('cash', 'Efectivo'),
  bankTransfer('bank_transfer', 'Transferencia'),
  card('card', 'Tarjeta'),
  mercadopago('mercadopago', 'MercadoPago'),
  stripe('stripe', 'Stripe'),
  paypal('paypal', 'PayPal'),
  oxxo('oxxo', 'OXXO'),
  spei('spei', 'SPEI'),
  other('other', 'Otro');

  const PaymentMethod(this.dbValue, this.display);

  final String dbValue;
  final String display;

  /// Methods offered when an admin registers a payment by hand.
  static const manual = [
    PaymentMethod.cash,
    PaymentMethod.bankTransfer,
    PaymentMethod.spei,
    PaymentMethod.card,
    PaymentMethod.oxxo,
    PaymentMethod.other,
  ];

  static PaymentMethod fromString(String value) {
    for (final m in PaymentMethod.values) {
      if (m.dbValue == value) return m;
    }
    return PaymentMethod.other;
  }
}

/// Currency
enum Currency {
  mxn('MXN', 'Peso mexicano', '\$'),
  usd('USD', 'Dólar estadounidense', 'US\$'),
  eur('EUR', 'Euro', '€'),
  cop('COP', 'Peso colombiano', 'COL\$'),
  ars('ARS', 'Peso argentino', 'AR\$'),
  clp('CLP', 'Peso chileno', 'CLP\$'),
  pen('PEN', 'Sol peruano', 'S/');

  const Currency(this.dbValue, this.display, this.symbol);

  /// ISO code, as the API sends it.
  final String dbValue;
  final String display;
  final String symbol;

  static Currency fromString(String value) {
    final upper = value.toUpperCase();
    for (final c in Currency.values) {
      if (c.dbValue == upper) return c;
    }
    return Currency.mxn;
  }
}
