import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import '../../../core/di/injection.dart';
import '../../../core/utils/fixture_config.dart';
import '../../../domain/entities/match_entity.dart';
import '../../../domain/entities/team_entity.dart';
import '../../../domain/entities/tournament_entity.dart';
import '../../../domain/entities/user_entity.dart';
import '../../bloc/match/match_bloc.dart';
import '../../bloc/match/match_event.dart';
import '../../bloc/match/match_state.dart';
import '../../bloc/team/team_bloc.dart';
import '../../bloc/team/team_event.dart';
import '../../bloc/team/team_state.dart';
import '../../bloc/tournament/tournament_bloc.dart';
import '../../bloc/tournament/tournament_event.dart';
import '../../bloc/tournament/tournament_state.dart';
import 'fixture_preview_screen.dart';
import 'manual_round_editor_screen.dart';

/// Stadium Nights Design System
class _SN {
  static const Color backgroundDark = Color(0xFF050508);
  static const Color surfaceDark = Color(0xFF0A0A0F);
  static const Color cardDark = Color(0xFF12121A);
  static const Color amber = Color(0xFFF59E0B);
  static const Color neonGreen = Color(0xFF00FF7F);
  static const Color purple = Color(0xFF8B5CF6);
  static const Color error = Color(0xFFEF4444);
  static const Color textPrimary = Color(0xFFFAFAFA);
  static const Color textSecondary = Color(0xFF9CA3AF);
  static const Color textMuted = Color(0xFF6B7280);
}

/// Fixture Generator Screen
/// Two-step flow: Configure -> Generate -> Preview -> Save
class FixtureGeneratorScreen extends StatelessWidget {
  final UserEntity user;

  const FixtureGeneratorScreen({super.key, required this.user});

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(
          create: (_) {
            final bloc = sl<TournamentBloc>();
            if (user.leagueId != null) {
              bloc.add(LoadTournamentsByLeagueEvent(
                leagueId: user.leagueId!,
                onlyActive: true,
              ));
            }
            return bloc;
          },
        ),
        BlocProvider(create: (_) => sl<TeamBloc>()),
        BlocProvider(create: (_) => sl<MatchBloc>()),
      ],
      child: _FixtureGeneratorView(user: user),
    );
  }
}

class _FixtureGeneratorView extends StatefulWidget {
  final UserEntity user;
  const _FixtureGeneratorView({required this.user});

  @override
  State<_FixtureGeneratorView> createState() => _FixtureGeneratorViewState();
}

enum _FixtureMode { auto, manual }
enum _Algorithm { cpSat, traditional }

class _FixtureGeneratorViewState extends State<_FixtureGeneratorView> {
  // Mode toggle
  _FixtureMode _mode = _FixtureMode.auto;

  // Algorithm selection (auto mode)
  _Algorithm _algorithm = _Algorithm.traditional;

  // Selected tournament
  TournamentEntity? _selectedTournament;
  List<TeamEntity> _teams = [];
  bool _teamsLoading = false;

  // For manual mode: existing matches loaded from DB
  List<MatchEntity> _existingMatches = [];
  bool _existingMatchesLoading = false;
  Set<int> _existingRounds = {};

  // Configuration
  DateTime _startDate = DateTime.now();
  DateTime _endDate = DateTime.now().add(const Duration(days: 90));
  final Set<int> _matchDays = {6, 7}; // Sat, Sun
  TimeOfDay _startTime = const TimeOfDay(hour: 8, minute: 0);
  TimeOfDay? _endTime;
  int _fieldsAvailable = 1;
  bool _doubleRound = false;
  int _halfTime = 25;
  int _breakTime = 10;
  int _breakBetweenMatches = 5;

