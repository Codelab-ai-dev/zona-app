import 'package:equatable/equatable.dart';

import 'finance_enums.dart';

/// Finance Config Entity
/// The league's fees, fines and payment settings (GET/PUT /leagues/{id}/finance/config).
class FinanceConfigEntity extends Equatable {
  final String id;
  final String leagueId;

  // Cuotas
  final double teamRegistrationFee;
  final double playerRegistrationFee;
  final double lateRegistrationSurcharge;

  // Multas
  final double yellowCardFine;
  final double redCardFine;
  final double doubleYellowFine;
  final double absenceFine;
  final double lateArrivalFine;
  final double misconductFine;
  final double uniformViolationFine;

  // Operativos
  final double refereeFeePerMatch;
  final double assistantRefereeFee;
  final double fieldRentalPerMatch;

  final Currency currency;
  final int paymentDueDays;
  final int overdueGraceDays;
  final bool autoGenerateFines;
  final bool autoGenerateRefereeFees;
  final bool notifyOnNewCharge;
  final bool notifyOnOverdue;
  final String? paymentInstructions;
  final String? bankAccountInfo;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const FinanceConfigEntity({
    required this.id,
    required this.leagueId,
    this.teamRegistrationFee = 0.0,
    this.playerRegistrationFee = 0.0,
    this.lateRegistrationSurcharge = 0.0,
    this.yellowCardFine = 0.0,
    this.redCardFine = 0.0,
    this.doubleYellowFine = 0.0,
    this.absenceFine = 0.0,
    this.lateArrivalFine = 0.0,
    this.misconductFine = 0.0,
    this.uniformViolationFine = 0.0,
    this.refereeFeePerMatch = 0.0,
    this.assistantRefereeFee = 0.0,
    this.fieldRentalPerMatch = 0.0,
    this.currency = Currency.mxn,
    this.paymentDueDays = 7,
    this.overdueGraceDays = 3,
    this.autoGenerateFines = false,
    this.autoGenerateRefereeFees = false,
    this.notifyOnNewCharge = false,
    this.notifyOnOverdue = false,
    this.paymentInstructions,
    this.bankAccountInfo,
    this.createdAt,
    this.updatedAt,
  });

  /// Configured amount used to prefill a new transaction of [type] (0 = none).
  double defaultAmountFor(TransactionType type) {
    switch (type) {
      case TransactionType.teamRegistration:
        return teamRegistrationFee;
      case TransactionType.playerRegistration:
        return playerRegistrationFee;
      case TransactionType.yellowCardFine:
        return yellowCardFine;
      case TransactionType.redCardFine:
        return redCardFine;
      case TransactionType.doubleYellowFine:
        return doubleYellowFine;
      case TransactionType.absenceFine:
        return absenceFine;
      case TransactionType.lateArrivalFine:
        return lateArrivalFine;
      case TransactionType.misconductFine:
        return misconductFine;
      case TransactionType.uniformViolationFine:
        return uniformViolationFine;
      case TransactionType.refereeFee:
        return refereeFeePerMatch;
      case TransactionType.fieldRental:
        return fieldRentalPerMatch;
      default:
        return 0;
    }
  }

  @override
  List<Object?> get props => [
    id,
    leagueId,
    teamRegistrationFee,
    playerRegistrationFee,
    lateRegistrationSurcharge,
    yellowCardFine,
    redCardFine,
    doubleYellowFine,
    absenceFine,
    lateArrivalFine,
    misconductFine,
    uniformViolationFine,
    refereeFeePerMatch,
    assistantRefereeFee,
    fieldRentalPerMatch,
    currency,
    paymentDueDays,
    overdueGraceDays,
    autoGenerateFines,
    autoGenerateRefereeFees,
    notifyOnNewCharge,
    notifyOnOverdue,
    paymentInstructions,
    bankAccountInfo,
    createdAt,
    updatedAt,
  ];

  FinanceConfigEntity copyWith({
    double? teamRegistrationFee,
    double? playerRegistrationFee,
    double? lateRegistrationSurcharge,
    double? yellowCardFine,
    double? redCardFine,
    double? doubleYellowFine,
    double? absenceFine,
    double? lateArrivalFine,
    double? misconductFine,
    double? uniformViolationFine,
    double? refereeFeePerMatch,
    double? assistantRefereeFee,
    double? fieldRentalPerMatch,
    Currency? currency,
    int? paymentDueDays,
    int? overdueGraceDays,
    bool? autoGenerateFines,
    bool? autoGenerateRefereeFees,
    bool? notifyOnNewCharge,
    bool? notifyOnOverdue,
    String? paymentInstructions,
    String? bankAccountInfo,
  }) {
    return FinanceConfigEntity(
      id: id,
      leagueId: leagueId,
      teamRegistrationFee: teamRegistrationFee ?? this.teamRegistrationFee,
      playerRegistrationFee:
          playerRegistrationFee ?? this.playerRegistrationFee,
      lateRegistrationSurcharge:
          lateRegistrationSurcharge ?? this.lateRegistrationSurcharge,
      yellowCardFine: yellowCardFine ?? this.yellowCardFine,
      redCardFine: redCardFine ?? this.redCardFine,
      doubleYellowFine: doubleYellowFine ?? this.doubleYellowFine,
      absenceFine: absenceFine ?? this.absenceFine,
      lateArrivalFine: lateArrivalFine ?? this.lateArrivalFine,
      misconductFine: misconductFine ?? this.misconductFine,
      uniformViolationFine: uniformViolationFine ?? this.uniformViolationFine,
      refereeFeePerMatch: refereeFeePerMatch ?? this.refereeFeePerMatch,
      assistantRefereeFee: assistantRefereeFee ?? this.assistantRefereeFee,
      fieldRentalPerMatch: fieldRentalPerMatch ?? this.fieldRentalPerMatch,
      currency: currency ?? this.currency,
      paymentDueDays: paymentDueDays ?? this.paymentDueDays,
      overdueGraceDays: overdueGraceDays ?? this.overdueGraceDays,
      autoGenerateFines: autoGenerateFines ?? this.autoGenerateFines,
      autoGenerateRefereeFees:
          autoGenerateRefereeFees ?? this.autoGenerateRefereeFees,
      notifyOnNewCharge: notifyOnNewCharge ?? this.notifyOnNewCharge,
      notifyOnOverdue: notifyOnOverdue ?? this.notifyOnOverdue,
      paymentInstructions: paymentInstructions ?? this.paymentInstructions,
      bankAccountInfo: bankAccountInfo ?? this.bankAccountInfo,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }
}
