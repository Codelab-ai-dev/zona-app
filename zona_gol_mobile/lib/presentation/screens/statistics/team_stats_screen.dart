import 'dart:ui';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/di/injection.dart';
import '../../../domain/entities/player_stats_entity.dart';
import '../../../domain/entities/user_entity.dart';
import '../../bloc/player_stats/player_stats_bloc.dart';
import '../../bloc/player_stats/player_stats_event.dart';
import '../../bloc/player_stats/player_stats_state.dart';

/// Stadium Nights Design System
class _SN {
  static const Color backgroundDark = Color(0xFF050508);
  static const Color cardDark = Color(0xFF12121A);
  static const Color neonGreen = Color(0xFF00FF7F);
  static const Color neonBlue = Color(0xFF00BFFF);
  static const Color neonPurple = Color(0xFF8B5CF6);
  static const Color amber = Color(0xFFF59E0B);
  static const Color error = Color(0xFFEF4444);
  static const Color textPrimary = Color(0xFFFAFAFA);
  static const Color textSecondary = Color(0xFF9CA3AF);
  static const Color textMuted = Color(0xFF6B7280);
}

/// Team Stats Screen
/// Shows detailed player statistics for a team
class TeamStatsScreen extends StatelessWidget {
  final UserEntity user;

  const TeamStatsScreen({super.key, required this.user});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) {
        final bloc = sl<PlayerStatsBloc>();
        if (user.teamId != null) {
          bloc.add(LoadTeamStatsEvent(teamId: user.teamId!));
        }
        return bloc;
      },
      child: _TeamStatsView(user: user),
    );
  }
}

class _TeamStatsView extends StatefulWidget {
  final UserEntity user;

  const _TeamStatsView({required this.user});

  @override
  State<_TeamStatsView> createState() => _TeamStatsViewState();
}

enum _SortColumn { name, matches, goals, assists, yellowCards, redCards, minutes }

