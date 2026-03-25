import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/di/injection.dart';
import '../../../core/utils/embedding_generator.dart';
import '../../../domain/entities/team_standing_entity.dart';
import '../../../domain/entities/tournament_entity.dart';
import '../../../domain/entities/user_entity.dart';
import '../../bloc/team/team_bloc.dart';
import '../../bloc/team/team_event.dart';
import '../../bloc/team/team_state.dart';
import '../../bloc/tournament/tournament_bloc.dart';
import '../../bloc/tournament/tournament_event.dart';
import '../../bloc/tournament/tournament_state.dart';

/// Stadium Nights Design System
class _StadiumNights {
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

  // Medal colors
  static const Color goldMedal = Color(0xFFFFD700);
  static const Color silverMedal = Color(0xFFC0C0C0);
  static const Color bronzeMedal = Color(0xFFCD7F32);
}

/// Standings Screen
class StandingsScreen extends StatelessWidget {
  final UserEntity user;

  const StandingsScreen({
    super.key,
    required this.user,
  });

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(
          create: (context) {
            final bloc = sl<TournamentBloc>();
            if (user.leagueId != null) {
              bloc.add(LoadTournamentsByLeagueEvent(leagueId: user.leagueId!));
            }
            return bloc;
          },
        ),
        BlocProvider(create: (context) => sl<TeamBloc>()),
      ],
      child: _StandingsView(user: user),
    );
  }
}

class _StandingsView extends StatefulWidget {
  final UserEntity user;

  const _StandingsView({required this.user});

  @override
  State<_StandingsView> createState() => _StandingsViewState();
}

class _StandingsViewState extends State<_StandingsView> {
  String? _selectedTournamentId;
  TournamentEntity? _selectedTournament;
  String? _selectedGroupName;

