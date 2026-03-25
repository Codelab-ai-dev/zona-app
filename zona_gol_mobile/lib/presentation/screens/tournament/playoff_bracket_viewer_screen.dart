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
import '../match/match_detail_screen.dart';

/// Stadium Nights Design System
class _StadiumNights {
  static const Color backgroundDark = Color(0xFF050508);
  static const Color surfaceDark = Color(0xFF0A0A0F);
  static const Color cardDark = Color(0xFF12121A);
  static const Color gold = Color(0xFFFFD700);
  static const Color amber = Color(0xFFF59E0B);
  static const Color neonGreen = Color(0xFF00FF7F);
  static const Color error = Color(0xFFEF4444);
  static const Color textPrimary = Color(0xFFFAFAFA);
  static const Color textSecondary = Color(0xFF9CA3AF);
  static const Color textMuted = Color(0xFF6B7280);
}

/// A matchup "tie" — groups first and second leg matches for one bracket position
class _BracketTie {
  final PlayoffRound round;
  final int position;
  final MatchEntity? firstLeg;
  final MatchEntity? secondLeg;
  final MatchEntity? singleMatch;

  const _BracketTie({
    required this.round,
    required this.position,
    this.firstLeg,
    this.secondLeg,
    this.singleMatch,
  });

  bool get isTwoLegged => firstLeg != null || secondLeg != null;

  String get homeTeamName =>
      _primaryMatch?.homeTeam?.name ?? 'Por definir';

  String get awayTeamName =>
      _primaryMatch?.awayTeam?.name ?? 'Por definir';

  String get homeTeamId => _primaryMatch?.homeTeamId ?? '';
  String get awayTeamId => _primaryMatch?.awayTeamId ?? '';

  bool get isTbd => homeTeamId == awayTeamId || homeTeamId.isEmpty;

  MatchEntity? get _primaryMatch => singleMatch ?? firstLeg ?? secondLeg;

  bool get isFinished {
    if (singleMatch != null) return singleMatch!.isFinished;
    if (isTwoLegged) {
      return (firstLeg?.isFinished ?? false) &&
          (secondLeg?.isFinished ?? false);
    }
    return false;
  }

  /// Aggregate scores for two-legged ties
  /// Both legs keep same home/away from bracket perspective
  int? get homeAggregate {
    if (singleMatch != null) return singleMatch!.homeScore;
    if (!isTwoLegged) return null;
    final leg1Home = firstLeg?.homeScore;
    final leg2Home = secondLeg?.homeScore;
    if (leg1Home == null && leg2Home == null) return null;
    return (leg1Home ?? 0) + (leg2Home ?? 0);
  }

  int? get awayAggregate {
    if (singleMatch != null) return singleMatch!.awayScore;
    if (!isTwoLegged) return null;
    final leg1Away = firstLeg?.awayScore;
    final leg2Away = secondLeg?.awayScore;
    if (leg1Away == null && leg2Away == null) return null;
    return (leg1Away ?? 0) + (leg2Away ?? 0);
  }

  /// Determine winner team ID based on aggregate or single match
  String? get winnerId {
    if (!isFinished) return null;
    final ha = homeAggregate;
    final aa = awayAggregate;
    if (ha == null || aa == null) return null;
    if (ha > aa) return homeTeamId;
    if (aa > ha) return awayTeamId;
    return null; // draw / undecided
  }

  /// Get the most relevant match for navigation
  MatchEntity? get navigableMatch => singleMatch ?? firstLeg;

  DateTime? get matchDate => _primaryMatch?.matchDate;
  String? get matchTime => _primaryMatch?.matchTime;
}

/// Playoff Bracket Viewer Screen
/// Displays saved playoff bracket with rounds in columns
class PlayoffBracketViewerScreen extends StatelessWidget {
  final String tournamentId;
  final String tournamentName;
  final UserEntity user;

  const PlayoffBracketViewerScreen({
    super.key,
    required this.tournamentId,
    required this.tournamentName,
    required this.user,
  });

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) {
        final bloc = sl<MatchBloc>();
        bloc.add(LoadMatchesByTournamentEvent(tournamentId: tournamentId));
        return bloc;
      },
      child: _BracketViewerBody(
        tournamentId: tournamentId,
        tournamentName: tournamentName,
        user: user,
      ),
    );
  }
}

class _BracketViewerBody extends StatelessWidget {
  final String tournamentId;
  final String tournamentName;
  final UserEntity user;

