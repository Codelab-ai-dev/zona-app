import 'package:supabase_flutter/supabase_flutter.dart';

/// Feature Gate
/// Checks if a league has a specific feature enabled via the JSONB features column.
/// Results are cached for 5 minutes per league.
class FeatureGate {
  static final Map<String, _CachedFeatures> _cache = {};
  static const _cacheDuration = Duration(minutes: 5);

  /// Check if a league has a specific feature enabled
  /// Queries the leagues table for the features JSONB column
  static Future<bool> hasFeature(String leagueId, String featureName) async {
    final now = DateTime.now();
    final cached = _cache[leagueId];
    if (cached != null && now.difference(cached.timestamp) < _cacheDuration) {
      return _parseBool(cached.features[featureName]);
    }

    try {
      final response = await Supabase.instance.client
          .from('leagues')
          .select('features')
          .eq('id', leagueId)
          .maybeSingle();

      if (response == null) return false;

      final features = response['features'] as Map<String, dynamic>? ?? {};
      _cache[leagueId] = _CachedFeatures(features: features, timestamp: now);

      return _parseBool(features[featureName]);
    } catch (_) {
      return false;
    }
  }

  /// Check multiple features at once
  static Future<Map<String, bool>> getFeatures(
    String leagueId,
    List<String> featureNames,
  ) async {
    final now = DateTime.now();
    final cached = _cache[leagueId];
    if (cached != null && now.difference(cached.timestamp) < _cacheDuration) {
      return {
        for (var name in featureNames)
          name: _parseBool(cached.features[name]),
      };
    }

    try {
      final response = await Supabase.instance.client
          .from('leagues')
          .select('features')
          .eq('id', leagueId)
          .maybeSingle();

      if (response == null) {
        return {for (var name in featureNames) name: false};
      }

      final features = response['features'] as Map<String, dynamic>? ?? {};
      _cache[leagueId] = _CachedFeatures(features: features, timestamp: now);

      return {
        for (var name in featureNames)
          name: _parseBool(features[name]),
      };
    } catch (_) {
      return {for (var name in featureNames) name: false};
    }
  }

  /// Clear the feature cache (e.g., after login or league switch)
  static void clearCache() => _cache.clear();

  static bool _parseBool(dynamic value) {
    if (value is bool) return value;
    if (value is String) return value.toLowerCase() == 'true';
    return false;
  }
}

class _CachedFeatures {
  final Map<String, dynamic> features;
  final DateTime timestamp;
  _CachedFeatures({required this.features, required this.timestamp});
}
