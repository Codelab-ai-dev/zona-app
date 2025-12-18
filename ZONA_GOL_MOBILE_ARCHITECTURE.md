# 🏗️ Arquitectura - Zona Gol Mobile (Flutter)

## 📋 Resumen del Proyecto

**Objetivo:** Crear una aplicación móvil Flutter completa que unifique:
- ✅ Toda la funcionalidad administrativa de zona-gol (web)
- ✅ Features de Zona-G existente (QR, asistencias, modo offline)
- ✅ Soporte para 4 roles: Super Admin, League Admin, Team Owner, Usuario Público
- ✅ Modo offline completo con sincronización
- ✅ Login social (Google, Apple, Email)

---

## 🎯 Arquitectura General

### Patrón Arquitectónico: Clean Architecture + BLoC

```
┌─────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  Screens   │  │  Widgets   │  │   BLoCs    │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                      DOMAIN LAYER                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  Entities  │  │ Use Cases  │  │ Repositories│            │
│  │  (Models)  │  │            │  │ (Interfaces)│            │
│  └────────────┘  └────────────┘  └────────────┘            │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                       DATA LAYER                             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │   API      │  │   Cache    │  │    Sync    │            │
│  │  Service   │  │  Service   │  │   Queue    │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Estructura del Proyecto

```
zona_gol_mobile/
├── lib/
│   ├── core/                          # Core functionality
│   │   ├── config/                    # App configuration
│   │   │   ├── app_config.dart
│   │   │   ├── supabase_config.dart
│   │   │   ├── routes.dart
│   │   │   └── theme.dart
│   │   ├── constants/                 # Constants
│   │   │   ├── app_constants.dart
│   │   │   ├── api_constants.dart
│   │   │   └── storage_keys.dart
│   │   ├── errors/                    # Error handling
│   │   │   ├── exceptions.dart
│   │   │   └── failures.dart
│   │   ├── network/                   # Network utilities
│   │   │   ├── connectivity_manager.dart
│   │   │   └── network_info.dart
│   │   ├── utils/                     # Utilities
│   │   │   ├── date_formatter.dart
│   │   │   ├── validators.dart
│   │   │   └── helpers.dart
│   │   └── extensions/                # Dart extensions
│   │       ├── string_extensions.dart
│   │       └── datetime_extensions.dart
│   │
│   ├── data/                          # Data layer
│   │   ├── models/                    # Data models (JSON serializable)
│   │   │   ├── user_model.dart
│   │   │   ├── league_model.dart
│   │   │   ├── tournament_model.dart
│   │   │   ├── team_model.dart
│   │   │   ├── player_model.dart
│   │   │   ├── match_model.dart
│   │   │   ├── attendance_model.dart
│   │   │   └── stats_model.dart
│   │   ├── repositories/              # Repository implementations
│   │   │   ├── auth_repository_impl.dart
│   │   │   ├── league_repository_impl.dart
│   │   │   ├── tournament_repository_impl.dart
│   │   │   ├── team_repository_impl.dart
│   │   │   ├── player_repository_impl.dart
│   │   │   ├── match_repository_impl.dart
│   │   │   └── stats_repository_impl.dart
│   │   └── datasources/               # Data sources
│   │       ├── remote/                # Remote API
│   │       │   ├── supabase_client.dart
│   │       │   ├── auth_remote_datasource.dart
│   │       │   ├── league_remote_datasource.dart
│   │       │   └── ...
│   │       └── local/                 # Local cache
│   │           ├── hive_service.dart
│   │           ├── secure_storage_service.dart
│   │           ├── auth_local_datasource.dart
│   │           └── ...
│   │
│   ├── domain/                        # Domain layer
│   │   ├── entities/                  # Business entities
│   │   │   ├── user.dart
│   │   │   ├── league.dart
│   │   │   ├── tournament.dart
│   │   │   ├── team.dart
│   │   │   ├── player.dart
│   │   │   ├── match.dart
│   │   │   └── stats.dart
│   │   ├── repositories/              # Repository interfaces
│   │   │   ├── auth_repository.dart
│   │   │   ├── league_repository.dart
│   │   │   ├── tournament_repository.dart
│   │   │   └── ...
│   │   └── usecases/                  # Business logic use cases
│   │       ├── auth/
│   │       │   ├── login_usecase.dart
│   │       │   ├── logout_usecase.dart
│   │       │   ├── login_with_google.dart
│   │       │   └── login_with_apple.dart
│   │       ├── leagues/
│   │       │   ├── get_leagues_usecase.dart
│   │       │   ├── create_league_usecase.dart
│   │       │   └── update_league_usecase.dart
│   │       ├── tournaments/
│   │       ├── teams/
│   │       ├── matches/
│   │       └── sync/
│   │           ├── sync_offline_data.dart
│   │           └── queue_offline_action.dart
│   │
│   ├── presentation/                  # Presentation layer
│   │   ├── blocs/                     # BLoC state management
│   │   │   ├── auth/
│   │   │   │   ├── auth_bloc.dart
│   │   │   │   ├── auth_event.dart
│   │   │   │   └── auth_state.dart
│   │   │   ├── league/
│   │   │   │   ├── league_bloc.dart
│   │   │   │   ├── league_event.dart
│   │   │   │   └── league_state.dart
│   │   │   ├── tournament/
│   │   │   ├── team/
│   │   │   ├── match/
│   │   │   ├── sync/
│   │   │   └── connectivity/
│   │   ├── screens/                   # All screens
│   │   │   ├── auth/
│   │   │   │   ├── login_screen.dart
│   │   │   │   ├── register_screen.dart
│   │   │   │   └── forgot_password_screen.dart
│   │   │   ├── super_admin/
│   │   │   │   ├── super_admin_dashboard.dart
│   │   │   │   ├── leagues_management_screen.dart
│   │   │   │   └── system_settings_screen.dart
│   │   │   ├── league_admin/
│   │   │   │   ├── league_dashboard.dart
│   │   │   │   ├── tournaments_screen.dart
│   │   │   │   ├── tournament_detail_screen.dart
│   │   │   │   ├── teams_screen.dart
│   │   │   │   ├── team_detail_screen.dart
│   │   │   │   ├── fixtures_screen.dart
│   │   │   │   ├── fixture_generator_screen.dart
│   │   │   │   ├── match_result_entry_screen.dart
│   │   │   │   ├── standings_screen.dart
│   │   │   │   ├── suspensions_screen.dart
│   │   │   │   └── league_stats_screen.dart
│   │   │   ├── team_owner/
│   │   │   │   ├── team_owner_dashboard.dart
│   │   │   │   ├── my_team_screen.dart
│   │   │   │   ├── players_management_screen.dart
│   │   │   │   ├── player_detail_screen.dart
│   │   │   │   └── team_stats_screen.dart
│   │   │   ├── public/
│   │   │   │   ├── public_home_screen.dart
│   │   │   │   ├── leagues_list_screen.dart
│   │   │   │   ├── league_detail_screen.dart
│   │   │   │   ├── standings_public_screen.dart
│   │   │   │   ├── matches_public_screen.dart
│   │   │   │   └── stats_public_screen.dart
│   │   │   └── shared/
│   │   │       ├── qr_scanner_screen.dart
│   │   │       ├── qr_generator_screen.dart
│   │   │       ├── attendance_screen.dart
│   │   │       ├── match_detail_screen.dart
│   │   │       └── profile_screen.dart
│   │   └── widgets/                   # Reusable widgets
│   │       ├── common/
│   │       │   ├── app_button.dart
│   │       │   ├── app_text_field.dart
│   │       │   ├── app_card.dart
│   │       │   ├── loading_indicator.dart
│   │       │   ├── error_widget.dart
│   │       │   ├── empty_state.dart
│   │       │   └── offline_banner.dart
│   │       ├── league/
│   │       │   ├── league_card.dart
│   │       │   └── league_selector.dart
│   │       ├── team/
│   │       │   ├── team_card.dart
│   │       │   ├── team_logo.dart
│   │       │   └── team_stats_card.dart
│   │       ├── player/
│   │       │   ├── player_card.dart
│   │       │   ├── player_avatar.dart
│   │       │   └── player_stats_widget.dart
│   │       ├── match/
│   │       │   ├── match_card.dart
│   │       │   ├── match_score_widget.dart
│   │       │   └── match_timeline.dart
│   │       └── charts/
│   │           ├── standings_table.dart
│   │           ├── stats_bar_chart.dart
│   │           └── performance_chart.dart
│   │
│   └── main.dart                      # Entry point
│
├── android/                           # Android config
├── ios/                               # iOS config
├── assets/                            # Assets
│   ├── images/
│   ├── icons/
│   └── fonts/
├── test/                              # Tests
│   ├── unit/
│   ├── widget/
│   └── integration/
└── pubspec.yaml                       # Dependencies
```

---

## 📦 Dependencias Principales

### Core
```yaml
# State Management
flutter_bloc: ^8.1.3
equatable: ^2.0.5

