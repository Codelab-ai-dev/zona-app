import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'dart:convert';
import 'dart:typed_data';
import '../models/match.dart';
import '../services/match_service.dart';
import '../widgets/stadium_background.dart';
import 'match_detail_screen.dart';

class FinishedMatchesScreen extends StatefulWidget {
  const FinishedMatchesScreen({super.key});

  @override
  State<FinishedMatchesScreen> createState() => _FinishedMatchesScreenState();
}

class _FinishedMatchesScreenState extends State<FinishedMatchesScreen>
    with TickerProviderStateMixin {
  List<Match> matches = [];
  bool isLoading = true;

  late AnimationController _headerController;
  late AnimationController _listController;
  late Animation<double> _headerOpacity;
  late Animation<Offset> _headerSlide;

  @override
  void initState() {
    super.initState();
    _initAnimations();
    _loadMatches();
  }

  void _initAnimations() {
    _headerController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );

    _listController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );

    _headerOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _headerController, curve: Curves.easeOut),
    );

    _headerSlide = Tween<Offset>(
      begin: const Offset(0, -0.2),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(parent: _headerController, curve: Curves.easeOutCubic),
    );

    _headerController.forward();
  }

  @override
  void dispose() {
    _headerController.dispose();
    _listController.dispose();
    super.dispose();
  }

  Future<void> _loadMatches() async {
    setState(() => isLoading = true);

    final matchesList = await MatchService.getFinishedMatches(limit: 30);

    if (mounted) {
      setState(() {
        matches = matchesList;
        isLoading = false;
      });
      _listController.forward(from: 0);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: StadiumBackground(
        child: SafeArea(
          child: Column(
            children: [
              _buildHeader(),
              Expanded(
                child: isLoading
                    ? _buildLoadingState()
                    : matches.isEmpty
                        ? _buildEmptyState()
                        : _buildMatchesList(),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return AnimatedBuilder(
      animation: _headerController,
      builder: (context, child) {
        return SlideTransition(
          position: _headerSlide,
          child: Opacity(
            opacity: _headerOpacity.value,
            child: Container(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
              child: Row(
                children: [
                  _buildBackButton(),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Partidos Finalizados',
                          style: GoogleFonts.bebasNeue(
                            fontSize: 26,
                            color: Colors.white,
                            letterSpacing: 1,
                          ),
                        ),
                        Text(
                          'Resultados y estadisticas',
                          style: GoogleFonts.outfit(
                            fontSize: 13,
                            color: Colors.white.withOpacity(0.5),
                          ),
                        ),
                      ],
                    ),
                  ),
                  _buildRefreshButton(),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildBackButton() {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          HapticFeedback.lightImpact();
          Navigator.pop(context);
        },
        borderRadius: BorderRadius.circular(12),
        child: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.05),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.white.withOpacity(0.1)),
          ),
          child: Icon(
            Icons.arrow_back,
            color: Colors.white.withOpacity(0.7),
            size: 20,
          ),
        ),
      ),
    );
  }

  Widget _buildRefreshButton() {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          HapticFeedback.lightImpact();
          _loadMatches();
        },
        borderRadius: BorderRadius.circular(12),
        child: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.05),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.white.withOpacity(0.1)),
          ),
          child: Icon(
            Icons.refresh,
            color: Colors.white.withOpacity(0.7),
            size: 20,
          ),
        ),
      ),
    );
  }

  Widget _buildLoadingState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(
            width: 48,
            height: 48,
            child: CircularProgressIndicator(
              strokeWidth: 3,
              color: Colors.blueGrey.withOpacity(0.8),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'Cargando resultados...',
            style: GoogleFonts.outfit(
              fontSize: 14,
              color: Colors.white.withOpacity(0.5),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.05),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white.withOpacity(0.1)),
              ),
              child: Icon(
                Icons.history,
                size: 48,
                color: Colors.white.withOpacity(0.3),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Sin Resultados',
              style: GoogleFonts.bebasNeue(
                fontSize: 28,
                color: Colors.white,
                letterSpacing: 1,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'No hay partidos finalizados aun.\nLos resultados apareceran aqui.',
              style: GoogleFonts.outfit(
                fontSize: 14,
                color: Colors.white.withOpacity(0.5),
                height: 1.5,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMatchesList() {
    return RefreshIndicator(
      onRefresh: _loadMatches,
      color: Colors.blueGrey,
      backgroundColor: const Color(0xFF1A1A1A),
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        itemCount: matches.length,
        itemBuilder: (context, index) {
          return TweenAnimationBuilder<double>(
            tween: Tween(begin: 0.0, end: 1.0),
            duration: Duration(milliseconds: 400 + (index * 80)),
            curve: Curves.easeOutCubic,
            builder: (context, value, child) {
              return Transform.translate(
                offset: Offset(0, 20 * (1 - value)),
                child: Opacity(opacity: value, child: child),
              );
            },
            child: _buildMatchCard(matches[index]),
          );
        },
      ),
    );
  }

  Widget _buildMatchCard(Match match) {
    final isHomeWinner = (match.homeScore ?? 0) > (match.awayScore ?? 0);
    final isAwayWinner = (match.awayScore ?? 0) > (match.homeScore ?? 0);
    final isDraw = match.homeScore == match.awayScore;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            HapticFeedback.lightImpact();
            Navigator.push(
              context,
              PageRouteBuilder(
                pageBuilder: (context, animation, secondaryAnimation) =>
                    MatchDetailScreen(match: match),
                transitionsBuilder:
                    (context, animation, secondaryAnimation, child) {
                  return FadeTransition(
                    opacity: animation,
                    child: SlideTransition(
                      position: Tween<Offset>(
                        begin: const Offset(0.03, 0),
                        end: Offset.zero,
                      ).animate(animation),
                      child: child,
                    ),
                  );
                },
                transitionDuration: const Duration(milliseconds: 300),
              ),
            );
          },
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Colors.white.withOpacity(0.08),
                  Colors.white.withOpacity(0.03),
                ],
              ),
              border: Border.all(
                color: Colors.white.withOpacity(0.1),
                width: 1,
              ),
            ),
            child: Column(
              children: [
                // Header: Tournament and Status
                _buildCardHeader(match),

                const SizedBox(height: 14),

                // Teams and Score
                _buildTeamsSection(match, isHomeWinner, isAwayWinner, isDraw),

                const SizedBox(height: 12),

                // Footer: Date and Winner
                _buildCardFooter(match, isHomeWinner, isAwayWinner, isDraw),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCardHeader(Match match) {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                match.tournamentName ?? 'Torneo',
                style: GoogleFonts.outfit(
                  fontSize: 11,
                  color: Colors.blueGrey.shade300,
                  fontWeight: FontWeight.w500,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              if (match.isPlayoff) ...[
                const SizedBox(height: 3),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFFFFD700), Color(0xFFFFA500)],
                    ),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.emoji_events,
                          size: 10, color: Colors.black87),
                      const SizedBox(width: 3),
                      Text(
                        match.playoffRoundText,
                        style: GoogleFonts.outfit(
                          fontSize: 9,
                          color: Colors.black87,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: Colors.blueGrey.withOpacity(0.3),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(
            'FINAL',
            style: GoogleFonts.outfit(
              fontSize: 9,
              color: Colors.blueGrey.shade200,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.5,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTeamsSection(
      Match match, bool isHomeWinner, bool isAwayWinner, bool isDraw) {
    return Row(
      children: [
        // Home Team
        Expanded(
          flex: 3,
          child: _buildTeamColumn(
            logo: match.homeTeamLogo,
            name: match.homeTeamName ?? 'Local',
            isWinner: isHomeWinner,
          ),
        ),

        // Score
        Expanded(
          flex: 2,
          child: _buildScoreSection(match, isDraw),
        ),

        // Away Team
        Expanded(
          flex: 3,
          child: _buildTeamColumn(
            logo: match.awayTeamLogo,
            name: match.awayTeamName ?? 'Visitante',
            isWinner: isAwayWinner,
          ),
        ),
      ],
    );
  }

  Widget _buildTeamColumn({
    required String? logo,
    required String name,
    required bool isWinner,
  }) {
    return Column(
      children: [
        Container(
          decoration: isWinner
              ? BoxDecoration(
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF00FF7F).withOpacity(0.25),
                      blurRadius: 10,
                      spreadRadius: 1,
                    ),
                  ],
                )
              : null,
          child: Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: Colors.white.withOpacity(0.1),
              border: Border.all(
                color: isWinner
                    ? const Color(0xFF00FF7F).withOpacity(0.5)
                    : Colors.white.withOpacity(0.1),
                width: isWinner ? 2 : 1,
              ),
            ),
            child: ClipOval(
              child: logo != null && logo.isNotEmpty
                  ? _buildLogoImage(logo, 44, 44)
                  : Icon(
                      Icons.shield,
                      size: 22,
                      color: Colors.white.withOpacity(0.3),
                    ),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          name,
          textAlign: TextAlign.center,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: GoogleFonts.outfit(
            fontSize: 11,
            color: isWinner ? Colors.white : Colors.white.withOpacity(0.7),
            fontWeight: isWinner ? FontWeight.w600 : FontWeight.w400,
          ),
        ),
        if (isWinner) ...[
          const SizedBox(height: 3),
          Container(
            width: 5,
            height: 5,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: Color(0xFF00FF7F),
              boxShadow: [
                BoxShadow(
                  color: Color(0xFF00FF7F),
                  blurRadius: 4,
                  spreadRadius: 0.5,
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildScoreSection(Match match, bool isDraw) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: isDraw
                  ? [
                      Colors.orange.withOpacity(0.3),
                      Colors.orange.withOpacity(0.15),
                    ]
                  : [
                      const Color(0xFF00FF7F).withOpacity(0.2),
                      const Color(0xFF00FF7F).withOpacity(0.1),
                    ],
            ),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isDraw
                  ? Colors.orange.withOpacity(0.4)
                  : const Color(0xFF00FF7F).withOpacity(0.3),
              width: 1,
            ),
            boxShadow: [
              BoxShadow(
                color: isDraw
                    ? Colors.orange.withOpacity(0.15)
                    : const Color(0xFF00FF7F).withOpacity(0.1),
                blurRadius: 8,
                spreadRadius: -2,
              ),
            ],
          ),
          child: Text(
            match.scoreText,
            style: GoogleFonts.bebasNeue(
              fontSize: 22,
              color: Colors.white,
              letterSpacing: 1,
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'FINAL',
          style: GoogleFonts.outfit(
            fontSize: 9,
            color: isDraw
                ? Colors.orange.withOpacity(0.8)
                : const Color(0xFF00FF7F).withOpacity(0.8),
            fontWeight: FontWeight.w600,
            letterSpacing: 0.5,
          ),
        ),
      ],
    );
  }

  Widget _buildCardFooter(
      Match match, bool isHomeWinner, bool isAwayWinner, bool isDraw) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Icon(
            Icons.calendar_today,
            size: 12,
            color: Colors.white.withOpacity(0.4),
          ),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              DateFormat('dd MMM yy - HH:mm', 'es').format(match.matchDate),
              style: GoogleFonts.outfit(
                fontSize: 10,
                color: Colors.white.withOpacity(0.5),
              ),
            ),
          ),
          _buildResultBadge(match, isHomeWinner, isAwayWinner, isDraw),
        ],
      ),
    );
  }

  Widget _buildResultBadge(
      Match match, bool isHomeWinner, bool isAwayWinner, bool isDraw) {
    if (isDraw) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: Colors.orange.withOpacity(0.2),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.orange.withOpacity(0.4)),
        ),
        child: Text(
          'EMPATE',
          style: GoogleFonts.outfit(
            fontSize: 9,
            color: Colors.orange,
            fontWeight: FontWeight.w700,
          ),
        ),
      );
    }

    final winnerName = isHomeWinner
        ? (match.homeTeamName ?? 'Local')
        : (match.awayTeamName ?? 'Visitante');

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            const Color(0xFF00FF7F).withOpacity(0.3),
            const Color(0xFF00FF7F).withOpacity(0.15),
          ],
        ),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: const Color(0xFF00FF7F).withOpacity(0.4),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.emoji_events,
            size: 10,
            color: Color(0xFF00FF7F),
          ),
          const SizedBox(width: 3),
          Text(
            winnerName.length > 8
                ? '${winnerName.substring(0, 8)}...'
                : winnerName,
            style: GoogleFonts.outfit(
              fontSize: 9,
              color: const Color(0xFF00FF7F),
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLogoImage(String logoUrl, double width, double height) {
    if (logoUrl.startsWith('data:image/')) {
      try {
        final base64String = logoUrl.split(',')[1];
        final Uint8List bytes = base64Decode(base64String);

        return Image.memory(
          bytes,
          width: width,
          height: height,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) {
            return Icon(
              Icons.shield,
              size: width * 0.5,
              color: Colors.white.withOpacity(0.3),
            );
          },
        );
      } catch (e) {
        return Icon(
          Icons.shield,
          size: width * 0.5,
          color: Colors.white.withOpacity(0.3),
        );
      }
    } else {
      return Image.network(
        logoUrl,
        width: width,
        height: height,
        fit: BoxFit.cover,
        loadingBuilder: (context, child, loadingProgress) {
          if (loadingProgress == null) return child;
          return SizedBox(
            width: width * 0.4,
            height: height * 0.4,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: Colors.white.withOpacity(0.3),
            ),
          );
        },
        errorBuilder: (context, error, stackTrace) {
          return Icon(
            Icons.shield,
            size: width * 0.5,
            color: Colors.white.withOpacity(0.3),
          );
        },
      );
    }
  }
}