class _TeamStatsViewState extends State<_TeamStatsView> {
  _SortColumn _sortBy = _SortColumn.goals;
  bool _sortAscending = false;

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light.copyWith(
        statusBarColor: Colors.transparent,
        systemNavigationBarColor: _SN.backgroundDark,
      ),
      child: Scaffold(
        backgroundColor: _SN.backgroundDark,
        body: SafeArea(
          child: Column(
            children: [
              _buildHeader(context),
              Expanded(child: _buildContent()),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
      child: Row(
        children: [
          GestureDetector(
            onTap: () {
              HapticFeedback.lightImpact();
              Navigator.pop(context);
            },
            child: Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: _SN.cardDark,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: _SN.neonBlue.withOpacity(0.2)),
              ),
              child: Icon(Icons.arrow_back, color: _SN.neonBlue, size: 20),
            ),
          ),
          const SizedBox(width: 16),
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [_SN.neonBlue, _SN.neonPurple],
              ),
              borderRadius: BorderRadius.circular(14),
              boxShadow: [
                BoxShadow(
                  color: _SN.neonBlue.withOpacity(0.3),
                  blurRadius: 16,
                  spreadRadius: 1,
                ),
              ],
            ),
            child: const Icon(Icons.bar_chart, color: Colors.white, size: 26),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'ESTADÍSTICAS',
                  style: GoogleFonts.bebasNeue(
                    fontSize: 28,
                    color: _SN.textPrimary,
                    letterSpacing: 3,
                    height: 1,
                  ),
                ),
                Text(
                  'Rendimiento del equipo',
                  style: GoogleFonts.outfit(
                    fontSize: 12,
                    color: _SN.neonBlue,
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContent() {
    return BlocBuilder<PlayerStatsBloc, PlayerStatsState>(
      builder: (context, state) {
        if (state is PlayerStatsLoading) {
          return _buildLoadingState();
        }
        if (state is PlayerStatsError) {
          return _buildErrorState(state.message);
        }
        if (state is TeamStatsLoaded) {
          return _buildStatsTable(state.stats);
        }
        return _buildEmptyState();
      },
    );
  }

  Widget _buildLoadingState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(
            width: 50,
            height: 50,
            child: CircularProgressIndicator(
              strokeWidth: 3,
              valueColor: AlwaysStoppedAnimation<Color>(_SN.neonBlue),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'CARGANDO ESTADÍSTICAS',
            style: GoogleFonts.bebasNeue(
              fontSize: 16,
              color: _SN.textSecondary,
              letterSpacing: 2,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState(String message) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 48, color: _SN.error),
            const SizedBox(height: 16),
            Text(
              message,
              textAlign: TextAlign.center,
              style: GoogleFonts.outfit(fontSize: 14, color: _SN.textSecondary),
            ),
            const SizedBox(height: 24),
            GestureDetector(
              onTap: () {
                if (widget.user.teamId != null) {
                  context.read<PlayerStatsBloc>().add(
                        LoadTeamStatsEvent(teamId: widget.user.teamId!),
                      );
                }
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                decoration: BoxDecoration(
                  gradient: LinearGradient(colors: [_SN.neonBlue, _SN.neonPurple]),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  'REINTENTAR',
                  style: GoogleFonts.bebasNeue(
                    fontSize: 14,
                    color: Colors.white,
                    letterSpacing: 1,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.bar_chart_outlined, size: 48, color: _SN.textMuted),
          const SizedBox(height: 16),
          Text(
            'No hay estadísticas disponibles',
            style: GoogleFonts.outfit(fontSize: 14, color: _SN.textMuted),
          ),
        ],
      ),
    );
  }

  List<PlayerStatsEntity> _sortedStats(List<PlayerStatsEntity> stats) {
    final sorted = List<PlayerStatsEntity>.from(stats);
    sorted.sort((a, b) {
      int result;
      switch (_sortBy) {
        case _SortColumn.name:
          result = a.playerName.compareTo(b.playerName);
          break;
        case _SortColumn.matches:
          result = a.matchesPlayed.compareTo(b.matchesPlayed);
          break;
        case _SortColumn.goals:
          result = a.goals.compareTo(b.goals);
          break;
        case _SortColumn.assists:
          result = a.assists.compareTo(b.assists);
          break;
        case _SortColumn.yellowCards:
          result = a.yellowCards.compareTo(b.yellowCards);
          break;
        case _SortColumn.redCards:
          result = a.redCards.compareTo(b.redCards);
          break;
        case _SortColumn.minutes:
          result = a.minutesPlayed.compareTo(b.minutesPlayed);
          break;
      }
      return _sortAscending ? result : -result;
    });
    return sorted;
  }

  void _onSortTap(_SortColumn column) {
    HapticFeedback.selectionClick();
    setState(() {
      if (_sortBy == column) {
        _sortAscending = !_sortAscending;
      } else {
        _sortBy = column;
        _sortAscending = false;
      }
    });
  }

  Widget _buildStatsTable(List<PlayerStatsEntity> stats) {
    if (stats.isEmpty) {
      return _buildEmptyState();
    }

    final sorted = _sortedStats(stats);

    // Summary card
    final totalGoals = stats.fold<int>(0, (sum, s) => sum + s.goals);
    final totalAssists = stats.fold<int>(0, (sum, s) => sum + s.assists);
    final totalYellow = stats.fold<int>(0, (sum, s) => sum + s.yellowCards);
    final totalRed = stats.fold<int>(0, (sum, s) => sum + s.redCards);

    return RefreshIndicator(
      onRefresh: () async {
        if (widget.user.teamId != null) {
          context.read<PlayerStatsBloc>().add(
                LoadTeamStatsEvent(teamId: widget.user.teamId!),
              );
        }
      },
      color: _SN.neonBlue,
      backgroundColor: _SN.cardDark,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
        children: [
          // Summary card
          _buildSummaryCard(stats.length, totalGoals, totalAssists, totalYellow, totalRed),
          const SizedBox(height: 16),

          // Goals bar chart (top 5 scorers)
          if (totalGoals > 0) ...[
            _buildGoalsChart(stats),
            const SizedBox(height: 16),
          ],

          // Table header
          _buildTableHeader(),
          const SizedBox(height: 4),

          // Table rows
          ...sorted.map((stat) => _buildTableRow(stat)),
        ],
      ),
    );
  }

  Widget _buildGoalsChart(List<PlayerStatsEntity> stats) {
    // Get top 5 scorers
    final scorers = List<PlayerStatsEntity>.from(stats)
      ..sort((a, b) => b.goals.compareTo(a.goals));
    final top5 = scorers.where((s) => s.goals > 0).take(5).toList();

    if (top5.isEmpty) return const SizedBox.shrink();

    final maxGoals = top5.first.goals.toDouble();

    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          padding: const EdgeInsets.fromLTRB(12, 16, 16, 8),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                _SN.neonGreen.withOpacity(0.08),
                _SN.neonGreen.withOpacity(0.02),
              ],
            ),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: _SN.neonGreen.withOpacity(0.15)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(left: 4, bottom: 12),
                child: Row(
                  children: [
                    Icon(Icons.sports_soccer, size: 14, color: _SN.textMuted),
                    const SizedBox(width: 6),
                    Text(
                      'GOLES POR JUGADOR',
                      style: GoogleFonts.bebasNeue(
                        fontSize: 13,
                        color: _SN.textMuted,
                        letterSpacing: 2,
                      ),
                    ),
                  ],
                ),
              ),
              SizedBox(
                height: 180,
                child: BarChart(
                  BarChartData(
                    alignment: BarChartAlignment.spaceAround,
                    maxY: maxGoals + (maxGoals * 0.3).clamp(1, double.infinity),
                    barTouchData: BarTouchData(
                      enabled: true,
                      touchTooltipData: BarTouchTooltipData(
                        tooltipRoundedRadius: 8,
                        getTooltipColor: (_) => _SN.cardDark,
                        getTooltipItem: (group, groupIndex, rod, rodIndex) {
                          final player = top5[group.x];
                          return BarTooltipItem(
                            '${player.playerName}\n${rod.toY.toInt()} goles',
                            GoogleFonts.outfit(color: _SN.neonGreen, fontSize: 12),
                          );
                        },
                      ),
                    ),
                    titlesData: FlTitlesData(
                      show: true,
                      bottomTitles: AxisTitles(
                        sideTitles: SideTitles(
                          showTitles: true,
                          reservedSize: 36,
                          getTitlesWidget: (value, meta) {
                            final index = value.toInt();
                            if (index < 0 || index >= top5.length) {
                              return const SizedBox.shrink();
                            }
                            final name = top5[index].playerName;
                            final shortName = name.length > 8
                                ? '${name.substring(0, 7)}.'
                                : name;
                            return Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: Text(
                                shortName,
                                style: GoogleFonts.outfit(
                                  color: _SN.textMuted,
                                  fontSize: 10,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            );
                          },
                        ),
                      ),
                      leftTitles: AxisTitles(
                        sideTitles: SideTitles(
                          showTitles: true,
                          reservedSize: 24,
                          getTitlesWidget: (value, meta) {
                            if (value == value.roundToDouble() && value >= 0) {
                              return Text(
                                '${value.toInt()}',
                                style: GoogleFonts.outfit(
                                  color: _SN.textMuted,
                                  fontSize: 10,
                                ),
                              );
                            }
                            return const SizedBox.shrink();
                          },
                        ),
                      ),
                      topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    ),
                    gridData: FlGridData(
                      show: true,
                      drawVerticalLine: false,
                      horizontalInterval: 1,
                      getDrawingHorizontalLine: (value) => FlLine(
                        color: Colors.white.withOpacity(0.05),
                        strokeWidth: 1,
                      ),
                    ),
                    borderData: FlBorderData(show: false),
                    barGroups: top5.asMap().entries.map((entry) {
                      return BarChartGroupData(
                        x: entry.key,
                        barRods: [
                          BarChartRodData(
                            toY: entry.value.goals.toDouble(),
                            width: 22,
                            borderRadius: const BorderRadius.vertical(top: Radius.circular(6)),
                            gradient: LinearGradient(
                              begin: Alignment.bottomCenter,
                              end: Alignment.topCenter,
                              colors: [
                                _SN.neonGreen.withOpacity(0.5),
                                _SN.neonGreen,
                              ],
                            ),
                          ),
                        ],
                      );
                    }).toList(),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSummaryCard(
    int players,
    int goals,
    int assists,
    int yellowCards,
    int redCards,
  ) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                _SN.neonBlue.withOpacity(0.1),
                _SN.neonPurple.withOpacity(0.05),
              ],
            ),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: _SN.neonBlue.withOpacity(0.15)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildSummaryStat(Icons.people, '$players', 'Jug.', _SN.neonBlue),
              _buildSummaryStat(Icons.sports_soccer, '$goals', 'Goles', _SN.neonGreen),
              _buildSummaryStat(Icons.handshake, '$assists', 'Asist.', _SN.neonPurple),
              _buildSummaryStat(Icons.style, '$yellowCards', 'TA', _SN.amber),
              _buildSummaryStat(Icons.style, '$redCards', 'TR', _SN.error),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSummaryStat(IconData icon, String value, String label, Color color) {
    return Column(
      children: [
        Icon(icon, color: color, size: 20),
        const SizedBox(height: 6),
        Text(
          value,
          style: GoogleFonts.bebasNeue(fontSize: 22, color: _SN.textPrimary),
        ),
        Text(
          label,
          style: GoogleFonts.outfit(fontSize: 10, color: _SN.textMuted),
        ),
      ],
    );
  }

  Widget _buildTableHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: _SN.cardDark,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.white.withOpacity(0.06)),
      ),
      child: Row(
        children: [
          _buildHeaderCell('JUGADOR', _SortColumn.name, flex: 3),
          _buildHeaderCell('PJ', _SortColumn.matches),
          _buildHeaderCell('G', _SortColumn.goals),
          _buildHeaderCell('A', _SortColumn.assists),
          _buildHeaderCell('TA', _SortColumn.yellowCards),
          _buildHeaderCell('TR', _SortColumn.redCards),
          _buildHeaderCell('Min', _SortColumn.minutes),
        ],
      ),
    );
  }

  Widget _buildHeaderCell(String label, _SortColumn column, {int flex = 1}) {
    final isActive = _sortBy == column;
    return Expanded(
      flex: flex,
      child: GestureDetector(
        onTap: () => _onSortTap(column),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: GoogleFonts.bebasNeue(
                fontSize: 12,
                color: isActive ? _SN.neonBlue : _SN.textMuted,
                letterSpacing: 0.5,
              ),
            ),
            if (isActive)
              Icon(
                _sortAscending ? Icons.arrow_upward : Icons.arrow_downward,
                size: 10,
                color: _SN.neonBlue,
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildTableRow(PlayerStatsEntity stat) {
    return Container(
      margin: const EdgeInsets.only(bottom: 2),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          // Player name (flex: 3)
          Expanded(
            flex: 3,
            child: Row(
              children: [
                // Small avatar
                Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: _SN.neonPurple.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(7),
                  ),
                  child: stat.hasPhoto
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(7),
                          child: Image.network(
                            stat.photo!,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Center(
                              child: Text(
                                stat.initials,
                                style: GoogleFonts.bebasNeue(
                                  fontSize: 11,
                                  color: _SN.neonPurple,
                                ),
                              ),
                            ),
                          ),
                        )
                      : Center(
                          child: Text(
                            stat.initials,
                            style: GoogleFonts.bebasNeue(
                              fontSize: 11,
                              color: _SN.neonPurple,
                            ),
                          ),
                        ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        stat.playerName,
                        style: GoogleFonts.outfit(
                          fontSize: 13,
                          color: _SN.textPrimary,
                          fontWeight: FontWeight.w500,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (stat.position != null)
                        Text(
                          stat.positionDisplay,
                          style: GoogleFonts.outfit(fontSize: 10, color: _SN.textMuted),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          // Stats cells
          _buildStatCell('${stat.matchesPlayed}'),
          _buildStatCell('${stat.goals}', highlight: stat.goals > 0, color: _SN.neonGreen),
          _buildStatCell('${stat.assists}', highlight: stat.assists > 0, color: _SN.neonPurple),
          _buildStatCell('${stat.yellowCards}', highlight: stat.yellowCards > 0, color: _SN.amber),
          _buildStatCell('${stat.redCards}', highlight: stat.redCards > 0, color: _SN.error),
          _buildStatCell('${stat.minutesPlayed}'),
        ],
      ),
    );
  }

  Widget _buildStatCell(String value, {bool highlight = false, Color? color}) {
    return Expanded(
      child: Text(
        value,
        style: GoogleFonts.outfit(
          fontSize: 13,
          color: highlight ? (color ?? _SN.textPrimary) : _SN.textSecondary,
          fontWeight: highlight ? FontWeight.w600 : FontWeight.w400,
        ),
        textAlign: TextAlign.center,
      ),
    );
  }
}