  bool get _isGroupKnockout =>
      _selectedTournament?.format == TournamentFormat.groupKnockout;

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
        body: BlocListener<TeamBloc, TeamState>(
          listener: (context, state) {
            if (state is StandingsUpdated && _selectedTournamentId != null) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: const Text('Estadísticas actualizadas'),
                  backgroundColor: _StadiumNights.neonGreen,
                  behavior: SnackBarBehavior.floating,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              );
              // Reload standings
              context.read<TeamBloc>().add(
                LoadStandingsByTournamentEvent(tournamentId: _selectedTournamentId!),
              );
            }
          },
          child: Column(
            children: [
              // Tournament selector
              _buildTournamentSelector(),
              // Group tabs (only for group_knockout)
              if (_isGroupKnockout) _buildGroupTabs(),
              // Standings table
              Expanded(child: _buildStandingsContent()),
            ],
          ),
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
          child: Icon(
            Icons.arrow_back,
            color: _StadiumNights.gold,
            size: 18,
          ),
        ),
        onPressed: () => Navigator.pop(context),
      ),
      title: Text(
        'TABLA DE POSICIONES',
        style: GoogleFonts.bebasNeue(
          fontSize: 22,
          color: _StadiumNights.textPrimary,
          letterSpacing: 2,
        ),
      ),
      centerTitle: true,
      actions: [
        if (widget.user.leagueId != null)
          IconButton(
            icon: Icon(Icons.auto_awesome, color: _StadiumNights.neonGreen, size: 20),
            tooltip: 'Generar embedding',
            onPressed: () => _generateEmbedding(context),
          ),
        if (_selectedTournamentId != null)
          IconButton(
            icon: Icon(Icons.refresh, color: _StadiumNights.gold),
            onPressed: () {
              context.read<TeamBloc>().add(
                LoadStandingsByTournamentEvent(
                  tournamentId: _selectedTournamentId!,
                ),
              );
            },
          ),
      ],
    );
  }

  Widget _buildTournamentSelector() {
    return BlocBuilder<TournamentBloc, TournamentState>(
      builder: (context, state) {
        if (state is TournamentsLoaded && state.tournaments.isNotEmpty) {
          // Auto-select first tournament if none selected
          if (_selectedTournamentId == null) {
            // Try to find an active tournament first
            final activeTournament = state.tournaments.firstWhere(
              (t) => t.isActive,
              orElse: () => state.tournaments.first,
            );
            WidgetsBinding.instance.addPostFrameCallback((_) {
              setState(() {
                _selectedTournamentId = activeTournament.id;
                _selectedTournament = activeTournament;
                _selectedGroupName = null;
              });
              context.read<TeamBloc>().add(
                LoadStandingsByTournamentEvent(
                  tournamentId: activeTournament.id,
                ),
              );
            });
          }

          return Container(
            margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            decoration: BoxDecoration(
              color: _StadiumNights.cardDark,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: _StadiumNights.gold.withOpacity(0.2),
              ),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: _selectedTournamentId,
                isExpanded: true,
                dropdownColor: _StadiumNights.cardDark,
                icon: Icon(
                  Icons.keyboard_arrow_down,
                  color: _StadiumNights.gold,
                ),
                hint: Row(
                  children: [
                    Icon(
                      Icons.emoji_events,
                      size: 18,
                      color: _StadiumNights.gold,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Seleccionar torneo',
                      style: GoogleFonts.outfit(
                        fontSize: 14,
                        color: _StadiumNights.textSecondary,
                      ),
                    ),
                  ],
                ),
                items: state.tournaments.map((tournament) {
                  return DropdownMenuItem<String>(
                    value: tournament.id,
                    child: Row(
                      children: [
                        Icon(
                          Icons.emoji_events,
                          size: 18,
                          color: tournament.isActive
                              ? _StadiumNights.gold
                              : _StadiumNights.textMuted,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            tournament.name,
                            style: GoogleFonts.outfit(
                              fontSize: 14,
                              color: _StadiumNights.textPrimary,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (tournament.isActive)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: _StadiumNights.neonGreen.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              'ACTIVO',
                              style: GoogleFonts.outfit(
                                fontSize: 10,
                                color: _StadiumNights.neonGreen,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                      ],
                    ),
                  );
                }).toList(),
                onChanged: (value) {
                  if (value != null) {
                    final tournament = state.tournaments.firstWhere(
                      (t) => t.id == value,
                    );
                    setState(() {
                      _selectedTournamentId = value;
                      _selectedTournament = tournament;
                      _selectedGroupName = null;
                    });
                    context.read<TeamBloc>().add(
                      LoadStandingsByTournamentEvent(tournamentId: value),
                    );
                  }
                },
              ),
            ),
          );
        }

        if (state is TournamentLoading) {
          return Container(
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(_StadiumNights.gold),
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  'Cargando torneos...',
                  style: GoogleFonts.outfit(
                    fontSize: 14,
                    color: _StadiumNights.textSecondary,
                  ),
                ),
              ],
            ),
          );
        }

        return const SizedBox.shrink();
      },
    );
  }

  Widget _buildGroupTabs() {
    return BlocBuilder<TeamBloc, TeamState>(
      builder: (context, state) {
        if (state is! StandingsLoaded) return const SizedBox.shrink();

        // Extract unique group names from standings
        final groupNames = state.standings
            .where((s) => s.groupName != null && s.groupName!.isNotEmpty)
            .map((s) => s.groupName!)
            .toSet()
            .toList()
          ..sort();

        if (groupNames.isEmpty) return const SizedBox.shrink();

        return Container(
          margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
          height: 38,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: [
              // "Todos" (All) tab
              _buildGroupTab(
                label: 'TODOS',
                isSelected: _selectedGroupName == null,
                onTap: () => setState(() => _selectedGroupName = null),
              ),
              const SizedBox(width: 8),
              // Group tabs
              ...groupNames.map((group) => Padding(
                padding: const EdgeInsets.only(right: 8),
                child: _buildGroupTab(
                  label: group.toUpperCase(),
                  isSelected: _selectedGroupName == group,
                  onTap: () => setState(() => _selectedGroupName = group),
                ),
              )),
            ],
          ),
        );
      },
    );
  }

  Widget _buildGroupTab({
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? _StadiumNights.gold.withOpacity(0.2)
              : _StadiumNights.cardDark,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected
                ? _StadiumNights.gold
                : _StadiumNights.gold.withOpacity(0.15),
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Text(
          label,
          style: GoogleFonts.bebasNeue(
            fontSize: 14,
            color: isSelected
                ? _StadiumNights.gold
                : _StadiumNights.textMuted,
            letterSpacing: 1,
          ),
        ),
      ),
    );
  }

  Future<void> _generateEmbedding(BuildContext context) async {
    if (widget.user.leagueId == null) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Generando embedding de posiciones...'),
        backgroundColor: _StadiumNights.neonGreen.withOpacity(0.8),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        duration: const Duration(seconds: 2),
      ),
    );

    final success = await EmbeddingGenerator.generateStandingsEmbedding(widget.user.leagueId!);

    if (!context.mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(success ? 'Embedding generado correctamente' : 'Error al generar embedding'),
        backgroundColor: success ? _StadiumNights.neonGreen : _StadiumNights.error,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  /// Filter standings by selected group if applicable
  List<TeamStandingEntity> _filterStandings(List<TeamStandingEntity> standings) {
    if (!_isGroupKnockout || _selectedGroupName == null) {
      return standings;
    }
    return standings.where((s) => s.groupName == _selectedGroupName).toList();
  }

  Widget _buildStandingsContent() {
    return BlocBuilder<TeamBloc, TeamState>(
      builder: (context, state) {
        if (state is TeamLoading) {
          return _buildLoadingState();
        }

        if (state is TeamError) {
          return _buildErrorState(context, state.message);
        }

        if (state is StandingsLoaded) {
          if (state.standings.isEmpty) {
            return _buildEmptyState();
          }

          // For group_knockout with "TODOS" selected, show grouped tables
          if (_isGroupKnockout && _selectedGroupName == null) {
            return _buildGroupedStandingsTables(state.standings);
          }

          // For specific group or non-group tournaments, show single table
          final filtered = _filterStandings(state.standings);
          if (filtered.isEmpty) {
            return _buildEmptyState();
          }
          return _buildStandingsTable(filtered);
        }

        // Initial state - waiting for tournament selection
        if (_selectedTournamentId == null) {
          return _buildSelectTournamentState();
        }

        return _buildLoadingState();
      },
    );
  }

  /// Build multiple grouped standings tables (one per group)
  Widget _buildGroupedStandingsTables(List<TeamStandingEntity> standings) {
    // Group by groupName
    final groups = <String, List<TeamStandingEntity>>{};
    final ungrouped = <TeamStandingEntity>[];

    for (final standing in standings) {
      if (standing.groupName != null && standing.groupName!.isNotEmpty) {
        groups.putIfAbsent(standing.groupName!, () => []).add(standing);
      } else {
        ungrouped.add(standing);
      }
    }

    final sortedGroupNames = groups.keys.toList()..sort();

    // If no groups found, show flat table
    if (sortedGroupNames.isEmpty) {
      return _buildStandingsTable(standings);
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          ...sortedGroupNames.map((groupName) {
            final groupStandings = groups[groupName]!;
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Group header
                Container(
                  width: double.infinity,
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        _StadiumNights.gold.withOpacity(0.15),
                        Colors.transparent,
                      ],
                    ),
                    borderRadius: BorderRadius.circular(8),
                    border: Border(
                      left: BorderSide(
                        color: _StadiumNights.gold,
                        width: 3,
                      ),
                    ),
                  ),
                  child: Text(
                    groupName.toUpperCase(),
                    style: GoogleFonts.bebasNeue(
                      fontSize: 18,
                      color: _StadiumNights.gold,
                      letterSpacing: 2,
                    ),
                  ),
                ),
                // Table header
                _buildTableHeader(),
                const SizedBox(height: 8),
                // Table rows
                ...groupStandings.asMap().entries.map((entry) {
                  final index = entry.key;
                  final standing = entry.value;
                  return _StandingRow(
                    position: index + 1,
                    standing: standing,
                    isLeagueAdmin: widget.user.isLeagueAdmin,
                    onEdit: widget.user.isLeagueAdmin
                        ? () => _showEditStandingsDialog(context, standing)
                        : null,
                  );
                }),
                const SizedBox(height: 24),
              ],
            );
          }),
          // Show ungrouped teams if any
          if (ungrouped.isNotEmpty) ...[
            Container(
              width: double.infinity,
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    _StadiumNights.textMuted.withOpacity(0.15),
                    Colors.transparent,
                  ],
                ),
                borderRadius: BorderRadius.circular(8),
                border: Border(
                  left: BorderSide(
                    color: _StadiumNights.textMuted,
                    width: 3,
                  ),
                ),
              ),
              child: Text(
                'SIN GRUPO',
                style: GoogleFonts.bebasNeue(
                  fontSize: 18,
                  color: _StadiumNights.textMuted,
                  letterSpacing: 2,
                ),
              ),
            ),
            _buildTableHeader(),
            const SizedBox(height: 8),
            ...ungrouped.asMap().entries.map((entry) {
              final index = entry.key;
              final standing = entry.value;
              return _StandingRow(
                position: index + 1,
                standing: standing,
                isLeagueAdmin: widget.user.isLeagueAdmin,
                onEdit: widget.user.isLeagueAdmin
                    ? () => _showEditStandingsDialog(context, standing)
                    : null,
              );
            }),
          ],
        ],
      ),
    );
  }

  Widget _buildLoadingState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(
            width: 50,
            height: 50,
            child: CircularProgressIndicator(
              strokeWidth: 3,
              valueColor: AlwaysStoppedAnimation<Color>(_StadiumNights.gold),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'CARGANDO TABLA',
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

  Widget _buildSelectTournamentState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.emoji_events_outlined,
              size: 60,
              color: _StadiumNights.gold.withOpacity(0.5),
            ),
            const SizedBox(height: 24),
            Text(
              'SELECCIONA UN TORNEO',
              style: GoogleFonts.bebasNeue(
                fontSize: 20,
                color: _StadiumNights.textPrimary,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Elige un torneo para ver\nla tabla de posiciones.',
              textAlign: TextAlign.center,
              style: GoogleFonts.outfit(
                fontSize: 14,
                color: _StadiumNights.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.leaderboard_outlined,
              size: 60,
              color: _StadiumNights.textMuted,
            ),
            const SizedBox(height: 24),
            Text(
              'SIN DATOS',
              style: GoogleFonts.bebasNeue(
                fontSize: 20,
                color: _StadiumNights.textPrimary,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Aún no hay estadísticas\npara este torneo.',
              textAlign: TextAlign.center,
              style: GoogleFonts.outfit(
                fontSize: 14,
                color: _StadiumNights.textSecondary,
              ),
            ),
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
            Icon(
              Icons.error_outline,
              size: 50,
              color: _StadiumNights.error,
            ),
            const SizedBox(height: 20),
            Text(
              'ERROR',
              style: GoogleFonts.bebasNeue(
                fontSize: 20,
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
            if (_selectedTournamentId != null)
              GestureDetector(
                onTap: () {
                  context.read<TeamBloc>().add(
                    LoadStandingsByTournamentEvent(
                      tournamentId: _selectedTournamentId!,
                    ),
                  );
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 12,
                  ),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [_StadiumNights.gold, _StadiumNights.amber],
                    ),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.refresh, color: Colors.black, size: 18),
                      const SizedBox(width: 8),
                      Text(
                        'REINTENTAR',
                        style: GoogleFonts.bebasNeue(
                          fontSize: 14,
                          color: Colors.black,
                          letterSpacing: 1,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildStandingsTable(List<TeamStandingEntity> standings) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Table header
          _buildTableHeader(),
          const SizedBox(height: 8),
          // Table rows
          ...standings.asMap().entries.map((entry) {
            final index = entry.key;
            final standing = entry.value;
            return _StandingRow(
              position: index + 1,
              standing: standing,
              isLeagueAdmin: widget.user.isLeagueAdmin,
              onEdit: widget.user.isLeagueAdmin
                  ? () => _showEditStandingsDialog(context, standing)
                  : null,
            );
          }),
        ],
      ),
    );
  }

  void _showEditStandingsDialog(BuildContext context, TeamStandingEntity standing) {
    final pjController = TextEditingController(text: standing.matchesPlayed.toString());
    final pgController = TextEditingController(text: standing.matchesWon.toString());
    final peController = TextEditingController(text: standing.matchesDrawn.toString());
    final ppController = TextEditingController(text: standing.matchesLost.toString());
    final gfController = TextEditingController(text: standing.goalsFor.toString());
    final gcController = TextEditingController(text: standing.goalsAgainst.toString());
    final adjustmentController = TextEditingController(text: standing.pointsAdjustment.toString());
    final reasonController = TextEditingController(text: standing.adjustmentReason ?? '');

    showDialog(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          backgroundColor: _StadiumNights.cardDark,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(color: _StadiumNights.gold.withOpacity(0.3)),
          ),
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'EDITAR ESTADÍSTICAS',
                style: GoogleFonts.bebasNeue(
                  fontSize: 20,
                  color: _StadiumNights.gold,
                  letterSpacing: 2,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                standing.teamName,
                style: GoogleFonts.outfit(
                  fontSize: 14,
                  color: _StadiumNights.textSecondary,
                ),
              ),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Expanded(child: _buildEditField('PJ', pjController)),
                    const SizedBox(width: 8),
                    Expanded(child: _buildEditField('PG', pgController)),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(child: _buildEditField('PE', peController)),
                    const SizedBox(width: 8),
                    Expanded(child: _buildEditField('PP', ppController)),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(child: _buildEditField('GF', gfController)),
                    const SizedBox(width: 8),
                    Expanded(child: _buildEditField('GC', gcController)),
                  ],
                ),
                const SizedBox(height: 16),
                Divider(color: _StadiumNights.gold.withOpacity(0.2)),
                const SizedBox(height: 12),
                _buildEditField('Ajuste de Puntos', adjustmentController, allowNegative: true),
                const SizedBox(height: 12),
                TextField(
                  controller: reasonController,
                  style: GoogleFonts.outfit(fontSize: 14, color: _StadiumNights.textPrimary),
                  decoration: InputDecoration(
                    labelText: 'Razón del ajuste',
                    labelStyle: GoogleFonts.outfit(fontSize: 12, color: _StadiumNights.textMuted),
                    filled: true,
                    fillColor: _StadiumNights.surfaceDark,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide(color: _StadiumNights.gold.withOpacity(0.2)),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide(color: _StadiumNights.gold.withOpacity(0.2)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide(color: _StadiumNights.gold),
                    ),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: Text(
                'CANCELAR',
                style: GoogleFonts.bebasNeue(
                  color: _StadiumNights.textMuted,
                  letterSpacing: 1,
                ),
              ),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: _StadiumNights.gold,
                foregroundColor: Colors.black,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () {
                context.read<TeamBloc>().add(
                  UpdateStandingsEvent(
                    teamId: standing.teamId,
                    tournamentId: standing.tournamentId ?? _selectedTournamentId!,
                    leagueId: standing.leagueId ?? widget.user.leagueId!,
                    matchesPlayed: int.tryParse(pjController.text) ?? standing.matchesPlayed,
                    matchesWon: int.tryParse(pgController.text) ?? standing.matchesWon,
                    matchesDrawn: int.tryParse(peController.text) ?? standing.matchesDrawn,
                    matchesLost: int.tryParse(ppController.text) ?? standing.matchesLost,
                    goalsFor: int.tryParse(gfController.text) ?? standing.goalsFor,
                    goalsAgainst: int.tryParse(gcController.text) ?? standing.goalsAgainst,
                    pointsAdjustment: int.tryParse(adjustmentController.text) ?? 0,
                    adjustmentReason: reasonController.text.isEmpty ? null : reasonController.text,
                  ),
                );
                Navigator.pop(dialogContext);
              },
              child: Text(
                'GUARDAR',
                style: GoogleFonts.bebasNeue(letterSpacing: 1),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildEditField(String label, TextEditingController controller, {bool allowNegative = false}) {
    return TextField(
      controller: controller,
      keyboardType: TextInputType.numberWithOptions(signed: allowNegative),
      style: GoogleFonts.outfit(fontSize: 14, color: _StadiumNights.textPrimary),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: GoogleFonts.outfit(fontSize: 12, color: _StadiumNights.textMuted),
        filled: true,
        fillColor: _StadiumNights.surfaceDark,
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: _StadiumNights.gold.withOpacity(0.2)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: _StadiumNights.gold.withOpacity(0.2)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: _StadiumNights.gold),
        ),
      ),
    );
  }

  Widget _buildTableHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: _StadiumNights.cardDark,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: _StadiumNights.gold.withOpacity(0.2)),
      ),
      child: Row(
        children: [
          // Position
          SizedBox(
            width: 30,
            child: Text(
              '#',
              style: GoogleFonts.bebasNeue(
                fontSize: 14,
                color: _StadiumNights.gold,
              ),
              textAlign: TextAlign.center,
            ),
          ),
          // Team
          Expanded(
            flex: 3,
            child: Text(
              'EQUIPO',
              style: GoogleFonts.bebasNeue(
                fontSize: 12,
                color: _StadiumNights.gold,
                letterSpacing: 1,
              ),
            ),
          ),
          // Stats
          ...[
            TeamStandingEntity.labelPJ,
            TeamStandingEntity.labelPG,
            TeamStandingEntity.labelPE,
            TeamStandingEntity.labelPP,
            TeamStandingEntity.labelDG,
            TeamStandingEntity.labelPTS,
          ].map((label) => SizedBox(
            width: label == TeamStandingEntity.labelPTS ? 36 : 28,
            child: Text(
              label,
              style: GoogleFonts.bebasNeue(
                fontSize: 11,
                color: label == TeamStandingEntity.labelPTS
                    ? _StadiumNights.gold
                    : _StadiumNights.textMuted,
                letterSpacing: 0.5,
              ),
              textAlign: TextAlign.center,
            ),
          )),
        ],
      ),
    );
  }
}

