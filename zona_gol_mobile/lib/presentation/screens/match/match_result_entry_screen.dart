import 'dart:convert';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/di/injection.dart';
import '../../../domain/entities/match_entity.dart';
import '../../../domain/entities/player_entity.dart';
import '../../../domain/usecases/get_players_by_team_usecase.dart';
import '../../../domain/usecases/update_match_result_usecase.dart';
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
  static const Color success = Color(0xFF10B981);
  static const Color error = Color(0xFFEF4444);
  static const Color textPrimary = Color(0xFFFAFAFA);
  static const Color textSecondary = Color(0xFF9CA3AF);
  static const Color textMuted = Color(0xFF6B7280);
}

enum _Side { home, away }

/// Editable goal of the form. The player is picked from the roster of [side].
class _FormGoal {
  final _Side side;
  final String playerId;
  final int minute;
  final GoalType goalType;
  final String? assistPlayerId;

  const _FormGoal({
    required this.side,
    required this.playerId,
    required this.minute,
    this.goalType = GoalType.normal,
    this.assistPlayerId,
  });
}

/// Editable card of the form
class _FormCard {
  final _Side side;
  final String playerId;
  final int minute;
  final CardType cardType;

  const _FormCard({
    required this.side,
    required this.playerId,
    required this.minute,
    required this.cardType,
  });
}

/// Result entry: score, then goals and cards (with minute, type and
/// optional assist) for each team, then confirmation with observations.
/// Same model as the web result form; the server derives player stats.
class MatchResultEntryScreen extends StatefulWidget {
  /// Match with its stored goals and cards (from GET /matches/{id})
  final MatchEntity match;
  final MatchDetailBloc matchDetailBloc;
  final String? initialObservations;

