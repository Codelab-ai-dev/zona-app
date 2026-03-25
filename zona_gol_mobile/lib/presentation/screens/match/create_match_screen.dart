import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import '../../../core/di/injection.dart';
import '../../../domain/entities/team_entity.dart';
import '../../../domain/entities/tournament_entity.dart';
import '../../bloc/match/match_bloc.dart';
import '../../bloc/match/match_event.dart';
import '../../bloc/match/match_state.dart';
import '../../bloc/team/team_bloc.dart';
import '../../bloc/team/team_event.dart';
import '../../bloc/team/team_state.dart';
import '../../bloc/tournament/tournament_bloc.dart';
import '../../bloc/tournament/tournament_event.dart';
import '../../bloc/tournament/tournament_state.dart';

/// Stadium Nights Design System
class _SN {
  static const Color backgroundDark = Color(0xFF050508);
  static const Color surfaceDark = Color(0xFF0A0A0F);
  static const Color cardDark = Color(0xFF12121A);
  static const Color gold = Color(0xFFFFD700);
  static const Color neonGreen = Color(0xFF00FF7F);
  static const Color success = Color(0xFF10B981);
  static const Color error = Color(0xFFEF4444);
  static const Color textPrimary = Color(0xFFFAFAFA);
  static const Color textSecondary = Color(0xFF9CA3AF);
  static const Color textMuted = Color(0xFF6B7280);
}

/// Create Match Screen
/// Allows league admins to schedule individual matches
class CreateMatchScreen extends StatelessWidget {
  final String leagueId;

  const CreateMatchScreen({
    super.key,
    required this.leagueId,
  });

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(
          create: (_) => sl<TournamentBloc>()
            ..add(LoadTournamentsByLeagueEvent(leagueId: leagueId)),
        ),
        BlocProvider(create: (_) => sl<TeamBloc>()),
        BlocProvider(create: (_) => sl<MatchBloc>()),
      ],
      child: const _CreateMatchView(),
    );
  }
}

class _CreateMatchView extends StatefulWidget {
  const _CreateMatchView();

  @override
  State<_CreateMatchView> createState() => _CreateMatchViewState();
}

class _CreateMatchViewState extends State<_CreateMatchView> {
  final _formKey = GlobalKey<FormState>();

  // Form state
  TournamentEntity? _selectedTournament;
  TeamEntity? _homeTeam;
  TeamEntity? _awayTeam;
  DateTime _matchDate = DateTime.now().add(const Duration(days: 1));
  TimeOfDay? _matchTime;
  int? _fieldNumber;
  int? _round;

