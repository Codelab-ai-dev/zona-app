import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../../core/di/injection.dart';
import '../../../domain/entities/player_entity.dart';
import '../../bloc/player/player_bloc.dart';
import '../../bloc/player/player_event.dart';
import '../../bloc/player/player_state.dart';

/// Stadium Nights Design System
class _SN {
  static const Color backgroundDark = Color(0xFF050508);
  static const Color surfaceDark = Color(0xFF0A0A0F);
  static const Color cardDark = Color(0xFF12121A);
  static const Color gold = Color(0xFFFFD700);
  static const Color neonGreen = Color(0xFF00FF7F);
  static const Color error = Color(0xFFEF4444);
  static const Color textPrimary = Color(0xFFFAFAFA);
  static const Color textSecondary = Color(0xFF9CA3AF);
  static const Color textMuted = Color(0xFF6B7280);
}

/// Generates QR code data in the legacy JSON format compatible with the scanner
String _generateQrData({
  required String playerId,
  required String playerName,
  required String teamId,
  required int jerseyNumber,
  String? leagueId,
}) {
  return json.encode({
    'type': 'player_verification',
    'player_id': playerId,
    'player_name': _normalizeName(playerName),
    'team_id': teamId,
    'jersey_number': jerseyNumber,
    if (leagueId != null) 'league_id': leagueId,
    'timestamp': DateTime.now().toIso8601String(),
    'version': '1.0',
  });
}

/// Normalizes a name: uppercase + remove accents/diacritics
String _normalizeName(String name) {
  const accents = 'àáâãäåèéêëìíîïòóôõöùúûüýÿñçÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝŸÑÇ';
  const normals = 'aaaaaaeeeeiiiioooooouuuuyyncAAAAAAEEEEIIIIOOOOOUUUUYYNC';
  String result = name;
  for (int i = 0; i < accents.length; i++) {
    result = result.replaceAll(accents[i], normals[i]);
  }
  return result.toUpperCase();
}

/// Player QR Code Screen
/// Two modes:
/// - Single player: shows one large QR code
/// - Batch: loads all team players and shows QR codes in a list
class PlayerQrScreen extends StatelessWidget {
  final PlayerEntity? player;
  final String teamId;
  final String teamName;
  final String? leagueId;

  const PlayerQrScreen({
    super.key,
    this.player,
    required this.teamId,
    required this.teamName,
    this.leagueId,
  });

  bool get isBatchMode => player == null;

  @override
  Widget build(BuildContext context) {
    if (!isBatchMode) {
      return _SinglePlayerQrView(
        player: player!,
        teamId: teamId,
        teamName: teamName,
        leagueId: leagueId,
      );
    }

    return BlocProvider(
      create: (_) => sl<PlayerBloc>()
        ..add(LoadPlayersByTeamEvent(teamId: teamId)),
      child: _BatchQrView(
        teamId: teamId,
        teamName: teamName,
        leagueId: leagueId,
      ),
    );
  }
}

// ==================== Single Player QR View ====================

class _SinglePlayerQrView extends StatelessWidget {
  final PlayerEntity player;
  final String teamId;
  final String teamName;
  final String? leagueId;

  const _SinglePlayerQrView({
    required this.player,
    required this.teamId,
    required this.teamName,
    this.leagueId,
  });

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light.copyWith(
        statusBarColor: Colors.transparent,
      ),
      child: Scaffold(
        backgroundColor: _SN.backgroundDark,
        appBar: AppBar(
          backgroundColor: _SN.surfaceDark,
          foregroundColor: _SN.textPrimary,
          elevation: 0,
          leading: IconButton(
            icon: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.3),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: _SN.gold.withOpacity(0.2)),
              ),
              child: const Icon(Icons.arrow_back, color: _SN.gold, size: 18),
            ),
            onPressed: () => Navigator.pop(context),
          ),
          title: Text(
            'CÓDIGO QR',
            style: GoogleFonts.bebasNeue(
              fontSize: 22,
              color: _SN.textPrimary,
              letterSpacing: 2,
            ),
          ),
          centerTitle: true,
        ),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: _PlayerQrCard(
            player: player,
            teamId: teamId,
            teamName: teamName,
            leagueId: leagueId,
            isLarge: true,
          ),
        ),
      ),
    );
  }
}

// ==================== Batch QR View ====================

class _BatchQrView extends StatelessWidget {
  final String teamId;
  final String teamName;
  final String? leagueId;

