import 'package:equatable/equatable.dart';

import 'finance_enums.dart';

/// Finance Config Entity
/// Represents the financial configuration for a league
class FinanceConfigEntity extends Equatable {
  final String id;
  final String leagueId;
  final double registrationFee;
  final double monthlyFee;
  final double matchFee;
  final double yellowCardFine;
  final double redCardFine;
  final double noShowFine;
  final double lateArrivalFine;
  final double uniformViolationFine;
  final double misconductFine;
  final double forfeitFine;
  final bool autoGenerateFines;
  final Currency currency;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const FinanceConfigEntity({
    required this.id,
    required this.leagueId,
    this.registrationFee = 0.0,
    this.monthlyFee = 0.0,
    this.matchFee = 0.0,
    this.yellowCardFine = 0.0,
    this.redCardFine = 0.0,
    this.noShowFine = 0.0,
    this.lateArrivalFine = 0.0,
    this.uniformViolationFine = 0.0,
    this.misconductFine = 0.0,
    this.forfeitFine = 0.0,
    this.autoGenerateFines = false,
    this.currency = Currency.mxn,
    this.createdAt,
    this.updatedAt,
  });

  @override
  List<Object?> get props => [
        id,
        leagueId,
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
        autoGenerateFines,
        currency,
        createdAt,
        updatedAt,
      ];

  FinanceConfigEntity copyWith({
    String? id,
    String? leagueId,
    double? registrationFee,
    double? monthlyFee,
    double? matchFee,
    double? yellowCardFine,
    double? redCardFine,
    double? noShowFine,
    double? lateArrivalFine,
    double? uniformViolationFine,
    double? misconductFine,
    double? forfeitFine,
    bool? autoGenerateFines,
    Currency? currency,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return FinanceConfigEntity(
      id: id ?? this.id,
      leagueId: leagueId ?? this.leagueId,
      registrationFee: registrationFee ?? this.registrationFee,
      monthlyFee: monthlyFee ?? this.monthlyFee,
      matchFee: matchFee ?? this.matchFee,
      yellowCardFine: yellowCardFine ?? this.yellowCardFine,
      redCardFine: redCardFine ?? this.redCardFine,
      noShowFine: noShowFine ?? this.noShowFine,
      lateArrivalFine: lateArrivalFine ?? this.lateArrivalFine,
      uniformViolationFine: uniformViolationFine ?? this.uniformViolationFine,
      misconductFine: misconductFine ?? this.misconductFine,
      forfeitFine: forfeitFine ?? this.forfeitFine,
      autoGenerateFines: autoGenerateFines ?? this.autoGenerateFines,
      currency: currency ?? this.currency,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
