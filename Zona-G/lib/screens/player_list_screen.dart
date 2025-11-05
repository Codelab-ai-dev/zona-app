import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import '../models/player.dart';
import '../services/api_service.dart';
import '../config/app_theme.dart';
import 'player_detail_screen.dart';
import '../models/qr_data.dart';

class PlayerListScreen extends StatefulWidget {
  const PlayerListScreen({super.key});

  @override
  State<PlayerListScreen> createState() => _PlayerListScreenState();
}

class _PlayerListScreenState extends State<PlayerListScreen> {
  List<Player> players = [];
  bool isLoading = true;
  String searchQuery = '';
  String? currentMatchId;

  @override
  void initState() {
    super.initState();
    _loadPlayers();
    _loadCurrentMatch();
  }

  Future<void> _loadPlayers() async {
    setState(() {
      isLoading = true;
    });

    // For now, we'll load all players
    // In a real app, you might want to load players for a specific team
    try {
      // This is a placeholder - you'd need to implement a method to get all players
      // or get players for a specific team
      final teamPlayers = await ApiService.getTeamPlayers('default-team-id');
      if (mounted) {
        setState(() {
          players = teamPlayers;
          isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          isLoading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error cargando jugadores: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _loadCurrentMatch() async {
    try {
      final matchId = await ApiService.getCurrentMatchId();
      if (mounted) {
        setState(() {
          currentMatchId = matchId;
        });
        if (matchId != null) {
          print('🏆 Partido actual encontrado: $matchId');
        } else {
          print('📅 No hay partidos activos hoy');
        }
      }
    } catch (e) {
      print('❌ Error cargando partido actual: $e');
    }
  }

  List<Player> get filteredPlayers {
    if (searchQuery.isEmpty) {
      return players;
    }
    return players.where((player) {
      return player.name.toLowerCase().contains(searchQuery.toLowerCase()) ||
             player.position.toLowerCase().contains(searchQuery.toLowerCase()) ||
             player.jerseyNumber.toString().contains(searchQuery);
    }).toList();
  }

  void _navigateToPlayerDetail(Player player) {
    final qrData = QRPlayerData(
      playerId: player.id,
      playerName: player.name,
      teamId: player.teamId,
      jerseyNumber: player.jerseyNumber,
    );

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => PlayerDetailScreen(
          qrData: qrData,
          matchId: currentMatchId,
        ),
      ),
    );
  }

  int _calculateAge(String? birthDate) {
    if (birthDate == null) return 0;
    final birth = DateTime.parse(birthDate);
    final today = DateTime.now();
    int age = today.year - birth.year;
    if (today.month < birth.month || (today.month == birth.month && today.day < birth.day)) {
      age--;
    }
    return age;
  }

  // Helper method to get appropriate ImageProvider for the photo
  ImageProvider? _getPhotoImageProvider(String? photoUrl) {
    if (photoUrl == null || photoUrl.isEmpty) return null;
    
    if (photoUrl.startsWith('data:image/')) {
      // Handle base64 images
      try {
        final base64String = photoUrl.split(',')[1]; // Remove data:image/...;base64, prefix
        final bytes = base64Decode(base64String);
        return MemoryImage(bytes);
      } catch (e) {
        return null;
      }
    } else {
      // Handle regular URLs
      return NetworkImage(photoUrl);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: AppTheme.primaryGradient(opacity: 0.9),
        ),
        child: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.white.withOpacity(0.15),
                        border: Border.all(color: Colors.white24),
                      ),
                      child: const Icon(
                        Icons.people_alt_rounded,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Jugadores registrados',
                            style: theme.textTheme.headlineSmall?.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          Text(
                            currentMatchId != null
                                ? 'Partido activo listo para asistencia'
                                : 'Gestiona tu plantilla y perfiles',
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: Colors.white70,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 24),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.08),
                      blurRadius: 24,
                      offset: const Offset(0, 16),
                    ),
                  ],
                ),
                child: TextField(
                  decoration: const InputDecoration(
                    hintText: 'Buscar jugador, posición o dorsal...',
                    prefixIcon: Icon(Icons.search_rounded),
                    border: InputBorder.none,
                  ),
                  onChanged: (value) {
                    setState(() {
                      searchQuery = value;
                    });
                  },
                ),
              ),
              const SizedBox(height: 16),
              Expanded(
                child: Container(
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.only(
                      topLeft: Radius.circular(32),
                      topRight: Radius.circular(32),
                    ),
                  ),
                  child: isLoading
                      ? const Center(child: CircularProgressIndicator())
                      : filteredPlayers.isEmpty
                          ? Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(
                                  Icons.search_off_rounded,
                                  size: 72,
                                  color: Colors.grey,
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  searchQuery.isNotEmpty
                                      ? 'No se encontraron jugadores'
                                      : 'No hay jugadores registrados',
                                  style: theme.textTheme.titleLarge?.copyWith(
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  searchQuery.isNotEmpty
                                      ? 'Prueba con otro nombre, dorsal o posición.'
                                      : 'Agrega nuevos jugadores desde el panel de administración.',
                                  textAlign: TextAlign.center,
                                  style: theme.textTheme.bodyMedium?.copyWith(
                                    color: Colors.grey.shade600,
                                  ),
                                ),
                                if (searchQuery.isNotEmpty) ...[
                                  const SizedBox(height: 16),
                                  OutlinedButton(
                                    onPressed: () {
                                      setState(() {
                                        searchQuery = '';
                                      });
                                    },
                                    child: const Text('Limpiar búsqueda'),
                                  ),
                                ],
                              ],
                            )
                          : RefreshIndicator(
                              onRefresh: _loadPlayers,
                              child: ListView.separated(
                                physics: const AlwaysScrollableScrollPhysics(),
                                padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
                                itemCount: filteredPlayers.length,
                                separatorBuilder: (_, __) => const SizedBox(height: 12),
                                itemBuilder: (context, index) {
                                  final player = filteredPlayers[index];
                                  return _PlayerTile(
                                    player: player,
                                    onTap: () => _navigateToPlayerDetail(player),
                                    getPhotoImageProvider: _getPhotoImageProvider,
                                    calculateAge: _calculateAge,
                                  );
                                },
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
}

class _PlayerTile extends StatelessWidget {
  final Player player;
  final VoidCallback onTap;
  final ImageProvider? Function(String?) getPhotoImageProvider;
  final int Function(String?) calculateAge;

  const _PlayerTile({
    required this.player,
    required this.onTap,
    required this.getPhotoImageProvider,
    required this.calculateAge,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final photo = getPhotoImageProvider(player.photo);
    final int? age = player.birthDate != null ? calculateAge(player.birthDate) : null;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(24),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 16,
              offset: const Offset(0, 12),
            ),
          ],
        ),
        child: Row(
          children: [
            CircleAvatar(
              radius: 28,
              backgroundColor: theme.colorScheme.primary.withOpacity(0.12),
              backgroundImage: photo,
              child: photo == null
                  ? Text(
                      player.name.isNotEmpty ? player.name[0].toUpperCase() : '?',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: theme.colorScheme.primary,
                      ),
                    )
                  : null,
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          player.name,
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.secondary.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          '#${player.jerseyNumber}',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.secondary,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    player.position,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: Colors.grey.shade600,
                    ),
                  ),
                  if (age != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        '$age años',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: Colors.grey.shade500,
                        ),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(width: 16),
            Icon(
              player.isActive ? Icons.check_circle_rounded : Icons.block_rounded,
              color: player.isActive ? theme.colorScheme.primary : Colors.redAccent,
            ),
          ],
        ),
      ),
    );
  }
}