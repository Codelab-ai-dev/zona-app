import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/di/injection.dart';
import '../../../domain/entities/team_entity.dart';
import '../../../domain/entities/tournament_entity.dart';
import '../../../domain/repositories/team_repository.dart';

/// Stadium Nights palette
class _SN {
  static const Color bg = Color(0xFF050508);
  static const Color surface = Color(0xFF0D1117);
  static const Color card = Color(0xFF161B22);
  static const Color gold = Color(0xFFFFD700);
  static const Color neonGreen = Color(0xFF00FF7F);
  static const Color neonBlue = Color(0xFF00BFFF);
  static const Color error = Color(0xFFEF4444);
  static const Color textPrimary = Color(0xFFFAFAFA);
  static const Color textSecondary = Color(0xFF9CA3AF);
  static const Color textMuted = Color(0xFF6B7280);
  static const Color divider = Color(0xFF1E2733);
}

const _groupColors = [
  Color(0xFF10B981), // A - green
  Color(0xFF3B82F6), // B - blue
  Color(0xFFF59E0B), // C - amber
  Color(0xFFEF4444), // D - red
  Color(0xFF8B5CF6), // E - purple
  Color(0xFFEC4899), // F - pink
  Color(0xFF06B6D4), // G - cyan
  Color(0xFFF97316), // H - orange
];

/// Groups Management Screen
/// Allows admins to assign teams to groups for group_knockout tournaments
class GroupsManagementScreen extends StatefulWidget {
  final TournamentEntity tournament;

  const GroupsManagementScreen({
    super.key,
    required this.tournament,
  });

  @override
  State<GroupsManagementScreen> createState() => _GroupsManagementScreenState();
}

class _GroupsManagementScreenState extends State<GroupsManagementScreen> {
  final TeamRepository _teamRepo = sl<TeamRepository>();
  List<TeamEntity> _teams = [];
  bool _isLoading = true;
  String? _error;
  bool _isSaving = false;

  int get _numberOfGroups => widget.tournament.numberOfGroups ?? 4;

  List<String> get _groupNames =>
      List.generate(_numberOfGroups, (i) => String.fromCharCode(65 + i));

  @override
  void initState() {
    super.initState();
    _loadTeams();
  }

  Future<void> _loadTeams() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    final result = await _teamRepo.getTeamsByTournamentId(
      widget.tournament.id,
      onlyActive: true,
    );

