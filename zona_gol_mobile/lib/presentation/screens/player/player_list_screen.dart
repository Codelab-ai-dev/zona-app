import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/di/injection.dart';
import '../../../domain/entities/player_entity.dart';
import '../../bloc/player/player_bloc.dart';
import '../../bloc/player/player_event.dart';
import '../../bloc/player/player_state.dart';
import 'create_edit_player_screen.dart';
import 'player_detail_screen.dart';

/// Stadium Nights Design System
class _StadiumNights {
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

/// Player List Screen
class PlayerListScreen extends StatelessWidget {
  final String teamId;
  final String teamName;
  final bool canEdit;

  const PlayerListScreen({
    super.key,
    required this.teamId,
    required this.teamName,
    this.canEdit = false,
  });

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => sl<PlayerBloc>()
        ..add(LoadPlayersByTeamEvent(teamId: teamId)),
      child: _PlayerListView(
        teamId: teamId,
        teamName: teamName,
        canEdit: canEdit,
      ),
    );
  }
}

class _PlayerListView extends StatefulWidget {
  final String teamId;
  final String teamName;
  final bool canEdit;

  const _PlayerListView({
    required this.teamId,
    required this.teamName,
    required this.canEdit,
  });

  @override
  State<_PlayerListView> createState() => _PlayerListViewState();
}

