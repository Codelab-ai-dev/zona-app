import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import '../../../core/di/injection.dart';
import '../../../domain/entities/match_entity.dart';
import '../../../domain/entities/team_entity.dart';
import '../../../domain/entities/tournament_entity.dart';
import '../../../domain/repositories/match_repository.dart';
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

/// Playoff Bracket Generator Screen
/// Generates knockout bracket matches for a tournament
class PlayoffBracketScreen extends StatefulWidget {
  final TournamentEntity tournament;

  const PlayoffBracketScreen({
    super.key,
    required this.tournament,
  });

  @override
  State<PlayoffBracketScreen> createState() => _PlayoffBracketScreenState();
}

class _PlayoffBracketScreenState extends State<PlayoffBracketScreen> {
  final TeamRepository _teamRepo = sl<TeamRepository>();
  final MatchRepository _matchRepo = sl<MatchRepository>();

  // Config
  int _bracketSize = 4; // 4 or 8 teams
  bool _thirdPlace = false;
  bool _twoLegs = false;
  int _fieldNumber = 1;
  DateTime _startDate = DateTime.now().add(const Duration(days: 1));
  TimeOfDay _startTime = const TimeOfDay(hour: 18, minute: 0);

  // State
  List<TeamEntity> _availableTeams = [];
  List<TeamEntity> _selectedTeams = [];
  bool _isLoading = true;
  bool _isSaving = false;
  String? _error;
  int _step = 0; // 0=config, 1=select teams, 2=preview

  // Generated bracket
  List<Map<String, dynamic>> _generatedMatches = [];

  @override
  void initState() {
    super.initState();
    _thirdPlace = widget.tournament.hasThirdPlaceMatch;
    _loadTeams();
  }

