import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/di/injection.dart';
import '../../../domain/entities/player_entity.dart';
import '../../../domain/entities/player_stats_entity.dart';
import '../../../domain/entities/team_entity.dart';
import '../../../domain/entities/tournament_entity.dart';
import '../../../domain/entities/user_entity.dart';
import '../../bloc/player/player_bloc.dart';
import '../../bloc/player/player_event.dart';
import '../../bloc/player/player_state.dart';
import '../../bloc/player_stats/player_stats_bloc.dart';
import '../../bloc/player_stats/player_stats_event.dart';
import '../../bloc/player_stats/player_stats_state.dart';
import '../../bloc/team/team_bloc.dart';
import '../../bloc/team/team_event.dart';
import '../../bloc/team/team_state.dart';
import '../../bloc/tournament/tournament_bloc.dart';
import '../../bloc/tournament/tournament_event.dart';
import '../../bloc/tournament/tournament_state.dart';

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

/// Top Scorers & Discipline Screen
/// Shows league-wide statistics with tabbed view
class TopScorersScreen extends StatelessWidget {
  final UserEntity user;

  const TopScorersScreen({super.key, required this.user});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) {
        final bloc = sl<PlayerStatsBloc>();
        if (user.leagueId != null) {
          bloc.add(LoadTopScorersEvent(leagueId: user.leagueId!));
        }
        return bloc;
      },
      child: _TopScorersView(user: user),
    );
  }
}

class _TopScorersView extends StatefulWidget {
  final UserEntity user;

  const _TopScorersView({required this.user});

  @override
  State<_TopScorersView> createState() => _TopScorersViewState();
}