/// Standing Row Widget
class _StandingRow extends StatelessWidget {
  final int position;
  final TeamStandingEntity standing;
  final bool isLeagueAdmin;
  final VoidCallback? onEdit;

  const _StandingRow({
    required this.position,
    required this.standing,
    this.isLeagueAdmin = false,
    this.onEdit,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: BoxDecoration(
        color: standing.hasAdjustment
            ? _StadiumNights.error.withOpacity(0.1)
            : _StadiumNights.surfaceDark,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: standing.hasAdjustment
              ? _StadiumNights.error.withOpacity(0.3)
              : _StadiumNights.gold.withOpacity(0.1),
        ),
      ),
      child: Row(
        children: [
          // Position with medal for top 3
          SizedBox(
            width: 30,
            child: _buildPosition(),
          ),
          // Team info
          Expanded(
            flex: 3,
            child: Row(
              children: [
                _buildTeamLogo(),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        standing.teamName,
                        style: GoogleFonts.outfit(
                          fontSize: 13,
                          color: _StadiumNights.textPrimary,
                          fontWeight: FontWeight.w500,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (standing.hasAdjustment)
                        Text(
                          '${standing.pointsAdjustment > 0 ? '+' : ''}${standing.pointsAdjustment} pts',
                          style: GoogleFonts.outfit(
                            fontSize: 10,
                            color: standing.pointsAdjustment > 0
                                ? _StadiumNights.success
                                : _StadiumNights.error,
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          // Stats
          _buildStatCell(standing.matchesPlayed.toString()),
          _buildStatCell(standing.matchesWon.toString()),
          _buildStatCell(standing.matchesDrawn.toString()),
          _buildStatCell(standing.matchesLost.toString()),
          _buildStatCell(
            standing.goalDifference >= 0
                ? '+${standing.goalDifference}'
                : standing.goalDifference.toString(),
            color: standing.goalDifference > 0
                ? _StadiumNights.neonGreen
                : standing.goalDifference < 0
                    ? _StadiumNights.error
                    : null,
          ),
          // Points (highlighted)
          Container(
            width: 36,
            padding: const EdgeInsets.symmetric(vertical: 4),
            decoration: BoxDecoration(
              color: _StadiumNights.gold.withOpacity(0.15),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              standing.totalPoints.toString(),
              style: GoogleFonts.bebasNeue(
                fontSize: 16,
                color: _StadiumNights.gold,
              ),
              textAlign: TextAlign.center,
            ),
          ),
          // Edit button (league admin only)
          if (isLeagueAdmin && onEdit != null)
            GestureDetector(
              onTap: onEdit,
              child: Padding(
                padding: const EdgeInsets.only(left: 4),
                child: Icon(
                  Icons.edit_outlined,
                  size: 16,
                  color: _StadiumNights.textMuted,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildPosition() {
    if (position <= 3) {
      final color = position == 1
          ? _StadiumNights.goldMedal
          : position == 2
              ? _StadiumNights.silverMedal
              : _StadiumNights.bronzeMedal;
      return Container(
        width: 24,
        height: 24,
        decoration: BoxDecoration(
          color: color.withOpacity(0.2),
          shape: BoxShape.circle,
          border: Border.all(color: color, width: 1.5),
        ),
        child: Center(
          child: Text(
            position.toString(),
            style: GoogleFonts.bebasNeue(
              fontSize: 14,
              color: color,
            ),
          ),
        ),
      );
    }
    return Text(
      position.toString(),
      style: GoogleFonts.bebasNeue(
        fontSize: 16,
        color: _StadiumNights.textMuted,
      ),
      textAlign: TextAlign.center,
    );
  }

  Widget _buildTeamLogo() {
    return Container(
      width: 28,
      height: 28,
      decoration: BoxDecoration(
        color: _StadiumNights.cardDark,
        borderRadius: BorderRadius.circular(6),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(6),
        child: standing.teamLogo != null
            ? _buildLogoImage(standing.teamLogo!)
            : Icon(
                Icons.shield,
                size: 16,
                color: _StadiumNights.gold.withOpacity(0.5),
              ),
      ),
    );
  }

  Widget _buildLogoImage(String logoData) {
    try {
      if (logoData.startsWith('data:image/')) {
        final base64Data = logoData.split(',')[1];
        final Uint8List bytes = base64Decode(base64Data);
        return Image.memory(
          bytes,
          width: 28,
          height: 28,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => Icon(
            Icons.shield,
            size: 16,
            color: _StadiumNights.gold.withOpacity(0.5),
          ),
        );
      } else {
        return Image.network(
          logoData,
          width: 28,
          height: 28,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => Icon(
            Icons.shield,
            size: 16,
            color: _StadiumNights.gold.withOpacity(0.5),
          ),
        );
      }
    } catch (e) {
      return Icon(
        Icons.shield,
        size: 16,
        color: _StadiumNights.gold.withOpacity(0.5),
      );
    }
  }

  Widget _buildStatCell(String value, {Color? color}) {
    return SizedBox(
      width: 28,
      child: Text(
        value,
        style: GoogleFonts.outfit(
          fontSize: 12,
          color: color ?? _StadiumNights.textSecondary,
          fontWeight: color != null ? FontWeight.w600 : FontWeight.normal,
        ),
        textAlign: TextAlign.center,
      ),
    );
  }
}
