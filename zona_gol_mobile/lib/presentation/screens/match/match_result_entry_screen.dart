import 'dart:convert';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/di/injection.dart';
import '../../../domain/entities/match_entity.dart';
import '../../../core/utils/embedding_generator.dart';
import '../../../domain/entities/player_entity.dart';
import '../../../domain/entities/user_entity.dart';
import '../../../domain/repositories/player_stats_repository.dart';
import '../../../domain/usecases/get_players_by_team_usecase.dart';
import '../../bloc/match_detail/match_detail_bloc.dart';
import '../../bloc/match_detail/match_detail_event.dart';
import '../../bloc/match_detail/match_detail_state.dart';

class _S {
  static const Color backgroundDark = Color(0xFF050508);
  static const Color surfaceDark = Color(0xFF0A0A0F);
  static const Color cardDark = Color(0xFF12121A);
  static const Color gold = Color(0xFFFFD700);
  static const Color amber = Color(0xFFF59E0B);
  static const Color neonGreen = Color(0xFF00FF7F);
  static const Color neonBlue = Color(0xFF00BFFF);
  static const Color success = Color(0xFF10B981);
  static const Color error = Color(0xFFEF4444);
  static const Color textPrimary = Color(0xFFFAFAFA);
  static const Color textSecondary = Color(0xFF9CA3AF);
  static const Color textMuted = Color(0xFF6B7280);
}

/// Mutable stats holder for each player during form editing
class _PlayerStats {
  final PlayerEntity player;
  int goals = 0;
  int assists = 0;
  int yellowCards = 0;
  int redCards = 0;
  int minutesPlayed = 0;

  _PlayerStats(this.player);

  bool get hasAnyStats =>
      goals > 0 || assists > 0 || yellowCards > 0 || redCards > 0;

  PlayerMatchStatEntry toEntry() => PlayerMatchStatEntry(
        playerId: player.id,
        goals: goals,
        assists: assists,
        yellowCards: yellowCards,
        redCards: redCards,
        minutesPlayed: minutesPlayed,
      );
}

class MatchResultEntryScreen extends StatefulWidget {
  final MatchEntity match;
  final UserEntity user;
  final MatchDetailBloc matchDetailBloc;

  const MatchResultEntryScreen({
    super.key,
    required this.match,
    required this.user,
    required this.matchDetailBloc,
  });

  @override
  State<MatchResultEntryScreen> createState() => _MatchResultEntryScreenState();
}

class _MatchResultEntryScreenState extends State<MatchResultEntryScreen> {
  late final PageController _pageController;
  int _currentStep = 0;
  static const int _totalSteps = 4;

  // Step 0: Score
  late final TextEditingController _homeScoreCtrl;
  late final TextEditingController _awayScoreCtrl;

  // Step 1 & 2: Player stats
  List<_PlayerStats> _homePlayers = [];
  List<_PlayerStats> _awayPlayers = [];
  bool _loadingPlayers = true;
  String? _loadError;

  // Step 3: Observations
  late final TextEditingController _observationsCtrl;

