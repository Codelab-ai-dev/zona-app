import 'dart:convert';
import 'dart:typed_data';

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

/// Normalizes a name: uppercase + remove accents/diacritics
String _normalizeName(String name) {
  const accents =
      'àáâãäåèéêëìíîïòóôõöùúûüýÿñçÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝŸÑÇ';
  const normals =
      'aaaaaaeeeeiiiioooooouuuuyyncAAAAAAEEEEIIIIOOOOOUUUUYYNC';
  String result = name;
  for (int i = 0; i < accents.length; i++) {
    result = result.replaceAll(accents[i], normals[i]);
  }
  return result.toUpperCase();
}

/// Generates QR code data in legacy JSON format
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

/// Player Credential Screen — shows ID-card-style credentials
/// Batch mode: loads all team players
/// Single mode: shows one player's credential card
class PlayerCredentialScreen extends StatelessWidget {
  final PlayerEntity? player;
  final String teamId;
  final String teamName;
  final String? leagueId;

  const PlayerCredentialScreen({
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
      return _SingleCredentialView(
        player: player!,
        teamId: teamId,
        teamName: teamName,
        leagueId: leagueId,
      );
    }

    return BlocProvider(
      create: (_) =>
          sl<PlayerBloc>()..add(LoadPlayersByTeamEvent(teamId: teamId)),
      child: _BatchCredentialView(
        teamId: teamId,
        teamName: teamName,
        leagueId: leagueId,
      ),
    );
  }
}

// ==================== Single Credential View ====================

class _SingleCredentialView extends StatelessWidget {
  final PlayerEntity player;
  final String teamId;
  final String teamName;
  final String? leagueId;

  const _SingleCredentialView({
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
        appBar: _buildAppBar(context),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              _CredentialCard(
                player: player,
                teamId: teamId,
                teamName: teamName,
                leagueId: leagueId,
              ),
              const SizedBox(height: 24),
              // Copy QR data button
              SizedBox(
                width: double.infinity,
                height: 48,
                child: OutlinedButton.icon(
                  onPressed: () {
                    final qrData = _generateQrData(
                      playerId: player.id,
                      playerName: player.name,
                      teamId: teamId,
                      jerseyNumber: player.jerseyNumber ?? 0,
                      leagueId: leagueId,
                    );
                    Clipboard.setData(ClipboardData(text: qrData));
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: const Text('Datos QR copiados'),
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
                        fontSize: 15, letterSpacing: 1.5),
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
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(BuildContext context) {
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
            border: Border.all(color: _SN.gold.withOpacity(0.2)),
          ),
          child: const Icon(Icons.arrow_back, color: _SN.gold, size: 18),
        ),
        onPressed: () => Navigator.pop(context),
      ),
      title: Text(
        'CREDENCIAL',
        style: GoogleFonts.bebasNeue(
          fontSize: 22,
          color: _SN.textPrimary,
          letterSpacing: 2,
        ),
      ),
      centerTitle: true,
    );
  }
}

// ==================== Batch Credential View ====================

class _BatchCredentialView extends StatelessWidget {
  final String teamId;
  final String teamName;
  final String? leagueId;

