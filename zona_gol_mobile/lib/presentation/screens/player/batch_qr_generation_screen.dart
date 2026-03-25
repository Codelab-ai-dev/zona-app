import 'dart:convert';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../../core/di/injection.dart';
import '../../../domain/entities/player_entity.dart';
import '../../../domain/entities/user_entity.dart';
import '../../bloc/player/player_bloc.dart';
import '../../bloc/player/player_event.dart';
import '../../bloc/player/player_state.dart';

class _S {
  static const Color backgroundDark = Color(0xFF050508);
  static const Color surfaceDark = Color(0xFF0A0A0F);
  static const Color cardDark = Color(0xFF12121A);
  static const Color gold = Color(0xFFFFD700);
  static const Color neonGreen = Color(0xFF00FF7F);
  static const Color success = Color(0xFF10B981);
  static const Color error = Color(0xFFEF4444);
  static const Color textPrimary = Color(0xFFFAFAFA);
  static const Color textSecondary = Color(0xFF9CA3AF);
  static const Color textMuted = Color(0xFF6B7280);
}

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

String _normalizeName(String name) {
  const accents = 'àáâãäåèéêëìíîïòóôõöùúûüýÿñçÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝŸÑÇ';
  const normals = 'aaaaaaeeeeiiiioooooouuuuyyncAAAAAAEEEEIIIIOOOOOUUUUYYNC';
  String result = name;
  for (int i = 0; i < accents.length; i++) {
    result = result.replaceAll(accents[i], normals[i]);
  }
  return result.toUpperCase();
}

/// Batch QR Generation Screen
/// Generates QR codes for all players in the league
class BatchQrGenerationScreen extends StatelessWidget {
  final UserEntity user;

  const BatchQrGenerationScreen({super.key, required this.user});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) {
        final bloc = sl<PlayerBloc>();
        if (user.leagueId != null) {
          bloc.add(LoadPlayersByLeagueEvent(leagueId: user.leagueId!));
        }
        return bloc;
      },
      child: _BatchQrView(user: user),
    );
  }
}

class _BatchQrView extends StatefulWidget {
  final UserEntity user;
  const _BatchQrView({required this.user});

  @override
  State<_BatchQrView> createState() => _BatchQrViewState();
}

class _BatchQrViewState extends State<_BatchQrView> {
  bool _generating = false;
  int _generated = 0;
  int _total = 0;

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: _S.backgroundDark,
        appBar: AppBar(
          backgroundColor: _S.surfaceDark,
          foregroundColor: _S.textPrimary,
          elevation: 0,
          leading: IconButton(
            icon: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.3),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: _S.gold.withOpacity(0.2)),
              ),
              child: const Icon(Icons.arrow_back, color: _S.gold, size: 18),
            ),
            onPressed: () => Navigator.pop(context),
          ),
          title: Text(
            'QR MASIVO',
            style: GoogleFonts.bebasNeue(fontSize: 22, color: _S.textPrimary, letterSpacing: 2),
          ),
          centerTitle: true,
        ),
        body: BlocBuilder<PlayerBloc, PlayerState>(
          builder: (context, state) {
            if (state is PlayerLoading) {
              return Center(
                child: CircularProgressIndicator(
                  valueColor: AlwaysStoppedAnimation<Color>(_S.gold),
                ),
              );
            }

            if (state is PlayerError) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error_outline, size: 50, color: _S.error),
                    const SizedBox(height: 16),
                    Text(state.message, style: GoogleFonts.outfit(color: _S.textSecondary)),
                  ],
                ),
              );
            }

            if (state is LeaguePlayersLoaded) {
              return _buildContent(state.players);
            }

            return const SizedBox.shrink();
          },
        ),
      ),
    );
  }

  Widget _buildContent(List<PlayerEntity> players) {
    final validPlayers = players.where((p) => p.jerseyNumber != null).toList();

    return Column(
      children: [
        // Stats
        Container(
          margin: const EdgeInsets.all(16),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: _S.cardDark,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: _S.gold.withOpacity(0.2)),
          ),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildStat('Total', players.length.toString(), _S.gold),
                  _buildStat('Con #', validPlayers.length.toString(), _S.neonGreen),
                  _buildStat('Sin #', (players.length - validPlayers.length).toString(), _S.error),
                ],
              ),
              if (_generating) ...[
                const SizedBox(height: 16),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: _total > 0 ? _generated / _total : 0,
                    backgroundColor: _S.surfaceDark,
                    valueColor: AlwaysStoppedAnimation<Color>(_S.neonGreen),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Generando $_generated / $_total',
                  style: GoogleFonts.outfit(fontSize: 12, color: _S.textSecondary),
                ),
              ],
            ],
          ),
        ),

        // Info
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: _S.gold.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: _S.gold.withOpacity(0.2)),
            ),
            child: Row(
              children: [
                const Icon(Icons.info_outline, color: _S.gold, size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Se generarán QR para ${validPlayers.length} jugadores con número de camiseta asignado.',
                    style: GoogleFonts.outfit(fontSize: 12, color: _S.textSecondary),
                  ),
                ),
              ],
            ),
          ),
        ),

        const SizedBox(height: 16),

        // Player grid with QR preview
        Expanded(
          child: GridView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 0.75,
            ),
            itemCount: validPlayers.length,
            itemBuilder: (context, index) => _buildQrCard(validPlayers[index]),
          ),
        ),
      ],
    );
  }

  Widget _buildStat(String label, String value, Color color) {
    return Column(
      children: [
        Text(value, style: GoogleFonts.bebasNeue(fontSize: 28, color: color)),
        Text(label, style: GoogleFonts.outfit(fontSize: 12, color: _S.textSecondary)),
      ],
    );
  }

  Widget _buildQrCard(PlayerEntity player) {
    final qrData = _generateQrData(
      playerId: player.id,
      playerName: player.name,
      teamId: player.teamId,
      jerseyNumber: player.jerseyNumber ?? 0,
      leagueId: widget.user.leagueId,
    );

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: _S.cardDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _S.gold.withOpacity(0.15)),
      ),
      child: Column(
        children: [
          // Player name
          Text(
            player.displayName,
            style: GoogleFonts.outfit(fontSize: 12, color: _S.textPrimary, fontWeight: FontWeight.w500),
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 8),
          // QR Code
          Expanded(
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
              ),
              child: QrImageView(
                data: qrData,
                version: QrVersions.auto,
                backgroundColor: Colors.white,
                eyeStyle: const QrEyeStyle(
                  eyeShape: QrEyeShape.square,
                  color: Color(0xFF050508),
                ),
                dataModuleStyle: const QrDataModuleStyle(
                  dataModuleShape: QrDataModuleShape.square,
                  color: Color(0xFF050508),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
