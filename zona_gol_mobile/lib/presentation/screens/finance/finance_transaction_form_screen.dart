import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/di/injection.dart';
import '../../../domain/entities/finance_config_entity.dart';
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
        // The config prefills the amount of each type and gives the currency.
        BlocProvider(
          create: (_) => sl<FinanceBloc>()..add(LoadConfig(leagueId: leagueId)),
        ),
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

  TransactionType? _selectedType;
  String? _selectedTeamId;
  DateTime? _dueDate;
  FinanceConfigEntity? _config;

  String get _symbol => (_config?.currency ?? Currency.mxn).symbol;

  @override
  void dispose() {
    _amountCtrl.dispose();
    _descriptionCtrl.dispose();
    super.dispose();
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message, style: GoogleFonts.outfit(color: Colors.white)),
        backgroundColor: _SN.error,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  /// Picking a type prefills description and amount from the league config.
  void _pickType(TransactionType type) {
    setState(() {
      _selectedType = type;
      _descriptionCtrl.text = type.defaultDescription;
      final configured = _config?.defaultAmountFor(type) ?? 0;
      if (configured > 0) {
        _amountCtrl.text = configured == configured.roundToDouble()
            ? configured.toStringAsFixed(0)
            : configured.toStringAsFixed(2);
      }
      if (type.isIncome) {
        _dueDate = null;
      } else if (_dueDate == null && _config != null) {
        _dueDate = DateTime.now().add(Duration(days: _config!.paymentDueDays));
      }
    });
  }

  void _save() {
    final type = _selectedType;
    if (type == null) {
      _showError('Selecciona un tipo de transacción');
      return;
    }
    if (!_formKey.currentState!.validate()) return;
    if (type.needsTeam && _selectedTeamId == null) {
      _showError('Selecciona un equipo');
      return;
    }

    context.read<FinanceBloc>().add(
      CreateTransaction(
        leagueId: widget.leagueId,
        teamId: _selectedTeamId,
        type: type,
        amount: double.tryParse(_amountCtrl.text) ?? 0,
        description: _descriptionCtrl.text.trim(),
        dueDate: type.isIncome ? null : _dueDate,
      ),
    );
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
            if (state is FinanceConfigLoaded) {
              setState(() => _config = state.config);
            }
            if (state is FinanceTransactionCreated) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    state.message,
                    style: GoogleFonts.outfit(color: Colors.white),
                  ),
                  backgroundColor: _SN.success,
                  behavior: SnackBarBehavior.floating,
                ),
              );
              Navigator.pop(context, true);
            }
            if (state is FinanceError) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    state.message,
                    style: GoogleFonts.outfit(color: Colors.white),
                  ),
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
        'NUEVA TRANSACCIÓN',
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
            _buildLabel('Tipo de Transacción'),
            const SizedBox(height: 8),
            _buildTypeDropdown(),
            const SizedBox(height: 20),

            // Team dropdown
            _buildLabel(
              _selectedType?.needsTeam ?? true ? 'Equipo' : 'Equipo (opcional)',
            ),
            const SizedBox(height: 8),
            _buildTeamDropdown(),
            const SizedBox(height: 20),

            // Amount
            _buildLabel('Monto'),
            const SizedBox(height: 8),
            _buildAmountField(),
            const SizedBox(height: 20),

            // Description
            _buildLabel('Descripción'),
            const SizedBox(height: 8),
            _buildDescriptionField(),
            const SizedBox(height: 20),

            // Due date (charges only)
            if (!(_selectedType?.isIncome ?? false)) ...[
              _buildLabel('Fecha de Vencimiento (opcional)'),
              const SizedBox(height: 8),
              _buildDueDateField(),
            ],
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
          hint: Text(
            'Seleccionar tipo',
            style: GoogleFonts.outfit(fontSize: 14, color: _SN.textMuted),
          ),
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
                    Icon(
                      type.isIncome ? Icons.trending_up : Icons.receipt,
                      size: 16,
                      color: type.isIncome ? _SN.neonGreen : _SN.gold,
                    ),
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
            if (value != null) _pickType(value);
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
                style: GoogleFonts.outfit(fontSize: 14, color: _SN.textMuted),
              ),
              items: [
                if (!(_selectedType?.needsTeam ?? true))
                  DropdownMenuItem<String>(
                    value: null,
                    child: Text(
                      'Sin equipo',
                      style: GoogleFonts.outfit(
                        fontSize: 14,
                        color: _SN.textSecondary,
                      ),
                    ),
                  ),
                ...teams.map((team) {
                  return DropdownMenuItem<String>(
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
                }),
              ],
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
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      inputFormatters: [
        FilteringTextInputFormatter.allow(RegExp(r'^\d{0,6}(\.\d{0,2})?')),
      ],
      style: GoogleFonts.outfit(color: _SN.textPrimary, fontSize: 16),
      decoration: InputDecoration(
        prefixText: '$_symbol ',
        prefixStyle: GoogleFonts.outfit(
          color: _SN.gold,
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
        hintText: '0',
        hintStyle: GoogleFonts.outfit(color: _SN.textMuted, fontSize: 16),
        filled: true,
        fillColor: _SN.cardDark,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 16,
        ),
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
        if (amount == null || amount <= 0) return 'Monto inválido';
        if (amount > 999999.99) return 'No puede exceder 999,999.99';
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
        hintText: 'Describe el cargo, multa o pago...',
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
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: _SN.error),
        ),
      ),
      validator: (value) {
        if ((value ?? '').trim().length < 3) {
          return 'La descripción debe tener al menos 3 caracteres';
        }
        return null;
      },
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
                  color: _dueDate != null ? _SN.textPrimary : _SN.textMuted,
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
          'CREAR TRANSACCIÓN',
          style: GoogleFonts.bebasNeue(fontSize: 18, letterSpacing: 2),
        ),
      ),
    );
  }
}
