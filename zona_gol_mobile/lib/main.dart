import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'core/config/app_config.dart';
import 'core/config/theme.dart';
import 'core/di/injection.dart';
import 'core/network/connectivity_manager.dart';
import 'data/datasources/remote/supabase_client.dart';
import 'data/datasources/local/hive_service.dart';
import 'presentation/bloc/auth/auth_bloc.dart';
import 'presentation/bloc/auth/auth_event.dart';
import 'presentation/bloc/auth/auth_state.dart';
import 'presentation/screens/auth/login_screen.dart';
import 'presentation/screens/dashboard/super_admin_dashboard.dart';
import 'presentation/screens/dashboard/league_admin_dashboard.dart';
import 'presentation/screens/dashboard/team_owner_dashboard.dart';
import 'presentation/screens/dashboard/public_dashboard.dart';

void main() async {
  // Ensure Flutter bindings are initialized
  WidgetsFlutterBinding.ensureInitialized();

  // Set preferred orientations (portrait only for now)
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // Print app configuration
  AppConfig.printConfig();

  // Initialize services
  await _initializeServices();

  // Initialize dependency injection
  await initializeDependencies();

  // Run app
  runApp(const ZonaGolApp());
}

/// Initialize all services
Future<void> _initializeServices() async {
  try {
    print('🚀 Initializing services...');

    // 1. Initialize Hive (local cache)
    await HiveService.initialize();
    await HiveService.instance.openBoxes();

    // 2. Initialize Supabase (backend)
    await SupabaseClientService.initialize();

    // 3. Initialize Connectivity Manager
    ConnectivityManager.instance;

    // Print debug info in development
    if (!AppConfig.isProduction) {
      HiveService.instance.printDebugInfo();
      SupabaseClientService.instance.printDebugInfo();
      ConnectivityManager.instance.printDebugInfo();
    }

    print('✅ All services initialized successfully');
  } catch (e, stackTrace) {
    print('❌ Failed to initialize services: $e');
    print('Stack trace: $stackTrace');
    // In production, you might want to show an error screen
    // For now, we'll continue
  }
}

class ZonaGolApp extends StatelessWidget {
  const ZonaGolApp({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => sl<AuthBloc>(),
      child: MaterialApp(
        title: 'Zona Gol',
        debugShowCheckedModeBanner: false,

        // Theme
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: ThemeMode.light, // TODO: Get from settings

        // Home
        home: const SplashScreen(),
      ),
    );
  }
}

/// Splash Screen
/// Shows while app is initializing
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state is Authenticated) {
          // Navigate to home/dashboard
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(
              builder: (context) => const HomeScreen(),
            ),
          );
        } else if (state is Unauthenticated) {
          // Navigate to login
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(
              builder: (context) => const LoginScreen(),
            ),
          );
        }
      },
      child: Scaffold(
        backgroundColor: AppTheme.primary,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // App Logo
              const Icon(
                Icons.sports_soccer,
                size: 100,
                color: Colors.white,
              ),
              const SizedBox(height: 24),

              // App Name
              Text(
                'Zona Gol',
                style: Theme.of(context).textTheme.displayMedium?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 8),

              // Tagline
              Text(
                'Gestión de Ligas de Fútbol',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: Colors.white.withOpacity(0.9),
                    ),
              ),
              const SizedBox(height: 48),

              // Loading indicator
              const CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Home Screen Router
/// Routes to appropriate dashboard based on user role
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state is Unauthenticated) {
          // Navigate to login
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(
              builder: (context) => const LoginScreen(),
            ),
          );
        }
      },
      child: BlocBuilder<AuthBloc, AuthState>(
        builder: (context, state) {
          if (state is Authenticated) {
            final user = state.user;

            // Route to appropriate dashboard based on role
            switch (user.role) {
              case 'super_admin':
                return SuperAdminDashboard(user: user);
              case 'league_admin':
                return LeagueAdminDashboard(user: user);
              case 'team_owner':
                return TeamOwnerDashboard(user: user);
              case 'public':
              default:
                return PublicDashboard(user: user);
            }
          }

          // Loading state
          return const Scaffold(
            body: Center(
              child: CircularProgressIndicator(),
            ),
          );
        },
      ),
    );
  }
}
