// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'finance_config_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$FinanceConfigModelImpl _$$FinanceConfigModelImplFromJson(
        Map<String, dynamic> json) =>
    _$FinanceConfigModelImpl(
      id: json['id'] as String,
      leagueId: json['league_id'] as String,
      registrationFee: (json['registration_fee'] as num?)?.toDouble() ?? 0.0,
      monthlyFee: (json['monthly_fee'] as num?)?.toDouble() ?? 0.0,
      matchFee: (json['match_fee'] as num?)?.toDouble() ?? 0.0,
      yellowCardFine: (json['yellow_card_fine'] as num?)?.toDouble() ?? 0.0,
      redCardFine: (json['red_card_fine'] as num?)?.toDouble() ?? 0.0,
      noShowFine: (json['no_show_fine'] as num?)?.toDouble() ?? 0.0,
      lateArrivalFine: (json['late_arrival_fine'] as num?)?.toDouble() ?? 0.0,
      uniformViolationFine:
          (json['uniform_violation_fine'] as num?)?.toDouble() ?? 0.0,
      misconductFine: (json['misconduct_fine'] as num?)?.toDouble() ?? 0.0,
      forfeitFine: (json['forfeit_fine'] as num?)?.toDouble() ?? 0.0,
      autoGenerateFines: json['auto_generate_fines'] as bool? ?? false,
      currency: json['currency'] as String? ?? 'mxn',
      createdAt: json['created_at'] == null
          ? null
          : DateTime.parse(json['created_at'] as String),
      updatedAt: json['updated_at'] == null
          ? null
          : DateTime.parse(json['updated_at'] as String),
    );

Map<String, dynamic> _$$FinanceConfigModelImplToJson(
        _$FinanceConfigModelImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'league_id': instance.leagueId,
      'registration_fee': instance.registrationFee,
      'monthly_fee': instance.monthlyFee,
      'match_fee': instance.matchFee,
      'yellow_card_fine': instance.yellowCardFine,
      'red_card_fine': instance.redCardFine,
      'no_show_fine': instance.noShowFine,
      'late_arrival_fine': instance.lateArrivalFine,
      'uniform_violation_fine': instance.uniformViolationFine,
      'misconduct_fine': instance.misconductFine,
      'forfeit_fine': instance.forfeitFine,
      'auto_generate_fines': instance.autoGenerateFines,
      'currency': instance.currency,
      'created_at': instance.createdAt?.toIso8601String(),
      'updated_at': instance.updatedAt?.toIso8601String(),
    };
