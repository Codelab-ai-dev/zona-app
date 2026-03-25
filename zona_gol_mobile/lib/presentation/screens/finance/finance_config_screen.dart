import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/di/injection.dart';
import '../../../domain/entities/finance_config_entity.dart';
import '../../../domain/entities/finance_enums.dart';
import '../../bloc/finance/finance_bloc.dart';
import '../../bloc/finance/finance_event.dart';
import '../../bloc/finance/finance_state.dart';

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

/// Finance Config Screen
/// Form to edit league finance configuration (fees and fines)
class FinanceConfigScreen extends StatelessWidget {
  final String leagueId;

  const FinanceConfigScreen({super.key, required this.leagueId});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) {
        final bloc = sl<FinanceBloc>();
        bloc.add(LoadConfig(leagueId: leagueId));
        return bloc;
      },
      child: _FinanceConfigView(leagueId: leagueId),
    );
  }
}

class _FinanceConfigView extends StatefulWidget {
  final String leagueId;

  const _FinanceConfigView({required this.leagueId});

  @override
  State<_FinanceConfigView> createState() => _FinanceConfigViewState();
}

class _FinanceConfigViewState extends State<_FinanceConfigView> {
  final _formKey = GlobalKey<FormState>();

  // Fee controllers
  final _registrationFeeCtrl = TextEditingController();
  final _monthlyFeeCtrl = TextEditingController();
  final _matchFeeCtrl = TextEditingController();

  // Fine controllers
  final _yellowCardFineCtrl = TextEditingController();
  final _redCardFineCtrl = TextEditingController();
  final _noShowFineCtrl = TextEditingController();
  final _lateArrivalFineCtrl = TextEditingController();
  final _uniformViolationFineCtrl = TextEditingController();
  final _misconductFineCtrl = TextEditingController();
  final _forfeitFineCtrl = TextEditingController();

  bool _autoGenerateFines = false;
  Currency _currency = Currency.mxn;
  bool _isInitialized = false;

  @override
  void dispose() {
    _registrationFeeCtrl.dispose();
    _monthlyFeeCtrl.dispose();
    _matchFeeCtrl.dispose();
    _yellowCardFineCtrl.dispose();
    _redCardFineCtrl.dispose();
    _noShowFineCtrl.dispose();
    _lateArrivalFineCtrl.dispose();
    _uniformViolationFineCtrl.dispose();
    _misconductFineCtrl.dispose();
    _forfeitFineCtrl.dispose();
    super.dispose();
  }

  void _populateFields(FinanceConfigEntity config) {
    if (_isInitialized) return;
    _registrationFeeCtrl.text = config.registrationFee.toStringAsFixed(0);
    _monthlyFeeCtrl.text = config.monthlyFee.toStringAsFixed(0);
    _matchFeeCtrl.text = config.matchFee.toStringAsFixed(0);
    _yellowCardFineCtrl.text = config.yellowCardFine.toStringAsFixed(0);
    _redCardFineCtrl.text = config.redCardFine.toStringAsFixed(0);
    _noShowFineCtrl.text = config.noShowFine.toStringAsFixed(0);
    _lateArrivalFineCtrl.text = config.lateArrivalFine.toStringAsFixed(0);
    _uniformViolationFineCtrl.text =
        config.uniformViolationFine.toStringAsFixed(0);
    _misconductFineCtrl.text = config.misconductFine.toStringAsFixed(0);
    _forfeitFineCtrl.text = config.forfeitFine.toStringAsFixed(0);
    _autoGenerateFines = config.autoGenerateFines;
    _currency = config.currency;
    _isInitialized = true;
  }

