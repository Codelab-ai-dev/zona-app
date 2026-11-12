import '../di/injection.dart';
import '../network/api_client.dart';

/// Feature Gate
/// Checks if a league has a feature enabled, from the `features` object of
/// `GET /leagues/{id}` (e.g. `{"finance": true, "ai_agent": true, ...}`).
/// Results are cached for 5 minutes per league.
class FeatureGate {
  static final Map<String, _CachedLeague> _cache = {};
  static const _cacheDuration = Duration(minutes: 5);

  /// Older names used by the app -> the API's feature keys.
  static const _aliases = {'finances': 'finance'};

  /// Not plan-gated (the web shows them to every league).
  static const _alwaysOn = {'whatsapp'};

  /// Check if a league has a specific feature enabled
  static Future<bool> hasFeature(String leagueId, String featureName) async {
    if (_alwaysOn.contains(featureName)) return true;
    final league = await _load(leagueId);
    return _parseBool(league?.features[_key(featureName)]);
  }

  /// Check multiple features at once
  static Future<Map<String, bool>> getFeatures(
    String leagueId,
    List<String> featureNames,
  ) async {
    final league = await _load(leagueId);
    return {
      for (var name in featureNames) name: _alwaysOn.contains(name) || _parseBool(league?.features[_key(name)]),
    };
  }

  /// The league's plan: 'full' or 'web_only' (null when it cannot be read).
  static Future<String?> productMode(String leagueId) async => (await _load(leagueId))?.productMode;

  /// Clear the feature cache (e.g., after login or league switch)
  static void clearCache() => _cache.clear();

  static String _key(String name) => _aliases[name] ?? name;

  static Future<_CachedLeague?> _load(String leagueId) async {
    final now = DateTime.now();
    final cached = _cache[leagueId];
    if (cached != null && now.difference(cached.timestamp) < _cacheDuration) {
      return cached;
    }
    try {
      final json = await sl<ApiClient>().getObject('/leagues/$leagueId');
      final features = json['features'];
      final league = _CachedLeague(
        features: features is Map ? features.cast<String, dynamic>() : const {},
        productMode: json['product_mode'] as String? ?? 'full',
        timestamp: now,
      );
      _cache[leagueId] = league;
      return league;
    } catch (_) {
      return null;
    }
  }

  static bool _parseBool(dynamic value) {
    if (value is bool) return value;
    if (value is String) return value.toLowerCase() == 'true';
    return false;
  }
}

class _CachedLeague {
  final Map<String, dynamic> features;
  final String productMode;
  final DateTime timestamp;
  _CachedLeague({required this.features, required this.productMode, required this.timestamp});
}
