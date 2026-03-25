import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import '../../../core/di/injection.dart';
import '../../../domain/entities/finance_enums.dart';
import '../../../domain/entities/finance_transaction_entity.dart';
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

/// Finance Payment Form Screen
/// Form to register a payment for an existing transaction
class FinancePaymentFormScreen extends StatelessWidget {
  final FinanceTransactionEntity transaction;

  const FinancePaymentFormScreen({super.key, required this.transaction});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => sl<FinanceBloc>(),
      child: _PaymentFormView(transaction: transaction),
    );
  }
}

class _PaymentFormView extends StatefulWidget {
  final FinanceTransactionEntity transaction;

  const _PaymentFormView({required this.transaction});

  @override
  State<_PaymentFormView> createState() => _PaymentFormViewState();
}

class _PaymentFormViewState extends State<_PaymentFormView> {
  final _formKey = GlobalKey<FormState>();
  final _amountCtrl = TextEditingController();
  PaymentMethod _selectedMethod = PaymentMethod.cash;
  final _currencyFormat = NumberFormat.currency(symbol: '\$', decimalDigits: 0);

  @override
  void initState() {
    super.initState();
    // Pre-fill with remaining amount
    _amountCtrl.text =
        widget.transaction.amountPending.toStringAsFixed(0);
  }

  @override
  void dispose() {
    _amountCtrl.dispose();
    super.dispose();
  }