# Dependency Injection
get_it: ^7.6.4
injectable: ^2.3.2

# Network & Backend
supabase_flutter: ^2.8.0
http: ^1.2.2
connectivity_plus: ^6.1.0

# Local Storage
hive: ^2.2.3
hive_flutter: ^1.1.0
flutter_secure_storage: ^9.2.2
shared_preferences: ^2.3.2

# Auth Social
google_sign_in: ^6.2.1
sign_in_with_apple: ^6.1.3

# QR & Camera
mobile_scanner: ^5.0.0
qr_flutter: ^4.1.0
camera: ^0.11.0

# UI & UX
cached_network_image: ^3.3.1
shimmer: ^3.0.0
animations: ^2.0.11
flutter_svg: ^2.0.10
image_picker: ^1.1.2
photo_view: ^0.15.0

# Utils
intl: ^0.19.0
uuid: ^4.3.3
freezed_annotation: ^2.4.1
json_annotation: ^4.8.1

# Permissions
permission_handler: ^11.3.1

# Navigation
go_router: ^14.6.1

# Dev Dependencies
build_runner: ^2.4.8
freezed: ^2.4.7
json_serializable: ^6.7.1
hive_generator: ^2.0.1
```

---

## 🔐 Sistema de Autenticación

### Proveedores Soportados

1. **Email/Password** - Supabase Auth nativo
2. **Google** - `google_sign_in` + Supabase
3. **Apple** - `sign_in_with_apple` + Supabase
4. **Magic Link** - Email sin password (opcional)

### Flujo de Auth

```dart
┌─────────────┐
│ Login Screen│
└──────┬──────┘
       │
       ├─ Email/Password → Supabase Auth
       ├─ Google → GoogleSignIn → Supabase
       └─ Apple → AppleSignIn → Supabase
       │
       ▼
