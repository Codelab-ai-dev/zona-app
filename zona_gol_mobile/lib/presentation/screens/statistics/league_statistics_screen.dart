import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import '../../../core/di/injection.dart';
import '../../../domain/entities/league_stats_entity.dart';
import '../../../domain/entities/user_entity.dart';
import '../../bloc/league_stats/league_stats_bloc.dart';
import '../../bloc/league_stats/league_stats_event.dart';
import '../../bloc/league_stats/league_stats_state.dart';

/// Stadium Nights Design System
class _SN {
  static const Color backgroundDark = Color(0xFF050508);
  static const Color cardDark = Color(0xFF12121A);

  static const Color gold = Color(0xFFFFD700);
  static const Color neonGreen = Color(0xFF00FF7F);
  static const Color neonBlue = Color(0xFF00BFFF);
  static const Color neonPurple = Color(0xFF8B5CF6);
  static const Color amber = Color(0xFFF59E0B);
  static const Color error = Color(0xFFEF4444);

  static const Color textPrimary = Color(0xFFFAFAFA);
  static const Color textSecondary = Color(0xFF9CA3AF);
  static const Color textMuted = Color(0xFF6B7280);
}

/// League Statistics Screen
/// Shows statistics for a specific league (for league_admin)
class LeagueStatisticsScreen extends StatelessWidget {
  final UserEntity user;

  const LeagueStatisticsScreen({super.key, required this.user});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) {
        final bloc = sl<LeagueStatsBloc>();
        if (user.leagueId != null) {
          bloc.add(LoadLeagueStatsEvent(leagueId: user.leagueId!));
        }
        return bloc;
      },
      child: _LeagueStatisticsView(user: user),
    );
  }
}

class _LeagueStatisticsView extends StatelessWidget {
  final UserEntity user;