  const _BatchQrView({
    required this.teamId,
    required this.teamName,
    this.leagueId,
  });

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light.copyWith(
        statusBarColor: Colors.transparent,
      ),
      child: Scaffold(
        backgroundColor: _SN.backgroundDark,
        appBar: AppBar(
          backgroundColor: _SN.surfaceDark,
          foregroundColor: _SN.textPrimary,
          elevation: 0,
          leading: IconButton(
            icon: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.3),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: _SN.gold.withOpacity(0.2)),
              ),
              child: const Icon(Icons.arrow_back, color: _SN.gold, size: 18),
            ),
            onPressed: () => Navigator.pop(context),
          ),
          title: Column(
            children: [
              Text(
                'CÓDIGOS QR',
                style: GoogleFonts.bebasNeue(
                  fontSize: 22,
                  color: _SN.textPrimary,
                  letterSpacing: 2,
                ),
              ),
              Text(
                teamName,
                style: GoogleFonts.outfit(
                  fontSize: 12,
                  color: _SN.textSecondary,
                ),
              ),
            ],
          ),
          centerTitle: true,
        ),
        body: BlocBuilder<PlayerBloc, PlayerState>(
          builder: (context, state) {
            if (state is PlayerLoading) {
              return _buildLoading();
            }
            if (state is PlayerError) {
              return _buildError(context, state.message);
            }
            if (state is PlayersLoaded) {
              final activePlayers = state.players
                  .where((p) => p.isActive)
                  .toList()
                ..sort((a, b) =>
                    (a.jerseyNumber ?? 999).compareTo(b.jerseyNumber ?? 999));

              if (activePlayers.isEmpty) {
                return _buildEmpty();
              }

              return _buildPlayerList(context, activePlayers);
            }
            return _buildLoading();
          },
        ),
      ),
    );
  }

  Widget _buildLoading() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const SizedBox(
            width: 50,
            height: 50,
            child: CircularProgressIndicator(
              strokeWidth: 3,
              valueColor: AlwaysStoppedAnimation<Color>(_SN.gold),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'GENERANDO CÓDIGOS QR',
            style: GoogleFonts.bebasNeue(
              fontSize: 16,
              color: _SN.textMuted,
              letterSpacing: 2,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmpty() {
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
                color: _SN.gold.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.qr_code_2,
                size: 50,
                color: _SN.gold,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'SIN JUGADORES',
              style: GoogleFonts.bebasNeue(
                fontSize: 24,
                color: _SN.textPrimary,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'No hay jugadores activos para generar códigos QR.',
              textAlign: TextAlign.center,
              style: GoogleFonts.outfit(
                fontSize: 14,
                color: _SN.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildError(BuildContext context, String message) {
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
                color: _SN.error.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.error_outline, size: 36, color: _SN.error),
            ),
            const SizedBox(height: 20),
            Text(
              'ERROR',
              style: GoogleFonts.bebasNeue(
                fontSize: 24,
                color: _SN.textPrimary,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: GoogleFonts.outfit(fontSize: 14, color: _SN.textSecondary),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () {
                context.read<PlayerBloc>().add(
                      LoadPlayersByTeamEvent(teamId: teamId),
                    );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: _SN.gold,
                foregroundColor: Colors.black,
              ),
              child: const Text('Reintentar'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPlayerList(BuildContext context, List<PlayerEntity> players) {
    return Column(
      children: [
        // Player count + info bar
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          color: _SN.surfaceDark,
          child: Row(
            children: [
              Icon(Icons.qr_code_2, color: _SN.gold, size: 18),
              const SizedBox(width: 8),
              Text(
                '${players.length} jugadores',
                style: GoogleFonts.outfit(
                  fontSize: 13,
                  color: _SN.textSecondary,
                ),
              ),
              const Spacer(),
              Text(
                'Toca para ampliar',
                style: GoogleFonts.outfit(
                  fontSize: 12,
                  color: _SN.textMuted,
                ),
              ),
            ],
          ),
        ),
        // List
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
            itemCount: players.length,
            itemBuilder: (context, index) {
              final player = players[index];
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: GestureDetector(
                  onTap: () => _showFullQr(context, player),
                  child: _PlayerQrCard(
                    player: player,
                    teamId: teamId,
                    teamName: teamName,
                    leagueId: leagueId,
                    isLarge: false,
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  void _showFullQr(BuildContext context, PlayerEntity player) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PlayerQrScreen(
          player: player,
          teamId: teamId,
          teamName: teamName,
          leagueId: leagueId,
        ),
      ),
    );
  }
}

// ==================== Shared QR Card Widget ====================

class _PlayerQrCard extends StatelessWidget {
  final PlayerEntity player;
  final String teamId;
  final String teamName;
  final String? leagueId;
  final bool isLarge;

  const _PlayerQrCard({
    required this.player,
    required this.teamId,
    required this.teamName,
    this.leagueId,
    required this.isLarge,
  });

  @override
  Widget build(BuildContext context) {
    final qrData = _generateQrData(
      playerId: player.id,
      playerName: player.name,
      teamId: teamId,
      jerseyNumber: player.jerseyNumber ?? 0,
      leagueId: leagueId,
    );

    final qrSize = isLarge ? 220.0 : 120.0;

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            _SN.cardDark,
            _SN.gold.withOpacity(0.03),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _SN.gold.withOpacity(0.15)),
      ),
      child: isLarge
          ? _buildLargeLayout(context, qrData, qrSize)
          : _buildCompactLayout(qrData, qrSize),
    );
  }

  Widget _buildLargeLayout(
      BuildContext context, String qrData, double qrSize) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          // Player info header
          _buildPlayerInfo(isCompact: false),
          const SizedBox(height: 24),

          // QR Code
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
            ),
            child: QrImageView(
              data: qrData,
              version: QrVersions.auto,
              size: qrSize,
              backgroundColor: Colors.white,
              eyeStyle: const QrEyeStyle(
                eyeShape: QrEyeShape.square,
                color: Color(0xFF1A1A2E),
              ),
              dataModuleStyle: const QrDataModuleStyle(
                dataModuleShape: QrDataModuleShape.square,
                color: Color(0xFF1A1A2E),
              ),
            ),
          ),
          const SizedBox(height: 20),

          // Team name
          Text(
            teamName,
            style: GoogleFonts.outfit(
              fontSize: 14,
              color: _SN.textSecondary,
            ),
          ),
          const SizedBox(height: 16),

          // Copy QR data button
          SizedBox(
            width: double.infinity,
            height: 48,
            child: OutlinedButton.icon(
              onPressed: () {
                Clipboard.setData(ClipboardData(text: qrData));
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: const Text('Datos QR copiados al portapapeles'),
                    backgroundColor: _SN.neonGreen.withOpacity(0.9),
                    behavior: SnackBarBehavior.floating,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                );
              },
              icon: const Icon(Icons.copy, size: 18),
              label: Text(
                'COPIAR DATOS QR',
                style: GoogleFonts.bebasNeue(
                  fontSize: 15,
                  letterSpacing: 1.5,
                ),
              ),
              style: OutlinedButton.styleFrom(
                foregroundColor: _SN.gold,
                side: BorderSide(color: _SN.gold.withOpacity(0.4)),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCompactLayout(String qrData, double qrSize) {
    return Padding(
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          // QR Code
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
            ),
            child: QrImageView(
              data: qrData,
              version: QrVersions.auto,
              size: qrSize,
              backgroundColor: Colors.white,
              eyeStyle: const QrEyeStyle(
                eyeShape: QrEyeShape.square,
                color: Color(0xFF1A1A2E),
              ),
              dataModuleStyle: const QrDataModuleStyle(
                dataModuleShape: QrDataModuleShape.square,
                color: Color(0xFF1A1A2E),
              ),
            ),
          ),
          const SizedBox(width: 14),

          // Player info
          Expanded(child: _buildPlayerInfo(isCompact: true)),

          // Chevron
          Icon(
            Icons.chevron_right,
            color: _SN.textMuted.withOpacity(0.5),
            size: 20,
          ),
        ],
      ),
    );
  }

  Widget _buildPlayerInfo({required bool isCompact}) {
    return Column(
      crossAxisAlignment:
          isCompact ? CrossAxisAlignment.start : CrossAxisAlignment.center,
      mainAxisSize: MainAxisSize.min,
      children: [
        // Jersey number
        if (player.hasJerseyNumber)
          Text(
            '#${player.jerseyNumber}',
            style: GoogleFonts.bebasNeue(
              fontSize: isCompact ? 16 : 22,
              color: _SN.gold,
            ),
          ),
        // Name
        Text(
          player.name,
          style: GoogleFonts.outfit(
            fontSize: isCompact ? 15 : 20,
            fontWeight: FontWeight.w600,
            color: _SN.textPrimary,
          ),
          textAlign: isCompact ? TextAlign.left : TextAlign.center,
          maxLines: isCompact ? 1 : 2,
          overflow: TextOverflow.ellipsis,
        ),
        const SizedBox(height: 4),
        // Position
        if (player.hasPosition)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: _SN.neonGreen.withOpacity(0.1),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              player.positionDisplay,
              style: GoogleFonts.outfit(
                fontSize: isCompact ? 11 : 12,
                color: _SN.neonGreen,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
      ],
    );
  }
}
