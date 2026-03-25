import 'dart:convert';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import '../../../core/di/injection.dart';
import '../../../domain/entities/match_entity.dart';
import '../../../domain/entities/player_stats_entity.dart';
import '../../../domain/entities/user_entity.dart';
import '../../bloc/match_detail/match_detail_bloc.dart';
import '../../bloc/match_detail/match_detail_event.dart';
import '../../bloc/match_detail/match_detail_state.dart';
import 'match_result_entry_screen.dart';

/// Stadium Nights Design System
class _StadiumNights {
  static const Color backgroundDark = Color(0xFF050508);
  static const Color surfaceDark = Color(0xFF0A0A0F);
  static const Color cardDark = Color(0xFF12121A);
  static const Color gold = Color(0xFFFFD700);
  static const Color amber = Color(0xFFF59E0B);
  static const Color neonGreen = Color(0xFF00FF7F);
  static const Color neonBlue = Color(0xFF00BFFF);
  static const Color success = Color(0xFF10B981);
  static const Color error = Color(0xFFEF4444);
  static const Color textPrimary = Color(0xFFFAFAFA);
  static const Color textSecondary = Color(0xFF9CA3AF);
  static const Color textMuted = Color(0xFF6B7280);
}

class MatchDetailScreen extends StatelessWidget {
  final String matchId;
  final UserEntity user;

  const MatchDetailScreen({
    super.key,
    required this.matchId,
    required this.user,
  });

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) {
        final bloc = sl<MatchDetailBloc>();
        bloc.add(LoadMatchDetailEvent(matchId: matchId));
        return bloc;
      },
      child: _MatchDetailView(matchId: matchId, user: user),
    );
  }
}

class _MatchDetailView extends StatelessWidget {
  final String matchId;
  final UserEntity user;

