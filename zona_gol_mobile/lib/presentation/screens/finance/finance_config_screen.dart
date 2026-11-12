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
  final _teamRegistrationFeeCtrl = TextEditingController();
  final _playerRegistrationFeeCtrl = TextEditingController();
  final _lateRegistrationSurchargeCtrl = TextEditingController();

  // Fine controllers
  final _yellowCardFineCtrl = TextEditingController();
  final _doubleYellowFineCtrl = TextEditingController();
  final _redCardFineCtrl = TextEditingController();
  final _absenceFineCtrl = TextEditingController();
  final _lateArrivalFineCtrl = TextEditingController();
  final _uniformViolationFineCtrl = TextEditingController();
  final _misconductFineCtrl = TextEditingController();

  // Operational cost controllers
  final _refereeFeeCtrl = TextEditingController();
  final _assistantRefereeFeeCtrl = TextEditingController();
  final _fieldRentalCtrl = TextEditingController();

  // Payment settings
  final _paymentDueDaysCtrl = TextEditingController();
  final _overdueGraceDaysCtrl = TextEditingController();
  final _paymentInstructionsCtrl = TextEditingController();
  final _bankAccountInfoCtrl = TextEditingController();

  bool _autoGenerateFines = false;
  bool _autoGenerateRefereeFees = false;
  bool _notifyOnNewCharge = false;
  bool _notifyOnOverdue = false;
  Currency _currency = Currency.mxn;
  FinanceConfigEntity? _config;

  List<TextEditingController> get _controllers => [
    _teamRegistrationFeeCtrl,
    _playerRegistrationFeeCtrl,
    _lateRegistrationSurchargeCtrl,
    _yellowCardFineCtrl,
    _doubleYellowFineCtrl,
    _redCardFineCtrl,
    _absenceFineCtrl,
    _lateArrivalFineCtrl,
    _uniformViolationFineCtrl,
    _misconductFineCtrl,
    _refereeFeeCtrl,
    _assistantRefereeFeeCtrl,
    _fieldRentalCtrl,
    _paymentDueDaysCtrl,
    _overdueGraceDaysCtrl,
    _paymentInstructionsCtrl,
    _bankAccountInfoCtrl,
  ];

  @override
  void dispose() {
    for (final c in _controllers) {
      c.dispose();
    }
    super.dispose();
  }

  static String _money(double v) =>
      v == v.roundToDouble() ? v.toStringAsFixed(0) : v.toStringAsFixed(2);

  void _populateFields(FinanceConfigEntity config) {
    if (_config != null) return;
    _teamRegistrationFeeCtrl.text = _money(config.teamRegistrationFee);
    _playerRegistrationFeeCtrl.text = _money(config.playerRegistrationFee);
    _lateRegistrationSurchargeCtrl.text = _money(
      config.lateRegistrationSurcharge,
    );
    _yellowCardFineCtrl.text = _money(config.yellowCardFine);
    _doubleYellowFineCtrl.text = _money(config.doubleYellowFine);
    _redCardFineCtrl.text = _money(config.redCardFine);
    _absenceFineCtrl.text = _money(config.absenceFine);
    _lateArrivalFineCtrl.text = _money(config.lateArrivalFine);
    _uniformViolationFineCtrl.text = _money(config.uniformViolationFine);
    _misconductFineCtrl.text = _money(config.misconductFine);
    _refereeFeeCtrl.text = _money(config.refereeFeePerMatch);
    _assistantRefereeFeeCtrl.text = _money(config.assistantRefereeFee);
    _fieldRentalCtrl.text = _money(config.fieldRentalPerMatch);
    _paymentDueDaysCtrl.text = config.paymentDueDays.toString();
    _overdueGraceDaysCtrl.text = config.overdueGraceDays.toString();
    _paymentInstructionsCtrl.text = config.paymentInstructions ?? '';
    _bankAccountInfoCtrl.text = config.bankAccountInfo ?? '';
    _autoGenerateFines = config.autoGenerateFines;
    _autoGenerateRefereeFees = config.autoGenerateRefereeFees;
    _notifyOnNewCharge = config.notifyOnNewCharge;
    _notifyOnOverdue = config.notifyOnOverdue;
    _currency = config.currency;
    _config = config;
  }

  void _saveConfig() {
    final config = _config;
    if (config == null || !_formKey.currentState!.validate()) return;
    double amount(TextEditingController c) => double.tryParse(c.text) ?? 0;

    context.read<FinanceBloc>().add(
      UpdateConfig(
        config: config.copyWith(
          teamRegistrationFee: amount(_teamRegistrationFeeCtrl),
          playerRegistrationFee: amount(_playerRegistrationFeeCtrl),
          lateRegistrationSurcharge: amount(_lateRegistrationSurchargeCtrl),
          yellowCardFine: amount(_yellowCardFineCtrl),
          doubleYellowFine: amount(_doubleYellowFineCtrl),
          redCardFine: amount(_redCardFineCtrl),
          absenceFine: amount(_absenceFineCtrl),
          lateArrivalFine: amount(_lateArrivalFineCtrl),
          uniformViolationFine: amount(_uniformViolationFineCtrl),
          misconductFine: amount(_misconductFineCtrl),
          refereeFeePerMatch: amount(_refereeFeeCtrl),
          assistantRefereeFee: amount(_assistantRefereeFeeCtrl),
          fieldRentalPerMatch: amount(_fieldRentalCtrl),
          currency: _currency,
          paymentDueDays: int.tryParse(_paymentDueDaysCtrl.text) ?? 0,
          overdueGraceDays: int.tryParse(_overdueGraceDaysCtrl.text) ?? 0,
          autoGenerateFines: _autoGenerateFines,
          autoGenerateRefereeFees: _autoGenerateRefereeFees,
          notifyOnNewCharge: _notifyOnNewCharge,
          notifyOnOverdue: _notifyOnOverdue,
          paymentInstructions: _paymentInstructionsCtrl.text.trim(),
          bankAccountInfo: _bankAccountInfoCtrl.text.trim(),
        ),
      ),
    );
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
                  content: Text(
                    state.message,
                    style: GoogleFonts.outfit(color: Colors.white),
                  ),
                  backgroundColor: _SN.success,
                  behavior: SnackBarBehavior.floating,
                ),
              );
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
            // A failed save keeps the form (the snackbar shows the error).
            if (state is FinanceError && _config != null) {
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
        'CONFIGURACIÓN',
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
              'Inscripción de Equipo',
              _teamRegistrationFeeCtrl,
              Icons.app_registration,
            ),
            _buildAmountField(
              'Inscripción de Jugador',
              _playerRegistrationFeeCtrl,
              Icons.person_add_alt,
            ),
            _buildAmountField(
              'Recargo por Inscripción Tardía',
              _lateRegistrationSurchargeCtrl,
              Icons.more_time,
            ),
            const SizedBox(height: 24),

            // Fines section
            _buildSectionHeader('MULTAS'),
            const SizedBox(height: 12),
            _buildAmountField(
              'Tarjeta Amarilla',
              _yellowCardFineCtrl,
              Icons.square,
              color: _SN.amber,
            ),
            _buildAmountField(
              'Doble Amarilla',
              _doubleYellowFineCtrl,
              Icons.square,
              color: Colors.orange,
            ),
            _buildAmountField(
              'Tarjeta Roja',
              _redCardFineCtrl,
              Icons.square,
              color: _SN.error,
            ),
            _buildAmountField(
              'Incomparecencia',
              _absenceFineCtrl,
              Icons.person_off,
            ),
            _buildAmountField(
              'Llegada Tarde',
              _lateArrivalFineCtrl,
              Icons.access_time,
            ),
            _buildAmountField(
              'Uniforme',
              _uniformViolationFineCtrl,
              Icons.checkroom,
            ),
            _buildAmountField(
              'Mala Conducta',
              _misconductFineCtrl,
              Icons.warning,
            ),
            const SizedBox(height: 24),

            // Operational costs
            _buildSectionHeader('OPERATIVOS'),
            const SizedBox(height: 12),
            _buildAmountField(
              'Arbitraje por Partido',
              _refereeFeeCtrl,
              Icons.sports,
            ),
            _buildAmountField(
              'Árbitro Asistente',
              _assistantRefereeFeeCtrl,
              Icons.flag_outlined,
            ),
            _buildAmountField(
              'Renta de Cancha por Partido',
              _fieldRentalCtrl,
              Icons.stadium_outlined,
            ),
            const SizedBox(height: 24),

            // Payment settings
            _buildSectionHeader('PAGOS'),
            const SizedBox(height: 12),
            _buildDaysField(
              'Días para Pago',
              _paymentDueDaysCtrl,
              Icons.event_available,
              max: 90,
            ),
            _buildDaysField(
              'Días de Gracia',
              _overdueGraceDaysCtrl,
              Icons.hourglass_bottom,
              max: 30,
            ),
            _buildTextArea(
              'Instrucciones de Pago',
              _paymentInstructionsCtrl,
              Icons.info_outline,
            ),
            _buildTextArea(
              'Datos Bancarios',
              _bankAccountInfoCtrl,
              Icons.account_balance,
            ),
            const SizedBox(height: 24),

            // Automation toggles
            _buildToggle(
              Icons.auto_fix_high,
              'Generar multas automáticamente',
              'Crea multas cuando se registran tarjetas en partidos',
              _autoGenerateFines,
              (v) => setState(() => _autoGenerateFines = v),
            ),
            const SizedBox(height: 10),
            _buildToggle(
              Icons.sports,
              'Generar honorarios de árbitros',
              'Crea el cargo de arbitraje al cerrar cada partido',
              _autoGenerateRefereeFees,
              (v) => setState(() => _autoGenerateRefereeFees = v),
            ),
            const SizedBox(height: 10),
            _buildToggle(
              Icons.notifications_active_outlined,
              'Notificar nuevos cargos',
              'Envía notificación cuando se genera un nuevo cargo',
              _notifyOnNewCharge,
              (v) => setState(() => _notifyOnNewCharge = v),
            ),
            const SizedBox(height: 10),
            _buildToggle(
              Icons.alarm,
              'Notificar pagos vencidos',
              'Envía recordatorio cuando un pago se vence',
              _notifyOnOverdue,
              (v) => setState(() => _notifyOnOverdue = v),
            ),
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
        border: Border(left: BorderSide(color: _SN.gold, width: 3)),
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
                '${currency.dbValue} - ${currency.display}',
                style: GoogleFonts.outfit(fontSize: 14, color: _SN.textPrimary),
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
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        inputFormatters: [
          FilteringTextInputFormatter.allow(RegExp(r'^\d{0,6}(\.\d{0,2})?')),
        ],
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
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 14,
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
        ),
        validator: (value) {
          if (value != null && value.isNotEmpty) {
            final number = double.tryParse(value);
            if (number == null || number < 0 || number > 999999.99) {
              return 'Monto inválido';
            }
          }
          return null;
        },
      ),
    );
  }

  InputDecoration _decoration(String label, IconData icon) {
    return InputDecoration(
      labelText: label,
      labelStyle: GoogleFonts.outfit(color: _SN.textSecondary, fontSize: 13),
      prefixIcon: Icon(icon, color: _SN.gold, size: 20),
      filled: true,
      fillColor: _SN.cardDark,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
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
    );
  }

  Widget _buildDaysField(
    String label,
    TextEditingController controller,
    IconData icon, {
    required int max,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      child: TextFormField(
        controller: controller,
        keyboardType: TextInputType.number,
        inputFormatters: [
          FilteringTextInputFormatter.digitsOnly,
          LengthLimitingTextInputFormatter(2),
        ],
        style: GoogleFonts.outfit(color: _SN.textPrimary, fontSize: 14),
        decoration: _decoration(label, icon),
        validator: (value) {
          final days = int.tryParse(value ?? '');
          if (days == null || days < 0 || days > max) {
            return 'Debe estar entre 0 y $max';
          }
          return null;
        },
      ),
    );
  }

  Widget _buildTextArea(
    String label,
    TextEditingController controller,
    IconData icon,
  ) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      child: TextFormField(
        controller: controller,
        minLines: 1,
        maxLines: 3,
        style: GoogleFonts.outfit(color: _SN.textPrimary, fontSize: 14),
        decoration: _decoration(label, icon),
      ),
    );
  }

  Widget _buildToggle(
    IconData icon,
    String title,
    String hint,
    bool value,
    ValueChanged<bool> onChanged,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _SN.cardDark,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _SN.gold.withOpacity(0.15)),
      ),
      child: Row(
        children: [
          Icon(icon, color: _SN.gold, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: GoogleFonts.outfit(
                    fontSize: 14,
                    color: _SN.textPrimary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                Text(
                  hint,
                  style: GoogleFonts.outfit(fontSize: 11, color: _SN.textMuted),
                ),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
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
          'GUARDAR CONFIGURACIÓN',
          style: GoogleFonts.bebasNeue(fontSize: 18, letterSpacing: 2),
        ),
      ),
    );
  }
}