┌─────────────┐
│ Auth Bloc   │ → Save session → Secure Storage
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Get User    │ → Check role → Route to Dashboard
│ Profile     │
└─────────────┘
```

### Roles y Navegación

```dart
enum UserRole {
  superAdmin,    // → Super Admin Dashboard
  leagueAdmin,   // → League Admin Dashboard
  teamOwner,     // → Team Owner Dashboard
  public,        // → Public Home Screen
}

// Después de login
if (user.role == UserRole.superAdmin) {
  Navigator.pushReplacement(SuperAdminDashboard());
} else if (user.role == UserRole.leagueAdmin) {
  Navigator.pushReplacement(LeagueAdminDashboard());
}
// ... etc
```

---

## 💾 Sistema de Sincronización Offline

### Arquitectura Offline-First

```
┌──────────────────────────────────────────────────────┐
│                    UI LAYER                           │
│  User makes action (create, update, delete)          │
└───────────────────────┬──────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│               CONNECTIVITY CHECK                      │
│  ┌─────────────┐         ┌─────────────┐            │
│  │  IF ONLINE  │         │ IF OFFLINE  │            │
│  └──────┬──────┘         └──────┬──────┘            │
│         │                       │                    │
│         ▼                       ▼                    │
│  ┌─────────────┐         ┌─────────────┐            │
│  │ Call API    │         │  Save to    │            │
│  │ Directly    │         │ Sync Queue  │            │
│  └──────┬──────┘         └──────┬──────┘            │
│         │                       │                    │
│         ▼                       ▼                    │
│  ┌─────────────┐         ┌─────────────┐            │
│  │ Update      │         │  Update     │            │
│  │ Local Cache │         │ Local Cache │            │
│  └─────────────┘         └─────────────┘            │
└──────────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│             SYNC SERVICE (Background)                 │
│                                                       │
│  Listens to connectivity changes                     │
│  When online → Process sync queue                    │
│  For each queued action:                             │
│    1. Try to execute on server                       │
│    2. If success → Remove from queue                 │
│    3. If fail → Keep in queue, retry later           │
│    4. Update local cache with server response        │
└──────────────────────────────────────────────────────┘
```

### Estrategia de Caché

**Hive Boxes (Local Database):**
- `leagues_box` - Ligas
- `tournaments_box` - Torneos
- `teams_box` - Equipos
- `players_box` - Jugadores
- `matches_box` - Partidos
- `stats_box` - Estadísticas
- `sync_queue_box` - Cola de sincronización

**TTL (Time To Live):**
- Session tokens: 48 horas
- Datos de ligas: 24 horas
- Partidos: 6 horas
- Estadísticas: 1 hora
- User profile: 24 horas

### Sync Queue Model

```dart
class SyncQueueItem {
  final String id;
  final SyncAction action; // create, update, delete
  final String entityType; // team, player, match, etc.
  final Map<String, dynamic> data;
  final DateTime createdAt;
  final int retryCount;
  final SyncStatus status; // pending, processing, failed
}
```

---

## 🎨 Sistema de Navegación

### Go Router Configuration

```dart
final router = GoRouter(
  initialLocation: '/splash',
  redirect: (context, state) {
    final isLoggedIn = AuthBloc.isAuthenticated;
    final userRole = AuthBloc.currentUser?.role;

    if (!isLoggedIn && state.location != '/login') {
      return '/login';
    }

    if (isLoggedIn && state.location == '/login') {
      return _getDefaultRouteForRole(userRole);
    }

    return null; // No redirect
  },
  routes: [
    // Auth
    GoRoute(path: '/splash', builder: (context, state) => SplashScreen()),
    GoRoute(path: '/login', builder: (context, state) => LoginScreen()),

    // Super Admin
    GoRoute(
      path: '/super-admin',
      builder: (context, state) => SuperAdminDashboard(),
      routes: [
        GoRoute(path: 'leagues', builder: (context, state) => LeaguesManagementScreen()),
        GoRoute(path: 'settings', builder: (context, state) => SystemSettingsScreen()),
      ],
    ),

    // League Admin
    GoRoute(
      path: '/league-admin',
      builder: (context, state) => LeagueAdminDashboard(),
      routes: [
        GoRoute(path: 'tournaments', builder: (context, state) => TournamentsScreen()),
        GoRoute(path: 'teams', builder: (context, state) => TeamsScreen()),
        GoRoute(path: 'fixtures', builder: (context, state) => FixturesScreen()),
        GoRoute(path: 'results', builder: (context, state) => MatchResultEntryScreen()),
        GoRoute(path: 'standings', builder: (context, state) => StandingsScreen()),
        GoRoute(path: 'qr-scanner', builder: (context, state) => QRScannerScreen()),
      ],
    ),

    // Team Owner
    GoRoute(
      path: '/team-owner',
      builder: (context, state) => TeamOwnerDashboard(),
      routes: [
        GoRoute(path: 'players', builder: (context, state) => PlayersManagementScreen()),
        GoRoute(path: 'stats', builder: (context, state) => TeamStatsScreen()),
      ],
    ),

    // Public
    GoRoute(
      path: '/public',
      builder: (context, state) => PublicHomeScreen(),
      routes: [
        GoRoute(path: 'leagues', builder: (context, state) => LeaguesListScreen()),
        GoRoute(path: 'standings', builder: (context, state) => StandingsPublicScreen()),
        GoRoute(path: 'matches', builder: (context, state) => MatchesPublicScreen()),
      ],
    ),
  ],
);
```

---

## 🎯 Fases de Implementación

### Fase 1: Foundation (Semana 1-2)
- ✅ Estructura del proyecto
- ✅ Configuración de dependencias
- ✅ Core utilities (config, constants, extensions)
- ✅ Modelos de datos base
- ✅ Supabase client setup
- ✅ Hive setup para cache local
- ✅ Sistema de navegación básico

### Fase 2: Authentication (Semana 2-3)
- ✅ Auth BLoC
- ✅ Login screen (Email/Password)
- ✅ Google Sign In
- ✅ Apple Sign In
- ✅ Register screen
- ✅ Forgot password
- ✅ Session management
- ✅ Secure storage para tokens

### Fase 3: Core Features - League Admin (Semana 3-5)
- ✅ League Admin Dashboard
- ✅ Tournaments CRUD
- ✅ Teams CRUD
- ✅ Players CRUD
- ✅ Fixture generator
- ✅ Match result entry
- ✅ Standings table
- ✅ Suspensions management

### Fase 4: QR & Attendance (Semana 5-6)
- ✅ QR Scanner (de Zona-G)
- ✅ QR Generator
- ✅ Attendance marking
- ✅ Match selection logic
- ✅ Offline attendance queue

### Fase 5: Super Admin (Semana 6-7)
- ✅ Super Admin Dashboard
- ✅ Leagues management (CRUD)
- ✅ System settings
- ✅ Multi-league view

### Fase 6: Team Owner & Public (Semana 7-8)
- ✅ Team Owner Dashboard
- ✅ Players management (team owner view)
- ✅ Team stats visualization
- ✅ Public home screen
- ✅ Public standings/matches
- ✅ League browsing

### Fase 7: Offline Sync System (Semana 8-9)
- ✅ Sync queue implementation
- ✅ Background sync service
- ✅ Conflict resolution
- ✅ Connectivity listener
- ✅ Offline banner
- ✅ Retry logic

### Fase 8: Polish & Testing (Semana 9-10)
- ✅ UI/UX improvements
- ✅ Animations
- ✅ Error handling
- ✅ Loading states
- ✅ Unit tests
- ✅ Integration tests
- ✅ Build & deployment

---

## 🎨 Design System

### Colores (Similar a la web)
```dart
class AppColors {
  static const primary = Color(0xFF1E40AF); // Blue
  static const secondary = Color(0xFF10B981); // Green
  static const accent = Color(0xFFF59E0B); // Amber
  static const error = Color(0xFFEF4444); // Red
  static const success = Color(0xFF10B981); // Green
  static const warning = Color(0xFFF59E0B); // Amber