  void _save() {
    if (!_formKey.currentState!.validate()) return;

    final amount = double.tryParse(_amountCtrl.text) ?? 0;
    if (amount <= 0) return;

    context.read<FinanceBloc>().add(RegisterPayment(
          transactionId: widget.transaction.id,
          amount: amount,
          paymentMethod: _selectedMethod.dbValue,
          leagueId: widget.transaction.leagueId,
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
            if (state is FinancePaymentRegistered) {
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
          builder: (context, state) {
            if (state is FinanceLoading) {
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
        'REGISTRAR PAGO',
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
    final tx = widget.transaction;

    return Form(
      key: _formKey,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Transaction summary card
            _buildTransactionSummary(tx),
            const SizedBox(height: 24),

            // Amount field
            _buildLabel('Monto del Pago'),
            const SizedBox(height: 8),
            _buildAmountField(tx),
            const SizedBox(height: 20),

            // Quick amount buttons
            _buildQuickAmounts(tx),
            const SizedBox(height: 20),

            // Payment method
            _buildLabel('Metodo de Pago'),
            const SizedBox(height: 8),
            _buildPaymentMethodSelector(),
            const SizedBox(height: 32),

            // Save button
            _buildSaveButton(),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildTransactionSummary(FinanceTransactionEntity tx) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _SN.cardDark,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _SN.gold.withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Type
          Text(
            tx.transactionType.display,
            style: GoogleFonts.outfit(
              fontSize: 16,
              color: _SN.textPrimary,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          // Team
          Row(
            children: [
              Icon(Icons.shield, size: 14, color: _SN.textMuted),
              const SizedBox(width: 6),
              Text(
                tx.teamName ?? 'Equipo',
                style: GoogleFonts.outfit(
                  fontSize: 13,
                  color: _SN.textSecondary,
                ),
              ),
            ],
          ),
          if (tx.playerName != null) ...[
            const SizedBox(height: 4),
            Row(
              children: [
                Icon(Icons.person, size: 14, color: _SN.textMuted),
                const SizedBox(width: 6),
                Text(
                  tx.playerName!,
                  style: GoogleFonts.outfit(
                    fontSize: 13,
                    color: _SN.textSecondary,
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: 14),
          const Divider(color: _SN.surfaceDark, height: 1),
          const SizedBox(height: 14),
          // Amounts
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _buildSummaryItem(
                  'Total', _currencyFormat.format(tx.amount), _SN.textPrimary),
              _buildSummaryItem('Pagado', _currencyFormat.format(tx.amountPaid),
                  _SN.neonGreen),
              _buildSummaryItem('Pendiente',
                  _currencyFormat.format(tx.amountPending), _SN.amber),
            ],
          ),
          // Progress bar
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: tx.amount > 0 ? tx.amountPaid / tx.amount : 0,
              backgroundColor: _SN.surfaceDark,
              valueColor: AlwaysStoppedAnimation<Color>(_SN.neonGreen),
              minHeight: 5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryItem(String label, String value, Color color) {
    return Column(
      children: [
        Text(
          value,
          style: GoogleFonts.bebasNeue(fontSize: 18, color: color),
        ),
        Text(
          label,
          style: GoogleFonts.outfit(fontSize: 10, color: _SN.textMuted),
        ),
      ],
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

  Widget _buildAmountField(FinanceTransactionEntity tx) {
    return TextFormField(
      controller: _amountCtrl,
      keyboardType: TextInputType.number,
      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
      style: GoogleFonts.outfit(color: _SN.textPrimary, fontSize: 20),
      textAlign: TextAlign.center,
      decoration: InputDecoration(
        prefixText: '\$ ',
        prefixStyle: GoogleFonts.outfit(
          color: _SN.gold,
          fontSize: 20,
          fontWeight: FontWeight.w600,
        ),
        filled: true,
        fillColor: _SN.cardDark,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: _SN.gold.withOpacity(0.2)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: _SN.gold.withOpacity(0.15)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: _SN.gold, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: _SN.error),
        ),
      ),
      validator: (value) {
        if (value == null || value.isEmpty) return 'Ingresa un monto';
        final amount = double.tryParse(value);
        if (amount == null || amount <= 0) return 'Monto invalido';
        if (amount > tx.amountPending) {
          return 'El monto excede el pendiente (${_currencyFormat.format(tx.amountPending)})';
        }
        return null;
      },
    );
  }

  Widget _buildQuickAmounts(FinanceTransactionEntity tx) {
    final pending = tx.amountPending;
    final half = (pending / 2).roundToDouble();
    final quarter = (pending / 4).roundToDouble();

    final amounts = <double>[quarter, half, pending].where((a) => a > 0).toList();
    if (amounts.length <= 1) return const SizedBox.shrink();

    return Row(
      children: amounts.map((amount) {
        return Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: GestureDetector(
              onTap: () {
                _amountCtrl.text = amount.toStringAsFixed(0);
              },
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  color: _SN.surfaceDark,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: _SN.gold.withOpacity(0.2)),
                ),
                child: Column(
                  children: [
                    Text(
                      _currencyFormat.format(amount),
                      style: GoogleFonts.bebasNeue(
                        fontSize: 14,
                        color: _SN.gold,
                      ),
                    ),
                    Text(
                      amount == pending
                          ? 'Total'
                          : amount == half
                              ? '50%'
                              : '25%',
                      style: GoogleFonts.outfit(
                        fontSize: 10,
                        color: _SN.textMuted,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildPaymentMethodSelector() {
    return Column(
      children: PaymentMethod.values.map((method) {
        final isSelected = _selectedMethod == method;
        return GestureDetector(
          onTap: () => setState(() => _selectedMethod = method),
          child: Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: isSelected
                  ? _SN.gold.withOpacity(0.1)
                  : _SN.cardDark,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isSelected
                    ? _SN.gold
                    : _SN.gold.withOpacity(0.15),
                width: isSelected ? 1.5 : 1,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  _getMethodIcon(method),
                  color: isSelected ? _SN.gold : _SN.textMuted,
                  size: 22,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    method.display,
                    style: GoogleFonts.outfit(
                      fontSize: 14,
                      color: isSelected
                          ? _SN.textPrimary
                          : _SN.textSecondary,
                      fontWeight:
                          isSelected ? FontWeight.w600 : FontWeight.normal,
                    ),
                  ),
                ),
                if (isSelected)
                  Icon(Icons.check_circle, color: _SN.gold, size: 20),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  IconData _getMethodIcon(PaymentMethod method) {
    switch (method) {
      case PaymentMethod.cash:
        return Icons.money;
      case PaymentMethod.transfer:
        return Icons.account_balance;
      case PaymentMethod.card:
        return Icons.credit_card;
      case PaymentMethod.other:
        return Icons.more_horiz;
    }
  }

  Widget _buildSaveButton() {
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: ElevatedButton(
        onPressed: _save,
        style: ElevatedButton.styleFrom(
          backgroundColor: _SN.neonGreen,
          foregroundColor: Colors.black,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          elevation: 0,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.check_circle, size: 20),
            const SizedBox(width: 8),
            Text(
              'CONFIRMAR PAGO',
              style: GoogleFonts.bebasNeue(
                fontSize: 18,
                letterSpacing: 2,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
