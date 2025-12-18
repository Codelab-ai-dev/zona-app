import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/match.dart';

/// Modal for selecting a match when multiple matches are available
/// Solves the "dobles jornadas" and "multiple matches per day" problem
class MatchSelectorModal extends StatelessWidget {
  final List<Match> matches;
  final String reason;
  final Function(Match) onMatchSelected;

  const MatchSelectorModal({
    super.key,
    required this.matches,
    required this.reason,
    required this.onMatchSelected,
  });

  /// Show the modal and return the selected match
  static Future<Match?> show(
    BuildContext context, {
    required List<Match> matches,
    String? reason,
  }) async {
    return await showModalBottomSheet<Match>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => MatchSelectorModal(
        matches: matches,
        reason: reason ?? 'Selecciona un partido',
        onMatchSelected: (match) {
          Navigator.of(context).pop(match);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.75,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          // Handle bar
          Container(
            margin: const EdgeInsets.only(top: 12),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey[300],
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                const Icon(Icons.sports_soccer, size: 48, color: Colors.green),
                const SizedBox(height: 12),
                Text(
                  'Selecciona un Partido',
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  reason,
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 16, color: Colors.grey[600]),
                ),
              ],
            ),
          ),

          const Divider(),

          // Match list
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              itemCount: matches.length,
              separatorBuilder: (context, index) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final match = matches[index];
                return _buildMatchCard(context, match);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMatchCard(BuildContext context, Match match) {
    final dateFormat = DateFormat('EEEE, d MMM', 'es');
    final timeFormat = DateFormat('HH:mm', 'es');
    final matchDate = match.matchDate.toLocal();

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: match.status == MatchStatus.in_progress
              ? Colors.green
              : Colors.grey.shade300,
          width: match.status == MatchStatus.in_progress ? 2 : 1,
        ),
      ),
      child: InkWell(
        onTap: () => onMatchSelected(match),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Status badge
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: match.status == MatchStatus.in_progress
                          ? Colors.green
                          : match.status == MatchStatus.scheduled
                          ? Colors.blue
                          : Colors.grey,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      match.status == MatchStatus.in_progress
                          ? 'EN PROGRESO'
                          : match.status == MatchStatus.scheduled
                          ? 'PROGRAMADO'
                          : match.statusText.toUpperCase(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  if (match.status == MatchStatus.in_progress)
                    const Icon(Icons.circle, color: Colors.red, size: 12),
                ],
              ),

              const SizedBox(height: 16),

              // Teams
              Row(
                children: [
                  // Home team
                  Expanded(
                    child: Column(
                      children: [
                        if (match.homeTeamLogo != null)
                          Image.network(
                            match.homeTeamLogo!,
                            width: 48,
                            height: 48,
                            errorBuilder: (_, __, ___) =>
                                const Icon(Icons.shield, size: 48),
                          )
                        else
                          const Icon(Icons.shield, size: 48),
                        const SizedBox(height: 8),
                        Text(
                          match.homeTeamName ?? 'Equipo Local',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),

                  // VS
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Column(
                      children: [
                        const Text(
                          'vs',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.grey,
                          ),
                        ),
                        if (match.status == MatchStatus.in_progress ||
                            match.status == MatchStatus.finished)
                          Container(
                            margin: const EdgeInsets.only(top: 8),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.grey.shade200,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              '${match.homeScore ?? 0} - ${match.awayScore ?? 0}',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),

                  // Away team
                  Expanded(
                    child: Column(
                      children: [
                        if (match.awayTeamLogo != null)
                          Image.network(
                            match.awayTeamLogo!,
                            width: 48,
                            height: 48,
                            errorBuilder: (_, __, ___) =>
                                const Icon(Icons.shield, size: 48),
                          )
                        else
                          const Icon(Icons.shield, size: 48),
                        const SizedBox(height: 8),
                        Text(
                          match.awayTeamName ?? 'Equipo Visitante',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 16),

              // Date and time
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.calendar_today, size: 16, color: Colors.grey[600]),
                  const SizedBox(width: 8),
                  Text(
                    dateFormat.format(matchDate),
                    style: TextStyle(fontSize: 14, color: Colors.grey[700]),
                  ),
                  const SizedBox(width: 16),
                  Icon(Icons.access_time, size: 16, color: Colors.grey[600]),
                  const SizedBox(width: 8),
                  Text(
                    timeFormat.format(matchDate),
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: Colors.grey[700],
                    ),
                  ),
                ],
              ),

              // Select button
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => onMatchSelected(match),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: match.status == MatchStatus.in_progress
                        ? Colors.green
                        : Colors.blue,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  child: Text(
                    match.status == MatchStatus.in_progress
                        ? 'Seleccionar Partido en Progreso'
                        : 'Seleccionar este Partido',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
