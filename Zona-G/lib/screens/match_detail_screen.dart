import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:google_fonts/google_fonts.dart';
import 'dart:convert';
import 'dart:typed_data';
import '../models/match.dart';
import '../models/qr_data.dart';
import '../services/match_service.dart';
import '../widgets/stadium_background.dart';
import 'qr_scanner_screen.dart';
import 'player_detail_screen.dart';
import 'finalize_match_screen.dart';

class MatchDetailScreen extends StatefulWidget {
  final Match match;

  const MatchDetailScreen({super.key, required this.match});

  @override
  State<MatchDetailScreen> createState() => _MatchDetailScreenState();
}

class _MatchDetailScreenState extends State<MatchDetailScreen>
    with SingleTickerProviderStateMixin {
  Map<String, List<Map<String, dynamic>>> playersData = {
    'home_players': [],
    'away_players': [],
  };
  Map<String, int> attendanceCount = {'attended': 0, 'total': 0};
  bool isLoading = true;

  late AnimationController _animController;

  // Stadium Nights color palette
  static const Color _primaryDark = Color(0xFF0A0A0A);
  static const Color _neonGreen = Color(0xFF00FF7F);
  static const Color _gold = Color(0xFFFFD700);
  static const Color _surfaceDark = Color(0xFF1A1A1A);

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    _loadMatchData();
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  Future<void> _loadMatchData() async {
    setState(() {
      isLoading = true;
    });

    final players = await MatchService.getMatchPlayers(widget.match.id);
    final attendance = await MatchService.getMatchAttendanceCount(widget.match.id);

    if (mounted) {
      setState(() {
        playersData = players;
        attendanceCount = attendance;
        isLoading = false;
      });
      _animController.forward();
    }
  }

  Future<void> _navigateToFinalizeMatch() async {
    final result = await Navigator.push(
      context,
      PageRouteBuilder(
        pageBuilder: (context, animation, secondaryAnimation) =>
            FinalizeMatchScreen(
          match: widget.match,
          playersData: playersData,
        ),
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return SlideTransition(
            position: Tween<Offset>(
              begin: const Offset(0, 1),
              end: Offset.zero,
            ).animate(CurvedAnimation(
              parent: animation,
              curve: Curves.easeOut,
            )),
            child: child,
          );
        },
        transitionDuration: const Duration(milliseconds: 300),
      ),
    );

    if (result == true && mounted) {
      Navigator.pop(context, true);
    }
  }

  void _navigateToPlayerDetail(Map<String, dynamic> player) {
    HapticFeedback.lightImpact();
    final qrData = QRPlayerData(
      playerId: player['id'] ?? '',
      playerName: player['name'] ?? 'Jugador',
      teamId: player['team_id'] ?? '',
      jerseyNumber: player['jersey_number'] ?? 0,
    );

    Navigator.push(
      context,
      PageRouteBuilder(
        pageBuilder: (context, animation, secondaryAnimation) =>
            PlayerDetailScreen(
          qrData: qrData,
          matchId: widget.match.id,
        ),
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(
            opacity: animation,
            child: child,
          );
        },
        transitionDuration: const Duration(milliseconds: 300),
      ),
    ).then((_) {
      _loadMatchData();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _primaryDark,
      body: Stack(
        children: [
          const StadiumBackground(),

          SafeArea(
            child: Column(
              children: [
                _buildHeader(),
                Expanded(
                  child: isLoading
                      ? _buildLoadingState()
                      : RefreshIndicator(
                          onRefresh: _loadMatchData,
                          color: _neonGreen,
                          backgroundColor: _surfaceDark,
                          child: SingleChildScrollView(
                            physics: const AlwaysScrollableScrollPhysics(),
                            padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                            child: Column(
                              children: [
                                _buildMatchCard(),
                                const SizedBox(height: 16),
                                if (widget.match.canRegisterAttendance)
                                  _buildQRScanButton(),
                                const SizedBox(height: 16),
                                _buildAttendanceStats(),
                                const SizedBox(height: 24),
                                _buildTeamsSection(),
                              ],
                            ),
                          ),
                        ),
                ),
              ],
            ),
          ),

        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
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
                color: Colors.white.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                Icons.arrow_back,
                color: Colors.white,
                size: 22,
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'DETALLE DEL PARTIDO',
                  style: GoogleFonts.bebasNeue(
                    fontSize: 22,
                    color: Colors.white,
                    letterSpacing: 2,
                  ),
                ),
                if (widget.match.tournamentName != null)
                  Text(
                    widget.match.tournamentName!,
                    style: GoogleFonts.outfit(
                      fontSize: 12,
                      color: _neonGreen,
                    ),
                  ),
              ],
            ),
          ),
          if (widget.match.status == MatchStatus.in_progress ||
              widget.match.status == MatchStatus.scheduled)
            GestureDetector(
              onTap: () {
                HapticFeedback.mediumImpact();
                _navigateToFinalizeMatch();
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: _gold.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: _gold.withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    Icon(Icons.sports_score, color: _gold, size: 18),
                    const SizedBox(width: 6),
                    Text(
                      'FINALIZAR',
                      style: GoogleFonts.outfit(
                        fontSize: 12,
                        color: _gold,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
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
            width: 48,
            height: 48,
            child: CircularProgressIndicator(
              strokeWidth: 3,
              valueColor: AlwaysStoppedAnimation<Color>(_neonGreen),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Cargando datos...',
            style: GoogleFonts.outfit(
              color: Colors.white54,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMatchCard() {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.white.withOpacity(0.1),
            Colors.white.withOpacity(0.05),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            // Playoff badge
            if (widget.match.isPlayoff)
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      _gold.withOpacity(0.2),
                      _gold.withOpacity(0.1),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: _gold.withOpacity(0.3)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.emoji_events, color: _gold, size: 18),
                    const SizedBox(width: 8),
                    Text(
                      widget.match.playoffRoundText,
                      style: GoogleFonts.outfit(
                        fontSize: 13,
                        color: _gold,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),

            // Teams and score
            Row(
              children: [
                Expanded(
                  child: _buildTeamColumn(
                    widget.match.homeTeamName ?? 'Local',
                    widget.match.homeTeamLogo,
                    isWinner: widget.match.status == MatchStatus.finished &&
                        (widget.match.homeScore ?? 0) > (widget.match.awayScore ?? 0),
                  ),
                ),
                _buildScoreSection(),
                Expanded(
                  child: _buildTeamColumn(
                    widget.match.awayTeamName ?? 'Visitante',
                    widget.match.awayTeamLogo,
                    isWinner: widget.match.status == MatchStatus.finished &&
                        (widget.match.awayScore ?? 0) > (widget.match.homeScore ?? 0),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 20),

            // Match info
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.05),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  _buildInfoRow(
                    Icons.calendar_today,
                    DateFormat('EEEE, dd MMMM yyyy', 'es').format(widget.match.matchDate),
                  ),
                  const SizedBox(height: 10),
                  _buildInfoRow(
                    Icons.access_time,
                    DateFormat('HH:mm').format(widget.match.matchDate),
                  ),
                  if (widget.match.venue != null) ...[
                    const SizedBox(height: 10),
                    _buildInfoRow(Icons.location_on, widget.match.venue!),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTeamColumn(String name, String? logo, {bool isWinner = false}) {
    return Column(
      children: [
        Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            color: _surfaceDark,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: isWinner ? _neonGreen.withOpacity(0.5) : Colors.white.withOpacity(0.1),
              width: isWinner ? 2 : 1,
            ),
            boxShadow: isWinner
                ? [
                    BoxShadow(
                      color: _neonGreen.withOpacity(0.3),
                      blurRadius: 12,
                    ),
                  ]
                : null,
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: _buildLogoImage(logo, 56, 56),
          ),
        ),
        const SizedBox(height: 10),
        Text(
          name,
          style: GoogleFonts.outfit(
            fontSize: 13,
            color: isWinner ? _neonGreen : Colors.white,
            fontWeight: isWinner ? FontWeight.w600 : FontWeight.w500,
          ),
          textAlign: TextAlign.center,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
      ],
    );
  }

  Widget _buildScoreSection() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: Column(
        children: [
          Text(
            widget.match.scoreText,
            style: GoogleFonts.bebasNeue(
              fontSize: 36,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: _getStatusColor(widget.match.status).withOpacity(0.2),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: _getStatusColor(widget.match.status).withOpacity(0.4),
              ),
            ),
            child: Text(
              widget.match.statusText,
              style: GoogleFonts.outfit(
                fontSize: 10,
                color: _getStatusColor(widget.match.status),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String text) {
    return Row(
      children: [
        Icon(icon, size: 16, color: Colors.white38),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            text,
            style: GoogleFonts.outfit(
              fontSize: 13,
              color: Colors.white70,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildQRScanButton() {
    return GestureDetector(
      onTap: () async {
        HapticFeedback.mediumImpact();
        await Navigator.push(
          context,
          PageRouteBuilder(
            pageBuilder: (context, animation, secondaryAnimation) =>
                QRScannerScreen(
              matchId: widget.match.id,
              matchName: '${widget.match.homeTeamName} vs ${widget.match.awayTeamName}',
            ),
            transitionsBuilder: (context, animation, secondaryAnimation, child) {
              return FadeTransition(opacity: animation, child: child);
            },
            transitionDuration: const Duration(milliseconds: 300),
          ),
        );

        // Always reload data when returning from QR scanner
        if (mounted) {
          _loadMatchData();
        }
      },
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 18),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [_neonGreen, _neonGreen.withOpacity(0.8)],
          ),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: _neonGreen.withOpacity(0.4),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.qr_code_scanner, color: _primaryDark, size: 24),
            const SizedBox(width: 12),
            Text(
              'ESCANEAR QR DE JUGADOR',
              style: GoogleFonts.outfit(
                fontSize: 15,
                color: _primaryDark,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAttendanceStats() {
    final attended = attendanceCount['attended'] ?? 0;
    final total = attendanceCount['total'] ?? 0;
    final percentage = total > 0 ? (attended / total * 100) : 0.0;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.white.withOpacity(0.08),
            Colors.white.withOpacity(0.04),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'ASISTENCIA',
            style: GoogleFonts.bebasNeue(
              fontSize: 18,
              color: Colors.white,
              letterSpacing: 1,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _buildStatItem('$attended', 'Registrados', _neonGreen),
              _buildStatItem('$total', 'Total', Colors.white70),
              _buildStatItem('${percentage.toStringAsFixed(0)}%', 'Asistencia', _gold),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatItem(String value, String label, Color color) {
    return Expanded(
      child: Column(
        children: [
          Text(
            value,
            style: GoogleFonts.bebasNeue(
              fontSize: 28,
              color: color,
            ),
          ),
          Text(
            label,
            style: GoogleFonts.outfit(
              fontSize: 11,
              color: Colors.white54,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTeamsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              'PLANTELES',
              style: GoogleFonts.bebasNeue(
                fontSize: 20,
                color: Colors.white,
                letterSpacing: 1,
              ),
            ),
            const SizedBox(width: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                'Solo con asistencia QR',
                style: GoogleFonts.outfit(
                  fontSize: 10,
                  color: Colors.white54,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        _buildTeamPlayersCard(
          widget.match.homeTeamName ?? 'Local',
          playersData['home_players'] ?? [],
          _neonGreen,
        ),

        const SizedBox(height: 16),

        _buildTeamPlayersCard(
          widget.match.awayTeamName ?? 'Visitante',
          playersData['away_players'] ?? [],
          Colors.blue,
        ),
      ],
    );
  }

  Widget _buildTeamPlayersCard(
    String teamName,
    List<Map<String, dynamic>> players,
    Color teamColor,
  ) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            teamColor.withOpacity(0.1),
            teamColor.withOpacity(0.05),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: teamColor.withOpacity(0.2)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: teamColor.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(Icons.sports_soccer, color: teamColor, size: 18),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    teamName,
                    style: GoogleFonts.outfit(
                      fontSize: 15,
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: teamColor.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '${players.length}',
                    style: GoogleFonts.bebasNeue(
                      fontSize: 16,
                      color: teamColor,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            if (players.isEmpty)
              Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 20),
                  child: Column(
                    children: [
                      Icon(
                        Icons.qr_code_scanner,
                        size: 40,
                        color: Colors.white24,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Sin jugadores registrados',
                        style: GoogleFonts.outfit(
                          fontSize: 13,
                          color: Colors.white38,
                        ),
                      ),
                    ],
                  ),
                ),
              )
            else
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: players.map((player) {
                  return GestureDetector(
                    onTap: () => _navigateToPlayerDetail(player),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: teamColor.withOpacity(0.3)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 24,
                            height: 24,
                            decoration: BoxDecoration(
                              color: teamColor,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Center(
                              child: Text(
                                '${player['jersey_number'] ?? '?'}',
                                style: GoogleFonts.bebasNeue(
                                  fontSize: 12,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 120),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  player['name'] ?? 'Jugador',
                                  style: GoogleFonts.outfit(
                                    fontSize: 12,
                                    color: Colors.white,
                                    fontWeight: FontWeight.w500,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                  maxLines: 1,
                                ),
                                if (player['position'] != null)
                                  Text(
                                    player['position'],
                                    style: GoogleFonts.outfit(
                                      fontSize: 10,
                                      color: Colors.white54,
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 4),
                          Icon(
                            Icons.chevron_right,
                            size: 16,
                            color: Colors.white38,
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildLogoImage(String? logoUrl, double width, double height) {
    if (logoUrl == null || logoUrl.isEmpty) {
      return Container(
        width: width,
        height: height,
        color: _surfaceDark,
        child: Icon(
          Icons.sports_soccer,
          size: width * 0.5,
          color: Colors.white24,
        ),
      );
    }

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
              Icons.sports_soccer,
              size: width * 0.5,
              color: Colors.white24,
            );
          },
        );
      } catch (e) {
        return Icon(
          Icons.sports_soccer,
          size: width * 0.5,
          color: Colors.white24,
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
          return Center(
            child: SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(_neonGreen),
              ),
            ),
          );
        },
        errorBuilder: (context, error, stackTrace) {
          return Icon(
            Icons.sports_soccer,
            size: width * 0.5,
            color: Colors.white24,
          );
        },
      );
    }
  }

  Color _getStatusColor(MatchStatus status) {
    switch (status) {
      case MatchStatus.scheduled:
        return Colors.blue;
      case MatchStatus.in_progress:
        return _neonGreen;
      case MatchStatus.finished:
        return Colors.grey;
      case MatchStatus.cancelled:
        return Colors.red;
    }
  }
}
