import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import '../../../core/di/injection.dart';
import '../../../domain/entities/player_entity.dart';
import '../../../domain/entities/player_stats_entity.dart';
import '../../bloc/player/player_bloc.dart';
import '../../bloc/player/player_event.dart';
import '../../bloc/player/player_state.dart';
import '../../bloc/player_stats/player_stats_bloc.dart';
import '../../bloc/player_stats/player_stats_event.dart';
import '../../bloc/player_stats/player_stats_state.dart';
import '../statistics/player_performance_screen.dart';
import 'create_edit_player_screen.dart';
import 'player_credential_screen.dart';
import 'player_qr_screen.dart';

/// Stadium Nights Design System
class _StadiumNights {
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

/// Player Detail Screen
class PlayerDetailScreen extends StatelessWidget {
  final PlayerEntity player;
  final String teamName;
  final bool canEdit;
  final String teamId;

  const PlayerDetailScreen({
    super.key,
    required this.player,
    required this.teamName,
    required this.teamId,
    this.canEdit = false,
  });

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(
          create: (context) => sl<PlayerBloc>()
            ..add(LoadPlayerByIdEvent(playerId: player.id)),
        ),
        BlocProvider(
          create: (context) => sl<PlayerStatsBloc>()
            ..add(LoadPlayerStatsByIdEvent(playerId: player.id)),
        ),
      ],
      child: _PlayerDetailView(
        initialPlayer: player,
        teamName: teamName,
        canEdit: canEdit,
        teamId: teamId,
      ),
    );
  }
}

class _PlayerDetailView extends StatelessWidget {
  final PlayerEntity initialPlayer;
  final String teamName;
  final bool canEdit;
  final String teamId;

