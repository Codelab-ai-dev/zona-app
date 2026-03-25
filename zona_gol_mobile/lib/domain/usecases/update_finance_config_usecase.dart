import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';

import '../../core/errors/failures.dart';
import '../entities/finance_config_entity.dart';
import '../repositories/finance_repository.dart';

class UpdateFinanceConfigParams extends Equatable {
  final String leagueId;
  final double? registrationFee;
  final double? monthlyFee;
  final double? matchFee;
  final double? yellowCardFine;
  final double? redCardFine;
  final double? noShowFine;
  final double? lateArrivalFine;
  final double? uniformViolationFine;
  final double? misconductFine;
  final double? forfeitFine;
  final bool? autoGenerateFines;
  final String? currency;

  const UpdateFinanceConfigParams({
    required this.leagueId,
    this.registrationFee,
    this.monthlyFee,
    this.matchFee,
    this.yellowCardFine,
    this.redCardFine,
    this.noShowFine,
    this.lateArrivalFine,
    this.uniformViolationFine,
    this.misconductFine,
    this.forfeitFine,
    this.autoGenerateFines,
    this.currency,
  });

  @override
  List<Object?> get props => [
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
      ];
}

class UpdateFinanceConfigUseCase {
  final FinanceRepository repository;

  UpdateFinanceConfigUseCase(this.repository);

  Future<Either<Failure, FinanceConfigEntity>> call(
      UpdateFinanceConfigParams params) {
    return repository.updateConfig(
      leagueId: params.leagueId,
      registrationFee: params.registrationFee,
      monthlyFee: params.monthlyFee,
      matchFee: params.matchFee,
      yellowCardFine: params.yellowCardFine,
      redCardFine: params.redCardFine,
      noShowFine: params.noShowFine,
      lateArrivalFine: params.lateArrivalFine,
      uniformViolationFine: params.uniformViolationFine,
      misconductFine: params.misconductFine,
      forfeitFine: params.forfeitFine,
      autoGenerateFines: params.autoGenerateFines,
      currency: params.currency,
    );
  }
}
