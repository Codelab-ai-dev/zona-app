import 'package:get_it/get_it.dart';
import '../../data/datasources/local/hive_service.dart';
import '../../data/datasources/local/secure_storage_service.dart';
import '../../data/datasources/remote/supabase_client.dart';
import '../../data/repositories/auth_repository_impl.dart';
import '../../data/repositories/league_repository_impl.dart';
import '../../data/repositories/team_repository_impl.dart';
import '../../data/repositories/tournament_repository_impl.dart';
import '../../domain/repositories/auth_repository.dart';
import '../../domain/repositories/league_repository.dart';
import '../../domain/repositories/team_repository.dart';
import '../../domain/repositories/tournament_repository.dart';
import '../../domain/usecases/create_league_usecase.dart';
import '../../domain/usecases/create_tournament_usecase.dart';
import '../../domain/usecases/delete_league_usecase.dart';
import '../../domain/usecases/get_all_leagues_usecase.dart';
import '../../domain/usecases/get_all_tournaments_usecase.dart';
import '../../domain/usecases/get_current_user_usecase.dart';
import '../../domain/usecases/get_league_by_id_usecase.dart';
import '../../domain/usecases/get_leagues_by_admin_usecase.dart';
import '../../domain/usecases/update_league_usecase.dart';
import '../../domain/usecases/get_team_by_id_usecase.dart';
import '../../domain/usecases/get_teams_by_league_usecase.dart';
import '../../domain/usecases/get_teams_by_tournament_usecase.dart';
import '../../domain/usecases/get_tournament_by_id_usecase.dart';
import '../../domain/usecases/get_tournaments_by_league_usecase.dart';
import '../../domain/usecases/login_with_email_usecase.dart';
import '../../domain/usecases/logout_usecase.dart';
import '../../presentation/bloc/auth/auth_bloc.dart';
import '../../presentation/bloc/league/league_bloc.dart';
import '../../presentation/bloc/team/team_bloc.dart';
import '../../presentation/bloc/tournament/tournament_bloc.dart';
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

  // =============== Use Cases ===============

  // Auth Use Cases
  sl.registerLazySingleton(() => LoginWithEmailUseCase(sl()));
  sl.registerLazySingleton(() => LogoutUseCase(sl()));
  sl.registerLazySingleton(() => GetCurrentUserUseCase(sl()));

  // League Use Cases
  sl.registerLazySingleton(() => GetAllLeaguesUseCase(sl()));
  sl.registerLazySingleton(() => GetLeagueByIdUseCase(sl()));
  sl.registerLazySingleton(() => GetLeaguesByAdminUseCase(sl()));
  sl.registerLazySingleton(() => CreateLeagueUseCase(sl()));
  sl.registerLazySingleton(() => UpdateLeagueUseCase(sl()));
  sl.registerLazySingleton(() => DeleteLeagueUseCase(sl()));

  // Tournament Use Cases
  sl.registerLazySingleton(() => GetAllTournamentsUseCase(sl()));
  sl.registerLazySingleton(() => GetTournamentByIdUseCase(sl()));
  sl.registerLazySingleton(() => GetTournamentsByLeagueUseCase(sl()));
  sl.registerLazySingleton(() => CreateTournamentUseCase(sl()));

  // Team Use Cases
  sl.registerLazySingleton(() => GetTeamByIdUseCase(sl()));
  sl.registerLazySingleton(() => GetTeamsByLeagueUseCase(sl()));
  sl.registerLazySingleton(() => GetTeamsByTournamentUseCase(sl()));

  // =============== BLoCs ===============

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
    ),
  );

  print('✅ Dependency injection initialized');
}
