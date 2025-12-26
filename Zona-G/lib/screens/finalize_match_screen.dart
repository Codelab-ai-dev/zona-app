import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../models/match.dart';
import '../services/match_service.dart';
import '../services/api_service.dart';
import '../widgets/stadium_background.dart';

class FinalizeMatchScreen extends StatefulWidget {
  final Match match;
  final Map<String, List<Map<String, dynamic>>> playersData;

  const FinalizeMatchScreen({
    super.key,
    required this.match,
    required this.playersData,
  });

  @override
  State<FinalizeMatchScreen> createState() => _FinalizeMatchScreenState();
}

class _FinalizeMatchScreenState extends State<FinalizeMatchScreen> {
  final PageController _pageController = PageController();
  int _currentStep = 0;
  bool _isSubmitting = false;

  // Score controllers
  final TextEditingController _homeScoreController = TextEditingController();
  final TextEditingController _awayScoreController = TextEditingController();
  final TextEditingController _observationsController = TextEditingController();

  // Player stats - Map<playerId, Map<statType, value>>
  Map<String, Map<String, int>> _playerStats = {};

  // Stadium Nights color palette
  static const Color _primaryDark = Color(0xFF0A0A0A);
  static const Color _neonGreen = Color(0xFF00FF7F);
  static const Color _gold = Color(0xFFFFD700);
  static const Color _surfaceDark = Color(0xFF1A1A1A);

  final List<String> _steps = [
    'Marcador',
    'Local',
    'Visitante',
    'Confirmar',
  ];

  @override
  void initState() {
    super.initState();
    _initializePlayerStats();
  }

