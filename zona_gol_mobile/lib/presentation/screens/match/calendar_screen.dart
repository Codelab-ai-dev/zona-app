import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import '../../../core/di/injection.dart';
import '../../../domain/entities/match_entity.dart';
import '../../../domain/entities/tournament_entity.dart';
import '../../../domain/entities/user_entity.dart';
import '../../bloc/match/match_bloc.dart';
import '../../bloc/match/match_event.dart';
import '../../bloc/match/match_state.dart';
import '../../bloc/tournament/tournament_bloc.dart';
import '../../bloc/tournament/tournament_event.dart';
import '../../bloc/tournament/tournament_state.dart';
import 'match_detail_screen.dart';

/// Stadium Nights Design System
class _SN {
  static const Color backgroundDark = Color(0xFF050508);
  static const Color surfaceDark = Color(0xFF0A0A0F);
  static const Color cardDark = Color(0xFF12121A);
  static const Color gold = Color(0xFFFFD700);
  static const Color amber = Color(0xFFF59E0B);
  static const Color neonGreen = Color(0xFF00FF7F);
  static const Color neonBlue = Color(0xFF00BFFF);
  static const Color error = Color(0xFFEF4444);
  static const Color textPrimary = Color(0xFFFAFAFA);
  static const Color textMuted = Color(0xFF6B7280);
}

/// Calendar Screen — shows all matches for a tournament grouped by round
class CalendarScreen extends StatelessWidget {
  final UserEntity user;

  const CalendarScreen({super.key, required this.user});

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(
          create: (_) {
            final bloc = sl<TournamentBloc>();
            if (user.leagueId != null) {
              bloc.add(LoadTournamentsByLeagueEvent(
                leagueId: user.leagueId!,
                onlyActive: true,
              ));
            }
            return bloc;
          },
        ),
        BlocProvider(create: (_) => sl<MatchBloc>()),
      ],
      child: _CalendarView(user: user),
    );
  }
}

class _CalendarView extends StatefulWidget {
  final UserEntity user;
  const _CalendarView({required this.user});

  @override
  State<_CalendarView> createState() => _CalendarViewState();
}