  const _PlayerDetailView({
    required this.initialPlayer,
    required this.teamName,
    required this.canEdit,
    required this.teamId,
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
        body: BlocConsumer<PlayerBloc, PlayerState>(
          listener: (context, state) {
            if (state is PlayerDeleted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Jugador eliminado'),
                  backgroundColor: _StadiumNights.success,
                ),
              );
              Navigator.pop(context);
            }
            if (state is PlayerError) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(state.message),
                  backgroundColor: _StadiumNights.error,
                ),
              );
            }
          },
          builder: (context, state) {
            final player = state is PlayerDetailLoaded
                ? state.player
                : initialPlayer;
            return _buildContent(context, player);
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
          child: const Icon(Icons.arrow_back, color: _StadiumNights.gold, size: 18),
        ),
        onPressed: () => Navigator.pop(context),
      ),
      title: Text(
        'DETALLE JUGADOR',
        style: GoogleFonts.bebasNeue(
          fontSize: 22,
          color: _StadiumNights.textPrimary,
          letterSpacing: 2,
        ),
      ),
      centerTitle: true,
      actions: [
        IconButton(
          icon: const Icon(Icons.qr_code_2, color: _StadiumNights.gold),
          onPressed: () => _navigateToQr(context),
          tooltip: 'Ver código QR',
        ),
        if (canEdit)
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert, color: _StadiumNights.gold),
            color: _StadiumNights.cardDark,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: BorderSide(color: _StadiumNights.gold.withOpacity(0.2)),
            ),
            onSelected: (value) {
              if (value == 'edit') {
                _navigateToEdit(context);
              } else if (value == 'credential') {
                _navigateToCredential(context);
              } else if (value == 'delete') {
                _showDeleteConfirmation(context);
              }
            },
            itemBuilder: (context) => [
              PopupMenuItem(
                value: 'edit',
                child: Row(
                  children: [
                    const Icon(Icons.edit, color: _StadiumNights.gold, size: 18),
                    const SizedBox(width: 8),
                    Text('Editar', style: GoogleFonts.outfit(color: _StadiumNights.textPrimary)),
                  ],
                ),
              ),
              PopupMenuItem(
                value: 'credential',
                child: Row(
                  children: [
                    const Icon(Icons.badge, color: _StadiumNights.gold, size: 18),
                    const SizedBox(width: 8),
                    Text('Credencial', style: GoogleFonts.outfit(color: _StadiumNights.textPrimary)),
                  ],
                ),
              ),
              PopupMenuItem(
                value: 'delete',
                child: Row(
                  children: [
                    const Icon(Icons.delete_outline, color: _StadiumNights.error, size: 18),
                    const SizedBox(width: 8),
                    Text('Eliminar', style: GoogleFonts.outfit(color: _StadiumNights.error)),
                  ],
                ),
              ),
            ],
          ),
      ],
    );
  }

  Widget _buildContent(BuildContext context, PlayerEntity player) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Player avatar header
          _buildPlayerHeader(player),
          const SizedBox(height: 24),
          // Info cards
          _buildInfoCard(
            'Información General',
            Icons.person,
            [
              _InfoRow('Nombre', player.name),
              _InfoRow('Equipo', teamName),
              _InfoRow('Posición', player.positionDisplay),
              _InfoRow('Número', player.hasJerseyNumber ? '#${player.jerseyNumber}' : 'N/A'),
              _InfoRow('Estado', player.statusText),
            ],
          ),
          const SizedBox(height: 12),
          _buildInfoCard(
            'Datos Personales',
            Icons.badge,
            [
              _InfoRow(
                'Fecha de Nacimiento',
                player.birthDate != null
                    ? DateFormat('dd/MM/yyyy').format(player.birthDate!)
                    : 'N/A',
              ),
              _InfoRow('Edad', player.age != null ? '${player.age} años' : 'N/A'),
              _InfoRow('ID Verificado', player.idVerified ? 'Sí' : 'No'),
            ],
          ),
          const SizedBox(height: 12),
          // Performance stats section
          _buildStatsSection(),
          const SizedBox(height: 12),
          if (player.createdAt != null || player.updatedAt != null)
            _buildInfoCard(
              'Registro',
              Icons.history,
              [
                if (player.createdAt != null)
                  _InfoRow('Registrado', DateFormat('dd/MM/yyyy HH:mm').format(player.createdAt!)),
                if (player.updatedAt != null)
                  _InfoRow('Actualizado', DateFormat('dd/MM/yyyy HH:mm').format(player.updatedAt!)),
              ],
            ),
        ],
      ),
    );
  }

  Widget _buildPlayerHeader(PlayerEntity player) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            _StadiumNights.cardDark,
            _StadiumNights.gold.withOpacity(0.05),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _StadiumNights.gold.withOpacity(0.2)),
      ),
      child: Column(
        children: [
          // Photo avatar
          _buildHeaderAvatar(player),
          const SizedBox(height: 16),
          // Name with jersey number
          if (player.hasJerseyNumber)
            Text(
              '#${player.jerseyNumber}',
              style: GoogleFonts.bebasNeue(
                fontSize: 18,
                color: _StadiumNights.gold,
              ),
            ),
          if (player.hasJerseyNumber) const SizedBox(height: 2),
          Text(
            player.name,
            style: GoogleFonts.outfit(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: _StadiumNights.textPrimary,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 4),
          Text(
            teamName,
            style: GoogleFonts.outfit(
              fontSize: 14,
              color: _StadiumNights.textSecondary,
            ),
          ),
          const SizedBox(height: 12),
          // Status + Position badges
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (player.hasPosition)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: _StadiumNights.neonGreen.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: _StadiumNights.neonGreen.withOpacity(0.3)),
                  ),
                  child: Text(
                    player.positionDisplay,
                    style: GoogleFonts.outfit(
                      fontSize: 13,
                      color: _StadiumNights.neonGreen,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              if (player.hasPosition) const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: player.isActive
                      ? _StadiumNights.success.withOpacity(0.1)
                      : _StadiumNights.error.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: player.isActive
                        ? _StadiumNights.success.withOpacity(0.3)
                        : _StadiumNights.error.withOpacity(0.3),
                  ),
                ),
                child: Text(
                  player.statusText,
                  style: GoogleFonts.outfit(
                    fontSize: 13,
                    color: player.isActive ? _StadiumNights.success : _StadiumNights.error,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildInfoCard(String title, IconData icon, List<_InfoRow> rows) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: _StadiumNights.cardDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _StadiumNights.gold.withOpacity(0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
            child: Row(
              children: [
                Icon(icon, color: _StadiumNights.gold, size: 18),
                const SizedBox(width: 8),
                Text(
                  title.toUpperCase(),
                  style: GoogleFonts.bebasNeue(
                    fontSize: 16,
                    color: _StadiumNights.gold,
                    letterSpacing: 1.5,
                  ),
                ),
              ],
            ),
          ),
          Divider(color: _StadiumNights.gold.withOpacity(0.1), height: 1),
          ...rows.map((row) => Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      row.label,
                      style: GoogleFonts.outfit(
                        fontSize: 13,
                        color: _StadiumNights.textMuted,
                      ),
                    ),
                    Text(
                      row.value,
                      style: GoogleFonts.outfit(
                        fontSize: 13,
                        color: _StadiumNights.textPrimary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              )),
        ],
      ),
    );
  }

  Widget _buildStatsSection() {
    return BlocBuilder<PlayerStatsBloc, PlayerStatsState>(
      builder: (context, state) {
        if (state is PlayerStatsLoading) {
          return Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: _StadiumNights.cardDark,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: _StadiumNights.gold.withOpacity(0.1)),
            ),
            child: const Center(
              child: SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: _StadiumNights.gold,
                ),
              ),
            ),
          );
        }

        if (state is PlayerStatsByIdLoaded) {
          final stats = state.stats;
          if (stats == null) {
            return _buildEmptyStats();
          }
          return _buildStatsGrid(stats);
        }

        if (state is PlayerStatsError) {
          return Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: _StadiumNights.cardDark,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: _StadiumNights.error.withOpacity(0.2)),
            ),
            child: Column(
              children: [
                Icon(Icons.error_outline, color: _StadiumNights.error.withOpacity(0.5), size: 28),
                const SizedBox(height: 8),
                Text(
                  'Error al cargar estadísticas',
                  style: GoogleFonts.outfit(fontSize: 13, color: _StadiumNights.textMuted),
                ),
              ],
            ),
          );
        }

        return const SizedBox.shrink();
      },
    );
  }

  Widget _buildEmptyStats() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: _StadiumNights.cardDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _StadiumNights.gold.withOpacity(0.1)),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: Row(
              children: [
                const Icon(Icons.bar_chart, color: _StadiumNights.gold, size: 18),
                const SizedBox(width: 8),
                Text(
                  'RENDIMIENTO',
                  style: GoogleFonts.bebasNeue(
                    fontSize: 16,
                    color: _StadiumNights.gold,
                    letterSpacing: 1.5,
                  ),
                ),
              ],
            ),
          ),
          Icon(Icons.sports_soccer_outlined, color: _StadiumNights.textMuted.withOpacity(0.4), size: 36),
          const SizedBox(height: 8),
          Text(
            'Sin estadísticas aún',
            style: GoogleFonts.outfit(fontSize: 14, color: _StadiumNights.textMuted),
          ),
          const SizedBox(height: 4),
          Text(
            'Las estadísticas aparecerán cuando el jugador participe en partidos',
            style: GoogleFonts.outfit(fontSize: 12, color: _StadiumNights.textMuted.withOpacity(0.6)),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildStatsGrid(PlayerStatsEntity stats) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: _StadiumNights.cardDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _StadiumNights.gold.withOpacity(0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
            child: Row(
              children: [
                const Icon(Icons.bar_chart, color: _StadiumNights.gold, size: 18),
                const SizedBox(width: 8),
                Text(
                  'RENDIMIENTO',
                  style: GoogleFonts.bebasNeue(
                    fontSize: 16,
                    color: _StadiumNights.gold,
                    letterSpacing: 1.5,
                  ),
                ),
              ],
            ),
          ),
          Divider(color: _StadiumNights.gold.withOpacity(0.1), height: 1),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(child: _buildStatTile('Partidos', stats.matchesPlayed.toString(), Icons.sports_soccer)),
                    const SizedBox(width: 8),
                    Expanded(child: _buildStatTile('Goles', stats.goals.toString(), Icons.sports_score,
                      subtitle: stats.matchesPlayed > 0 ? '${stats.goalsPerMatch.toStringAsFixed(1)}/partido' : null)),
                    const SizedBox(width: 8),
                    Expanded(child: _buildStatTile('Asistencias', stats.assists.toString(), Icons.handshake_outlined)),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(child: _buildStatTile('T. Amarillas', stats.yellowCards.toString(), Icons.square,
                      iconColor: const Color(0xFFFFC107))),
                    const SizedBox(width: 8),
                    Expanded(child: _buildStatTile('T. Rojas', stats.redCards.toString(), Icons.square,
                      iconColor: _StadiumNights.error)),
                    const SizedBox(width: 8),
                    Expanded(child: _buildStatTile('Minutos', stats.minutesPlayed.toString(), Icons.timer_outlined,
                      subtitle: stats.goals > 0 ? '${stats.minutesPerGoal.toStringAsFixed(0)} min/gol' : null)),
                  ],
                ),
                const SizedBox(height: 12),
                _buildPerformanceButton(stats),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPerformanceButton(PlayerStatsEntity stats) {
    return Builder(
      builder: (context) {
        return SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => PlayerPerformanceScreen(
                    playerId: initialPlayer.id,
                    playerName: stats.playerName.isNotEmpty
                        ? stats.playerName
                        : initialPlayer.name,
                    teamName: teamName,
                    teamId: teamId,
                  ),
                ),
              );
            },
            icon: const Icon(Icons.analytics_outlined, size: 16),
            label: Text(
              'Ver rendimiento completo',
              style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.w500),
            ),
            style: OutlinedButton.styleFrom(
              foregroundColor: _StadiumNights.neonGreen,
              side: BorderSide(color: _StadiumNights.neonGreen.withOpacity(0.3)),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
              padding: const EdgeInsets.symmetric(vertical: 10),
            ),
          ),
        );
      },
    );
  }

  Widget _buildStatTile(String label, String value, IconData icon, {String? subtitle, Color? iconColor}) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      decoration: BoxDecoration(
        color: _StadiumNights.surfaceDark,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: _StadiumNights.gold.withOpacity(0.08)),
      ),
      child: Column(
        children: [
          Icon(icon, color: iconColor ?? _StadiumNights.gold.withOpacity(0.6), size: 16),
          const SizedBox(height: 6),
          Text(
            value,
            style: GoogleFonts.bebasNeue(
              fontSize: 22,
              color: _StadiumNights.textPrimary,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: GoogleFonts.outfit(
              fontSize: 10,
              color: _StadiumNights.textMuted,
              fontWeight: FontWeight.w500,
            ),
            textAlign: TextAlign.center,
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: GoogleFonts.outfit(
                fontSize: 9,
                color: _StadiumNights.neonGreen.withOpacity(0.7),
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ],
      ),
    );
  }

  void _navigateToCredential(BuildContext context) {
    final bloc = context.read<PlayerBloc>();
    final currentPlayer = bloc.state is PlayerDetailLoaded
        ? (bloc.state as PlayerDetailLoaded).player
        : initialPlayer;

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PlayerCredentialScreen(
          player: currentPlayer,
          teamId: teamId,
          teamName: teamName,
        ),
      ),
    );
  }

  void _navigateToQr(BuildContext context) {
    final bloc = context.read<PlayerBloc>();
    final currentPlayer = bloc.state is PlayerDetailLoaded
        ? (bloc.state as PlayerDetailLoaded).player
        : initialPlayer;

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PlayerQrScreen(
          player: currentPlayer,
          teamId: teamId,
          teamName: teamName,
        ),
      ),
    );
  }

  void _navigateToEdit(BuildContext context) {
    final bloc = context.read<PlayerBloc>();
    final currentPlayer = bloc.state is PlayerDetailLoaded
        ? (bloc.state as PlayerDetailLoaded).player
        : initialPlayer;

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => BlocProvider(
          create: (context) => sl<PlayerBloc>(),
          child: CreateEditPlayerScreen(
            teamId: teamId,
            teamName: teamName,
            player: currentPlayer,
          ),
        ),
      ),
    ).then((_) {
      if (context.mounted) {
        context.read<PlayerBloc>().add(
              LoadPlayerByIdEvent(playerId: initialPlayer.id),
            );
      }
    });
  }

  void _showDeleteConfirmation(BuildContext context) {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: _StadiumNights.cardDark,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: _StadiumNights.error.withOpacity(0.3)),
        ),
        title: Text(
          'Eliminar Jugador',
          style: GoogleFonts.outfit(
            color: _StadiumNights.textPrimary,
            fontWeight: FontWeight.bold,
          ),
        ),
        content: Text(
          '¿Estás seguro que deseas eliminar a ${initialPlayer.name}? El jugador será marcado como inactivo.',
          style: GoogleFonts.outfit(color: _StadiumNights.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: Text(
              'Cancelar',
              style: GoogleFonts.outfit(color: _StadiumNights.textMuted),
            ),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(dialogContext);
              context.read<PlayerBloc>().add(
                    DeletePlayerEvent(playerId: initialPlayer.id),
                  );
            },
            style: TextButton.styleFrom(foregroundColor: _StadiumNights.error),
            child: Text('Eliminar', style: GoogleFonts.outfit()),
          ),
        ],
      ),
    );
  }

  Widget _buildHeaderAvatar(PlayerEntity player) {
    return Container(
      width: 88,
      height: 88,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            _StadiumNights.gold.withOpacity(0.3),
            _StadiumNights.neonGreen.withOpacity(0.15),
          ],
        ),
        shape: BoxShape.circle,
        border: Border.all(color: _StadiumNights.gold.withOpacity(0.5), width: 2),
      ),
      child: ClipOval(
        child: player.hasPhoto
            ? _buildPhoto(player.photo!)
            : Center(
                child: Text(
                  player.initials,
                  style: GoogleFonts.bebasNeue(
                    fontSize: 32,
                    color: _StadiumNights.gold,
                  ),
                ),
              ),
      ),
    );
  }

  Widget _buildPhoto(String photoData) {
    try {
      if (photoData.startsWith('data:image/')) {
        final base64Data = photoData.split(',')[1];
        final Uint8List bytes = base64Decode(base64Data);
        return Image.memory(bytes, width: 88, height: 88, fit: BoxFit.cover);
      }
      return Image.network(
        photoData,
        width: 88,
        height: 88,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => Center(
          child: Icon(Icons.person, color: _StadiumNights.gold.withOpacity(0.5), size: 36),
        ),
      );
    } catch (_) {
      return Center(
        child: Icon(Icons.person, color: _StadiumNights.gold.withOpacity(0.5), size: 36),
      );
    }
  }
}

class _InfoRow {
  final String label;
  final String value;
  const _InfoRow(this.label, this.value);
}