  void _initializePlayerStats() {
    // Initialize stats for all players
    final allPlayers = [
      ...widget.playersData['home_players'] ?? [],
      ...widget.playersData['away_players'] ?? [],
    ];

    for (final player in allPlayers) {
      final playerId = player['id'] as String?;
      if (playerId != null) {
        _playerStats[playerId] = {
          'goals': player['goals'] ?? 0,
          'yellow_cards': player['yellow_cards'] ?? 0,
          'red_cards': player['red_cards'] ?? 0,
        };
      }
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    _homeScoreController.dispose();
    _awayScoreController.dispose();
    _observationsController.dispose();
    super.dispose();
  }

  void _nextStep() {
    if (_currentStep < _steps.length - 1) {
      // Validate goals before going to confirm page (step 3)
      if (_currentStep == 2) {
        final validation = _validateGoals();
        if (!validation['isValid']) {
          HapticFeedback.heavyImpact();
          _showGoalsValidationError(validation);
          return;
        }
      }

      HapticFeedback.lightImpact();
      _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  Map<String, dynamic> _validateGoals() {
    final homeScore = int.tryParse(_homeScoreController.text) ?? 0;
    final awayScore = int.tryParse(_awayScoreController.text) ?? 0;

    int homePlayerGoals = 0;
    int awayPlayerGoals = 0;

    // Sum home team goals
    for (final player in widget.playersData['home_players'] ?? []) {
      final playerId = player['id'] as String?;
      if (playerId != null && _playerStats.containsKey(playerId)) {
        homePlayerGoals += _playerStats[playerId]!['goals'] ?? 0;
      }
    }

    // Sum away team goals
    for (final player in widget.playersData['away_players'] ?? []) {
      final playerId = player['id'] as String?;
      if (playerId != null && _playerStats.containsKey(playerId)) {
        awayPlayerGoals += _playerStats[playerId]!['goals'] ?? 0;
      }
    }

    final homeValid = homeScore == homePlayerGoals;
    final awayValid = awayScore == awayPlayerGoals;

    return {
      'isValid': homeValid && awayValid,
      'homeScore': homeScore,
      'awayScore': awayScore,
      'homePlayerGoals': homePlayerGoals,
      'awayPlayerGoals': awayPlayerGoals,
      'homeValid': homeValid,
      'awayValid': awayValid,
    };
  }

  void _showGoalsValidationError(Map<String, dynamic> validation) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        child: Container(
          constraints: const BoxConstraints(maxWidth: 360),
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: _surfaceDark,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.red.withOpacity(0.5)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.red.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.error_outline, color: Colors.red, size: 40),
              ),
              const SizedBox(height: 16),
              Text(
                'GOLES NO COINCIDEN',
                style: GoogleFonts.bebasNeue(
                  fontSize: 22,
                  color: Colors.white,
                  letterSpacing: 2,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Los goles del marcador deben coincidir con los goles asignados a los jugadores',
                style: GoogleFonts.outfit(
                  fontSize: 13,
                  color: Colors.white54,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),

              // Home team validation
              _buildValidationRow(
                widget.match.homeTeamName ?? 'Local',
                validation['homeScore'],
                validation['homePlayerGoals'],
                validation['homeValid'],
                _neonGreen,
              ),
              const SizedBox(height: 12),

              // Away team validation
              _buildValidationRow(
                widget.match.awayTeamName ?? 'Visitante',
                validation['awayScore'],
                validation['awayPlayerGoals'],
                validation['awayValid'],
                Colors.blue,
              ),

              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: _buildButton('Entendido', Colors.red, Colors.white, () {
                  Navigator.pop(context);
                }),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildValidationRow(
    String teamName,
    int scoreGoals,
    int playerGoals,
    bool isValid,
    Color teamColor,
  ) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isValid
            ? _neonGreen.withOpacity(0.1)
            : Colors.red.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isValid
              ? _neonGreen.withOpacity(0.3)
              : Colors.red.withOpacity(0.3),
        ),
      ),
      child: Row(
        children: [
          Icon(
            isValid ? Icons.check_circle : Icons.cancel,
            color: isValid ? _neonGreen : Colors.red,
            size: 20,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              teamName,
              style: GoogleFonts.outfit(
                fontSize: 13,
                color: teamColor,
                fontWeight: FontWeight.w600,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          Text(
            'Marcador: $scoreGoals',
            style: GoogleFonts.outfit(
              fontSize: 12,
              color: Colors.white70,
            ),
          ),
          const SizedBox(width: 8),
          Text(
            'Jugadores: $playerGoals',
            style: GoogleFonts.outfit(
              fontSize: 12,
              color: isValid ? _neonGreen : Colors.red,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  void _previousStep() {
    if (_currentStep > 0) {
      HapticFeedback.lightImpact();
      _pageController.previousPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    } else {
      Navigator.pop(context);
    }
  }

  void _updatePlayerStat(String playerId, String statType, int delta) {
    HapticFeedback.lightImpact();
    setState(() {
      if (_playerStats[playerId] == null) {
        _playerStats[playerId] = {'goals': 0, 'yellow_cards': 0, 'red_cards': 0};
      }
      final currentValue = _playerStats[playerId]![statType] ?? 0;
      _playerStats[playerId]![statType] = (currentValue + delta).clamp(0, 99);
    });
  }

  Future<void> _submitMatch() async {
    setState(() {
      _isSubmitting = true;
    });

    try {
      final homeScore = int.tryParse(_homeScoreController.text) ?? 0;
      final awayScore = int.tryParse(_awayScoreController.text) ?? 0;
      final observations = _observationsController.text.trim();

      // First, update all player stats
      for (final entry in _playerStats.entries) {
        final playerId = entry.key;
        final stats = entry.value;

        // Update each stat type
        for (final statEntry in stats.entries) {
          if (statEntry.value > 0) {
            await ApiService.setPlayerStats(
              playerId: playerId,
              matchId: widget.match.id,
              statType: statEntry.key,
              value: statEntry.value,
            );
          }
        }
      }

      // Then finalize the match
      final success = await MatchService.finalizeMatch(
        widget.match.id,
        homeScore,
        awayScore,
        observations: observations.isEmpty ? null : observations,
      );

      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });

        if (success) {
          HapticFeedback.heavyImpact();
          await _showSuccessDialog(homeScore, awayScore);
          if (mounted) {
            Navigator.pop(context, true);
          }
        } else {
          _showErrorSnackBar('Error al finalizar el partido');
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
        _showErrorSnackBar('Error: ${e.toString()}');
      }
    }
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message, style: GoogleFonts.outfit(color: Colors.white)),
        backgroundColor: Colors.red.shade700,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  Future<void> _showSuccessDialog(int homeScore, int awayScore) async {
    final homeWin = homeScore > awayScore;
    final awayWin = homeScore < awayScore;

    return showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        child: Container(
          constraints: const BoxConstraints(maxWidth: 360),
          decoration: BoxDecoration(
            color: _surfaceDark,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: _neonGreen.withOpacity(0.5)),
            boxShadow: [
              BoxShadow(
                color: _neonGreen.withOpacity(0.2),
                blurRadius: 30,
                spreadRadius: 5,
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: _neonGreen.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(Icons.check_circle, color: _neonGreen, size: 56),
                ),
                const SizedBox(height: 20),
                Text(
                  'PARTIDO FINALIZADO',
                  style: GoogleFonts.bebasNeue(
                    fontSize: 26,
                    color: Colors.white,
                    letterSpacing: 2,
                  ),
                ),
                const SizedBox(height: 20),
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            '$homeScore',
                            style: GoogleFonts.bebasNeue(
                              fontSize: 48,
                              color: homeWin ? _neonGreen : Colors.white,
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: Text(
                              '-',
                              style: GoogleFonts.bebasNeue(
                                fontSize: 36,
                                color: Colors.white38,
                              ),
                            ),
                          ),
                          Text(
                            '$awayScore',
                            style: GoogleFonts.bebasNeue(
                              fontSize: 48,
                              color: awayWin ? _neonGreen : Colors.white,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        homeWin
                            ? 'Victoria de ${widget.match.homeTeamName}'
                            : awayWin
                                ? 'Victoria de ${widget.match.awayTeamName}'
                                : 'Empate',
                        style: GoogleFonts.outfit(
                          fontSize: 14,
                          color: _gold,
                          fontWeight: FontWeight.w600,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: _buildButton('Cerrar', _neonGreen, _primaryDark, () {
                    Navigator.pop(context);
                  }),
                ),
              ],
            ),
          ),
        ),
      ),
    );
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
                _buildStepIndicator(),
                Expanded(
                  child: PageView(
                    controller: _pageController,
                    physics: const NeverScrollableScrollPhysics(),
                    onPageChanged: (index) {
                      setState(() {
                        _currentStep = index;
                      });
                    },
                    children: [
                      _buildScorePage(),
                      _buildTeamStatsPage(
                        widget.match.homeTeamName ?? 'Local',
                        widget.playersData['home_players'] ?? [],
                        _neonGreen,
                      ),
                      _buildTeamStatsPage(
                        widget.match.awayTeamName ?? 'Visitante',
                        widget.playersData['away_players'] ?? [],
                        Colors.blue,
                      ),
                      _buildConfirmPage(),
                    ],
                  ),
                ),
                _buildBottomButtons(),
              ],
            ),
          ),
          if (_isSubmitting)
            Container(
              color: Colors.black54,
              child: Center(
                child: Container(
                  padding: const EdgeInsets.all(32),
                  decoration: BoxDecoration(
                    color: _surfaceDark,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
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
                        'Guardando estadísticas...',
                        style: GoogleFonts.outfit(color: Colors.white70),
                      ),
                    ],
                  ),
                ),
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
            onTap: _previousStep,
            child: Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                _currentStep == 0 ? Icons.close : Icons.arrow_back,
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
                  'FINALIZAR PARTIDO',
                  style: GoogleFonts.bebasNeue(
                    fontSize: 22,
                    color: Colors.white,
                    letterSpacing: 2,
                  ),
                ),
                Text(
                  '${widget.match.homeTeamName} vs ${widget.match.awayTeamName}',
                  style: GoogleFonts.outfit(
                    fontSize: 12,
                    color: _neonGreen,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepIndicator() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: Row(
        children: List.generate(_steps.length, (index) {
          final isActive = index == _currentStep;
          final isCompleted = index < _currentStep;

          return Expanded(
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    children: [
                      Container(
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          color: isCompleted
                              ? _neonGreen
                              : isActive
                                  ? _neonGreen.withOpacity(0.2)
                                  : Colors.white.withOpacity(0.1),
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: isActive || isCompleted
                                ? _neonGreen
                                : Colors.white.withOpacity(0.2),
                            width: 2,
                          ),
                        ),
                        child: Center(
                          child: isCompleted
                              ? Icon(Icons.check, color: _primaryDark, size: 16)
                              : Text(
                                  '${index + 1}',
                                  style: GoogleFonts.outfit(
                                    fontSize: 12,
                                    color: isActive ? _neonGreen : Colors.white54,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _steps[index],
                        style: GoogleFonts.outfit(
                          fontSize: 10,
                          color: isActive || isCompleted
                              ? Colors.white
                              : Colors.white38,
                          fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
                        ),
                      ),
                    ],
                  ),
                ),
                if (index < _steps.length - 1)
                  Expanded(
                    child: Container(
                      height: 2,
                      margin: const EdgeInsets.only(bottom: 18),
                      color: isCompleted
                          ? _neonGreen
                          : Colors.white.withOpacity(0.1),
                    ),
                  ),
              ],
            ),
          );
        }),
      ),
    );
  }

  Widget _buildScorePage() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  Colors.white.withOpacity(0.1),
                  Colors.white.withOpacity(0.05),
                ],
              ),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Colors.white.withOpacity(0.1)),
            ),
            child: Column(
              children: [
                Icon(Icons.sports_score, color: _gold, size: 48),
                const SizedBox(height: 16),
                Text(
                  'MARCADOR FINAL',
                  style: GoogleFonts.bebasNeue(
                    fontSize: 24,
                    color: Colors.white,
                    letterSpacing: 2,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Ingresa el resultado del partido',
                  style: GoogleFonts.outfit(
                    fontSize: 14,
                    color: Colors.white54,
                  ),
                ),
                const SizedBox(height: 32),
                Row(
                  children: [
                    Expanded(
                      child: _buildScoreInput(
                        widget.match.homeTeamName ?? 'Local',
                        _homeScoreController,
                        _neonGreen,
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Text(
                        'VS',
                        style: GoogleFonts.bebasNeue(
                          fontSize: 24,
                          color: Colors.white38,
                        ),
                      ),
                    ),
                    Expanded(
                      child: _buildScoreInput(
                        widget.match.awayTeamName ?? 'Visitante',
                        _awayScoreController,
                        Colors.blue,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildScoreInput(
    String teamName,
    TextEditingController controller,
    Color teamColor,
  ) {
    return Column(
      children: [
        Text(
          teamName,
          style: GoogleFonts.outfit(
            fontSize: 13,
            color: teamColor,
            fontWeight: FontWeight.w600,
          ),
          textAlign: TextAlign.center,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
        const SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(
            color: teamColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: teamColor.withOpacity(0.3)),
          ),
          child: TextField(
            controller: controller,
            keyboardType: TextInputType.number,
            textAlign: TextAlign.center,
            style: GoogleFonts.bebasNeue(
              fontSize: 48,
              color: Colors.white,
            ),
            decoration: InputDecoration(
              hintText: '0',
              hintStyle: GoogleFonts.bebasNeue(
                fontSize: 48,
                color: Colors.white24,
              ),
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(vertical: 16),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTeamStatsPage(
    String teamName,
    List<Map<String, dynamic>> players,
    Color teamColor,
  ) {
    return Column(
      children: [
        // Team header
        Container(
          margin: const EdgeInsets.fromLTRB(16, 0, 16, 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                teamColor.withOpacity(0.2),
                teamColor.withOpacity(0.1),
              ],
            ),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: teamColor.withOpacity(0.3)),
          ),
          child: Row(
            children: [
              Icon(Icons.groups, color: teamColor, size: 24),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  teamName,
                  style: GoogleFonts.bebasNeue(
                    fontSize: 20,
                    color: Colors.white,
                    letterSpacing: 1,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: teamColor,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '${players.length} jugadores',
                  style: GoogleFonts.outfit(
                    fontSize: 11,
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ),

        // Stats legend
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              const SizedBox(width: 100),
              Expanded(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _buildStatLegend(Icons.sports_soccer, 'Goles', Colors.white),
                    _buildStatLegend(Icons.square, 'Amarilla', Colors.yellow),
                    _buildStatLegend(Icons.square, 'Roja', Colors.red),
                  ],
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 8),

        // Players list
        Expanded(
          child: players.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.person_off, size: 48, color: Colors.white24),
                      const SizedBox(height: 12),
                      Text(
                        'Sin jugadores registrados',
                        style: GoogleFonts.outfit(color: Colors.white38),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: players.length,
                  itemBuilder: (context, index) {
                    final player = players[index];
                    return _buildPlayerStatRow(player, teamColor);
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildStatLegend(IconData icon, String label, Color color) {
    return Column(
      children: [
        Icon(icon, color: color, size: 16),
        const SizedBox(height: 2),
        Text(
          label,
          style: GoogleFonts.outfit(
            fontSize: 9,
            color: Colors.white38,
          ),
        ),
      ],
    );
  }

  Widget _buildPlayerStatRow(Map<String, dynamic> player, Color teamColor) {
    final playerId = player['id'] as String?;
    if (playerId == null) return const SizedBox.shrink();

    final stats = _playerStats[playerId] ?? {'goals': 0, 'yellow_cards': 0, 'red_cards': 0};
    final jerseyNumber = player['jersey_number'] ?? '?';
    final playerName = player['name'] ?? 'Jugador';

    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: Row(
        children: [
          // Jersey number
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: teamColor,
              borderRadius: BorderRadius.circular(6),
            ),
            child: Center(
              child: Text(
                '$jerseyNumber',
                style: GoogleFonts.bebasNeue(
                  fontSize: 12,
                  color: Colors.white,
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          // Player name
          Expanded(
            child: Text(
              playerName,
              style: GoogleFonts.outfit(
                fontSize: 12,
                color: Colors.white,
                fontWeight: FontWeight.w500,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          // Stats controls - compact
          _buildStatControl(playerId, 'goals', stats['goals'] ?? 0, Colors.white),
          const SizedBox(width: 4),
          _buildStatControl(playerId, 'yellow_cards', stats['yellow_cards'] ?? 0, Colors.yellow),
          const SizedBox(width: 4),
          _buildStatControl(playerId, 'red_cards', stats['red_cards'] ?? 0, Colors.red),
        ],
      ),
    );
  }

  Widget _buildStatControl(
    String playerId,
    String statType,
    int value,
    Color color,
  ) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        GestureDetector(
          onTap: value > 0 ? () => _updatePlayerStat(playerId, statType, -1) : null,
          child: Container(
            width: 22,
            height: 22,
            decoration: BoxDecoration(
              color: value > 0 ? color.withOpacity(0.2) : Colors.white.withOpacity(0.05),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Icon(
              Icons.remove,
              size: 12,
              color: value > 0 ? color : Colors.white24,
            ),
          ),
        ),
        Container(
          width: 22,
          alignment: Alignment.center,
          child: Text(
            '$value',
            style: GoogleFonts.bebasNeue(
              fontSize: 14,
              color: value > 0 ? color : Colors.white38,
            ),
          ),
        ),
        GestureDetector(
          onTap: () => _updatePlayerStat(playerId, statType, 1),
          child: Container(
            width: 22,
            height: 22,
            decoration: BoxDecoration(
              color: color.withOpacity(0.2),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Icon(
              Icons.add,
              size: 12,
              color: color,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildConfirmPage() {
    final homeScore = int.tryParse(_homeScoreController.text) ?? 0;
    final awayScore = int.tryParse(_awayScoreController.text) ?? 0;

    // Calculate stats summary
    final homeStats = _calculateTeamStats(widget.playersData['home_players'] ?? []);
    final awayStats = _calculateTeamStats(widget.playersData['away_players'] ?? []);

    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(
        16,
        16,
        16,
        MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: Column(
        children: [
          // Score summary - more compact
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  Colors.white.withOpacity(0.1),
                  Colors.white.withOpacity(0.05),
                ],
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: _neonGreen.withOpacity(0.3)),
            ),
            child: Column(
              children: [
                Text(
                  'RESUMEN DEL PARTIDO',
                  style: GoogleFonts.bebasNeue(
                    fontSize: 18,
                    color: Colors.white,
                    letterSpacing: 2,
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Expanded(
                      child: Column(
                        children: [
                          Text(
                            '$homeScore',
                            style: GoogleFonts.bebasNeue(
                              fontSize: 44,
                              color: homeScore > awayScore ? _neonGreen : Colors.white,
                            ),
                          ),
                          Text(
                            widget.match.homeTeamName ?? 'Local',
                            style: GoogleFonts.outfit(
                              fontSize: 11,
                              color: _neonGreen,
                              fontWeight: FontWeight.w600,
                            ),
                            textAlign: TextAlign.center,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    Text(
                      '-',
                      style: GoogleFonts.bebasNeue(
                        fontSize: 32,
                        color: Colors.white38,
                      ),
                    ),
                    Expanded(
                      child: Column(
                        children: [
                          Text(
                            '$awayScore',
                            style: GoogleFonts.bebasNeue(
                              fontSize: 44,
                              color: awayScore > homeScore ? _neonGreen : Colors.white,
                            ),
                          ),
                          Text(
                            widget.match.awayTeamName ?? 'Visitante',
                            style: GoogleFonts.outfit(
                              fontSize: 11,
                              color: Colors.blue,
                              fontWeight: FontWeight.w600,
                            ),
                            textAlign: TextAlign.center,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 12),

          // Team stats comparison - inline
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.05),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white.withOpacity(0.1)),
            ),
            child: Column(
              children: [
                _buildCompactStatRow(
                  Icons.sports_soccer,
                  'Goles',
                  homeStats['goals'] ?? 0,
                  awayStats['goals'] ?? 0,
                  Colors.white,
                ),
                const SizedBox(height: 8),
                _buildCompactStatRow(
                  Icons.square,
                  'T. Amarillas',
                  homeStats['yellow_cards'] ?? 0,
                  awayStats['yellow_cards'] ?? 0,
                  Colors.yellow,
                ),
                const SizedBox(height: 8),
                _buildCompactStatRow(
                  Icons.square,
                  'T. Rojas',
                  homeStats['red_cards'] ?? 0,
                  awayStats['red_cards'] ?? 0,
                  Colors.red,
                ),
              ],
            ),
          ),

          const SizedBox(height: 12),

          // Observations
          Container(
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.05),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white.withOpacity(0.1)),
            ),
            child: TextField(
              controller: _observationsController,
              maxLines: 2,
              style: GoogleFonts.outfit(color: Colors.white, fontSize: 13),
              decoration: InputDecoration(
                labelText: 'Observaciones (opcional)',
                labelStyle: GoogleFonts.outfit(color: Colors.white38, fontSize: 11),
                hintText: 'Incidencias del partido...',
                hintStyle: GoogleFonts.outfit(color: Colors.white24, fontSize: 13),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.all(12),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCompactStatRow(
    IconData icon,
    String label,
    int homeValue,
    int awayValue,
    Color color,
  ) {
    return Row(
      children: [
        // Home value
        Container(
          width: 32,
          alignment: Alignment.center,
          child: Text(
            '$homeValue',
            style: GoogleFonts.bebasNeue(
              fontSize: 18,
              color: homeValue > 0 ? _neonGreen : Colors.white38,
            ),
          ),
        ),
        const SizedBox(width: 8),
        // Label
        Expanded(
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 14, color: color),
              const SizedBox(width: 6),
              Text(
                label,
                style: GoogleFonts.outfit(
                  fontSize: 12,
                  color: Colors.white54,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 8),
        // Away value
        Container(
          width: 32,
          alignment: Alignment.center,
          child: Text(
            '$awayValue',
            style: GoogleFonts.bebasNeue(
              fontSize: 18,
              color: awayValue > 0 ? Colors.blue : Colors.white38,
            ),
          ),
        ),
      ],
    );
  }

  Map<String, int> _calculateTeamStats(List<Map<String, dynamic>> players) {
    int goals = 0;
    int yellowCards = 0;
    int redCards = 0;

    for (final player in players) {
      final playerId = player['id'] as String?;
      if (playerId != null && _playerStats.containsKey(playerId)) {
        goals += _playerStats[playerId]!['goals'] ?? 0;
        yellowCards += _playerStats[playerId]!['yellow_cards'] ?? 0;
        redCards += _playerStats[playerId]!['red_cards'] ?? 0;
      }
    }

    return {
      'goals': goals,
      'yellow_cards': yellowCards,
      'red_cards': redCards,
    };
  }

  Widget _buildBottomButtons() {
    final isLastStep = _currentStep == _steps.length - 1;

    return Container(
      padding: EdgeInsets.fromLTRB(
        16,
        16,
        16,
        MediaQuery.of(context).padding.bottom + 16,
      ),
      decoration: BoxDecoration(
        color: _surfaceDark,
        border: Border(
          top: BorderSide(color: Colors.white.withOpacity(0.1)),
        ),
      ),
      child: Row(
        children: [
          if (_currentStep > 0)
            Expanded(
              child: _buildButton(
                'Anterior',
                Colors.white.withOpacity(0.1),
                Colors.white,
                _previousStep,
              ),
            ),
          if (_currentStep > 0) const SizedBox(width: 12),
          Expanded(
            flex: _currentStep > 0 ? 1 : 2,
            child: _buildButton(
              isLastStep ? 'Finalizar Partido' : 'Siguiente',
              isLastStep ? _gold : _neonGreen,
              _primaryDark,
              isLastStep ? _submitMatch : _nextStep,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildButton(
    String label,
    Color bgColor,
    Color textColor,
    VoidCallback onPressed,
  ) {
    return Material(
      color: bgColor,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: _isSubmitting ? null : () {
          HapticFeedback.lightImpact();
          onPressed();
        },
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          alignment: Alignment.center,
          child: Text(
            label,
            style: GoogleFonts.outfit(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: textColor,
            ),
          ),
        ),
      ),
    );
  }
}
