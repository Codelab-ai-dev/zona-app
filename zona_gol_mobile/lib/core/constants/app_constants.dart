/// App-wide constants
class AppConstants {
  // App Info
  static const String appName = 'Zona Gol';
  static const String appVersion = '1.0.0';
  static const String appBuildNumber = '1';

  // User Roles
  static const String roleSuperAdmin = 'super_admin';
  static const String roleLeagueAdmin = 'league_admin';
  static const String roleTeamOwner = 'team_owner';
  static const String rolePublic = 'public';

  // Match Status
  static const String matchStatusScheduled = 'scheduled';
  static const String matchStatusInProgress = 'in_progress';
  static const String matchStatusFinished = 'finished';
  static const String matchStatusCancelled = 'cancelled';
  static const String matchStatusPostponed = 'postponed';

  // Tournament Formats
  static const String formatLeague = 'league';
  static const String formatKnockout = 'knockout';
  static const String formatGroupKnockout = 'group_knockout';

  // Match Phases
  static const String phaseRegular = 'regular';
  static const String phasePlayoffs = 'playoffs';
  static const String phaseFinal = 'final';

  // Playoff Rounds
  static const String roundQuarterFinals = 'quarter_finals';
  static const String roundSemiFinals = 'semi_finals';
  static const String roundFinal = 'final';

  // Recognition Modes (for attendance)
  static const String recognitionModeQuick = 'quick';
  static const String recognitionModeThorough = 'thorough';

  // Validation Rules
  static const int minPasswordLength = 8;
  static const int maxPasswordLength = 128;
  static const int maxTeamNameLength = 50;
  static const int maxPlayerNameLength = 100;
  static const int minPlayersPerTeam = 5;
  static const int maxPlayersPerTeam = 30;

  // Date Formats
  static const String dateFormat = 'dd/MM/yyyy';
  static const String timeFormat = 'HH:mm';
  static const String dateTimeFormat = 'dd/MM/yyyy HH:mm';
  static const String shortDateFormat = 'dd MMM';
  static const String fullDateFormat = 'EEEE, dd MMMM yyyy';

  // Assets
  static const String defaultTeamLogo = 'assets/images/default_team_logo.png';
  static const String defaultPlayerPhoto = 'assets/images/default_player_photo.png';
  static const String appLogo = 'assets/images/app_logo.png';

  // Animation Durations
  static const Duration shortAnimationDuration = Duration(milliseconds: 200);
  static const Duration mediumAnimationDuration = Duration(milliseconds: 300);
  static const Duration longAnimationDuration = Duration(milliseconds: 500);

  // Debounce Delays
  static const Duration searchDebounce = Duration(milliseconds: 500);
  static const Duration typingDebounce = Duration(milliseconds: 300);

  // Retry Configuration
  static const int maxRetryAttempts = 3;
  static const Duration retryDelay = Duration(seconds: 2);

  // Sync Configuration
  static const Duration syncInterval = Duration(minutes: 15);
  static const int maxSyncQueueSize = 100;
}