  const _BracketViewerBody({
    required this.tournamentId,
    required this.tournamentName,
    required this.user,
  });

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
        body: BlocBuilder<MatchBloc, MatchState>(
          builder: (context, state) {
            if (state is MatchLoading) {
              return _buildLoadingState();
            }
            if (state is MatchError) {
              return _buildErrorState(context, state.message);
            }
            if (state is MatchesLoaded) {
              final playoffMatches = state.matches
                  .where((m) => m.phase == MatchPhase.playoffs)
                  .toList();

              if (playoffMatches.isEmpty) {
                return _buildEmptyState(context);
              }

              return _BracketView(
                matches: playoffMatches,
                user: user,
                onRefresh: () => _refresh(context),
              );
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
      title: Column(
        children: [
          Text(
            'LIGUILLA',
            style: GoogleFonts.bebasNeue(
              fontSize: 22,
              color: _StadiumNights.textPrimary,
              letterSpacing: 2,
            ),
          ),
          Text(
            tournamentName,
            style: GoogleFonts.outfit(
              fontSize: 12,
              color: _StadiumNights.textMuted,
            ),
          ),
        ],
      ),
      centerTitle: true,
      actions: [
        IconButton(
          icon: const Icon(Icons.refresh, color: _StadiumNights.gold),
          onPressed: () => _refresh(context),
        ),
      ],
    );
  }

  void _refresh(BuildContext context) {
    context
        .read<MatchBloc>()
        .add(LoadMatchesByTournamentEvent(tournamentId: tournamentId));
  }

  Widget _buildLoadingState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const SizedBox(
            width: 50,
            height: 50,
            child: CircularProgressIndicator(
              strokeWidth: 3,
              valueColor: AlwaysStoppedAnimation<Color>(_StadiumNights.gold),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'CARGANDO LIGUILLA',
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
              onTap: () => _refresh(context),
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
                Icons.emoji_events,
                size: 50,
                color: _StadiumNights.gold.withOpacity(0.5),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'NO HAY LIGUILLA',
              style: GoogleFonts.bebasNeue(
                fontSize: 24,
                color: _StadiumNights.textPrimary,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'No se ha generado la liguilla\npara este torneo.',
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
}

/// Main bracket visualization widget
class _BracketView extends StatelessWidget {
  final List<MatchEntity> matches;
  final UserEntity user;
  final VoidCallback onRefresh;

  const _BracketView({
    required this.matches,
    required this.user,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    final ties = _groupIntoTies(matches);
    final hasQuarterfinals =
        ties.any((t) => t.round == PlayoffRound.quarterfinals);

    // Build ordered round columns
    final List<_RoundColumn> columns = [];

    if (hasQuarterfinals) {
      columns.add(_RoundColumn(
        title: 'CUARTOS',
        ties: ties
            .where((t) => t.round == PlayoffRound.quarterfinals)
            .toList()
          ..sort((a, b) => a.position.compareTo(b.position)),
      ));
    }

    final sfTies = ties
        .where((t) => t.round == PlayoffRound.semifinals)
        .toList()
      ..sort((a, b) => a.position.compareTo(b.position));
    if (sfTies.isNotEmpty) {
      columns.add(_RoundColumn(title: 'SEMIS', ties: sfTies));
    }

    final finalTies =
        ties.where((t) => t.round == PlayoffRound.final_).toList();
    final thirdPlaceTies =
        ties.where((t) => t.round == PlayoffRound.thirdPlace).toList();

    if (finalTies.isNotEmpty || thirdPlaceTies.isNotEmpty) {
      columns.add(_RoundColumn(
        title: 'FINAL',
        ties: [...finalTies, ...thirdPlaceTies],
      ));
    }

    if (columns.isEmpty) {
      return Center(
        child: Text(
          'Sin datos de liguilla',
          style: GoogleFonts.outfit(
            fontSize: 14,
            color: _StadiumNights.textMuted,
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () async => onRefresh(),
      color: _StadiumNights.gold,
      backgroundColor: _StadiumNights.cardDark,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.all(16),
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (int i = 0; i < columns.length; i++) ...[
                  _buildRoundColumn(context, columns[i], i, columns.length),
                  if (i < columns.length - 1)
                    _buildConnectors(columns[i], columns[i + 1]),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// Group flat match list into bracket ties
  List<_BracketTie> _groupIntoTies(List<MatchEntity> matches) {
    final Map<String, List<MatchEntity>> grouped = {};

    for (final match in matches) {
      if (match.playoffRound == null) continue;
      final key =
          '${match.playoffRound!.toDbString()}_${match.playoffPosition ?? 0}';
      grouped.putIfAbsent(key, () => []).add(match);
    }

    final List<_BracketTie> ties = [];

    for (final entry in grouped.entries) {
      final matchList = entry.value;
      final round = matchList.first.playoffRound!;
      final position = matchList.first.playoffPosition ?? 0;

      final firstLeg =
          matchList.where((m) => m.leg == MatchLeg.first).firstOrNull;
      final secondLeg =
          matchList.where((m) => m.leg == MatchLeg.second).firstOrNull;

      if (firstLeg != null || secondLeg != null) {
        ties.add(_BracketTie(
          round: round,
          position: position,
          firstLeg: firstLeg,
          secondLeg: secondLeg,
        ));
      } else {
        // Single-leg match
        ties.add(_BracketTie(
          round: round,
          position: position,
          singleMatch: matchList.first,
        ));
      }
    }

    return ties;
  }

  Widget _buildRoundColumn(
    BuildContext context,
    _RoundColumn column,
    int columnIndex,
    int totalColumns,
  ) {
    return SizedBox(
      width: 175,
      child: Column(
        children: [
          // Round header
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  _StadiumNights.gold.withOpacity(0.15),
                  _StadiumNights.gold.withOpacity(0.05),
                ],
              ),
              borderRadius: BorderRadius.circular(10),
              border:
                  Border.all(color: _StadiumNights.gold.withOpacity(0.25)),
            ),
            child: Text(
              column.title,
              textAlign: TextAlign.center,
              style: GoogleFonts.bebasNeue(
                fontSize: 16,
                color: _StadiumNights.gold,
                letterSpacing: 2,
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Matchup cards with spacing for bracket alignment
          for (int i = 0; i < column.ties.length; i++) ...[
            if (i > 0) const SizedBox(height: 12),
            _MatchupCard(
              tie: column.ties[i],
              user: user,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildConnectors(_RoundColumn from, _RoundColumn to) {
    // Simple connector lines between rounds
    return SizedBox(
      width: 32,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          for (int i = 0; i < (from.ties.length / 2).ceil(); i++) ...[
            if (i > 0) const SizedBox(height: 24),
            _ConnectorLines(pairCount: from.ties.length > 1 ? 2 : 1),
          ],
        ],
      ),
    );
  }
}

/// Round column data
class _RoundColumn {
  final String title;
  final List<_BracketTie> ties;

  const _RoundColumn({required this.title, required this.ties});
}

/// Connector lines between bracket rounds
class _ConnectorLines extends StatelessWidget {
  final int pairCount;

  const _ConnectorLines({required this.pairCount});

  @override
  Widget build(BuildContext context) {
    if (pairCount <= 1) {
      return Center(
        child: Container(
          height: 2,
          color: _StadiumNights.gold.withOpacity(0.2),
        ),
      );
    }

    return SizedBox(
      height: 100,
      child: CustomPaint(
        size: const Size(32, 100),
        painter: _BracketLinePainter(),
      ),
    );
  }
}

/// Paints bracket connector lines
class _BracketLinePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = _StadiumNights.gold.withOpacity(0.2)
      ..strokeWidth = 1.5
      ..style = PaintingStyle.stroke;

    final midX = size.width / 2;
    final topY = size.height * 0.2;
    final bottomY = size.height * 0.8;
    final midY = size.height / 2;

    // Left lines coming in
    canvas.drawLine(Offset(0, topY), Offset(midX, topY), paint);
    canvas.drawLine(Offset(0, bottomY), Offset(midX, bottomY), paint);

    // Vertical connector
    canvas.drawLine(Offset(midX, topY), Offset(midX, bottomY), paint);

    // Right line going out
    canvas.drawLine(Offset(midX, midY), Offset(size.width, midY), paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Matchup card displaying one bracket tie
class _MatchupCard extends StatelessWidget {
  final _BracketTie tie;
  final UserEntity user;

  const _MatchupCard({required this.tie, required this.user});

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('dd/MM');

    return GestureDetector(
      onTap: () => _navigateToDetail(context),
      child: Container(
        decoration: BoxDecoration(
          color: _StadiumNights.cardDark,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: tie.isFinished
                ? _StadiumNights.neonGreen.withOpacity(0.3)
                : _StadiumNights.gold.withOpacity(0.15),
          ),
          boxShadow: [
            if (tie.isFinished)
              BoxShadow(
                color: _StadiumNights.neonGreen.withOpacity(0.05),
                blurRadius: 8,
              ),
          ],
        ),
        child: Column(
          children: [
            // Round label for third place match
            if (tie.round == PlayoffRound.thirdPlace)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 4),
                decoration: BoxDecoration(
                  color: _StadiumNights.amber.withOpacity(0.1),
                  borderRadius:
                      const BorderRadius.vertical(top: Radius.circular(11)),
                ),
                child: Text(
                  'TERCER LUGAR',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.bebasNeue(
                    fontSize: 10,
                    color: _StadiumNights.amber,
                    letterSpacing: 1.5,
                  ),
                ),
              ),

            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                children: [
                  // Home team row
                  _buildTeamRow(
                    name: tie.homeTeamName,
                    isWinner: tie.winnerId == tie.homeTeamId &&
                        tie.winnerId != null,
                    isLoser: tie.winnerId != null &&
                        tie.winnerId != tie.homeTeamId,
                    isTbd: tie.isTbd,
                  ),

                  // Score / status divider
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: _buildScoreSection(dateFormat),
                  ),

                  // Away team row
                  _buildTeamRow(
                    name: tie.awayTeamName,
                    isWinner: tie.winnerId == tie.awayTeamId &&
                        tie.winnerId != null,
                    isLoser: tie.winnerId != null &&
                        tie.winnerId != tie.awayTeamId,
                    isTbd: tie.isTbd,
                  ),
                ],
              ),
            ),

            // Two-leg detail
            if (tie.isTwoLegged) _buildLegDetails(),
          ],
        ),
      ),
    );
  }

  Widget _buildTeamRow({
    required String name,
    required bool isWinner,
    required bool isLoser,
    required bool isTbd,
  }) {
    Color textColor;
    FontWeight weight;

    if (isTbd) {
      textColor = _StadiumNights.textMuted;
      weight = FontWeight.w400;
    } else if (isWinner) {
      textColor = _StadiumNights.neonGreen;
      weight = FontWeight.w700;
    } else if (isLoser) {
      textColor = _StadiumNights.textMuted;
      weight = FontWeight.w400;
    } else {
      textColor = _StadiumNights.textPrimary;
      weight = FontWeight.w500;
    }

    return Row(
      children: [
        if (isWinner)
          Container(
            width: 3,
            height: 16,
            margin: const EdgeInsets.only(right: 6),
            decoration: BoxDecoration(
              color: _StadiumNights.neonGreen,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
        Expanded(
          child: Text(
            name,
            overflow: TextOverflow.ellipsis,
            style: GoogleFonts.outfit(
              fontSize: 12,
              color: textColor,
              fontWeight: weight,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildScoreSection(DateFormat dateFormat) {
    if (tie.isFinished) {
      final ha = tie.homeAggregate ?? 0;
      final aa = tie.awayAggregate ?? 0;
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
        decoration: BoxDecoration(
          color: _StadiumNights.neonGreen.withOpacity(0.1),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(
          '$ha - $aa',
          style: GoogleFonts.bebasNeue(
            fontSize: 16,
            color: _StadiumNights.neonGreen,
            letterSpacing: 1,
          ),
        ),
      );
    }

    // Pending match
    final date = tie.matchDate;
    final time = tie.matchTime;

    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          decoration: BoxDecoration(
            color: _StadiumNights.gold.withOpacity(0.1),
            borderRadius: BorderRadius.circular(6),
          ),
          child: Text(
            'VS',
            style: GoogleFonts.bebasNeue(
              fontSize: 14,
              color: _StadiumNights.gold,
              letterSpacing: 1,
            ),
          ),
        ),
        if (date != null) ...[
          const SizedBox(height: 4),
          Text(
            '${dateFormat.format(date)}${time != null ? '  $time' : ''}',
            style: GoogleFonts.outfit(
              fontSize: 10,
              color: _StadiumNights.textMuted,
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildLegDetails() {
    final leg1 = tie.firstLeg;
    final leg2 = tie.secondLeg;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius:
            const BorderRadius.vertical(bottom: Radius.circular(11)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _buildLegChip('IDA', leg1),
          Container(
            width: 1,
            height: 14,
            color: _StadiumNights.textMuted.withOpacity(0.3),
          ),
          _buildLegChip('VTA', leg2),
        ],
      ),
    );
  }

  Widget _buildLegChip(String label, MatchEntity? match) {
    final hasScore = match?.hasResult ?? false;
    final scoreText = hasScore
        ? '${match!.homeScore}-${match.awayScore}'
        : '--';

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          '$label ',
          style: GoogleFonts.outfit(
            fontSize: 9,
            color: _StadiumNights.textMuted,
            fontWeight: FontWeight.w600,
          ),
        ),
        Text(
          scoreText,
          style: GoogleFonts.bebasNeue(
            fontSize: 11,
            color: hasScore
                ? _StadiumNights.textPrimary
                : _StadiumNights.textMuted,
          ),
        ),
      ],
    );
  }

  void _navigateToDetail(BuildContext context) {
    final match = tie.navigableMatch;
    if (match == null) return;

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => MatchDetailScreen(
          matchId: match.id,
          user: user,
        ),
      ),
    );
  }
}