  // Teams loaded for selected tournament
  List<TeamEntity> _availableTeams = [];

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
        body: BlocConsumer<MatchBloc, MatchState>(
          listener: (context, state) {
            if (state is MatchCreated) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(state.message),
                  backgroundColor: _SN.success,
                ),
              );
              Navigator.pop(context, true);
            } else if (state is MatchError) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(state.message),
                  backgroundColor: _SN.error,
                ),
              );
            }
          },
          builder: (context, matchState) {
            final isLoading = matchState is MatchLoading;
            return Stack(
              children: [
                _buildForm(context),
                if (isLoading)
                  Container(
                    color: Colors.black.withOpacity(0.5),
                    child: const Center(
                      child: CircularProgressIndicator(
                        valueColor: AlwaysStoppedAnimation<Color>(_SN.gold),
                      ),
                    ),
                  ),
              ],
            );
          },
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
            border: Border.all(color: _SN.gold.withOpacity(0.2)),
          ),
          child: const Icon(Icons.arrow_back, color: _SN.gold, size: 18),
        ),
        onPressed: () => Navigator.pop(context),
      ),
      title: Text(
        'PROGRAMAR PARTIDO',
        style: GoogleFonts.bebasNeue(
          fontSize: 22,
          color: _SN.textPrimary,
          letterSpacing: 2,
        ),
      ),
      centerTitle: true,
    );
  }

  Widget _buildForm(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Tournament selector
            _buildLabel('Torneo *'),
            const SizedBox(height: 8),
            _buildTournamentSelector(),
            const SizedBox(height: 20),

            // Home team
            _buildLabel('Equipo Local *'),
            const SizedBox(height: 8),
            _buildTeamSelector(
              value: _homeTeam,
              hint: 'Seleccionar equipo local',
              excludeTeam: _awayTeam,
              onChanged: (team) => setState(() => _homeTeam = team),
            ),
            const SizedBox(height: 20),

            // Away team
            _buildLabel('Equipo Visitante *'),
            const SizedBox(height: 8),
            _buildTeamSelector(
              value: _awayTeam,
              hint: 'Seleccionar equipo visitante',
              excludeTeam: _homeTeam,
              onChanged: (team) => setState(() => _awayTeam = team),
            ),
            const SizedBox(height: 20),

            // Date
            _buildLabel('Fecha *'),
            const SizedBox(height: 8),
            _buildDatePicker(),
            const SizedBox(height: 20),

            // Time
            _buildLabel('Hora'),
            const SizedBox(height: 8),
            _buildTimePicker(),
            const SizedBox(height: 20),

            // Field and Round row
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildLabel('Cancha'),
                      const SizedBox(height: 8),
                      _buildNumberField(
                        value: _fieldNumber,
                        hint: 'Ej: 1',
                        icon: Icons.stadium,
                        onChanged: (v) => setState(() => _fieldNumber = v),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildLabel('Jornada'),
                      const SizedBox(height: 8),
                      _buildNumberField(
                        value: _round,
                        hint: 'Ej: 5',
                        icon: Icons.format_list_numbered,
                        onChanged: (v) => setState(() => _round = v),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 32),

            // Match preview
            if (_homeTeam != null && _awayTeam != null)
              _buildMatchPreview(),
            if (_homeTeam != null && _awayTeam != null)
              const SizedBox(height: 24),

            // Submit button
            _buildSubmitButton(context),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Text(
      text.toUpperCase(),
      style: GoogleFonts.bebasNeue(
        fontSize: 14,
        color: _SN.gold,
        letterSpacing: 1.5,
      ),
    );
  }

  // ==================== Tournament Selector ====================

  Widget _buildTournamentSelector() {
    return BlocConsumer<TournamentBloc, TournamentState>(
      listener: (context, state) {
        if (state is TournamentsLoaded && state.tournaments.isNotEmpty) {
          // Auto-select active tournament
          if (_selectedTournament == null) {
            final active = state.tournaments.firstWhere(
              (t) => t.isActive,
              orElse: () => state.tournaments.first,
            );
            _onTournamentSelected(active);
          }
        }
      },
      builder: (context, state) {
        if (state is TournamentLoading) {
          return _buildLoadingField('Cargando torneos...');
        }

        if (state is TournamentsLoaded) {
          return _buildDropdownContainer(
            child: DropdownButtonHideUnderline(
              child: DropdownButton<TournamentEntity>(
                value: _selectedTournament,
                isExpanded: true,
                dropdownColor: _SN.cardDark,
                icon: const Icon(Icons.keyboard_arrow_down, color: _SN.gold),
                hint: _buildDropdownHint(Icons.emoji_events, 'Seleccionar torneo'),
                items: state.tournaments.map((t) {
                  return DropdownMenuItem(
                    value: t,
                    child: Text(
                      t.name,
                      style: GoogleFonts.outfit(color: _SN.textPrimary, fontSize: 14),
                      overflow: TextOverflow.ellipsis,
                    ),
                  );
                }).toList(),
                onChanged: (t) {
                  if (t != null) _onTournamentSelected(t);
                },
              ),
            ),
          );
        }

        return _buildLoadingField('Sin torneos disponibles');
      },
    );
  }

  void _onTournamentSelected(TournamentEntity tournament) {
    setState(() {
      _selectedTournament = tournament;
      _homeTeam = null;
      _awayTeam = null;
      _availableTeams = [];
    });
    // Load teams for this tournament
    context.read<TeamBloc>().add(
      LoadTeamsByTournamentEvent(tournamentId: tournament.id),
    );
  }

  // ==================== Team Selectors ====================

  Widget _buildTeamSelector({
    required TeamEntity? value,
    required String hint,
    required TeamEntity? excludeTeam,
    required ValueChanged<TeamEntity?> onChanged,
  }) {
    return BlocBuilder<TeamBloc, TeamState>(
      builder: (context, state) {
        if (state is TeamLoading) {
          return _buildLoadingField('Cargando equipos...');
        }

        if (state is TeamsLoaded) {
          // Cache teams
          if (_availableTeams.isEmpty) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              setState(() => _availableTeams = state.teams);
            });
          }
        }

        final teams = _availableTeams
            .where((t) => excludeTeam == null || t.id != excludeTeam.id)
            .toList();

        if (_selectedTournament == null) {
          return _buildDisabledField('Selecciona un torneo primero');
        }

        if (teams.isEmpty && _availableTeams.isEmpty) {
          return _buildDisabledField('Sin equipos en este torneo');
        }

        return _buildDropdownContainer(
          child: DropdownButtonHideUnderline(
            child: DropdownButton<TeamEntity>(
              value: value,
              isExpanded: true,
              dropdownColor: _SN.cardDark,
              icon: const Icon(Icons.keyboard_arrow_down, color: _SN.gold),
              hint: _buildDropdownHint(Icons.shield, hint),
              items: teams.map((t) {
                return DropdownMenuItem(
                  value: t,
                  child: Row(
                    children: [
                      Container(
                        width: 24,
                        height: 24,
                        decoration: BoxDecoration(
                          color: _SN.gold.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Icon(Icons.shield, size: 14, color: _SN.gold.withOpacity(0.6)),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          t.name,
                          style: GoogleFonts.outfit(color: _SN.textPrimary, fontSize: 14),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
              onChanged: onChanged,
            ),
          ),
        );
      },
    );
  }

  // ==================== Date & Time Pickers ====================

  Widget _buildDatePicker() {
    return GestureDetector(
      onTap: _selectDate,
      child: _buildPickerContainer(
        icon: Icons.calendar_today,
        text: DateFormat('EEEE dd/MM/yyyy', 'es').format(_matchDate),
        hasValue: true,
      ),
    );
  }

  Future<void> _selectDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _matchDate,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: const ColorScheme.dark(
            primary: _SN.gold,
            onPrimary: Colors.black,
            surface: _SN.cardDark,
            onSurface: _SN.textPrimary,
          ),
        ),
        child: child!,
      ),
    );
    if (picked != null) {
      setState(() => _matchDate = picked);
    }
  }

  Widget _buildTimePicker() {
    return GestureDetector(
      onTap: _selectTime,
      child: _buildPickerContainer(
        icon: Icons.access_time,
        text: _matchTime != null
            ? _matchTime!.format(context)
            : 'Seleccionar hora',
        hasValue: _matchTime != null,
        trailing: _matchTime != null
            ? GestureDetector(
                onTap: () => setState(() => _matchTime = null),
                child: const Icon(Icons.clear, color: _SN.textMuted, size: 18),
              )
            : null,
      ),
    );
  }

  Future<void> _selectTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _matchTime ?? const TimeOfDay(hour: 10, minute: 0),
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: const ColorScheme.dark(
            primary: _SN.gold,
            onPrimary: Colors.black,
            surface: _SN.cardDark,
            onSurface: _SN.textPrimary,
          ),
        ),
        child: child!,
      ),
    );
    if (picked != null) {
      setState(() => _matchTime = picked);
    }
  }

  // ==================== Number Field ====================

  Widget _buildNumberField({
    required int? value,
    required String hint,
    required IconData icon,
    required ValueChanged<int?> onChanged,
  }) {
    return _buildDropdownContainer(
      child: Row(
        children: [
          Icon(icon, color: _SN.gold.withOpacity(0.7), size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: TextFormField(
              initialValue: value?.toString(),
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              style: GoogleFonts.outfit(color: _SN.textPrimary),
              decoration: InputDecoration(
                hintText: hint,
                hintStyle: GoogleFonts.outfit(color: _SN.textMuted),
                border: InputBorder.none,
                isDense: true,
                contentPadding: EdgeInsets.zero,
              ),
              onChanged: (v) => onChanged(v.isNotEmpty ? int.tryParse(v) : null),
            ),
          ),
        ],
      ),
    );
  }

  // ==================== Match Preview ====================

  Widget _buildMatchPreview() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: _SN.cardDark,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _SN.gold.withOpacity(0.2)),
      ),
      child: Column(
        children: [
          Text(
            'VISTA PREVIA',
            style: GoogleFonts.bebasNeue(
              fontSize: 14,
              color: _SN.textMuted,
              letterSpacing: 2,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              // Home team
              Expanded(
                child: Column(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: _SN.gold.withOpacity(0.1),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(Icons.shield, color: _SN.gold.withOpacity(0.5), size: 24),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _homeTeam?.name ?? '',
                      style: GoogleFonts.outfit(
                        fontSize: 13,
                        color: _SN.textPrimary,
                        fontWeight: FontWeight.w500,
                      ),
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              // VS
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Text(
                  'VS',
                  style: GoogleFonts.bebasNeue(
                    fontSize: 24,
                    color: _SN.gold,
                    letterSpacing: 2,
                  ),
                ),
              ),
              // Away team
              Expanded(
                child: Column(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: _SN.gold.withOpacity(0.1),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(Icons.shield, color: _SN.gold.withOpacity(0.5), size: 24),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _awayTeam?.name ?? '',
                      style: GoogleFonts.outfit(
                        fontSize: 13,
                        color: _SN.textPrimary,
                        fontWeight: FontWeight.w500,
                      ),
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Date & time info
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.calendar_today, size: 14, color: _SN.textMuted),
              const SizedBox(width: 6),
              Text(
                DateFormat('dd/MM/yyyy').format(_matchDate),
                style: GoogleFonts.outfit(fontSize: 12, color: _SN.textSecondary),
              ),
              if (_matchTime != null) ...[
                const SizedBox(width: 12),
                Icon(Icons.access_time, size: 14, color: _SN.textMuted),
                const SizedBox(width: 6),
                Text(
                  _matchTime!.format(context),
                  style: GoogleFonts.outfit(fontSize: 12, color: _SN.textSecondary),
                ),
              ],
              if (_fieldNumber != null) ...[
                const SizedBox(width: 12),
                Icon(Icons.stadium, size: 14, color: _SN.textMuted),
                const SizedBox(width: 6),
                Text(
                  'Cancha $_fieldNumber',
                  style: GoogleFonts.outfit(fontSize: 12, color: _SN.textSecondary),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  // ==================== Submit ====================

  Widget _buildSubmitButton(BuildContext context) {
    final isValid = _selectedTournament != null &&
        _homeTeam != null &&
        _awayTeam != null;

    return ElevatedButton(
      onPressed: isValid ? () => _submit(context) : null,
      style: ElevatedButton.styleFrom(
        backgroundColor: _SN.neonGreen,
        foregroundColor: Colors.black,
        disabledBackgroundColor: _SN.textMuted.withOpacity(0.3),
        padding: const EdgeInsets.symmetric(vertical: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        elevation: 0,
      ),
      child: Text(
        'PROGRAMAR PARTIDO',
        style: GoogleFonts.bebasNeue(fontSize: 18, letterSpacing: 2),
      ),
    );
  }

  void _submit(BuildContext context) {
    if (_selectedTournament == null || _homeTeam == null || _awayTeam == null) return;

    // Validate same team
    if (_homeTeam!.id == _awayTeam!.id) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('El equipo local y visitante no pueden ser el mismo'),
          backgroundColor: _SN.error,
        ),
      );
      return;
    }

    // Format time as HH:mm
    String? matchTime;
    if (_matchTime != null) {
      matchTime = '${_matchTime!.hour.toString().padLeft(2, '0')}:${_matchTime!.minute.toString().padLeft(2, '0')}';
    }

    context.read<MatchBloc>().add(
      CreateMatchEvent(
        tournamentId: _selectedTournament!.id,
        homeTeamId: _homeTeam!.id,
        awayTeamId: _awayTeam!.id,
        matchDate: _matchDate,
        matchTime: matchTime,
        fieldNumber: _fieldNumber,
        round: _round,
      ),
    );
  }

  // ==================== Shared Widgets ====================

  Widget _buildDropdownContainer({required Widget child}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: _SN.cardDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _SN.gold.withOpacity(0.15)),
      ),
      child: child,
    );
  }

  Widget _buildPickerContainer({
    required IconData icon,
    required String text,
    required bool hasValue,
    Widget? trailing,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: _SN.cardDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _SN.gold.withOpacity(0.15)),
      ),
      child: Row(
        children: [
          Icon(icon, color: _SN.gold.withOpacity(0.7), size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: GoogleFonts.outfit(
                color: hasValue ? _SN.textPrimary : _SN.textMuted,
              ),
            ),
          ),
          if (trailing != null) trailing,
        ],
      ),
    );
  }

  Widget _buildDropdownHint(IconData icon, String text) {
    return Row(
      children: [
        Icon(icon, size: 18, color: _SN.gold.withOpacity(0.5)),
        const SizedBox(width: 8),
        Text(text, style: GoogleFonts.outfit(color: _SN.textMuted, fontSize: 14)),
      ],
    );
  }

  Widget _buildLoadingField(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: _SN.cardDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _SN.gold.withOpacity(0.15)),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation<Color>(_SN.gold.withOpacity(0.5)),
            ),
          ),
          const SizedBox(width: 12),
          Text(text, style: GoogleFonts.outfit(color: _SN.textMuted, fontSize: 14)),
        ],
      ),
    );
  }

  Widget _buildDisabledField(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: _SN.cardDark.withOpacity(0.5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _SN.textMuted.withOpacity(0.1)),
      ),
      child: Row(
        children: [
          Icon(Icons.shield, size: 18, color: _SN.textMuted.withOpacity(0.3)),
          const SizedBox(width: 12),
          Text(text, style: GoogleFonts.outfit(color: _SN.textMuted, fontSize: 14)),
        ],
      ),
    );
  }
}
