import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import '../../../core/di/injection.dart';
import '../../../domain/entities/tournament_entity.dart';
import '../../../domain/entities/user_entity.dart';
import '../../bloc/tournament/tournament_bloc.dart';
import '../../bloc/tournament/tournament_event.dart';
import '../../bloc/tournament/tournament_state.dart';
import 'create_tournament_screen.dart';
import 'groups_management_screen.dart';
import 'playoff_bracket_screen.dart';
import 'playoff_bracket_viewer_screen.dart';

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

/// Tournaments List Screen for League Admin
class TournamentsListScreen extends StatelessWidget {
  final UserEntity user;

  const TournamentsListScreen({
    super.key,
    required this.user,
  });

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) {
        final bloc = sl<TournamentBloc>();
        // Load tournaments for the user's league
        if (user.leagueId != null) {
          bloc.add(LoadTournamentsByLeagueEvent(leagueId: user.leagueId!));
        }
        return bloc;
      },
      child: _TournamentsListView(user: user),
    );
  }
}

class _TournamentsListView extends StatelessWidget {
  final UserEntity user;

  const _TournamentsListView({required this.user});

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light.copyWith(
        statusBarColor: Colors.transparent,
        systemNavigationBarColor: _StadiumNights.backgroundDark,
      ),
      child: Scaffold(
        backgroundColor: _StadiumNights.backgroundDark,
        appBar: _buildAppBar(context),
        body: BlocConsumer<TournamentBloc, TournamentState>(
          listener: (context, state) {
            if (state is TournamentCreated) {
              // Reload tournaments after creating one
              if (user.leagueId != null) {
                context.read<TournamentBloc>().add(
                      LoadTournamentsByLeagueEvent(leagueId: user.leagueId!),
                    );
              }
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Torneo "${state.tournament.name}" creado'),
                  backgroundColor: _StadiumNights.success,
                ),
              );
            }
          },
          builder: (context, state) {
            if (user.leagueId == null) {
              return _buildNoLeagueState();
            }

            if (state is TournamentLoading) {
              return _buildLoadingState();
            }

            if (state is TournamentError) {
              return _buildErrorState(context, state.message);
            }

            if (state is TournamentsLoaded) {
              if (state.tournaments.isEmpty) {
                return _buildEmptyState(context);
              }
              return _buildTournamentsList(context, state.tournaments);
            }

            return _buildLoadingState();
          },
        ),
        floatingActionButton: user.leagueId != null
            ? FloatingActionButton.extended(
                onPressed: () => _navigateToCreate(context),
                backgroundColor: _StadiumNights.gold,
                foregroundColor: Colors.black,
                icon: const Icon(Icons.add),
                label: Text(
                  'NUEVO TORNEO',
                  style: GoogleFonts.bebasNeue(
                    fontSize: 14,
                    letterSpacing: 1,
                  ),
                ),
              )
            : null,
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(BuildContext context) {
    return AppBar(
      backgroundColor: _StadiumNights.surfaceDark,
      foregroundColor: _StadiumNights.textPrimary,
      elevation: 0,
      leading: IconButton(
        icon: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.3),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: _StadiumNights.gold.withOpacity(0.2)),
          ),
          child: Icon(
            Icons.arrow_back,
            color: _StadiumNights.gold,
            size: 18,
          ),
        ),
        onPressed: () => Navigator.pop(context),
      ),
      title: Text(
        'MIS TORNEOS',
        style: GoogleFonts.bebasNeue(
          fontSize: 22,
          color: _StadiumNights.textPrimary,
          letterSpacing: 2,
        ),
      ),
      centerTitle: true,
      actions: [
        if (user.leagueId != null)
          IconButton(
            icon: Icon(Icons.refresh, color: _StadiumNights.gold),
            onPressed: () {
              context.read<TournamentBloc>().add(
                    LoadTournamentsByLeagueEvent(leagueId: user.leagueId!),
                  );
            },
          ),
      ],
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
              valueColor: AlwaysStoppedAnimation<Color>(_StadiumNights.gold),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'CARGANDO TORNEOS',
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

  Widget _buildNoLeagueState() {
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
                color: _StadiumNights.error.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.error_outline,
                size: 50,
                color: _StadiumNights.error,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'SIN LIGA ASIGNADA',
              style: GoogleFonts.bebasNeue(
                fontSize: 24,
                color: _StadiumNights.textPrimary,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'No tienes una liga asignada para administrar.',
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

  Widget _buildErrorState(BuildContext context, String message) {
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
              onTap: () {
                if (user.leagueId != null) {
                  context.read<TournamentBloc>().add(
                        LoadTournamentsByLeagueEvent(leagueId: user.leagueId!),
                      );
                }
              },
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
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

  Widget _buildEmptyState(BuildContext context) {
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
                Icons.sports_soccer,
                size: 50,
                color: _StadiumNights.gold.withOpacity(0.5),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'SIN TORNEOS',
              style: GoogleFonts.bebasNeue(
                fontSize: 24,
                color: _StadiumNights.textPrimary,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Aún no has creado ningún torneo.\nPresiona el botón para crear uno.',
              textAlign: TextAlign.center,
              style: GoogleFonts.outfit(
                fontSize: 14,
                color: _StadiumNights.textSecondary,
              ),
            ),
            const SizedBox(height: 32),
            GestureDetector(
              onTap: () => _navigateToCreate(context),
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [_StadiumNights.gold, _StadiumNights.amber],
                  ),
                  borderRadius: BorderRadius.circular(10),
                  boxShadow: [
                    BoxShadow(
                      color: _StadiumNights.gold.withOpacity(0.3),
                      blurRadius: 12,
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.add, color: Colors.black, size: 18),
                    const SizedBox(width: 8),
                    Text(
                      'CREAR TORNEO',
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

  Widget _buildTournamentsList(
      BuildContext context, List<TournamentEntity> tournaments) {
    // Sort: active first, then by start date
    final sorted = List<TournamentEntity>.from(tournaments)
      ..sort((a, b) {
        if (a.isCurrentlyActive && !b.isCurrentlyActive) return -1;
        if (!a.isCurrentlyActive && b.isCurrentlyActive) return 1;
        if (a.isUpcoming && !b.isUpcoming) return -1;
        if (!a.isUpcoming && b.isUpcoming) return 1;
        return b.startDate.compareTo(a.startDate);
      });

    return RefreshIndicator(
      onRefresh: () async {
        if (user.leagueId != null) {
          context.read<TournamentBloc>().add(
                LoadTournamentsByLeagueEvent(leagueId: user.leagueId!),
              );
        }
      },
      color: _StadiumNights.gold,
      backgroundColor: _StadiumNights.cardDark,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: sorted.length,
        itemBuilder: (context, index) {
          return _TournamentCard(
            tournament: sorted[index],
            index: index,
            onTap: () => _showTournamentDetails(context, sorted[index]),
          );
        },
      ),
    );
  }

  void _navigateToCreate(BuildContext context) {
    if (user.leagueId == null) return;

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (ctx) => BlocProvider.value(
          value: context.read<TournamentBloc>(),
          child: CreateTournamentScreen(
            leagueId: user.leagueId!,
          ),
        ),
      ),
    );
  }

  void _showTournamentDetails(BuildContext context, TournamentEntity tournament) {
    final dateFormat = DateFormat('dd/MM/yyyy');

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => Container(
        decoration: BoxDecoration(
          color: _StadiumNights.cardDark,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.all(24),
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
                  color: _StadiumNights.textMuted,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Title
            Text(
              tournament.name,
              style: GoogleFonts.bebasNeue(
                fontSize: 28,
                color: _StadiumNights.textPrimary,
                letterSpacing: 1,
              ),
            ),
            const SizedBox(height: 16),

            // Status badge
            _buildStatusBadge(tournament),
            const SizedBox(height: 20),

            // Info rows
            _buildInfoRow(Icons.emoji_events, 'Formato', tournament.formatText),
            _buildInfoRow(Icons.description, 'Detalle', tournament.formatDescription),
            _buildInfoRow(
              Icons.calendar_today,
              'Fecha Inicio',
              dateFormat.format(tournament.startDate),
            ),
            _buildInfoRow(
              Icons.event,
              'Fecha Fin',
              dateFormat.format(tournament.endDate),
            ),
            _buildInfoRow(
              Icons.timelapse,
              'Duración',
              '${tournament.durationInDays} días',
            ),
            if (tournament.maxPlayers != null)
              _buildInfoRow(
                Icons.people,
                'Máx. Jugadores',
                '${tournament.maxPlayers}',
              ),
            _buildInfoRow(
              Icons.supervisor_account,
              'Máx. Cuerpo Técnico',
              '${tournament.maxCoachingStaff}',
            ),

            const SizedBox(height: 24),

            // Actions
            if (tournament.format == TournamentFormat.groupKnockout) ...[
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => GroupsManagementScreen(
                            tournament: tournament),
                      ),
                    );
                  },
                  icon: const Icon(Icons.group_work, size: 20),
                  label: const Text('GESTIONAR GRUPOS'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _StadiumNights.neonBlue,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 8),
            ],
            // Ver Liguilla — available for all formats (league can have playoffs too)
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.pop(context);
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => PlayoffBracketViewerScreen(
                        tournamentId: tournament.id,
                        tournamentName: tournament.name,
                        user: user,
                      ),
                    ),
                  );
                },
                icon: const Icon(Icons.account_tree, size: 20),
                label: const Text('VER LIGUILLA'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _StadiumNights.neonGreen,
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            // Generar Liguilla — available for all formats
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.pop(context);
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => PlayoffBracketScreen(
                          tournament: tournament),
                    ),
                  );
                },
                icon: const Icon(Icons.emoji_events, size: 20),
                label: const Text('GENERAR LIGUILLA'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _StadiumNights.gold,
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close),
                    label: const Text('CERRAR'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: _StadiumNights.textSecondary,
                      side: BorderSide(color: _StadiumNights.textMuted),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusBadge(TournamentEntity tournament) {
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
    } else if (tournament.hasFinished) {
      statusColor = _StadiumNights.textMuted;
      statusText = 'FINALIZADO';
      statusIcon = Icons.check_circle;
    } else {
      statusColor = _StadiumNights.amber;
      statusText = tournament.isActive ? 'ACTIVO' : 'INACTIVO';
      statusIcon = Icons.info;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: statusColor.withOpacity(0.15),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: statusColor.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(statusIcon, size: 16, color: statusColor),
          const SizedBox(width: 8),
          Text(
            statusText,
            style: GoogleFonts.outfit(
              fontSize: 12,
              color: statusColor,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, size: 18, color: _StadiumNights.gold),
          const SizedBox(width: 12),
          Text(
            '$label:',
            style: GoogleFonts.outfit(
              fontSize: 13,
              color: _StadiumNights.textMuted,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              value,
              style: GoogleFonts.outfit(
                fontSize: 14,
                color: _StadiumNights.textPrimary,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Tournament Card Widget
class _TournamentCard extends StatelessWidget {
  final TournamentEntity tournament;
  final int index;
  final VoidCallback onTap;

  const _TournamentCard({
    required this.tournament,
    required this.index,
    required this.onTap,
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
      child: GestureDetector(
        onTap: onTap,
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
                        Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            color: _StadiumNights.gold.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: _StadiumNights.gold.withOpacity(0.3),
                            ),
                          ),
                          child: Icon(
                            Icons.emoji_events,
                            color: _StadiumNights.gold,
                            size: 24,
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                tournament.name,
                                style: GoogleFonts.bebasNeue(
                                  fontSize: 20,
                                  color: _StadiumNights.textPrimary,
                                  letterSpacing: 1,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                tournament.formatText,
                                style: GoogleFonts.outfit(
                                  fontSize: 12,
                                  color: _StadiumNights.textMuted,
                                ),
                              ),
                            ],
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
                        const SizedBox(width: 16),
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
      ),
    );
  }
}
