import 'package:dartz/dartz.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/errors/failures.dart';
import '../../core/network/network_info.dart';
import '../../domain/entities/finance_config_entity.dart';
import '../../domain/entities/finance_enums.dart';
import '../../domain/entities/finance_league_summary_entity.dart';
import '../../domain/entities/finance_team_balance_entity.dart';
import '../../domain/entities/finance_transaction_entity.dart';
import '../../domain/repositories/finance_repository.dart';
import '../datasources/remote/supabase_client.dart';
import '../mappers/finance_mapper.dart';

/// Finance Repository Implementation
/// Handles all finance-related data operations with Supabase
class FinanceRepositoryImpl implements FinanceRepository {
  final SupabaseClientService supabaseService;
  final NetworkInfo networkInfo;

  FinanceRepositoryImpl({
    required this.supabaseService,
    required this.networkInfo,
  });

  @override
  Future<Either<Failure, FinanceConfigEntity>> getConfig(
      String leagueId) async {
    try {
      print('Fetching finance config for league: $leagueId');

      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No hay conexion a internet'));
      }

      final response = await supabaseService.client
          .from('finance_config')
          .select()
          .eq('league_id', leagueId)
          .maybeSingle();

      if (response == null) {
        // No config found, create a default one
        final insertResponse = await supabaseService.client
            .from('finance_config')
            .insert({'league_id': leagueId})
            .select()
            .single();

        final config =
            FinanceMapper.configFromRow(insertResponse as Map<String, dynamic>);
        print('Created default finance config for league');
        return Right(config);
      }

      final config =
          FinanceMapper.configFromRow(response as Map<String, dynamic>);
      print('Successfully fetched finance config');
      return Right(config);
    } on PostgrestException catch (e) {
      print('PostgrestException fetching finance config: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e) {
      print('Unexpected error fetching finance config: $e');
      return Left(ServerFailure('Error al obtener configuracion financiera'));
    }
  }

  @override
  Future<Either<Failure, FinanceConfigEntity>> updateConfig({
    required String leagueId,
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
    String? currency,
  }) async {
    try {
      print('Updating finance config for league: $leagueId');

      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No hay conexion a internet'));
      }

      final updateData = <String, dynamic>{};
      if (registrationFee != null) {
        updateData['registration_fee'] = registrationFee;
      }
      if (monthlyFee != null) updateData['monthly_fee'] = monthlyFee;
      if (matchFee != null) updateData['match_fee'] = matchFee;
      if (yellowCardFine != null) {
        updateData['yellow_card_fine'] = yellowCardFine;
      }
      if (redCardFine != null) updateData['red_card_fine'] = redCardFine;
      if (noShowFine != null) updateData['no_show_fine'] = noShowFine;
      if (lateArrivalFine != null) {
        updateData['late_arrival_fine'] = lateArrivalFine;
      }
      if (uniformViolationFine != null) {
        updateData['uniform_violation_fine'] = uniformViolationFine;
      }
      if (misconductFine != null) {
        updateData['misconduct_fine'] = misconductFine;
      }
      if (forfeitFine != null) updateData['forfeit_fine'] = forfeitFine;
      if (autoGenerateFines != null) {
        updateData['auto_generate_fines'] = autoGenerateFines;
      }
      if (currency != null) updateData['currency'] = currency;

      final response = await supabaseService.client
          .from('finance_config')
          .update(updateData)
          .eq('league_id', leagueId)
          .select()
          .single();

      final config =
          FinanceMapper.configFromRow(response as Map<String, dynamic>);
      print('Successfully updated finance config');
      return Right(config);
    } on PostgrestException catch (e) {
      print('PostgrestException updating finance config: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e) {
      print('Unexpected error updating finance config: $e');
      return Left(
          ServerFailure('Error al actualizar configuracion financiera'));
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
      print('Fetching finance transactions for league: $leagueId');

      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No hay conexion a internet'));
      }

      var query = supabaseService.client.from('finance_transactions').select('''
            id, league_id, team_id, player_id, match_id,
            transaction_type, amount, amount_paid, status,
            description, payment_method, paid_at, due_date,
            created_at, updated_at,
            teams (name),
            players (name)
          ''').eq('league_id', leagueId);

      if (teamId != null) {
        query = query.eq('team_id', teamId);
      }
      if (status != null) {
        query = query.eq('status', status.dbValue);
      }
      if (type != null) {
        query = query.eq('transaction_type', type.dbValue);
      }

      final response =
          await query.order('created_at', ascending: false);

      final transactions = (response as List)
          .map((json) =>
              FinanceMapper.transactionFromRow(json as Map<String, dynamic>))
          .toList();

      print('Successfully fetched ${transactions.length} transactions');
      return Right(transactions);
    } on PostgrestException catch (e) {
      print('PostgrestException fetching transactions: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e) {
      print('Unexpected error fetching transactions: $e');
      return Left(ServerFailure('Error al obtener transacciones'));
    }
  }

