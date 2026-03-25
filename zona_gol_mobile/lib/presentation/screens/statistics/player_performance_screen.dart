import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import '../../../core/di/injection.dart';
import '../../../domain/entities/player_match_history_entity.dart';
import '../../../domain/entities/player_stats_entity.dart';
import '../../bloc/player_stats/player_stats_bloc.dart';
import '../../bloc/player_stats/player_stats_event.dart';
import '../../bloc/player_stats/player_stats_state.dart';

class _SN {
  static const Color backgroundDark = Color(0xFF050508);
  static const Color surfaceDark = Color(0xFF0A0A0F);
  static const Color cardDark = Color(0xFF12121A);
  static const Color gold = Color(0xFFFFD700);
  static const Color neonGreen = Color(0xFF00FF7F);
  static const Color success = Color(0xFF10B981);
  static const Color error = Color(0xFFEF4444);
  static const Color warning = Color(0xFFFFC107);
  static const Color textPrimary = Color(0xFFFAFAFA);
  static const Color textSecondary = Color(0xFF9CA3AF);
  static const Color textMuted = Color(0xFF6B7280);
}

/// Player Performance Screen — deep analytics with match history & charts
class PlayerPerformanceScreen extends StatelessWidget {
  final String playerId;
  final String playerName;
  final String teamName;
  final String teamId;

  const PlayerPerformanceScreen({
    super.key,
    required this.playerId,
    required this.playerName,
    required this.teamName,
    required this.teamId,
  });

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => sl<PlayerStatsBloc>()
        ..add(LoadPlayerMatchHistoryEvent(playerId: playerId)),
      child: _PerformanceView(
        playerId: playerId,
        playerName: playerName,
        teamName: teamName,
      ),
    );
  }
}

class _PerformanceView extends StatelessWidget {
  final String playerId;
  final String playerName;
  final String teamName;