  const MatchResultEntryScreen({
    super.key,
    required this.match,
    required this.matchDetailBloc,
    this.initialObservations,
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

  // Step 1 & 2: Events
  List<PlayerEntity> _homePlayers = [];
  List<PlayerEntity> _awayPlayers = [];
  final List<_FormGoal> _goals = [];
  final List<_FormCard> _cards = [];
  bool _loadingPlayers = true;
  String? _loadError;

  // Step 3: Observations
  late final TextEditingController _observationsCtrl;

  // Saving
  bool _saving = false;

  MatchEntity get _match => widget.match;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    _homeScoreCtrl = TextEditingController(
      text: _match.homeScore?.toString() ?? '',
    );
    _awayScoreCtrl = TextEditingController(
      text: _match.awayScore?.toString() ?? '',
    );
    _observationsCtrl =
        TextEditingController(text: widget.initialObservations ?? '');
    _prefillEvents();
    _loadPlayers();
  }

  /// Stored goals and cards of a finished match (the API replaces them all)
  void _prefillEvents() {
    _Side sideOf(String teamId) =>
        teamId == _match.homeTeamId ? _Side.home : _Side.away;
    for (final g in _match.goals) {
      _goals.add(_FormGoal(
        side: sideOf(g.teamId),
        playerId: g.playerId,
        minute: g.minute,
        goalType: g.goalType,
        assistPlayerId: g.assistPlayerId,
      ));
    }
    for (final c in _match.cards) {
      _cards.add(_FormCard(
        side: sideOf(c.teamId),
        playerId: c.playerId,
        minute: c.minute,
        cardType: c.cardType,
      ));
    }
  }

  Future<void> _loadPlayers() async {
    setState(() {
      _loadingPlayers = true;
      _loadError = null;
    });

    final useCase = sl<GetPlayersByTeamUseCase>();
    final results = await Future.wait([
      useCase(GetPlayersByTeamParams(teamId: _match.homeTeamId)),
      useCase(GetPlayersByTeamParams(teamId: _match.awayTeamId)),
    ]);

    if (!mounted) return;

    String? error;
    List<PlayerEntity> homePlayers = [];
    List<PlayerEntity> awayPlayers = [];
    results[0].fold((f) => error = f.message, (p) => homePlayers = [...p]);
    results[1].fold((f) => error ??= f.message, (p) => awayPlayers = [...p]);

    int byJersey(PlayerEntity a, PlayerEntity b) =>
        (a.jerseyNumber ?? 999).compareTo(b.jerseyNumber ?? 999);
    homePlayers.sort(byJersey);
    awayPlayers.sort(byJersey);

    setState(() {
      _homePlayers = homePlayers;
      _awayPlayers = awayPlayers;
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

  String _teamIdOf(_Side side) =>
      side == _Side.home ? _match.homeTeamId : _match.awayTeamId;

  String _teamNameOf(_Side side) => side == _Side.home
      ? (_match.homeTeam?.name ?? 'Local')
      : (_match.awayTeam?.name ?? 'Visitante');

  List<PlayerEntity> _rosterOf(_Side side) =>
      side == _Side.home ? _homePlayers : _awayPlayers;

  /// Players offered in the pickers: active ones plus any already used
  List<PlayerEntity> _pickablePlayers(_Side side, {String? keep}) =>
      _rosterOf(side).where((p) => p.isActive || p.id == keep).toList();

  String _playerLabel(_Side side, String playerId) {
    final player = _rosterOf(side).where((p) => p.id == playerId).firstOrNull;
    if (player != null) return player.displayName;
    final stored = _match.goals.where((g) => g.playerId == playerId).firstOrNull;
    if (stored?.playerName != null) return stored!.playerName!;
    final storedCard =
        _match.cards.where((c) => c.playerId == playerId).firstOrNull;
    return storedCard?.playerName ?? 'Jugador';
  }

  MatchResultInput _buildResult() {
    final observations = _observationsCtrl.text.trim();
    return MatchResultInput(
      homeScore: _homeScore,
      awayScore: _awayScore,
      goals: _goals
          .map((g) => MatchGoal(
                playerId: g.playerId,
                teamId: _teamIdOf(g.side),
                minute: g.minute,
                goalType: g.goalType,
                assistPlayerId: g.assistPlayerId,
              ))
          .toList(),
      cards: _cards
          .map((c) => MatchCard(
                playerId: c.playerId,
                teamId: _teamIdOf(c.side),
                cardType: c.cardType,
                minute: c.minute,
              ))
          .toList(),
      observations: observations.isEmpty ? null : observations,
    );
  }

  /// Goals that count for [side] (an own goal counts for the rival)
  int _creditedGoals(_Side side) => UpdateMatchResultUseCase.creditedGoals(
        _buildResult().goals,
        _teamIdOf(side),
        _teamIdOf(side == _Side.home ? _Side.away : _Side.home),
      );

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
      if (_homeScoreCtrl.text.isEmpty || _awayScoreCtrl.text.isEmpty) {
        _showError('Ingresa el marcador de ambos equipos');
        return;
      }
    } else if (_currentStep == 2) {
      if (_creditedGoals(_Side.home) > _homeScore ||
          _creditedGoals(_Side.away) > _awayScore) {
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
              'Hay más goles registrados que el marcador del equipo. Un autogol cuenta para el rival.',
              textAlign: TextAlign.center,
              style: GoogleFonts.outfit(
                fontSize: 14,
                color: _S.textSecondary,
              ),
            ),
            const SizedBox(height: 20),
            _buildMismatchRow(
              _teamNameOf(_Side.home),
              _homeScore,
              _creditedGoals(_Side.home),
            ),
            const SizedBox(height: 8),
            _buildMismatchRow(
              _teamNameOf(_Side.away),
              _awayScore,
              _creditedGoals(_Side.away),
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
    final result = _buildResult();
    final error = UpdateMatchResultUseCase.validate(
      result,
      _match.homeTeamId,
      _match.awayTeamId,
    );
    if (error != null) {
      _showError(error);
      return;
    }

    setState(() => _saving = true);
    widget.matchDetailBloc.add(SubmitMatchResultEvent(
      match: _match,
      result: result,
    ));
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<MatchDetailBloc, MatchDetailState>(
      bloc: widget.matchDetailBloc,
      listener: (context, state) {
        if (state is MatchResultSaved) {
          Navigator.pop(context, true); // return true = saved
        } else if (state is MatchResultError) {
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
                              _buildEventsStep(_Side.home),
                              _buildEventsStep(_Side.away),
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
            _match.roundText,
            style: GoogleFonts.outfit(fontSize: 13, color: _S.textMuted),
          ),
          const SizedBox(height: 40),
          Row(
            children: [
              Expanded(
                child: _buildTeamScoreColumn(
                  _match.homeTeam,
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
                  _match.awayTeam,
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

  // ==================== Step 1 & 2: Goals and cards ====================

  Widget _buildEventsStep(_Side side) {
    final expectedScore = side == _Side.home ? _homeScore : _awayScore;
    final currentGoals = _creditedGoals(side);
    final goalsOk = currentGoals == expectedScore;
    final exceeded = currentGoals > expectedScore;
    final color = goalsOk ? _S.neonGreen : (exceeded ? _S.error : _S.amber);

    final goals = _goals.asMap().entries.where((e) => e.value.side == side).toList()
      ..sort((a, b) => a.value.minute.compareTo(b.value.minute));
    final cards = _cards.asMap().entries.where((e) => e.value.side == side).toList()
      ..sort((a, b) => a.value.minute.compareTo(b.value.minute));

    return Column(
      children: [
        // Goal counter bar
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          color: _S.cardDark,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.sports_soccer, size: 18, color: color),
              const SizedBox(width: 8),
              Text(
                'GOLES: $currentGoals / $expectedScore',
                style: GoogleFonts.bebasNeue(
                  fontSize: 16,
                  color: color,
                  letterSpacing: 1.5,
                ),
              ),
              if (goalsOk) ...[
                const SizedBox(width: 8),
                const Icon(Icons.check_circle, size: 16, color: _S.neonGreen),
              ],
            ],
          ),
        ),
        Expanded(
          child: _rosterOf(side).isEmpty
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
              : ListView(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  children: [
                    _buildEventsHeader('GOLES', Icons.sports_soccer, _S.neonGreen),
                    ...goals.map((e) => _buildGoalTile(e.key, e.value)),
                    _buildAddButton(
                      'AGREGAR GOL',
                      _S.neonGreen,
                      () => _editGoal(side),
                    ),
                    const SizedBox(height: 20),
                    _buildEventsHeader('TARJETAS', Icons.square, _S.amber),
                    ...cards.map((e) => _buildCardTile(e.key, e.value)),
                    _buildAddButton(
                      'AGREGAR TARJETA',
                      _S.amber,
                      () => _editCard(side),
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
        ),
      ],
    );
  }

  Widget _buildEventsHeader(String title, IconData icon, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 8),
          Text(
            title,
            style: GoogleFonts.bebasNeue(
              fontSize: 15,
              color: color,
              letterSpacing: 1.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAddButton(String label, Color color, VoidCallback onTap) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: color.withOpacity(0.06),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.add, size: 18, color: color),
            const SizedBox(width: 6),
            Text(
              label,
              style: GoogleFonts.bebasNeue(
                fontSize: 14,
                color: color,
                letterSpacing: 1,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEventTile({
    required int minute,
    required String title,
    String? subtitle,
    required Widget badge,
    required VoidCallback onEdit,
    required VoidCallback onDelete,
  }) {
    return GestureDetector(
      onTap: onEdit,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: _S.cardDark,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white.withOpacity(0.06)),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 32,
              decoration: BoxDecoration(
                color: _S.gold.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Center(
                child: Text(
                  "$minute'",
                  style: GoogleFonts.bebasNeue(fontSize: 16, color: _S.gold),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.outfit(
                      fontSize: 14,
                      color: _S.textPrimary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (subtitle != null)
                    Text(
                      subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.outfit(fontSize: 11, color: _S.textMuted),
                    ),
                ],
              ),
            ),
            badge,
            IconButton(
              onPressed: onDelete,
              icon: const Icon(Icons.delete_outline, size: 20, color: _S.textMuted),
              visualDensity: VisualDensity.compact,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGoalTile(int index, _FormGoal goal) {
    final assist = goal.assistPlayerId == null
        ? null
        : 'Asistencia: ${_playerLabel(goal.side, goal.assistPlayerId!)}';
    return _buildEventTile(
      minute: goal.minute,
      title: _playerLabel(goal.side, goal.playerId),
      subtitle: assist,
      badge: _statBadge(
        goal.goalType.displayText,
        goal.goalType == GoalType.ownGoal ? _S.error : _S.neonGreen,
      ),
      onEdit: () => _editGoal(goal.side, index: index),
      onDelete: () => setState(() => _goals.removeAt(index)),
    );
  }

  Widget _buildCardTile(int index, _FormCard card) {
    return _buildEventTile(
      minute: card.minute,
      title: _playerLabel(card.side, card.playerId),
      badge: _statBadge(
        card.cardType.displayText,
        card.cardType == CardType.red ? _S.error : _S.amber,
      ),
      onEdit: () => _editCard(card.side, index: index),
      onDelete: () => setState(() => _cards.removeAt(index)),
    );
  }

  Future<void> _editGoal(_Side side, {int? index}) async {
    final current = index != null ? _goals[index] : null;
    final result = await showModalBottomSheet<_FormGoal>(
      context: context,
      isScrollControlled: true,
      backgroundColor: _S.cardDark,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _EventSheet(
        title: current == null ? 'AGREGAR GOL' : 'EDITAR GOL',
        teamName: _teamNameOf(side),
        players: _pickablePlayers(side, keep: current?.playerId),
        assistPlayers: _pickablePlayers(side, keep: current?.assistPlayerId),
        initialPlayerId: current?.playerId,
        initialMinute: current?.minute,
        initialGoalType: current?.goalType ?? GoalType.normal,
        initialAssistId: current?.assistPlayerId,
        isGoal: true,
        onGoal: (playerId, minute, type, assistId) => _FormGoal(
          side: side,
          playerId: playerId,
          minute: minute,
          goalType: type,
          assistPlayerId: assistId,
        ),
      ),
    );
    if (result == null || !mounted) return;
    setState(() {
      if (index != null) {
        _goals[index] = result;
      } else {
        _goals.add(result);
      }
    });
  }

  Future<void> _editCard(_Side side, {int? index}) async {
    final current = index != null ? _cards[index] : null;
    final result = await showModalBottomSheet<_FormCard>(
      context: context,
      isScrollControlled: true,
      backgroundColor: _S.cardDark,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _EventSheet(
        title: current == null ? 'AGREGAR TARJETA' : 'EDITAR TARJETA',
        teamName: _teamNameOf(side),
        players: _pickablePlayers(side, keep: current?.playerId),
        initialPlayerId: current?.playerId,
        initialMinute: current?.minute,
        initialCardType: current?.cardType ?? CardType.yellow,
        isGoal: false,
        onCard: (playerId, minute, type) => _FormCard(
          side: side,
          playerId: playerId,
          minute: minute,
          cardType: type,
        ),
      ),
    );
    if (result == null || !mounted) return;
    setState(() {
      if (index != null) {
        _cards[index] = result;
      } else {
        _cards.add(result);
      }
    });
  }

  // ==================== Step 3: Confirm ====================

  Widget _buildConfirmStep() {
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
                          _buildTeamLogo(_match.homeTeam, 48),
                          const SizedBox(height: 6),
                          Text(
                            _match.homeTeam?.name ?? 'Local',
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
                          _buildTeamLogo(_match.awayTeam, 48),
                          const SizedBox(height: 6),
                          Text(
                            _match.awayTeam?.name ?? 'Visitante',
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

          // Events summary
          for (final side in _Side.values)
            if (_goals.any((g) => g.side == side) ||
                _cards.any((c) => c.side == side)) ...[
              _buildEventsSummarySection(side),
              const SizedBox(height: 12),
            ],

          if (_goals.isEmpty && _cards.isEmpty)
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
                      'No se registraron goles ni tarjetas.',
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

  Widget _buildEventsSummarySection(_Side side) {
    final goals = _goals.where((g) => g.side == side).toList()
      ..sort((a, b) => a.minute.compareTo(b.minute));
    final cards = _cards.where((c) => c.side == side).toList()
      ..sort((a, b) => a.minute.compareTo(b.minute));

    Widget row(int minute, String name, Widget badge) => Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          child: Row(
            children: [
              SizedBox(
                width: 36,
                child: Text(
                  "$minute'",
                  style: GoogleFonts.bebasNeue(fontSize: 14, color: _S.gold),
                ),
              ),
              Expanded(
                child: Text(
                  name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.outfit(fontSize: 13, color: _S.textPrimary),
                ),
              ),
              badge,
            ],
          ),
        );

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
              _teamNameOf(side).toUpperCase(),
              style: GoogleFonts.bebasNeue(
                fontSize: 14,
                color: _S.gold,
                letterSpacing: 1.5,
              ),
            ),
          ),
          ...goals.map((g) => row(
                g.minute,
                _playerLabel(side, g.playerId),
                _statBadge(
                  g.goalType == GoalType.ownGoal ? 'AUTOGOL' : 'GOL',
                  g.goalType == GoalType.ownGoal ? _S.error : _S.neonGreen,
                ),
              )),
          ...cards.map((c) => row(
                c.minute,
                _playerLabel(side, c.playerId),
                _statBadge(
                  c.cardType == CardType.red ? 'TR' : 'TA',
                  c.cardType == CardType.red ? _S.error : _S.amber,
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

// ==================== Event Sheet ====================

/// Bottom sheet to add or edit a goal or a card
class _EventSheet extends StatefulWidget {
  final String title;
  final String teamName;
  final List<PlayerEntity> players;
  final List<PlayerEntity> assistPlayers;
  final String? initialPlayerId;
  final int? initialMinute;
  final GoalType initialGoalType;
  final String? initialAssistId;
  final CardType initialCardType;
  final bool isGoal;
  final _FormGoal Function(String playerId, int minute, GoalType type, String? assistId)? onGoal;
  final _FormCard Function(String playerId, int minute, CardType type)? onCard;

  const _EventSheet({
    required this.title,
    required this.teamName,
    required this.players,
    this.assistPlayers = const [],
    this.initialPlayerId,
    this.initialMinute,
    this.initialGoalType = GoalType.normal,
    this.initialAssistId,
    this.initialCardType = CardType.yellow,
    required this.isGoal,
    this.onGoal,
    this.onCard,
  });

  @override
  State<_EventSheet> createState() => _EventSheetState();
}

class _EventSheetState extends State<_EventSheet> {
  String? _playerId;
  String? _assistId;
  late GoalType _goalType;
  late CardType _cardType;
  late final TextEditingController _minuteCtrl;
  String? _error;

  @override
  void initState() {
    super.initState();
    _playerId = widget.initialPlayerId;
    _assistId = widget.initialAssistId;
    _goalType = widget.initialGoalType;
    _cardType = widget.initialCardType;
    _minuteCtrl = TextEditingController(
      text: widget.initialMinute?.toString() ?? '',
    );
  }

  @override
  void dispose() {
    _minuteCtrl.dispose();
    super.dispose();
  }

  void _save() {
    final minute = int.tryParse(_minuteCtrl.text);
    if (_playerId == null) {
      setState(() => _error = 'Selecciona un jugador');
      return;
    }
    if (minute == null || minute < 1 || minute > 120) {
      setState(() => _error = 'El minuto debe estar entre 1 y 120');
      return;
    }
    if (widget.isGoal) {
      final assist = _assistId == _playerId ? null : _assistId;
      Navigator.pop(context, widget.onGoal!(_playerId!, minute, _goalType, assist));
    } else {
      Navigator.pop(context, widget.onCard!(_playerId!, minute, _cardType));
    }
  }

  InputDecoration _decoration(String label) => InputDecoration(
        labelText: label,
        labelStyle: GoogleFonts.outfit(fontSize: 13, color: _S.textMuted),
        filled: true,
        fillColor: _S.surfaceDark,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: Colors.white.withOpacity(0.06)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: Colors.white.withOpacity(0.06)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: _S.gold.withOpacity(0.4)),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      );

  Widget _choice(String label, bool selected, Color color, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? color.withOpacity(0.2) : Colors.white.withOpacity(0.03),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: selected ? color.withOpacity(0.6) : Colors.white.withOpacity(0.06),
          ),
        ),
        child: Text(
          label,
          style: GoogleFonts.outfit(
            fontSize: 13,
            color: selected ? color : _S.textSecondary,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final dropdownStyle = GoogleFonts.outfit(fontSize: 14, color: _S.textPrimary);
    final assistOptions =
        widget.assistPlayers.where((p) => p.id != _playerId).toList();

    return Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        20,
        20,
        20 + MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              widget.title,
              textAlign: TextAlign.center,
              style: GoogleFonts.bebasNeue(
                fontSize: 22,
                color: _S.gold,
                letterSpacing: 2,
              ),
            ),
            Text(
              widget.teamName,
              textAlign: TextAlign.center,
              style: GoogleFonts.outfit(fontSize: 13, color: _S.textMuted),
            ),
            const SizedBox(height: 20),
            DropdownButtonFormField<String>(
              initialValue: widget.players.any((p) => p.id == _playerId) ? _playerId : null,
              isExpanded: true,
              dropdownColor: _S.cardDark,
              style: dropdownStyle,
              decoration: _decoration('Jugador'),
              items: widget.players
                  .map((p) => DropdownMenuItem(
                        value: p.id,
                        child: Text(p.displayName, overflow: TextOverflow.ellipsis),
                      ))
                  .toList(),
              onChanged: (v) => setState(() {
                _playerId = v;
                _error = null;
              }),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _minuteCtrl,
              keyboardType: TextInputType.number,
              style: dropdownStyle,
              inputFormatters: [
                FilteringTextInputFormatter.digitsOnly,
                LengthLimitingTextInputFormatter(3),
              ],
              decoration: _decoration('Minuto (1-120)'),
              onChanged: (_) => setState(() => _error = null),
            ),
            const SizedBox(height: 16),
            if (widget.isGoal) ...[
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: GoalType.values
                    .map((t) => _choice(
                          t.displayText,
                          _goalType == t,
                          t == GoalType.ownGoal ? _S.error : _S.neonGreen,
                          () => setState(() => _goalType = t),
                        ))
                    .toList(),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String?>(
                key: ValueKey(_playerId),
                initialValue: assistOptions.any((p) => p.id == _assistId) ? _assistId : null,
                isExpanded: true,
                dropdownColor: _S.cardDark,
                style: dropdownStyle,
                decoration: _decoration('Asistencia (opcional)'),
                items: [
                  const DropdownMenuItem<String?>(
                    value: null,
                    child: Text('Sin asistencia'),
                  ),
                  ...assistOptions.map((p) => DropdownMenuItem<String?>(
                        value: p.id,
                        child: Text(p.displayName, overflow: TextOverflow.ellipsis),
                      )),
                ],
                onChanged: (v) => setState(() => _assistId = v),
              ),
            ] else
              Row(
                children: [
                  _choice('Amarilla', _cardType == CardType.yellow, _S.amber,
                      () => setState(() => _cardType = CardType.yellow)),
                  const SizedBox(width: 8),
                  _choice('Roja', _cardType == CardType.red, _S.error,
                      () => setState(() => _cardType = CardType.red)),
                ],
              ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(
                _error!,
                style: GoogleFonts.outfit(fontSize: 13, color: _S.error),
              ),
            ],
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _save,
              style: ElevatedButton.styleFrom(
                backgroundColor: _S.gold,
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: Text(
                'GUARDAR',
                style: GoogleFonts.bebasNeue(fontSize: 16, letterSpacing: 1.5),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
