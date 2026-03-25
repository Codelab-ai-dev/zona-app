import '../../data/datasources/remote/supabase_client.dart';

/// Helper to generate embeddings for the WhatsApp AI agent
/// Calls Edge Functions to generate and store embeddings
class EmbeddingGenerator {
  /// Generate standings embedding for a league
  static Future<bool> generateStandingsEmbedding(String leagueId) async {
    try {
      final response = await SupabaseClientService.instance.client.functions.invoke(
        'generate-standings-embedding',
        body: {'league_id': leagueId},
      );
      return response.status == 200;
    } catch (e) {
      print('Error generating standings embedding: $e');
      return false;
    }
  }

  /// Generate match results embedding for a league
  static Future<bool> generateMatchResultsEmbedding(String leagueId) async {
    try {
      final response = await SupabaseClientService.instance.client.functions.invoke(
        'generate-match-results-embedding',
        body: {'league_id': leagueId},
      );
      return response.status == 200;
    } catch (e) {
      print('Error generating match results embedding: $e');
      return false;
    }
  }

  /// Generate fixtures embedding for a league
  static Future<bool> generateFixturesEmbedding(String leagueId) async {
    try {
      final response = await SupabaseClientService.instance.client.functions.invoke(
        'generate-fixtures-embedding',
        body: {'league_id': leagueId},
      );
      return response.status == 200;
    } catch (e) {
      print('Error generating fixtures embedding: $e');
      return false;
    }
  }

  /// Generate all embeddings for a league
  static Future<Map<String, bool>> generateAllEmbeddings(String leagueId) async {
    final results = await Future.wait([
      generateStandingsEmbedding(leagueId),
      generateMatchResultsEmbedding(leagueId),
      generateFixturesEmbedding(leagueId),
    ]);

    return {
      'standings': results[0],
      'match_results': results[1],
      'fixtures': results[2],
    };
  }
}
