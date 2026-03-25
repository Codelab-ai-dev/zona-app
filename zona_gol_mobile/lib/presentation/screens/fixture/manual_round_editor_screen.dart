import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import '../../../domain/entities/match_entity.dart';
import '../../../domain/entities/team_entity.dart';
import '../../bloc/match/match_bloc.dart';
import '../../bloc/match/match_event.dart';
import '../../bloc/match/match_state.dart';

/// Stadium Nights Design System
class _SN {
  static const Color backgroundDark = Color(0xFF050508);
  static const Color surfaceDark = Color(0xFF0A0A0F);
  static const Color cardDark = Color(0xFF12121A);
  static const Color gold = Color(0xFFFFD700);
  static const Color neonGreen = Color(0xFF00FF7F);
  static const Color neonBlue = Color(0xFF00BFFF);
  static const Color purple = Color(0xFF8B5CF6);
  static const Color error = Color(0xFFEF4444);
  static const Color textPrimary = Color(0xFFFAFAFA);
  static const Color textSecondary = Color(0xFF9CA3AF);
  static const Color textMuted = Color(0xFF6B7280);
}

/// Editable match entry for manual mode
class _EditableMatch {
  String? existingId; // null = new match
  TeamEntity? homeTeam;
  TeamEntity? awayTeam;
  DateTime date;
  TimeOfDay time;
  int field;
  bool isDeleted;

  _EditableMatch({
    this.existingId,
    this.homeTeam,
    this.awayTeam,
    DateTime? date,
    TimeOfDay? time,
    this.field = 1,
  })  : isDeleted = false,
        date = date ?? DateTime.now(),
        time = time ?? const TimeOfDay(hour: 8, minute: 0);

  bool get isValid => homeTeam != null && awayTeam != null && homeTeam!.id != awayTeam!.id;

  Map<String, dynamic> toInsertMap(String tournamentId, int round) {
    return {
      'tournament_id': tournamentId,
      'home_team_id': homeTeam!.id,
      'away_team_id': awayTeam!.id,
      'match_date': _formatDate(date),
      'match_time': _formatTime(time),
      'field_number': field,
      'round': round,
      'status': MatchStatus.scheduled.toDbString(),
      'phase': 'regular',
      'is_published': false,
    };
  }

  Map<String, dynamic> toUpdateMap() {
    return {
      'home_team_id': homeTeam!.id,
      'away_team_id': awayTeam!.id,
      'match_date': _formatDate(date),
      'match_time': _formatTime(time),
      'field_number': field,
    };
  }