  // Saving
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    _homeScoreCtrl = TextEditingController(
      text: widget.match.homeScore?.toString() ?? '',
    );
    _awayScoreCtrl = TextEditingController(
      text: widget.match.awayScore?.toString() ?? '',
    );
    _observationsCtrl = TextEditingController();
    _loadPlayers();
  }

  Future<void> _loadPlayers() async {
    setState(() {
      _loadingPlayers = true;
      _loadError = null;
    });

    final useCase = sl<GetPlayersByTeamUseCase>();

    final homeResult = await useCase(
      GetPlayersByTeamParams(
        teamId: widget.match.homeTeamId,
        onlyActive: true,
      ),
    );

    final awayResult = await useCase(
      GetPlayersByTeamParams(
        teamId: widget.match.awayTeamId,
        onlyActive: true,
      ),
    );

    if (!mounted) return;

    String? error;
    List<PlayerEntity> homePlayers = [];
    List<PlayerEntity> awayPlayers = [];

    homeResult.fold(
      (f) => error = f.message,
      (players) => homePlayers = players,
    );

    awayResult.fold(
      (f) => error ??= f.message,
      (players) => awayPlayers = players,
    );

    // Sort by jersey number
    homePlayers.sort(
        (a, b) => (a.jerseyNumber ?? 999).compareTo(b.jerseyNumber ?? 999));
    awayPlayers.sort(
        (a, b) => (a.jerseyNumber ?? 999).compareTo(b.jerseyNumber ?? 999));

    setState(() {
      _homePlayers =
          homePlayers.map((p) => _PlayerStats(p)).toList();
      _awayPlayers =
          awayPlayers.map((p) => _PlayerStats(p)).toList();
      _loadingPlayers = false;
      _loadError = error;
    });
  }

  @override
  void dispose() {
    _pageController.dispose();
    _homeScoreCtrl.dispose();
    _awayScoreCtrl.dispose();
    _observationsCtrl.dispose();
    super.dispose();
  }

  int get _homeScore => int.tryParse(_homeScoreCtrl.text) ?? 0;
  int get _awayScore => int.tryParse(_awayScoreCtrl.text) ?? 0;
  int get _homeGoalsTotal => _homePlayers.fold(0, (s, p) => s + p.goals);
  int get _awayGoalsTotal => _awayPlayers.fold(0, (s, p) => s + p.goals);

  void _goToStep(int step) {
    if (step < 0 || step >= _totalSteps) return;
    setState(() => _currentStep = step);
    _pageController.animateToPage(
      step,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
  }

  void _onNext() {
    if (_currentStep == 0) {
      // Validate score entered
      if (_homeScore < 0 || _awayScore < 0) {
        _showError('Ingresa marcadores válidos');
        return;
      }
      if (_homeScoreCtrl.text.isEmpty || _awayScoreCtrl.text.isEmpty) {
        _showError('Ingresa el marcador de ambos equipos');
        return;
      }
    } else if (_currentStep == 2) {
      // Validate goals match score before going to confirmation
      if (_homeGoalsTotal != _homeScore) {
        _showGoalsMismatchDialog();
        return;
      }
      if (_awayGoalsTotal != _awayScore) {
        _showGoalsMismatchDialog();
        return;
      }
    }
    _goToStep(_currentStep + 1);
  }

  void _onBack() {
    if (_currentStep == 0) {
      Navigator.pop(context);
    } else {
      _goToStep(_currentStep - 1);
    }
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: _S.error),
    );
  }

  void _showGoalsMismatchDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: _S.cardDark,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          'GOLES NO COINCIDEN',
          style: GoogleFonts.bebasNeue(
            fontSize: 22,
            color: _S.error,
            letterSpacing: 2,
          ),
          textAlign: TextAlign.center,
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Los goles asignados a jugadores deben coincidir con el marcador.',
              textAlign: TextAlign.center,
              style: GoogleFonts.outfit(
                fontSize: 14,
                color: _S.textSecondary,
              ),
            ),
            const SizedBox(height: 20),
            _buildMismatchRow(
              widget.match.homeTeam?.name ?? 'Local',
              _homeScore,
              _homeGoalsTotal,
            ),
            const SizedBox(height: 8),
            _buildMismatchRow(
              widget.match.awayTeam?.name ?? 'Visitante',
              _awayScore,
              _awayGoalsTotal,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(
              'CORREGIR',
              style: GoogleFonts.bebasNeue(
                fontSize: 14,
                color: _S.gold,
                letterSpacing: 1,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMismatchRow(String teamName, int score, int playerGoals) {
    final match = score == playerGoals;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: match
            ? _S.success.withOpacity(0.1)
            : _S.error.withOpacity(0.1),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: match
              ? _S.success.withOpacity(0.3)
              : _S.error.withOpacity(0.3),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              teamName,
              style: GoogleFonts.outfit(
                fontSize: 13,
                color: _S.textPrimary,
                fontWeight: FontWeight.w500,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          Text(
            'Marcador: $score',
            style: GoogleFonts.outfit(fontSize: 12, color: _S.textMuted),
          ),
          const SizedBox(width: 8),
          Text(
            'Jugadores: $playerGoals',
            style: GoogleFonts.outfit(fontSize: 12, color: _S.textMuted),
          ),
          const SizedBox(width: 8),
          Icon(
            match ? Icons.check_circle : Icons.cancel,
            size: 18,
            color: match ? _S.success : _S.error,
          ),
        ],
      ),
    );
  }

  void _onSubmit() {
    if (_saving) return;

    setState(() => _saving = true);

    widget.matchDetailBloc.add(SaveMatchPlayerStatsEvent(
      matchId: widget.match.id,
      homeScore: _homeScore,
      awayScore: _awayScore,
      homeEntries: _homePlayers.map((p) => p.toEntry()).toList(),
      awayEntries: _awayPlayers.map((p) => p.toEntry()).toList(),
      observations: _observationsCtrl.text.trim().isEmpty
          ? null
          : _observationsCtrl.text.trim(),
    ));
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<MatchDetailBloc, MatchDetailState>(
      bloc: widget.matchDetailBloc,
      listener: (context, state) {
        if (state is MatchPlayerStatsSaved) {
          // Trigger embedding generation in background
          if (widget.user.leagueId != null) {
            EmbeddingGenerator.generateMatchResultsEmbedding(widget.user.leagueId!);
          }
          Navigator.pop(context, true); // return true = saved
        } else if (state is MatchPlayerStatsError) {
          setState(() => _saving = false);
          _showError(state.message);
        }
      },
      child: AnnotatedRegion<SystemUiOverlayStyle>(
        value: SystemUiOverlayStyle.light.copyWith(
          statusBarColor: Colors.transparent,
          systemNavigationBarColor: _S.backgroundDark,
        ),
        child: Scaffold(
          backgroundColor: _S.backgroundDark,
          appBar: _buildAppBar(),
          body: _loadingPlayers
              ? _buildLoadingState()
              : _loadError != null
                  ? _buildErrorState()
                  : Column(
                      children: [
                        _buildStepIndicator(),
                        Expanded(
                          child: PageView(
                            controller: _pageController,
                            physics: const NeverScrollableScrollPhysics(),
                            children: [
                              _buildScoreStep(),
                              _buildPlayerStatsStep(
                                widget.match.homeTeam?.name ?? 'Local',
                                _homePlayers,
                                _homeScore,
                                _homeGoalsTotal,
                              ),
                              _buildPlayerStatsStep(
                                widget.match.awayTeam?.name ?? 'Visitante',
                                _awayPlayers,
                                _awayScore,
                                _awayGoalsTotal,
                              ),
                              _buildConfirmStep(),
                            ],
                          ),
                        ),
                        _buildNavigationBar(),
                      ],
                    ),
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    final stepLabels = ['Marcador', 'Local', 'Visitante', 'Confirmar'];
    return AppBar(
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
        onPressed: _onBack,
      ),
      title: Column(
        children: [
          Text(
            'REGISTRAR RESULTADO',
            style: GoogleFonts.bebasNeue(
              fontSize: 20,
              color: _S.textPrimary,
              letterSpacing: 2,
            ),
          ),
          Text(
            stepLabels[_currentStep].toUpperCase(),
            style: GoogleFonts.outfit(
              fontSize: 11,
              color: _S.gold,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
      centerTitle: true,
    );
  }

  Widget _buildStepIndicator() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 32),
      color: _S.surfaceDark,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: List.generate(_totalSteps, (i) {
          final isActive = i == _currentStep;
          final isCompleted = i < _currentStep;
          return Row(
            children: [
              Container(
                width: isActive ? 32 : 24,
                height: isActive ? 32 : 24,
                decoration: BoxDecoration(
                  color: isCompleted
                      ? _S.gold
                      : isActive
                          ? _S.gold.withOpacity(0.2)
                          : Colors.white.withOpacity(0.06),
                  shape: BoxShape.circle,
                  border: isActive
                      ? Border.all(color: _S.gold, width: 2)
                      : null,
                ),
                child: Center(
                  child: isCompleted
                      ? const Icon(Icons.check, size: 14, color: Colors.black)
                      : Text(
                          '${i + 1}',
                          style: GoogleFonts.bebasNeue(
                            fontSize: isActive ? 15 : 12,
                            color: isActive ? _S.gold : _S.textMuted,
                          ),
                        ),
                ),
              ),
              if (i < _totalSteps - 1)
                Container(
                  width: 28,
                  height: 2,
                  color: isCompleted
                      ? _S.gold.withOpacity(0.5)
                      : Colors.white.withOpacity(0.06),
                ),
            ],
          );
        }),
      ),
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
              valueColor: AlwaysStoppedAnimation<Color>(_S.gold),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'CARGANDO JUGADORES',
            style: GoogleFonts.bebasNeue(
              fontSize: 16,
              color: _S.textMuted,
              letterSpacing: 2,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 50, color: _S.error),
            const SizedBox(height: 16),
            Text(
              _loadError ?? 'Error desconocido',
              textAlign: TextAlign.center,
              style: GoogleFonts.outfit(fontSize: 14, color: _S.textSecondary),
            ),
            const SizedBox(height: 24),
            GestureDetector(
              onTap: _loadPlayers,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                      colors: [_S.gold, _S.amber]),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  'REINTENTAR',
                  style: GoogleFonts.bebasNeue(
                    fontSize: 14,
                    color: Colors.black,
                    letterSpacing: 1,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ==================== Step 0: Score ====================

  Widget _buildScoreStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const SizedBox(height: 20),
          Text(
            'INGRESA EL MARCADOR',
            style: GoogleFonts.bebasNeue(
              fontSize: 24,
              color: _S.textPrimary,
              letterSpacing: 2,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            widget.match.roundText,
            style: GoogleFonts.outfit(fontSize: 13, color: _S.textMuted),
          ),
          const SizedBox(height: 40),
          Row(
            children: [
              Expanded(
                child: _buildTeamScoreColumn(
                  widget.match.homeTeam,
                  _homeScoreCtrl,
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  'VS',
                  style: GoogleFonts.bebasNeue(
                    fontSize: 32,
                    color: _S.textMuted,
                  ),
                ),
              ),
              Expanded(
                child: _buildTeamScoreColumn(
                  widget.match.awayTeam,
                  _awayScoreCtrl,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTeamScoreColumn(
    MatchTeamInfo? team,
    TextEditingController ctrl,
  ) {
    return Column(
      children: [
        _buildTeamLogo(team, 64),
        const SizedBox(height: 10),
        Text(
          team?.name ?? 'Equipo',
          textAlign: TextAlign.center,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: GoogleFonts.outfit(
            fontSize: 14,
            color: _S.textPrimary,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 16),
        Container(
          width: 90,
          height: 70,
          decoration: BoxDecoration(
            color: _S.surfaceDark,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: _S.gold.withOpacity(0.3)),
          ),
          child: TextField(
            controller: ctrl,
            keyboardType: TextInputType.number,
            textAlign: TextAlign.center,
            style: GoogleFonts.bebasNeue(
              fontSize: 40,
              color: _S.textPrimary,
            ),
            decoration: InputDecoration(
              border: InputBorder.none,
              hintText: '0',
              hintStyle: GoogleFonts.bebasNeue(
                fontSize: 40,
                color: _S.textMuted.withOpacity(0.3),
              ),
            ),
            inputFormatters: [
              FilteringTextInputFormatter.digitsOnly,
              LengthLimitingTextInputFormatter(2),
            ],
            onChanged: (_) => setState(() {}),
          ),
        ),
      ],
    );
  }

  // ==================== Step 1 & 2: Player Stats ====================

  Widget _buildPlayerStatsStep(
    String teamName,
    List<_PlayerStats> players,
    int expectedScore,
    int currentGoals,
  ) {
    return Column(
      children: [
        // Goal counter bar
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          color: _S.cardDark,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.sports_soccer,
                size: 18,
                color: currentGoals == expectedScore
                    ? _S.neonGreen
                    : _S.amber,
              ),
              const SizedBox(width: 8),
              Text(
                'GOLES: $currentGoals / $expectedScore',
                style: GoogleFonts.bebasNeue(
                  fontSize: 16,
                  color: currentGoals == expectedScore
                      ? _S.neonGreen
                      : _S.amber,
                  letterSpacing: 1.5,
                ),
              ),
              if (currentGoals == expectedScore) ...[
                const SizedBox(width: 8),
                const Icon(Icons.check_circle, size: 16, color: _S.neonGreen),
              ],
            ],
          ),
        ),
        // Player list
        Expanded(
          child: players.isEmpty
              ? Center(
                  child: Text(
                    'No hay jugadores registrados\nen este equipo.',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.outfit(
                      fontSize: 14,
                      color: _S.textMuted,
                    ),
                  ),
                )
              : ListView.builder(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  itemCount: players.length,
                  itemBuilder: (context, index) {
                    return _PlayerStatCard(
                      playerStats: players[index],
                      onChanged: () => setState(() {}),
                    );
                  },
                ),
        ),
      ],
    );
  }

  // ==================== Step 3: Confirm ====================

  Widget _buildConfirmStep() {
    final homeWithStats = _homePlayers.where((p) => p.hasAnyStats).toList();
    final awayWithStats = _awayPlayers.where((p) => p.hasAnyStats).toList();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          const SizedBox(height: 8),
          Text(
            'CONFIRMAR RESULTADO',
            style: GoogleFonts.bebasNeue(
              fontSize: 24,
              color: _S.gold,
              letterSpacing: 2,
            ),
          ),
          const SizedBox(height: 24),

          // Score card
          ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      Colors.white.withOpacity(0.08),
                      Colors.white.withOpacity(0.03),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: _S.gold.withOpacity(0.2)),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        children: [
                          _buildTeamLogo(widget.match.homeTeam, 48),
                          const SizedBox(height: 6),
                          Text(
                            widget.match.homeTeam?.name ?? 'Local',
                            textAlign: TextAlign.center,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.outfit(
                              fontSize: 12,
                              color: _S.textPrimary,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      '$_homeScore',
                      style: GoogleFonts.bebasNeue(
                        fontSize: 48,
                        color: _S.textPrimary,
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      child: Text(
                        '-',
                        style: GoogleFonts.bebasNeue(
                          fontSize: 36,
                          color: _S.textMuted,
                        ),
                      ),
                    ),
                    Text(
                      '$_awayScore',
                      style: GoogleFonts.bebasNeue(
                        fontSize: 48,
                        color: _S.textPrimary,
                      ),
                    ),
                    Expanded(
                      child: Column(
                        children: [
                          _buildTeamLogo(widget.match.awayTeam, 48),
                          const SizedBox(height: 6),
                          Text(
                            widget.match.awayTeam?.name ?? 'Visitante',
                            textAlign: TextAlign.center,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.outfit(
                              fontSize: 12,
                              color: _S.textPrimary,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 20),

          // Stats summary
          if (homeWithStats.isNotEmpty) ...[
            _buildStatsSummarySection(
              widget.match.homeTeam?.name ?? 'Local',
              homeWithStats,
            ),
            const SizedBox(height: 12),
          ],
          if (awayWithStats.isNotEmpty) ...[
            _buildStatsSummarySection(
              widget.match.awayTeam?.name ?? 'Visitante',
              awayWithStats,
            ),
            const SizedBox(height: 12),
          ],

          if (homeWithStats.isEmpty && awayWithStats.isEmpty)
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: _S.cardDark,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline, size: 18, color: _S.amber),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'No se registraron estadísticas individuales de jugadores.',
                      style: GoogleFonts.outfit(
                        fontSize: 13,
                        color: _S.textSecondary,
                      ),
                    ),
                  ),
                ],
              ),
            ),

          // Referee observations
          const SizedBox(height: 16),
          Container(
            decoration: BoxDecoration(
              color: _S.cardDark,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.white.withOpacity(0.06)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
                  child: Row(
                    children: [
                      Icon(
                        Icons.note_alt_outlined,
                        size: 18,
                        color: _S.gold,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'OBSERVACIONES DEL ARBITRO',
                        style: GoogleFonts.bebasNeue(
                          fontSize: 14,
                          color: _S.gold,
                          letterSpacing: 1.5,
                        ),
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 4),
                  child: Text(
                    'Opcional — Notas sobre el partido, incidencias, etc.',
                    style: GoogleFonts.outfit(
                      fontSize: 12,
                      color: _S.textMuted,
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 14),
                  child: TextField(
                    controller: _observationsCtrl,
                    maxLines: 3,
                    style: GoogleFonts.outfit(
                      fontSize: 14,
                      color: _S.textPrimary,
                    ),
                    decoration: InputDecoration(
                      hintText: 'Escribe las observaciones aquí...',
                      hintStyle: GoogleFonts.outfit(
                        fontSize: 14,
                        color: _S.textMuted.withOpacity(0.5),
                      ),
                      filled: true,
                      fillColor: _S.surfaceDark,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: BorderSide(
                          color: _S.gold.withOpacity(0.2),
                        ),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: BorderSide(
                          color: Colors.white.withOpacity(0.06),
                        ),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: BorderSide(
                          color: _S.gold.withOpacity(0.4),
                        ),
                      ),
                      contentPadding: const EdgeInsets.all(12),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 60),
        ],
      ),
    );
  }

  Widget _buildStatsSummarySection(
    String teamName,
    List<_PlayerStats> players,
  ) {
    return Container(
      decoration: BoxDecoration(
        color: _S.cardDark,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withOpacity(0.06)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
            child: Text(
              teamName.toUpperCase(),
              style: GoogleFonts.bebasNeue(
                fontSize: 14,
                color: _S.gold,
                letterSpacing: 1.5,
              ),
            ),
          ),
          ...players.map((p) => Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                child: Row(
                  children: [
                    Text(
                      p.player.displayName,
                      style: GoogleFonts.outfit(
                        fontSize: 13,
                        color: _S.textPrimary,
                      ),
                    ),
                    const Spacer(),
                    if (p.goals > 0)
                      _statBadge('${p.goals}G', _S.neonGreen),
                    if (p.assists > 0)
                      _statBadge('${p.assists}A', _S.neonBlue),
                    if (p.yellowCards > 0)
                      _statBadge('${p.yellowCards}TA', _S.amber),
                    if (p.redCards > 0)
                      _statBadge('${p.redCards}TR', _S.error),
                  ],
                ),
              )),
          const SizedBox(height: 10),
        ],
      ),
    );
  }

  Widget _statBadge(String text, Color color) {
    return Container(
      margin: const EdgeInsets.only(left: 6),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        text,
        style: GoogleFonts.outfit(
          fontSize: 11,
          color: color,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  // ==================== Navigation Bar ====================

  Widget _buildNavigationBar() {
    final isLastStep = _currentStep == _totalSteps - 1;

    return Container(
      padding: EdgeInsets.fromLTRB(
        20,
        16,
        20,
        16 + MediaQuery.of(context).padding.bottom,
      ),
      decoration: BoxDecoration(
        color: _S.surfaceDark,
        border: Border(
          top: BorderSide(color: Colors.white.withOpacity(0.06)),
        ),
      ),
      child: Row(
        children: [
          if (_currentStep > 0)
            Expanded(
              child: OutlinedButton(
                onPressed: _saving ? null : _onBack,
                style: OutlinedButton.styleFrom(
                  foregroundColor: _S.textSecondary,
                  side: const BorderSide(color: _S.textMuted),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: Text(
                  'ANTERIOR',
                  style: GoogleFonts.bebasNeue(
                    fontSize: 14,
                    letterSpacing: 1,
                  ),
                ),
              ),
            ),
          if (_currentStep > 0) const SizedBox(width: 12),
          Expanded(
            flex: 2,
            child: ElevatedButton(
              onPressed: _saving
                  ? null
                  : isLastStep
                      ? _onSubmit
                      : _onNext,
              style: ElevatedButton.styleFrom(
                backgroundColor: isLastStep ? _S.neonGreen : _S.gold,
                foregroundColor: Colors.black,
                disabledBackgroundColor: _S.textMuted.withOpacity(0.3),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: _saving
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor:
                            AlwaysStoppedAnimation<Color>(Colors.black),
                      ),
                    )
                  : Text(
                      isLastStep ? 'FINALIZAR PARTIDO' : 'SIGUIENTE',
                      style: GoogleFonts.bebasNeue(
                        fontSize: 14,
                        letterSpacing: 1,
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  // ==================== Shared Helpers ====================

  Widget _buildTeamLogo(MatchTeamInfo? team, double size) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: _S.surfaceDark,
        borderRadius: BorderRadius.circular(size * 0.22),
        border: Border.all(color: _S.gold.withOpacity(0.2)),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(size * 0.2),
        child: team?.logo != null
            ? _buildLogoImage(team!.logo!, size)
            : Icon(Icons.shield, size: size * 0.5, color: _S.gold),
      ),
    );
  }

  Widget _buildLogoImage(String logoData, double size) {
    try {
      if (logoData.startsWith('data:image/')) {
        final base64Data = logoData.split(',')[1];
        final bytes = base64Decode(base64Data);
        return Image.memory(
          bytes,
          width: size,
          height: size,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) =>
              Icon(Icons.shield, size: size * 0.5, color: _S.gold),
        );
      } else {
        return Image.network(
          logoData,
          width: size,
          height: size,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) =>
              Icon(Icons.shield, size: size * 0.5, color: _S.gold),
        );
      }
    } catch (e) {
      return Icon(Icons.shield, size: size * 0.5, color: _S.gold);
    }
  }
}

// ==================== Player Stat Card Widget ====================

class _PlayerStatCard extends StatelessWidget {
  final _PlayerStats playerStats;
  final VoidCallback onChanged;

  const _PlayerStatCard({
    required this.playerStats,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final player = playerStats.player;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _S.cardDark,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: playerStats.hasAnyStats
              ? _S.gold.withOpacity(0.2)
              : Colors.white.withOpacity(0.04),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Player info row
          Row(
            children: [
              if (player.jerseyNumber != null)
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: _S.gold.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Center(
                    child: Text(
                      '${player.jerseyNumber}',
                      style: GoogleFonts.bebasNeue(
                        fontSize: 16,
                        color: _S.gold,
                      ),
                    ),
                  ),
                ),
              if (player.jerseyNumber != null) const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      player.name,
                      style: GoogleFonts.outfit(
                        fontSize: 14,
                        color: _S.textPrimary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    if (player.hasPosition)
                      Text(
                        player.positionDisplay,
                        style: GoogleFonts.outfit(
                          fontSize: 11,
                          color: _S.textMuted,
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Stats counters row
          Row(
            children: [
              _StatCounter(
                label: 'GOL',
                value: playerStats.goals,
                color: _S.neonGreen,
                icon: Icons.sports_soccer,
                onIncrement: () {
                  playerStats.goals++;
                  onChanged();
                },
                onDecrement: () {
                  if (playerStats.goals > 0) {
                    playerStats.goals--;
                    onChanged();
                  }
                },
              ),
              const SizedBox(width: 6),
              _StatCounter(
                label: 'ASIS',
                value: playerStats.assists,
                color: _S.neonBlue,
                icon: Icons.handshake_outlined,
                onIncrement: () {
                  playerStats.assists++;
                  onChanged();
                },
                onDecrement: () {
                  if (playerStats.assists > 0) {
                    playerStats.assists--;
                    onChanged();
                  }
                },
              ),
              const SizedBox(width: 6),
              _StatCounter(
                label: 'TA',
                value: playerStats.yellowCards,
                color: _S.amber,
                icon: Icons.square,
                onIncrement: () {
                  playerStats.yellowCards++;
                  onChanged();
                },
                onDecrement: () {
                  if (playerStats.yellowCards > 0) {
                    playerStats.yellowCards--;
                    onChanged();
                  }
                },
              ),
              const SizedBox(width: 6),
              _StatCounter(
                label: 'TR',
                value: playerStats.redCards,
                color: _S.error,
                icon: Icons.square,
                onIncrement: () {
                  playerStats.redCards++;
                  onChanged();
                },
                onDecrement: () {
                  if (playerStats.redCards > 0) {
                    playerStats.redCards--;
                    onChanged();
                  }
                },
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ==================== Stat Counter Widget ====================

class _StatCounter extends StatelessWidget {
  final String label;
  final int value;
  final Color color;
  final IconData icon;
  final VoidCallback onIncrement;
  final VoidCallback onDecrement;

  const _StatCounter({
    required this.label,
    required this.value,
    required this.color,
    required this.icon,
    required this.onIncrement,
    required this.onDecrement,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 6),
        decoration: BoxDecoration(
          color: value > 0
              ? color.withOpacity(0.08)
              : Colors.white.withOpacity(0.03),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: value > 0
                ? color.withOpacity(0.25)
                : Colors.white.withOpacity(0.04),
          ),
        ),
        child: Column(
          children: [
            Text(
              label,
              style: GoogleFonts.bebasNeue(
                fontSize: 10,
                color: value > 0 ? color : _S.textMuted,
                letterSpacing: 1,
              ),
            ),
            const SizedBox(height: 2),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _counterButton(
                  Icons.remove,
                  onDecrement,
                  enabled: value > 0,
                ),
                SizedBox(
                  width: 24,
                  child: Text(
                    '$value',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.bebasNeue(
                      fontSize: 20,
                      color: value > 0 ? color : _S.textMuted,
                    ),
                  ),
                ),
                _counterButton(Icons.add, onIncrement, enabled: true),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _counterButton(
    IconData icon,
    VoidCallback onTap, {
    required bool enabled,
  }) {
    return GestureDetector(
      onTap: () {
        if (enabled) {
          HapticFeedback.lightImpact();
          onTap();
        }
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
        child: Icon(
          icon,
          size: 16,
          color: enabled ? _S.textSecondary : _S.textMuted.withOpacity(0.3),
        ),
      ),
    );
  }
}
