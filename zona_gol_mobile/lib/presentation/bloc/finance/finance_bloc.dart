import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../domain/usecases/cancel_finance_transaction_usecase.dart';
import '../../../domain/usecases/create_finance_transaction_usecase.dart';
import '../../../domain/usecases/generate_fines_from_match_usecase.dart';
import '../../../domain/usecases/get_finance_config_usecase.dart';
import '../../../domain/usecases/get_finance_league_summary_usecase.dart';
import '../../../domain/usecases/get_finance_team_balances_usecase.dart';
import '../../../domain/usecases/get_finance_transactions_usecase.dart';
import '../../../domain/usecases/register_payment_usecase.dart';
import '../../../domain/usecases/update_finance_config_usecase.dart';
import 'finance_event.dart';
import 'finance_state.dart';

class FinanceBloc extends Bloc<FinanceEvent, FinanceState> {
  final GetFinanceConfigUseCase _getFinanceConfigUseCase;
  final UpdateFinanceConfigUseCase _updateFinanceConfigUseCase;
  final GetFinanceTransactionsUseCase _getFinanceTransactionsUseCase;
  final CreateFinanceTransactionUseCase _createFinanceTransactionUseCase;
  final CancelFinanceTransactionUseCase _cancelFinanceTransactionUseCase;
  final RegisterPaymentUseCase _registerPaymentUseCase;
  final GenerateFinesFromMatchUseCase _generateFinesFromMatchUseCase;
  final GetFinanceTeamBalancesUseCase _getFinanceTeamBalancesUseCase;
  final GetFinanceLeagueSummaryUseCase _getFinanceLeagueSummaryUseCase;

  FinanceBloc({
    required GetFinanceConfigUseCase getFinanceConfigUseCase,
    required UpdateFinanceConfigUseCase updateFinanceConfigUseCase,
    required GetFinanceTransactionsUseCase getFinanceTransactionsUseCase,
    required CreateFinanceTransactionUseCase createFinanceTransactionUseCase,
    required CancelFinanceTransactionUseCase cancelFinanceTransactionUseCase,
    required RegisterPaymentUseCase registerPaymentUseCase,
    required GenerateFinesFromMatchUseCase generateFinesFromMatchUseCase,
    required GetFinanceTeamBalancesUseCase getFinanceTeamBalancesUseCase,
    required GetFinanceLeagueSummaryUseCase getFinanceLeagueSummaryUseCase,
  })  : _getFinanceConfigUseCase = getFinanceConfigUseCase,
        _updateFinanceConfigUseCase = updateFinanceConfigUseCase,
        _getFinanceTransactionsUseCase = getFinanceTransactionsUseCase,
        _createFinanceTransactionUseCase = createFinanceTransactionUseCase,
        _cancelFinanceTransactionUseCase = cancelFinanceTransactionUseCase,
        _registerPaymentUseCase = registerPaymentUseCase,
        _generateFinesFromMatchUseCase = generateFinesFromMatchUseCase,
        _getFinanceTeamBalancesUseCase = getFinanceTeamBalancesUseCase,
        _getFinanceLeagueSummaryUseCase = getFinanceLeagueSummaryUseCase,
        super(FinanceInitial()) {
    on<LoadFinanceDashboard>(_onLoadDashboard);
    on<LoadTransactions>(_onLoadTransactions);
    on<CreateTransaction>(_onCreateTransaction);
    on<CancelTransaction>(_onCancelTransaction);
    on<RegisterPayment>(_onRegisterPayment);
    on<LoadConfig>(_onLoadConfig);
    on<UpdateConfig>(_onUpdateConfig);
    on<GenerateFines>(_onGenerateFines);
  }

  Future<void> _onLoadDashboard(
    LoadFinanceDashboard event,
    Emitter<FinanceState> emit,
  ) async {
    emit(FinanceLoading());

    final summaryResult =
        await _getFinanceLeagueSummaryUseCase(event.leagueId);
    final balancesResult =
        await _getFinanceTeamBalancesUseCase(event.leagueId);

    // Check if both succeeded
    summaryResult.fold(
      (failure) => emit(FinanceError(message: failure.message)),
      (summary) {
        balancesResult.fold(
          (failure) => emit(FinanceError(message: failure.message)),
          (balances) => emit(FinanceDashboardLoaded(
            summary: summary,
            balances: balances,
          )),
        );
      },
    );
  }