  @override
  Future<Either<Failure, FinanceTransactionEntity>> createTransaction({
    required String leagueId,
    required String teamId,
    String? playerId,
    String? matchId,
    required String transactionType,
    required double amount,
    String? description,
    String? dueDate,
  }) async {
    try {
      print('Creating finance transaction for league: $leagueId');

      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No hay conexion a internet'));
      }

      final insertData = {
        'league_id': leagueId,
        'team_id': teamId,
        'transaction_type': transactionType,
        'amount': amount,
        if (playerId != null) 'player_id': playerId,
        if (matchId != null) 'match_id': matchId,
        if (description != null) 'description': description,
        if (dueDate != null) 'due_date': dueDate,
      };

      final response = await supabaseService.client
          .from('finance_transactions')
          .insert(insertData)
          .select('''
            id, league_id, team_id, player_id, match_id,
            transaction_type, amount, amount_paid, status,
            description, payment_method, paid_at, due_date,
            created_at, updated_at,
            teams (name),
            players (name)
          ''')
          .single();

      final transaction = FinanceMapper.transactionFromRow(
          response as Map<String, dynamic>);
      print('Successfully created transaction: ${transaction.id}');
      return Right(transaction);
    } on PostgrestException catch (e) {
      print('PostgrestException creating transaction: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e) {
      print('Unexpected error creating transaction: $e');
      return Left(ServerFailure('Error al crear transaccion'));
    }
  }

  @override
  Future<Either<Failure, void>> cancelTransaction(
      String transactionId) async {
    try {
      print('Cancelling transaction: $transactionId');

      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No hay conexion a internet'));
      }

      await supabaseService.client
          .from('finance_transactions')
          .update({'status': 'cancelled'}).eq('id', transactionId);

      print('Successfully cancelled transaction');
      return const Right(null);
    } on PostgrestException catch (e) {
      print('PostgrestException cancelling transaction: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e) {
      print('Unexpected error cancelling transaction: $e');
      return Left(ServerFailure('Error al cancelar transaccion'));
    }
  }

  @override
  Future<Either<Failure, FinanceTransactionEntity>> registerPayment({
    required String transactionId,
    required double amount,
    required String paymentMethod,
  }) async {
    try {
      print('Registering payment for transaction: $transactionId');

      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No hay conexion a internet'));
      }

      final response = await supabaseService.client.rpc(
        'register_payment',
        params: {
          'p_transaction_id': transactionId,
          'p_amount': amount,
          'p_payment_method': paymentMethod,
        },
      );

      // After RPC, fetch the updated transaction
      final transactionResponse = await supabaseService.client
          .from('finance_transactions')
          .select('''
            id, league_id, team_id, player_id, match_id,
            transaction_type, amount, amount_paid, status,
            description, payment_method, paid_at, due_date,
            created_at, updated_at,
            teams (name),
            players (name)
          ''')
          .eq('id', transactionId)
          .single();

      final transaction = FinanceMapper.transactionFromRow(
          transactionResponse as Map<String, dynamic>);
      print('Successfully registered payment');
      return Right(transaction);
    } on PostgrestException catch (e) {
      print('PostgrestException registering payment: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e) {
      print('Unexpected error registering payment: $e');
      return Left(ServerFailure('Error al registrar pago'));
    }
  }

  @override
  Future<Either<Failure, List<FinanceTransactionEntity>>>
      generateFinesFromMatch({
    required String matchId,
    required String leagueId,
  }) async {
    try {
      print('Generating fines from match: $matchId');

      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No hay conexion a internet'));
      }

      await supabaseService.client.rpc(
        'generate_fines_from_match',
        params: {
          'p_match_id': matchId,
          'p_league_id': leagueId,
        },
      );

      // After RPC, fetch the generated transactions for this match
      final response = await supabaseService.client
          .from('finance_transactions')
          .select('''
            id, league_id, team_id, player_id, match_id,
            transaction_type, amount, amount_paid, status,
            description, payment_method, paid_at, due_date,
            created_at, updated_at,
            teams (name),
            players (name)
          ''')
          .eq('match_id', matchId)
          .eq('league_id', leagueId)
          .order('created_at', ascending: false);

      final transactions = (response as List)
          .map((json) =>
              FinanceMapper.transactionFromRow(json as Map<String, dynamic>))
          .toList();

      print('Successfully generated ${transactions.length} fines from match');
      return Right(transactions);
    } on PostgrestException catch (e) {
      print('PostgrestException generating fines: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e) {
      print('Unexpected error generating fines: $e');
      return Left(ServerFailure('Error al generar multas del partido'));
    }
  }

  @override
  Future<Either<Failure, List<FinanceTeamBalanceEntity>>> getTeamBalances(
    String leagueId,
  ) async {
    try {
      print('Fetching team balances for league: $leagueId');

      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No hay conexion a internet'));
      }

      final response = await supabaseService.client
          .from('finance_team_balances')
          .select()
          .eq('league_id', leagueId)
          .order('total_pending', ascending: false);

      final balances = (response as List)
          .map((json) =>
              FinanceMapper.balanceFromRow(json as Map<String, dynamic>))
          .toList();

      print('Successfully fetched ${balances.length} team balances');
      return Right(balances);
    } on PostgrestException catch (e) {
      print('PostgrestException fetching team balances: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e) {
      print('Unexpected error fetching team balances: $e');
      return Left(ServerFailure('Error al obtener balances de equipos'));
    }
  }

  @override
  Future<Either<Failure, FinanceLeagueSummaryEntity>> getLeagueSummary(
    String leagueId,
  ) async {
    try {
      print('Fetching league summary for league: $leagueId');

      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No hay conexion a internet'));
      }

      final response = await supabaseService.client
          .from('finance_league_summary')
          .select()
          .eq('league_id', leagueId)
          .maybeSingle();

      if (response == null) {
        // No summary data yet, return empty summary
        return Right(FinanceLeagueSummaryEntity(leagueId: leagueId));
      }

      final summary =
          FinanceMapper.summaryFromRow(response as Map<String, dynamic>);
      print('Successfully fetched league summary');
      return Right(summary);
    } on PostgrestException catch (e) {
      print('PostgrestException fetching league summary: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e) {
      print('Unexpected error fetching league summary: $e');
      return Left(ServerFailure('Error al obtener resumen financiero'));
    }
  }
}