class _TopScorersViewState extends State<_TopScorersView>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  bool get _isAdmin =>
      widget.user.isSuperAdmin || widget.user.isLeagueAdmin;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(_onTabChanged);
  }

  @override
  void dispose() {
    _tabController.removeListener(_onTabChanged);
    _tabController.dispose();
    super.dispose();
  }

  void _onTabChanged() {
    if (!_tabController.indexIsChanging) return;
    final leagueId = widget.user.leagueId;
    if (leagueId == null) return;

    if (_tabController.index == 0) {
      context.read<PlayerStatsBloc>().add(
            LoadTopScorersEvent(leagueId: leagueId),
          );
    } else {
      context.read<PlayerStatsBloc>().add(
            LoadDisciplineEvent(leagueId: leagueId),
          );
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light.copyWith(
        statusBarColor: Colors.transparent,
        systemNavigationBarColor: _SN.backgroundDark,
      ),
      child: BlocListener<PlayerStatsBloc, PlayerStatsState>(
        listener: (context, state) {
          if (state is ExtemporaneousGoalsSaved) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Goles guardados correctamente',
                    style: GoogleFonts.outfit(color: Colors.white)),
                backgroundColor: _SN.neonGreen.withOpacity(0.9),
                behavior: SnackBarBehavior.floating,
              ),
            );
          } else if (state is ExtemporaneousGoalsDeleted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Goles extemporaneos eliminados',
                    style: GoogleFonts.outfit(color: Colors.white)),
                backgroundColor: _SN.amber.withOpacity(0.9),
                behavior: SnackBarBehavior.floating,
              ),
            );
          } else if (state is PlayerStatsError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message,
                    style: GoogleFonts.outfit(color: Colors.white)),
                backgroundColor: _SN.error.withOpacity(0.9),
                behavior: SnackBarBehavior.floating,
              ),
            );
          }
        },
        child: Scaffold(
          backgroundColor: _SN.backgroundDark,
          floatingActionButton: _isAdmin && _tabController.index == 0
              ? _buildFAB()
              : null,
          body: SafeArea(
            child: Column(
              children: [
                _buildHeader(context),
                _buildTabBar(),
                Expanded(child: _buildContent()),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFAB() {
    return FloatingActionButton.extended(
      onPressed: () => _showAddGoalsSheet(context),
      backgroundColor: _SN.neonGreen,
      icon: const Icon(Icons.add, color: _SN.backgroundDark),
      label: Text(
        'AGREGAR GOLES',
        style: GoogleFonts.bebasNeue(
          fontSize: 14,
          color: _SN.backgroundDark,
          letterSpacing: 1,
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
            child: const Icon(Icons.leaderboard, color: Colors.white, size: 26),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'ESTADISTICAS',
                  style: GoogleFonts.bebasNeue(
                    fontSize: 28,
                    color: _SN.textPrimary,
                    letterSpacing: 3,
                    height: 1,
                  ),
                ),
                Text(
                  'Goleadores y disciplina',
                  style: GoogleFonts.outfit(
                    fontSize: 12,
                    color: _SN.neonGreen,
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

  Widget _buildTabBar() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      decoration: BoxDecoration(
        color: _SN.cardDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withOpacity(0.06)),
      ),
      child: TabBar(
        controller: _tabController,
        indicator: BoxDecoration(
          borderRadius: BorderRadius.circular(10),
          gradient: LinearGradient(
            colors: [_SN.neonGreen.withOpacity(0.2), _SN.neonBlue.withOpacity(0.2)],
          ),
          border: Border.all(color: _SN.neonGreen.withOpacity(0.3)),
        ),
        indicatorSize: TabBarIndicatorSize.tab,
        dividerColor: Colors.transparent,
        labelColor: _SN.neonGreen,
        unselectedLabelColor: _SN.textMuted,
        labelStyle: GoogleFonts.bebasNeue(fontSize: 16, letterSpacing: 1.5),
        unselectedLabelStyle: GoogleFonts.bebasNeue(fontSize: 16, letterSpacing: 1.5),
        padding: const EdgeInsets.all(4),
        onTap: (_) {
          // Trigger FAB rebuild when tab changes
          setState(() {});
        },
        tabs: const [
          Tab(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.sports_soccer, size: 18),
                SizedBox(width: 8),
                Text('GOLEADORES'),
              ],
            ),
          ),
          Tab(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.style, size: 18),
                SizedBox(width: 8),
                Text('DISCIPLINA'),
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
        if (state is TopScorersLoaded) {
          return _buildScorersList(state.scorers);
        }
        if (state is DisciplineLoaded) {
          return _buildDisciplineList(state.players, state.suspensions);
        }
        return _buildEmptyState('Selecciona una pestana');
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
              valueColor: AlwaysStoppedAnimation<Color>(_SN.neonGreen),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'CARGANDO',
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
                final leagueId = widget.user.leagueId;
                if (leagueId == null) return;
                if (_tabController.index == 0) {
                  context.read<PlayerStatsBloc>().add(
                        LoadTopScorersEvent(leagueId: leagueId),
                      );
                } else {
                  context.read<PlayerStatsBloc>().add(
                        LoadDisciplineEvent(leagueId: leagueId),
                      );
                }
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                decoration: BoxDecoration(
                  gradient: LinearGradient(colors: [_SN.neonGreen, _SN.neonBlue]),
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

  Widget _buildEmptyState(String message) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.sports_soccer, size: 48, color: _SN.textMuted),
          const SizedBox(height: 16),
          Text(
            message,
            style: GoogleFonts.outfit(fontSize: 14, color: _SN.textMuted),
          ),
        ],
      ),
    );
  }

  Widget _buildScorersList(List<PlayerStatsEntity> scorers) {
    if (scorers.isEmpty) {
      return _buildEmptyState('No hay goleadores registrados');
    }

    return RefreshIndicator(
      onRefresh: () async {
        final leagueId = widget.user.leagueId;
        if (leagueId == null) return;
        context.read<PlayerStatsBloc>().add(
              LoadTopScorersEvent(leagueId: leagueId),
            );
      },
      color: _SN.neonGreen,
      backgroundColor: _SN.cardDark,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 100),
        itemCount: scorers.length,
        itemBuilder: (context, index) {
          return _buildScorerCard(scorers[index], index + 1);
        },
      ),
    );
  }

  Widget _buildScorerCard(PlayerStatsEntity stat, int position) {
    final isTop3 = position <= 3;
    Color posColor;
    IconData? medal;

    switch (position) {
      case 1:
        posColor = _SN.gold;
        medal = Icons.workspace_premium;
        break;
      case 2:
        posColor = const Color(0xFFC0C0C0);
        medal = Icons.workspace_premium;
        break;
      case 3:
        posColor = const Color(0xFFCD7F32);
        medal = Icons.workspace_premium;
        break;
      default:
        posColor = _SN.textMuted;
        medal = null;
    }

    return GestureDetector(
      onTap: _isAdmin ? () => _showEditGoalsSheet(context, stat) : null,
      child: Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: isTop3
                      ? [posColor.withOpacity(0.12), posColor.withOpacity(0.04)]
                      : [Colors.white.withOpacity(0.06), Colors.white.withOpacity(0.02)],
                ),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isTop3 ? posColor.withOpacity(0.25) : Colors.white.withOpacity(0.06),
                ),
              ),
              child: Row(
                children: [
                  // Position badge
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: posColor.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Center(
                      child: medal != null
                          ? Icon(medal, color: posColor, size: 20)
                          : Text(
                              '$position',
                              style: GoogleFonts.bebasNeue(fontSize: 18, color: posColor),
                            ),
                    ),
                  ),
                  const SizedBox(width: 14),

                  // Player avatar
                  _buildPlayerAvatar(stat),
                  const SizedBox(width: 14),

                  // Player info
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          stat.playerName,
                          style: GoogleFonts.outfit(
                            fontSize: 15,
                            color: _SN.textPrimary,
                            fontWeight: FontWeight.w600,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            if (stat.teamName != null) ...[
                              Icon(Icons.shield, size: 12, color: _SN.textMuted),
                              const SizedBox(width: 4),
                              Flexible(
                                child: Text(
                                  stat.teamName!,
                                  style: GoogleFonts.outfit(
                                    fontSize: 12,
                                    color: _SN.textMuted,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                            if (stat.jerseyNumber != null) ...[
                              const SizedBox(width: 8),
                              Text(
                                '#${stat.jerseyNumber}',
                                style: GoogleFonts.outfit(
                                  fontSize: 12,
                                  color: _SN.textSecondary,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),

                  // Stats columns
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // PJ (matches played)
                      Column(
                        children: [
                          Text(
                            'PJ',
                            style: GoogleFonts.outfit(fontSize: 9, color: _SN.textMuted, fontWeight: FontWeight.w500),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${stat.matchesPlayed}',
                            style: GoogleFonts.bebasNeue(fontSize: 16, color: _SN.textSecondary),
                          ),
                        ],
                      ),
                      const SizedBox(width: 12),
                      // Goals
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: _SN.neonGreen.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Column(
                          children: [
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.sports_soccer, size: 14, color: _SN.neonGreen),
                                const SizedBox(width: 4),
                                Text(
                                  '${stat.goals}',
                                  style: GoogleFonts.bebasNeue(fontSize: 18, color: _SN.neonGreen),
                                ),
                              ],
                            ),
                            if (stat.assists > 0)
                              Text(
                                '${stat.assists} asist.',
                                style: GoogleFonts.outfit(fontSize: 9, color: _SN.textMuted),
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 10),
                      // Gol/P (goals per match)
                      Column(
                        children: [
                          Text(
                            'G/P',
                            style: GoogleFonts.outfit(fontSize: 9, color: _SN.textMuted, fontWeight: FontWeight.w500),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            stat.goalsPerMatch.toStringAsFixed(1),
                            style: GoogleFonts.bebasNeue(fontSize: 16, color: _SN.neonBlue),
                          ),
                        ],
                      ),
                    ],
                  ),

                  // Edit icon for admins
                  if (_isAdmin) ...[
                    const SizedBox(width: 8),
                    Icon(Icons.edit_outlined, size: 16, color: _SN.textMuted),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDisciplineList(
    List<PlayerStatsEntity> players,
    Map<String, SuspensionInfo> suspensions,
  ) {
    if (players.isEmpty) {
      return _buildEmptyState('No hay tarjetas registradas');
    }

    return RefreshIndicator(
      onRefresh: () async {
        final leagueId = widget.user.leagueId;
        if (leagueId == null) return;
        context.read<PlayerStatsBloc>().add(
              LoadDisciplineEvent(leagueId: leagueId),
            );
      },
      color: _SN.amber,
      backgroundColor: _SN.cardDark,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 100),
        itemCount: players.length,
        itemBuilder: (context, index) {
          final player = players[index];
          final suspension = suspensions[player.playerId];
          return _buildDisciplineCard(player, index + 1, suspension);
        },
      ),
    );
  }

  Widget _buildDisciplineCard(PlayerStatsEntity stat, int position, SuspensionInfo? suspension) {
    final hasRed = stat.redCards > 0;
    final isSuspended = suspension != null && suspension.isActive;

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: isSuspended
                    ? [_SN.error.withOpacity(0.12), _SN.error.withOpacity(0.04)]
                    : hasRed
                        ? [_SN.error.withOpacity(0.08), _SN.error.withOpacity(0.02)]
                        : [Colors.white.withOpacity(0.06), Colors.white.withOpacity(0.02)],
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isSuspended
                    ? _SN.error.withOpacity(0.35)
                    : hasRed
                        ? _SN.error.withOpacity(0.2)
                        : Colors.white.withOpacity(0.06),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    // Position
                    SizedBox(
                      width: 30,
                      child: Text(
                        '$position',
                        style: GoogleFonts.bebasNeue(
                          fontSize: 18,
                          color: _SN.textMuted,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                    const SizedBox(width: 12),

                    // Player avatar
                    _buildPlayerAvatar(stat),
                    const SizedBox(width: 14),

                    // Player info
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            stat.playerName,
                            style: GoogleFonts.outfit(
                              fontSize: 15,
                              color: _SN.textPrimary,
                              fontWeight: FontWeight.w600,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Row(
                            children: [
                              if (stat.teamName != null) ...[
                                Icon(Icons.shield, size: 12, color: _SN.textMuted),
                                const SizedBox(width: 4),
                                Flexible(
                                  child: Text(
                                    stat.teamName!,
                                    style: GoogleFonts.outfit(fontSize: 12, color: _SN.textMuted),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                              if (stat.jerseyNumber != null) ...[
                                const SizedBox(width: 8),
                                Text(
                                  '#${stat.jerseyNumber}',
                                  style: GoogleFonts.outfit(fontSize: 12, color: _SN.textSecondary),
                                ),
                              ],
                            ],
                          ),
                        ],
                      ),
                    ),

                    // Total cards badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: (hasRed ? _SN.error : _SN.amber).withOpacity(0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Column(
                        children: [
                          Text(
                            '${stat.totalCards}',
                            style: GoogleFonts.bebasNeue(
                              fontSize: 20,
                              color: hasRed ? _SN.error : _SN.amber,
                            ),
                          ),
                          Text(
                            'Total',
                            style: GoogleFonts.outfit(fontSize: 9, color: _SN.textMuted),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),

                    // Cards breakdown
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Yellow cards
                        if (stat.yellowCards > 0) ...[
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: _SN.amber.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 12,
                                  height: 16,
                                  decoration: BoxDecoration(
                                    color: _SN.amber,
                                    borderRadius: BorderRadius.circular(2),
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  '${stat.yellowCards}',
                                  style: GoogleFonts.bebasNeue(fontSize: 16, color: _SN.amber),
                                ),
                              ],
                            ),
                          ),
                        ],
                        // Red cards
                        if (stat.redCards > 0) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: _SN.error.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 12,
                                  height: 16,
                                  decoration: BoxDecoration(
                                    color: _SN.error,
                                    borderRadius: BorderRadius.circular(2),
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  '${stat.redCards}',
                                  style: GoogleFonts.bebasNeue(fontSize: 16, color: _SN.error),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
                // Suspension badge
                if (isSuspended) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: _SN.error.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: _SN.error.withOpacity(0.4)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.block, size: 14, color: _SN.error),
                        const SizedBox(width: 6),
                        Text(
                          'SUSPENDIDO',
                          style: GoogleFonts.bebasNeue(
                            fontSize: 12,
                            color: _SN.error,
                            letterSpacing: 1,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          '${suspension.matchesRemaining} partido${suspension.matchesRemaining == 1 ? '' : 's'}',
                          style: GoogleFonts.outfit(fontSize: 11, color: _SN.error.withOpacity(0.8)),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPlayerAvatar(PlayerStatsEntity stat) {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: _SN.neonPurple.withOpacity(0.2),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: _SN.neonPurple.withOpacity(0.3)),
      ),
      child: stat.hasPhoto
          ? ClipRRect(
              borderRadius: BorderRadius.circular(9),
              child: Image.network(
                stat.photo!,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Center(
                  child: Text(
                    stat.initials,
                    style: GoogleFonts.bebasNeue(fontSize: 16, color: _SN.neonPurple),
                  ),
                ),
              ),
            )
          : Center(
              child: Text(
                stat.initials,
                style: GoogleFonts.bebasNeue(fontSize: 16, color: _SN.neonPurple),
              ),
            ),
    );
  }

  // ==================== Bottom Sheets ====================

  void _showAddGoalsSheet(BuildContext parentContext) {
    final leagueId = widget.user.leagueId;
    if (leagueId == null) return;

    final statsBloc = parentContext.read<PlayerStatsBloc>();

    showModalBottomSheet(
      context: parentContext,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) {
        return MultiBlocProvider(
          providers: [
            BlocProvider(create: (_) {
              final bloc = sl<TournamentBloc>();
              bloc.add(LoadTournamentsByLeagueEvent(leagueId: leagueId));
              return bloc;
            }),
            BlocProvider(create: (_) => sl<TeamBloc>()),
            BlocProvider(create: (_) => sl<PlayerBloc>()),
          ],
          child: _AddGoalsBottomSheet(
            leagueId: leagueId,
            statsBloc: statsBloc,
          ),
        );
      },
    );
  }

  void _showEditGoalsSheet(BuildContext parentContext, PlayerStatsEntity stat) {
    final leagueId = widget.user.leagueId;
    if (leagueId == null) return;

    final statsBloc = parentContext.read<PlayerStatsBloc>();

    showModalBottomSheet(
      context: parentContext,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) {
        return _EditGoalsBottomSheet(
          leagueId: leagueId,
          stat: stat,
          statsBloc: statsBloc,
        );
      },
    );
  }
}

// ==================== Add Goals Bottom Sheet ====================

class _AddGoalsBottomSheet extends StatefulWidget {
  final String leagueId;
  final PlayerStatsBloc statsBloc;

  const _AddGoalsBottomSheet({
    required this.leagueId,
    required this.statsBloc,
  });

  @override
  State<_AddGoalsBottomSheet> createState() => _AddGoalsBottomSheetState();
}

class _AddGoalsBottomSheetState extends State<_AddGoalsBottomSheet> {
  TournamentEntity? _selectedTournament;
  TeamEntity? _selectedTeam;
  PlayerEntity? _selectedPlayer;
  final _goalsController = TextEditingController(text: '0');
  final _assistsController = TextEditingController(text: '0');

  @override
  void dispose() {
    _goalsController.dispose();
    _assistsController.dispose();
    super.dispose();
  }

  void _onTournamentSelected(TournamentEntity tournament) {
    setState(() {
      _selectedTournament = tournament;
      _selectedTeam = null;
      _selectedPlayer = null;
    });
    context.read<TeamBloc>().add(
          LoadTeamsByTournamentEvent(
            tournamentId: tournament.id,
            onlyActive: true,
          ),
        );
  }

  void _onTeamSelected(TeamEntity team) {
    setState(() {
      _selectedTeam = team;
      _selectedPlayer = null;
    });
    context.read<PlayerBloc>().add(
          LoadPlayersByTeamEvent(teamId: team.id, onlyActive: true),
        );
  }

  void _onSave() {
    if (_selectedPlayer == null) return;
    final goals = int.tryParse(_goalsController.text) ?? 0;
    final assists = int.tryParse(_assistsController.text) ?? 0;
    if (goals == 0 && assists == 0) return;

    widget.statsBloc.add(AddExtemporaneousGoalsEvent(
      playerId: _selectedPlayer!.id,
      leagueId: widget.leagueId,
      goals: goals,
      assists: assists,
    ));
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Container(
        decoration: BoxDecoration(
          color: _SN.cardDark,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          border: Border.all(color: _SN.neonGreen.withOpacity(0.15)),
        ),
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Handle
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: _SN.textMuted,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Title
              Text(
                'AGREGAR GOLES',
                style: GoogleFonts.bebasNeue(
                  fontSize: 24,
                  color: _SN.neonGreen,
                  letterSpacing: 2,
                ),
              ),
              Text(
                'Goles extemporaneos (sin partido asociado)',
                style: GoogleFonts.outfit(fontSize: 12, color: _SN.textMuted),
              ),
              const SizedBox(height: 24),

              // Tournament dropdown
              Text(
                'TORNEO',
                style: GoogleFonts.bebasNeue(
                  fontSize: 14,
                  color: _SN.textSecondary,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 8),
              BlocBuilder<TournamentBloc, TournamentState>(
                builder: (context, state) {
                  if (state is TournamentLoading) {
                    return _buildSheetLoading();
                  }
                  if (state is TournamentsLoaded) {
                    return _buildTournamentDropdown(state.tournaments);
                  }
                  if (state is TournamentError) {
                    return Text(state.message,
                        style: GoogleFonts.outfit(color: _SN.error, fontSize: 12));
                  }
                  return const SizedBox.shrink();
                },
              ),
              const SizedBox(height: 16),

              // Team dropdown
              Text(
                'EQUIPO',
                style: GoogleFonts.bebasNeue(
                  fontSize: 14,
                  color: _SN.textSecondary,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 8),
              BlocBuilder<TeamBloc, TeamState>(
                builder: (context, state) {
                  if (_selectedTournament == null) {
                    return _buildDisabledDropdown('Selecciona un torneo primero');
                  }
                  if (state is TeamLoading) {
                    return _buildSheetLoading();
                  }
                  if (state is TeamsLoaded) {
                    return _buildTeamDropdown(state.teams);
                  }
                  if (state is TeamError) {
                    return Text(state.message,
                        style: GoogleFonts.outfit(color: _SN.error, fontSize: 12));
                  }
                  return _buildDisabledDropdown('Selecciona un torneo primero');
                },
              ),
              const SizedBox(height: 16),

              // Player dropdown
              Text(
                'JUGADOR',
                style: GoogleFonts.bebasNeue(
                  fontSize: 14,
                  color: _SN.textSecondary,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 8),
              BlocBuilder<PlayerBloc, PlayerState>(
                builder: (context, state) {
                  if (_selectedTeam == null) {
                    return _buildDisabledDropdown('Selecciona un equipo primero');
                  }
                  if (state is PlayerLoading) {
                    return _buildSheetLoading();
                  }
                  if (state is PlayersLoaded) {
                    return _buildPlayerDropdown(state.players);
                  }
                  if (state is PlayerError) {
                    return Text(state.message,
                        style: GoogleFonts.outfit(color: _SN.error, fontSize: 12));
                  }
                  return _buildDisabledDropdown('Selecciona un equipo primero');
                },
              ),
              const SizedBox(height: 16),

              // Goals & Assists inputs
              Row(
                children: [
                  Expanded(
                    child: _buildNumberInput(
                      label: 'GOLES',
                      controller: _goalsController,
                      icon: Icons.sports_soccer,
                      color: _SN.neonGreen,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: _buildNumberInput(
                      label: 'ASISTENCIAS',
                      controller: _assistsController,
                      icon: Icons.assistant,
                      color: _SN.neonBlue,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Save button
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: _selectedPlayer != null ? _onSave : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _SN.neonGreen,
                    disabledBackgroundColor: _SN.textMuted.withOpacity(0.3),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: Text(
                    'GUARDAR',
                    style: GoogleFonts.bebasNeue(
                      fontSize: 18,
                      color: _SN.backgroundDark,
                      letterSpacing: 2,
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

  Widget _buildTournamentDropdown(List<TournamentEntity> tournaments) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: _SN.backgroundDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _SN.gold.withOpacity(0.2)),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<TournamentEntity>(
          value: _selectedTournament,
          hint: Text('Seleccionar torneo',
              style: GoogleFonts.outfit(color: _SN.textMuted, fontSize: 14)),
          isExpanded: true,
          dropdownColor: _SN.cardDark,
          icon: Icon(Icons.keyboard_arrow_down, color: _SN.gold),
          items: tournaments.map((tournament) {
            return DropdownMenuItem(
              value: tournament,
              child: Text(
                tournament.name,
                style: GoogleFonts.outfit(color: _SN.textPrimary, fontSize: 14),
              ),
            );
          }).toList(),
          onChanged: (tournament) {
            if (tournament != null) _onTournamentSelected(tournament);
          },
        ),
      ),
    );
  }

  Widget _buildTeamDropdown(List<TeamEntity> teams) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: _SN.backgroundDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _SN.neonGreen.withOpacity(0.2)),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<TeamEntity>(
          value: _selectedTeam,
          hint: Text('Seleccionar equipo',
              style: GoogleFonts.outfit(color: _SN.textMuted, fontSize: 14)),
          isExpanded: true,
          dropdownColor: _SN.cardDark,
          icon: Icon(Icons.keyboard_arrow_down, color: _SN.neonGreen),
          items: teams.map((team) {
            return DropdownMenuItem(
              value: team,
              child: Text(
                team.name,
                style: GoogleFonts.outfit(color: _SN.textPrimary, fontSize: 14),
              ),
            );
          }).toList(),
          onChanged: (team) {
            if (team != null) _onTeamSelected(team);
          },
        ),
      ),
    );
  }

  Widget _buildPlayerDropdown(List<PlayerEntity> players) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: _SN.backgroundDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _SN.neonBlue.withOpacity(0.2)),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<PlayerEntity>(
          value: _selectedPlayer,
          hint: Text('Seleccionar jugador',
              style: GoogleFonts.outfit(color: _SN.textMuted, fontSize: 14)),
          isExpanded: true,
          dropdownColor: _SN.cardDark,
          icon: Icon(Icons.keyboard_arrow_down, color: _SN.neonBlue),
          items: players.map((player) {
            return DropdownMenuItem(
              value: player,
              child: Text(
                player.displayName,
                style: GoogleFonts.outfit(color: _SN.textPrimary, fontSize: 14),
              ),
            );
          }).toList(),
          onChanged: (player) {
            setState(() => _selectedPlayer = player);
          },
        ),
      ),
    );
  }

  Widget _buildDisabledDropdown(String hint) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
      decoration: BoxDecoration(
        color: _SN.backgroundDark.withOpacity(0.5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withOpacity(0.06)),
      ),
      child: Text(hint,
          style: GoogleFonts.outfit(color: _SN.textMuted, fontSize: 14)),
    );
  }

  Widget _buildSheetLoading() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14),
      child: Center(
        child: SizedBox(
          width: 20,
          height: 20,
          child: CircularProgressIndicator(
            strokeWidth: 2,
            valueColor: AlwaysStoppedAnimation<Color>(_SN.neonGreen),
          ),
        ),
      ),
    );
  }

  Widget _buildNumberInput({
    required String label,
    required TextEditingController controller,
    required IconData icon,
    required Color color,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.bebasNeue(
            fontSize: 14,
            color: _SN.textSecondary,
            letterSpacing: 1,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: _SN.backgroundDark,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: color.withOpacity(0.2)),
          ),
          child: Row(
            children: [
              Padding(
                padding: const EdgeInsets.only(left: 12),
                child: Icon(icon, size: 18, color: color),
              ),
              Expanded(
                child: TextField(
                  controller: controller,
                  keyboardType: TextInputType.number,
                  textAlign: TextAlign.center,
                  style: GoogleFonts.bebasNeue(
                    fontSize: 22,
                    color: color,
                  ),
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  decoration: const InputDecoration(
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 12),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ==================== Edit Goals Bottom Sheet ====================

class _EditGoalsBottomSheet extends StatefulWidget {
  final String leagueId;
  final PlayerStatsEntity stat;
  final PlayerStatsBloc statsBloc;

  const _EditGoalsBottomSheet({
    required this.leagueId,
    required this.stat,
    required this.statsBloc,
  });

  @override
  State<_EditGoalsBottomSheet> createState() => _EditGoalsBottomSheetState();
}

class _EditGoalsBottomSheetState extends State<_EditGoalsBottomSheet> {
  late TextEditingController _goalsController;
  late TextEditingController _assistsController;

  @override
  void initState() {
    super.initState();
    _goalsController = TextEditingController(text: '${widget.stat.goals}');
    _assistsController = TextEditingController(text: '${widget.stat.assists}');
  }

  @override
  void dispose() {
    _goalsController.dispose();
    _assistsController.dispose();
    super.dispose();
  }

  void _onSave() {
    final newGoals = int.tryParse(_goalsController.text) ?? 0;
    final newAssists = int.tryParse(_assistsController.text) ?? 0;

    widget.statsBloc.add(UpdateExtemporaneousGoalsEvent(
      playerId: widget.stat.playerId,
      leagueId: widget.leagueId,
      newTotalGoals: newGoals,
      newTotalAssists: newAssists,
    ));
    Navigator.pop(context);
  }

  void _onDelete() {
    widget.statsBloc.add(DeleteExtemporaneousGoalsEvent(
      playerId: widget.stat.playerId,
      leagueId: widget.leagueId,
    ));
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Container(
        decoration: BoxDecoration(
          color: _SN.cardDark,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          border: Border.all(color: _SN.neonBlue.withOpacity(0.15)),
        ),
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Handle
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: _SN.textMuted,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Title
              Text(
                'EDITAR GOLES',
                style: GoogleFonts.bebasNeue(
                  fontSize: 24,
                  color: _SN.neonBlue,
                  letterSpacing: 2,
                ),
              ),
              const SizedBox(height: 4),

              // Player info
              Row(
                children: [
                  Icon(Icons.person, size: 16, color: _SN.textMuted),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      widget.stat.playerName,
                      style: GoogleFonts.outfit(
                        fontSize: 14,
                        color: _SN.textPrimary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
              if (widget.stat.teamName != null) ...[
                const SizedBox(height: 2),
                Row(
                  children: [
                    Icon(Icons.shield, size: 14, color: _SN.textMuted),
                    const SizedBox(width: 6),
                    Text(
                      widget.stat.teamName!,
                      style: GoogleFonts.outfit(fontSize: 12, color: _SN.textMuted),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 8),
              Text(
                'Ajusta los totales. El sistema calcula la diferencia y modifica solo el registro extemporaneo.',
                style: GoogleFonts.outfit(fontSize: 11, color: _SN.textMuted),
              ),
              const SizedBox(height: 20),

              // Goals & Assists inputs
              Row(
                children: [
                  Expanded(
                    child: _buildNumberInput(
                      label: 'TOTAL GOLES',
                      controller: _goalsController,
                      icon: Icons.sports_soccer,
                      color: _SN.neonGreen,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: _buildNumberInput(
                      label: 'TOTAL ASISTENCIAS',
                      controller: _assistsController,
                      icon: Icons.assistant,
                      color: _SN.neonBlue,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Save button
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: _onSave,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _SN.neonGreen,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: Text(
                    'GUARDAR CAMBIOS',
                    style: GoogleFonts.bebasNeue(
                      fontSize: 18,
                      color: _SN.backgroundDark,
                      letterSpacing: 2,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // Delete extemporaneous button
              SizedBox(
                width: double.infinity,
                height: 44,
                child: OutlinedButton.icon(
                  onPressed: _onDelete,
                  icon: Icon(Icons.delete_outline, size: 18, color: _SN.error),
                  label: Text(
                    'ELIMINAR GOLES EXTEMPORANEOS',
                    style: GoogleFonts.bebasNeue(
                      fontSize: 14,
                      color: _SN.error,
                      letterSpacing: 1,
                    ),
                  ),
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(color: _SN.error.withOpacity(0.4)),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
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

  Widget _buildNumberInput({
    required String label,
    required TextEditingController controller,
    required IconData icon,
    required Color color,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.bebasNeue(
            fontSize: 14,
            color: _SN.textSecondary,
            letterSpacing: 1,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: _SN.backgroundDark,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: color.withOpacity(0.2)),
          ),
          child: Row(
            children: [
              Padding(
                padding: const EdgeInsets.only(left: 12),
                child: Icon(icon, size: 18, color: color),
              ),
              Expanded(
                child: TextField(
                  controller: controller,
                  keyboardType: TextInputType.number,
                  textAlign: TextAlign.center,
                  style: GoogleFonts.bebasNeue(
                    fontSize: 22,
                    color: color,
                  ),
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  decoration: const InputDecoration(
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 12),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
