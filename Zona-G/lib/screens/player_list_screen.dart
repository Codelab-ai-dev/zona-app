import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../models/player.dart';
import '../services/api_service.dart';
import 'player_detail_screen.dart';
import '../models/qr_data.dart';
import '../widgets/stadium_background.dart';

class PlayerListScreen extends StatefulWidget {
  const PlayerListScreen({super.key});

  @override
  State<PlayerListScreen> createState() => _PlayerListScreenState();
}

class _PlayerListScreenState extends State<PlayerListScreen>
    with SingleTickerProviderStateMixin {
  List<Player> players = [];
  bool isLoading = true;
  String searchQuery = '';
  String? currentMatchId;

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
    _loadPlayers();
    _loadCurrentMatch();
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  Future<void> _loadPlayers() async {
    setState(() {
      isLoading = true;
    });

    try {
      final teamPlayers = await ApiService.getTeamPlayers('default-team-id');
      if (mounted) {
        setState(() {
          players = teamPlayers;
          isLoading = false;
        });
        _animController.forward();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          isLoading = false;
        });
        _showErrorSnackBar('Error cargando jugadores: $e');
      }
    }
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          message,
          style: GoogleFonts.outfit(color: Colors.white),
        ),
        backgroundColor: Colors.red.shade700,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  Future<void> _loadCurrentMatch() async {
    try {
      final matchId = await ApiService.getCurrentMatchId();
      if (mounted) {
        setState(() {
          currentMatchId = matchId;
        });
      }
    } catch (e) {
      debugPrint('Error cargando partido actual: $e');
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
    HapticFeedback.lightImpact();
    final qrData = QRPlayerData(
      playerId: player.id,
      playerName: player.name,
      teamId: player.teamId,
      jerseyNumber: player.jerseyNumber,
    );

    Navigator.push(
      context,
      PageRouteBuilder(
        pageBuilder: (context, animation, secondaryAnimation) =>
            PlayerDetailScreen(
          qrData: qrData,
          matchId: currentMatchId,
        ),
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(
            opacity: animation,
            child: SlideTransition(
              position: Tween<Offset>(
                begin: const Offset(0.05, 0),
                end: Offset.zero,
              ).animate(CurvedAnimation(
                parent: animation,
                curve: Curves.easeOut,
              )),
              child: child,
            ),
          );
        },
        transitionDuration: const Duration(milliseconds: 300),
      ),
    );
  }

  int _calculateAge(String? birthDate) {
    if (birthDate == null) return 0;
    final birth = DateTime.parse(birthDate);
    final today = DateTime.now();
    int age = today.year - birth.year;
    if (today.month < birth.month ||
        (today.month == birth.month && today.day < birth.day)) {
      age--;
    }
    return age;
  }

  ImageProvider? _getPhotoImageProvider(String? photoUrl) {
    if (photoUrl == null || photoUrl.isEmpty) return null;

    if (photoUrl.startsWith('data:image/')) {
      try {
        final base64String = photoUrl.split(',')[1];
        final bytes = base64Decode(base64String);
        return MemoryImage(bytes);
      } catch (e) {
        return null;
      }
    } else {
      return NetworkImage(photoUrl);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _primaryDark,
      body: Stack(
        children: [
          // Stadium background
          const StadiumBackground(),

          // Main content
          SafeArea(
            child: Column(
              children: [
                // Custom header
                _buildHeader(),

                // Search bar
                _buildSearchBar(),

                // Players list
                Expanded(
                  child: isLoading
                      ? _buildLoadingState()
                      : filteredPlayers.isEmpty
                          ? _buildEmptyState()
                          : _buildPlayersList(),
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
          // Back button
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
                border: Border.all(
                  color: Colors.white.withOpacity(0.1),
                ),
              ),
              child: const Icon(
                Icons.arrow_back,
                color: Colors.white,
                size: 22,
              ),
            ),
          ),
          const SizedBox(width: 16),
          // Title
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'JUGADORES',
                  style: GoogleFonts.bebasNeue(
                    fontSize: 26,
                    color: Colors.white,
                    letterSpacing: 2,
                  ),
                ),
                if (currentMatchId != null)
                  Container(
                    margin: const EdgeInsets.only(top: 4),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 3,
                    ),
                    decoration: BoxDecoration(
                      color: _neonGreen.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(
                        color: _neonGreen.withOpacity(0.3),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 6,
                          height: 6,
                          decoration: BoxDecoration(
                            color: _neonGreen,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: _neonGreen.withOpacity(0.5),
                                blurRadius: 4,
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          'PARTIDO ACTIVO',
                          style: GoogleFonts.outfit(
                            fontSize: 10,
                            color: _neonGreen,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          // Player count
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Icon(Icons.people, color: _gold, size: 18),
                const SizedBox(width: 6),
                Text(
                  '${players.length}',
                  style: GoogleFonts.bebasNeue(
                    fontSize: 18,
                    color: Colors.white,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: Container(
        decoration: BoxDecoration(
          color: _surfaceDark,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: Colors.white.withOpacity(0.1),
          ),
        ),
        child: TextField(
          onChanged: (value) {
            setState(() {
              searchQuery = value;
            });
          },
          style: GoogleFonts.outfit(
            color: Colors.white,
            fontSize: 15,
          ),
          decoration: InputDecoration(
            hintText: 'Buscar por nombre, posición o número...',
            hintStyle: GoogleFonts.outfit(
              color: Colors.white38,
              fontSize: 14,
            ),
            prefixIcon: Icon(
              Icons.search,
              color: Colors.white38,
              size: 22,
            ),
            suffixIcon: searchQuery.isNotEmpty
                ? GestureDetector(
                    onTap: () {
                      setState(() {
                        searchQuery = '';
                      });
                    },
                    child: Icon(
                      Icons.close,
                      color: Colors.white38,
                      size: 20,
                    ),
                  )
                : null,
            border: InputBorder.none,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 14,
            ),
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
              valueColor: AlwaysStoppedAnimation<Color>(_neonGreen),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Cargando jugadores...',
            style: GoogleFonts.outfit(
              color: Colors.white54,
              fontSize: 14,
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
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.05),
                shape: BoxShape.circle,
              ),
              child: Icon(
                searchQuery.isNotEmpty ? Icons.search_off : Icons.people_outline,
                size: 56,
                color: Colors.white24,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              searchQuery.isNotEmpty
                  ? 'Sin resultados'
                  : 'Sin jugadores',
              style: GoogleFonts.bebasNeue(
                fontSize: 24,
                color: Colors.white70,
                letterSpacing: 1,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              searchQuery.isNotEmpty
                  ? 'No se encontraron jugadores con "$searchQuery"'
                  : 'No hay jugadores registrados en este equipo',
              style: GoogleFonts.outfit(
                fontSize: 14,
                color: Colors.white38,
              ),
              textAlign: TextAlign.center,
            ),
            if (searchQuery.isNotEmpty) ...[
              const SizedBox(height: 20),
              GestureDetector(
                onTap: () {
                  setState(() {
                    searchQuery = '';
                  });
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 12,
                  ),
                  decoration: BoxDecoration(
                    color: _neonGreen.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: _neonGreen.withOpacity(0.3),
                    ),
                  ),
                  child: Text(
                    'Limpiar búsqueda',
                    style: GoogleFonts.outfit(
                      color: _neonGreen,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildPlayersList() {
    return RefreshIndicator(
      onRefresh: _loadPlayers,
      color: _neonGreen,
      backgroundColor: _surfaceDark,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
        itemCount: filteredPlayers.length,
        itemBuilder: (context, index) {
          final player = filteredPlayers[index];
          return TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: 1),
            duration: Duration(milliseconds: 300 + (index * 50)),
            curve: Curves.easeOut,
            builder: (context, value, child) {
              return Transform.translate(
                offset: Offset(0, 20 * (1 - value)),
                child: Opacity(
                  opacity: value,
                  child: child,
                ),
              );
            },
            child: _buildPlayerCard(player),
          );
        },
      ),
    );
  }

  Widget _buildPlayerCard(Player player) {
    final photoProvider = _getPhotoImageProvider(player.photo);
    final age = _calculateAge(player.birthDate);

    return GestureDetector(
      onTap: () => _navigateToPlayerDetail(player),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
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
          border: Border.all(
            color: Colors.white.withOpacity(0.1),
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              // Player photo
              Stack(
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: _surfaceDark,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: player.isActive
                            ? _neonGreen.withOpacity(0.3)
                            : Colors.white.withOpacity(0.1),
                        width: 2,
                      ),
                      image: photoProvider != null
                          ? DecorationImage(
                              image: photoProvider,
                              fit: BoxFit.cover,
                            )
                          : null,
                    ),
                    child: photoProvider == null
                        ? Center(
                            child: Text(
                              player.name.isNotEmpty
                                  ? player.name[0].toUpperCase()
                                  : '?',
                              style: GoogleFonts.bebasNeue(
                                fontSize: 24,
                                color: Colors.white54,
                              ),
                            ),
                          )
                        : null,
                  ),
                  // Status indicator
                  Positioned(
                    right: -2,
                    bottom: -2,
                    child: Container(
                      width: 16,
                      height: 16,
                      decoration: BoxDecoration(
                        color: player.isActive ? _neonGreen : Colors.red,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: _primaryDark,
                          width: 2,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: (player.isActive ? _neonGreen : Colors.red)
                                .withOpacity(0.4),
                            blurRadius: 6,
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 14),
              // Player info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      player.name,
                      style: GoogleFonts.outfit(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        _buildInfoChip(
                          Icons.sports_soccer,
                          player.position,
                          Colors.white54,
                        ),
                        if (age > 0) ...[
                          const SizedBox(width: 10),
                          _buildInfoChip(
                            Icons.cake_outlined,
                            '$age años',
                            Colors.white38,
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              // Jersey number
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      _gold.withOpacity(0.2),
                      _gold.withOpacity(0.1),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: _gold.withOpacity(0.3),
                  ),
                ),
                child: Center(
                  child: Text(
                    '${player.jerseyNumber}',
                    style: GoogleFonts.bebasNeue(
                      fontSize: 20,
                      color: _gold,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              // Arrow
              Icon(
                Icons.chevron_right,
                color: Colors.white24,
                size: 24,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoChip(IconData icon, String text, Color color) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: color),
        const SizedBox(width: 4),
        Text(
          text,
          style: GoogleFonts.outfit(
            fontSize: 12,
            color: color,
          ),
        ),
      ],
    );
  }
}