  // Day labels in Spanish
  static const _dayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light.copyWith(
        statusBarColor: Colors.transparent,
        systemNavigationBarColor: _SN.backgroundDark,
      ),
      child: Scaffold(
        backgroundColor: _SN.backgroundDark,
        appBar: _buildAppBar(context),
        body: MultiBlocListener(
          listeners: [
            BlocListener<TeamBloc, TeamState>(
              listener: (context, state) {
                if (state is TeamsLoaded) {
                  setState(() {
                    _teams = state.teams;
                    _teamsLoading = false;
                  });
                } else if (state is TeamLoading) {
                  setState(() => _teamsLoading = true);
                } else if (state is TeamError) {
                  setState(() => _teamsLoading = false);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(state.message),
                      backgroundColor: _SN.error,
                    ),
                  );
                }
              },
            ),
            BlocListener<MatchBloc, MatchState>(
              listener: (context, state) {
                if (state is FixturesGenerated) {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => BlocProvider.value(
                        value: context.read<MatchBloc>(),
                        child: FixturePreviewScreen(
                          fixtures: state.fixtures,
                          totalRounds: state.totalRounds,
                          totalMatches: state.totalMatches,
                          tournamentName: _selectedTournament?.name ?? '',
                        ),
                      ),
                    ),
                  );
                } else if (state is MatchesLoaded) {
                  // Used by manual mode to load existing matches
                  setState(() {
                    _existingMatches = state.matches;
                    _existingMatchesLoading = false;
                    _existingRounds = state.matches
                        .where((m) => m.round != null)
                        .map((m) => m.round!)
                        .toSet();
                  });
                } else if (state is MatchError) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(state.message),
                      backgroundColor: _SN.error,
                    ),
                  );
                }
              },
            ),
          ],
          child: _buildBody(context),
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(BuildContext context) {
    return AppBar(
      backgroundColor: _SN.surfaceDark,
      foregroundColor: _SN.textPrimary,
      elevation: 0,
      leading: IconButton(
        icon: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.3),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: _SN.purple.withOpacity(0.3)),
          ),
          child: Icon(Icons.arrow_back, color: _SN.purple, size: 18),
        ),
        onPressed: () => Navigator.pop(context),
      ),
      title: Text(
        'GENERAR FIXTURE',
        style: GoogleFonts.bebasNeue(
          fontSize: 22,
          color: _SN.textPrimary,
          letterSpacing: 2,
        ),
      ),
      centerTitle: true,
    );
  }

  Widget _buildBody(BuildContext context) {
    return BlocBuilder<MatchBloc, MatchState>(
      builder: (context, matchState) {
        if (matchState is MatchLoading) {
          String loadingText;
          if (_mode == _FixtureMode.manual) {
            loadingText = 'CARGANDO PARTIDOS';
          } else if (_algorithm == _Algorithm.cpSat) {
            loadingText = 'CALCULANDO CON CP-SAT';
          } else {
            loadingText = 'GENERANDO FIXTURE';
          }
          return _buildLoadingState(loadingText);
        }

        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Mode toggle
              _buildModeToggle(),
              const SizedBox(height: 20),

              _buildSectionHeader('TORNEO', Icons.emoji_events),
              const SizedBox(height: 12),
              _buildTournamentSelector(context),
              const SizedBox(height: 24),

              if (_selectedTournament != null) ...[
                // Teams info
                _buildTeamsInfo(),
                const SizedBox(height: 24),

                if (_mode == _FixtureMode.auto) ...[
                  // AUTO MODE: algorithm selection + configuration form
                  _buildSectionHeader('ALGORITMO', Icons.auto_awesome),
                  const SizedBox(height: 12),
                  _buildAlgorithmToggle(),
                  const SizedBox(height: 24),

                  _buildSectionHeader('FECHAS', Icons.date_range),
                  const SizedBox(height: 12),
                  _buildDatePickers(context),
                  const SizedBox(height: 24),

                  _buildSectionHeader('DÍAS DE PARTIDO', Icons.calendar_today),
                  const SizedBox(height: 12),
                  _buildDaySelector(),
                  const SizedBox(height: 24),

                  _buildSectionHeader('HORARIOS', Icons.access_time),
                  const SizedBox(height: 12),
                  _buildTimePickers(context),
                  const SizedBox(height: 24),

                  _buildSectionHeader('CANCHAS', Icons.stadium),
                  const SizedBox(height: 12),
                  _buildFieldsCounter(),
                  const SizedBox(height: 24),

                  _buildSectionHeader('DURACIÓN', Icons.timer),
                  const SizedBox(height: 12),
                  _buildDurationSliders(),
                  const SizedBox(height: 24),

                  _buildSectionHeader('FORMATO', Icons.repeat),
                  const SizedBox(height: 12),
                  _buildDoubleRoundToggle(),
                  const SizedBox(height: 24),

                  // Summary card
                  _buildSummaryCard(),
                  const SizedBox(height: 24),

                  // Generate button
                  _buildGenerateButton(context),
                  const SizedBox(height: 32),
                ] else ...[
                  // MANUAL MODE: create/edit round options
                  _buildManualModeContent(context),
                  const SizedBox(height: 32),
                ],
              ],
            ],
          ),
        );
      },
    );
  }

  Widget _buildModeToggle() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: _SN.cardDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _SN.purple.withOpacity(0.2)),
      ),
      child: Row(
        children: [
          Expanded(
            child: _buildModeButton(
              label: 'AUTOMÁTICO',
              icon: Icons.auto_awesome,
              isSelected: _mode == _FixtureMode.auto,
              onTap: () => setState(() => _mode = _FixtureMode.auto),
            ),
          ),
          Expanded(
            child: _buildModeButton(
              label: 'MANUAL',
              icon: Icons.edit_note,
              isSelected: _mode == _FixtureMode.manual,
              onTap: () {
                setState(() => _mode = _FixtureMode.manual);
                // Load existing matches for the selected tournament
                if (_selectedTournament != null && _existingMatches.isEmpty) {
                  _loadExistingMatches(context);
                }
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildModeButton({
    required String label,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? _SN.purple : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 16,
              color: isSelected ? Colors.white : _SN.textMuted,
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: GoogleFonts.bebasNeue(
                fontSize: 14,
                color: isSelected ? Colors.white : _SN.textMuted,
                letterSpacing: 1,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _loadExistingMatches(BuildContext context) {
    if (_selectedTournament == null) return;
    setState(() => _existingMatchesLoading = true);
    context.read<MatchBloc>().add(
      LoadMatchesByTournamentEvent(tournamentId: _selectedTournament!.id),
    );
  }

  Widget _buildManualModeContent(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Create new round button
        _buildSectionHeader('CREAR JORNADA', Icons.add_circle_outline),
        const SizedBox(height: 12),
        _buildCreateNewRoundButton(context),
        const SizedBox(height: 24),

        // Edit existing round section
        if (_existingMatchesLoading) ...[
          _buildSectionHeader('JORNADAS EXISTENTES', Icons.edit_note),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: _SN.cardDark,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(_SN.purple),
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  'Cargando jornadas...',
                  style: GoogleFonts.outfit(
                    fontSize: 14,
                    color: _SN.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ] else if (_existingRounds.isNotEmpty) ...[
          _buildSectionHeader('EDITAR JORNADA', Icons.edit_note),
          const SizedBox(height: 12),
          _buildExistingRoundsList(context),
        ] else ...[
          _buildSectionHeader('JORNADAS EXISTENTES', Icons.edit_note),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: _SN.cardDark,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: _SN.purple.withOpacity(0.15)),
            ),
            child: Row(
              children: [
                Icon(Icons.info_outline, color: _SN.textMuted, size: 20),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'No hay jornadas creadas aún',
                    style: GoogleFonts.outfit(
                      fontSize: 14,
                      color: _SN.textSecondary,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildCreateNewRoundButton(BuildContext context) {
    final nextRound = _existingRounds.isEmpty
        ? 1
        : (_existingRounds.reduce((a, b) => a > b ? a : b) + 1);
    final canCreate = _teams.length >= 2 && !_teamsLoading;

    return GestureDetector(
      onTap: canCreate
          ? () => _navigateToManualEditor(
                context,
                roundNumber: nextRound,
                existingMatches: null,
              )
          : null,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: _SN.neonGreen.withOpacity(canCreate ? 0.08 : 0.03),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: _SN.neonGreen.withOpacity(canCreate ? 0.3 : 0.1),
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: _SN.neonGreen.withOpacity(canCreate ? 0.15 : 0.05),
                borderRadius: BorderRadius.circular(10),
              ),
              alignment: Alignment.center,
              child: Icon(
                Icons.add,
                color: _SN.neonGreen.withOpacity(canCreate ? 1.0 : 0.3),
                size: 22,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Crear Jornada $nextRound',
                    style: GoogleFonts.outfit(
                      fontSize: 15,
                      color: canCreate
                          ? _SN.textPrimary
                          : _SN.textMuted,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    'Agregar partidos manualmente',
                    style: GoogleFonts.outfit(
                      fontSize: 12,
                      color: _SN.textMuted,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.chevron_right,
              color: _SN.neonGreen.withOpacity(canCreate ? 0.7 : 0.2),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildExistingRoundsList(BuildContext context) {
    final sortedRounds = _existingRounds.toList()..sort();

    return Column(
      children: sortedRounds.map((roundNum) {
        final roundMatches = _existingMatches
            .where((m) => m.round == roundNum)
            .toList();
        final matchCount = roundMatches.length;

        return GestureDetector(
          onTap: () => _navigateToManualEditor(
            context,
            roundNumber: roundNum,
            existingMatches: roundMatches,
          ),
          child: Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: _SN.cardDark,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: _SN.purple.withOpacity(0.15)),
            ),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: _SN.purple.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    '$roundNum',
                    style: GoogleFonts.bebasNeue(
                      fontSize: 18,
                      color: _SN.purple,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Jornada $roundNum',
                        style: GoogleFonts.outfit(
                          fontSize: 14,
                          color: _SN.textPrimary,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      Text(
                        '$matchCount ${matchCount == 1 ? 'partido' : 'partidos'}',
                        style: GoogleFonts.outfit(
                          fontSize: 12,
                          color: _SN.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(Icons.edit, color: _SN.purple.withOpacity(0.6), size: 18),
                const SizedBox(width: 4),
                Icon(Icons.chevron_right, color: _SN.textMuted),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  void _navigateToManualEditor(
    BuildContext context, {
    required int roundNumber,
    List<MatchEntity>? existingMatches,
  }) async {
    final result = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => BlocProvider.value(
          value: context.read<MatchBloc>(),
          child: ManualRoundEditorScreen(
            tournamentId: _selectedTournament!.id,
            tournamentName: _selectedTournament!.name,
            teams: _teams,
            existingMatches: existingMatches,
            roundNumber: roundNumber,
          ),
        ),
      ),
    );

    // Refresh existing matches after saving
    if (result == true && mounted) {
      _loadExistingMatches(context);
    }
  }

  Widget _buildLoadingState(String text) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(
            width: 50,
            height: 50,
            child: CircularProgressIndicator(
              strokeWidth: 3,
              valueColor: AlwaysStoppedAnimation<Color>(_SN.purple),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            text,
            style: GoogleFonts.bebasNeue(
              fontSize: 16,
              color: _SN.textMuted,
              letterSpacing: 2,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, color: _SN.purple, size: 18),
        const SizedBox(width: 8),
        Text(
          title,
          style: GoogleFonts.bebasNeue(
            fontSize: 16,
            color: _SN.purple,
            letterSpacing: 2,
          ),
        ),
      ],
    );
  }

  Widget _buildTournamentSelector(BuildContext context) {
    return BlocBuilder<TournamentBloc, TournamentState>(
      builder: (context, state) {
        List<TournamentEntity> tournaments = [];
        if (state is TournamentsLoaded) {
          tournaments = state.tournaments;
        }

        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          decoration: BoxDecoration(
            color: _SN.cardDark,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: _SN.purple.withOpacity(0.3)),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: _selectedTournament?.id,
              isExpanded: true,
              dropdownColor: _SN.cardDark,
              icon: Icon(Icons.keyboard_arrow_down, color: _SN.purple),
              hint: Text(
                state is TournamentLoading
                    ? 'Cargando torneos...'
                    : 'Selecciona un torneo',
                style: GoogleFonts.outfit(
                  fontSize: 14,
                  color: _SN.textSecondary,
                ),
              ),
              items: tournaments.map((t) {
                return DropdownMenuItem(
                  value: t.id,
                  child: Text(
                    '${t.name} (${t.formatText})',
                    style: GoogleFonts.outfit(
                      fontSize: 14,
                      color: _SN.textPrimary,
                    ),
                  ),
                );
              }).toList(),
              onChanged: (id) {
                final tournament = tournaments.firstWhere((t) => t.id == id);
                setState(() {
                  _selectedTournament = tournament;
                  _doubleRound = tournament.roundsPerSeason > 1;
                  _startDate = tournament.startDate;
                  _endDate = tournament.endDate;
                  _existingMatches = [];
                  _existingRounds = {};
                });
                // Load teams for selected tournament
                context.read<TeamBloc>().add(
                  LoadTeamsByTournamentEvent(
                    tournamentId: id!,
                    onlyActive: true,
                  ),
                );
                // Load existing matches for manual mode
                if (_mode == _FixtureMode.manual) {
                  _loadExistingMatches(context);
                }
              },
            ),
          ),
        );
      },
    );
  }

  Widget _buildTeamsInfo() {
    if (_teamsLoading) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: _SN.cardDark,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: _SN.purple.withOpacity(0.15)),
        ),
        child: Row(
          children: [
            SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(_SN.purple),
              ),
            ),
            const SizedBox(width: 12),
            Text(
              'Cargando equipos...',
              style: GoogleFonts.outfit(
                fontSize: 14,
                color: _SN.textSecondary,
              ),
            ),
          ],
        ),
      );
    }

    if (_teams.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: _SN.error.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: _SN.error.withOpacity(0.3)),
        ),
        child: Row(
          children: [
            Icon(Icons.warning_amber, color: _SN.error, size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'No hay equipos inscritos en este torneo',
                style: GoogleFonts.outfit(
                  fontSize: 14,
                  color: _SN.error,
                ),
              ),
            ),
          ],
        ),
      );
    }

    // Group info for group_knockout
    final isGroupFormat = _selectedTournament?.format == TournamentFormat.groupKnockout;
    final groups = <String, int>{};
    if (isGroupFormat) {
      for (final team in _teams) {
        final g = team.groupName ?? 'Sin grupo';
        groups[g] = (groups[g] ?? 0) + 1;
      }
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _SN.cardDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _SN.neonGreen.withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.groups, color: _SN.neonGreen, size: 20),
              const SizedBox(width: 8),
              Text(
                '${_teams.length} equipos',
                style: GoogleFonts.outfit(
                  fontSize: 14,
                  color: _SN.neonGreen,
                  fontWeight: FontWeight.w600,
                ),
              ),
              if (_teams.length % 2 != 0) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: _SN.amber.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    'Impar - habrá descansos',
                    style: GoogleFonts.outfit(
                      fontSize: 11,
                      color: _SN.amber,
                    ),
                  ),
                ),
              ],
            ],
          ),
          if (isGroupFormat && groups.isNotEmpty) ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 4,
              children: groups.entries.map((e) {
                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: _SN.purple.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    'Grupo ${e.key}: ${e.value}',
                    style: GoogleFonts.outfit(
                      fontSize: 12,
                      color: _SN.purple,
                    ),
                  ),
                );
              }).toList(),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildDatePickers(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _buildDateCard(
            context,
            label: 'Inicio',
            date: _startDate,
            onTap: () async {
              final picked = await showDatePicker(
                context: context,
                initialDate: _startDate,
                firstDate: DateTime(2024),
                lastDate: DateTime(2030),
                builder: (context, child) => _datePickerTheme(child),
              );
              if (picked != null) setState(() => _startDate = picked);
            },
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildDateCard(
            context,
            label: 'Fin',
            date: _endDate,
            onTap: () async {
              final picked = await showDatePicker(
                context: context,
                initialDate: _endDate,
                firstDate: _startDate,
                lastDate: DateTime(2030),
                builder: (context, child) => _datePickerTheme(child),
              );
              if (picked != null) setState(() => _endDate = picked);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildDateCard(
    BuildContext context, {
    required String label,
    required DateTime date,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: _SN.cardDark,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: _SN.purple.withOpacity(0.2)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: GoogleFonts.outfit(
                fontSize: 11,
                color: _SN.textMuted,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              DateFormat('dd/MM/yyyy').format(date),
              style: GoogleFonts.outfit(
                fontSize: 15,
                color: _SN.textPrimary,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Theme _datePickerTheme(Widget? child) {
    return Theme(
      data: ThemeData.dark().copyWith(
        colorScheme: ColorScheme.dark(
          primary: _SN.purple,
          surface: _SN.cardDark,
        ),
      ),
      child: child!,
    );
  }

  Widget _buildDaySelector() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: _SN.cardDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _SN.purple.withOpacity(0.15)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: List.generate(7, (index) {
          final dayNumber = index + 1; // 1=Mon ... 7=Sun
          final isSelected = _matchDays.contains(dayNumber);
          return GestureDetector(
            onTap: () {
              setState(() {
                if (isSelected) {
                  _matchDays.remove(dayNumber);
                } else {
                  _matchDays.add(dayNumber);
                }
              });
            },
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: isSelected ? _SN.purple : Colors.transparent,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: isSelected
                      ? _SN.purple
                      : _SN.textMuted.withOpacity(0.3),
                ),
              ),
              alignment: Alignment.center,
              child: Text(
                _dayLabels[index],
                style: GoogleFonts.bebasNeue(
                  fontSize: 16,
                  color: isSelected ? Colors.white : _SN.textMuted,
                ),
              ),
            ),
          );
        }),
      ),
    );
  }

  Widget _buildTimePickers(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _buildTimeCard(
            context,
            label: 'Hora inicio',
            time: _startTime,
            onTap: () async {
              final picked = await showTimePicker(
                context: context,
                initialTime: _startTime,
                builder: (context, child) => _datePickerTheme(child),
              );
              if (picked != null) setState(() => _startTime = picked);
            },
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildTimeCard(
            context,
            label: 'Hora fin (opcional)',
            time: _endTime,
            onTap: () async {
              final picked = await showTimePicker(
                context: context,
                initialTime: _endTime ?? const TimeOfDay(hour: 20, minute: 0),
                builder: (context, child) => _datePickerTheme(child),
              );
              if (picked != null) setState(() => _endTime = picked);
            },
            onClear: _endTime != null
                ? () => setState(() => _endTime = null)
                : null,
          ),
        ),
      ],
    );
  }

  Widget _buildTimeCard(
    BuildContext context, {
    required String label,
    required TimeOfDay? time,
    required VoidCallback onTap,
    VoidCallback? onClear,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: _SN.cardDark,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: _SN.purple.withOpacity(0.2)),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: GoogleFonts.outfit(
                      fontSize: 11,
                      color: _SN.textMuted,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    time != null
                        ? '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}'
                        : 'Auto',
                    style: GoogleFonts.outfit(
                      fontSize: 15,
                      color: time != null ? _SN.textPrimary : _SN.textMuted,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            if (onClear != null)
              GestureDetector(
                onTap: onClear,
                child: Icon(Icons.close, color: _SN.textMuted, size: 16),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildFieldsCounter() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _SN.cardDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _SN.purple.withOpacity(0.15)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Canchas disponibles',
                  style: GoogleFonts.outfit(
                    fontSize: 14,
                    color: _SN.textPrimary,
                  ),
                ),
                Text(
                  'Partidos simultáneos',
                  style: GoogleFonts.outfit(
                    fontSize: 11,
                    color: _SN.textMuted,
                  ),
                ),
              ],
            ),
          ),
          _buildCounterButton(
            icon: Icons.remove,
            onTap: () {
              if (_fieldsAvailable > 1) {
                setState(() => _fieldsAvailable--);
              }
            },
          ),
          Container(
            width: 48,
            alignment: Alignment.center,
            child: Text(
              '$_fieldsAvailable',
              style: GoogleFonts.bebasNeue(
                fontSize: 24,
                color: _SN.purple,
              ),
            ),
          ),
          _buildCounterButton(
            icon: Icons.add,
            onTap: () {
              if (_fieldsAvailable < 6) {
                setState(() => _fieldsAvailable++);
              }
            },
          ),
        ],
      ),
    );
  }

  Widget _buildCounterButton({
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: _SN.purple.withOpacity(0.15),
          borderRadius: BorderRadius.circular(8),
        ),
        alignment: Alignment.center,
        child: Icon(icon, color: _SN.purple, size: 18),
      ),
    );
  }

  Widget _buildDurationSliders() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _SN.cardDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _SN.purple.withOpacity(0.15)),
      ),
      child: Column(
        children: [
          _buildSliderRow(
            label: 'Tiempo por mitad',
            value: _halfTime.toDouble(),
            min: 15,
            max: 45,
            suffix: 'min',
            onChanged: (v) => setState(() => _halfTime = v.round()),
          ),
          const SizedBox(height: 12),
          _buildSliderRow(
            label: 'Descanso medio tiempo',
            value: _breakTime.toDouble(),
            min: 5,
            max: 15,
            suffix: 'min',
            onChanged: (v) => setState(() => _breakTime = v.round()),
          ),
          const SizedBox(height: 12),
          _buildSliderRow(
            label: 'Descanso entre partidos',
            value: _breakBetweenMatches.toDouble(),
            min: 0,
            max: 30,
            suffix: 'min',
            onChanged: (v) => setState(() => _breakBetweenMatches = v.round()),
          ),
        ],
      ),
    );
  }

  Widget _buildSliderRow({
    required String label,
    required double value,
    required double min,
    required double max,
    required String suffix,
    required ValueChanged<double> onChanged,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              label,
              style: GoogleFonts.outfit(
                fontSize: 13,
                color: _SN.textSecondary,
              ),
            ),
            Text(
              '${value.round()} $suffix',
              style: GoogleFonts.bebasNeue(
                fontSize: 16,
                color: _SN.purple,
              ),
            ),
          ],
        ),
        SliderTheme(
          data: SliderThemeData(
            activeTrackColor: _SN.purple,
            inactiveTrackColor: _SN.purple.withOpacity(0.15),
            thumbColor: _SN.purple,
            overlayColor: _SN.purple.withOpacity(0.1),
            trackHeight: 4,
            thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 7),
          ),
          child: Slider(
            value: value,
            min: min,
            max: max,
            divisions: (max - min).round(),
            onChanged: onChanged,
          ),
        ),
      ],
    );
  }

  Widget _buildDoubleRoundToggle() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _SN.cardDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _SN.purple.withOpacity(0.15)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Ida y vuelta',
                  style: GoogleFonts.outfit(
                    fontSize: 14,
                    color: _SN.textPrimary,
                  ),
                ),
                Text(
                  'Cada equipo juega 2 veces contra cada rival',
                  style: GoogleFonts.outfit(
                    fontSize: 11,
                    color: _SN.textMuted,
                  ),
                ),
              ],
            ),
          ),
          Switch(
            value: _doubleRound,
            onChanged: (v) => setState(() => _doubleRound = v),
            activeColor: _SN.purple,
            activeTrackColor: _SN.purple.withOpacity(0.3),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryCard() {
    final n = _teams.length;
    if (n < 2) return const SizedBox.shrink();

    final isGroupFormat =
        _selectedTournament?.format == TournamentFormat.groupKnockout;
    final matchDuration = (_halfTime * 2) + _breakTime + _breakBetweenMatches;

    int totalRounds;
    int totalMatches;
    bool hasOddGroup = false;

    if (isGroupFormat) {
      // Calculate per group
      final groups = <String, int>{};
      for (final team in _teams) {
        final g = team.groupName ?? 'A';
        groups[g] = (groups[g] ?? 0) + 1;
      }
      totalRounds = 0;
      totalMatches = 0;
      for (final count in groups.values) {
        if (count < 2) continue;
        final isOdd = count % 2 != 0;
        if (isOdd) hasOddGroup = true;
        final effectiveN = isOdd ? count + 1 : count;
        final groupRounds = effectiveN - 1;
        final matchesPerRound = isOdd ? (effectiveN ~/ 2) - 1 : effectiveN ~/ 2;
        final legs = _doubleRound ? 2 : 1;
        totalRounds += groupRounds * legs;
        totalMatches += groupRounds * legs * matchesPerRound;
      }
    } else {
      final isOdd = n % 2 != 0;
      hasOddGroup = isOdd;
      final effectiveN = isOdd ? n + 1 : n;
      final roundsPerLeg = effectiveN - 1;
      final matchesPerRound =
          isOdd ? (effectiveN ~/ 2) - 1 : effectiveN ~/ 2;
      final legs = _doubleRound ? 2 : 1;
      totalRounds = roundsPerLeg * legs;
      totalMatches = totalRounds * matchesPerRound;
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            _SN.purple.withOpacity(0.15),
            _SN.purple.withOpacity(0.05),
          ],
        ),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _SN.purple.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'RESUMEN',
            style: GoogleFonts.bebasNeue(
              fontSize: 16,
              color: _SN.purple,
              letterSpacing: 2,
            ),
          ),
          const SizedBox(height: 12),
          _buildSummaryRow('Jornadas', '$totalRounds'),
          _buildSummaryRow('Total partidos', '$totalMatches'),
          _buildSummaryRow('Duración partido', '$matchDuration min'),
          if (hasOddGroup)
            _buildSummaryRow('Descanso', '1 equipo por jornada'),
          _buildSummaryRow('Canchas', '$_fieldsAvailable'),
          if (_doubleRound) _buildSummaryRow('Formato', 'Ida y vuelta'),
        ],
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: GoogleFonts.outfit(
              fontSize: 13,
              color: _SN.textSecondary,
            ),
          ),
          Text(
            value,
            style: GoogleFonts.outfit(
              fontSize: 13,
              color: _SN.textPrimary,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAlgorithmToggle() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: _SN.cardDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _SN.purple.withOpacity(0.2)),
      ),
      child: Row(
        children: [
          Expanded(
            child: _buildAlgorithmButton(
              label: 'CP-SAT SOLVER',
              icon: Icons.auto_awesome,
              isSelected: _algorithm == _Algorithm.cpSat,
              selectedColor: _SN.purple,
              onTap: () => setState(() => _algorithm = _Algorithm.cpSat),
            ),
          ),
          Expanded(
            child: _buildAlgorithmButton(
              label: 'TRADICIONAL',
              icon: Icons.memory,
              isSelected: _algorithm == _Algorithm.traditional,
              selectedColor: const Color(0xFF3B82F6), // blue
              onTap: () => setState(() => _algorithm = _Algorithm.traditional),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAlgorithmButton({
    required String label,
    required IconData icon,
    required bool isSelected,
    required Color selectedColor,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? selectedColor.withOpacity(0.25) : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
          border: isSelected
              ? Border.all(color: selectedColor.withOpacity(0.5))
              : null,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 16,
              color: isSelected ? selectedColor : _SN.textMuted,
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: GoogleFonts.bebasNeue(
                fontSize: 13,
                color: isSelected ? selectedColor : _SN.textMuted,
                letterSpacing: 1,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGenerateButton(BuildContext context) {
    final canGenerate = _selectedTournament != null &&
        _teams.length >= 2 &&
        _matchDays.isNotEmpty &&
        !_teamsLoading;

    final isCpSat = _algorithm == _Algorithm.cpSat;
    final buttonColor = isCpSat ? _SN.purple : _SN.neonGreen;
    final textColor = isCpSat ? Colors.white : Colors.black;
    final buttonText = isCpSat ? 'GENERAR CON CP-SAT' : 'GENERAR CALENDARIO';
    final buttonIcon = isCpSat ? Icons.auto_awesome : Icons.calendar_month;

    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: canGenerate ? () => _generateFixtures(context) : null,
        icon: Icon(buttonIcon, size: 18),
        label: Text(
          buttonText,
          style: GoogleFonts.bebasNeue(
            fontSize: 18,
            letterSpacing: 2,
          ),
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: buttonColor,
          disabledBackgroundColor: buttonColor.withOpacity(0.2),
          foregroundColor: textColor,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
    );
  }

  void _generateFixtures(BuildContext context) {
    final config = FixtureConfig(
      tournamentId: _selectedTournament!.id,
      startDate: _startDate,
      endDate: _endDate,
      matchDays: _matchDays.toList()..sort(),
      startTime: '${_startTime.hour.toString().padLeft(2, '0')}:${_startTime.minute.toString().padLeft(2, '0')}',
      endTime: _endTime != null
          ? '${_endTime!.hour.toString().padLeft(2, '0')}:${_endTime!.minute.toString().padLeft(2, '0')}'
          : null,
      fieldsAvailable: _fieldsAvailable,
      doubleRound: _doubleRound,
      halfTime: _halfTime,
      breakTime: _breakTime,
      breakBetweenMatches: _breakBetweenMatches,
    );

    if (_algorithm == _Algorithm.cpSat) {
      context.read<MatchBloc>().add(GenerateFixturesCpSatEvent(
        config: config,
        teams: _teams,
        tournament: _selectedTournament!,
      ));
    } else {
      context.read<MatchBloc>().add(GenerateFixturesEvent(
        config: config,
        teams: _teams,
        tournament: _selectedTournament!,
      ));
    }
  }
}