  // Grays
  static const gray50 = Color(0xFFF9FAFB);
  static const gray100 = Color(0xFFF3F4F6);
  static const gray900 = Color(0xFF111827);
}
```

### Tipografía
```dart
class AppTypography {
  static const h1 = TextStyle(fontSize: 32, fontWeight: FontWeight.bold);
  static const h2 = TextStyle(fontSize: 24, fontWeight: FontWeight.bold);
  static const h3 = TextStyle(fontSize: 20, fontWeight: FontWeight.w600);
  static const body1 = TextStyle(fontSize: 16, fontWeight: FontWeight.normal);
  static const body2 = TextStyle(fontSize: 14, fontWeight: FontWeight.normal);
  static const caption = TextStyle(fontSize: 12, fontWeight: FontWeight.normal);
}
```

### Spacing
```dart
class AppSpacing {
  static const xs = 4.0;
  static const sm = 8.0;
  static const md = 16.0;
  static const lg = 24.0;
  static const xl = 32.0;
}
```

---

## 📊 State Management - BLoC Pattern

### Ejemplo: Match BLoC

```dart
// Events
abstract class MatchEvent extends Equatable {}
class LoadMatches extends MatchEvent {}
class CreateMatch extends MatchEvent {
  final Match match;
}
class UpdateMatchResult extends MatchEvent {
  final String matchId;
  final MatchResult result;
}

