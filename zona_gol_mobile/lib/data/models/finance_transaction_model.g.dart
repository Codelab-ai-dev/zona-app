// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'finance_transaction_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$FinanceTransactionModelImpl _$$FinanceTransactionModelImplFromJson(
        Map<String, dynamic> json) =>
    _$FinanceTransactionModelImpl(
      id: json['id'] as String,
      leagueId: json['league_id'] as String,
      teamId: json['team_id'] as String,
      playerId: json['player_id'] as String?,
      matchId: json['match_id'] as String?,
      transactionType: json['transaction_type'] as String,
      amount: (json['amount'] as num).toDouble(),
      amountPaid: (json['amount_paid'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] as String? ?? 'pending',
      description: json['description'] as String?,
      paymentMethod: json['payment_method'] as String?,
      paidAt: json['paid_at'] == null
          ? null
          : DateTime.parse(json['paid_at'] as String),
      dueDate: json['due_date'] == null
          ? null
          : DateTime.parse(json['due_date'] as String),
      createdAt: json['created_at'] == null
          ? null
          : DateTime.parse(json['created_at'] as String),
      updatedAt: json['updated_at'] == null
          ? null
          : DateTime.parse(json['updated_at'] as String),
    );

Map<String, dynamic> _$$FinanceTransactionModelImplToJson(
        _$FinanceTransactionModelImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'league_id': instance.leagueId,
      'team_id': instance.teamId,
      'player_id': instance.playerId,
      'match_id': instance.matchId,
      'transaction_type': instance.transactionType,
      'amount': instance.amount,
      'amount_paid': instance.amountPaid,
      'status': instance.status,
      'description': instance.description,
      'payment_method': instance.paymentMethod,
      'paid_at': instance.paidAt?.toIso8601String(),
      'due_date': instance.dueDate?.toIso8601String(),
      'created_at': instance.createdAt?.toIso8601String(),
      'updated_at': instance.updatedAt?.toIso8601String(),
    };