  const _LeagueStatisticsView({required this.user});

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
              Expanded(
                child: user.leagueId == null
                    ? _buildErrorWidget('No tienes una liga asignada')
                    : BlocBuilder<LeagueStatsBloc, LeagueStatsState>(
                        builder: (context, state) {
                          if (state is LeagueStatsLoading ||
                              state is LeagueStatsInitial) {
                            return _buildLoadingState();
                          } else if (state is LeagueStatsError) {
                            return _buildErrorState(context, state.message);
                          } else if (state is LeagueStatsLoaded) {
                            return _buildContent(context, state.stats);
                          }
                          return const SizedBox.shrink();
                        },
                      ),
              ),
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
                border: Border.all(color: _SN.neonGreen.withOpacity(0.2)),
              ),
              child: Icon(Icons.arrow_back, color: _SN.neonGreen, size: 20),
            ),
          ),
          const SizedBox(width: 16),
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [_SN.neonGreen, _SN.neonBlue],
              ),
              borderRadius: BorderRadius.circular(14),
              boxShadow: [
                BoxShadow(
                  color: _SN.neonGreen.withOpacity(0.3),
                  blurRadius: 16,
                  spreadRadius: 1,
                ),
              ],
            ),
            child: const Icon(Icons.analytics, color: Colors.white, size: 26),
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
                  'Resumen de tu liga',
                  style: GoogleFonts.outfit(
                    fontSize: 12,
                    color: _SN.neonGreen,
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
          ),
          GestureDetector(
            onTap: () {
              HapticFeedback.mediumImpact();
              if (user.leagueId != null) {
                context.read<LeagueStatsBloc>().add(
                      LoadLeagueStatsEvent(leagueId: user.leagueId!),
                    );
              }
            },
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: _SN.cardDark,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.white.withOpacity(0.1)),
              ),
              child: Icon(Icons.refresh, color: _SN.textMuted, size: 20),
            ),
          ),
        ],
      ),
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
              valueColor: AlwaysStoppedAnimation<Color>(_SN.neonGreen),
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

  Widget _buildErrorWidget(String message) {
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
          ],
        ),
      ),
    );
  }

  Widget _buildErrorState(BuildContext context, String message) {
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
                if (user.leagueId != null) {
                  context.read<LeagueStatsBloc>().add(
                        LoadLeagueStatsEvent(leagueId: user.leagueId!),
                      );
                }
              },
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                decoration: BoxDecoration(
                  gradient:
                      LinearGradient(colors: [_SN.neonGreen, _SN.neonBlue]),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  'REINTENTAR',
                  style: GoogleFonts.bebasNeue(
                      fontSize: 14, color: Colors.white, letterSpacing: 1),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContent(BuildContext context, LeagueStatsEntity stats) {
    return RefreshIndicator(
      onRefresh: () async {
        if (user.leagueId != null) {
          context.read<LeagueStatsBloc>().add(
                LoadLeagueStatsEvent(leagueId: user.leagueId!),
              );
        }
      },
      color: _SN.neonGreen,
      backgroundColor: _SN.cardDark,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 100),
        children: [
          // Main stats grid (2x2)
          _buildMainStatsGrid(stats),
          const SizedBox(height: 16),

          // Goals & Cards row
          _buildGoalsAndCardsRow(stats),
          const SizedBox(height: 24),

          // Top scorer highlight
          if (stats.topScorer != null) ...[
            _buildTopScorerCard(stats.topScorer!),
            const SizedBox(height: 24),
          ],

          // Monthly overview
          _buildSectionHeader('ACTIVIDAD DEL MES', Icons.calendar_today),
          const SizedBox(height: 12),
          _buildMonthlyOverview(stats),
          const SizedBox(height: 24),

          // Bar chart: matches per month
          if (stats.monthlyMatches.any((m) => m.count > 0)) ...[
            _buildSectionHeader('PARTIDOS POR MES', Icons.bar_chart),
            const SizedBox(height: 12),
            _buildMatchesBarChart(stats.monthlyMatches),
            const SizedBox(height: 24),
          ],

          // Pie chart: result distribution
          if (stats.resultDistribution.homeWins > 0 ||
              stats.resultDistribution.draws > 0 ||
              stats.resultDistribution.awayWins > 0) ...[
            _buildSectionHeader(
                'DISTRIBUCIÓN DE RESULTADOS', Icons.pie_chart),
            const SizedBox(height: 12),
            _buildResultsPieChart(stats.resultDistribution),
            const SizedBox(height: 24),
          ],

          // Upcoming matches
          if (stats.upcomingMatches.isNotEmpty) ...[
            _buildSectionHeader('PRÓXIMOS PARTIDOS', Icons.schedule),
            const SizedBox(height: 12),
            _buildUpcomingMatches(stats.upcomingMatches),
          ],
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 16, color: _SN.textMuted),
        const SizedBox(width: 8),
        Text(
          title,
          style: GoogleFonts.bebasNeue(
            fontSize: 14,
            color: _SN.textMuted,
            letterSpacing: 2,
          ),
        ),
      ],
    );
  }

  Widget _buildMainStatsGrid(LeagueStatsEntity stats) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _buildStatCard(
                icon: Icons.groups,
                value: '${stats.teamsCount}',
                label: 'Equipos',
                sublabel: 'En la liga',
                color: _SN.neonBlue,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildStatCard(
                icon: Icons.person,
                value: '${stats.playersCount}',
                label: 'Jugadores',
                sublabel: 'Activos',
                color: _SN.neonGreen,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildStatCard(
                icon: Icons.sports_soccer,
                value: '${stats.matchesPlayed}',
                label: 'Jugados',
                sublabel: 'Partidos',
                color: _SN.gold,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildStatCard(
                icon: Icons.schedule,
                value: '${stats.matchesPending}',
                label: 'Pendientes',
                sublabel: 'Partidos',
                color: _SN.neonPurple,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildGoalsAndCardsRow(LeagueStatsEntity stats) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Colors.white.withOpacity(0.08),
                Colors.white.withOpacity(0.03),
              ],
            ),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: Colors.white.withOpacity(0.08)),
          ),
          child: Row(
            children: [
              Expanded(
                child: _buildMiniStat(
                  icon: Icons.sports_score,
                  value: '${stats.totalGoals}',
                  label: 'Goles',
                  color: _SN.neonGreen,
                ),
              ),
              Container(
                  width: 1,
                  height: 50,
                  color: Colors.white.withOpacity(0.1)),
              Expanded(
                child: _buildMiniStat(
                  icon: Icons.speed,
                  value: stats.avgGoalsPerMatch.toStringAsFixed(1),
                  label: 'Goles/Partido',
                  color: _SN.neonBlue,
                ),
              ),
              Container(
                  width: 1,
                  height: 50,
                  color: Colors.white.withOpacity(0.1)),
              Expanded(
                child: _buildMiniStat(
                  icon: Icons.style,
                  value:
                      '${stats.totalYellowCards + stats.totalRedCards}',
                  label: 'Tarjetas',
                  color: _SN.amber,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTopScorerCard(TopScorerInfo topScorer) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                _SN.gold.withOpacity(0.15),
                _SN.gold.withOpacity(0.05),
              ],
            ),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: _SN.gold.withOpacity(0.3)),
          ),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: _SN.gold.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(Icons.emoji_events, color: _SN.gold, size: 26),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'GOLEADOR',
                      style: GoogleFonts.bebasNeue(
                        fontSize: 12,
                        color: _SN.gold,
                        letterSpacing: 2,
                      ),
                    ),
                    Text(
                      topScorer.playerName,
                      style: GoogleFonts.outfit(
                        fontSize: 16,
                        color: _SN.textPrimary,
                        fontWeight: FontWeight.w600,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      topScorer.teamName,
                      style: GoogleFonts.outfit(
                          fontSize: 12, color: _SN.textMuted),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              Text(
                '${topScorer.goals}',
                style: GoogleFonts.bebasNeue(
                  fontSize: 36,
                  color: _SN.gold,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(width: 4),
              Text(
                'GOLES',
                style: GoogleFonts.bebasNeue(
                  fontSize: 11,
                  color: _SN.gold.withOpacity(0.7),
                  letterSpacing: 1,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatCard({
    required IconData icon,
    required String value,
    required String label,
    required String sublabel,
    required Color color,
  }) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                color.withOpacity(0.15),
                color.withOpacity(0.05),
              ],
            ),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: color.withOpacity(0.2)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: color.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(icon, color: color, size: 22),
                  ),
                  Text(
                    value,
                    style: GoogleFonts.bebasNeue(
                      fontSize: 32,
                      color: color,
                      letterSpacing: 1,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                label,
                style: GoogleFonts.outfit(
                  fontSize: 15,
                  color: _SN.textPrimary,
                  fontWeight: FontWeight.w600,
                ),
              ),
              Text(
                sublabel,
                style: GoogleFonts.outfit(fontSize: 12, color: _SN.textMuted),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMonthlyOverview(LeagueStatsEntity stats) {
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
                Colors.white.withOpacity(0.08),
                Colors.white.withOpacity(0.03),
              ],
            ),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: Colors.white.withOpacity(0.08)),
          ),
          child: Row(
            children: [
              Expanded(
                child: _buildMiniStat(
                  icon: Icons.sports_soccer,
                  value: '${stats.matchesThisMonth}',
                  label: 'Partidos',
                  color: _SN.neonBlue,
                ),
              ),
              Container(
                  width: 1,
                  height: 50,
                  color: Colors.white.withOpacity(0.1)),
              Expanded(
                child: _buildMiniStat(
                  icon: Icons.sports_score,
                  value: '${stats.goalsThisMonth}',
                  label: 'Goles',
                  color: _SN.neonGreen,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMiniStat({
    required IconData icon,
    required String value,
    required String label,
    required Color color,
  }) {
    return Column(
      children: [
        Icon(icon, color: color, size: 24),
        const SizedBox(height: 8),
        Text(
          value,
          style: GoogleFonts.bebasNeue(
            fontSize: 28,
            color: _SN.textPrimary,
            letterSpacing: 1,
          ),
        ),
        Text(
          label,
          style: GoogleFonts.outfit(fontSize: 11, color: _SN.textMuted),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  Widget _buildMatchesBarChart(List<MonthlyMatchData> monthlyMatches) {
    final maxVal = monthlyMatches.fold<int>(
        0, (max, m) => m.count > max ? m.count : max);

    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          height: 220,
          padding: const EdgeInsets.fromLTRB(16, 24, 24, 12),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Colors.white.withOpacity(0.08),
                Colors.white.withOpacity(0.03),
              ],
            ),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: Colors.white.withOpacity(0.08)),
          ),
          child: BarChart(
            BarChartData(
              alignment: BarChartAlignment.spaceAround,
              maxY: (maxVal + 2).toDouble(),
              barTouchData: BarTouchData(
                enabled: true,
                touchTooltipData: BarTouchTooltipData(
                  tooltipRoundedRadius: 8,
                  getTooltipColor: (_) => _SN.cardDark,
                  getTooltipItem: (group, groupIndex, rod, rodIndex) {
                    return BarTooltipItem(
                      '${rod.toY.toInt()} partidos',
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
                    getTitlesWidget: (value, meta) {
                      final index = value.toInt();
                      if (index < 0 || index >= monthlyMatches.length) {
                        return const SizedBox.shrink();
                      }
                      return Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text(
                          monthlyMatches[index].month,
                          style: GoogleFonts.outfit(
                              color: _SN.textMuted, fontSize: 11),
                        ),
                      );
                    },
                  ),
                ),
                leftTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    reservedSize: 28,
                    getTitlesWidget: (value, meta) {
                      if (value == value.roundToDouble() && value >= 0) {
                        return Text(
                          '${value.toInt()}',
                          style: GoogleFonts.outfit(
                              color: _SN.textMuted, fontSize: 10),
                        );
                      }
                      return const SizedBox.shrink();
                    },
                  ),
                ),
                topTitles: const AxisTitles(
                    sideTitles: SideTitles(showTitles: false)),
                rightTitles: const AxisTitles(
                    sideTitles: SideTitles(showTitles: false)),
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
              barGroups: monthlyMatches.asMap().entries.map((entry) {
                return BarChartGroupData(
                  x: entry.key,
                  barRods: [
                    BarChartRodData(
                      toY: entry.value.count.toDouble(),
                      width: 20,
                      borderRadius: const BorderRadius.vertical(
                          top: Radius.circular(6)),
                      gradient: LinearGradient(
                        begin: Alignment.bottomCenter,
                        end: Alignment.topCenter,
                        colors: [
                          _SN.neonGreen.withOpacity(0.6),
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
      ),
    );
  }

  Widget _buildResultsPieChart(ResultDistribution dist) {
    final sections = <_MatchResultData>[
      if (dist.homeWins > 0)
        _MatchResultData('Local', dist.homeWins, _SN.neonGreen),
      if (dist.draws > 0)
        _MatchResultData('Empate', dist.draws, _SN.amber),
      if (dist.awayWins > 0)
        _MatchResultData('Visitante', dist.awayWins, _SN.neonBlue),
    ];
    final total = sections.fold<int>(0, (sum, d) => sum + d.count);

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
                Colors.white.withOpacity(0.08),
                Colors.white.withOpacity(0.03),
              ],
            ),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: Colors.white.withOpacity(0.08)),
          ),
          child: Column(
            children: [
              SizedBox(
                height: 180,
                child: PieChart(
                  PieChartData(
                    sectionsSpace: 3,
                    centerSpaceRadius: 40,
                    sections: sections.map((data) {
                      final percentage =
                          total > 0 ? (data.count / total * 100) : 0.0;
                      return PieChartSectionData(
                        value: data.count.toDouble(),
                        color: data.color,
                        radius: 50,
                        title: '${percentage.toStringAsFixed(0)}%',
                        titleStyle: GoogleFonts.bebasNeue(
                          fontSize: 14,
                          color: Colors.white,
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: sections.map((data) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: Row(
                      children: [
                        Container(
                          width: 10,
                          height: 10,
                          decoration: BoxDecoration(
                            color: data.color,
                            borderRadius: BorderRadius.circular(3),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          '${data.label} (${data.count})',
                          style: GoogleFonts.outfit(
                            fontSize: 12,
                            color: _SN.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildUpcomingMatches(List<UpcomingMatchInfo> matches) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Colors.white.withOpacity(0.08),
                Colors.white.withOpacity(0.03),
              ],
            ),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: Colors.white.withOpacity(0.08)),
          ),
          child: Column(
            children: matches.asMap().entries.map((entry) {
              final index = entry.key;
              final match = entry.value;
              return Column(
                children: [
                  _buildUpcomingMatchTile(match),
                  if (index < matches.length - 1)
                    Container(
                      height: 1,
                      margin: const EdgeInsets.symmetric(horizontal: 16),
                      color: Colors.white.withOpacity(0.05),
                    ),
                ],
              );
            }).toList(),
          ),
        ),
      ),
    );
  }

  Widget _buildUpcomingMatchTile(UpcomingMatchInfo match) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${match.homeName} vs ${match.awayName}',
                  style: GoogleFonts.outfit(
                    fontSize: 14,
                    color: _SN.textPrimary,
                    fontWeight: FontWeight.w500,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  DateFormat('dd/MM/yyyy').format(match.matchDate),
                  style:
                      GoogleFonts.outfit(fontSize: 12, color: _SN.textMuted),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: _SN.neonBlue.withOpacity(0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              'Programado',
              style: GoogleFonts.outfit(
                fontSize: 11,
                color: _SN.neonBlue,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MatchResultData {
  final String label;
  final int count;
  final Color color;
  _MatchResultData(this.label, this.count, this.color);
}
