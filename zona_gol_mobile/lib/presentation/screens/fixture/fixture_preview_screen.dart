import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/utils/fixture_config.dart';
import '../../bloc/match/match_bloc.dart';
import '../../bloc/match/match_event.dart';
import '../../bloc/match/match_state.dart';

/// Stadium Nights Design System
class _SN {
  static const Color backgroundDark = Color(0xFF050508);
  static const Color surfaceDark = Color(0xFF0A0A0F);
  static const Color cardDark = Color(0xFF12121A);
  static const Color gold = Color(0xFFFFD700);
  static const Color neonGreen = Color(0xFF00FF7F);
  static const Color neonBlue = Color(0xFF00BFFF);
  static const Color purple = Color(0xFF8B5CF6);
  static const Color success = Color(0xFF10B981);
  static const Color error = Color(0xFFEF4444);
  static const Color textPrimary = Color(0xFFFAFAFA);
  static const Color textSecondary = Color(0xFF9CA3AF);
  static const Color textMuted = Color(0xFF6B7280);
}

/// Fixture Preview Screen
/// Shows generated fixtures grouped by round, with save/cancel options
class FixturePreviewScreen extends StatelessWidget {
  final List<GeneratedMatch> fixtures;
  final int totalRounds;
  final int totalMatches;
  final String tournamentName;

