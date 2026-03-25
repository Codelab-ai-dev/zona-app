import 'dart:convert';
import 'dart:typed_data';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import '../../../core/di/injection.dart';
import '../../../domain/entities/match_entity.dart';
import '../../../domain/entities/user_entity.dart';
import '../../bloc/match/match_bloc.dart';
import '../../bloc/match/match_event.dart';
import '../../bloc/match/match_state.dart';
import 'match_detail_screen.dart';

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

/// Pending Matches Screen
class PendingMatchesScreen extends StatelessWidget {
  final UserEntity user;

  const PendingMatchesScreen({
    super.key,
    required this.user,
  });

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) {
        final bloc = sl<MatchBloc>();
        if (user.leagueId != null) {
          bloc.add(LoadPendingMatchesEvent(leagueId: user.leagueId!));
        }
        return bloc;
      },
      child: _PendingMatchesView(user: user),
    );
  }
}

class _PendingMatchesView extends StatefulWidget {
  final UserEntity user;

  const _PendingMatchesView({required this.user});

  @override
  State<_PendingMatchesView> createState() => _PendingMatchesViewState();
}

class _PendingMatchesViewState extends State<_PendingMatchesView> {
  String? _selectedTournamentId;

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
        body: BlocConsumer<MatchBloc, MatchState>(
          listener: (context, state) {
            if (state is MatchResultUpdated) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    'Resultado guardado: ${state.match.resultText}',
                  ),
                  backgroundColor: _StadiumNights.success,
                ),
              );
              // Reload matches
              if (widget.user.leagueId != null) {
                context.read<MatchBloc>().add(
                      LoadPendingMatchesEvent(leagueId: widget.user.leagueId!),
                    );
              }
            } else if (state is MatchError) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(state.message),
                  backgroundColor: _StadiumNights.error,
                ),
              );
            }
          },
          builder: (context, state) {
            if (widget.user.leagueId == null) {
              return _buildNoLeagueState();
            }

            if (state is MatchLoading) {
              return _buildLoadingState();
            }

            if (state is MatchError) {
              return _buildErrorState(context, state.message);
            }

            if (state is MatchesLoaded) {
              if (state.matches.isEmpty) {
                return _buildEmptyState();
              }
              return _buildMatchesList(context, state.matches);
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
          child: Icon(
            Icons.arrow_back,
            color: _StadiumNights.gold,
            size: 18,
          ),
        ),
        onPressed: () => Navigator.pop(context),
      ),
      title: Text(
        'REGISTRAR RESULTADOS',
        style: GoogleFonts.bebasNeue(
          fontSize: 22,
          color: _StadiumNights.textPrimary,
          letterSpacing: 2,
        ),
      ),
      centerTitle: true,
      actions: [
        if (widget.user.leagueId != null)
          IconButton(
            icon: Icon(Icons.refresh, color: _StadiumNights.gold),
            onPressed: () {
              context.read<MatchBloc>().add(
                    LoadPendingMatchesEvent(leagueId: widget.user.leagueId!),
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
            'CARGANDO PARTIDOS',
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
                if (widget.user.leagueId != null) {
                  context.read<MatchBloc>().add(
                        LoadPendingMatchesEvent(leagueId: widget.user.leagueId!),
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

  Widget _buildEmptyState() {
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
                    _StadiumNights.neonGreen.withOpacity(0.1),
                    Colors.transparent,
                  ],
                ),
              ),
              child: Icon(
                Icons.check_circle,
                size: 50,
                color: _StadiumNights.neonGreen.withOpacity(0.7),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'SIN PARTIDOS PENDIENTES',
              style: GoogleFonts.bebasNeue(
                fontSize: 24,
                color: _StadiumNights.textPrimary,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'No hay partidos programados pendientes\nde registrar resultado.',
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

  Widget _buildMatchesList(BuildContext context, List<MatchEntity> matches) {
    // Get unique tournaments for filter
    final Map<String, String> tournaments = {}; // id -> name
    for (final match in matches) {
      if (match.tournamentId != null && match.tournamentName != null) {
        tournaments[match.tournamentId!] = match.tournamentName!;
      }
    }

    // Filter matches by selected tournament
    final filteredMatches = _selectedTournamentId == null
        ? matches
        : matches.where((m) => m.tournamentId == _selectedTournamentId).toList();

    // Group filtered matches by tournament
    final Map<String, List<MatchEntity>> groupedMatches = {};
    for (final match in filteredMatches) {
      final key = match.tournamentName ?? 'Sin Torneo';
      if (!groupedMatches.containsKey(key)) {
        groupedMatches[key] = [];
      }
      groupedMatches[key]!.add(match);
    }

    return RefreshIndicator(
      onRefresh: () async {
        if (widget.user.leagueId != null) {
          context.read<MatchBloc>().add(
                LoadPendingMatchesEvent(leagueId: widget.user.leagueId!),
              );
        }
      },
      color: _StadiumNights.gold,
      backgroundColor: _StadiumNights.cardDark,
      child: Column(
        children: [
          // Tournament Filter
          if (tournaments.length > 1)
            Container(
              margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              decoration: BoxDecoration(
                color: _StadiumNights.cardDark,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: _StadiumNights.gold.withOpacity(0.2),
                ),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String?>(
                  value: _selectedTournamentId,
                  isExpanded: true,
                  dropdownColor: _StadiumNights.cardDark,
                  icon: Icon(
                    Icons.keyboard_arrow_down,
                    color: _StadiumNights.gold,
                  ),
                  hint: Row(
                    children: [
                      Icon(
                        Icons.filter_list,
                        size: 18,
                        color: _StadiumNights.gold,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Todos los torneos (${matches.length})',
                        style: GoogleFonts.outfit(
                          fontSize: 14,
                          color: _StadiumNights.textPrimary,
                        ),
                      ),
                    ],
                  ),
                  items: [
                    DropdownMenuItem<String?>(
                      value: null,
                      child: Row(
                        children: [
                          Icon(
                            Icons.filter_list,
                            size: 18,
                            color: _StadiumNights.gold,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Todos los torneos (${matches.length})',
                            style: GoogleFonts.outfit(
                              fontSize: 14,
                              color: _StadiumNights.textPrimary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    ...tournaments.entries.map((entry) {
                      final count = matches
                          .where((m) => m.tournamentId == entry.key)
                          .length;
                      return DropdownMenuItem<String?>(
                        value: entry.key,
                        child: Row(
                          children: [
                            Icon(
                              Icons.emoji_events,
                              size: 18,
                              color: _StadiumNights.gold,
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                '${entry.value} ($count)',
                                style: GoogleFonts.outfit(
                                  fontSize: 14,
                                  color: _StadiumNights.textPrimary,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      );
                    }),
                  ],
                  onChanged: (value) {
                    setState(() {
                      _selectedTournamentId = value;
                    });
                  },
                ),
              ),
            ),

          // Matches list
          Expanded(
            child: filteredMatches.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(40),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.search_off,
                            size: 50,
                            color: _StadiumNights.textMuted,
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'SIN PARTIDOS',
                            style: GoogleFonts.bebasNeue(
                              fontSize: 20,
                              color: _StadiumNights.textPrimary,
                              letterSpacing: 2,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'No hay partidos pendientes\nen este torneo.',
                            textAlign: TextAlign.center,
                            style: GoogleFonts.outfit(
                              fontSize: 14,
                              color: _StadiumNights.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: groupedMatches.length,
                    itemBuilder: (context, index) {
                      final tournamentName =
                          groupedMatches.keys.elementAt(index);
                      final tournamentMatches = groupedMatches[tournamentName]!;

                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Tournament header
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            child: Row(
                              children: [
                                Icon(
                                  Icons.emoji_events,
                                  color: _StadiumNights.gold,
                                  size: 20,
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    tournamentName.toUpperCase(),
                                    style: GoogleFonts.bebasNeue(
                                      fontSize: 16,
                                      color: _StadiumNights.gold,
                                      letterSpacing: 2,
                                    ),
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 10,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    color: _StadiumNights.gold.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Text(
                                    '${tournamentMatches.length}',
                                    style: GoogleFonts.bebasNeue(
                                      fontSize: 14,
                                      color: _StadiumNights.gold,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          // Matches
                          ...tournamentMatches.asMap().entries.map((entry) {
                            return _MatchCard(
                              match: entry.value,
                              index: entry.key,
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => MatchDetailScreen(
                                      matchId: entry.value.id,
                                      user: widget.user,
                                    ),
                                  ),
                                ).then((_) {
                                  // Refresh list when returning from detail
                                  if (widget.user.leagueId != null) {
                                    context.read<MatchBloc>().add(
                                          LoadPendingMatchesEvent(
                                            leagueId: widget.user.leagueId!,
                                          ),
                                        );
                                  }
                                });
                              },
                            );
                          }),
                          const SizedBox(height: 8),
                        ],
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

}

/// Match Card Widget
class _MatchCard extends StatelessWidget {
  final MatchEntity match;
  final int index;
  final VoidCallback onTap;

  const _MatchCard({
    required this.match,
    required this.index,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('dd/MM');
    final timeFormat = DateFormat('HH:mm');

    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.0, end: 1.0),
      duration: Duration(milliseconds: 300 + (index * 50)),
      curve: Curves.easeOutCubic,
      builder: (context, value, child) {
        return Transform.translate(
          offset: Offset(0, 15 * (1 - value)),
          child: Opacity(opacity: value, child: child),
        );
      },
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          margin: const EdgeInsets.only(bottom: 12),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(16),
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
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: _StadiumNights.gold.withOpacity(0.15),
                  ),
                ),
                child: Column(
                  children: [
                    // Date and round info
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Icon(
                              Icons.calendar_today,
                              size: 14,
                              color: _StadiumNights.textMuted,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              dateFormat.format(match.matchDate),
                              style: GoogleFonts.outfit(
                                fontSize: 12,
                                color: _StadiumNights.textMuted,
                              ),
                            ),
                            if (match.matchTime != null) ...[
                              const SizedBox(width: 8),
                              Text(
                                match.matchTime!,
                                style: GoogleFonts.outfit(
                                  fontSize: 12,
                                  color: _StadiumNights.textMuted,
                                ),
                              ),
                            ],
                          ],
                        ),
                        Text(
                          match.roundText,
                          style: GoogleFonts.outfit(
                            fontSize: 12,
                            color: _StadiumNights.neonBlue,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Teams
                    Row(
                      children: [
                        // Home team
                        Expanded(
                          child: Row(
                            children: [
                              _buildSmallLogo(match.homeTeam?.logo),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  match.homeTeam?.name ?? 'Local',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: GoogleFonts.outfit(
                                    fontSize: 14,
                                    color: _StadiumNights.textPrimary,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),

                        // VS / Score
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: _StadiumNights.gold.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            'VS',
                            style: GoogleFonts.bebasNeue(
                              fontSize: 14,
                              color: _StadiumNights.gold,
                            ),
                          ),
                        ),

                        // Away team
                        Expanded(
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              Expanded(
                                child: Text(
                                  match.awayTeam?.name ?? 'Visitante',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  textAlign: TextAlign.right,
                                  style: GoogleFonts.outfit(
                                    fontSize: 14,
                                    color: _StadiumNights.textPrimary,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              _buildSmallLogo(match.awayTeam?.logo),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Action hint
                    Container(
                      padding: const EdgeInsets.symmetric(
                        vertical: 8,
                        horizontal: 12,
                      ),
                      decoration: BoxDecoration(
                        color: _StadiumNights.neonGreen.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: _StadiumNights.neonGreen.withOpacity(0.2),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.edit,
                            size: 14,
                            color: _StadiumNights.neonGreen,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            'TOCA PARA VER DETALLE',
                            style: GoogleFonts.outfit(
                              fontSize: 11,
                              color: _StadiumNights.neonGreen,
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

  Widget _buildSmallLogo(String? logo) {
    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        color: _StadiumNights.surfaceDark,
        borderRadius: BorderRadius.circular(8),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: logo != null
            ? _buildLogoImageSmall(logo)
            : Icon(
                Icons.shield,
                size: 18,
                color: _StadiumNights.gold.withOpacity(0.5),
              ),
      ),
    );
  }

  Widget _buildLogoImageSmall(String logoData) {
    try {
      if (logoData.startsWith('data:image/')) {
        final base64Data = logoData.split(',')[1];
        final Uint8List bytes = base64Decode(base64Data);
        return Image.memory(
          bytes,
          width: 36,
          height: 36,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => Icon(
            Icons.shield,
            size: 18,
            color: _StadiumNights.gold.withOpacity(0.5),
          ),
        );
      } else {
        return Image.network(
          logoData,
          width: 36,
          height: 36,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => Icon(
            Icons.shield,
            size: 18,
            color: _StadiumNights.gold.withOpacity(0.5),
          ),
        );
      }
    } catch (e) {
      return Icon(
        Icons.shield,
        size: 18,
        color: _StadiumNights.gold.withOpacity(0.5),
      );
    }
  }
}