  void _saveConfig() {
    if (!_formKey.currentState!.validate()) return;

    context.read<FinanceBloc>().add(UpdateConfig(
          leagueId: widget.leagueId,
          registrationFee: double.tryParse(_registrationFeeCtrl.text) ?? 0,
          monthlyFee: double.tryParse(_monthlyFeeCtrl.text) ?? 0,
          matchFee: double.tryParse(_matchFeeCtrl.text) ?? 0,
          yellowCardFine: double.tryParse(_yellowCardFineCtrl.text) ?? 0,
          redCardFine: double.tryParse(_redCardFineCtrl.text) ?? 0,
          noShowFine: double.tryParse(_noShowFineCtrl.text) ?? 0,
          lateArrivalFine: double.tryParse(_lateArrivalFineCtrl.text) ?? 0,
          uniformViolationFine:
              double.tryParse(_uniformViolationFineCtrl.text) ?? 0,
          misconductFine: double.tryParse(_misconductFineCtrl.text) ?? 0,
          forfeitFine: double.tryParse(_forfeitFineCtrl.text) ?? 0,
          autoGenerateFines: _autoGenerateFines,
          currency: _currency.dbValue,
        ));
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
            if (state is FinanceConfigUpdated) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(state.message,
                      style: GoogleFonts.outfit(color: Colors.white)),
                  backgroundColor: _SN.success,
                  behavior: SnackBarBehavior.floating,
                ),
              );
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
          builder: (context, state) {
            if (state is FinanceLoading) {
              return Center(
                child: CircularProgressIndicator(
                  valueColor: AlwaysStoppedAnimation<Color>(_SN.gold),
                ),
              );
            }
            if (state is FinanceConfigLoaded) {
              _populateFields(state.config);
              return _buildForm();
            }
            if (state is FinanceError) {
              return Center(
                child: Text(
                  state.message,
                  style: GoogleFonts.outfit(color: _SN.error),
                ),
              );
            }
            return const SizedBox.shrink();
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
        'CONFIGURACION',
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
            // Currency selector
            _buildSectionHeader('MONEDA'),
            const SizedBox(height: 8),
            _buildCurrencySelector(),
            const SizedBox(height: 24),

            // Fees section
            _buildSectionHeader('CUOTAS'),
            const SizedBox(height: 12),
            _buildAmountField(
                'Inscripcion', _registrationFeeCtrl, Icons.app_registration),
            _buildAmountField(
                'Mensualidad', _monthlyFeeCtrl, Icons.calendar_month),
            _buildAmountField(
                'Cuota por Partido', _matchFeeCtrl, Icons.sports_soccer),
            const SizedBox(height: 24),

            // Fines section
            _buildSectionHeader('MULTAS'),
            const SizedBox(height: 12),
            _buildAmountField('Tarjeta Amarilla', _yellowCardFineCtrl,
                Icons.square, color: _SN.amber),
            _buildAmountField('Tarjeta Roja', _redCardFineCtrl, Icons.square,
                color: _SN.error),
            _buildAmountField(
                'Inasistencia', _noShowFineCtrl, Icons.person_off),
            _buildAmountField(
                'Llegada Tarde', _lateArrivalFineCtrl, Icons.access_time),
            _buildAmountField('Uniforme', _uniformViolationFineCtrl,
                Icons.checkroom),
            _buildAmountField(
                'Mala Conducta', _misconductFineCtrl, Icons.warning),
            _buildAmountField(
                'Forfeit', _forfeitFineCtrl, Icons.cancel_outlined),
            const SizedBox(height: 24),

            // Auto-generate toggle
            _buildAutoGenerateToggle(),
            const SizedBox(height: 32),

            // Save button
            _buildSaveButton(),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [_SN.gold.withOpacity(0.15), Colors.transparent],
        ),
        borderRadius: BorderRadius.circular(6),
        border: Border(
          left: BorderSide(color: _SN.gold, width: 3),
        ),
      ),
      child: Text(
        title,
        style: GoogleFonts.bebasNeue(
          fontSize: 16,
          color: _SN.gold,
          letterSpacing: 2,
        ),
      ),
    );
  }

  Widget _buildCurrencySelector() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: _SN.cardDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _SN.gold.withOpacity(0.2)),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<Currency>(
          value: _currency,
          isExpanded: true,
          dropdownColor: _SN.cardDark,
          icon: Icon(Icons.keyboard_arrow_down, color: _SN.gold),
          items: Currency.values.map((currency) {
            return DropdownMenuItem(
              value: currency,
              child: Text(
                '${currency.symbol} - ${currency.display}',
                style: GoogleFonts.outfit(
                  fontSize: 14,
                  color: _SN.textPrimary,
                ),
              ),
            );
          }).toList(),
          onChanged: (value) {
            if (value != null) setState(() => _currency = value);
          },
        ),
      ),
    );
  }

  Widget _buildAmountField(
    String label,
    TextEditingController controller,
    IconData icon, {
    Color? color,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      child: TextFormField(
        controller: controller,
        keyboardType: TextInputType.number,
        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
        style: GoogleFonts.outfit(color: _SN.textPrimary, fontSize: 14),
        decoration: InputDecoration(
          labelText: label,
          labelStyle: GoogleFonts.outfit(
            color: _SN.textSecondary,
            fontSize: 13,
          ),
          prefixIcon: Icon(icon, color: color ?? _SN.gold, size: 20),
          prefixText: '${_currency.symbol} ',
          prefixStyle: GoogleFonts.outfit(
            color: _SN.gold,
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
          filled: true,
          fillColor: _SN.cardDark,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
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
        validator: (value) {
          if (value != null && value.isNotEmpty) {
            final number = double.tryParse(value);
            if (number == null || number < 0) {
              return 'Monto invalido';
            }
          }
          return null;
        },
      ),
    );
  }

  Widget _buildAutoGenerateToggle() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _SN.cardDark,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _SN.gold.withOpacity(0.15)),
      ),
      child: Row(
        children: [
          Icon(Icons.auto_fix_high, color: _SN.gold, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Generar multas automaticamente',
                  style: GoogleFonts.outfit(
                    fontSize: 14,
                    color: _SN.textPrimary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                Text(
                  'Las multas se generaran al finalizar cada partido',
                  style: GoogleFonts.outfit(
                    fontSize: 11,
                    color: _SN.textMuted,
                  ),
                ),
              ],
            ),
          ),
          Switch(
            value: _autoGenerateFines,
            onChanged: (value) =>
                setState(() => _autoGenerateFines = value),
            activeColor: _SN.neonGreen,
            activeTrackColor: _SN.neonGreen.withOpacity(0.3),
            inactiveThumbColor: _SN.textMuted,
            inactiveTrackColor: _SN.surfaceDark,
          ),
        ],
      ),
    );
  }

  Widget _buildSaveButton() {
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: ElevatedButton(
        onPressed: _saveConfig,
        style: ElevatedButton.styleFrom(
          backgroundColor: _SN.gold,
          foregroundColor: Colors.black,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          elevation: 0,
        ),
        child: Text(
          'GUARDAR CONFIGURACION',
          style: GoogleFonts.bebasNeue(
            fontSize: 18,
            letterSpacing: 2,
          ),
        ),
      ),
    );
  }
}