  const _PerformanceView({
    required this.playerId,
    required this.playerName,
    required this.teamName,
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
        appBar: AppBar(
          backgroundColor: _SN.surfaceDark,
          foregroundColor: _SN.textPrimary,
          elevation: 0,
          leading: IconButton(
            icon: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.3),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: _SN.gold.withOpacity(0.2)),
              ),
              child: const Icon(Icons.arrow_back, color: _SN.gold, size: 18),
            ),
            onPressed: () => Navigator.pop(context),
          ),
          title: Text(
            'RENDIMIENTO',
            style: GoogleFonts.bebasNeue(
              fontSize: 22,
              color: _SN.textPrimary,
              letterSpacing: 2,
            ),
          ),
          centerTitle: true,
        ),
        body: BlocBuilder<PlayerStatsBloc, PlayerStatsState>(
          builder: (context, state) {
            if (state is PlayerStatsLoading) {
              return const Center(
                child: CircularProgressIndicator(color: _SN.gold),
              );
            }

            if (state is PlayerMatchHistoryLoaded) {
              return RefreshIndicator(
                color: _SN.gold,
                backgroundColor: _SN.cardDark,
                onRefresh: () async {
                  context.read<PlayerStatsBloc>().add(
                        LoadPlayerMatchHistoryEvent(playerId: playerId),
                      );
                },
                child: _buildBody(state.aggregated, state.history),
              );
            }

            if (state is PlayerStatsError) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.error_outline,
                          color: _SN.error.withOpacity(0.5), size: 48),
                      const SizedBox(height: 12),
                      Text(
                        state.message,
                        style: GoogleFonts.outfit(
                            color: _SN.textSecondary, fontSize: 14),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              );
            }

            return const SizedBox.shrink();
          },
        ),
      ),
    );
  }

  Widget _buildBody(
    PlayerStatsEntity? stats,
    List<PlayerMatchHistoryEntry> history,
  ) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Player header
        _buildHeader(),
        const SizedBox(height: 20),

        // Summary highlight cards
        if (stats != null) ...[
          _buildSummaryRow(stats),
          const SizedBox(height: 16),
          _buildPerformanceRating(stats),
          const SizedBox(height: 16),
        ],

        // Goals progression chart
        if (history.isNotEmpty) ...[
          _buildGoalsChart(history),
          const SizedBox(height: 16),
        ],

        // Match history list
        _buildMatchHistorySection(history),
      ],
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            _SN.cardDark,
            _SN.gold.withOpacity(0.05),
          ],
        ),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _SN.gold.withOpacity(0.2)),
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(
                colors: [
                  _SN.gold.withOpacity(0.3),
                  _SN.neonGreen.withOpacity(0.15),
                ],
              ),
              border: Border.all(color: _SN.gold.withOpacity(0.4)),
            ),
            child: Center(
              child: Icon(Icons.analytics_outlined,
                  color: _SN.gold, size: 22),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  playerName,
                  style: GoogleFonts.outfit(
                    fontSize: 17,
                    fontWeight: FontWeight.bold,
                    color: _SN.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  teamName,
                  style: GoogleFonts.outfit(
                    fontSize: 13,
                    color: _SN.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryRow(PlayerStatsEntity stats) {
    return Row(
      children: [
        Expanded(
          child: _buildHighlightCard(
            'Goles/Partido',
            stats.goalsPerMatch.toStringAsFixed(2),
            Icons.sports_score,
            _SN.neonGreen,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _buildHighlightCard(
            'Min/Gol',
            stats.goals > 0
                ? stats.minutesPerGoal.toStringAsFixed(0)
                : '-',
            Icons.timer_outlined,
            _SN.gold,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _buildHighlightCard(
            'Contribuciones',
            stats.totalContributions.toString(),
            Icons.handshake_outlined,
            const Color(0xFF60A5FA),
          ),
        ),
      ],
    );
  }

  Widget _buildHighlightCard(
      String label, String value, IconData icon, Color accent) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
      decoration: BoxDecoration(
        color: _SN.cardDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: accent.withOpacity(0.2)),
      ),
      child: Column(
        children: [
          Icon(icon, color: accent.withOpacity(0.7), size: 18),
          const SizedBox(height: 8),
          Text(
            value,
            style: GoogleFonts.bebasNeue(
              fontSize: 24,
              color: _SN.textPrimary,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: GoogleFonts.outfit(
              fontSize: 10,
              color: _SN.textMuted,
              fontWeight: FontWeight.w500,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildPerformanceRating(PlayerStatsEntity stats) {
    // Compute a simple performance rating 0-10
    // based on goals per match, contributions, and discipline
    double rating = 5.0;
    if (stats.matchesPlayed > 0) {
      rating += (stats.goalsPerMatch * 2).clamp(0, 2);
      rating += (stats.assistsPerMatch * 1.5).clamp(0, 1.5);
      rating -= (stats.disciplineScore * 0.3).clamp(0, 2);
    }
    rating = rating.clamp(0, 10);

    Color ratingColor;
    String ratingLabel;
    if (rating >= 8) {
      ratingColor = _SN.neonGreen;
      ratingLabel = 'Excelente';
    } else if (rating >= 6) {
      ratingColor = _SN.gold;
      ratingLabel = 'Bueno';
    } else if (rating >= 4) {
      ratingColor = _SN.warning;
      ratingLabel = 'Regular';
    } else {
      ratingColor = _SN.error;
      ratingLabel = 'Bajo';
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _SN.cardDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: ratingColor.withOpacity(0.2)),
      ),
      child: Row(
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: ratingColor, width: 2.5),
            ),
            child: Center(
              child: Text(
                rating.toStringAsFixed(1),
                style: GoogleFonts.bebasNeue(
                  fontSize: 20,
                  color: ratingColor,
                ),
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'RATING DE RENDIMIENTO',
                  style: GoogleFonts.bebasNeue(
                    fontSize: 14,
                    color: _SN.gold,
                    letterSpacing: 1.5,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  ratingLabel,
                  style: GoogleFonts.outfit(
                    fontSize: 15,
                    color: ratingColor,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  '${stats.matchesPlayed} partidos jugados',
                  style: GoogleFonts.outfit(
                    fontSize: 12,
                    color: _SN.textMuted,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGoalsChart(List<PlayerMatchHistoryEntry> history) {
    // Build cumulative goals list (oldest first)
    final sorted = List<PlayerMatchHistoryEntry>.from(history)
      ..sort((a, b) => a.matchDate.compareTo(b.matchDate));

    final List<FlSpot> spots = [];
    int cumulative = 0;
    for (int i = 0; i < sorted.length; i++) {
      cumulative += sorted[i].goals;
      spots.add(FlSpot(i.toDouble(), cumulative.toDouble()));
    }

    if (spots.length < 2) return const SizedBox.shrink();

    final maxY = spots.last.y;

    return Container(
      decoration: BoxDecoration(
        color: _SN.cardDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _SN.gold.withOpacity(0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
            child: Row(
              children: [
                const Icon(Icons.show_chart, color: _SN.gold, size: 18),
                const SizedBox(width: 8),
                Text(
                  'PROGRESION DE GOLES',
                  style: GoogleFonts.bebasNeue(
                    fontSize: 16,
                    color: _SN.gold,
                    letterSpacing: 1.5,
                  ),
                ),
              ],
            ),
          ),
          Divider(color: _SN.gold.withOpacity(0.1), height: 1),
          Padding(
            padding: const EdgeInsets.fromLTRB(8, 16, 16, 16),
            child: SizedBox(
              height: 180,
              child: LineChart(
                LineChartData(
                  gridData: FlGridData(
                    show: true,
                    drawVerticalLine: false,
                    horizontalInterval: (maxY / 4).clamp(1, double.infinity),
                    getDrawingHorizontalLine: (_) => FlLine(
                      color: _SN.textMuted.withOpacity(0.1),
                      strokeWidth: 1,
                    ),
                  ),
                  titlesData: FlTitlesData(
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 32,
                        interval: (maxY / 4).clamp(1, double.infinity),
                        getTitlesWidget: (value, _) => Text(
                          value.toInt().toString(),
                          style: GoogleFonts.outfit(
                            fontSize: 10,
                            color: _SN.textMuted,
                          ),
                        ),
                      ),
                    ),
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 28,
                        interval: (sorted.length / 5).clamp(1, double.infinity),
                        getTitlesWidget: (value, _) {
                          final idx = value.toInt();
                          if (idx < 0 || idx >= sorted.length) {
                            return const SizedBox.shrink();
                          }
                          return Padding(
                            padding: const EdgeInsets.only(top: 6),
                            child: Text(
                              'J${idx + 1}',
                              style: GoogleFonts.outfit(
                                fontSize: 9,
                                color: _SN.textMuted,
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                    topTitles: const AxisTitles(
                        sideTitles: SideTitles(showTitles: false)),
                    rightTitles: const AxisTitles(
                        sideTitles: SideTitles(showTitles: false)),
                  ),
                  borderData: FlBorderData(show: false),
                  lineBarsData: [
                    LineChartBarData(
                      spots: spots,
                      isCurved: true,
                      curveSmoothness: 0.25,
                      color: _SN.neonGreen,
                      barWidth: 2.5,
                      isStrokeCapRound: true,
                      dotData: FlDotData(
                        show: true,
                        getDotPainter: (_, __, ___, ____) =>
                            FlDotCirclePainter(
                          radius: 3,
                          color: _SN.neonGreen,
                          strokeWidth: 1,
                          strokeColor: _SN.cardDark,
                        ),
                      ),
                      belowBarData: BarAreaData(
                        show: true,
                        color: _SN.neonGreen.withOpacity(0.08),
                      ),
                    ),
                  ],
                  lineTouchData: LineTouchData(
                    touchTooltipData: LineTouchTooltipData(
                      tooltipRoundedRadius: 8,
                      getTooltipColor: (_) => _SN.cardDark,
                      getTooltipItems: (spots) => spots.map((s) {
                        return LineTooltipItem(
                          '${s.y.toInt()} goles',
                          GoogleFonts.outfit(
                            color: _SN.neonGreen,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                  minY: 0,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMatchHistorySection(List<PlayerMatchHistoryEntry> history) {
    return Container(
      decoration: BoxDecoration(
        color: _SN.cardDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _SN.gold.withOpacity(0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
            child: Row(
              children: [
                const Icon(Icons.history, color: _SN.gold, size: 18),
                const SizedBox(width: 8),
                Text(
                  'HISTORIAL DE PARTIDOS',
                  style: GoogleFonts.bebasNeue(
                    fontSize: 16,
                    color: _SN.gold,
                    letterSpacing: 1.5,
                  ),
                ),
                const Spacer(),
                Text(
                  '${history.length}',
                  style: GoogleFonts.bebasNeue(
                    fontSize: 16,
                    color: _SN.textMuted,
                  ),
                ),
              ],
            ),
          ),
          Divider(color: _SN.gold.withOpacity(0.1), height: 1),
          if (history.isEmpty)
            Padding(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: Column(
                  children: [
                    Icon(Icons.sports_soccer_outlined,
                        color: _SN.textMuted.withOpacity(0.4), size: 36),
                    const SizedBox(height: 8),
                    Text(
                      'Sin historial de partidos',
                      style: GoogleFonts.outfit(
                          fontSize: 14, color: _SN.textMuted),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'El historial aparecerá cuando se registren estadísticas por partido',
                      style: GoogleFonts.outfit(
                        fontSize: 12,
                        color: _SN.textMuted.withOpacity(0.6),
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            )
          else
            ...history.map((entry) => _buildMatchRow(entry)),
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  Widget _buildMatchRow(PlayerMatchHistoryEntry entry) {
    final resultColor = switch (entry.result) {
      'W' => _SN.success,
      'L' => _SN.error,
      _ => _SN.warning,
    };

    final resultLabel = switch (entry.result) {
      'W' => 'V',
      'L' => 'D',
      _ => 'E',
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(color: _SN.gold.withOpacity(0.05)),
        ),
      ),
      child: Row(
        children: [
          // Result badge
          Container(
            width: 30,
            height: 30,
            decoration: BoxDecoration(
              color: resultColor.withOpacity(0.15),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: resultColor.withOpacity(0.3)),
            ),
            child: Center(
              child: Text(
                resultLabel,
                style: GoogleFonts.bebasNeue(
                  fontSize: 14,
                  color: resultColor,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          // Opponent + date
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${entry.isHome ? "vs" : "@"} ${entry.opponentName}',
                  style: GoogleFonts.outfit(
                    fontSize: 13,
                    color: _SN.textPrimary,
                    fontWeight: FontWeight.w500,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  '${DateFormat('dd/MM/yy').format(entry.matchDate)}  ·  ${entry.scoreDisplay}',
                  style: GoogleFonts.outfit(
                    fontSize: 11,
                    color: _SN.textMuted,
                  ),
                ),
              ],
            ),
          ),
          // Per-match stats
          _buildMatchStatChip(
              Icons.sports_score, entry.goals.toString(), _SN.neonGreen),
          const SizedBox(width: 6),
          _buildMatchStatChip(
              Icons.handshake_outlined, entry.assists.toString(), const Color(0xFF60A5FA)),
          const SizedBox(width: 6),
          if (entry.yellowCards > 0 || entry.redCards > 0)
            _buildCardChips(entry.yellowCards, entry.redCards),
        ],
      ),
    );
  }

  Widget _buildMatchStatChip(IconData icon, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 11, color: color.withOpacity(0.7)),
          const SizedBox(width: 3),
          Text(
            value,
            style: GoogleFonts.outfit(
              fontSize: 11,
              color: color,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCardChips(int yellow, int red) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (yellow > 0)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 3),
            decoration: BoxDecoration(
              color: _SN.warning.withOpacity(0.1),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.square, size: 9, color: _SN.warning.withOpacity(0.8)),
                const SizedBox(width: 2),
                Text(
                  '$yellow',
                  style: GoogleFonts.outfit(
                    fontSize: 11,
                    color: _SN.warning,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        if (yellow > 0 && red > 0) const SizedBox(width: 4),
        if (red > 0)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 3),
            decoration: BoxDecoration(
              color: _SN.error.withOpacity(0.1),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.square, size: 9, color: _SN.error.withOpacity(0.8)),
                const SizedBox(width: 2),
                Text(
                  '$red',
                  style: GoogleFonts.outfit(
                    fontSize: 11,
                    color: _SN.error,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}