  static String _formatDate(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  static String _formatTime(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
}

/// Manual Round Editor Screen
/// Allows creating new rounds or editing existing ones
class ManualRoundEditorScreen extends StatefulWidget {
  final String tournamentId;
  final String tournamentName;
  final List<TeamEntity> teams;
  final List<MatchEntity>? existingMatches; // null = create new
  final int roundNumber;

  const ManualRoundEditorScreen({
    super.key,
    required this.tournamentId,
    required this.tournamentName,
    required this.teams,
    this.existingMatches,
    required this.roundNumber,
  });

  bool get isEditing => existingMatches != null;

  @override
  State<ManualRoundEditorScreen> createState() => _ManualRoundEditorScreenState();
}

class _ManualRoundEditorScreenState extends State<ManualRoundEditorScreen> {
  final List<_EditableMatch> _matches = [];

  @override
  void initState() {
    super.initState();
    if (widget.isEditing && widget.existingMatches != null) {
      // Load existing matches into editable form
      for (final m in widget.existingMatches!) {
        final homeTeam = widget.teams.where((t) => t.id == m.homeTeamId).firstOrNull;
        final awayTeam = widget.teams.where((t) => t.id == m.awayTeamId).firstOrNull;
        TimeOfDay time = const TimeOfDay(hour: 8, minute: 0);
        if (m.matchTime != null) {
          final parts = m.matchTime!.split(':');
          if (parts.length >= 2) {
            time = TimeOfDay(
              hour: int.tryParse(parts[0]) ?? 8,
              minute: int.tryParse(parts[1]) ?? 0,
            );
          }
        }
        _matches.add(_EditableMatch(
          existingId: m.id,
          homeTeam: homeTeam,
          awayTeam: awayTeam,
          date: m.matchDate,
          time: time,
          field: m.fieldNumber ?? 1,
        ));
      }
    }
    // Start with at least one empty match for new rounds
    if (_matches.isEmpty) {
      _addEmptyMatch();
    }
  }

  void _addEmptyMatch() {
    // Default to same date/time/field as last match if available
    final lastMatch = _matches.where((m) => !m.isDeleted).lastOrNull;
    setState(() {
      _matches.add(_EditableMatch(
        date: lastMatch?.date ?? DateTime.now(),
        time: lastMatch?.time ?? const TimeOfDay(hour: 8, minute: 0),
        field: lastMatch?.field ?? 1,
      ));
    });
  }

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
        body: BlocListener<MatchBloc, MatchState>(
          listener: (context, state) {
            if (state is FixturesSaved) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    widget.isEditing
                        ? 'Jornada ${widget.roundNumber} actualizada'
                        : '${state.matchCount} partidos creados',
                  ),
                  backgroundColor: _SN.neonGreen,
                ),
              );
              Navigator.pop(context, true); // return true to indicate changes
            } else if (state is MatchError) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(state.message),
                  backgroundColor: _SN.error,
                ),
              );
            }
          },
          child: BlocBuilder<MatchBloc, MatchState>(
            builder: (context, state) {
              if (state is FixturesSaving) {
                return _buildSavingState();
              }
              return _buildContent(context);
            },
          ),
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
        widget.isEditing
            ? 'EDITAR JORNADA ${widget.roundNumber}'
            : 'NUEVA JORNADA ${widget.roundNumber}',
        style: GoogleFonts.bebasNeue(
          fontSize: 22,
          color: _SN.textPrimary,
          letterSpacing: 2,
        ),
      ),
      centerTitle: true,
    );
  }

  Widget _buildSavingState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(
            width: 50,
            height: 50,
            child: CircularProgressIndicator(
              strokeWidth: 3,
              valueColor: AlwaysStoppedAnimation<Color>(_SN.neonGreen),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'GUARDANDO PARTIDOS',
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

  Widget _buildContent(BuildContext context) {
    final activeMatches = _matches.where((m) => !m.isDeleted).toList();

    return Column(
      children: [
        // Header with tournament info
        _buildHeader(),

        // Match list
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            itemCount: activeMatches.length + 1, // +1 for add button
            itemBuilder: (context, index) {
              if (index == activeMatches.length) {
                return _buildAddMatchButton();
              }
              final matchIndex = _matches.indexOf(activeMatches[index]);
              return _buildMatchEditor(matchIndex, index + 1);
            },
          ),
        ),

        // Bottom bar
        _buildBottomBar(context),
      ],
    );
  }

  Widget _buildHeader() {
    final activeCount = _matches.where((m) => !m.isDeleted).length;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _SN.surfaceDark,
        border: Border(
          bottom: BorderSide(color: _SN.purple.withOpacity(0.2)),
        ),
      ),
      child: Row(
        children: [
          Icon(Icons.emoji_events, color: _SN.gold, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              widget.tournamentName.toUpperCase(),
              style: GoogleFonts.bebasNeue(
                fontSize: 16,
                color: _SN.gold,
                letterSpacing: 1,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: _SN.purple.withOpacity(0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              'Jornada ${widget.roundNumber}',
              style: GoogleFonts.outfit(
                fontSize: 12,
                color: _SN.purple,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: _SN.neonGreen.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              '$activeCount partidos',
              style: GoogleFonts.outfit(
                fontSize: 12,
                color: _SN.neonGreen,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMatchEditor(int matchIndex, int displayNumber) {
    final match = _matches[matchIndex];

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _SN.cardDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: match.isValid ? _SN.purple.withOpacity(0.2) : _SN.error.withOpacity(0.3),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Match header with number and delete button
          Row(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: _SN.purple.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                alignment: Alignment.center,
                child: Text(
                  '$displayNumber',
                  style: GoogleFonts.bebasNeue(
                    fontSize: 14,
                    color: _SN.purple,
                  ),
                ),
              ),
              const Spacer(),
              GestureDetector(
                onTap: () {
                  setState(() {
                    if (match.existingId != null) {
                      match.isDeleted = true;
                    } else {
                      _matches.removeAt(matchIndex);
                    }
                  });
                },
                child: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: _SN.error.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(Icons.delete_outline, color: _SN.error, size: 18),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Team selectors row
          Row(
            children: [
              // Home team
              Expanded(
                child: _buildTeamSelector(
                  label: 'Local',
                  selected: match.homeTeam,
                  exclude: match.awayTeam,
                  onChanged: (team) {
                    setState(() => match.homeTeam = team);
                  },
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: Text(
                  'VS',
                  style: GoogleFonts.bebasNeue(
                    fontSize: 14,
                    color: _SN.purple,
                  ),
                ),
              ),
              // Away team
              Expanded(
                child: _buildTeamSelector(
                  label: 'Visitante',
                  selected: match.awayTeam,
                  exclude: match.homeTeam,
                  onChanged: (team) {
                    setState(() => match.awayTeam = team);
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Date, time, field row
          Row(
            children: [
              // Date
              Expanded(
                child: _buildDateField(
                  date: match.date,
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: match.date,
                      firstDate: DateTime(2024),
                      lastDate: DateTime(2030),
                      builder: (ctx, child) => Theme(
                        data: ThemeData.dark().copyWith(
                          colorScheme: ColorScheme.dark(
                            primary: _SN.purple,
                            surface: _SN.cardDark,
                          ),
                        ),
                        child: child!,
                      ),
                    );
                    if (picked != null) setState(() => match.date = picked);
                  },
                ),
              ),
              const SizedBox(width: 8),
              // Time
              Expanded(
                child: _buildTimeField(
                  time: match.time,
                  onTap: () async {
                    final picked = await showTimePicker(
                      context: context,
                      initialTime: match.time,
                      builder: (ctx, child) => Theme(
                        data: ThemeData.dark().copyWith(
                          colorScheme: ColorScheme.dark(
                            primary: _SN.purple,
                            surface: _SN.cardDark,
                          ),
                        ),
                        child: child!,
                      ),
                    );
                    if (picked != null) setState(() => match.time = picked);
                  },
                ),
              ),
              const SizedBox(width: 8),
              // Field
              SizedBox(
                width: 80,
                child: _buildFieldSelector(
                  field: match.field,
                  onChanged: (v) {
                    setState(() => match.field = v);
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTeamSelector({
    required String label,
    required TeamEntity? selected,
    required TeamEntity? exclude,
    required ValueChanged<TeamEntity?> onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
      decoration: BoxDecoration(
        color: _SN.backgroundDark,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: _SN.purple.withOpacity(0.15)),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: selected?.id,
          isExpanded: true,
          dropdownColor: _SN.cardDark,
          icon: Icon(Icons.keyboard_arrow_down, color: _SN.textMuted, size: 18),
          hint: Text(
            label,
            style: GoogleFonts.outfit(fontSize: 12, color: _SN.textMuted),
          ),
          items: widget.teams
              .where((t) => exclude == null || t.id != exclude.id)
              .map((t) => DropdownMenuItem(
                    value: t.id,
                    child: Text(
                      t.name,
                      style: GoogleFonts.outfit(fontSize: 12, color: _SN.textPrimary),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ))
              .toList(),
          onChanged: (id) {
            if (id != null) {
              final team = widget.teams.firstWhere((t) => t.id == id);
              onChanged(team);
            }
          },
        ),
      ),
    );
  }

  Widget _buildDateField({
    required DateTime date,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
        decoration: BoxDecoration(
          color: _SN.backgroundDark,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: _SN.purple.withOpacity(0.15)),
        ),
        child: Row(
          children: [
            Icon(Icons.calendar_today, size: 14, color: _SN.textMuted),
            const SizedBox(width: 6),
            Text(
              DateFormat('dd/MM').format(date),
              style: GoogleFonts.outfit(fontSize: 12, color: _SN.textPrimary),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTimeField({
    required TimeOfDay time,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
        decoration: BoxDecoration(
          color: _SN.backgroundDark,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: _SN.purple.withOpacity(0.15)),
        ),
        child: Row(
          children: [
            Icon(Icons.access_time, size: 14, color: _SN.neonBlue),
            const SizedBox(width: 6),
            Text(
              '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}',
              style: GoogleFonts.outfit(fontSize: 12, color: _SN.neonBlue),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFieldSelector({
    required int field,
    required ValueChanged<int> onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
      decoration: BoxDecoration(
        color: _SN.backgroundDark,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: _SN.purple.withOpacity(0.15)),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<int>(
          value: field,
          isExpanded: true,
          dropdownColor: _SN.cardDark,
          icon: Icon(Icons.keyboard_arrow_down, color: _SN.textMuted, size: 16),
          items: List.generate(6, (i) => i + 1)
              .map((f) => DropdownMenuItem(
                    value: f,
                    child: Text(
                      'C$f',
                      style: GoogleFonts.outfit(fontSize: 12, color: _SN.textPrimary),
                    ),
                  ))
              .toList(),
          onChanged: (v) {
            if (v != null) onChanged(v);
          },
        ),
      ),
    );
  }

  Widget _buildAddMatchButton() {
    return GestureDetector(
      onTap: _addEmptyMatch,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: _SN.purple.withOpacity(0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: _SN.purple.withOpacity(0.3),
            style: BorderStyle.solid,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.add_circle_outline, color: _SN.purple, size: 20),
            const SizedBox(width: 8),
            Text(
              'AGREGAR PARTIDO',
              style: GoogleFonts.bebasNeue(
                fontSize: 14,
                color: _SN.purple,
                letterSpacing: 1,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomBar(BuildContext context) {
    final activeMatches = _matches.where((m) => !m.isDeleted).toList();
    final validMatches = activeMatches.where((m) => m.isValid).length;
    final canSave = validMatches > 0;

    return Container(
      padding: EdgeInsets.fromLTRB(
        16,
        12,
        16,
        12 + MediaQuery.of(context).padding.bottom,
      ),
      decoration: BoxDecoration(
        color: _SN.surfaceDark,
        border: Border(
          top: BorderSide(color: _SN.purple.withOpacity(0.2)),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: OutlinedButton(
              onPressed: () => Navigator.pop(context),
              style: OutlinedButton.styleFrom(
                foregroundColor: _SN.textSecondary,
                side: BorderSide(color: _SN.textMuted),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: Text(
                'CANCELAR',
                style: GoogleFonts.bebasNeue(
                  fontSize: 14,
                  letterSpacing: 1,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 2,
            child: ElevatedButton(
              onPressed: canSave ? () => _saveRound(context) : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: _SN.neonGreen,
                disabledBackgroundColor: _SN.neonGreen.withOpacity(0.2),
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: Text(
                'GUARDAR $validMatches PARTIDOS',
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

  void _saveRound(BuildContext context) {
    // Validate all active matches
    final activeMatches = _matches.where((m) => !m.isDeleted).toList();
    final invalidMatches = activeMatches.where((m) => !m.isValid).toList();

    if (invalidMatches.isNotEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Hay ${invalidMatches.length} partidos incompletos. Selecciona equipos diferentes para cada partido.',
          ),
          backgroundColor: _SN.error,
        ),
      );
      return;
    }

    // Show confirmation
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: _SN.cardDark,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: Text(
          'Confirmar',
          style: GoogleFonts.bebasNeue(
            fontSize: 22,
            color: _SN.textPrimary,
            letterSpacing: 1,
          ),
        ),
        content: _buildConfirmationContent(activeMatches),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: Text(
              'Cancelar',
              style: GoogleFonts.outfit(color: _SN.textMuted),
            ),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(dialogContext);
              _executeSave(context);
            },
            style: TextButton.styleFrom(foregroundColor: _SN.neonGreen),
            child: Text(
              'Guardar',
              style: GoogleFonts.outfit(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildConfirmationContent(List<_EditableMatch> activeMatches) {
    final creates = activeMatches.where((m) => m.existingId == null).length;
    final updates = activeMatches.where((m) => m.existingId != null).length;
    final deletes = _matches.where((m) => m.isDeleted && m.existingId != null).length;

    final parts = <String>[];
    if (creates > 0) parts.add('$creates nuevos');
    if (updates > 0) parts.add('$updates actualizados');
    if (deletes > 0) parts.add('$deletes eliminados');

    return Text(
      'Jornada ${widget.roundNumber}: ${parts.join(', ')}.',
      style: GoogleFonts.outfit(fontSize: 14, color: _SN.textSecondary),
    );
  }

  void _executeSave(BuildContext context) {
    final activeMatches = _matches.where((m) => !m.isDeleted && m.isValid).toList();

    // Split into creates and updates
    final matchesToCreate = activeMatches
        .where((m) => m.existingId == null)
        .map((m) => m.toInsertMap(widget.tournamentId, widget.roundNumber))
        .toList();

    final matchesToUpdate = activeMatches
        .where((m) => m.existingId != null)
        .map((m) => ManualMatchUpdate(
              matchId: m.existingId!,
              data: m.toUpdateMap(),
            ))
        .toList();

    final matchIdsToDelete = _matches
        .where((m) => m.isDeleted && m.existingId != null)
        .map((m) => m.existingId!)
        .toList();

    context.read<MatchBloc>().add(SaveManualRoundEvent(
      matchesToCreate: matchesToCreate,
      matchesToUpdate: matchesToUpdate,
      matchIdsToDelete: matchIdsToDelete,
    ));
  }
}