// States
abstract class MatchState extends Equatable {}
class MatchInitial extends MatchState {}
class MatchLoading extends MatchState {}
class MatchLoaded extends MatchState {
  final List<Match> matches;
}
class MatchError extends MatchState {
  final String message;
}

// BLoC
class MatchBloc extends Bloc<MatchEvent, MatchState> {
  final GetMatchesUseCase getMatchesUseCase;
  final UpdateMatchResultUseCase updateMatchResultUseCase;

  MatchBloc({
    required this.getMatchesUseCase,
    required this.updateMatchResultUseCase,
  }) : super(MatchInitial()) {
    on<LoadMatches>(_onLoadMatches);
    on<UpdateMatchResult>(_onUpdateMatchResult);
  }

  Future<void> _onLoadMatches(
    LoadMatches event,
    Emitter<MatchState> emit,
  ) async {
    emit(MatchLoading());
    final result = await getMatchesUseCase();
    result.fold(
      (failure) => emit(MatchError(failure.message)),
      (matches) => emit(MatchLoaded(matches)),
    );
  }
}
```

---

## 🔒 Seguridad

### Checklist de Seguridad

- ✅ Tokens en Flutter Secure Storage (Keychain/Keystore)
- ✅ SSL pinning en producción
- ✅ No hardcodear credenciales (usar --dart-define)
- ✅ RLS verificado antes de cada operación
- ✅ Validación de inputs con form validators
- ✅ Sanitización de datos
- ✅ Rate limiting en cliente
- ✅ Timeout en requests (30s)
- ✅ Logs sin información sensible en producción

---

## 📱 Soporte de Plataformas

### Android
- Min SDK: 21 (Android 5.0)
- Target SDK: 34 (Android 14)
- Permisos: Camera, Storage, Internet

### iOS
- Min iOS: 12.0
- Target iOS: 17.0
- Capabilities: Sign in with Apple, Camera, PhotoLibrary

---

## 🚀 Build & Deployment

### Development
```bash
flutter run --dart-define=ENV=dev
```

### Production
```bash
flutter build apk --release \
  --dart-define=ENV=prod \
  --dart-define=SUPABASE_URL=... \
  --dart-define=SUPABASE_ANON_KEY=...
```

### iOS
```bash
flutter build ios --release \
  --dart-define=ENV=prod \
  --dart-define=SUPABASE_URL=... \
  --dart-define=SUPABASE_ANON_KEY=...
```

---

## 📈 Métricas de Éxito

### Performance
- Cold start: < 3s
- Screen transitions: 60fps
- API response: < 2s
- Offline mode: instantáneo

### UX
- Crash-free rate: > 99.5%
- App size: < 50MB
- Battery usage: Minimal
- Network usage: Optimizado con caché

---

**Documento creado:** 2025-12-17
**Versión:** 1.0
**Estado:** En desarrollo