  Future<void> _loadTeams() async {
    setState(() => _isLoading = true);

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
        _availableTeams = teams;
        _isLoading = false;
      }),
    );
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
    final titles = ['CONFIGURACI\u00d3N', 'SELECCIONAR EQUIPOS', 'PREVIEW'];
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
                onPressed: () {
                  if (_step > 0) {
                    setState(() => _step--);
                  } else {
                    Navigator.pop(context);
                  }
                },
              ),
              const SizedBox(width: 4),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'GENERAR LIGUILLA',
                      style: GoogleFonts.bebasNeue(
                        color: _SN.gold,
                        fontSize: 22,
                        letterSpacing: 2,
                      ),
                    ),
                    Text(
                      '${widget.tournament.name} \u2022 ${titles[_step]}',
                      style: const TextStyle(
                          color: _SN.textSecondary, fontSize: 13),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Step indicator
          Row(
            children: List.generate(3, (i) {
              final isActive = i <= _step;
              return Expanded(
                child: Container(
                  height: 3,
                  margin: EdgeInsets.only(right: i < 2 ? 4 : 0),
                  decoration: BoxDecoration(
                    color: isActive ? _SN.gold : _SN.divider,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              );
            }),
          ),
        ],
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

    switch (_step) {
      case 0:
        return _buildConfigStep();
      case 1:
        return _buildTeamSelectionStep();
      case 2:
        return _buildPreviewStep();
      default:
        return const SizedBox.shrink();
    }
  }

  // ==================== Step 0: Config ====================

  Widget _buildConfigStep() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Bracket size
        _buildSectionLabel('Formato de liguilla'),
        const SizedBox(height: 8),
        Row(
          children: [
            _buildOptionChip(
              '4 equipos',
              'Semifinales + Final',
              _bracketSize == 4,
              () => setState(() => _bracketSize = 4),
            ),
            const SizedBox(width: 8),
            _buildOptionChip(
              '8 equipos',
              'Cuartos + Semis + Final',
              _bracketSize == 8,
              () => setState(() => _bracketSize = 8),
            ),
          ],
        ),
        const SizedBox(height: 20),

        // Options
        _buildSectionLabel('Opciones'),
        const SizedBox(height: 8),
        _buildSwitchTile(
          'Partido por 3er lugar',
          'Semifinalistas perdedores juegan por el 3er puesto',
          _thirdPlace,
          (v) => setState(() => _thirdPlace = v),
        ),
        const SizedBox(height: 8),
        _buildSwitchTile(
          'Ida y vuelta',
          'Dos partidos por llave (ida y vuelta)',
          _twoLegs,
          (v) => setState(() => _twoLegs = v),
        ),
        const SizedBox(height: 20),

        // Date & time
        _buildSectionLabel('Fecha y hora de inicio'),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(child: _buildDatePicker()),
            const SizedBox(width: 12),
            Expanded(child: _buildTimePicker()),
          ],
        ),
        const SizedBox(height: 16),

        // Field number
        _buildSectionLabel('Cancha'),
        const SizedBox(height: 8),
        Row(
          children: List.generate(4, (i) {
            final num = i + 1;
            final selected = _fieldNumber == num;
            return Padding(
              padding: EdgeInsets.only(right: i < 3 ? 8 : 0),
              child: GestureDetector(
                onTap: () => setState(() => _fieldNumber = num),
                child: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: selected
                        ? _SN.gold.withValues(alpha: 0.15)
                        : _SN.card,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: selected ? _SN.gold : _SN.divider,
                    ),
                  ),
                  child: Center(
                    child: Text(
                      '$num',
                      style: TextStyle(
                        color: selected ? _SN.gold : _SN.textSecondary,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ),
            );
          }),
        ),
        const SizedBox(height: 32),

        // Next button
        SizedBox(
          width: double.infinity,
          height: 52,
          child: ElevatedButton(
            onPressed: _availableTeams.length >= _bracketSize
                ? () => setState(() => _step = 1)
                : null,
            style: ElevatedButton.styleFrom(
              backgroundColor: _SN.gold,
              foregroundColor: Colors.black,
              disabledBackgroundColor: _SN.gold.withValues(alpha: 0.3),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
            child: Text(
              'SELECCIONAR EQUIPOS',
              style: GoogleFonts.bebasNeue(fontSize: 18, letterSpacing: 1.5),
            ),
          ),
        ),
        if (_availableTeams.length < _bracketSize)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              'Necesitas al menos $_bracketSize equipos (hay ${_availableTeams.length})',
              style: const TextStyle(color: _SN.error, fontSize: 12),
              textAlign: TextAlign.center,
            ),
          ),
      ],
    );
  }

  Widget _buildOptionChip(
      String title, String subtitle, bool selected, VoidCallback onTap) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: selected ? _SN.gold.withValues(alpha: 0.1) : _SN.card,
            borderRadius: BorderRadius.circular(12),
            border:
                Border.all(color: selected ? _SN.gold : _SN.divider),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title,
                  style: TextStyle(
                    color: selected ? _SN.gold : _SN.textPrimary,
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  )),
              const SizedBox(height: 2),
              Text(subtitle,
                  style: TextStyle(
                    color: selected
                        ? _SN.gold.withValues(alpha: 0.7)
                        : _SN.textMuted,
                    fontSize: 11,
                  )),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSwitchTile(
      String title, String subtitle, bool value, ValueChanged<bool> onChanged) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: _SN.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _SN.divider),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: const TextStyle(
                        color: _SN.textPrimary, fontSize: 14)),
                Text(subtitle,
                    style:
                        const TextStyle(color: _SN.textMuted, fontSize: 11)),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeColor: _SN.gold,
          ),
        ],
      ),
    );
  }

  Widget _buildDatePicker() {
    return GestureDetector(
      onTap: () async {
        final picked = await showDatePicker(
          context: context,
          initialDate: _startDate,
          firstDate: DateTime.now(),
          lastDate: DateTime.now().add(const Duration(days: 365)),
          builder: (ctx, child) => Theme(
            data: ThemeData.dark().copyWith(
              colorScheme: const ColorScheme.dark(primary: _SN.gold),
            ),
            child: child!,
          ),
        );
        if (picked != null) setState(() => _startDate = picked);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        decoration: BoxDecoration(
          color: _SN.card,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: _SN.divider),
        ),
        child: Row(
          children: [
            const Icon(Icons.calendar_today, color: _SN.textMuted, size: 18),
            const SizedBox(width: 8),
            Text(
              DateFormat('dd/MM/yyyy').format(_startDate),
              style:
                  const TextStyle(color: _SN.textPrimary, fontSize: 14),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTimePicker() {
    return GestureDetector(
      onTap: () async {
        final picked = await showTimePicker(
          context: context,
          initialTime: _startTime,
          builder: (ctx, child) => Theme(
            data: ThemeData.dark().copyWith(
              colorScheme: const ColorScheme.dark(primary: _SN.gold),
            ),
            child: child!,
          ),
        );
        if (picked != null) setState(() => _startTime = picked);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        decoration: BoxDecoration(
          color: _SN.card,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: _SN.divider),
        ),
        child: Row(
          children: [
            const Icon(Icons.access_time, color: _SN.textMuted, size: 18),
            const SizedBox(width: 8),
            Text(
              _startTime.format(context),
              style:
                  const TextStyle(color: _SN.textPrimary, fontSize: 14),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionLabel(String label) {
    return Text(
      label,
      style: GoogleFonts.bebasNeue(
        color: _SN.textSecondary,
        fontSize: 14,
        letterSpacing: 1,
      ),
    );
  }

  // ==================== Step 1: Team Selection ====================

  Widget _buildTeamSelectionStep() {
    return Column(
      children: [
        // Selection count
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          color: _SN.surface,
          child: Row(
            children: [
              Text(
                'Selecciona $_bracketSize equipos (${_selectedTeams.length}/$_bracketSize)',
                style: TextStyle(
                  color: _selectedTeams.length == _bracketSize
                      ? _SN.neonGreen
                      : _SN.textSecondary,
                  fontSize: 13,
                ),
              ),
              const Spacer(),
              if (_selectedTeams.isNotEmpty)
                GestureDetector(
                  onTap: () => setState(() => _selectedTeams.clear()),
                  child: const Text('Limpiar',
                      style: TextStyle(color: _SN.error, fontSize: 12)),
                ),
            ],
          ),
        ),
        // Team list
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _availableTeams.length,
            itemBuilder: (context, index) {
              final team = _availableTeams[index];
              final isSelected = _selectedTeams.contains(team);
              final seedNumber = isSelected
                  ? _selectedTeams.indexOf(team) + 1
                  : null;

              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                decoration: BoxDecoration(
                  color: isSelected
                      ? _SN.gold.withValues(alpha: 0.08)
                      : _SN.card,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: isSelected ? _SN.gold : _SN.divider,
                  ),
                ),
                child: ListTile(
                  dense: true,
                  leading: Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: isSelected
                          ? _SN.gold.withValues(alpha: 0.2)
                          : _SN.surface,
                    ),
                    child: Center(
                      child: Text(
                        seedNumber != null
                            ? '$seedNumber'
                            : team.name.isNotEmpty
                                ? team.name[0]
                                : '?',
                        style: TextStyle(
                          color: isSelected ? _SN.gold : _SN.textSecondary,
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                    ),
                  ),
                  title: Text(team.name,
                      style: const TextStyle(
                          color: _SN.textPrimary, fontSize: 14)),
                  subtitle: team.isInGroup
                      ? Text(team.groupDisplayText,
                          style: const TextStyle(
                              color: _SN.textMuted, fontSize: 11))
                      : null,
                  trailing: isSelected
                      ? const Icon(Icons.check_circle, color: _SN.gold)
                      : const Icon(Icons.radio_button_unchecked,
                          color: _SN.textMuted),
                  onTap: () {
                    setState(() {
                      if (isSelected) {
                        _selectedTeams.remove(team);
                      } else if (_selectedTeams.length < _bracketSize) {
                        _selectedTeams.add(team);
                      }
                    });
                  },
                ),
              );
            },
          ),
        ),
        // Next button
        Padding(
          padding: const EdgeInsets.all(16),
          child: SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton(
              onPressed: _selectedTeams.length == _bracketSize
                  ? () {
                      _generateBracket();
                      setState(() => _step = 2);
                    }
                  : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: _SN.gold,
                foregroundColor: Colors.black,
                disabledBackgroundColor: _SN.gold.withValues(alpha: 0.3),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: Text(
                'GENERAR LIGUILLA',
                style:
                    GoogleFonts.bebasNeue(fontSize: 18, letterSpacing: 1.5),
              ),
            ),
          ),
        ),
      ],
    );
  }

  // ==================== Generate Bracket ====================

  void _generateBracket() {
    _generatedMatches.clear();
    final teams = List<TeamEntity>.from(_selectedTeams);

    final timeStr =
        '${_startTime.hour.toString().padLeft(2, '0')}:${_startTime.minute.toString().padLeft(2, '0')}';

    int dayOffset = 0;
    int position = 1;

    if (_bracketSize == 8) {
      // Quarterfinals: 1v8, 4v5, 2v7, 3v6
      final qfPairs = [
        [0, 7],
        [3, 4],
        [1, 6],
        [2, 5],
      ];
      for (final pair in qfPairs) {
        _addMatch(
          teams[pair[0]],
          teams[pair[1]],
          PlayoffRound.quarterfinals,
          position++,
          dayOffset,
          timeStr,
          MatchLeg.first,
        );
      }
      if (_twoLegs) {
        dayOffset += 3;
        position = 1;
        for (final pair in qfPairs) {
          _addMatch(
            teams[pair[1]],
            teams[pair[0]],
            PlayoffRound.quarterfinals,
            position++,
            dayOffset,
            timeStr,
            MatchLeg.second,
          );
        }
      }
      dayOffset += 4;
      position = 1;

      // Semifinals (TBD - use first two teams as placeholder)
      for (int i = 0; i < 2; i++) {
        _addMatch(
          teams[0],
          teams[1],
          PlayoffRound.semifinals,
          position++,
          dayOffset,
          timeStr,
          _twoLegs ? MatchLeg.first : null,
        );
      }
      if (_twoLegs) {
        dayOffset += 3;
        position = 1;
        for (int i = 0; i < 2; i++) {
          _addMatch(
            teams[1],
            teams[0],
            PlayoffRound.semifinals,
            position++,
            dayOffset,
            timeStr,
            MatchLeg.second,
          );
        }
      }
    } else {
      // 4 teams: Semifinals: 1v4, 2v3
      final sfPairs = [
        [0, 3],
        [1, 2],
      ];
      for (final pair in sfPairs) {
        _addMatch(
          teams[pair[0]],
          teams[pair[1]],
          PlayoffRound.semifinals,
          position++,
          dayOffset,
          timeStr,
          _twoLegs ? MatchLeg.first : null,
        );
      }
      if (_twoLegs) {
        dayOffset += 3;
        position = 1;
        for (final pair in sfPairs) {
          _addMatch(
            teams[pair[1]],
            teams[pair[0]],
            PlayoffRound.semifinals,
            position++,
            dayOffset,
            timeStr,
            MatchLeg.second,
          );
        }
      }
    }

    // Third place
    dayOffset += 4;
    if (_thirdPlace) {
      _addMatch(
        teams[0],
        teams[1],
        PlayoffRound.thirdPlace,
        1,
        dayOffset,
        timeStr,
        null,
      );
    }

    // Final
    _addMatch(
      teams[0],
      teams[1],
      PlayoffRound.final_,
      1,
      dayOffset + (_thirdPlace ? 1 : 0),
      timeStr,
      _twoLegs ? MatchLeg.first : null,
    );
    if (_twoLegs) {
      _addMatch(
        teams[1],
        teams[0],
        PlayoffRound.final_,
        1,
        dayOffset + (_thirdPlace ? 4 : 3),
        timeStr,
        MatchLeg.second,
      );
    }
  }

  void _addMatch(
    TeamEntity home,
    TeamEntity away,
    PlayoffRound round,
    int position,
    int dayOffset,
    String time,
    MatchLeg? leg,
  ) {
    final matchDate = _startDate.add(Duration(days: dayOffset));
    _generatedMatches.add({
      'tournament_id': widget.tournament.id,
      'home_team_id': home.id,
      'away_team_id': away.id,
      'match_date': DateFormat('yyyy-MM-dd').format(matchDate),
      'match_time': time,
      'field_number': _fieldNumber,
      'status': 'scheduled',
      'phase': 'playoffs',
      'playoff_round': round.toDbString(),
      'playoff_position': position,
      if (leg != null) 'leg': leg == MatchLeg.first ? 'first' : 'second',
    });
  }

  // ==================== Step 2: Preview ====================

  Widget _buildPreviewStep() {
    // Group matches by round
    final rounds = <String, List<Map<String, dynamic>>>{};
    for (final m in _generatedMatches) {
      final key = m['playoff_round'] as String;
      final leg = m['leg'] as String?;
      final roundKey = leg != null ? '$key ($leg)' : key;
      rounds.putIfAbsent(roundKey, () => []).add(m);
    }

    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Summary
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: _SN.gold.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: _SN.gold.withValues(alpha: 0.3)),
                ),
                child: Column(
                  children: [
                    Text(
                      'LIGUILLA',
                      style: GoogleFonts.bebasNeue(
                          color: _SN.gold, fontSize: 20, letterSpacing: 2),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${_generatedMatches.length} partidos \u2022 ${_bracketSize} equipos${_twoLegs ? ' \u2022 Ida y vuelta' : ''}${_thirdPlace ? ' \u2022 3er lugar' : ''}',
                      style: const TextStyle(
                          color: _SN.textSecondary, fontSize: 12),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Rounds
              for (final entry in rounds.entries) ...[
                _buildRoundHeader(entry.key),
                const SizedBox(height: 8),
                ...entry.value.map((m) => _buildPreviewMatch(m)),
                const SizedBox(height: 16),
              ],
            ],
          ),
        ),

        // Save button
        Padding(
          padding: const EdgeInsets.all(16),
          child: SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton.icon(
              onPressed: _isSaving ? null : _saveBracket,
              icon: _isSaving
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.black),
                    )
                  : const Icon(Icons.save, size: 20),
              label: Text(
                _isSaving ? 'GUARDANDO...' : 'GUARDAR LIGUILLA',
                style:
                    GoogleFonts.bebasNeue(fontSize: 18, letterSpacing: 1.5),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: _SN.neonGreen,
                foregroundColor: Colors.black,
                disabledBackgroundColor: _SN.neonGreen.withValues(alpha: 0.3),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildRoundHeader(String roundKey) {
    final displayMap = {
      'quarterfinals': 'CUARTOS DE FINAL',
      'quarterfinals (first)': 'CUARTOS DE FINAL - IDA',
      'quarterfinals (second)': 'CUARTOS DE FINAL - VUELTA',
      'semifinals': 'SEMIFINALES',
      'semifinals (first)': 'SEMIFINALES - IDA',
      'semifinals (second)': 'SEMIFINALES - VUELTA',
      'third_place': 'TERCER LUGAR',
      'final': 'FINAL',
      'final (first)': 'FINAL - IDA',
      'final (second)': 'FINAL - VUELTA',
    };

    return Row(
      children: [
        const Icon(Icons.emoji_events, color: _SN.gold, size: 18),
        const SizedBox(width: 8),
        Text(
          displayMap[roundKey] ?? roundKey.toUpperCase(),
          style: GoogleFonts.bebasNeue(
            color: _SN.gold,
            fontSize: 16,
            letterSpacing: 1.5,
          ),
        ),
      ],
    );
  }

  Widget _buildPreviewMatch(Map<String, dynamic> match) {
    final homeId = match['home_team_id'] as String;
    final awayId = match['away_team_id'] as String;
    final home = _selectedTeams.firstWhere((t) => t.id == homeId,
        orElse: () => _availableTeams.first);
    final away = _selectedTeams.firstWhere((t) => t.id == awayId,
        orElse: () => _availableTeams.last);
    final date = match['match_date'] as String;
    final time = match['match_time'] as String;
    final field = match['field_number'];

    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: _SN.card,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: _SN.divider),
      ),
      child: Row(
        children: [
          // Home
          Expanded(
            child: Text(
              home.name,
              style: const TextStyle(color: _SN.textPrimary, fontSize: 13),
              textAlign: TextAlign.right,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10),
            child: Text('vs',
                style: TextStyle(
                    color: _SN.gold.withValues(alpha: 0.7), fontSize: 12)),
          ),
          // Away
          Expanded(
            child: Text(
              away.name,
              style: const TextStyle(color: _SN.textPrimary, fontSize: 13),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(width: 8),
          // Date & field
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(date,
                  style:
                      const TextStyle(color: _SN.textMuted, fontSize: 10)),
              Text('$time \u2022 Cancha $field',
                  style:
                      const TextStyle(color: _SN.textMuted, fontSize: 10)),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _saveBracket() async {
    setState(() => _isSaving = true);

    final result = await _matchRepo.createMatches(_generatedMatches);

    result.fold(
      (failure) {
        setState(() => _isSaving = false);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Error: ${failure.message}'),
              backgroundColor: _SN.error,
            ),
          );
        }
      },
      (matches) {
        setState(() => _isSaving = false);
        if (mounted) {
          showDialog(
            context: context,
            builder: (ctx) => AlertDialog(
              backgroundColor: _SN.surface,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16)),
              title: Row(
                children: [
                  const Icon(Icons.emoji_events, color: _SN.gold),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text('Liguilla creada',
                        style: TextStyle(color: _SN.textPrimary)),
                  ),
                ],
              ),
              content: Text(
                'Se crearon ${matches.length} partidos de liguilla exitosamente.',
                style: const TextStyle(color: _SN.textSecondary),
              ),
              actions: [
                TextButton(
                  onPressed: () {
                    Navigator.pop(ctx);
                    Navigator.pop(context);
                  },
                  style: TextButton.styleFrom(foregroundColor: _SN.gold),
                  child: const Text('CERRAR'),
                ),
              ],
            ),
          );
        }
      },
    );
  }
}