class _PlayerListViewState extends State<_PlayerListView> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

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
            if (state is PlayerCreated || state is PlayerUpdated || state is PlayerDeleted) {
              context.read<PlayerBloc>().add(
                    LoadPlayersByTeamEvent(teamId: widget.teamId),
                  );
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
            if (state is PlayerLoading) {
              return _buildLoadingState();
            }
            if (state is PlayerError) {
              return _buildErrorState(context, state.message);
            }
            if (state is PlayersLoaded) {
              final filtered = _filterPlayers(state.players);
              if (state.players.isEmpty) {
                return _buildEmptyState(context);
              }
              return _buildPlayersList(context, filtered, state.players.length);
            }
            return _buildLoadingState();
          },
        ),
        floatingActionButton: widget.canEdit
            ? FloatingActionButton(
                onPressed: () => _navigateToCreatePlayer(context),
                backgroundColor: _StadiumNights.neonGreen,
                child: const Icon(Icons.person_add, color: Colors.black),
              )
            : null,
      ),
    );
  }

  List<PlayerEntity> _filterPlayers(List<PlayerEntity> players) {
    if (_searchQuery.isEmpty) return players;
    final query = _searchQuery.toLowerCase();
    return players.where((p) {
      return p.name.toLowerCase().contains(query) ||
          (p.jerseyNumber?.toString().contains(query) ?? false) ||
          (p.positionDisplay.toLowerCase().contains(query));
    }).toList();
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
      title: Column(
        children: [
          Text(
            'JUGADORES',
            style: GoogleFonts.bebasNeue(
              fontSize: 22,
              color: _StadiumNights.textPrimary,
              letterSpacing: 2,
            ),
          ),
          Text(
            widget.teamName,
            style: GoogleFonts.outfit(
              fontSize: 12,
              color: _StadiumNights.textSecondary,
            ),
          ),
        ],
      ),
      centerTitle: true,
      actions: [
        IconButton(
          icon: const Icon(Icons.refresh, color: _StadiumNights.gold),
          onPressed: () {
            context.read<PlayerBloc>().add(
                  LoadPlayersByTeamEvent(teamId: widget.teamId),
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
            'CARGANDO JUGADORES',
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
                color: _StadiumNights.gold.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.people_outline,
                size: 50,
                color: _StadiumNights.gold,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'SIN JUGADORES',
              style: GoogleFonts.bebasNeue(
                fontSize: 24,
                color: _StadiumNights.textPrimary,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Este equipo aún no tiene jugadores registrados.',
              textAlign: TextAlign.center,
              style: GoogleFonts.outfit(
                fontSize: 14,
                color: _StadiumNights.textSecondary,
              ),
            ),
            if (widget.canEdit) ...[
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: () => _navigateToCreatePlayer(context),
                icon: const Icon(Icons.person_add, size: 18),
                label: const Text('Agregar Jugador'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _StadiumNights.neonGreen,
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ],
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
                fontSize: 24,
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
            ElevatedButton(
              onPressed: () {
                context.read<PlayerBloc>().add(
                      LoadPlayersByTeamEvent(teamId: widget.teamId),
                    );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: _StadiumNights.gold,
                foregroundColor: Colors.black,
              ),
              child: const Text('Reintentar'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPlayersList(BuildContext context, List<PlayerEntity> players, int totalCount) {
    return Column(
      children: [
        // Search bar
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: Container(
            decoration: BoxDecoration(
              color: _StadiumNights.cardDark,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: _StadiumNights.gold.withOpacity(0.15)),
            ),
            child: TextField(
              controller: _searchController,
              style: GoogleFonts.outfit(color: _StadiumNights.textPrimary),
              decoration: InputDecoration(
                hintText: 'Buscar jugador...',
                hintStyle: GoogleFonts.outfit(color: _StadiumNights.textMuted),
                prefixIcon: const Icon(Icons.search, color: _StadiumNights.gold, size: 20),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, color: _StadiumNights.textMuted, size: 18),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _searchQuery = '');
                        },
                      )
                    : null,
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              ),
              onChanged: (value) => setState(() => _searchQuery = value),
            ),
          ),
        ),
        // Player count
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          child: Row(
            children: [
              Text(
                '${players.length}${players.length != totalCount ? '/$totalCount' : ''} jugadores',
                style: GoogleFonts.outfit(
                  fontSize: 12,
                  color: _StadiumNights.textMuted,
                ),
              ),
            ],
          ),
        ),
        // Player list
        Expanded(
          child: players.isEmpty
              ? Center(
                  child: Text(
                    'No se encontraron jugadores',
                    style: GoogleFonts.outfit(
                      fontSize: 14,
                      color: _StadiumNights.textMuted,
                    ),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 80),
                  itemCount: players.length,
                  itemBuilder: (context, index) {
                    return _buildPlayerCard(context, players[index]);
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildPlayerCard(BuildContext context, PlayerEntity player) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: _StadiumNights.cardDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: player.isActive
              ? _StadiumNights.gold.withOpacity(0.1)
              : _StadiumNights.error.withOpacity(0.2),
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () => _navigateToPlayerDetail(context, player),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                // Photo avatar
                _buildPlayerAvatar(player),
                const SizedBox(width: 12),
                // Player info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Name + jersey number
                      Row(
                        children: [
                          if (player.hasJerseyNumber) ...[
                            Text(
                              '#${player.jerseyNumber}',
                              style: GoogleFonts.bebasNeue(
                                fontSize: 16,
                                color: _StadiumNights.gold,
                              ),
                            ),
                            const SizedBox(width: 6),
                          ],
                          Expanded(
                            child: Text(
                              player.name,
                              style: GoogleFonts.outfit(
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                                color: player.isActive
                                    ? _StadiumNights.textPrimary
                                    : _StadiumNights.textMuted,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          if (player.hasPosition) ...[
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: _StadiumNights.neonGreen.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                player.positionDisplay,
                                style: GoogleFonts.outfit(
                                  fontSize: 11,
                                  color: _StadiumNights.neonGreen,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                          ],
                          if (player.age != null)
                            Text(
                              '${player.age} años',
                              style: GoogleFonts.outfit(
                                fontSize: 12,
                                color: _StadiumNights.textMuted,
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
                // Status indicator
                if (!player.isActive)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: _StadiumNights.error.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      'Inactivo',
                      style: GoogleFonts.outfit(
                        fontSize: 10,
                        color: _StadiumNights.error,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                const SizedBox(width: 4),
                Icon(
                  Icons.chevron_right,
                  color: _StadiumNights.textMuted.withOpacity(0.5),
                  size: 20,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPlayerAvatar(PlayerEntity player) {
    final activeColor = player.isActive ? _StadiumNights.gold : _StadiumNights.textMuted;

    return Container(
      width: 48,
      height: 48,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: player.isActive
              ? [
                  _StadiumNights.gold.withOpacity(0.2),
                  _StadiumNights.neonGreen.withOpacity(0.1),
                ]
              : [
                  _StadiumNights.textMuted.withOpacity(0.2),
                  _StadiumNights.textMuted.withOpacity(0.1),
                ],
        ),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: activeColor.withOpacity(0.3)),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(11),
        child: player.hasPhoto
            ? _buildPhoto(player.photo!)
            : Center(
                child: Text(
                  player.initials,
                  style: GoogleFonts.bebasNeue(
                    fontSize: 18,
                    color: activeColor,
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
        return Image.memory(bytes, width: 48, height: 48, fit: BoxFit.cover);
      }
      return Image.network(
        photoData,
        width: 48,
        height: 48,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => Center(
          child: Icon(Icons.person, color: _StadiumNights.gold.withOpacity(0.5), size: 24),
        ),
      );
    } catch (_) {
      return Center(
        child: Icon(Icons.person, color: _StadiumNights.gold.withOpacity(0.5), size: 24),
      );
    }
  }

  void _navigateToPlayerDetail(BuildContext context, PlayerEntity player) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => PlayerDetailScreen(
          player: player,
          teamName: widget.teamName,
          canEdit: widget.canEdit,
          teamId: widget.teamId,
        ),
      ),
    ).then((_) {
      if (context.mounted) {
        context.read<PlayerBloc>().add(
              LoadPlayersByTeamEvent(teamId: widget.teamId),
            );
      }
    });
  }

  void _navigateToCreatePlayer(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => BlocProvider(
          create: (context) => sl<PlayerBloc>(),
          child: CreateEditPlayerScreen(
            teamId: widget.teamId,
            teamName: widget.teamName,
          ),
        ),
      ),
    ).then((_) {
      if (context.mounted) {
        context.read<PlayerBloc>().add(
              LoadPlayersByTeamEvent(teamId: widget.teamId),
            );
      }
    });
  }
}
