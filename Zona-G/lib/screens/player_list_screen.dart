import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import '../models/player.dart';
import '../services/api_service.dart';
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
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Lista de Jugadores'),
            if (currentMatchId != null)
              Text(
                '🏆 Partido activo',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.green[200],
                ),
              ),
          ],
        ),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          // Search bar
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: TextField(
              decoration: const InputDecoration(
                hintText: 'Buscar jugador...',
                prefixIcon: Icon(Icons.search),
                border: OutlineInputBorder(),
              ),
              onChanged: (value) {
                setState(() {
                  searchQuery = value;
                });
              },
            ),
          ),
          
          // Players list
          Expanded(
            child: isLoading
                ? const Center(child: CircularProgressIndicator())
                : filteredPlayers.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(
                              Icons.people_outline,
                              size: 64,
                              color: Colors.grey,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              searchQuery.isNotEmpty 
                                  ? 'No se encontraron jugadores'
                                  : 'No hay jugadores registrados',
                              style: const TextStyle(
                                fontSize: 18,
                                color: Colors.grey,
                              ),
                            ),
                            if (searchQuery.isNotEmpty) ...[
                              const SizedBox(height: 8),
                              TextButton(
                                onPressed: () {
                                  setState(() {
                                    searchQuery = '';
                                  });
                                },
                                child: const Text('Limpiar búsqueda'),
                              ),
                            ],
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _loadPlayers,
                        child: ListView.builder(
                          itemCount: filteredPlayers.length,
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemBuilder: (context, index) {
                            final player = filteredPlayers[index];
                            return Card(
                              margin: const EdgeInsets.only(bottom: 8),
                              child: ListTile(
                                leading: CircleAvatar(
                                  backgroundImage: _getPhotoImageProvider(player.photo),
                                  child: _getPhotoImageProvider(player.photo) == null 
                                      ? Text(
                                          player.name.isNotEmpty 
                                              ? player.name[0].toUpperCase() 
                                              : '?',
                                          style: const TextStyle(fontWeight: FontWeight.bold),
                                        ) 
                                      : null,
                                ),
                                title: Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        player.name,
                                        style: const TextStyle(fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 8,
                                        vertical: 4,
                                      ),
                                      decoration: BoxDecoration(
                                        color: Colors.blue,
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(
                                        '#${player.jerseyNumber}',
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 12,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                subtitle: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(player.position),
                                    if (player.birthDate != null)
                                      Text(
                                        '${_calculateAge(player.birthDate)} años',
                                        style: TextStyle(
                                          color: Colors.grey[600],
                                          fontSize: 12,
                                        ),
                                      ),
                                  ],
                                ),
                                trailing: Icon(
                                  player.isActive 
                                      ? Icons.check_circle
                                      : Icons.cancel,
                                  color: player.isActive 
                                      ? Colors.green 
                                      : Colors.red,
                                ),
                                onTap: () => _navigateToPlayerDetail(player),
                              ),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}