class _CalendarViewState extends State<_CalendarView> {
  TournamentEntity? _selectedTournament;
  int? _selectedRound; // null = all rounds

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light.copyWith(
        statusBarColor: Colors.transparent,
        systemNavigationBarColor: _SN.backgroundDark,
      ),
      child: Scaffold(
        backgroundColor: _SN.backgroundDark,
        appBar: _buildAppBar(),
        body: Column(
          children: [
            _buildTournamentSelector(),
            if (_selectedTournament != null) _buildRoundFilter(),
            Expanded(child: _buildMatchList()),
          ],
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() {
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
            border: Border.all(color: _SN.neonBlue.withOpacity(0.3)),
          ),
          child: const Icon(Icons.arrow_back, color: _SN.neonBlue, size: 18),
        ),
        onPressed: () => Navigator.pop(context),
      ),
      title: Text(
        'CALENDARIO',
        style: GoogleFonts.bebasNeue(
          fontSize: 22,
          color: _SN.textPrimary,
          letterSpacing: 2,
        ),
      ),
      centerTitle: true,
    );
  }

  // ==================== Tournament Selector ====================

  Widget _buildTournamentSelector() {
    return BlocConsumer<TournamentBloc, TournamentState>(
      listener: (context, state) {
        if (state is TournamentsLoaded && state.tournaments.isNotEmpty) {
          if (_selectedTournament == null) {
            setState(() {
              _selectedTournament = state.tournaments.first;
              _selectedRound = null;
            });
            _loadMatches(state.tournaments.first.id);
          }
        }
      },
      builder: (context, state) {
        if (state is TournamentLoading) {
          return Container(
            padding: const EdgeInsets.all(16),
            color: _SN.surfaceDark,
            child: const Center(
              child: SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(_SN.gold),
                ),
              ),
            ),
          );
        }

        if (state is TournamentsLoaded) {
          final tournaments = state.tournaments;
          if (tournaments.isEmpty) {
            return Container(
              padding: const EdgeInsets.all(20),
              color: _SN.surfaceDark,
              child: Center(
                child: Text(
                  'No hay torneos activos',
                  style: GoogleFonts.outfit(
                    fontSize: 14,
                    color: _SN.textMuted,
                  ),
                ),
              ),
            );
          }

          return Container(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
            decoration: BoxDecoration(
              color: _SN.surfaceDark,
              border: Border(
                bottom: BorderSide(color: _SN.neonBlue.withOpacity(0.15)),
              ),
            ),
            child: Row(
              children: [
                Icon(Icons.emoji_events, color: _SN.gold, size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: _SN.cardDark,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: _SN.gold.withOpacity(0.2),
                      ),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _selectedTournament?.id,
                        dropdownColor: _SN.cardDark,
                        isExpanded: true,
                        icon: Icon(
                          Icons.keyboard_arrow_down,
                          color: _SN.gold,
                        ),
                        style: GoogleFonts.outfit(
                          fontSize: 14,
                          color: _SN.textPrimary,
                          fontWeight: FontWeight.w500,
                        ),
                        items: tournaments.map((t) {
                          return DropdownMenuItem(
                            value: t.id,
                            child: Text(
                              t.name,
                              overflow: TextOverflow.ellipsis,
                            ),
                          );
                        }).toList(),
                        onChanged: (id) {
                          final tournament = tournaments.firstWhere(
                            (t) => t.id == id,
                          );
                          setState(() {
                            _selectedTournament = tournament;
                            _selectedRound = null;
                          });
                          _loadMatches(tournament.id);
                        },
                      ),
                    ),
                  ),
                ),
              ],
            ),
          );
        }

        return const SizedBox.shrink();
      },
    );
  }

  // ==================== Round Filter ====================

  Widget _buildRoundFilter() {
    return BlocBuilder<MatchBloc, MatchState>(
      builder: (context, state) {
        if (state is! MatchesLoaded) return const SizedBox.shrink();

        final rounds = _getAvailableRounds(state.matches);
        if (rounds.isEmpty) return const SizedBox.shrink();

        return Container(
          height: 48,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: _SN.surfaceDark,
            border: Border(
              bottom: BorderSide(color: Colors.white.withOpacity(0.04)),
            ),
          ),
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: [
              _buildRoundChip(null, 'TODOS'),
              ...rounds.map((r) => _buildRoundChip(r, 'J$r')),
            ],
          ),
        );
      },
    );
  }

  Widget _buildRoundChip(int? round, String label) {
    final isSelected = _selectedRound == round;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
      child: GestureDetector(
        onTap: () => setState(() => _selectedRound = round),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(
            color: isSelected
                ? _SN.neonBlue.withOpacity(0.2)
                : Colors.white.withOpacity(0.04),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isSelected
                  ? _SN.neonBlue.withOpacity(0.5)
                  : Colors.white.withOpacity(0.08),
            ),
          ),
          child: Text(
            label,
            style: GoogleFonts.bebasNeue(
              fontSize: 13,
              color: isSelected ? _SN.neonBlue : _SN.textMuted,
              letterSpacing: 1,
            ),
          ),
        ),
      ),
    );
  }

  List<int> _getAvailableRounds(List<MatchEntity> matches) {
    final rounds = matches
        .where((m) => m.round != null && m.phase == MatchPhase.regular)
        .map((m) => m.round!)
        .toSet()
        .toList()
      ..sort();
    return rounds;
  }

  // ==================== Match List ====================

  Widget _buildMatchList() {
    if (_selectedTournament == null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.calendar_month,
              size: 56,
              color: _SN.textMuted.withOpacity(0.3),
            ),
            const SizedBox(height: 16),
            Text(
              'Selecciona un torneo',
              style: GoogleFonts.outfit(
                fontSize: 16,
                color: _SN.textMuted,
              ),
            ),
          ],
        ),
      );
    }

    return BlocBuilder<MatchBloc, MatchState>(
      builder: (context, state) {
        if (state is MatchLoading) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const SizedBox(
                  width: 40,
                  height: 40,
                  child: CircularProgressIndicator(
                    strokeWidth: 3,
                    valueColor: AlwaysStoppedAnimation<Color>(_SN.gold),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'CARGANDO PARTIDOS',
                  style: GoogleFonts.bebasNeue(
                    fontSize: 14,
                    color: _SN.textMuted,
                    letterSpacing: 2,
                  ),
                ),
              ],
            ),
          );
        }

        if (state is MatchError) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 40, color: _SN.error),
                  const SizedBox(height: 12),
                  Text(
                    state.message,
                    textAlign: TextAlign.center,
                    style:
                        GoogleFonts.outfit(fontSize: 14, color: _SN.textMuted),
                  ),
                  const SizedBox(height: 16),
                  GestureDetector(
                    onTap: () =>
                        _loadMatches(_selectedTournament!.id),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [_SN.gold, _SN.amber],
                        ),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        'REINTENTAR',
                        style: GoogleFonts.bebasNeue(
                          fontSize: 14,
                          color: Colors.black,
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

        if (state is MatchesLoaded) {
          return _buildLoadedContent(state.matches);
        }

        return const SizedBox.shrink();
      },
    );
  }

  Widget _buildLoadedContent(List<MatchEntity> allMatches) {
    if (allMatches.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.event_busy,
              size: 56,
              color: _SN.textMuted.withOpacity(0.3),
            ),
            const SizedBox(height: 16),
            Text(
              'No hay partidos',
              style: GoogleFonts.outfit(fontSize: 16, color: _SN.textMuted),
            ),
            const SizedBox(height: 4),
            Text(
              'Genera un fixture para crear partidos',
              style: GoogleFonts.outfit(fontSize: 13, color: _SN.textMuted),
            ),
          ],
        ),
      );
    }

    // Split into regular and playoff
    final regularMatches =
        allMatches.where((m) => m.phase == MatchPhase.regular).toList();
    final playoffMatches =
        allMatches.where((m) => m.phase == MatchPhase.playoffs).toList();

    // Apply round filter
    final filteredRegular = _selectedRound != null
        ? regularMatches.where((m) => m.round == _selectedRound).toList()
        : regularMatches;

    // Group regular by round
    final Map<int, List<MatchEntity>> roundsMap = {};
    for (final match in filteredRegular) {
      final round = match.round ?? 0;
      roundsMap.putIfAbsent(round, () => []).add(match);
    }
    final sortedRounds = roundsMap.keys.toList()..sort();

    // Group playoffs by playoff round
    final Map<PlayoffRound, List<MatchEntity>> playoffMap = {};
    for (final match in playoffMatches) {
      if (match.playoffRound != null) {
        playoffMap.putIfAbsent(match.playoffRound!, () => []).add(match);
      }
    }

    // Stats
    final totalMatches = allMatches.length;
    final finishedCount =
        allMatches.where((m) => m.status == MatchStatus.finished).length;

    return RefreshIndicator(
      onRefresh: () async {
        _loadMatches(_selectedTournament!.id);
      },
      color: _SN.gold,
      backgroundColor: _SN.cardDark,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        children: [
          // Stats bar
          _buildStatsBar(totalMatches, finishedCount),
          const SizedBox(height: 8),

          // Regular season rounds
          for (final roundNum in sortedRounds) ...[
            _buildRoundHeader(roundNum, roundsMap[roundNum]!),
            ...roundsMap[roundNum]!.map((m) => _buildMatchCard(m)),
            const SizedBox(height: 12),
          ],

          // Playoff section
          if (playoffMap.isNotEmpty && _selectedRound == null) ...[
            _buildPlayoffSectionHeader(),
            for (final entry in playoffMap.entries) ...[
              _buildPlayoffRoundHeader(entry.key, entry.value),
              ...entry.value.map((m) => _buildMatchCard(m)),
              const SizedBox(height: 12),
            ],
          ],
        ],
      ),
    );
  }

  Widget _buildStatsBar(int total, int finished) {
    final progress = total > 0 ? finished / total : 0.0;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _SN.cardDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withOpacity(0.04)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'PROGRESO DEL TORNEO',
                  style: GoogleFonts.bebasNeue(
                    fontSize: 12,
                    color: _SN.textMuted,
                    letterSpacing: 1.5,
                  ),
                ),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: progress,
                    minHeight: 6,
                    backgroundColor: Colors.white.withOpacity(0.06),
                    valueColor:
                        const AlwaysStoppedAnimation<Color>(_SN.neonGreen),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 14),
          Text(
            '$finished/$total',
            style: GoogleFonts.bebasNeue(
              fontSize: 18,
              color: _SN.neonGreen,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRoundHeader(int roundNum, List<MatchEntity> matches) {
    final finished = matches.where((m) => m.isFinished).length;
    final total = matches.length;
    final dateFormat = DateFormat('dd/MM');

    // Get date range for the round
    final dates = matches.map((m) => m.matchDate).toList()..sort();
    final dateStr = dates.length == 1
        ? dateFormat.format(dates.first)
        : '${dateFormat.format(dates.first)} - ${dateFormat.format(dates.last)}';

    return Padding(
      padding: const EdgeInsets.only(top: 8, bottom: 8),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [_SN.neonBlue, _SN.neonBlue.withOpacity(0.7)],
              ),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              'JORNADA $roundNum',
              style: GoogleFonts.bebasNeue(
                fontSize: 13,
                color: Colors.white,
                letterSpacing: 1,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            dateStr,
            style: GoogleFonts.outfit(fontSize: 11, color: _SN.textMuted),
          ),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: finished == total
                  ? _SN.neonGreen.withOpacity(0.1)
                  : Colors.white.withOpacity(0.04),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              '$finished/$total',
              style: GoogleFonts.outfit(
                fontSize: 11,
                color: finished == total ? _SN.neonGreen : _SN.textMuted,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPlayoffSectionHeader() {
    return Padding(
      padding: const EdgeInsets.only(top: 16, bottom: 8),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [_SN.gold, _SN.amber],
              ),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.emoji_events, size: 14, color: Colors.black),
                const SizedBox(width: 6),
                Text(
                  'PLAYOFFS',
                  style: GoogleFonts.bebasNeue(
                    fontSize: 14,
                    color: Colors.black,
                    letterSpacing: 1.5,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPlayoffRoundHeader(
    PlayoffRound round,
    List<MatchEntity> matches,
  ) {
    return Padding(
      padding: const EdgeInsets.only(top: 4, bottom: 8),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: _SN.gold.withOpacity(0.1),
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: _SN.gold.withOpacity(0.2)),
            ),
            child: Text(
              round.displayText.toUpperCase(),
              style: GoogleFonts.bebasNeue(
                fontSize: 12,
                color: _SN.gold,
                letterSpacing: 1,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            '${matches.length} partidos',
            style: GoogleFonts.outfit(fontSize: 11, color: _SN.textMuted),
          ),
        ],
      ),
    );
  }

  // ==================== Match Card ====================

  Widget _buildMatchCard(MatchEntity match) {
    Color statusColor;
    switch (match.status) {
      case MatchStatus.scheduled:
        statusColor = _SN.neonBlue;
        break;
      case MatchStatus.inProgress:
        statusColor = _SN.neonGreen;
        break;
      case MatchStatus.finished:
        statusColor = _SN.textMuted;
        break;
      case MatchStatus.cancelled:
        statusColor = _SN.error;
        break;
    }

    return GestureDetector(
      onTap: () => _openMatchDetail(match),
      child: Container(
        margin: const EdgeInsets.only(bottom: 6),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: _SN.cardDark,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: match.status == MatchStatus.inProgress
                ? _SN.neonGreen.withOpacity(0.3)
                : Colors.white.withOpacity(0.04),
          ),
        ),
        child: Row(
          children: [
            // Status indicator
            Container(
              width: 4,
              height: 40,
              decoration: BoxDecoration(
                color: statusColor,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(width: 12),

            // Home team
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    match.homeTeam?.name ?? 'Local',
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
                    match.awayTeam?.name ?? 'Visitante',
                    style: GoogleFonts.outfit(
                      fontSize: 13,
                      color: _SN.textPrimary,
                      fontWeight: FontWeight.w500,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),

            // Score or VS
            if (match.hasResult)
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: _SN.surfaceDark,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  children: [
                    Text(
                      '${match.homeScore}',
                      style: GoogleFonts.bebasNeue(
                        fontSize: 18,
                        color: _SN.textPrimary,
                      ),
                    ),
                    Text(
                      '${match.awayScore}',
                      style: GoogleFonts.bebasNeue(
                        fontSize: 18,
                        color: _SN.textPrimary,
                      ),
                    ),
                  ],
                ),
              )
            else
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'VS',
                  style: GoogleFonts.bebasNeue(
                    fontSize: 14,
                    color: statusColor,
                  ),
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
                    Icon(Icons.calendar_today,
                        size: 10, color: _SN.textMuted),
                    const SizedBox(width: 3),
                    Text(
                      DateFormat('dd/MM').format(match.matchDate),
                      style: GoogleFonts.outfit(
                        fontSize: 11,
                        color: _SN.textMuted,
                      ),
                    ),
                  ],
                ),
                if (match.matchTime != null) ...[
                  const SizedBox(height: 2),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.access_time,
                          size: 10, color: _SN.neonBlue),
                      const SizedBox(width: 3),
                      Text(
                        match.matchTime!,
                        style: GoogleFonts.outfit(
                          fontSize: 11,
                          color: _SN.neonBlue,
                        ),
                      ),
                    ],
                  ),
                ],
                if (match.fieldNumber != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    'C${match.fieldNumber}',
                    style: GoogleFonts.outfit(
                      fontSize: 10,
                      color: _SN.textMuted,
                    ),
                  ),
                ],
              ],
            ),

            const SizedBox(width: 4),
            Icon(Icons.chevron_right, size: 18, color: _SN.textMuted),
          ],
        ),
      ),
    );
  }

  // ==================== Actions ====================

  void _loadMatches(String tournamentId) {
    context
        .read<MatchBloc>()
        .add(LoadMatchesByTournamentEvent(tournamentId: tournamentId));
  }

  void _openMatchDetail(MatchEntity match) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => MatchDetailScreen(
          matchId: match.id,
          user: widget.user,
        ),
      ),
    ).then((_) {
      // Refresh on return
      if (_selectedTournament != null) {
        _loadMatches(_selectedTournament!.id);
      }
    });
  }
}
