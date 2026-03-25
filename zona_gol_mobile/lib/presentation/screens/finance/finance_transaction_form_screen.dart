import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/di/injection.dart';
import '../../../domain/entities/finance_enums.dart';
import '../../../domain/entities/team_entity.dart';
import '../../bloc/finance/finance_bloc.dart';
import '../../bloc/finance/finance_event.dart';
import '../../bloc/finance/finance_state.dart';
import '../../bloc/team/team_bloc.dart';
import '../../bloc/team/team_event.dart';
import '../../bloc/team/team_state.dart';

/// Stadium Nights Design System
class _SN {
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

/// Finance Transaction Form Screen
/// Form to create a new finance transaction
class FinanceTransactionFormScreen extends StatelessWidget {
  final String leagueId;

  const FinanceTransactionFormScreen({super.key, required this.leagueId});

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(create: (_) => sl<FinanceBloc>()),
        BlocProvider(
          create: (_) {
            final bloc = sl<TeamBloc>();
            bloc.add(LoadTeamsByLeagueEvent(leagueId: leagueId));
            return bloc;
          },
        ),
      ],
      child: _TransactionFormView(leagueId: leagueId),
    );
  }
}

class _TransactionFormView extends StatefulWidget {
  final String leagueId;

  const _TransactionFormView({required this.leagueId});

  @override
  State<_TransactionFormView> createState() => _TransactionFormViewState();
}

class _TransactionFormViewState extends State<_TransactionFormView> {
  final _formKey = GlobalKey<FormState>();
  final _amountCtrl = TextEditingController();
  final _descriptionCtrl = TextEditingController();

  TransactionType _selectedType = TransactionType.registrationFee;
  String? _selectedTeamId;
  DateTime? _dueDate;

  @override
  void dispose() {
    _amountCtrl.dispose();
    _descriptionCtrl.dispose();
    super.dispose();
  }