  Future<void> _onLoadTransactions(
    LoadTransactions event,
    Emitter<FinanceState> emit,
  ) async {
    emit(FinanceLoading());

    final result = await _getFinanceTransactionsUseCase(
      GetFinanceTransactionsParams(
        leagueId: event.leagueId,
        teamId: event.teamId,
        status: event.status,
        type: event.type,
      ),
    );

    result.fold(
      (failure) => emit(FinanceError(message: failure.message)),
      (transactions) =>
          emit(FinanceTransactionsLoaded(transactions: transactions)),
    );
  }

  Future<void> _onCreateTransaction(
    CreateTransaction event,
    Emitter<FinanceState> emit,
  ) async {
    emit(FinanceLoading());

    final result = await _createFinanceTransactionUseCase(
      CreateFinanceTransactionParams(
        leagueId: event.leagueId,
        teamId: event.teamId,
        playerId: event.playerId,
        matchId: event.matchId,
        transactionType: event.transactionType,
        amount: event.amount,
        description: event.description,
        dueDate: event.dueDate,
      ),
    );

    await result.fold(
      (failure) async => emit(FinanceError(message: failure.message)),
      (transaction) async {
        emit(const FinanceTransactionCreated());
        // Reload transactions
        add(LoadTransactions(leagueId: event.leagueId));
      },
    );
  }

  Future<void> _onCancelTransaction(
    CancelTransaction event,
    Emitter<FinanceState> emit,
  ) async {
    final result =
        await _cancelFinanceTransactionUseCase(event.transactionId);

    await result.fold(
      (failure) async => emit(FinanceError(message: failure.message)),
      (_) async {
        emit(const FinanceTransactionCancelled());
        add(LoadTransactions(leagueId: event.leagueId));
      },
    );
  }

  Future<void> _onRegisterPayment(
    RegisterPayment event,
    Emitter<FinanceState> emit,
  ) async {
    emit(FinanceLoading());

    final result = await _registerPaymentUseCase(
      RegisterPaymentParams(
        transactionId: event.transactionId,
        amount: event.amount,
        paymentMethod: event.paymentMethod,
      ),
    );

    await result.fold(
      (failure) async => emit(FinanceError(message: failure.message)),
      (transaction) async {
        emit(const FinancePaymentRegistered());
        add(LoadTransactions(leagueId: event.leagueId));
      },
    );
  }

  Future<void> _onLoadConfig(
    LoadConfig event,
    Emitter<FinanceState> emit,
  ) async {
    emit(FinanceLoading());

    final result = await _getFinanceConfigUseCase(event.leagueId);

    result.fold(
      (failure) => emit(FinanceError(message: failure.message)),
      (config) => emit(FinanceConfigLoaded(config: config)),
    );
  }

  Future<void> _onUpdateConfig(
    UpdateConfig event,
    Emitter<FinanceState> emit,
  ) async {
    emit(FinanceLoading());

    final result = await _updateFinanceConfigUseCase(
      UpdateFinanceConfigParams(
        leagueId: event.leagueId,
        registrationFee: event.registrationFee,
        monthlyFee: event.monthlyFee,
        matchFee: event.matchFee,
        yellowCardFine: event.yellowCardFine,
        redCardFine: event.redCardFine,
        noShowFine: event.noShowFine,
        lateArrivalFine: event.lateArrivalFine,
        uniformViolationFine: event.uniformViolationFine,
        misconductFine: event.misconductFine,
        forfeitFine: event.forfeitFine,
        autoGenerateFines: event.autoGenerateFines,
        currency: event.currency,
      ),
    );

    await result.fold(
      (failure) async => emit(FinanceError(message: failure.message)),
      (config) async {
        emit(const FinanceConfigUpdated());
        add(LoadConfig(leagueId: event.leagueId));
      },
    );
  }

  Future<void> _onGenerateFines(
    GenerateFines event,
    Emitter<FinanceState> emit,
  ) async {
    emit(FinanceLoading());

    final result = await _generateFinesFromMatchUseCase(
      GenerateFinesFromMatchParams(
        matchId: event.matchId,
        leagueId: event.leagueId,
      ),
    );

    await result.fold(
      (failure) async => emit(FinanceError(message: failure.message)),
      (transactions) async {
        emit(FinanceFinesGenerated(count: transactions.length));
      },
    );
  }
}
