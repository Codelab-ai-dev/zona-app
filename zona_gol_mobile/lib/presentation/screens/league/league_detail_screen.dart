import 'dart:convert';
import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import '../../../core/di/injection.dart';
import '../../../domain/entities/league_entity.dart';
import '../../../domain/entities/team_entity.dart';
import '../../../domain/entities/tournament_entity.dart';
import '../../bloc/league/league_bloc.dart';
import '../../bloc/league/league_event.dart';
import '../../bloc/league/league_state.dart';
import '../../bloc/team/team_bloc.dart';
import '../../bloc/team/team_event.dart';
import '../../bloc/team/team_state.dart';
import '../../bloc/tournament/tournament_bloc.dart';
import '../../bloc/tournament/tournament_event.dart';
import '../../bloc/tournament/tournament_state.dart';
import '../player/player_list_screen.dart';

/// Stadium Nights Design System
class _StadiumNights {
  static const Color backgroundDark = Color(0xFF050508);
  static const Color surfaceDark = Color(0xFF0A0A0F);
  static const Color cardDark = Color(0xFF12121A);
  static const Color gold = Color(0xFFFFD700);
  static const Color goldLight = Color(0xFFFFF0B3);
  static const Color amber = Color(0xFFF59E0B);
  static const Color neonGreen = Color(0xFF00FF7F);
  static const Color neonBlue = Color(0xFF00BFFF);
  static const Color success = Color(0xFF10B981);
  static const Color error = Color(0xFFEF4444);
  static const Color textPrimary = Color(0xFFFAFAFA);
  static const Color textSecondary = Color(0xFF9CA3AF);
  static const Color textMuted = Color(0xFF6B7280);
}

/// League Detail Screen - Stadium Nights Edition
class LeagueDetailScreen extends StatelessWidget {
  final LeagueEntity league;

  const LeagueDetailScreen({
    super.key,
    required this.league,
  });

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => sl<LeagueBloc>()..add(LoadLeagueByIdEvent(league.id)),
      child: _LeagueDetailView(initialLeague: league),
    );
  }
}

class _LeagueDetailView extends StatefulWidget {
  final LeagueEntity initialLeague;

  const _LeagueDetailView({required this.initialLeague});

  @override
  State<_LeagueDetailView> createState() => _LeagueDetailViewState();
}

