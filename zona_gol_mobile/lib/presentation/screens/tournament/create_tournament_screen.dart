import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import '../../../domain/entities/tournament_entity.dart';
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
}

/// Create Tournament Screen
class CreateTournamentScreen extends StatefulWidget {
  final String leagueId;

  const CreateTournamentScreen({
    super.key,
    required this.leagueId,
  });

  @override
  State<CreateTournamentScreen> createState() => _CreateTournamentScreenState();
}

class _CreateTournamentScreenState extends State<CreateTournamentScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _maxPlayersController = TextEditingController();
  final _maxCoachingStaffController = TextEditingController(text: '10');

  DateTime _startDate = DateTime.now().add(const Duration(days: 7));
  DateTime _endDate = DateTime.now().add(const Duration(days: 90));
  TournamentFormat _format = TournamentFormat.league;
  int _numberOfGroups = 4;
  int _teamsAdvancingPerGroup = 2;
  int _roundsPerSeason = 1;
  bool _hasThirdPlaceMatch = false;
  bool _isLoading = false;

  @override
  void dispose() {
    _nameController.dispose();
    _maxPlayersController.dispose();
    _maxCoachingStaffController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light.copyWith(
        statusBarColor: Colors.transparent,
        systemNavigationBarColor: _StadiumNights.backgroundDark,
      ),
      child: BlocListener<TournamentBloc, TournamentState>(
        listener: (context, state) {
          if (state is TournamentCreated) {
            setState(() => _isLoading = false);
            Navigator.pop(context);
          } else if (state is TournamentError) {
            setState(() => _isLoading = false);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: _StadiumNights.error,
              ),
            );
          } else if (state is TournamentLoading) {
            setState(() => _isLoading = true);
          }
        },
        child: Scaffold(
          backgroundColor: _StadiumNights.backgroundDark,
          appBar: _buildAppBar(),
          body: _buildForm(),
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() {
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
        'CREAR TORNEO',
        style: GoogleFonts.bebasNeue(
          fontSize: 22,
          color: _StadiumNights.textPrimary,
          letterSpacing: 2,
        ),
      ),
      centerTitle: true,
    );
  }

  Widget _buildForm() {
    return Form(
      key: _formKey,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // Tournament Icon
          Center(
            child: Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: _StadiumNights.gold.withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: _StadiumNights.gold.withOpacity(0.3),
                ),
              ),
              child: Icon(
                Icons.emoji_events,
                size: 40,
                color: _StadiumNights.gold,
              ),
            ),
          ),
          const SizedBox(height: 32),

          // Name Field
          _buildSectionTitle('INFORMACIÓN BÁSICA'),
          const SizedBox(height: 12),
          _buildTextField(
            controller: _nameController,
            label: 'Nombre del Torneo',
            hint: 'Ej: Torneo Apertura 2025',
            icon: Icons.sports_soccer,
            validator: (value) {
              if (value == null || value.trim().isEmpty) {
                return 'El nombre es requerido';
              }
              if (value.trim().length < 3) {
                return 'Mínimo 3 caracteres';
              }
              return null;
            },
          ),
          const SizedBox(height: 24),

          // Dates Section
          _buildSectionTitle('FECHAS'),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildDateField(
                  label: 'Fecha Inicio',
                  date: _startDate,
                  onTap: () => _selectDate(isStart: true),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildDateField(
                  label: 'Fecha Fin',
                  date: _endDate,
                  onTap: () => _selectDate(isStart: false),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Format Section
          _buildSectionTitle('FORMATO DEL TORNEO'),
          const SizedBox(height: 12),
          _buildFormatSelector(),
          const SizedBox(height: 16),

          // Format-specific options
          _buildFormatOptions(),
          const SizedBox(height: 24),

          // Configuration Section
          _buildSectionTitle('CONFIGURACIÓN'),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildTextField(
                  controller: _maxPlayersController,
                  label: 'Máx. Jugadores',
                  hint: 'Opcional',
                  icon: Icons.people,
                  keyboardType: TextInputType.number,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildTextField(
                  controller: _maxCoachingStaffController,
                  label: 'Máx. Cuerpo Técnico',
                  hint: '10',
                  icon: Icons.supervisor_account,
                  keyboardType: TextInputType.number,
                  validator: (value) {
                    if (value != null && value.isNotEmpty) {
                      final num = int.tryParse(value);
                      if (num == null || num < 1) {
                        return 'Mínimo 1';
                      }
                    }
                    return null;
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 40),

          // Submit Button
          _buildSubmitButton(),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: GoogleFonts.bebasNeue(
        fontSize: 16,
        color: _StadiumNights.gold,
        letterSpacing: 2,
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    TextInputType keyboardType = TextInputType.text,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      style: GoogleFonts.outfit(
        color: _StadiumNights.textPrimary,
        fontSize: 15,
      ),
      keyboardType: keyboardType,
      validator: validator,
      cursorColor: _StadiumNights.gold,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        filled: true,
        fillColor: _StadiumNights.cardDark,
        labelStyle: GoogleFonts.outfit(
          color: _StadiumNights.textMuted,
          fontSize: 14,
        ),
        hintStyle: GoogleFonts.outfit(
          color: _StadiumNights.textMuted.withOpacity(0.5),
          fontSize: 14,
        ),
        prefixIcon: Icon(
          icon,
          color: _StadiumNights.gold,
          size: 20,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(
            color: _StadiumNights.gold.withOpacity(0.2),
          ),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(
            color: _StadiumNights.gold.withOpacity(0.2),
          ),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(
            color: _StadiumNights.gold,
            width: 1.5,
          ),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(
            color: _StadiumNights.error,
          ),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(
            color: _StadiumNights.error,
            width: 1.5,
          ),
        ),
        contentPadding: const EdgeInsets.all(16),
        errorStyle: GoogleFonts.outfit(
          color: _StadiumNights.error,
          fontSize: 12,
        ),
      ),
    );
  }

  Widget _buildDateField({
    required String label,
    required DateTime date,
    required VoidCallback onTap,
  }) {
    final dateFormat = DateFormat('dd/MM/yyyy');

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: _StadiumNights.cardDark,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: _StadiumNights.gold.withOpacity(0.2),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: GoogleFonts.outfit(
                color: _StadiumNights.textMuted,
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                Icon(
                  Icons.calendar_today,
                  color: _StadiumNights.gold,
                  size: 18,
                ),
                const SizedBox(width: 10),
                Text(
                  dateFormat.format(date),
                  style: GoogleFonts.outfit(
                    color: _StadiumNights.textPrimary,
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFormatSelector() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: _StadiumNights.cardDark,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: _StadiumNights.gold.withOpacity(0.2),
        ),
      ),
      child: Row(
        children: TournamentFormat.values.map((format) {
          final isSelected = _format == format;
          return Expanded(
            child: GestureDetector(
              onTap: () => setState(() => _format = format),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(vertical: 14),
                decoration: BoxDecoration(
                  color: isSelected
                      ? _StadiumNights.gold
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Column(
                  children: [
                    Icon(
                      _getFormatIcon(format),
                      color: isSelected
                          ? Colors.black
                          : _StadiumNights.textMuted,
                      size: 22,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      _getFormatName(format),
                      textAlign: TextAlign.center,
                      style: GoogleFonts.outfit(
                        color: isSelected
                            ? Colors.black
                            : _StadiumNights.textMuted,
                        fontSize: 11,
                        fontWeight:
                            isSelected ? FontWeight.w600 : FontWeight.w400,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildFormatOptions() {
    switch (_format) {
      case TournamentFormat.league:
        return _buildLeagueOptions();
      case TournamentFormat.knockout:
        return _buildKnockoutOptions();
      case TournamentFormat.groupKnockout:
        return _buildGroupKnockoutOptions();
    }
  }

  Widget _buildLeagueOptions() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _StadiumNights.cardDark,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: _StadiumNights.neonBlue.withOpacity(0.2),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.loop, color: _StadiumNights.neonBlue, size: 18),
              const SizedBox(width: 8),
              Text(
                'Vueltas por Temporada',
                style: GoogleFonts.outfit(
                  color: _StadiumNights.textPrimary,
                  fontSize: 14,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [1, 2, 3, 4].map((rounds) {
              final isSelected = _roundsPerSeason == rounds;
              return Expanded(
                child: GestureDetector(
                  onTap: () => setState(() => _roundsPerSeason = rounds),
                  child: Container(
                    margin: EdgeInsets.only(right: rounds < 4 ? 8 : 0),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? _StadiumNights.neonBlue.withOpacity(0.2)
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: isSelected
                            ? _StadiumNights.neonBlue
                            : _StadiumNights.textMuted.withOpacity(0.3),
                      ),
                    ),
                    child: Center(
                      child: Text(
                        '$rounds',
                        style: GoogleFonts.bebasNeue(
                          color: isSelected
                              ? _StadiumNights.neonBlue
                              : _StadiumNights.textMuted,
                          fontSize: 18,
                        ),
                      ),
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 8),
          Text(
            _roundsPerSeason == 1
                ? 'Todos contra todos (1 vuelta)'
                : 'Todos contra todos ($_roundsPerSeason vueltas)',
            style: GoogleFonts.outfit(
              color: _StadiumNights.textMuted,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildKnockoutOptions() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _StadiumNights.cardDark,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: _StadiumNights.amber.withOpacity(0.2),
        ),
      ),
      child: Row(
        children: [
          Icon(Icons.emoji_events, color: _StadiumNights.amber, size: 18),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Partido por 3er lugar',
              style: GoogleFonts.outfit(
                color: _StadiumNights.textPrimary,
                fontSize: 14,
              ),
            ),
          ),
          Switch(
            value: _hasThirdPlaceMatch,
            onChanged: (value) => setState(() => _hasThirdPlaceMatch = value),
            activeColor: _StadiumNights.amber,
            activeTrackColor: _StadiumNights.amber.withOpacity(0.3),
          ),
        ],
      ),
    );
  }

  Widget _buildGroupKnockoutOptions() {
    return Column(
      children: [
        // Number of groups
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: _StadiumNights.cardDark,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: _StadiumNights.neonGreen.withOpacity(0.2),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.grid_view, color: _StadiumNights.neonGreen, size: 18),
                  const SizedBox(width: 8),
                  Text(
                    'Número de Grupos',
                    style: GoogleFonts.outfit(
                      color: _StadiumNights.textPrimary,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [2, 4, 6, 8].map((groups) {
                  final isSelected = _numberOfGroups == groups;
                  return Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _numberOfGroups = groups),
                      child: Container(
                        margin: EdgeInsets.only(right: groups < 8 ? 8 : 0),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? _StadiumNights.neonGreen.withOpacity(0.2)
                              : Colors.transparent,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: isSelected
                                ? _StadiumNights.neonGreen
                                : _StadiumNights.textMuted.withOpacity(0.3),
                          ),
                        ),
                        child: Center(
                          child: Text(
                            '$groups',
                            style: GoogleFonts.bebasNeue(
                              color: isSelected
                                  ? _StadiumNights.neonGreen
                                  : _StadiumNights.textMuted,
                              fontSize: 18,
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Teams advancing per group
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: _StadiumNights.cardDark,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: _StadiumNights.neonGreen.withOpacity(0.2),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.arrow_upward, color: _StadiumNights.neonGreen, size: 18),
                  const SizedBox(width: 8),
                  Text(
                    'Equipos que Avanzan por Grupo',
                    style: GoogleFonts.outfit(
                      color: _StadiumNights.textPrimary,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [1, 2, 3, 4].map((teams) {
                  final isSelected = _teamsAdvancingPerGroup == teams;
                  return Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _teamsAdvancingPerGroup = teams),
                      child: Container(
                        margin: EdgeInsets.only(right: teams < 4 ? 8 : 0),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? _StadiumNights.neonGreen.withOpacity(0.2)
                              : Colors.transparent,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: isSelected
                                ? _StadiumNights.neonGreen
                                : _StadiumNights.textMuted.withOpacity(0.3),
                          ),
                        ),
                        child: Center(
                          child: Text(
                            '$teams',
                            style: GoogleFonts.bebasNeue(
                              color: isSelected
                                  ? _StadiumNights.neonGreen
                                  : _StadiumNights.textMuted,
                              fontSize: 18,
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 8),
              Text(
                '$_numberOfGroups grupos × $_teamsAdvancingPerGroup equipos = ${_numberOfGroups * _teamsAdvancingPerGroup} equipos a eliminación',
                style: GoogleFonts.outfit(
                  color: _StadiumNights.textMuted,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Third place match option
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: _StadiumNights.cardDark,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: _StadiumNights.amber.withOpacity(0.2),
            ),
          ),
          child: Row(
            children: [
              Icon(Icons.emoji_events, color: _StadiumNights.amber, size: 18),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Partido por 3er lugar',
                  style: GoogleFonts.outfit(
                    color: _StadiumNights.textPrimary,
                    fontSize: 14,
                  ),
                ),
              ),
              Switch(
                value: _hasThirdPlaceMatch,
                onChanged: (value) => setState(() => _hasThirdPlaceMatch = value),
                activeColor: _StadiumNights.amber,
                activeTrackColor: _StadiumNights.amber.withOpacity(0.3),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSubmitButton() {
    return GestureDetector(
      onTap: _isLoading ? null : _handleSubmit,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 18),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: _isLoading
                ? [_StadiumNights.textMuted, _StadiumNights.textMuted]
                : [_StadiumNights.gold, _StadiumNights.amber],
          ),
          borderRadius: BorderRadius.circular(14),
          boxShadow: _isLoading
              ? null
              : [
                  BoxShadow(
                    color: _StadiumNights.gold.withOpacity(0.3),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (_isLoading)
              const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.black54),
                ),
              )
            else
              const Icon(Icons.check, color: Colors.black, size: 22),
            const SizedBox(width: 10),
            Text(
              _isLoading ? 'CREANDO...' : 'CREAR TORNEO',
              style: GoogleFonts.bebasNeue(
                fontSize: 18,
                color: Colors.black,
                letterSpacing: 2,
              ),
            ),
          ],
        ),
      ),
    );
  }

  IconData _getFormatIcon(TournamentFormat format) {
    switch (format) {
      case TournamentFormat.league:
        return Icons.format_list_numbered;
      case TournamentFormat.knockout:
        return Icons.account_tree;
      case TournamentFormat.groupKnockout:
        return Icons.grid_view;
    }
  }

  String _getFormatName(TournamentFormat format) {
    switch (format) {
      case TournamentFormat.league:
        return 'Liga';
      case TournamentFormat.knockout:
        return 'Eliminación';
      case TournamentFormat.groupKnockout:
        return 'Grupos';
    }
  }

  Future<void> _selectDate({required bool isStart}) async {
    final initialDate = isStart ? _startDate : _endDate;
    final firstDate = isStart ? DateTime.now() : _startDate;
    final lastDate = DateTime.now().add(const Duration(days: 365 * 2));

    final picked = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: firstDate,
      lastDate: lastDate,
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: ColorScheme.dark(
              primary: _StadiumNights.gold,
              surface: _StadiumNights.cardDark,
              onSurface: _StadiumNights.textPrimary,
            ),
            dialogBackgroundColor: _StadiumNights.surfaceDark,
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() {
        if (isStart) {
          _startDate = picked;
          // Ensure end date is after start date
          if (_endDate.isBefore(_startDate)) {
            _endDate = _startDate.add(const Duration(days: 30));
          }
        } else {
          _endDate = picked;
        }
      });
    }
  }

  void _handleSubmit() {
    if (!_formKey.currentState!.validate()) return;

    // Validate dates
    if (_startDate.isAfter(_endDate)) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('La fecha de inicio debe ser anterior a la fecha de fin'),
          backgroundColor: _StadiumNights.error,
        ),
      );
      return;
    }

    final maxPlayers = _maxPlayersController.text.isNotEmpty
        ? int.tryParse(_maxPlayersController.text)
        : null;

    final maxCoachingStaff =
        int.tryParse(_maxCoachingStaffController.text) ?? 10;

    context.read<TournamentBloc>().add(
          CreateTournamentEvent(
            name: _nameController.text.trim(),
            leagueId: widget.leagueId,
            startDate: _startDate,
            endDate: _endDate,
            maxPlayers: maxPlayers,
            maxCoachingStaff: maxCoachingStaff,
            format: _format,
            numberOfGroups:
                _format == TournamentFormat.groupKnockout ? _numberOfGroups : null,
            teamsAdvancingPerGroup: _teamsAdvancingPerGroup,
            roundsPerSeason: _roundsPerSeason,
            hasThirdPlaceMatch: _hasThirdPlaceMatch,
          ),
        );
  }
}