  const _MatchDetailView({required this.matchId, required this.user});

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
        body: BlocConsumer<MatchDetailBloc, MatchDetailState>(
          listener: (context, state) {
            if (state is MatchStatusUpdated) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    'Estado actualizado: ${state.match.statusText}',
                  ),
                  backgroundColor: _StadiumNights.success,
                ),
              );
              // Refresh to get full detail
              context
                  .read<MatchDetailBloc>()
                  .add(RefreshMatchDetailEvent(matchId: matchId));
            } else if (state is MatchStatusUpdateError) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(state.message),
                  backgroundColor: _StadiumNights.error,
                ),
              );
              // Refresh to restore previous state
              context
                  .read<MatchDetailBloc>()
                  .add(RefreshMatchDetailEvent(matchId: matchId));
            }
          },
          buildWhen: (previous, current) =>
              current is MatchDetailLoading ||
              current is MatchDetailLoaded ||
              current is MatchDetailError ||
              current is MatchStatusUpdating,
          builder: (context, state) {
            if (state is MatchDetailLoading || state is MatchStatusUpdating) {
              return _buildLoadingState();
            }

            if (state is MatchDetailError) {
              return _buildErrorState(context, state.message);
            }

            if (state is MatchDetailLoaded) {
              return _buildContent(context, state);
            }

            return _buildLoadingState();
          },
        ),
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
          child: const Icon(
            Icons.arrow_back,
            color: _StadiumNights.gold,
            size: 18,
          ),
        ),
        onPressed: () => Navigator.pop(context),
      ),
      title: BlocBuilder<MatchDetailBloc, MatchDetailState>(
        builder: (context, state) {
          String subtitle = '';
          if (state is MatchDetailLoaded) {
            subtitle = state.match.tournamentName ?? '';
          }
          return Column(
            children: [
              Text(
                'DETALLE DEL PARTIDO',
                style: GoogleFonts.bebasNeue(
                  fontSize: 20,
                  color: _StadiumNights.textPrimary,
                  letterSpacing: 2,
                ),
              ),
              if (subtitle.isNotEmpty)
                Text(
                  subtitle.toUpperCase(),
                  style: GoogleFonts.outfit(
                    fontSize: 11,
                    color: _StadiumNights.gold,
                    fontWeight: FontWeight.w500,
                  ),
                ),
            ],
          );
        },
      ),
      centerTitle: true,
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
              valueColor:
                  const AlwaysStoppedAnimation<Color>(_StadiumNights.gold),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'CARGANDO PARTIDO',
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
              child: const Icon(
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
                context
                    .read<MatchDetailBloc>()
                    .add(LoadMatchDetailEvent(matchId: matchId));
              },
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
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

  Widget _buildContent(BuildContext context, MatchDetailLoaded state) {
    final match = state.match;
    final isAdmin = user.isLeagueAdmin || user.isSuperAdmin;

    return RefreshIndicator(
      onRefresh: () async {
        context
            .read<MatchDetailBloc>()
            .add(RefreshMatchDetailEvent(matchId: matchId));
      },
      color: _StadiumNights.gold,
      backgroundColor: _StadiumNights.cardDark,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            _MatchHeaderCard(match: match),
            const SizedBox(height: 16),
            _MatchInfoCard(match: match),
            const SizedBox(height: 16),
            // Admin action buttons
            if (isAdmin) ...[
              if (match.status == MatchStatus.scheduled) ...[
                _buildStartMatchButton(context, match),
                const SizedBox(height: 10),
              ],
              if (match.isPending) ...[
                _buildEditResultButton(context, match),
                const SizedBox(height: 10),
              ],
              if (match.status != MatchStatus.finished &&
                  match.status != MatchStatus.cancelled) ...[
                _buildCancelMatchButton(context, match),
                const SizedBox(height: 16),
              ],
            ],
            // Referee observations card (for finished matches)
            if (match.status == MatchStatus.finished &&
                state.refereeObservations != null &&
                state.refereeObservations!.isNotEmpty) ...[
              _ObservationsCard(observations: state.refereeObservations!),
              const SizedBox(height: 16),
            ],
            _PlayerStatsTabs(
              homePlayerStats: state.homePlayerStats,
              awayPlayerStats: state.awayPlayerStats,
              homeTeamName: match.homeTeam?.name ?? 'Local',
              awayTeamName: match.awayTeam?.name ?? 'Visitante',
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildEditResultButton(BuildContext context, MatchEntity match) {
    return GestureDetector(
      onTap: () => _openResultEntryWizard(context, match),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [_StadiumNights.gold, _StadiumNights.amber],
          ),
          borderRadius: BorderRadius.circular(14),
          boxShadow: [
            BoxShadow(
              color: _StadiumNights.gold.withOpacity(0.3),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.edit, color: Colors.black, size: 20),
            const SizedBox(width: 8),
            Text(
              'EDITAR RESULTADO',
              style: GoogleFonts.bebasNeue(
                fontSize: 16,
                color: Colors.black,
                letterSpacing: 2,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _openResultEntryWizard(BuildContext context, MatchEntity match) {
    final bloc = context.read<MatchDetailBloc>();
    Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => MatchResultEntryScreen(
          match: match,
          user: user,
          matchDetailBloc: bloc,
        ),
      ),
    ).then((saved) {
      if (saved == true) {
        _showSuccessDialog(context, match);
        // Refresh match detail
        context
            .read<MatchDetailBloc>()
            .add(RefreshMatchDetailEvent(matchId: matchId));
      }
    });
  }

  void _showSuccessDialog(BuildContext context, MatchEntity match) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => Dialog(
        backgroundColor: _StadiumNights.cardDark,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 70,
                height: 70,
                decoration: BoxDecoration(
                  color: _StadiumNights.neonGreen.withOpacity(0.15),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.check_circle,
                  size: 40,
                  color: _StadiumNights.neonGreen,
                ),
              ),
              const SizedBox(height: 20),
              Text(
                'PARTIDO FINALIZADO',
                style: GoogleFonts.bebasNeue(
                  fontSize: 24,
                  color: _StadiumNights.neonGreen,
                  letterSpacing: 2,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Resultado registrado exitosamente',
                style: GoogleFonts.outfit(
                  fontSize: 14,
                  color: _StadiumNights.textSecondary,
                ),
              ),
              const SizedBox(height: 24),
              GestureDetector(
                onTap: () => Navigator.pop(ctx),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [_StadiumNights.gold, _StadiumNights.amber],
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    'ACEPTAR',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.bebasNeue(
                      fontSize: 16,
                      color: Colors.black,
                      letterSpacing: 1.5,
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

  Widget _buildStartMatchButton(BuildContext context, MatchEntity match) {
    return GestureDetector(
      onTap: () => _showStatusConfirmDialog(
        context,
        match,
        MatchStatus.inProgress,
        'INICIAR PARTIDO',
        'El partido pasará a estado "En Progreso".',
        _StadiumNights.neonGreen,
      ),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              _StadiumNights.neonGreen,
              _StadiumNights.neonGreen.withOpacity(0.8),
            ],
          ),
          borderRadius: BorderRadius.circular(14),
          boxShadow: [
            BoxShadow(
              color: _StadiumNights.neonGreen.withOpacity(0.3),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.play_arrow, color: Colors.black, size: 22),
            const SizedBox(width: 8),
            Text(
              'INICIAR PARTIDO',
              style: GoogleFonts.bebasNeue(
                fontSize: 16,
                color: Colors.black,
                letterSpacing: 2,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCancelMatchButton(BuildContext context, MatchEntity match) {
    return GestureDetector(
      onTap: () => _showStatusConfirmDialog(
        context,
        match,
        MatchStatus.cancelled,
        'CANCELAR PARTIDO',
        'El partido será marcado como "Cancelado". Esta acción no se puede deshacer.',
        _StadiumNights.error,
      ),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: _StadiumNights.error.withOpacity(0.5),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.cancel_outlined,
                color: _StadiumNights.error, size: 20),
            const SizedBox(width: 8),
            Text(
              'CANCELAR PARTIDO',
              style: GoogleFonts.bebasNeue(
                fontSize: 14,
                color: _StadiumNights.error,
                letterSpacing: 2,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showStatusConfirmDialog(
    BuildContext context,
    MatchEntity match,
    MatchStatus status,
    String title,
    String message,
    Color accentColor,
  ) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: _StadiumNights.cardDark,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          title,
          style: GoogleFonts.bebasNeue(
            fontSize: 22,
            color: accentColor,
            letterSpacing: 2,
          ),
          textAlign: TextAlign.center,
        ),
        content: Text(
          message,
          textAlign: TextAlign.center,
          style: GoogleFonts.outfit(
            fontSize: 14,
            color: _StadiumNights.textSecondary,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(
              'CANCELAR',
              style: GoogleFonts.bebasNeue(
                fontSize: 14,
                color: _StadiumNights.textMuted,
                letterSpacing: 1,
              ),
            ),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              context.read<MatchDetailBloc>().add(
                    UpdateMatchStatusEvent(
                      matchId: match.id,
                      status: status,
                    ),
                  );
            },
            child: Text(
              'CONFIRMAR',
              style: GoogleFonts.bebasNeue(
                fontSize: 14,
                color: accentColor,
                letterSpacing: 1,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ==================== Match Header Card ====================

class _MatchHeaderCard extends StatelessWidget {
  final MatchEntity match;

  const _MatchHeaderCard({required this.match});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
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
              color: _StadiumNights.gold.withOpacity(0.2),
            ),
          ),
          child: Column(
            children: [
              // Status badge
              _buildStatusBadge(),
              const SizedBox(height: 16),
              // Teams + score row
              Row(
                children: [
                  // Home team
                  Expanded(
                    child: Column(
                      children: [
                        _buildTeamLogo(match.homeTeam),
                        const SizedBox(height: 10),
                        Text(
                          match.homeTeam?.name ?? 'Local',
                          textAlign: TextAlign.center,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.outfit(
                            fontSize: 14,
                            color: _StadiumNights.textPrimary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Score
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: match.hasResult
                        ? Row(
                            children: [
                              Text(
                                '${match.homeScore}',
                                style: GoogleFonts.bebasNeue(
                                  fontSize: 48,
                                  color: _StadiumNights.textPrimary,
                                ),
                              ),
                              Padding(
                                padding:
                                    const EdgeInsets.symmetric(horizontal: 8),
                                child: Text(
                                  '-',
                                  style: GoogleFonts.bebasNeue(
                                    fontSize: 36,
                                    color: _StadiumNights.textMuted,
                                  ),
                                ),
                              ),
                              Text(
                                '${match.awayScore}',
                                style: GoogleFonts.bebasNeue(
                                  fontSize: 48,
                                  color: _StadiumNights.textPrimary,
                                ),
                              ),
                            ],
                          )
                        : Text(
                            'VS',
                            style: GoogleFonts.bebasNeue(
                              fontSize: 32,
                              color: _StadiumNights.gold,
                            ),
                          ),
                  ),
                  // Away team
                  Expanded(
                    child: Column(
                      children: [
                        _buildTeamLogo(match.awayTeam),
                        const SizedBox(height: 10),
                        Text(
                          match.awayTeam?.name ?? 'Visitante',
                          textAlign: TextAlign.center,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.outfit(
                            fontSize: 14,
                            color: _StadiumNights.textPrimary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusBadge() {
    Color badgeColor;
    switch (match.status) {
      case MatchStatus.scheduled:
        badgeColor = _StadiumNights.neonBlue;
        break;
      case MatchStatus.inProgress:
        badgeColor = _StadiumNights.neonGreen;
        break;
      case MatchStatus.finished:
        badgeColor = _StadiumNights.textMuted;
        break;
      case MatchStatus.cancelled:
        badgeColor = _StadiumNights.error;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      decoration: BoxDecoration(
        color: badgeColor.withOpacity(0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: badgeColor.withOpacity(0.4)),
      ),
      child: Text(
        match.statusText.toUpperCase(),
        style: GoogleFonts.bebasNeue(
          fontSize: 13,
          color: badgeColor,
          letterSpacing: 1.5,
        ),
      ),
    );
  }

  Widget _buildTeamLogo(MatchTeamInfo? team) {
    return Container(
      width: 68,
      height: 68,
      decoration: BoxDecoration(
        color: _StadiumNights.surfaceDark,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _StadiumNights.gold.withOpacity(0.2)),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(14),
        child: team?.logo != null
            ? _buildLogoImage(team!.logo!, 68)
            : const Icon(Icons.shield, size: 34, color: _StadiumNights.gold),
      ),
    );
  }
}

// ==================== Match Info Card ====================

class _MatchInfoCard extends StatelessWidget {
  final MatchEntity match;

  const _MatchInfoCard({required this.match});

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('EEEE d MMMM, yyyy', 'es');

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: _StadiumNights.cardDark,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Colors.white.withOpacity(0.06),
        ),
      ),
      child: Column(
        children: [
          _buildInfoRow(
            Icons.calendar_today,
            'FECHA',
            dateFormat.format(match.matchDate),
          ),
          if (match.matchTime != null) ...[
            const SizedBox(height: 14),
            _buildInfoRow(
              Icons.access_time,
              'HORA',
              match.matchTime!,
            ),
          ],
          if (match.fieldNumber != null) ...[
            const SizedBox(height: 14),
            _buildInfoRow(
              Icons.stadium,
              'CANCHA',
              'Cancha ${match.fieldNumber}',
            ),
          ],
          const SizedBox(height: 14),
          _buildInfoRow(
            Icons.flag,
            'FASE',
            match.roundText.isNotEmpty ? match.roundText : 'N/A',
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: _StadiumNights.gold.withOpacity(0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, size: 18, color: _StadiumNights.gold),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: GoogleFonts.bebasNeue(
                  fontSize: 11,
                  color: _StadiumNights.textMuted,
                  letterSpacing: 1.5,
                ),
              ),
              Text(
                value,
                style: GoogleFonts.outfit(
                  fontSize: 14,
                  color: _StadiumNights.textPrimary,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ==================== Player Stats Tabs ====================

class _PlayerStatsTabs extends StatelessWidget {
  final List<PlayerStatsEntity> homePlayerStats;
  final List<PlayerStatsEntity> awayPlayerStats;
  final String homeTeamName;
  final String awayTeamName;

  const _PlayerStatsTabs({
    required this.homePlayerStats,
    required this.awayPlayerStats,
    required this.homeTeamName,
    required this.awayTeamName,
  });

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Column(
        children: [
          Container(
            decoration: BoxDecoration(
              color: _StadiumNights.cardDark,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.white.withOpacity(0.06)),
            ),
            child: TabBar(
              indicatorColor: _StadiumNights.gold,
              indicatorWeight: 3,
              labelColor: _StadiumNights.gold,
              unselectedLabelColor: _StadiumNights.textMuted,
              labelStyle: GoogleFonts.bebasNeue(
                fontSize: 15,
                letterSpacing: 1.5,
              ),
              unselectedLabelStyle: GoogleFonts.bebasNeue(
                fontSize: 15,
                letterSpacing: 1.5,
              ),
              dividerHeight: 0,
              tabs: [
                Tab(text: homeTeamName.toUpperCase()),
                Tab(text: awayTeamName.toUpperCase()),
              ],
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            // Give enough height for the tab content
            height: _calculateTabHeight(homePlayerStats, awayPlayerStats),
            child: TabBarView(
              children: [
                _PlayerStatsTable(stats: homePlayerStats),
                _PlayerStatsTable(stats: awayPlayerStats),
              ],
            ),
          ),
        ],
      ),
    );
  }

  double _calculateTabHeight(
    List<PlayerStatsEntity> home,
    List<PlayerStatsEntity> away,
  ) {
    final maxRows =
        home.length > away.length ? home.length : away.length;
    if (maxRows == 0) return 120;
    // header (48) + rows (48 each) + padding
    return 48 + (maxRows * 48) + 24;
  }
}

// ==================== Player Stats Table ====================

class _PlayerStatsTable extends StatelessWidget {
  final List<PlayerStatsEntity> stats;

  const _PlayerStatsTable({required this.stats});

  @override
  Widget build(BuildContext context) {
    if (stats.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: _StadiumNights.cardDark,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white.withOpacity(0.06)),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.analytics_outlined,
              size: 36,
              color: _StadiumNights.textMuted.withOpacity(0.5),
            ),
            const SizedBox(height: 12),
            Text(
              'No hay estadísticas registradas',
              style: GoogleFonts.outfit(
                fontSize: 14,
                color: _StadiumNights.textMuted,
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: _StadiumNights.cardDark,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withOpacity(0.06)),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(14),
        child: Column(
          children: [
            // Header
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              decoration: BoxDecoration(
                color: _StadiumNights.gold.withOpacity(0.08),
              ),
              child: Row(
                children: [
                  _headerCell('#', 32),
                  _headerCell('JUGADOR', null, flex: 1),
                  _headerCell('G', 32),
                  _headerCell('A', 32),
                  _headerCell('TA', 32),
                  _headerCell('TR', 32),
                  _headerCell('MIN', 40),
                ],
              ),
            ),
            // Rows
            ...stats.asMap().entries.map((entry) {
              final index = entry.key;
              final player = entry.value;
              return Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: index.isEven
                      ? Colors.transparent
                      : Colors.white.withOpacity(0.02),
                  border: Border(
                    bottom: BorderSide(
                      color: Colors.white.withOpacity(0.04),
                    ),
                  ),
                ),
                child: Row(
                  children: [
                    _dataCell(
                      player.jerseyNumber?.toString() ?? '-',
                      32,
                      color: _StadiumNights.textMuted,
                    ),
                    Expanded(
                      child: Text(
                        player.playerName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.outfit(
                          fontSize: 13,
                          color: _StadiumNights.textPrimary,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                    _dataCell(
                      '${player.goals}',
                      32,
                      color: player.goals > 0
                          ? _StadiumNights.neonGreen
                          : _StadiumNights.textMuted,
                    ),
                    _dataCell(
                      '${player.assists}',
                      32,
                      color: player.assists > 0
                          ? _StadiumNights.neonBlue
                          : _StadiumNights.textMuted,
                    ),
                    _dataCell(
                      '${player.yellowCards}',
                      32,
                      color: player.yellowCards > 0
                          ? _StadiumNights.amber
                          : _StadiumNights.textMuted,
                    ),
                    _dataCell(
                      '${player.redCards}',
                      32,
                      color: player.redCards > 0
                          ? _StadiumNights.error
                          : _StadiumNights.textMuted,
                    ),
                    _dataCell(
                      '${player.minutesPlayed}',
                      40,
                      color: _StadiumNights.textSecondary,
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _headerCell(String text, double? width, {int flex = 0}) {
    final child = Text(
      text,
      textAlign: TextAlign.center,
      style: GoogleFonts.bebasNeue(
        fontSize: 12,
        color: _StadiumNights.gold,
        letterSpacing: 1,
      ),
    );

    if (flex > 0) {
      return Expanded(
        flex: flex,
        child: Align(alignment: Alignment.centerLeft, child: child),
      );
    }
    return SizedBox(width: width, child: Center(child: child));
  }

  Widget _dataCell(String text, double width, {Color? color}) {
    return SizedBox(
      width: width,
      child: Text(
        text,
        textAlign: TextAlign.center,
        style: GoogleFonts.outfit(
          fontSize: 13,
          color: color ?? _StadiumNights.textPrimary,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}

// ==================== Observations Card ====================

class _ObservationsCard extends StatelessWidget {
  final String observations;

  const _ObservationsCard({required this.observations});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: _StadiumNights.cardDark,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Colors.white.withOpacity(0.06),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: _StadiumNights.amber.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child:
                    const Icon(Icons.note_alt, size: 18, color: _StadiumNights.amber),
              ),
              const SizedBox(width: 14),
              Text(
                'OBSERVACIONES DEL ARBITRO',
                style: GoogleFonts.bebasNeue(
                  fontSize: 14,
                  color: _StadiumNights.amber,
                  letterSpacing: 1.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            observations,
            style: GoogleFonts.outfit(
              fontSize: 14,
              color: _StadiumNights.textSecondary,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}

// ==================== Shared Logo Helpers ====================

Widget _buildLogoImage(String logoData, double size) {
  try {
    if (logoData.startsWith('data:image/')) {
      final base64Data = logoData.split(',')[1];
      final Uint8List bytes = base64Decode(base64Data);
      return Image.memory(
        bytes,
        width: size,
        height: size,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) =>
            Icon(Icons.shield, size: size * 0.5, color: _StadiumNights.gold),
      );
    } else {
      return Image.network(
        logoData,
        width: size,
        height: size,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) =>
            Icon(Icons.shield, size: size * 0.5, color: _StadiumNights.gold),
      );
    }
  } catch (e) {
    return Icon(Icons.shield, size: size * 0.5, color: _StadiumNights.gold);
  }
}
