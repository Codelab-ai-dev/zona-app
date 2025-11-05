import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'dart:convert';
import 'dart:typed_data';
import '../config/app_theme.dart';
import '../models/match.dart';
import '../models/qr_data.dart';
import '../services/match_service.dart';
import 'qr_scanner_screen.dart';
import 'player_detail_screen.dart';

class MatchDetailScreen extends StatefulWidget {
  final Match match;

  const MatchDetailScreen({super.key, required this.match});

  @override
  State<MatchDetailScreen> createState() => _MatchDetailScreenState();
}

class _MatchDetailScreenState extends State<MatchDetailScreen> {
  Map<String, List<Map<String, dynamic>>> playersData = {
    'home_players': [],
    'away_players': [],
  };
  Map<String, int> attendanceCount = {'attended': 0, 'total': 0};
  bool isLoading = true;
  bool isFinalizingMatch = false;

  @override
  void initState() {
    super.initState();
    _loadMatchData();
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
    }
  }

  // Show dialog to finalize match with score
  Future<void> _showFinalizeMatchDialog() async {
    final TextEditingController homeScoreController = TextEditingController();
    final TextEditingController awayScoreController = TextEditingController();
    final TextEditingController observationsController = TextEditingController();

    return showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Finalizar Partido'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${widget.match.homeTeamName} vs ${widget.match.awayTeamName}',
                style: const TextStyle(fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),

              // Marcador Section
              const Text(
                'Marcador Final',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Colors.grey,
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  // Home team score
                  Expanded(
                    child: Column(
                      children: [
                        Text(
                          widget.match.homeTeamName ?? 'Local',
                          style: const TextStyle(fontSize: 12),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: homeScoreController,
                          keyboardType: TextInputType.number,
                          textAlign: TextAlign.center,
                          decoration: const InputDecoration(
                            border: OutlineInputBorder(),
                            hintText: '0',
                            contentPadding: EdgeInsets.all(12),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),
                  const Text(
                    '-',
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(width: 16),
                  // Away team score
                  Expanded(
                    child: Column(
                      children: [
                        Text(
                          widget.match.awayTeamName ?? 'Visitante',
                          style: const TextStyle(fontSize: 12),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: awayScoreController,
                          keyboardType: TextInputType.number,
                          textAlign: TextAlign.center,
                          decoration: const InputDecoration(
                            border: OutlineInputBorder(),
                            hintText: '0',
                            contentPadding: EdgeInsets.all(12),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 24),

              // Observations Section
              const Text(
                'Observaciones del Árbitro',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Colors.grey,
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: observationsController,
                maxLines: 5,
                maxLength: 500,
                decoration: const InputDecoration(
                  border: OutlineInputBorder(),
                  hintText: 'Describe las incidencias del partido: tarjetas, lesiones, comportamiento de jugadores, etc. (opcional)',
                  contentPadding: EdgeInsets.all(12),
                  helperText: 'Máximo 500 caracteres',
                  helperMaxLines: 2,
                ),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.blue.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline, size: 16, color: Colors.blue),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Estas observaciones se guardarán en la cédula arbitral del partido',
                        style: TextStyle(
                          fontSize: 11,
                          color: Colors.blue.shade700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () {
              final homeScore = int.tryParse(homeScoreController.text) ?? 0;
              final awayScore = int.tryParse(awayScoreController.text) ?? 0;
              final observations = observationsController.text.trim();
              Navigator.pop(context);
              _finalizeMatch(homeScore, awayScore, observations: observations.isEmpty ? null : observations);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green,
              foregroundColor: Colors.white,
            ),
            child: const Text('Finalizar Partido'),
          ),
        ],
      ),
    );
  }

  // Finalize match with score and optional observations
  Future<void> _finalizeMatch(int homeScore, int awayScore, {String? observations}) async {
    setState(() {
      isFinalizingMatch = true;
    });

    try {
      final success = await MatchService.finalizeMatch(
        widget.match.id,
        homeScore,
        awayScore,
        observations: observations,
      );

      if (mounted) {
        if (success) {
          // Show success message with detailed result
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.check_circle, color: Colors.white),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('✅ Partido finalizado: ${widget.match.homeTeamName} $homeScore - $awayScore ${widget.match.awayTeamName}'),
                        const Text('📊 Estadísticas de equipos actualizadas automáticamente', 
                          style: TextStyle(fontSize: 12)),
                      ],
                    ),
                  ),
                ],
              ),
              backgroundColor: Colors.green,
              duration: const Duration(seconds: 5),
            ),
          );
          
          // Optional: Show dialog with match summary and stats
          await _showMatchFinalizedDialog(homeScore, awayScore);
          
          // Return to previous screen since match is now completed
          Navigator.pop(context, true);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('❌ Error al finalizar el partido. Intenta de nuevo.'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('❌ Error al finalizar partido: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          isFinalizingMatch = false;
        });
      }
    }
  }

  // Show match finalized summary dialog
  Future<void> _showMatchFinalizedDialog(int homeScore, int awayScore) async {
    final attendance = attendanceCount;
    final homeWin = homeScore > awayScore;
    final draw = homeScore == awayScore;
    final awayWin = homeScore < awayScore;

    return showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            const Icon(Icons.sports_score, color: Colors.green),
            const SizedBox(width: 8),
            const Text('Partido Finalizado'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Match result
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.green.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.green.withOpacity(0.3)),
              ),
              child: Column(
                children: [
                  Text(
                    '${widget.match.homeTeamName}  $homeScore - $awayScore  ${widget.match.awayTeamName}',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    homeWin ? '🎉 Victoria de ${widget.match.homeTeamName}'
                        : awayWin ? '🎉 Victoria de ${widget.match.awayTeamName}'
                        : '🤝 Empate',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.green.shade700,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 16),
            
            // Statistics summary
            const Text(
              'Estadísticas actualizadas:',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            
            _buildStatsSummaryItem('📊', 'Tabla de posiciones actualizada'),
            _buildStatsSummaryItem('⚽', 'Goles registrados para ambos equipos'),
            _buildStatsSummaryItem('🏆', homeWin ? '+3 puntos para ${widget.match.homeTeamName}' 
                                                    : awayWin ? '+3 puntos para ${widget.match.awayTeamName}'
                                                    : '+1 punto para ambos equipos'),
            _buildStatsSummaryItem('👥', 'Asistencia: ${attendance['attended']}/${attendance['total']} jugadores'),
            
            const SizedBox(height: 12),
            
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.blue.withOpacity(0.1),
                borderRadius: BorderRadius.circular(6),
              ),
              child: const Text(
                '💡 Las estadísticas se actualizaron automáticamente en la base de datos',
                style: TextStyle(
                  fontSize: 12,
                  fontStyle: FontStyle.italic,
                  color: Colors.blue,
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cerrar'),
          ),
        ],
      ),
    );
  }

  Widget _buildStatsSummaryItem(String icon, String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Text(icon, style: const TextStyle(fontSize: 16)),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontSize: 14),
            ),
          ),
        ],
      ),
    );
  }

  void _navigateToPlayerDetail(Map<String, dynamic> player) {
    // Create QRPlayerData from player data
    final qrData = QRPlayerData(
      playerId: player['id'] ?? '',
      playerName: player['name'] ?? 'Jugador',
      teamId: player['team_id'] ?? '',
      jerseyNumber: player['jersey_number'] ?? 0,
    );

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => PlayerDetailScreen(
          qrData: qrData,
          matchId: widget.match.id, // Pass current match ID
        ),
      ),
    ).then((_) {
      // Refresh match data when returning from player detail
      _loadMatchData();
    });
  }

  @override
  Widget build(BuildContext context) {
    final canFinalize =
        widget.match.status == MatchStatus.in_progress || widget.match.status == MatchStatus.scheduled;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Detalles del Partido'),
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.white,
        elevation: 0,
        flexibleSpace: Container(
          decoration: BoxDecoration(
            gradient: AppTheme.primaryGradient(opacity: 0.95),
          ),
        ),
        actions: [
          if (canFinalize)
            IconButton(
              onPressed: _showFinalizeMatchDialog,
              icon: const Icon(Icons.sports_score_rounded),
              tooltip: 'Finalizar Partido',
            ),
          IconButton(
            onPressed: _loadMatchData,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: AppTheme.primaryGradient(opacity: 0.9),
        ),
        child: SafeArea(
          top: false,
          child: isLoading
              ? const Center(child: CircularProgressIndicator())
              : SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildMatchHeader(),
                      const SizedBox(height: 24),
                      _buildAttendanceStats(),
                      if (widget.match.canRegisterAttendance) ...[
                        const SizedBox(height: 24),
                        _buildQRScanButton(),
                      ],
                      const SizedBox(height: 28),
                      _buildTeamsSection(),
                    ],
                  ),
                ),
        ),
      ),
    );
  }

  Widget _buildMatchHeader() {
    final theme = Theme.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.white.withOpacity(0.95),
            Colors.white.withOpacity(0.88),
          ],
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 30,
            offset: const Offset(0, 20),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.match.tournamentName ?? 'Torneo',
                      style: theme.textTheme.titleMedium?.copyWith(
                        color: theme.colorScheme.primary,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    if (widget.match.isPlayoff) ...[
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.secondary.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.emoji_events,
                              size: 18,
                              color: theme.colorScheme.secondary,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              widget.match.playoffRoundText,
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: theme.colorScheme.secondary,
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
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: _getStatusColor(widget.match.status).withOpacity(0.12),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text(
                  widget.match.statusText,
                  style: TextStyle(
                    color: _getStatusColor(widget.match.status),
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: Column(
                  children: [
                    _buildTeamLogo(widget.match.homeTeamLogo, 48),
                    const SizedBox(height: 12),
                    Text(
                      widget.match.homeTeamName ?? 'Equipo Local',
                      textAlign: TextAlign.center,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              Column(
                children: [
                  Text(
                    widget.match.scoreText,
                    style: theme.textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primary.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Text(
                      DateFormat('EEE d MMM · HH:mm', 'es').format(widget.match.matchDate).toUpperCase(),
                      style: theme.textTheme.bodySmall?.copyWith(
                        letterSpacing: 0.6,
                        fontWeight: FontWeight.w700,
                        color: theme.colorScheme.primary,
                      ),
                    ),
                  ),
                ],
              ),
              Expanded(
                child: Column(
                  children: [
                    _buildTeamLogo(widget.match.awayTeamLogo, 48),
                    const SizedBox(height: 12),
                    Text(
                      widget.match.awayTeamName ?? 'Equipo Visitante',
                      textAlign: TextAlign.center,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          _buildInfoRow('Fecha', DateFormat('EEEE, dd MMMM yyyy', 'es').format(widget.match.matchDate)),
          const SizedBox(height: 8),
          _buildInfoRow('Hora', DateFormat('HH:mm', 'es').format(widget.match.matchDate)),
          if (widget.match.venue != null) ...[
            const SizedBox(height: 8),
            _buildInfoRow('Lugar', widget.match.venue!),
          ],
        ],
      ),
    );
  }

  Widget _buildAttendanceStats() {
    final theme = Theme.of(context);
    final attendedCount = attendanceCount['attended'] ?? 0;
    final totalCount = attendanceCount['total'] ?? 0;
    final percentage = totalCount > 0 ? (attendedCount / totalCount * 100) : 0.0;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 24,
            offset: const Offset(0, 18),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Control de asistencia',
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _buildAttendanceChip(
                label: 'Registrados',
                value: '$attendedCount',
                color: theme.colorScheme.primary,
              ),
              const SizedBox(width: 12),
              _buildAttendanceChip(
                label: 'Total jugadores',
                value: '$totalCount',
                color: theme.colorScheme.secondary,
              ),
              const SizedBox(width: 12),
              _buildAttendanceChip(
                label: 'Asistencia',
                value: '${percentage.toStringAsFixed(1)}%',
                color: theme.colorScheme.tertiary,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildQRScanButton() {
    return SizedBox(
      width: double.infinity,
      child: FilledButton.icon(
        onPressed: () async {
          final result = await Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => QRScannerScreen(
                matchId: widget.match.id,
                matchName: '${widget.match.homeTeamName} vs ${widget.match.awayTeamName}',
              ),
            ),
          );

          if (result == true) {
            _loadMatchData();
          }
        },
        icon: const Icon(Icons.qr_code_scanner_rounded),
        label: const Text('Registrar asistencia con QR'),
        style: FilledButton.styleFrom(
          padding: const EdgeInsets.symmetric(vertical: 16),
        ),
      ),
    );
  }

  Widget _buildAttendanceChip({
    required String label,
    required String value,
    required Color color,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              value,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: color,
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: 6),
            Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: color.withOpacity(0.8),
                  ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTeamsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Text(
              'Planteles',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Solo jugadores que registraron asistencia QR',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[600],
                  fontStyle: FontStyle.italic,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        
        // Home Team Players
        _buildTeamPlayers(
          widget.match.homeTeamName ?? 'Equipo Local',
          playersData['home_players'] ?? [],
          Colors.blue,
        ),
        
        const SizedBox(height: 24),
        
        // Away Team Players
        _buildTeamPlayers(
          widget.match.awayTeamName ?? 'Equipo Visitante',
          playersData['away_players'] ?? [],
          Colors.red,
        ),
      ],
    );
  }

  Widget _buildTeamPlayers(String teamName, List<Map<String, dynamic>> players, Color teamColor) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.sports_soccer, color: teamColor),
                const SizedBox(width: 8),
                Text(
                  '$teamName (${players.length} jugadores)',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: teamColor,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            if (players.isEmpty)
              Center(
                child: Column(
                  children: [
                    Icon(
                      Icons.qr_code_scanner,
                      size: 48,
                      color: Colors.grey[400],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Ningún jugador de $teamName ha registrado asistencia QR',
                      style: const TextStyle(
                        color: Colors.grey,
                        fontStyle: FontStyle.italic,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Los jugadores aparecerán aquí al escanear su código QR',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[600],
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
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
                        color: teamColor.withOpacity(0.1),
                        border: Border.all(color: teamColor),
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: teamColor.withOpacity(0.2),
                            blurRadius: 4,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          CircleAvatar(
                            radius: 12,
                            backgroundColor: teamColor,
                            child: Text(
                              player['jersey_number']?.toString() ?? '?',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                player['name'] ?? 'Sin nombre',
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              Text(
                                player['position'] ?? '',
                                style: TextStyle(
                                  fontSize: 10,
                                  color: Colors.grey[600],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(width: 4),
                          Icon(
                            Icons.arrow_forward_ios,
                            size: 12,
                            color: teamColor,
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

  Widget _buildInfoRow(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 60,
          child: Text(
            '$label:',
            style: const TextStyle(
              fontWeight: FontWeight.w500,
              color: Colors.grey,
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(fontSize: 16),
          ),
        ),
      ],
    );
  }

  Widget _buildTeamLogo(String? logoUrl, double radius) {
    return CircleAvatar(
      radius: radius,
      backgroundColor: Colors.grey[200],
      child: logoUrl != null && logoUrl.isNotEmpty
          ? ClipOval(
              child: _buildLogoImage(logoUrl, radius * 2, radius * 2),
            )
          : Icon(
              Icons.sports_soccer,
              size: radius,
              color: Colors.green,
            ),
    );
  }

  Widget _buildLogoImage(String logoUrl, double width, double height) {
    // Check if it's a base64 encoded image
    if (logoUrl.startsWith('data:image/')) {
      try {
        // Extract the base64 part after the comma
        final base64String = logoUrl.split(',')[1];
        final Uint8List bytes = base64Decode(base64String);
        
        return Image.memory(
          bytes,
          width: width,
          height: height,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) {
            print('❌ Error cargando logo base64: $error');
            return Icon(
              Icons.sports_soccer,
              size: width / 2,
              color: Colors.green,
            );
          },
        );
      } catch (e) {
        print('❌ Error decodificando base64: $e');
        return Icon(
          Icons.sports_soccer,
          size: width / 2,
          color: Colors.green,
        );
      }
    } else {
      // It's a regular URL
      return Image.network(
        logoUrl,
        width: width,
        height: height,
        fit: BoxFit.cover,
        loadingBuilder: (context, child, loadingProgress) {
          if (loadingProgress == null) return child;
          return SizedBox(
            width: width / 2,
            height: height / 2,
            child: const CircularProgressIndicator(
              strokeWidth: 2,
              color: Colors.green,
            ),
          );
        },
        errorBuilder: (context, error, stackTrace) {
          print('❌ Error cargando logo URL: $logoUrl - $error');
          return Icon(
            Icons.sports_soccer,
            size: width / 2,
            color: Colors.green,
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
        return Colors.green;
      case MatchStatus.finished:
        return Colors.grey;
      case MatchStatus.cancelled:
        return Colors.red;
    }
  }
}