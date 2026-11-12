import 'package:dartz/dartz.dart';

import '../../core/errors/failures.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_exception.dart';
import '../../core/network/failure_mapper.dart';
import '../../core/network/json.dart';
import '../../domain/entities/finance_config_entity.dart';
import '../../domain/entities/finance_enums.dart';
import '../../domain/entities/finance_league_summary_entity.dart';
import '../../domain/entities/finance_team_balance_entity.dart';
import '../../domain/entities/finance_transaction_entity.dart';
import '../../domain/repositories/finance_repository.dart';
import '../mappers/finance_mapper.dart';

/// Finance repository backed by the Zona Gol API (`/leagues/{id}/finance/*`).
class FinanceRepositoryImpl implements FinanceRepository {
  final ApiClient api;

  FinanceRepositoryImpl({required this.api});

  String _base(String leagueId) => '/leagues/$leagueId/finance';

  @override
  Future<Either<Failure, FinanceConfigEntity>> getConfig(
    String leagueId,
  ) async {
    try {
      final json = await api.getObject('${_base(leagueId)}/config');
      return Right(FinanceMapper.configFromJson(json));
    } catch (e) {
      return Left(
        failureFrom(e, 'Error al obtener la configuración financiera'),
      );
    }
  }

  @override
  Future<Either<Failure, FinanceConfigEntity>> updateConfig(
    FinanceConfigEntity config,
  ) async {
    try {
      final json = await api.put(
        '${_base(config.leagueId)}/config',
        FinanceMapper.configToJson(config),
      );
      return Right(FinanceMapper.configFromJson(_obj(json)));
    } catch (e) {
      return Left(
        failureFrom(e, 'Error al guardar la configuración financiera'),
      );
    }
  }

  @override
  Future<Either<Failure, List<FinanceTransactionEntity>>> getTransactions(
    String leagueId, {
    String? teamId,
    TransactionStatus? status,
    TransactionType? type,
  }) async {
    try {
      // The list endpoint has no team filter; a team's statement has its own route.
      final path = teamId != null
          ? '${_base(leagueId)}/teams/$teamId/transactions'
          : '${_base(leagueId)}/transactions';
      final query = <String, Object?>{
        if (status != null) 'status': status.dbValue,
        if (type != null) 'transaction_type': type.dbValue,
      };
      final results = await Future.wait([
        api.getAll(path, query: query),
        _teamNames(leagueId),
      ]);
      final rows = results[0] as List<Map<String, dynamic>>;
      final names = results[1] as Map<String, String>;
      return Right(
        rows
            .map(
              (row) => FinanceMapper.transactionFromJson(
                row,
                teamName: names[row.strOrNull('team_id')],
              ),
            )
            .toList(),
      );
    } catch (e) {
      return Left(failureFrom(e, 'Error al obtener las transacciones'));
    }
  }

  @override
  Future<Either<Failure, FinanceTransactionEntity>> createTransaction({
    required String leagueId,
    String? teamId,
    String? playerId,
    String? matchId,
    required TransactionType type,
    required double amount,
    required String description,
    String? notes,
    DateTime? dueDate,
  }) async {
    try {
      final json = await api.post(
        '${_base(leagueId)}/transactions',
        FinanceMapper.createTransactionToJson(
          teamId: teamId,
          playerId: playerId,
          matchId: matchId,
          type: type,
          amount: amount,
          description: description,
          notes: notes,
          dueDate: dueDate,
        ),
      );
      return Right(FinanceMapper.transactionFromJson(_obj(json)));
    } catch (e) {
      return Left(failureFrom(e, 'Error al crear la transacción'));
    }
  }

  @override
  Future<Either<Failure, FinanceTransactionEntity>> cancelTransaction({
    required String leagueId,
    required String transactionId,
    required String reason,
  }) async {
    try {
      final json = await api.post(
        '${_base(leagueId)}/transactions/$transactionId/cancel',
        {'reason': reason},
      );
      return Right(FinanceMapper.transactionFromJson(_obj(json)));
    } on ApiException catch (e) {
      if (e.isConflict) {
        return Left(
          ServerFailure('La transacción ya no se puede cancelar', e.code),
        );
      }
      return Left(failureFrom(e));
    } catch (e) {
      return Left(failureFrom(e, 'Error al cancelar la transacción'));
    }
  }

  @override
  Future<Either<Failure, FinanceTransactionEntity>> registerPayment({
    required String leagueId,
    required String transactionId,
    required double amount,
    required PaymentMethod paymentMethod,
    String? paymentReference,
  }) async {
    try {
      final json = await api
          .post('${_base(leagueId)}/transactions/$transactionId/pay', {
            'amount': apiMoney(amount),
            'payment_method': paymentMethod.dbValue,
            if (paymentReference != null) 'payment_reference': paymentReference,
          });
      return Right(FinanceMapper.transactionFromJson(_obj(json)));
    } catch (e) {
      return Left(failureFrom(e, 'Error al registrar el pago'));
    }
  }

  @override
  Future<Either<Failure, int>> generateFinesFromMatch({
    required String matchId,
    required String leagueId,
  }) async {
    try {
      final json = await api.post(
        '${_base(leagueId)}/matches/$matchId/generate-fines',
      );
      return Right(_obj(json).integer('fines_created'));
    } catch (e) {
      return Left(failureFrom(e, 'Error al generar las multas'));
    }
  }

  @override
  Future<Either<Failure, List<FinanceTeamBalanceEntity>>> getTeamBalances(
    String leagueId,
  ) async {
    try {
      final rows = await api.getAll('${_base(leagueId)}/balances');
      return Right(rows.map(FinanceMapper.balanceFromJson).toList());
    } catch (e) {
      return Left(failureFrom(e, 'Error al obtener los balances'));
    }
  }

  @override
  Future<Either<Failure, FinanceLeagueSummaryEntity>> getLeagueSummary(
    String leagueId,
  ) async {
    try {
      final json = await api.getObject('${_base(leagueId)}/summary');
      return Right(FinanceMapper.summaryFromJson(json));
    } catch (e) {
      return Left(failureFrom(e, 'Error al obtener el resumen financiero'));
    }
  }

  /// Team names by id. Transactions carry only `team_id`, so the names come
  /// from the league's balances (one row per team), as the web does.
  Future<Map<String, String>> _teamNames(String leagueId) async {
    try {
      final rows = await api.getAll('${_base(leagueId)}/balances');
      return {for (final r in rows) r.str('team_id'): r.str('team_name')};
    } on ApiException catch (e) {
      if (e.isNetwork || e.isUnauthorized) rethrow;
      return const {};
    }
  }

  static Map<String, dynamic> _obj(dynamic body) =>
      (body as Map).cast<String, dynamic>();
}