  const _BatchCredentialView({
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
              child:
                  const Icon(Icons.arrow_back, color: _SN.gold, size: 18),
            ),
            onPressed: () => Navigator.pop(context),
          ),
          title: Column(
            children: [
              Text(
                'CREDENCIALES',
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
                    (a.jerseyNumber ?? 999)
                        .compareTo(b.jerseyNumber ?? 999));

              if (activePlayers.isEmpty) {
                return _buildEmpty();
              }

              return _buildList(context, activePlayers);
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
            'GENERANDO CREDENCIALES',
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
              child: const Icon(Icons.badge, size: 50, color: _SN.gold),
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
              'No hay jugadores activos para generar credenciales.',
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
              child: const Icon(Icons.error_outline,
                  size: 36, color: _SN.error),
            ),
            const SizedBox(height: 20),
            Text(message,
                textAlign: TextAlign.center,
                style: GoogleFonts.outfit(
                    fontSize: 14, color: _SN.textSecondary)),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () {
                context
                    .read<PlayerBloc>()
                    .add(LoadPlayersByTeamEvent(teamId: teamId));
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

  Widget _buildList(BuildContext context, List<PlayerEntity> players) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          color: _SN.surfaceDark,
          child: Row(
            children: [
              const Icon(Icons.badge, color: _SN.gold, size: 18),
              const SizedBox(width: 8),
              Text(
                '${players.length} credenciales',
                style: GoogleFonts.outfit(
                  fontSize: 13,
                  color: _SN.textSecondary,
                ),
              ),
              const Spacer(),
              Text(
                'Toca para ver detalle',
                style: GoogleFonts.outfit(
                  fontSize: 12,
                  color: _SN.textMuted,
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
            itemCount: players.length,
            itemBuilder: (context, index) {
              final player = players[index];
              return Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: GestureDetector(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => PlayerCredentialScreen(
                          player: player,
                          teamId: teamId,
                          teamName: teamName,
                          leagueId: leagueId,
                        ),
                      ),
                    );
                  },
                  child: _CredentialCard(
                    player: player,
                    teamId: teamId,
                    teamName: teamName,
                    leagueId: leagueId,
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

// ==================== Credential Card Widget ====================

class _CredentialCard extends StatelessWidget {
  final PlayerEntity player;
  final String teamId;
  final String teamName;
  final String? leagueId;

  const _CredentialCard({
    required this.player,
    required this.teamId,
    required this.teamName,
    this.leagueId,
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

    // ID card proportions (85.6 x 53.98mm ≈ 1.585:1 aspect ratio)
    return AspectRatio(
      aspectRatio: 1.585,
      child: Container(
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF1A1A2E),
              Color(0xFF16213E),
              Color(0xFF0F3460),
            ],
          ),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: _SN.gold.withOpacity(0.4),
            width: 1.5,
          ),
          boxShadow: [
            BoxShadow(
              color: _SN.gold.withOpacity(0.1),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(13),
          child: Column(
            children: [
              // Header bar
              _buildHeader(),
              // Content
              Expanded(child: _buildContent(qrData)),
              // Footer
              _buildFooter(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            _SN.gold.withOpacity(0.15),
            _SN.gold.withOpacity(0.05),
          ],
        ),
        border: Border(
          bottom: BorderSide(color: _SN.gold.withOpacity(0.2)),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 22,
            height: 22,
            decoration: BoxDecoration(
              color: _SN.gold.withOpacity(0.2),
              borderRadius: BorderRadius.circular(6),
            ),
            child: const Icon(Icons.shield, size: 14, color: _SN.gold),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              teamName.toUpperCase(),
              style: GoogleFonts.bebasNeue(
                fontSize: 14,
                color: _SN.gold,
                letterSpacing: 1.5,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContent(String qrData) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Row(
        children: [
          // Player photo
          Container(
            width: 60,
            height: 75,
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.08),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: Colors.white.withOpacity(0.15),
                width: 1.5,
              ),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(7),
              child: player.hasPhoto
                  ? _buildPhoto(player.photo!)
                  : Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.person,
                              size: 28,
                              color: _SN.gold.withOpacity(0.5)),
                          const SizedBox(height: 2),
                          Text(
                            player.initials,
                            style: GoogleFonts.bebasNeue(
                              fontSize: 14,
                              color: _SN.gold.withOpacity(0.7),
                            ),
                          ),
                        ],
                      ),
                    ),
            ),
          ),
          const SizedBox(width: 10),

          // Player info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Name
                Text(
                  player.name,
                  style: GoogleFonts.outfit(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: _SN.textPrimary,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                // Position
                if (player.hasPosition)
                  Text(
                    player.positionDisplay,
                    style: GoogleFonts.outfit(
                      fontSize: 11,
                      color: _SN.textSecondary,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                const SizedBox(height: 6),
                // Jersey number badge
                if (player.hasJerseyNumber)
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(
                        colors: [
                          _SN.gold,
                          _SN.gold.withOpacity(0.8),
                        ],
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: _SN.gold.withOpacity(0.3),
                          blurRadius: 6,
                        ),
                      ],
                    ),
                    child: Center(
                      child: Text(
                        '${player.jerseyNumber}',
                        style: GoogleFonts.bebasNeue(
                          fontSize: 16,
                          color: const Color(0xFF1A1A2E),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 8),

          // QR Code
          Container(
            width: 86,
            height: 86,
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: Colors.white.withOpacity(0.3),
                width: 1,
              ),
            ),
            child: QrImageView(
              data: qrData,
              version: QrVersions.auto,
              size: 78,
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
        ],
      ),
    );
  }

  Widget _buildFooter() {
    final credentialId = player.id.length >= 8
        ? player.id.substring(player.id.length - 8).toUpperCase()
        : player.id.toUpperCase();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            _SN.gold.withOpacity(0.1),
            _SN.gold.withOpacity(0.03),
          ],
        ),
        border: Border(
          top: BorderSide(color: _SN.gold.withOpacity(0.2)),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            'ID: $credentialId',
            style: GoogleFonts.outfit(
              fontSize: 9,
              color: _SN.textMuted,
              fontWeight: FontWeight.w500,
            ),
          ),
          Text(
            'CREDENCIAL OFICIAL',
            style: GoogleFonts.bebasNeue(
              fontSize: 10,
              color: _SN.gold,
              letterSpacing: 1.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPhoto(String photoData) {
    try {
      if (photoData.startsWith('data:image/')) {
        final base64Data = photoData.split(',')[1];
        final Uint8List bytes = base64Decode(base64Data);
        return Image.memory(bytes, width: 60, height: 75, fit: BoxFit.cover);
      }
      return Image.network(
        photoData,
        width: 60,
        height: 75,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => Center(
          child: Icon(Icons.person,
              color: _SN.gold.withOpacity(0.5), size: 28),
        ),
      );
    } catch (_) {
      return Center(
        child: Icon(Icons.person,
            color: _SN.gold.withOpacity(0.5), size: 28),
      );
    }
  }
}
