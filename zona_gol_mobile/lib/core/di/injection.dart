import 'package:get_it/get_it.dart';
import '../../data/datasources/local/hive_service.dart';
import '../../data/datasources/local/secure_storage_service.dart';
import '../../data/datasources/remote/supabase_client.dart';
import '../../data/repositories/attendance_repository_impl.dart';
import '../../data/repositories/auth_repository_impl.dart';
import '../../data/repositories/coaching_staff_repository_impl.dart';
import '../../data/repositories/finance_repository_impl.dart';
import '../../data/repositories/league_repository_impl.dart';
import '../../data/repositories/match_repository_impl.dart';
import '../../data/repositories/player_repository_impl.dart';
import '../../data/repositories/player_stats_repository_impl.dart';
import '../../data/repositories/suspension_repository_impl.dart';
import '../../data/repositories/team_repository_impl.dart';
import '../../data/repositories/tournament_repository_impl.dart';
import '../../data/repositories/whatsapp_repository_impl.dart';
import '../../domain/repositories/attendance_repository.dart';
import '../../domain/repositories/auth_repository.dart';
import '../../domain/repositories/coaching_staff_repository.dart';
import '../../domain/repositories/finance_repository.dart';
import '../../domain/repositories/league_repository.dart';
import '../../domain/repositories/match_repository.dart';
import '../../domain/repositories/player_repository.dart';
import '../../domain/repositories/player_stats_repository.dart';
import '../../domain/repositories/suspension_repository.dart';
import '../../domain/repositories/team_repository.dart';
import '../../domain/repositories/tournament_repository.dart';
import '../../domain/repositories/whatsapp_repository.dart';
import '../../domain/usecases/register_attendance_usecase.dart';
import '../../domain/usecases/get_match_attendance_usecase.dart';
import '../../domain/usecases/create_staff_usecase.dart';
import '../../domain/usecases/delete_staff_usecase.dart';
import '../../domain/usecases/get_staff_by_team_usecase.dart';
import '../../domain/usecases/update_staff_usecase.dart';
import '../../domain/usecases/create_league_usecase.dart';
import '../../domain/usecases/create_tournament_usecase.dart';
import '../../domain/usecases/delete_league_usecase.dart';
import '../../domain/usecases/get_all_leagues_usecase.dart';
import '../../domain/usecases/get_league_stats_usecase.dart';
import '../../domain/usecases/get_all_tournaments_usecase.dart';
import '../../domain/usecases/get_current_user_usecase.dart';
import '../../domain/usecases/get_league_by_id_usecase.dart';
import '../../domain/usecases/get_leagues_by_admin_usecase.dart';
import '../../domain/usecases/get_match_detail_usecase.dart';
import '../../domain/usecases/save_match_player_stats_usecase.dart';
import '../../domain/usecases/get_pending_matches_usecase.dart';
import '../../domain/usecases/get_player_by_id_usecase.dart';
import '../../domain/usecases/get_players_by_team_usecase.dart';
import '../../domain/usecases/get_players_by_league_usecase.dart';
import '../../domain/usecases/create_player_usecase.dart';
import '../../domain/usecases/update_player_usecase.dart';
import '../../domain/usecases/delete_player_usecase.dart';
import '../../domain/usecases/verify_player_usecase.dart';
import '../../domain/usecases/get_discipline_by_league_usecase.dart';
import '../../domain/usecases/get_player_match_history_usecase.dart';
import '../../domain/usecases/get_player_stats_by_id_usecase.dart';
import '../../domain/usecases/get_player_stats_by_team_usecase.dart';
import '../../domain/usecases/get_suspensions_by_league_usecase.dart';
import '../../domain/usecases/get_top_scorers_by_league_usecase.dart';
import '../../domain/usecases/create_suspension_usecase.dart';
import '../../domain/usecases/cancel_suspension_usecase.dart';
import '../../domain/usecases/complete_suspension_usecase.dart';
import '../../domain/usecases/update_suspension_usecase.dart';
import '../../domain/usecases/update_league_usecase.dart';
import '../../domain/usecases/update_match_result_usecase.dart';
import '../../domain/usecases/get_standings_usecase.dart';
import '../../domain/usecases/get_team_by_id_usecase.dart';
import '../../domain/usecases/get_teams_by_league_usecase.dart';
import '../../domain/usecases/get_teams_by_tournament_usecase.dart';
import '../../domain/usecases/get_tournament_by_id_usecase.dart';
import '../../domain/usecases/get_tournaments_by_league_usecase.dart';
import '../../domain/usecases/login_with_email_usecase.dart';
import '../../domain/usecases/logout_usecase.dart';
import '../../domain/usecases/create_team_usecase.dart';
import '../../domain/usecases/update_team_usecase.dart';
import '../../domain/usecases/delete_team_usecase.dart';
import '../../domain/usecases/create_team_owner_usecase.dart';
import '../../domain/usecases/update_standings_usecase.dart';
import '../../domain/usecases/change_password_usecase.dart';
import '../../domain/usecases/get_finance_config_usecase.dart';
import '../../domain/usecases/update_finance_config_usecase.dart';
import '../../domain/usecases/get_finance_transactions_usecase.dart';
import '../../domain/usecases/create_finance_transaction_usecase.dart';
import '../../domain/usecases/cancel_finance_transaction_usecase.dart';
import '../../domain/usecases/register_payment_usecase.dart';
import '../../domain/usecases/generate_fines_from_match_usecase.dart';
import '../../domain/usecases/get_finance_team_balances_usecase.dart';
import '../../domain/usecases/get_finance_league_summary_usecase.dart';
import '../../domain/usecases/get_whatsapp_links_usecase.dart';
import '../../domain/usecases/create_whatsapp_link_usecase.dart';
import '../../domain/usecases/update_whatsapp_link_usecase.dart';
import '../../domain/usecases/delete_whatsapp_link_usecase.dart';
import '../../domain/usecases/toggle_whatsapp_link_usecase.dart';
import '../../presentation/bloc/auth/auth_bloc.dart';
import '../../presentation/bloc/league/league_bloc.dart';
import '../../presentation/bloc/match/match_bloc.dart';
import '../../presentation/bloc/match_detail/match_detail_bloc.dart';
import '../../presentation/bloc/player/player_bloc.dart';
import '../../presentation/bloc/attendance/attendance_bloc.dart';
import '../../presentation/bloc/coaching_staff/coaching_staff_bloc.dart';
import '../../presentation/bloc/finance/finance_bloc.dart';
import '../../presentation/bloc/league_stats/league_stats_bloc.dart';
import '../../presentation/bloc/player_stats/player_stats_bloc.dart';
import '../../presentation/bloc/suspension/suspension_bloc.dart';
import '../../presentation/bloc/team/team_bloc.dart';
import '../../presentation/bloc/connectivity/connectivity_cubit.dart';
import '../../presentation/bloc/tournament/tournament_bloc.dart';
import '../../presentation/bloc/whatsapp/whatsapp_bloc.dart';
import '../network/connectivity_manager.dart';
import '../network/network_info.dart';

