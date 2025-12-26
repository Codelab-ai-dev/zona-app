import 'dart:ui';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../data/datasources/remote/supabase_client.dart';

/// Stadium Nights Design System
class _StadiumNights {
  static const Color backgroundDark = Color(0xFF050508);
  static const Color surfaceDark = Color(0xFF0A0A0F);
  static const Color cardDark = Color(0xFF12121A);

  static const Color gold = Color(0xFFFFD700);
  static const Color amber = Color(0xFFF59E0B);

  static const Color neonGreen = Color(0xFF00FF7F);
  static const Color neonBlue = Color(0xFF00BFFF);
  static const Color neonPurple = Color(0xFF8B5CF6);
  static const Color neonPink = Color(0xFFFF6B9D);

  static const Color error = Color(0xFFEF4444);

  static const Color textPrimary = Color(0xFFFAFAFA);
  static const Color textSecondary = Color(0xFF9CA3AF);
  static const Color textMuted = Color(0xFF6B7280);
}

/// Global Statistics Screen - Stadium Nights Edition
class GlobalStatisticsScreen extends StatefulWidget {
  const GlobalStatisticsScreen({super.key});

  @override
  State<GlobalStatisticsScreen> createState() => _GlobalStatisticsScreenState();
}

class _GlobalStatisticsScreenState extends State<GlobalStatisticsScreen>
    with TickerProviderStateMixin {
  late AnimationController _headerController;
  late AnimationController _statsController;
  late Animation<double> _headerAnimation;

  bool _isLoading = true;
  String? _error;

  // Stats data
  int _leaguesCount = 0;
  int _teamsCount = 0;
  int _playersCount = 0;
  int _matchesCount = 0;
  int _tournamentsCount = 0;
  int _usersCount = 0;

  // Additional stats
  int _matchesThisMonth = 0;
  int _goalsThisMonth = 0;
  int _activeLeagues = 0;

  // Top scorers
  List<Map<String, dynamic>> _topScorers = [];

  // Recent matches
  List<Map<String, dynamic>> _recentMatches = [];

  @override
  void initState() {
    super.initState();

    _headerController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    );

    _statsController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );

    _headerAnimation = CurvedAnimation(
      parent: _headerController,
      curve: Curves.easeOutCubic,
    );

    _headerController.forward();
    _loadStatistics();
  }

  Future<void> _loadStatistics() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final client = SupabaseClientService.instance.client;

      // Fetch all counts in parallel
      final results = await Future.wait([
        client.from('leagues').select('id, is_active'),
        client.from('teams').select('id').eq('is_active', true),
        client.from('players').select('id').eq('is_active', true),
        client.from('matches').select('id, status, match_date, home_score, away_score'),
        client.from('tournaments').select('id').eq('is_active', true),
        client.from('users').select('id'),
      ]);

      // Process leagues
      final leagues = results[0] as List;
      _leaguesCount = leagues.length;
      _activeLeagues = leagues.where((l) => l['is_active'] == true).length;

      // Process teams
      _teamsCount = (results[1] as List).length;

      // Process players
      _playersCount = (results[2] as List).length;

      // Process matches
      final matches = results[3] as List;
      _matchesCount = matches.length;

      // Calculate this month's stats
      final now = DateTime.now();
      final startOfMonth = DateTime(now.year, now.month, 1);
      _matchesThisMonth = matches.where((m) {
        final matchDate = DateTime.tryParse(m['match_date'] ?? '');
        return matchDate != null && matchDate.isAfter(startOfMonth);
      }).length;

      _goalsThisMonth = matches.where((m) {
        final matchDate = DateTime.tryParse(m['match_date'] ?? '');
        return matchDate != null && matchDate.isAfter(startOfMonth);
      }).fold<int>(0, (sum, m) {
        final homeScore = (m['home_score'] ?? 0) as int;
        final awayScore = (m['away_score'] ?? 0) as int;
        return sum + homeScore + awayScore;
      });

      // Process tournaments
      _tournamentsCount = (results[4] as List).length;

      // Process users
      _usersCount = (results[5] as List).length;

      // Fetch top scorers
      try {
        final scorersResult = await client
            .from('player_stats')
            .select('player_id, goals, players(name, photo)')
            .order('goals', ascending: false)
            .limit(5);
        _topScorers = List<Map<String, dynamic>>.from(scorersResult);
      } catch (e) {
        _topScorers = [];
      }

      // Fetch recent matches
      try {
        final matchesResult = await client
            .from('matches')
            .select('''
              id,
              match_date,
              status,
              home_score,
              away_score,
              home_team:teams!matches_home_team_id_fkey(name),
              away_team:teams!matches_away_team_id_fkey(name)
            ''')
            .order('match_date', ascending: false)
            .limit(5);
        _recentMatches = List<Map<String, dynamic>>.from(matchesResult);
      } catch (e) {
        _recentMatches = [];
      }

      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        _statsController.forward();
      }
    } catch (e) {
      print('❌ Error loading statistics: $e');
      if (mounted) {
        setState(() {
          _error = 'Error al cargar estadísticas';
          _isLoading = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _headerController.dispose();
    _statsController.dispose();
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
        body: Stack(
          children: [
            const _StadiumFieldBackground(),
            _buildSpotlightEffects(),
            SafeArea(
              child: Column(
                children: [
                  _buildHeader(),
                  Expanded(
                    child: _isLoading
                        ? _buildLoadingState()
                        : _error != null
                            ? _buildErrorState()
                            : _buildContent(),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSpotlightEffects() {
    return AnimatedBuilder(
      animation: _headerAnimation,
      builder: (context, child) {
        return Stack(
          children: [
            Positioned(
              top: -100,
              left: -50,
              child: Opacity(
                opacity: 0.3 * _headerAnimation.value,
                child: Container(
                  width: 300,
                  height: 400,
                  decoration: BoxDecoration(
                    gradient: RadialGradient(
                      colors: [
                        _StadiumNights.neonPink.withOpacity(0.4),
                        _StadiumNights.neonPink.withOpacity(0.1),
                        Colors.transparent,
                      ],
                      stops: const [0.0, 0.4, 1.0],
                    ),
                  ),
                ),
              ),
            ),
            Positioned(
              top: -80,
              right: -80,
              child: Opacity(
                opacity: 0.25 * _headerAnimation.value,
                child: Container(
                  width: 350,
                  height: 350,
                  decoration: BoxDecoration(
                    gradient: RadialGradient(
                      colors: [
                        _StadiumNights.neonPurple.withOpacity(0.3),
                        Colors.transparent,
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildHeader() {
    return AnimatedBuilder(
      animation: _headerAnimation,
      builder: (context, child) {
        return Transform.translate(
          offset: Offset(0, -30 * (1 - _headerAnimation.value)),
          child: Opacity(
            opacity: _headerAnimation.value,
            child: Container(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
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
                        color: _StadiumNights.cardDark,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: _StadiumNights.neonPink.withOpacity(0.2),
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: _StadiumNights.neonPink.withOpacity(0.1),
                            blurRadius: 12,
                            spreadRadius: -2,
                          ),
                        ],
                      ),
                      child: Icon(
                        Icons.arrow_back,
                        color: _StadiumNights.neonPink,
                        size: 20,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),

                  // Title with icon
                  _buildAnimatedIcon(),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'ESTADÍSTICAS',
                          style: GoogleFonts.bebasNeue(
                            fontSize: 28,
                            color: _StadiumNights.textPrimary,
                            letterSpacing: 3,
                            height: 1,
                          ),
                        ),
                        Text(
                          'Métricas globales del sistema',
                          style: GoogleFonts.outfit(
                            fontSize: 12,
                            color: _StadiumNights.neonPink,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Refresh button
                  GestureDetector(
                    onTap: () {
                      HapticFeedback.mediumImpact();
                      _loadStatistics();
                    },
                    child: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: _StadiumNights.cardDark,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: Colors.white.withOpacity(0.1),
                        ),
                      ),
                      child: Icon(
                        Icons.refresh,
                        color: _StadiumNights.textMuted,
                        size: 20,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildAnimatedIcon() {
    return AnimatedBuilder(
      animation: _headerAnimation,
      builder: (context, child) {
        return Transform.scale(
          scale: 0.8 + (0.2 * _headerAnimation.value),
          child: Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  _StadiumNights.neonPink,
                  _StadiumNights.neonPurple,
                ],
              ),
              borderRadius: BorderRadius.circular(14),
              boxShadow: [
                BoxShadow(
                  color: _StadiumNights.neonPink.withOpacity(0.4 * _headerAnimation.value),
                  blurRadius: 20,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: const Icon(
              Icons.analytics,
              color: Colors.white,
              size: 26,
            ),
          ),
        );
      },
    );
  }

  Widget _buildLoadingState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(
            width: 60,
            height: 60,
            child: CircularProgressIndicator(
              strokeWidth: 3,
              valueColor: AlwaysStoppedAnimation<Color>(_StadiumNights.neonPink),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'CARGANDO ESTADÍSTICAS',
            style: GoogleFonts.bebasNeue(
              fontSize: 18,
              color: _StadiumNights.textSecondary,
              letterSpacing: 2,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(40),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const SizedBox(height: 60),
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: _StadiumNights.error.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.error_outline,
              size: 40,
              color: _StadiumNights.error,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'ERROR AL CARGAR',
            style: GoogleFonts.bebasNeue(
              fontSize: 24,
              color: _StadiumNights.textPrimary,
              letterSpacing: 2,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _error ?? 'Error desconocido',
            textAlign: TextAlign.center,
            style: GoogleFonts.outfit(
              fontSize: 14,
              color: _StadiumNights.textSecondary,
            ),
          ),
          const SizedBox(height: 32),
          GestureDetector(
            onTap: _loadStatistics,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [_StadiumNights.neonPink, _StadiumNights.neonPurple],
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                'REINTENTAR',
                style: GoogleFonts.bebasNeue(
                  fontSize: 16,
                  color: Colors.white,
                  letterSpacing: 1,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContent() {
    return RefreshIndicator(
      onRefresh: _loadStatistics,
      color: _StadiumNights.neonPink,
      backgroundColor: _StadiumNights.cardDark,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 100),
        children: [
          // Main stats grid
          _buildMainStatsGrid(),
          const SizedBox(height: 24),

          // Monthly overview
          _buildSectionHeader('ESTE MES', Icons.calendar_today),
          const SizedBox(height: 12),
          _buildMonthlyStats(),
          const SizedBox(height: 24),

          // Top scorers
          if (_topScorers.isNotEmpty) ...[
            _buildSectionHeader('GOLEADORES', Icons.sports_soccer),
            const SizedBox(height: 12),
            _buildTopScorers(),
            const SizedBox(height: 24),
          ],

          // Recent matches
          if (_recentMatches.isNotEmpty) ...[
            _buildSectionHeader('PARTIDOS RECIENTES', Icons.scoreboard),
            const SizedBox(height: 12),
            _buildRecentMatches(),
          ],
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 16, color: _StadiumNights.textMuted),
        const SizedBox(width: 8),
        Text(
          title,
          style: GoogleFonts.bebasNeue(
            fontSize: 14,
            color: _StadiumNights.textMuted,
            letterSpacing: 2,
          ),
        ),
      ],
    );
  }

  Widget _buildMainStatsGrid() {
    return AnimatedBuilder(
      animation: _statsController,
      builder: (context, child) {
        return Opacity(
          opacity: _statsController.value,
          child: Transform.translate(
            offset: Offset(0, 20 * (1 - _statsController.value)),
            child: child,
          ),
        );
      },
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: _buildStatCard(
                  icon: Icons.emoji_events,
                  value: '$_leaguesCount',
                  label: 'Ligas',
                  sublabel: '$_activeLeagues activas',
                  color: _StadiumNights.gold,
                  delay: 0,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildStatCard(
                  icon: Icons.groups,
                  value: '$_teamsCount',
                  label: 'Equipos',
                  sublabel: 'Registrados',
                  color: _StadiumNights.neonBlue,
                  delay: 1,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildStatCard(
                  icon: Icons.person,
                  value: '$_playersCount',
                  label: 'Jugadores',
                  sublabel: 'Activos',
                  color: _StadiumNights.neonGreen,
                  delay: 2,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildStatCard(
                  icon: Icons.sports_soccer,
                  value: '$_matchesCount',
                  label: 'Partidos',
                  sublabel: 'Total jugados',
                  color: _StadiumNights.neonPink,
                  delay: 3,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildStatCard(
                  icon: Icons.military_tech,
                  value: '$_tournamentsCount',
                  label: 'Torneos',
                  sublabel: 'Activos',
                  color: _StadiumNights.amber,
                  delay: 4,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildStatCard(
                  icon: Icons.people,
                  value: '$_usersCount',
                  label: 'Usuarios',
                  sublabel: 'Registrados',
                  color: _StadiumNights.neonPurple,
                  delay: 5,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard({
    required IconData icon,
    required String value,
    required String label,
    required String sublabel,
    required Color color,
    required int delay,
  }) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.0, end: 1.0),
      duration: Duration(milliseconds: 600 + (delay * 100)),
      curve: Curves.easeOutCubic,
      builder: (context, animValue, child) {
        return Transform.scale(
          scale: 0.8 + (0.2 * animValue),
          child: Opacity(
            opacity: animValue,
            child: child,
          ),
        );
      },
      child: ClipRRect(
        borderRadius: BorderRadius.circular(18),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  color.withOpacity(0.15),
                  color.withOpacity(0.05),
                ],
              ),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                color: color.withOpacity(0.2),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: color.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(icon, color: color, size: 22),
                    ),
                    Text(
                      value,
                      style: GoogleFonts.bebasNeue(
                        fontSize: 32,
                        color: color,
                        letterSpacing: 1,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  label,
                  style: GoogleFonts.outfit(
                    fontSize: 15,
                    color: _StadiumNights.textPrimary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  sublabel,
                  style: GoogleFonts.outfit(
                    fontSize: 12,
                    color: _StadiumNights.textMuted,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMonthlyStats() {
    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Colors.white.withOpacity(0.08),
                Colors.white.withOpacity(0.03),
              ],
            ),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: Colors.white.withOpacity(0.08),
            ),
          ),
          child: Row(
            children: [
              Expanded(
                child: _buildMiniStat(
                  icon: Icons.sports_soccer,
                  value: '$_matchesThisMonth',
                  label: 'Partidos',
                  color: _StadiumNights.neonBlue,
                ),
              ),
              Container(
                width: 1,
                height: 50,
                color: Colors.white.withOpacity(0.1),
              ),
              Expanded(
                child: _buildMiniStat(
                  icon: Icons.sports_score,
                  value: '$_goalsThisMonth',
                  label: 'Goles',
                  color: _StadiumNights.neonGreen,
                ),
              ),
              Container(
                width: 1,
                height: 50,
                color: Colors.white.withOpacity(0.1),
              ),
              Expanded(
                child: _buildMiniStat(
                  icon: Icons.emoji_events,
                  value: '$_activeLeagues',
                  label: 'Ligas Activas',
                  color: _StadiumNights.gold,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMiniStat({
    required IconData icon,
    required String value,
    required String label,
    required Color color,
  }) {
    return Column(
      children: [
        Icon(icon, color: color, size: 24),
        const SizedBox(height: 8),
        Text(
          value,
          style: GoogleFonts.bebasNeue(
            fontSize: 28,
            color: _StadiumNights.textPrimary,
            letterSpacing: 1,
          ),
        ),
        Text(
          label,
          style: GoogleFonts.outfit(
            fontSize: 11,
            color: _StadiumNights.textMuted,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  Widget _buildTopScorers() {
    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Colors.white.withOpacity(0.08),
                Colors.white.withOpacity(0.03),
              ],
            ),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: Colors.white.withOpacity(0.08),
            ),
          ),
          child: Column(
            children: _topScorers.asMap().entries.map((entry) {
              final index = entry.key;
              final scorer = entry.value;
              final player = scorer['players'] as Map<String, dynamic>?;
              final playerName = player?['name'] ?? 'Jugador';
              final goals = scorer['goals'] ?? 0;

              return Column(
                children: [
                  _buildScorerTile(
                    position: index + 1,
                    name: playerName,
                    goals: goals,
                  ),
                  if (index < _topScorers.length - 1)
                    Container(
                      height: 1,
                      margin: const EdgeInsets.symmetric(horizontal: 16),
                      color: Colors.white.withOpacity(0.05),
                    ),
                ],
              );
            }).toList(),
          ),
        ),
      ),
    );
  }

  Widget _buildScorerTile({
    required int position,
    required String name,
    required int goals,
  }) {
    Color positionColor;
    IconData? medal;

    switch (position) {
      case 1:
        positionColor = _StadiumNights.gold;
        medal = Icons.workspace_premium;
        break;
      case 2:
        positionColor = const Color(0xFFC0C0C0);
        medal = Icons.workspace_premium;
        break;
      case 3:
        positionColor = const Color(0xFFCD7F32);
        medal = Icons.workspace_premium;
        break;
      default:
        positionColor = _StadiumNights.textMuted;
        medal = null;
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          // Position
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: positionColor.withOpacity(0.2),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Center(
              child: medal != null
                  ? Icon(medal, color: positionColor, size: 18)
                  : Text(
                      '$position',
                      style: GoogleFonts.bebasNeue(
                        fontSize: 16,
                        color: positionColor,
                      ),
                    ),
            ),
          ),
          const SizedBox(width: 14),

          // Name
          Expanded(
            child: Text(
              name,
              style: GoogleFonts.outfit(
                fontSize: 15,
                color: _StadiumNights.textPrimary,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),

          // Goals
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: _StadiumNights.neonGreen.withOpacity(0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.sports_soccer,
                  size: 14,
                  color: _StadiumNights.neonGreen,
                ),
                const SizedBox(width: 6),
                Text(
                  '$goals',
                  style: GoogleFonts.bebasNeue(
                    fontSize: 16,
                    color: _StadiumNights.neonGreen,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRecentMatches() {
    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Colors.white.withOpacity(0.08),
                Colors.white.withOpacity(0.03),
              ],
            ),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: Colors.white.withOpacity(0.08),
            ),
          ),
          child: Column(
            children: _recentMatches.asMap().entries.map((entry) {
              final index = entry.key;
              final match = entry.value;

              return Column(
                children: [
                  _buildMatchTile(match),
                  if (index < _recentMatches.length - 1)
                    Container(
                      height: 1,
                      margin: const EdgeInsets.symmetric(horizontal: 16),
                      color: Colors.white.withOpacity(0.05),
                    ),
                ],
              );
            }).toList(),
          ),
        ),
      ),
    );
  }

  Widget _buildMatchTile(Map<String, dynamic> match) {
    final homeTeam = match['home_team'] as Map<String, dynamic>?;
    final awayTeam = match['away_team'] as Map<String, dynamic>?;
    final homeName = homeTeam?['name'] ?? 'Local';
    final awayName = awayTeam?['name'] ?? 'Visitante';
    final homeScore = match['home_score'] ?? 0;
    final awayScore = match['away_score'] ?? 0;
    final status = match['status'] ?? 'scheduled';
    final matchDate = DateTime.tryParse(match['match_date'] ?? '');

    Color statusColor;
    String statusText;

    switch (status) {
      case 'completed':
        statusColor = _StadiumNights.neonGreen;
        statusText = 'Finalizado';
        break;
      case 'in_progress':
        statusColor = _StadiumNights.amber;
        statusText = 'En vivo';
        break;
      default:
        statusColor = _StadiumNights.textMuted;
        statusText = 'Programado';
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Column(
        children: [
          // Teams and score
          Row(
            children: [
              // Home team
              Expanded(
                child: Text(
                  homeName,
                  style: GoogleFonts.outfit(
                    fontSize: 14,
                    color: _StadiumNights.textPrimary,
                    fontWeight: FontWeight.w500,
                  ),
                  textAlign: TextAlign.right,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 12),

              // Score
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: statusColor.withOpacity(0.3),
                  ),
                ),
                child: Text(
                  status == 'scheduled' ? 'vs' : '$homeScore - $awayScore',
                  style: GoogleFonts.bebasNeue(
                    fontSize: 18,
                    color: statusColor,
                    letterSpacing: 1,
                  ),
                ),
              ),

              const SizedBox(width: 12),

              // Away team
              Expanded(
                child: Text(
                  awayName,
                  style: GoogleFonts.outfit(
                    fontSize: 14,
                    color: _StadiumNights.textPrimary,
                    fontWeight: FontWeight.w500,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Status and date
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 6,
                height: 6,
                decoration: BoxDecoration(
                  color: statusColor,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 6),
              Text(
                statusText,
                style: GoogleFonts.outfit(
                  fontSize: 11,
                  color: statusColor,
                  fontWeight: FontWeight.w500,
                ),
              ),
              if (matchDate != null) ...[
                Text(
                  ' • ',
                  style: GoogleFonts.outfit(
                    fontSize: 11,
                    color: _StadiumNights.textMuted,
                  ),
                ),
                Text(
                  _formatDate(matchDate),
                  style: GoogleFonts.outfit(
                    fontSize: 11,
                    color: _StadiumNights.textMuted,
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    final months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return '${date.day} ${months[date.month - 1]}';
  }
}

/// Stadium Field Background
class _StadiumFieldBackground extends StatefulWidget {
  const _StadiumFieldBackground();

  @override
  State<_StadiumFieldBackground> createState() => _StadiumFieldBackgroundState();
}

class _StadiumFieldBackgroundState extends State<_StadiumFieldBackground>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 20),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          return CustomPaint(
            painter: _StadiumFieldPainter(
              animationValue: _controller.value,
            ),
          );
        },
      ),
    );
  }
}

class _StadiumFieldPainter extends CustomPainter {
  final double animationValue;

  _StadiumFieldPainter({required this.animationValue});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = _StadiumNights.neonPink.withOpacity(0.02)
      ..strokeWidth = 1.0
      ..style = PaintingStyle.stroke;

    final centerX = size.width / 2;
    final centerY = size.height / 2;

    final pulseScale = 1.0 + (math.sin(animationValue * 2 * math.pi) * 0.02);
    canvas.drawCircle(
      Offset(centerX, centerY),
      60 * pulseScale,
      paint,
    );

    canvas.drawLine(
      Offset(0, centerY),
      Offset(size.width, centerY),
      paint,
    );

    final pitchRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(
        size.width * 0.08,
        size.height * 0.2,
        size.width * 0.84,
        size.height * 0.6,
      ),
      const Radius.circular(4),
    );
    canvas.drawRRect(pitchRect, paint);
  }

  @override
  bool shouldRepaint(covariant _StadiumFieldPainter oldDelegate) {
    return oldDelegate.animationValue != animationValue;
  }
}
