import 'package:freezed_annotation/freezed_annotation.dart';

part 'finance_config_model.freezed.dart';
part 'finance_config_model.g.dart';

@freezed
class FinanceConfigModel with _$FinanceConfigModel {
  const FinanceConfigModel._();

  @JsonSerializable(fieldRename: FieldRename.snake)
  const factory FinanceConfigModel({
    required String id,
    required String leagueId,
    @Default(0.0) double registrationFee,
    @Default(0.0) double monthlyFee,
    @Default(0.0) double matchFee,
    @Default(0.0) double yellowCardFine,
    @Default(0.0) double redCardFine,
    @Default(0.0) double noShowFine,
    @Default(0.0) double lateArrivalFine,
    @Default(0.0) double uniformViolationFine,
    @Default(0.0) double misconductFine,
    @Default(0.0) double forfeitFine,
    @Default(false) bool autoGenerateFines,
    @Default('mxn') String currency,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) = _FinanceConfigModel;

  factory FinanceConfigModel.fromJson(Map<String, dynamic> json) =>
      _$FinanceConfigModelFromJson(json);
}