  void _save() {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedTeamId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Selecciona un equipo',
              style: GoogleFonts.outfit(color: Colors.white)),
          backgroundColor: _SN.error,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    context.read<FinanceBloc>().add(CreateTransaction(
          leagueId: widget.leagueId,
          teamId: _selectedTeamId!,
          transactionType: _selectedType.dbValue,
          amount: double.tryParse(_amountCtrl.text) ?? 0,
          description: _descriptionCtrl.text.isNotEmpty
              ? _descriptionCtrl.text
              : null,
          dueDate: _dueDate?.toIso8601String().split('T').first,
        ));
  }

  Future<void> _pickDueDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _dueDate ?? DateTime.now().add(const Duration(days: 7)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.dark(
              primary: _SN.gold,
              onPrimary: Colors.black,
              surface: _SN.cardDark,
              onSurface: _SN.textPrimary,
            ),
          ),
          child: child!,
        );
      },
    );
    if (date != null) {
      setState(() => _dueDate = date);
    }
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
        body: BlocConsumer<FinanceBloc, FinanceState>(
          listener: (context, state) {
            if (state is FinanceTransactionCreated) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(state.message,
                      style: GoogleFonts.outfit(color: Colors.white)),
                  backgroundColor: _SN.success,
                  behavior: SnackBarBehavior.floating,
                ),
              );
              Navigator.pop(context, true);
            }
            if (state is FinanceError) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(state.message,
                      style: GoogleFonts.outfit(color: Colors.white)),
                  backgroundColor: _SN.error,
                  behavior: SnackBarBehavior.floating,
                ),
              );
            }
          },
          builder: (context, financeState) {
            if (financeState is FinanceLoading) {
              return Center(
                child: CircularProgressIndicator(
                  valueColor: AlwaysStoppedAnimation<Color>(_SN.gold),
                ),
              );
            }
            return _buildForm();
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
          child: Icon(Icons.arrow_back, color: _SN.gold, size: 18),
        ),
        onPressed: () => Navigator.pop(context),
      ),
      title: Text(
        'NUEVA TRANSACCION',
        style: GoogleFonts.bebasNeue(
          fontSize: 22,
          color: _SN.textPrimary,
          letterSpacing: 2,
        ),
      ),
      centerTitle: true,
    );
  }

  Widget _buildForm() {
    return Form(
      key: _formKey,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Transaction type dropdown
            _buildLabel('Tipo de Transaccion'),
            const SizedBox(height: 8),
            _buildTypeDropdown(),
            const SizedBox(height: 20),

            // Team dropdown
            _buildLabel('Equipo'),
            const SizedBox(height: 8),
            _buildTeamDropdown(),
            const SizedBox(height: 20),

            // Amount
            _buildLabel('Monto'),
            const SizedBox(height: 8),
            _buildAmountField(),
            const SizedBox(height: 20),

            // Description
            _buildLabel('Descripcion (opcional)'),
            const SizedBox(height: 8),
            _buildDescriptionField(),
            const SizedBox(height: 20),

            // Due date
            _buildLabel('Fecha de Vencimiento (opcional)'),
            const SizedBox(height: 8),
            _buildDueDateField(),
            const SizedBox(height: 32),

            // Save button
            _buildSaveButton(),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Text(
      text,
      style: GoogleFonts.outfit(
        fontSize: 13,
        color: _SN.textSecondary,
        fontWeight: FontWeight.w500,
      ),
    );
  }

  Widget _buildTypeDropdown() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: _SN.cardDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _SN.gold.withOpacity(0.2)),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<TransactionType>(
          value: _selectedType,
          isExpanded: true,
          dropdownColor: _SN.cardDark,
          icon: Icon(Icons.keyboard_arrow_down, color: _SN.gold),
          items: TransactionType.values.map((type) {
            return DropdownMenuItem(
              value: type,
              child: Row(
                children: [
                  if (type.isFine)
                    Icon(Icons.warning_amber, size: 16, color: _SN.error),
                  if (!type.isFine)
                    Icon(Icons.receipt, size: 16, color: _SN.gold),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      type.display,
                      style: GoogleFonts.outfit(
                        fontSize: 14,
                        color: _SN.textPrimary,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
          onChanged: (value) {
            if (value != null) setState(() => _selectedType = value);
          },
        ),
      ),
    );
  }

  Widget _buildTeamDropdown() {
    return BlocBuilder<TeamBloc, TeamState>(
      builder: (context, state) {
        List<TeamEntity> teams = [];
        if (state is TeamsLoaded) {
          teams = state.teams;
        }

        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          decoration: BoxDecoration(
            color: _SN.cardDark,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: _SN.gold.withOpacity(0.2)),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: _selectedTeamId,
              isExpanded: true,
              dropdownColor: _SN.cardDark,
              icon: Icon(Icons.keyboard_arrow_down, color: _SN.gold),
              hint: Text(
                teams.isEmpty ? 'Cargando equipos...' : 'Seleccionar equipo',
                style: GoogleFonts.outfit(
                  fontSize: 14,
                  color: _SN.textMuted,
                ),
              ),
              items: teams.map((team) {
                return DropdownMenuItem(
                  value: team.id,
                  child: Row(
                    children: [
                      Icon(Icons.shield, size: 16, color: _SN.gold),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          team.name,
                          style: GoogleFonts.outfit(
                            fontSize: 14,
                            color: _SN.textPrimary,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
              onChanged: (value) {
                setState(() => _selectedTeamId = value);
              },
            ),
          ),
        );
      },
    );
  }

  Widget _buildAmountField() {
    return TextFormField(
      controller: _amountCtrl,
      keyboardType: TextInputType.number,
      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
      style: GoogleFonts.outfit(color: _SN.textPrimary, fontSize: 16),
      decoration: InputDecoration(
        prefixText: '\$ ',
        prefixStyle: GoogleFonts.outfit(
          color: _SN.gold,
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
        hintText: '0',
        hintStyle: GoogleFonts.outfit(color: _SN.textMuted, fontSize: 16),
        filled: true,
        fillColor: _SN.cardDark,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: _SN.gold.withOpacity(0.2)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: _SN.gold.withOpacity(0.15)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: _SN.gold, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: _SN.error),
        ),
      ),
      validator: (value) {
        if (value == null || value.isEmpty) return 'Ingresa un monto';
        final amount = double.tryParse(value);
        if (amount == null || amount <= 0) return 'Monto invalido';
        return null;
      },
    );
  }

  Widget _buildDescriptionField() {
    return TextFormField(
      controller: _descriptionCtrl,
      maxLines: 3,
      style: GoogleFonts.outfit(color: _SN.textPrimary, fontSize: 14),
      decoration: InputDecoration(
        hintText: 'Agrega una nota o descripcion...',
        hintStyle: GoogleFonts.outfit(color: _SN.textMuted, fontSize: 14),
        filled: true,
        fillColor: _SN.cardDark,
        contentPadding: const EdgeInsets.all(16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: _SN.gold.withOpacity(0.2)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: _SN.gold.withOpacity(0.15)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: _SN.gold, width: 1.5),
        ),
      ),
    );
  }

  Widget _buildDueDateField() {
    return GestureDetector(
      onTap: _pickDueDate,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        decoration: BoxDecoration(
          color: _SN.cardDark,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: _SN.gold.withOpacity(0.15)),
        ),
        child: Row(
          children: [
            Icon(Icons.calendar_today, color: _SN.gold, size: 18),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                _dueDate != null
                    ? '${_dueDate!.day}/${_dueDate!.month}/${_dueDate!.year}'
                    : 'Sin fecha de vencimiento',
                style: GoogleFonts.outfit(
                  fontSize: 14,
                  color: _dueDate != null
                      ? _SN.textPrimary
                      : _SN.textMuted,
                ),
              ),
            ),
            if (_dueDate != null)
              GestureDetector(
                onTap: () => setState(() => _dueDate = null),
                child: Icon(Icons.close, color: _SN.textMuted, size: 18),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildSaveButton() {
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: ElevatedButton(
        onPressed: _save,
        style: ElevatedButton.styleFrom(
          backgroundColor: _SN.gold,
          foregroundColor: Colors.black,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          elevation: 0,
        ),
        child: Text(
          'CREAR TRANSACCION',
          style: GoogleFonts.bebasNeue(
            fontSize: 18,
            letterSpacing: 2,
          ),
        ),
      ),
    );
  }
}