    result.fold(
      (failure) => setState(() {
        _error = failure.message;
        _isLoading = false;
      }),
      (teams) => setState(() {
        _teams = teams;
        _isLoading = false;
      }),
    );
  }

  List<TeamEntity> get _unassignedTeams =>
      _teams.where((t) => !t.isInGroup).toList();

  Map<String, List<TeamEntity>> get _groupedTeams {
    final map = <String, List<TeamEntity>>{};
    for (final group in _groupNames) {
      map[group] = _teams.where((t) => t.groupName == group).toList();
    }
    return map;
  }

  Future<void> _assignTeamToGroup(TeamEntity team, String? groupName) async {
    setState(() => _isSaving = true);

    final result = await _teamRepo.assignToTournament(
      team.id,
      widget.tournament.id,
      groupName: groupName,
    );

    result.fold(
      (failure) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Error: ${failure.message}'),
              backgroundColor: _SN.error,
            ),
          );
        }
      },
      (_) {},
    );

    // Reload to get fresh data
    await _loadTeams();
    setState(() => _isSaving = false);
  }

  Future<void> _autoDistribute() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: _SN.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Distribuci\u00f3n autom\u00e1tica',
            style: TextStyle(color: _SN.textPrimary)),
        content: Text(
          'Se redistribuir\u00e1n todos los equipos aleatoriamente en ${_numberOfGroups} grupos. \u00bfContinuar?',
          style: const TextStyle(color: _SN.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child:
                const Text('Cancelar', style: TextStyle(color: _SN.textMuted)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: _SN.gold),
            child: const Text('Distribuir'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    setState(() => _isSaving = true);

    // Shuffle and distribute
    final shuffled = List<TeamEntity>.from(_teams)..shuffle(Random());

    for (int i = 0; i < shuffled.length; i++) {
      final groupIndex = i % _numberOfGroups;
      final groupName = String.fromCharCode(65 + groupIndex);
      await _teamRepo.assignToTournament(
        shuffled[i].id,
        widget.tournament.id,
        groupName: groupName,
      );
    }

    await _loadTeams();
    setState(() => _isSaving = false);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
              '${_teams.length} equipos distribuidos en $_numberOfGroups grupos'),
          backgroundColor: _SN.neonGreen.withValues(alpha: 0.8),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light,
      ),
    );

    return Scaffold(
      backgroundColor: _SN.bg,
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(),
            if (_isSaving)
              const LinearProgressIndicator(
                  color: _SN.gold, backgroundColor: _SN.surface),
            Expanded(child: _buildBody()),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.fromLTRB(8, 8, 16, 16),
      decoration: BoxDecoration(
        color: _SN.surface,
        border: Border(bottom: BorderSide(color: _SN.divider)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back, color: _SN.textPrimary),
                onPressed: () => Navigator.pop(context),
              ),
              const SizedBox(width: 4),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'GESTI\u00d3N DE GRUPOS',
                      style: GoogleFonts.bebasNeue(
                        color: _SN.gold,
                        fontSize: 22,
                        letterSpacing: 2,
                      ),
                    ),
                    Text(
                      '${widget.tournament.name} \u2022 $_numberOfGroups grupos',
                      style: const TextStyle(
                          color: _SN.textSecondary, fontSize: 13),
                    ),
                  ],
                ),
              ),
              // Auto-distribute button
              _buildActionButton(
                icon: Icons.shuffle,
                label: 'Auto',
                color: _SN.neonBlue,
                onTap: _isSaving ? null : _autoDistribute,
              ),
              const SizedBox(width: 8),
              // Refresh
              _buildActionButton(
                icon: Icons.refresh,
                label: 'Refrescar',
                color: _SN.textSecondary,
                onTap: _isSaving ? null : _loadTeams,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildActionButton({
    required IconData icon,
    required String label,
    required Color color,
    VoidCallback? onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: color.withValues(alpha: 0.3)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: 16),
            const SizedBox(width: 4),
            Text(label,
                style: TextStyle(color: color, fontSize: 11)),
          ],
        ),
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(
          child: CircularProgressIndicator(color: _SN.gold));
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, color: _SN.error, size: 48),
            const SizedBox(height: 16),
            Text(_error!,
                style: const TextStyle(color: _SN.textSecondary)),
            const SizedBox(height: 16),
            TextButton.icon(
              onPressed: _loadTeams,
              icon: const Icon(Icons.refresh, size: 18),
              label: const Text('Reintentar'),
              style: TextButton.styleFrom(foregroundColor: _SN.gold),
            ),
          ],
        ),
      );
    }

    if (_teams.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.groups,
                color: _SN.textMuted.withValues(alpha: 0.5), size: 64),
            const SizedBox(height: 16),
            Text(
              'Sin equipos en este torneo',
              style: GoogleFonts.bebasNeue(
                  color: _SN.textSecondary, fontSize: 20),
            ),
            const SizedBox(height: 8),
            const Text(
              'Agrega equipos al torneo primero',
              style: TextStyle(color: _SN.textMuted, fontSize: 13),
            ),
          ],
        ),
      );
    }

    final grouped = _groupedTeams;
    final unassigned = _unassignedTeams;

    return RefreshIndicator(
      color: _SN.gold,
      backgroundColor: _SN.surface,
      onRefresh: _loadTeams,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Summary chips
          _buildSummaryRow(grouped, unassigned),
          const SizedBox(height: 16),

          // Unassigned teams
          if (unassigned.isNotEmpty) ...[
            _buildSectionTitle(
                'SIN GRUPO (${unassigned.length})', _SN.textMuted),
            const SizedBox(height: 8),
            ...unassigned.map((t) => _buildTeamTile(t)),
            const SizedBox(height: 20),
          ],

          // Group cards
          for (int i = 0; i < _groupNames.length; i++) ...[
            _buildGroupCard(
              _groupNames[i],
              grouped[_groupNames[i]] ?? [],
              _groupColors[i % _groupColors.length],
            ),
            const SizedBox(height: 12),
          ],
        ],
      ),
    );
  }

  Widget _buildSummaryRow(
    Map<String, List<TeamEntity>> grouped,
    List<TeamEntity> unassigned,
  ) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          _buildChip('${_teams.length} equipos', _SN.textSecondary),
          const SizedBox(width: 8),
          if (unassigned.isNotEmpty)
            _buildChip('${unassigned.length} sin grupo', _SN.gold),
          if (unassigned.isNotEmpty) const SizedBox(width: 8),
          for (int i = 0; i < _groupNames.length; i++) ...[
            _buildChip(
              'Grupo ${_groupNames[i]}: ${(grouped[_groupNames[i]] ?? []).length}',
              _groupColors[i % _groupColors.length],
            ),
            if (i < _groupNames.length - 1) const SizedBox(width: 8),
          ],
        ],
      ),
    );
  }

  Widget _buildChip(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(text,
          style: TextStyle(color: color, fontSize: 11)),
    );
  }

  Widget _buildSectionTitle(String title, Color color) {
    return Text(
      title,
      style: GoogleFonts.bebasNeue(
        color: color,
        fontSize: 16,
        letterSpacing: 1.5,
      ),
    );
  }

  Widget _buildTeamTile(TeamEntity team) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: _SN.card,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: _SN.divider),
      ),
      child: Row(
        children: [
          // Team avatar
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: _SN.textMuted.withValues(alpha: 0.2),
            ),
            child: Center(
              child: Text(
                team.name.isNotEmpty ? team.name[0].toUpperCase() : '?',
                style: const TextStyle(
                    color: _SN.textPrimary,
                    fontWeight: FontWeight.bold,
                    fontSize: 14),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(team.name,
                style: const TextStyle(
                    color: _SN.textPrimary, fontSize: 14)),
          ),
          // Group selector dropdown
          _buildGroupDropdown(team),
        ],
      ),
    );
  }

  Widget _buildGroupDropdown(TeamEntity team) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8),
      decoration: BoxDecoration(
        color: _SN.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: _SN.divider),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String?>(
          value: team.groupName,
          hint: const Text('Grupo',
              style: TextStyle(color: _SN.textMuted, fontSize: 12)),
          dropdownColor: _SN.surface,
          style: const TextStyle(color: _SN.textPrimary, fontSize: 13),
          icon: const Icon(Icons.arrow_drop_down,
              color: _SN.textMuted, size: 18),
          isDense: true,
          items: [
            const DropdownMenuItem(
              value: null,
              child: Text('Sin grupo',
                  style: TextStyle(color: _SN.textMuted, fontSize: 12)),
            ),
            ..._groupNames.map((g) {
              final idx = g.codeUnitAt(0) - 65;
              final color = _groupColors[idx % _groupColors.length];
              return DropdownMenuItem(
                value: g,
                child: Text('Grupo $g',
                    style: TextStyle(color: color, fontSize: 12)),
              );
            }),
          ],
          onChanged: _isSaving
              ? null
              : (value) => _assignTeamToGroup(team, value),
        ),
      ),
    );
  }

  Widget _buildGroupCard(
      String groupName, List<TeamEntity> teams, Color color) {
    return Container(
      decoration: BoxDecoration(
        color: _SN.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Group header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.08),
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(13)),
            ),
            child: Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: color.withValues(alpha: 0.2),
                    border: Border.all(color: color, width: 1.5),
                  ),
                  child: Center(
                    child: Text(
                      groupName,
                      style: GoogleFonts.bebasNeue(
                          color: color, fontSize: 16),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Text(
                  'GRUPO $groupName',
                  style: GoogleFonts.bebasNeue(
                    color: color,
                    fontSize: 16,
                    letterSpacing: 1.5,
                  ),
                ),
                const Spacer(),
                Text(
                  '${teams.length} equipos',
                  style: TextStyle(
                      color: color.withValues(alpha: 0.7), fontSize: 12),
                ),
              ],
            ),
          ),

          // Teams list
          if (teams.isEmpty)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                'Sin equipos asignados',
                style: TextStyle(
                    color: _SN.textMuted.withValues(alpha: 0.6),
                    fontSize: 13,
                    fontStyle: FontStyle.italic),
              ),
            )
          else
            ...teams.map((team) => _buildGroupTeamItem(team, color)),
        ],
      ),
    );
  }

  Widget _buildGroupTeamItem(TeamEntity team, Color groupColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: _SN.divider)),
      ),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: groupColor.withValues(alpha: 0.15),
            ),
            child: Center(
              child: Text(
                team.name.isNotEmpty ? team.name[0].toUpperCase() : '?',
                style: TextStyle(
                    color: groupColor,
                    fontWeight: FontWeight.bold,
                    fontSize: 13),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(team.name,
                style: const TextStyle(
                    color: _SN.textPrimary, fontSize: 14)),
          ),
          // Remove from group
          GestureDetector(
            onTap: _isSaving
                ? null
                : () => _assignTeamToGroup(team, null),
            child: Icon(Icons.close,
                color: _SN.textMuted.withValues(alpha: 0.5), size: 18),
          ),
        ],
      ),
    );
  }
}
