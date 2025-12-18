/// Storage keys for secure storage and shared preferences
class StorageKeys {
  // Secure Storage Keys (flutter_secure_storage)
  static const String accessToken = 'access_token';
  static const String refreshToken = 'refresh_token';
  static const String userId = 'user_id';
  static const String userEmail = 'user_email';
  static const String userRole = 'user_role';
  static const String sessionExpiry = 'session_expiry';

  // Shared Preferences Keys
  static const String isFirstLaunch = 'is_first_launch';
  static const String selectedLeagueId = 'selected_league_id';
  static const String selectedTournamentId = 'selected_tournament_id';
  static const String selectedTeamId = 'selected_team_id';
  static const String themeMode = 'theme_mode';
  static const String languageCode = 'language_code';
  static const String lastSyncTime = 'last_sync_time';
  static const String cacheVersion = 'cache_version';
  static const String notificationsEnabled = 'notifications_enabled';

  // Hive Box Names
  static const String leaguesBox = 'leagues_box';
  static const String tournamentsBox = 'tournaments_box';
  static const String teamsBox = 'teams_box';
  static const String playersBox = 'players_box';
  static const String matchesBox = 'matches_box';
  static const String statsBox = 'stats_box';
  static const String syncQueueBox = 'sync_queue_box';
  static const String userProfileBox = 'user_profile_box';
  static const String settingsBox = 'settings_box';

  // Cache Keys Prefixes
  static const String leagueCachePrefix = 'league_';
  static const String tournamentCachePrefix = 'tournament_';
  static const String teamCachePrefix = 'team_';
  static const String playerCachePrefix = 'player_';
  static const String matchCachePrefix = 'match_';
  static const String statsCachePrefix = 'stats_';
}