final sl = GetIt.instance; // Service Locator

/// Initialize all dependencies
Future<void> initializeDependencies() async {
  // =============== Core ===============

  // Network Info
  sl.registerLazySingleton<NetworkInfo>(
    () => NetworkInfoImpl(ConnectivityManager.instance),
  );

  // =============== Data Sources ===============

  // Supabase Client (already initialized in main.dart)
  sl.registerLazySingleton<SupabaseClientService>(
    () => SupabaseClientService.instance,
  );

  // Secure Storage
  sl.registerLazySingleton<SecureStorageService>(
    () => SecureStorageService.instance,
  );

  // Hive Service (already initialized in main.dart)
  sl.registerLazySingleton<HiveService>(() => HiveService.instance);

  // =============== Repositories ===============

  // Auth Repository
  sl.registerLazySingleton<AuthRepository>(
    () => AuthRepositoryImpl(
      supabaseService: sl(),
      secureStorage: sl(),
      hiveService: sl(),
      networkInfo: sl(),
    ),
  );

  // League Repository
  sl.registerLazySingleton<LeagueRepository>(
    () => LeagueRepositoryImpl(
      supabaseService: sl(),
      networkInfo: sl(),
    ),
  );

  // Tournament Repository
  sl.registerLazySingleton<TournamentRepository>(
    () => TournamentRepositoryImpl(
      supabaseService: sl(),
      networkInfo: sl(),
    ),
  );

  // Team Repository
  sl.registerLazySingleton<TeamRepository>(
    () => TeamRepositoryImpl(
      supabaseService: sl(),
      networkInfo: sl(),
    ),
  );

  // Player Repository
  sl.registerLazySingleton<PlayerRepository>(
    () => PlayerRepositoryImpl(
      supabaseService: sl(),
      networkInfo: sl(),
    ),
  );

  // Player Stats Repository
  sl.registerLazySingleton<PlayerStatsRepository>(
    () => PlayerStatsRepositoryImpl(
      supabaseService: sl(),
      networkInfo: sl(),
    ),
  );

  // Attendance Repository
  sl.registerLazySingleton<AttendanceRepository>(
    () => AttendanceRepositoryImpl(
      supabaseService: sl(),
      networkInfo: sl(),
    ),
  );

  // Suspension Repository
  sl.registerLazySingleton<SuspensionRepository>(
    () => SuspensionRepositoryImpl(
      supabaseService: sl(),
      networkInfo: sl(),
    ),
  );

  // Coaching Staff Repository
  sl.registerLazySingleton<CoachingStaffRepository>(
    () => CoachingStaffRepositoryImpl(
      supabaseService: sl(),
      networkInfo: sl(),
    ),
  );

  // Match Repository
  sl.registerLazySingleton<MatchRepository>(
    () => MatchRepositoryImpl(
      supabaseService: sl(),
      networkInfo: sl(),
    ),
  );

  // Finance Repository
  sl.registerLazySingleton<FinanceRepository>(
    () => FinanceRepositoryImpl(
      supabaseService: sl(),
      networkInfo: sl(),
    ),
  );

  // WhatsApp Repository
  sl.registerLazySingleton<WhatsAppRepository>(
    () => WhatsAppRepositoryImpl(
      supabaseService: sl(),
      networkInfo: sl(),
    ),
  );

  // =============== Use Cases ===============

  // Auth Use Cases
  sl.registerLazySingleton(() => LoginWithEmailUseCase(sl()));
  sl.registerLazySingleton(() => LogoutUseCase(sl()));
  sl.registerLazySingleton(() => GetCurrentUserUseCase(sl()));
  sl.registerLazySingleton(() => ChangePasswordUseCase(sl()));

  // League Use Cases
  sl.registerLazySingleton(() => GetAllLeaguesUseCase(sl()));
  sl.registerLazySingleton(() => GetLeagueByIdUseCase(sl()));
  sl.registerLazySingleton(() => GetLeaguesByAdminUseCase(sl()));
  sl.registerLazySingleton(() => CreateLeagueUseCase(sl()));
  sl.registerLazySingleton(() => UpdateLeagueUseCase(sl()));
  sl.registerLazySingleton(() => DeleteLeagueUseCase(sl()));
  sl.registerLazySingleton(() => GetLeagueStatsUseCase(sl()));

  // Tournament Use Cases
  sl.registerLazySingleton(() => GetAllTournamentsUseCase(sl()));
  sl.registerLazySingleton(() => GetTournamentByIdUseCase(sl()));
  sl.registerLazySingleton(() => GetTournamentsByLeagueUseCase(sl()));
  sl.registerLazySingleton(() => CreateTournamentUseCase(sl()));

  // Team Use Cases
  sl.registerLazySingleton(() => GetTeamByIdUseCase(sl()));
  sl.registerLazySingleton(() => GetTeamsByLeagueUseCase(sl()));
  sl.registerLazySingleton(() => GetTeamsByTournamentUseCase(sl()));
  sl.registerLazySingleton(() => GetStandingsByTournamentUseCase(sl()));
  sl.registerLazySingleton(() => GetStandingsByLeagueUseCase(sl()));
  sl.registerLazySingleton(() => CreateTeamUseCase(sl()));
  sl.registerLazySingleton(() => UpdateTeamUseCase(sl()));
  sl.registerLazySingleton(() => DeleteTeamUseCase(sl()));
  sl.registerLazySingleton(() => CreateTeamOwnerUseCase(sl()));
  sl.registerLazySingleton(() => UpdateStandingsUseCase(sl()));

  // Player Use Cases
  sl.registerLazySingleton(() => GetPlayersByTeamUseCase(sl()));
  sl.registerLazySingleton(() => GetPlayerByIdUseCase(sl()));
  sl.registerLazySingleton(() => CreatePlayerUseCase(sl()));
  sl.registerLazySingleton(() => UpdatePlayerUseCase(sl()));
  sl.registerLazySingleton(() => DeletePlayerUseCase(sl()));
  sl.registerLazySingleton(() => GetPlayersByLeagueUseCase(sl()));
  sl.registerLazySingleton(() => VerifyPlayerUseCase(sl()));

  // Player Stats Use Cases
  sl.registerLazySingleton(() => GetPlayerStatsByTeamUseCase(sl()));
  sl.registerLazySingleton(() => GetTopScorersByLeagueUseCase(sl()));
  sl.registerLazySingleton(() => GetDisciplineByLeagueUseCase(sl()));
  sl.registerLazySingleton(() => GetPlayerStatsByIdUseCase(sl()));
  sl.registerLazySingleton(() => GetPlayerMatchHistoryUseCase(sl()));

  // Coaching Staff Use Cases
  sl.registerLazySingleton(() => GetStaffByTeamUseCase(sl()));
  sl.registerLazySingleton(() => CreateStaffUseCase(sl()));
  sl.registerLazySingleton(() => UpdateStaffUseCase(sl()));
  sl.registerLazySingleton(() => DeleteStaffUseCase(sl()));

  // Attendance Use Cases
  sl.registerLazySingleton(() => RegisterAttendanceUseCase(sl()));
  sl.registerLazySingleton(() => GetMatchAttendanceUseCase(sl()));

  // Suspension Use Cases
  sl.registerLazySingleton(() => GetSuspensionsByLeagueUseCase(sl()));
  sl.registerLazySingleton(() => CreateSuspensionUseCase(sl()));
  sl.registerLazySingleton(() => CancelSuspensionUseCase(sl()));
  sl.registerLazySingleton(() => CompleteSuspensionUseCase(sl()));
  sl.registerLazySingleton(() => UpdateSuspensionUseCase(sl()));

  // Match Use Cases
  sl.registerLazySingleton(() => GetPendingMatchesUseCase(sl()));
  sl.registerLazySingleton(() => UpdateMatchResultUseCase(sl()));
  sl.registerLazySingleton(() => GetMatchDetailUseCase(sl(), sl()));
  sl.registerLazySingleton(() => SaveMatchPlayerStatsUseCase(sl(), sl()));

  // Finance Use Cases
  sl.registerLazySingleton(() => GetFinanceConfigUseCase(sl()));
  sl.registerLazySingleton(() => UpdateFinanceConfigUseCase(sl()));
  sl.registerLazySingleton(() => GetFinanceTransactionsUseCase(sl()));
  sl.registerLazySingleton(() => CreateFinanceTransactionUseCase(sl()));
  sl.registerLazySingleton(() => CancelFinanceTransactionUseCase(sl()));
  sl.registerLazySingleton(() => RegisterPaymentUseCase(sl()));
  sl.registerLazySingleton(() => GenerateFinesFromMatchUseCase(sl()));
  sl.registerLazySingleton(() => GetFinanceTeamBalancesUseCase(sl()));
  sl.registerLazySingleton(() => GetFinanceLeagueSummaryUseCase(sl()));

  // WhatsApp Use Cases
  sl.registerLazySingleton(() => GetWhatsAppLinksUseCase(sl()));
  sl.registerLazySingleton(() => CreateWhatsAppLinkUseCase(sl()));
  sl.registerLazySingleton(() => UpdateWhatsAppLinkUseCase(sl()));
  sl.registerLazySingleton(() => DeleteWhatsAppLinkUseCase(sl()));
  sl.registerLazySingleton(() => ToggleWhatsAppLinkUseCase(sl()));

  // =============== BLoCs ===============

  // Connectivity Cubit (Singleton - shared across app)
  sl.registerLazySingleton(
    () => ConnectivityCubit(ConnectivityManager.instance),
  );

  // Auth BLoC (Factory - new instance each time)
  sl.registerFactory(
    () => AuthBloc(
      loginWithEmailUseCase: sl(),
      logoutUseCase: sl(),
      getCurrentUserUseCase: sl(),
    ),
  );

  // League BLoC (Factory - new instance each time)
  sl.registerFactory(
    () => LeagueBloc(
      getAllLeaguesUseCase: sl(),
      getLeagueByIdUseCase: sl(),
      getLeaguesByAdminUseCase: sl(),
      createLeagueUseCase: sl(),
      updateLeagueUseCase: sl(),
      deleteLeagueUseCase: sl(),
    ),
  );

  // Tournament BLoC (Factory - new instance each time)
  sl.registerFactory(
    () => TournamentBloc(
      getAllTournamentsUseCase: sl(),
      getTournamentByIdUseCase: sl(),
      getTournamentsByLeagueUseCase: sl(),
      createTournamentUseCase: sl(),
    ),
  );

  // Team BLoC (Factory - new instance each time)
  sl.registerFactory(
    () => TeamBloc(
      getTeamByIdUseCase: sl(),
      getTeamsByLeagueUseCase: sl(),
      getTeamsByTournamentUseCase: sl(),
      getStandingsByTournamentUseCase: sl(),
      getStandingsByLeagueUseCase: sl(),
      createTeamUseCase: sl(),
      updateTeamUseCase: sl(),
      deleteTeamUseCase: sl(),
      createTeamOwnerUseCase: sl(),
      updateStandingsUseCase: sl(),
      teamRepository: sl(),
    ),
  );

  // Player BLoC (Factory - new instance each time)
  sl.registerFactory(
    () => PlayerBloc(
      getPlayersByTeamUseCase: sl(),
      getPlayerByIdUseCase: sl(),
      createPlayerUseCase: sl(),
      updatePlayerUseCase: sl(),
      deletePlayerUseCase: sl(),
      getPlayersByLeagueUseCase: sl(),
      verifyPlayerUseCase: sl(),
    ),
  );

  // Player Stats BLoC (Factory - new instance each time)
  sl.registerFactory(
    () => PlayerStatsBloc(
      getPlayerStatsByTeamUseCase: sl(),
      getTopScorersByLeagueUseCase: sl(),
      getDisciplineByLeagueUseCase: sl(),
      getPlayerStatsByIdUseCase: sl(),
      getPlayerMatchHistoryUseCase: sl(),
      playerStatsRepository: sl(),
    ),
  );

  // Attendance BLoC (Factory - new instance each time)
  sl.registerFactory(
    () => AttendanceBloc(
      registerAttendanceUseCase: sl(),
      getMatchAttendanceUseCase: sl(),
      attendanceRepository: sl(),
    ),
  );

  // Coaching Staff BLoC (Factory - new instance each time)
  sl.registerFactory(
    () => CoachingStaffBloc(
      getStaffByTeamUseCase: sl(),
      createStaffUseCase: sl(),
      updateStaffUseCase: sl(),
      deleteStaffUseCase: sl(),
    ),
  );

  // Suspension BLoC (Factory - new instance each time)
  sl.registerFactory(
    () => SuspensionBloc(
      getSuspensionsByLeagueUseCase: sl(),
      createSuspensionUseCase: sl(),
      cancelSuspensionUseCase: sl(),
      completeSuspensionUseCase: sl(),
      updateSuspensionUseCase: sl(),
      suspensionRepository: sl(),
    ),
  );

  // Match BLoC (Factory - new instance each time)
  sl.registerFactory(
    () => MatchBloc(
      getPendingMatchesUseCase: sl(),
      updateMatchResultUseCase: sl(),
      matchRepository: sl(),
    ),
  );

  // Match Detail BLoC (Factory - new instance each time)
  sl.registerFactory(
    () => MatchDetailBloc(
      getMatchDetailUseCase: sl(),
      saveMatchPlayerStatsUseCase: sl(),
      matchRepository: sl(),
    ),
  );

  // Finance BLoC (Factory - new instance each time)
  sl.registerFactory(
    () => FinanceBloc(
      getFinanceConfigUseCase: sl(),
      updateFinanceConfigUseCase: sl(),
      getFinanceTransactionsUseCase: sl(),
      createFinanceTransactionUseCase: sl(),
      cancelFinanceTransactionUseCase: sl(),
      registerPaymentUseCase: sl(),
      generateFinesFromMatchUseCase: sl(),
      getFinanceTeamBalancesUseCase: sl(),
      getFinanceLeagueSummaryUseCase: sl(),
    ),
  );

  // League Stats BLoC (Factory - new instance each time)
  sl.registerFactory(
    () => LeagueStatsBloc(getLeagueStatsUseCase: sl()),
  );

  // WhatsApp BLoC (Factory - new instance each time)
  sl.registerFactory(
    () => WhatsAppBloc(
      getWhatsAppLinksUseCase: sl(),
      createWhatsAppLinkUseCase: sl(),
      updateWhatsAppLinkUseCase: sl(),
      deleteWhatsAppLinkUseCase: sl(),
      toggleWhatsAppLinkUseCase: sl(),
    ),
  );

  print('✅ Dependency injection initialized');
}