class _LeagueDetailViewState extends State<_LeagueDetailView>
    with TickerProviderStateMixin {
  late TabController _tabController;
  late AnimationController _headerController;
  late Animation<double> _headerAnimation;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);

    _headerController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );

    _headerAnimation = CurvedAnimation(
      parent: _headerController,
      curve: Curves.easeOutCubic,
    );

    _headerController.forward();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _headerController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light.copyWith(
        statusBarColor: Colors.transparent,
        systemNavigationBarColor: _StadiumNights.backgroundDark,
      ),
      child: Scaffold(
        backgroundColor: _StadiumNights.backgroundDark,
        body: BlocBuilder<LeagueBloc, LeagueState>(
          builder: (context, state) {
            final league =
                state is LeagueDetailLoaded ? state.league : widget.initialLeague;

            return Stack(
              children: [
                // Background
                const _StadiumFieldBackground(),

                // Spotlight effects
                _buildSpotlightEffects(),

                // Main content
                NestedScrollView(
                  headerSliverBuilder: (context, innerBoxIsScrolled) {
                    return [
                      _buildSliverAppBar(context, league, innerBoxIsScrolled),
                    ];
                  },
                  body: TabBarView(
                    controller: _tabController,
                    children: [
                      _InfoTab(league: league),
                      _TournamentsTab(league: league),
                      _TeamsTab(league: league),
                    ],
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildSpotlightEffects() {
    return AnimatedBuilder(
      animation: _headerAnimation,
      builder: (context, child) {
        return Stack(
          children: [
            Positioned(
              top: -100,
              left: -50,
              child: Opacity(
                opacity: 0.25 * _headerAnimation.value,
                child: Container(
                  width: 300,
                  height: 400,
                  decoration: BoxDecoration(
                    gradient: RadialGradient(
                      colors: [
                        _StadiumNights.gold.withOpacity(0.3),
                        Colors.transparent,
                      ],
                    ),
                  ),
                ),
              ),
            ),
            Positioned(
              top: -80,
              right: -80,
              child: Opacity(
                opacity: 0.2 * _headerAnimation.value,
                child: Container(
                  width: 350,
                  height: 350,
                  decoration: BoxDecoration(
                    gradient: RadialGradient(
                      colors: [
                        _StadiumNights.amber.withOpacity(0.25),
                        Colors.transparent,
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildSliverAppBar(
      BuildContext context, LeagueEntity league, bool innerBoxIsScrolled) {
    return SliverAppBar(
      expandedHeight: 280,
      pinned: true,
      backgroundColor: _StadiumNights.surfaceDark,
      foregroundColor: _StadiumNights.textPrimary,
      leading: GestureDetector(
        onTap: () {
          HapticFeedback.lightImpact();
          Navigator.pop(context);
        },
        child: Container(
          margin: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.3),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: _StadiumNights.gold.withOpacity(0.2)),
          ),
          child: Icon(
            Icons.arrow_back,
            color: _StadiumNights.gold,
            size: 20,
          ),
        ),
      ),
      flexibleSpace: FlexibleSpaceBar(
        title: AnimatedBuilder(
          animation: _headerAnimation,
          builder: (context, child) {
            return Opacity(
              opacity: _headerAnimation.value,
              child: Text(
                league.name,
                style: GoogleFonts.bebasNeue(
                  fontSize: 22,
                  color: _StadiumNights.textPrimary,
                  letterSpacing: 2,
                  shadows: [
                    Shadow(
                      offset: const Offset(0, 2),
                      blurRadius: 8,
                      color: Colors.black.withOpacity(0.5),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
        background: Stack(
          fit: StackFit.expand,
          children: [
            // Gradient background
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    _StadiumNights.backgroundDark,
                    _StadiumNights.surfaceDark,
                  ],
                ),
              ),
            ),

            // League logo
            Center(
              child: AnimatedBuilder(
                animation: _headerAnimation,
                builder: (context, child) {
                  return Transform.scale(
                    scale: 0.8 + (0.2 * _headerAnimation.value),
                    child: Opacity(
                      opacity: _headerAnimation.value,
                      child: child,
                    ),
                  );
                },
                child: _buildLeagueLogo(league),
              ),
            ),

            // Bottom gradient for title readability
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: Container(
                height: 100,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.transparent,
                      _StadiumNights.surfaceDark.withOpacity(0.8),
                      _StadiumNights.surfaceDark,
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(56),
        child: Container(
          decoration: BoxDecoration(
            color: _StadiumNights.surfaceDark,
            border: Border(
              bottom: BorderSide(
                color: _StadiumNights.gold.withOpacity(0.1),
              ),
            ),
          ),
          child: TabBar(
            controller: _tabController,
            indicatorColor: _StadiumNights.gold,
            indicatorWeight: 3,
            labelColor: _StadiumNights.gold,
            unselectedLabelColor: _StadiumNights.textMuted,
            labelStyle: GoogleFonts.outfit(
              fontWeight: FontWeight.w600,
              fontSize: 13,
            ),
            unselectedLabelStyle: GoogleFonts.outfit(
              fontWeight: FontWeight.w500,
              fontSize: 13,
            ),
            tabs: const [
              Tab(icon: Icon(Icons.info_outline, size: 20), text: 'Info'),
              Tab(icon: Icon(Icons.sports_soccer, size: 20), text: 'Torneos'),
              Tab(icon: Icon(Icons.groups, size: 20), text: 'Equipos'),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLeagueLogo(LeagueEntity league) {
    return Container(
      width: 120,
      height: 120,
      decoration: BoxDecoration(
        color: _StadiumNights.cardDark,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: _StadiumNights.gold.withOpacity(0.3),
          width: 2,
        ),
        boxShadow: [
          BoxShadow(
            color: _StadiumNights.gold.withOpacity(0.2),
            blurRadius: 30,
            spreadRadius: 5,
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(22),
        child: league.hasLogo
            ? _buildLeagueLogoImage(league.logo!)
            : Icon(
                Icons.emoji_events,
                size: 60,
                color: _StadiumNights.gold,
              ),
      ),
    );
  }

  Widget _buildLeagueLogoImage(String logoData) {
    try {
      if (logoData.startsWith('data:image/')) {
        final base64Data = logoData.split(',')[1];
        final Uint8List bytes = base64Decode(base64Data);
        return Image.memory(
          bytes,
          width: 120,
          height: 120,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _buildFallbackLogo(),
        );
      } else {
        return Image.network(
          logoData,
          width: 120,
          height: 120,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _buildFallbackLogo(),
        );
      }
    } catch (e) {
      return _buildFallbackLogo();
    }
  }

  Widget _buildFallbackLogo() {
    return Icon(
      Icons.emoji_events,
      size: 60,
      color: _StadiumNights.gold,
    );
  }
}

/// Information Tab - Stadium Nights
class _InfoTab extends StatelessWidget {
  final LeagueEntity league;

  const _InfoTab({required this.league});

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('dd MMM yyyy', 'es');

    return Container(
      color: _StadiumNights.backgroundDark,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // Status Badge
          _buildStatusBadge(),
          const SizedBox(height: 24),

          // Description card
          _buildInfoCard(
            icon: Icons.description,
            title: 'DESCRIPCIÓN',
            child: Text(
              league.description,
              style: GoogleFonts.outfit(
                fontSize: 15,
                color: _StadiumNights.textSecondary,
                height: 1.6,
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Slug card
          _buildInfoCard(
            icon: Icons.link,
            title: 'IDENTIFICADOR',
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: _StadiumNights.neonGreen.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: _StadiumNights.neonGreen.withOpacity(0.2),
                ),
              ),
              child: Text(
                '/${league.slug}',
                style: GoogleFonts.jetBrainsMono(
                  fontSize: 14,
                  color: _StadiumNights.neonGreen,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Dates row
          Row(
            children: [
              if (league.createdAt != null)
                Expanded(
                  child: _buildInfoCard(
                    icon: Icons.calendar_today,
                    title: 'CREADA',
                    compact: true,
                    child: Text(
                      dateFormat.format(league.createdAt!),
                      style: GoogleFonts.outfit(
                        fontSize: 14,
                        color: _StadiumNights.textPrimary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ),
              if (league.createdAt != null && league.updatedAt != null)
                const SizedBox(width: 12),
              if (league.updatedAt != null)
                Expanded(
                  child: _buildInfoCard(
                    icon: Icons.update,
                    title: 'ACTUALIZADA',
                    compact: true,
                    child: Text(
                      dateFormat.format(league.updatedAt!),
                      style: GoogleFonts.outfit(
                        fontSize: 14,
                        color: _StadiumNights.textPrimary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatusBadge() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
          decoration: BoxDecoration(
            color: league.isActive
                ? _StadiumNights.neonGreen.withOpacity(0.15)
                : _StadiumNights.textMuted.withOpacity(0.15),
            borderRadius: BorderRadius.circular(30),
            border: Border.all(
              color: league.isActive
                  ? _StadiumNights.neonGreen.withOpacity(0.3)
                  : _StadiumNights.textMuted.withOpacity(0.3),
            ),
            boxShadow: league.isActive
                ? [
                    BoxShadow(
                      color: _StadiumNights.neonGreen.withOpacity(0.2),
                      blurRadius: 12,
                    ),
                  ]
                : null,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(
                  color: league.isActive
                      ? _StadiumNights.neonGreen
                      : _StadiumNights.textMuted,
                  shape: BoxShape.circle,
                  boxShadow: league.isActive
                      ? [
                          BoxShadow(
                            color: _StadiumNights.neonGreen.withOpacity(0.5),
                            blurRadius: 6,
                          ),
                        ]
                      : null,
                ),
              ),
              const SizedBox(width: 10),
              Text(
                league.statusText.toUpperCase(),
                style: GoogleFonts.bebasNeue(
                  fontSize: 16,
                  color: league.isActive
                      ? _StadiumNights.neonGreen
                      : _StadiumNights.textMuted,
                  letterSpacing: 2,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildInfoCard({
    required IconData icon,
    required String title,
    required Widget child,
    bool compact = false,
  }) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          padding: EdgeInsets.all(compact ? 16 : 20),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Colors.white.withOpacity(0.08),
                Colors.white.withOpacity(0.03),
              ],
            ),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: Colors.white.withOpacity(0.1),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    icon,
                    size: 18,
                    color: _StadiumNights.gold,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    title,
                    style: GoogleFonts.bebasNeue(
                      fontSize: 14,
                      color: _StadiumNights.gold,
                      letterSpacing: 1.5,
                    ),
                  ),
                ],
              ),
              SizedBox(height: compact ? 10 : 14),
              child,
            ],
          ),
        ),
      ),
    );
  }
}

/// Tournaments Tab - Stadium Nights
class _TournamentsTab extends StatelessWidget {
  final LeagueEntity league;

  const _TournamentsTab({required this.league});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: _StadiumNights.backgroundDark,
      child: BlocProvider(
        create: (context) => sl<TournamentBloc>()
          ..add(LoadTournamentsByLeagueEvent(leagueId: league.id)),
        child: BlocBuilder<TournamentBloc, TournamentState>(
          builder: (context, state) {
            if (state is TournamentLoading) {
              return _buildLoadingState();
            }

            if (state is TournamentError) {
              return _buildErrorState(context, state.message, () {
                context.read<TournamentBloc>().add(
                      LoadTournamentsByLeagueEvent(leagueId: league.id),
                    );
              });
            }

            if (state is TournamentsLoaded) {
              if (state.tournaments.isEmpty) {
                return _buildEmptyState(
                  icon: Icons.sports_soccer,
                  title: 'SIN TORNEOS',
                  subtitle: 'Esta liga aún no tiene torneos creados',
                );
              }

              return RefreshIndicator(
                onRefresh: () async {
                  context.read<TournamentBloc>().add(
                        LoadTournamentsByLeagueEvent(leagueId: league.id),
                      );
                },
                color: _StadiumNights.gold,
                backgroundColor: _StadiumNights.cardDark,
                child: ListView.builder(
                  padding: const EdgeInsets.all(20),
                  itemCount: state.tournaments.length,
                  itemBuilder: (context, index) {
                    return _TournamentCard(
                      tournament: state.tournaments[index],
                      index: index,
                    );
                  },
                ),
              );
            }

            return _buildLoadingState();
          },
        ),
      ),
    );
  }
}

/// Tournament Card - Stadium Nights
class _TournamentCard extends StatelessWidget {
  final TournamentEntity tournament;
  final int index;

  const _TournamentCard({
    required this.tournament,
    required this.index,
  });

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('dd/MM/yyyy');

    // Status styling
    Color statusColor;
    String statusText;
    IconData statusIcon;

    if (tournament.isCurrentlyActive) {
      statusColor = _StadiumNights.neonGreen;
      statusText = 'EN CURSO';
      statusIcon = Icons.play_circle;
    } else if (tournament.isUpcoming) {
      statusColor = _StadiumNights.neonBlue;
      statusText = 'PRÓXIMO';
      statusIcon = Icons.schedule;
    } else {
      statusColor = _StadiumNights.textMuted;
      statusText = 'FINALIZADO';
      statusIcon = Icons.check_circle;
    }

    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.0, end: 1.0),
      duration: Duration(milliseconds: 400 + (index * 100)),
      curve: Curves.easeOutCubic,
      builder: (context, value, child) {
        return Transform.translate(
          offset: Offset(0, 20 * (1 - value)),
          child: Opacity(opacity: value, child: child),
        );
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(20),
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
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: statusColor.withOpacity(0.2),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header: Name and Status
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          tournament.name,
                          style: GoogleFonts.bebasNeue(
                            fontSize: 20,
                            color: _StadiumNights.textPrimary,
                            letterSpacing: 1,
                          ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: statusColor.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: statusColor.withOpacity(0.3),
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(statusIcon, size: 14, color: statusColor),
                            const SizedBox(width: 6),
                            Text(
                              statusText,
                              style: GoogleFonts.outfit(
                                fontSize: 11,
                                color: statusColor,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Info row
                  Row(
                    children: [
                      Icon(
                        Icons.emoji_events_outlined,
                        size: 16,
                        color: _StadiumNights.gold,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        tournament.formatText,
                        style: GoogleFonts.outfit(
                          fontSize: 13,
                          color: _StadiumNights.textSecondary,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Icon(
                        Icons.calendar_today,
                        size: 14,
                        color: _StadiumNights.textMuted,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        '${dateFormat.format(tournament.startDate)} - ${dateFormat.format(tournament.endDate)}',
                        style: GoogleFonts.outfit(
                          fontSize: 12,
                          color: _StadiumNights.textMuted,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  // Duration
                  Row(
                    children: [
                      Icon(
                        Icons.timelapse,
                        size: 14,
                        color: _StadiumNights.textMuted,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        '${tournament.durationInDays} días',
                        style: GoogleFonts.outfit(
                          fontSize: 12,
                          color: _StadiumNights.textMuted,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Teams Tab - Stadium Nights
class _TeamsTab extends StatefulWidget {
  final LeagueEntity league;

  const _TeamsTab({required this.league});

  @override
  State<_TeamsTab> createState() => _TeamsTabState();
}

class _TeamsTabState extends State<_TeamsTab> {
  TournamentEntity? _selectedTournament;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: _StadiumNights.backgroundDark,
      child: MultiBlocProvider(
        providers: [
          BlocProvider(
            create: (context) => sl<TournamentBloc>()
              ..add(LoadTournamentsByLeagueEvent(leagueId: widget.league.id)),
          ),
          BlocProvider(
            create: (context) => sl<TeamBloc>(),
          ),
        ],
        child: Column(
          children: [
            // Tournament Selector
            BlocBuilder<TournamentBloc, TournamentState>(
              builder: (context, state) {
                if (state is TournamentsLoaded && state.tournaments.isNotEmpty) {
                  return _buildTournamentSelector(context, state.tournaments);
                }
                return const SizedBox.shrink();
              },
            ),
            // Teams List
            Expanded(
              child: BlocBuilder<TeamBloc, TeamState>(
                builder: (context, state) {
                  if (_selectedTournament == null) {
                    return _buildEmptyState(
                      icon: Icons.sports_soccer,
                      title: 'SELECCIONA UN TORNEO',
                      subtitle: 'Elige un torneo para ver sus equipos',
                    );
                  }

                  if (state is TeamLoading) {
                    return _buildLoadingState();
                  }

                  if (state is TeamError) {
                    return _buildErrorState(context, state.message, () {
                      context.read<TeamBloc>().add(
                            LoadTeamsByTournamentEvent(
                              tournamentId: _selectedTournament!.id,
                            ),
                          );
                    });
                  }

                  if (state is TeamsLoaded) {
                    if (state.teams.isEmpty) {
                      return _buildEmptyState(
                        icon: Icons.groups,
                        title: 'SIN EQUIPOS',
                        subtitle: 'Este torneo aún no tiene equipos',
                      );
                    }

                    return RefreshIndicator(
                      onRefresh: () async {
                        context.read<TeamBloc>().add(
                              LoadTeamsByTournamentEvent(
                                tournamentId: _selectedTournament!.id,
                              ),
                            );
                      },
                      color: _StadiumNights.gold,
                      backgroundColor: _StadiumNights.cardDark,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(20),
                        itemCount: state.teams.length,
                        itemBuilder: (context, index) {
                          return _TeamCard(
                            team: state.teams[index],
                            index: index,
                            onTap: () => _navigateToPlayers(
                              context,
                              state.teams[index],
                            ),
                          );
                        },
                      ),
                    );
                  }

                  return _buildEmptyState(
                    icon: Icons.sports_soccer,
                    title: 'SELECCIONA UN TORNEO',
                    subtitle: 'Elige un torneo para ver sus equipos',
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTournamentSelector(
      BuildContext context, List<TournamentEntity> tournaments) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: _StadiumNights.cardDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: _StadiumNights.gold.withOpacity(0.3),
        ),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<TournamentEntity>(
          value: _selectedTournament,
          isExpanded: true,
          hint: Text(
            'Seleccionar torneo',
            style: GoogleFonts.outfit(
              color: _StadiumNights.textMuted,
              fontSize: 14,
            ),
          ),
          dropdownColor: _StadiumNights.cardDark,
          icon: Icon(
            Icons.keyboard_arrow_down,
            color: _StadiumNights.gold,
          ),
          items: tournaments.map((tournament) {
            return DropdownMenuItem<TournamentEntity>(
              value: tournament,
              child: Row(
                children: [
                  Icon(
                    tournament.isCurrentlyActive
                        ? Icons.play_circle
                        : Icons.emoji_events_outlined,
                    size: 18,
                    color: tournament.isCurrentlyActive
                        ? _StadiumNights.neonGreen
                        : _StadiumNights.gold,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      tournament.name,
                      style: GoogleFonts.outfit(
                        color: _StadiumNights.textPrimary,
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
          onChanged: (tournament) {
            if (tournament != null) {
              setState(() {
                _selectedTournament = tournament;
              });
              context.read<TeamBloc>().add(
                    LoadTeamsByTournamentEvent(tournamentId: tournament.id),
                  );
            }
          },
        ),
      ),
    );
  }

  void _navigateToPlayers(BuildContext context, TeamEntity team) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => PlayerListScreen(
          teamId: team.id,
          teamName: team.name,
          canEdit: true,
        ),
      ),
    );
  }
}

/// Team Card - Stadium Nights
class _TeamCard extends StatelessWidget {
  final TeamEntity team;
  final int index;
  final VoidCallback? onTap;

  const _TeamCard({
    required this.team,
    required this.index,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.0, end: 1.0),
      duration: Duration(milliseconds: 400 + (index * 100)),
      curve: Curves.easeOutCubic,
      builder: (context, value, child) {
        return Transform.translate(
          offset: Offset(0, 20 * (1 - value)),
          child: Opacity(opacity: value, child: child),
        );
      },
      child: GestureDetector(
        onTap: onTap,
        child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(20),
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
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: team.isActive
                      ? _StadiumNights.gold.withOpacity(0.2)
                      : Colors.white.withOpacity(0.05),
                ),
              ),
              child: Row(
                children: [
                  // Team logo
                  _buildTeamLogo(),
                  const SizedBox(width: 16),

                  // Team info
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          team.name,
                          style: GoogleFonts.bebasNeue(
                            fontSize: 18,
                            color: _StadiumNights.textPrimary,
                            letterSpacing: 1,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '/${team.slug}',
                          style: GoogleFonts.jetBrainsMono(
                            fontSize: 11,
                            color: _StadiumNights.textMuted,
                          ),
                        ),
                        if (team.groupName != null) ...[
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: _StadiumNights.neonBlue.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              team.groupDisplayText,
                              style: GoogleFonts.outfit(
                                fontSize: 11,
                                color: _StadiumNights.neonBlue,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),

                  // Status badge
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: team.isActive
                          ? _StadiumNights.neonGreen.withOpacity(0.15)
                          : _StadiumNights.textMuted.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 6,
                          height: 6,
                          decoration: BoxDecoration(
                            color: team.isActive
                                ? _StadiumNights.neonGreen
                                : _StadiumNights.textMuted,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          team.isActive ? 'Activo' : 'Inactivo',
                          style: GoogleFonts.outfit(
                            fontSize: 11,
                            color: team.isActive
                                ? _StadiumNights.neonGreen
                                : _StadiumNights.textMuted,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
      ),
    );
  }

  Widget _buildTeamLogo() {
    final Color primaryColor = team.hasHomeColors && team.homePrimaryColor != null
        ? _parseColor(team.homePrimaryColor!)
        : _StadiumNights.gold;

    return Container(
      width: 56,
      height: 56,
      decoration: BoxDecoration(
        color: primaryColor.withOpacity(0.15),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: primaryColor.withOpacity(0.3),
        ),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: team.hasLogo
            ? _buildTeamLogoImage(team.logo!)
            : Icon(
                Icons.shield,
                size: 28,
                color: primaryColor,
              ),
      ),
    );
  }

  Widget _buildTeamLogoImage(String logoData) {
    try {
      if (logoData.startsWith('data:image/')) {
        final base64Data = logoData.split(',')[1];
        final Uint8List bytes = base64Decode(base64Data);
        return Image.memory(
          bytes,
          width: 56,
          height: 56,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => Icon(
            Icons.shield,
            size: 28,
            color: _StadiumNights.gold,
          ),
        );
      } else {
        return Image.network(
          logoData,
          width: 56,
          height: 56,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => Icon(
            Icons.shield,
            size: 28,
            color: _StadiumNights.gold,
          ),
        );
      }
    } catch (e) {
      return Icon(
        Icons.shield,
        size: 28,
        color: _StadiumNights.gold,
      );
    }
  }

  Color _parseColor(String colorString) {
    try {
      String hexColor = colorString.toUpperCase().replaceAll('#', '');
      if (hexColor.startsWith('0X')) {
        hexColor = hexColor.substring(2);
      }
      if (hexColor.length == 6) {
        hexColor = 'FF$hexColor';
      }
      return Color(int.parse(hexColor, radix: 16));
    } catch (e) {
      return _StadiumNights.gold;
    }
  }
}

// Shared UI Components

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
            valueColor: AlwaysStoppedAnimation<Color>(_StadiumNights.gold),
          ),
        ),
        const SizedBox(height: 20),
        Text(
          'CARGANDO',
          style: GoogleFonts.bebasNeue(
            fontSize: 16,
            color: _StadiumNights.textMuted,
            letterSpacing: 2,
          ),
        ),
      ],
    ),
  );
}

Widget _buildErrorState(
    BuildContext context, String message, VoidCallback onRetry) {
  return Center(
    child: Padding(
      padding: const EdgeInsets.all(40),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 70,
            height: 70,
            decoration: BoxDecoration(
              color: _StadiumNights.error.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.error_outline,
              size: 36,
              color: _StadiumNights.error,
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'ERROR',
            style: GoogleFonts.bebasNeue(
              fontSize: 20,
              color: _StadiumNights.textPrimary,
              letterSpacing: 2,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            message,
            textAlign: TextAlign.center,
            style: GoogleFonts.outfit(
              fontSize: 14,
              color: _StadiumNights.textSecondary,
            ),
          ),
          const SizedBox(height: 24),
          GestureDetector(
            onTap: onRetry,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [_StadiumNights.gold, _StadiumNights.amber],
                ),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.refresh, color: Colors.black, size: 18),
                  const SizedBox(width: 8),
                  Text(
                    'REINTENTAR',
                    style: GoogleFonts.bebasNeue(
                      fontSize: 14,
                      color: Colors.black,
                      letterSpacing: 1,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    ),
  );
}

Widget _buildEmptyState({
  required IconData icon,
  required String title,
  required String subtitle,
}) {
  return Center(
    child: Padding(
      padding: const EdgeInsets.all(40),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              gradient: RadialGradient(
                colors: [
                  _StadiumNights.gold.withOpacity(0.1),
                  Colors.transparent,
                ],
              ),
            ),
            child: Icon(
              icon,
              size: 50,
              color: _StadiumNights.gold.withOpacity(0.5),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            title,
            style: GoogleFonts.bebasNeue(
              fontSize: 24,
              color: _StadiumNights.textPrimary,
              letterSpacing: 2,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            style: GoogleFonts.outfit(
              fontSize: 14,
              color: _StadiumNights.textSecondary,
            ),
          ),
        ],
      ),
    ),
  );
}

/// Stadium Field Background
class _StadiumFieldBackground extends StatefulWidget {
  const _StadiumFieldBackground();

  @override
  State<_StadiumFieldBackground> createState() =>
      _StadiumFieldBackgroundState();
}

class _StadiumFieldBackgroundState extends State<_StadiumFieldBackground>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 20),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          return CustomPaint(
            painter: _StadiumFieldPainter(
              animationValue: _controller.value,
            ),
          );
        },
      ),
    );
  }
}

class _StadiumFieldPainter extends CustomPainter {
  final double animationValue;

  _StadiumFieldPainter({required this.animationValue});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = _StadiumNights.neonGreen.withOpacity(0.02)
      ..strokeWidth = 1.0
      ..style = PaintingStyle.stroke;

    final centerX = size.width / 2;
    final centerY = size.height / 2;

    final pulseScale = 1.0 + (math.sin(animationValue * 2 * math.pi) * 0.02);
    canvas.drawCircle(
      Offset(centerX, centerY),
      60 * pulseScale,
      paint,
    );

    canvas.drawLine(
      Offset(0, centerY),
      Offset(size.width, centerY),
      paint,
    );

    final pitchRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(
        size.width * 0.08,
        size.height * 0.2,
        size.width * 0.84,
        size.height * 0.6,
      ),
      const Radius.circular(4),
    );
    canvas.drawRRect(pitchRect, paint);
  }

  @override
  bool shouldRepaint(covariant _StadiumFieldPainter oldDelegate) {
    return oldDelegate.animationValue != animationValue;
  }
}