  const FixturePreviewScreen({
    super.key,
    required this.fixtures,
    required this.totalRounds,
    required this.totalMatches,
    required this.tournamentName,
  });

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light.copyWith(
        statusBarColor: Colors.transparent,
        systemNavigationBarColor: _SN.backgroundDark,
      ),
      child: Scaffold(
        backgroundColor: _SN.backgroundDark,
        appBar: _buildAppBar(context),
        body: BlocListener<MatchBloc, MatchState>(
          listener: (context, state) {
            if (state is FixturesSaved) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    '${state.matchCount} partidos creados exitosamente',
                  ),
                  backgroundColor: _SN.success,
                ),
              );
              // Pop back to dashboard (pop preview + generator)
              Navigator.of(context)
                ..pop()
                ..pop();
            } else if (state is MatchError) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(state.message),
                  backgroundColor: _SN.error,
                ),
              );
            }
          },
          child: BlocBuilder<MatchBloc, MatchState>(
            builder: (context, state) {
              if (state is FixturesSaving) {
                return _buildSavingState();
              }
              return _buildContent(context);
            },
          ),
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(BuildContext context) {
    return AppBar(
      backgroundColor: _SN.surfaceDark,
      foregroundColor: _SN.textPrimary,
      elevation: 0,
      leading: IconButton(
        icon: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.3),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: _SN.purple.withOpacity(0.3)),
          ),
          child: Icon(Icons.arrow_back, color: _SN.purple, size: 18),
        ),
        onPressed: () => Navigator.pop(context),
      ),
      title: Text(
        'VISTA PREVIA',
        style: GoogleFonts.bebasNeue(
          fontSize: 22,
          color: _SN.textPrimary,
          letterSpacing: 2,
        ),
      ),
      centerTitle: true,
    );
  }

  Widget _buildSavingState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(
            width: 50,
            height: 50,
            child: CircularProgressIndicator(
              strokeWidth: 3,
              valueColor: AlwaysStoppedAnimation<Color>(_SN.neonGreen),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'GUARDANDO PARTIDOS',
            style: GoogleFonts.bebasNeue(
              fontSize: 16,
              color: _SN.textMuted,
              letterSpacing: 2,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContent(BuildContext context) {
    // Group fixtures by round
    final Map<int, List<GeneratedMatch>> roundsMap = {};
    for (final match in fixtures) {
      roundsMap.putIfAbsent(match.round, () => []).add(match);
    }
    final sortedRounds = roundsMap.keys.toList()..sort();

    return Column(
      children: [
        // Summary header
        _buildSummaryHeader(),

        // Match list
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            itemCount: sortedRounds.length,
            itemBuilder: (context, index) {
              final roundNum = sortedRounds[index];
              final roundMatches = roundsMap[roundNum]!;
              return _buildRoundSection(roundNum, roundMatches);
            },
          ),
        ),

        // Bottom bar
        _buildBottomBar(context),
      ],
    );
  }

  Widget _buildSummaryHeader() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _SN.surfaceDark,
        border: Border(
          bottom: BorderSide(color: _SN.purple.withOpacity(0.2)),
        ),
      ),
      child: Row(
        children: [
          Icon(Icons.emoji_events, color: _SN.gold, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              tournamentName.toUpperCase(),
              style: GoogleFonts.bebasNeue(
                fontSize: 16,
                color: _SN.gold,
                letterSpacing: 1,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: _SN.purple.withOpacity(0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              '$totalRounds jornadas',
              style: GoogleFonts.outfit(
                fontSize: 12,
                color: _SN.purple,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: _SN.neonGreen.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              '$totalMatches partidos',
              style: GoogleFonts.outfit(
                fontSize: 12,
                color: _SN.neonGreen,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRoundSection(int roundNum, List<GeneratedMatch> matches) {
    // Check for bye team in this round
    final byeTeam = matches.firstWhere(
      (m) => m.byeTeam != null,
      orElse: () => matches.first,
    ).byeTeam;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 16),
        // Round header
        Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [_SN.purple, _SN.purple.withOpacity(0.7)],
                ),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                'JORNADA $roundNum',
                style: GoogleFonts.bebasNeue(
                  fontSize: 14,
                  color: Colors.white,
                  letterSpacing: 1,
                ),
              ),
            ),
            const SizedBox(width: 8),
            Text(
              '${matches.length} partidos',
              style: GoogleFonts.outfit(
                fontSize: 12,
                color: _SN.textMuted,
              ),
            ),
            if (byeTeam != null) ...[
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: _SN.gold.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.airline_seat_flat, color: _SN.gold, size: 14),
                    const SizedBox(width: 4),
                    Text(
                      'Descansa: ${byeTeam.name}',
                      style: GoogleFonts.outfit(
                        fontSize: 11,
                        color: _SN.gold,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: 8),
        // Match cards
        ...matches.asMap().entries.map((entry) {
          return _buildMatchCard(entry.value, entry.key);
        }),
      ],
    );
  }

  Widget _buildMatchCard(GeneratedMatch match, int index) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.0, end: 1.0),
      duration: Duration(milliseconds: 200 + (index * 30)),
      curve: Curves.easeOutCubic,
      builder: (context, value, child) {
        return Transform.translate(
          offset: Offset(0, 10 * (1 - value)),
          child: Opacity(opacity: value, child: child),
        );
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: _SN.cardDark,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: _SN.purple.withOpacity(0.12),
          ),
        ),
        child: Row(
          children: [
            // Home team
            Expanded(
              child: Text(
                match.homeTeam.name,
                style: GoogleFonts.outfit(
                  fontSize: 13,
                  color: _SN.textPrimary,
                  fontWeight: FontWeight.w500,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),

            // VS badge
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 8),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: _SN.purple.withOpacity(0.1),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                'VS',
                style: GoogleFonts.bebasNeue(
                  fontSize: 12,
                  color: _SN.purple,
                ),
              ),
            ),

            // Away team
            Expanded(
              child: Text(
                match.awayTeam.name,
                style: GoogleFonts.outfit(
                  fontSize: 13,
                  color: _SN.textPrimary,
                  fontWeight: FontWeight.w500,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.right,
              ),
            ),

            const SizedBox(width: 12),

            // Date, time, field
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.calendar_today, size: 10, color: _SN.textMuted),
                    const SizedBox(width: 4),
                    Text(
                      _formatDisplayDate(match.date),
                      style: GoogleFonts.outfit(
                        fontSize: 11,
                        color: _SN.textMuted,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.access_time, size: 10, color: _SN.neonBlue),
                    const SizedBox(width: 4),
                    Text(
                      match.time,
                      style: GoogleFonts.outfit(
                        fontSize: 11,
                        color: _SN.neonBlue,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Icon(Icons.stadium, size: 10, color: _SN.textMuted),
                    const SizedBox(width: 2),
                    Text(
                      'C${match.field}',
                      style: GoogleFonts.outfit(
                        fontSize: 11,
                        color: _SN.textMuted,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomBar(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(
        16,
        12,
        16,
        12 + MediaQuery.of(context).padding.bottom,
      ),
      decoration: BoxDecoration(
        color: _SN.surfaceDark,
        border: Border(
          top: BorderSide(color: _SN.purple.withOpacity(0.2)),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: OutlinedButton(
              onPressed: () => Navigator.pop(context),
              style: OutlinedButton.styleFrom(
                foregroundColor: _SN.textSecondary,
                side: BorderSide(color: _SN.textMuted),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: Text(
                'CANCELAR',
                style: GoogleFonts.bebasNeue(
                  fontSize: 14,
                  letterSpacing: 1,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 2,
            child: ElevatedButton(
              onPressed: () => _saveFixtures(context),
              style: ElevatedButton.styleFrom(
                backgroundColor: _SN.neonGreen,
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: Text(
                'GUARDAR $totalMatches PARTIDOS',
                style: GoogleFonts.bebasNeue(
                  fontSize: 14,
                  letterSpacing: 1,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _saveFixtures(BuildContext context) {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: _SN.cardDark,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: Text(
          'Confirmar',
          style: GoogleFonts.bebasNeue(
            fontSize: 22,
            color: _SN.textPrimary,
            letterSpacing: 1,
          ),
        ),
        content: Text(
          'Se crearán $totalMatches partidos para "$tournamentName". Esta acción no se puede deshacer.',
          style: GoogleFonts.outfit(
            fontSize: 14,
            color: _SN.textSecondary,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: Text(
              'Cancelar',
              style: GoogleFonts.outfit(
                color: _SN.textMuted,
              ),
            ),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(dialogContext);
              final maps = fixtures.map((f) => f.toInsertMap()).toList();
              context.read<MatchBloc>().add(SaveFixturesEvent(matches: maps));
            },
            style: TextButton.styleFrom(foregroundColor: _SN.neonGreen),
            child: Text(
              'Guardar',
              style: GoogleFonts.outfit(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }

  String _formatDisplayDate(String isoDate) {
    // YYYY-MM-DD -> DD/MM
    final parts = isoDate.split('-');
    if (parts.length == 3) {
      return '${parts[2]}/${parts[1]}';
    }
    return isoDate;
  }
}
