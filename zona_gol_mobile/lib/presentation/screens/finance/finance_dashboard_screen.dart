import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import '../../../core/di/injection.dart';
import '../../../domain/entities/finance_enums.dart';
import '../../../domain/entities/finance_league_summary_entity.dart';
import '../../../domain/entities/finance_team_balance_entity.dart';
import '../../../domain/entities/finance_transaction_entity.dart';
import '../../bloc/finance/finance_bloc.dart';
import '../../bloc/finance/finance_event.dart';
import '../../bloc/finance/finance_state.dart';
import 'finance_config_screen.dart';
import 'finance_transaction_form_screen.dart';
import 'finance_payment_form_screen.dart';

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

/// Finance Dashboard Screen
/// Shows 4 stats cards, tabs for Resumen/Transacciones/Balances
class FinanceDashboardScreen extends StatelessWidget {
  final String leagueId;
  final String leagueName;

  const FinanceDashboardScreen({
    super.key,
    required this.leagueId,
    required this.leagueName,
  });

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) {
        final bloc = sl<FinanceBloc>();
        bloc.add(LoadFinanceDashboard(leagueId: leagueId));
        return bloc;
      },
      child: _FinanceDashboardView(
        leagueId: leagueId,
        leagueName: leagueName,
      ),
    );
  }
}

class _FinanceDashboardView extends StatefulWidget {
  final String leagueId;
  final String leagueName;

  const _FinanceDashboardView({
    required this.leagueId,
    required this.leagueName,
  });

  @override
  State<_FinanceDashboardView> createState() => _FinanceDashboardViewState();
}

class _FinanceDashboardViewState extends State<_FinanceDashboardView>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _currencyFormat = NumberFormat.currency(symbol: '\$', decimalDigits: 0);

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      if (_tabController.indexIsChanging) return;
      if (_tabController.index == 1) {
        // Load transactions when switching to transactions tab
        context
            .read<FinanceBloc>()
            .add(LoadTransactions(leagueId: widget.leagueId));
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
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
            if (state is FinanceTransactionCreated ||
                state is FinanceTransactionCancelled ||
                state is FinancePaymentRegistered) {
              final message = state is FinanceTransactionCreated
                  ? state.message
                  : state is FinanceTransactionCancelled
                      ? state.message
                      : (state as FinancePaymentRegistered).message;
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(message,
                      style: GoogleFonts.outfit(color: Colors.white)),
                  backgroundColor: _SN.success,
                  behavior: SnackBarBehavior.floating,
                ),
              );
              // Reload dashboard data
              context
                  .read<FinanceBloc>()
                  .add(LoadFinanceDashboard(leagueId: widget.leagueId));
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
              return _buildLoading();
            }
            if (state is FinanceDashboardLoaded) {
              return _buildDashboard(context, state.summary, state.balances);
            }
            if (state is FinanceTransactionsLoaded) {
              return _buildTransactionsList(context, state.transactions);
            }
            if (state is FinanceError) {
              return _buildError(context, state.message);
            }
            return _buildLoading();
          },
        ),
        floatingActionButton: FloatingActionButton(
          onPressed: () => _navigateToCreateTransaction(context),
          backgroundColor: _SN.gold,
          child: const Icon(Icons.add, color: Colors.black),
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
        'FINANZAS',
        style: GoogleFonts.bebasNeue(
          fontSize: 22,
          color: _SN.textPrimary,
          letterSpacing: 2,
        ),
      ),
      centerTitle: true,
      actions: [
        IconButton(
          icon: Icon(Icons.settings, color: _SN.gold, size: 22),
          onPressed: () => _navigateToConfig(context),
          tooltip: 'Configuracion',
        ),
        IconButton(
          icon: Icon(Icons.refresh, color: _SN.gold, size: 22),
          onPressed: () {
            context
                .read<FinanceBloc>()
                .add(LoadFinanceDashboard(leagueId: widget.leagueId));
          },
        ),
      ],
      bottom: TabBar(
        controller: _tabController,
        indicatorColor: _SN.gold,
        indicatorWeight: 3,
        labelColor: _SN.gold,
        unselectedLabelColor: _SN.textMuted,
        labelStyle: GoogleFonts.bebasNeue(fontSize: 14, letterSpacing: 1.5),
        unselectedLabelStyle:
            GoogleFonts.bebasNeue(fontSize: 14, letterSpacing: 1.5),
        tabs: const [
          Tab(text: 'RESUMEN'),
          Tab(text: 'TRANSACCIONES'),
          Tab(text: 'EQUIPOS'),
        ],
      ),
    );
  }

  Widget _buildDashboard(
    BuildContext context,
    FinanceLeagueSummaryEntity summary,
    List<FinanceTeamBalanceEntity> balances,
  ) {
    return TabBarView(
      controller: _tabController,
      children: [
        // Tab 1: Resumen
        _buildSummaryTab(summary, balances),
        // Tab 2: Transacciones (lazy loaded)
        _buildTransactionsTab(context),
        // Tab 3: Balances por equipo
        _buildTeamBalancesTab(balances),
      ],
    );
  }

  // ===== SUMMARY TAB =====
  Widget _buildSummaryTab(
    FinanceLeagueSummaryEntity summary,
    List<FinanceTeamBalanceEntity> balances,
  ) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Stats cards grid
          _buildStatsGrid(summary),
          const SizedBox(height: 24),
          // Net balance card
          _buildNetBalanceCard(summary),
          const SizedBox(height: 24),
          // Quick stats
          _buildQuickStats(summary),
          const SizedBox(height: 24),
          // Top debtors (top 5 teams with pending)
          if (balances.isNotEmpty) _buildTopDebtors(balances),
        ],
      ),
    );
  }

  Widget _buildStatsGrid(FinanceLeagueSummaryEntity summary) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.5,
      children: [
        _buildStatCard(
          'Ingresos',
          _currencyFormat.format(summary.totalIncome),
          Icons.trending_up,
          _SN.neonGreen,
        ),
        _buildStatCard(
          'Gastos',
          _currencyFormat.format(summary.totalExpenses),
          Icons.trending_down,
          _SN.error,
        ),
        _buildStatCard(
          'Pendiente',
          _currencyFormat.format(summary.totalPending),
          Icons.schedule,
          _SN.amber,
        ),
        _buildStatCard(
          'Vencido',
          _currencyFormat.format(summary.totalOverdue),
          Icons.warning_amber_rounded,
          _SN.error,
        ),
      ],
    );
  }

  Widget _buildStatCard(
      String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _SN.cardDark,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: color, size: 16),
              ),
              const SizedBox(width: 8),
              Text(
                label,
                style: GoogleFonts.outfit(
                  fontSize: 12,
                  color: _SN.textSecondary,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          Text(
            value,
            style: GoogleFonts.bebasNeue(
              fontSize: 22,
              color: color,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNetBalanceCard(FinanceLeagueSummaryEntity summary) {
    final netBalance = summary.netBalance;
    final isPositive = netBalance >= 0;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            isPositive
                ? _SN.neonGreen.withOpacity(0.1)
                : _SN.error.withOpacity(0.1),
            _SN.cardDark,
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isPositive
              ? _SN.neonGreen.withOpacity(0.3)
              : _SN.error.withOpacity(0.3),
        ),
      ),
      child: Column(
        children: [
          Text(
            'BALANCE NETO',
            style: GoogleFonts.bebasNeue(
              fontSize: 14,
              color: _SN.textSecondary,
              letterSpacing: 2,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _currencyFormat.format(netBalance),
            style: GoogleFonts.bebasNeue(
              fontSize: 36,
              color: isPositive ? _SN.neonGreen : _SN.error,
              letterSpacing: 1,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickStats(FinanceLeagueSummaryEntity summary) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _SN.cardDark,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _SN.gold.withOpacity(0.15)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildQuickStat('Equipos', summary.teamCount.toString()),
          Container(width: 1, height: 30, color: _SN.gold.withOpacity(0.15)),
          _buildQuickStat(
              'Transacciones', summary.transactionCount.toString()),
          Container(width: 1, height: 30, color: _SN.gold.withOpacity(0.15)),
          _buildQuickStat('Cobrado',
              _currencyFormat.format(summary.totalPaid)),
        ],
      ),
    );
  }

  Widget _buildQuickStat(String label, String value) {
    return Column(
      children: [
        Text(
          value,
          style: GoogleFonts.bebasNeue(
            fontSize: 20,
            color: _SN.gold,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: GoogleFonts.outfit(
            fontSize: 11,
            color: _SN.textMuted,
          ),
        ),
      ],
    );
  }

  Widget _buildTopDebtors(List<FinanceTeamBalanceEntity> balances) {
    final debtors =
        balances.where((b) => b.totalPending > 0).take(5).toList();
    if (debtors.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'EQUIPOS CON ADEUDO',
          style: GoogleFonts.bebasNeue(
            fontSize: 16,
            color: _SN.gold,
            letterSpacing: 2,
          ),
        ),
        const SizedBox(height: 12),
        ...debtors.map((balance) => _buildDebtorRow(balance)),
      ],
    );
  }

  Widget _buildDebtorRow(FinanceTeamBalanceEntity balance) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _SN.surfaceDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: balance.totalOverdue > 0
              ? _SN.error.withOpacity(0.3)
              : _SN.gold.withOpacity(0.1),
        ),
      ),
      child: Row(
        children: [
          _buildTeamAvatar(balance.teamLogo),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  balance.teamName,
                  style: GoogleFonts.outfit(
                    fontSize: 14,
                    color: _SN.textPrimary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${balance.transactionCount} transacciones',
                  style: GoogleFonts.outfit(
                    fontSize: 11,
                    color: _SN.textMuted,
                  ),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                _currencyFormat.format(balance.totalPending),
                style: GoogleFonts.bebasNeue(
                  fontSize: 18,
                  color: _SN.amber,
                ),
              ),
              if (balance.totalOverdue > 0)
                Text(
                  '${_currencyFormat.format(balance.totalOverdue)} vencido',
                  style: GoogleFonts.outfit(
                    fontSize: 10,
                    color: _SN.error,
                    fontWeight: FontWeight.w500,
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  // ===== TRANSACTIONS TAB =====
  Widget _buildTransactionsTab(BuildContext context) {
    return BlocBuilder<FinanceBloc, FinanceState>(
      builder: (context, state) {
        if (state is FinanceTransactionsLoaded) {
          return _buildTransactionsList(context, state.transactions);
        }
        // Trigger loading
        if (state is FinanceDashboardLoaded) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            context
                .read<FinanceBloc>()
                .add(LoadTransactions(leagueId: widget.leagueId));
          });
        }
        return _buildLoading();
      },
    );
  }

  Widget _buildTransactionsList(
      BuildContext context, List<FinanceTransactionEntity> transactions) {
    if (transactions.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.receipt_long_outlined,
                size: 60, color: _SN.textMuted),
            const SizedBox(height: 16),
            Text(
              'SIN TRANSACCIONES',
              style: GoogleFonts.bebasNeue(
                fontSize: 20,
                color: _SN.textPrimary,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Aun no hay transacciones registradas.',
              style: GoogleFonts.outfit(
                fontSize: 14,
                color: _SN.textSecondary,
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: transactions.length,
      itemBuilder: (context, index) {
        final transaction = transactions[index];
        return _TransactionCard(
          transaction: transaction,
          currencyFormat: _currencyFormat,
          onCancel: () {
            context.read<FinanceBloc>().add(CancelTransaction(
                  transactionId: transaction.id,
                  leagueId: widget.leagueId,
                ));
          },
          onPay: () => _navigateToPayment(context, transaction),
        );
      },
    );
  }

  // ===== TEAM BALANCES TAB =====
  Widget _buildTeamBalancesTab(List<FinanceTeamBalanceEntity> balances) {
    if (balances.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.groups_outlined, size: 60, color: _SN.textMuted),
            const SizedBox(height: 16),
            Text(
              'SIN DATOS',
              style: GoogleFonts.bebasNeue(
                fontSize: 20,
                color: _SN.textPrimary,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Aun no hay balances de equipos.',
              style: GoogleFonts.outfit(
                fontSize: 14,
                color: _SN.textSecondary,
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: balances.length,
      itemBuilder: (context, index) {
        final balance = balances[index];
        return _TeamBalanceCard(
          balance: balance,
          currencyFormat: _currencyFormat,
        );
      },
    );
  }

  // ===== COMMON WIDGETS =====
  Widget _buildTeamAvatar(String? logo) {
    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        color: _SN.cardDark,
        borderRadius: BorderRadius.circular(8),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: logo != null ? _buildLogoImage(logo) : _buildDefaultAvatar(),
      ),
    );
  }

  Widget _buildLogoImage(String logoData) {
    try {
      if (logoData.startsWith('data:image/')) {
        final base64Data = logoData.split(',')[1];
        final Uint8List bytes = base64Decode(base64Data);
        return Image.memory(bytes,
            width: 36, height: 36, fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => _buildDefaultAvatar());
      }
      return Image.network(logoData,
          width: 36, height: 36, fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _buildDefaultAvatar());
    } catch (_) {
      return _buildDefaultAvatar();
    }
  }

  Widget _buildDefaultAvatar() {
    return Icon(Icons.shield, size: 20, color: _SN.gold.withOpacity(0.5));
  }

  Widget _buildLoading() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(
            width: 50,
            height: 50,
            child: CircularProgressIndicator(
              strokeWidth: 3,
              valueColor: AlwaysStoppedAnimation<Color>(_SN.gold),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'CARGANDO FINANZAS',
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

  Widget _buildError(BuildContext context, String message) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 50, color: _SN.error),
            const SizedBox(height: 20),
            Text(
              'ERROR',
              style: GoogleFonts.bebasNeue(
                fontSize: 20,
                color: _SN.textPrimary,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: GoogleFonts.outfit(
                fontSize: 14,
                color: _SN.textSecondary,
              ),
            ),
            const SizedBox(height: 24),
            GestureDetector(
              onTap: () {
                context
                    .read<FinanceBloc>()
                    .add(LoadFinanceDashboard(leagueId: widget.leagueId));
              },
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                decoration: BoxDecoration(
                  gradient:
                      LinearGradient(colors: [_SN.gold, _SN.amber]),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.refresh, color: Colors.black, size: 18),
                    const SizedBox(width: 8),
                    Text(
                      'REINTENTAR',
                      style: GoogleFonts.bebasNeue(
                        fontSize: 14,
                        color: Colors.black,
                        letterSpacing: 1,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ===== NAVIGATION =====
  void _navigateToConfig(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => FinanceConfigScreen(leagueId: widget.leagueId),
      ),
    );
  }

  void _navigateToCreateTransaction(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) =>
            FinanceTransactionFormScreen(leagueId: widget.leagueId),
      ),
    ).then((created) {
      if (created == true) {
        context
            .read<FinanceBloc>()
            .add(LoadFinanceDashboard(leagueId: widget.leagueId));
      }
    });
  }

  void _navigateToPayment(
      BuildContext context, FinanceTransactionEntity transaction) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => FinancePaymentFormScreen(transaction: transaction),
      ),
    ).then((paid) {
      if (paid == true) {
        context
            .read<FinanceBloc>()
            .add(LoadFinanceDashboard(leagueId: widget.leagueId));
      }
    });
  }
}

// ===== TRANSACTION CARD =====
class _TransactionCard extends StatelessWidget {
  final FinanceTransactionEntity transaction;
  final NumberFormat currencyFormat;
  final VoidCallback onCancel;
  final VoidCallback onPay;

  const _TransactionCard({
    required this.transaction,
    required this.currencyFormat,
    required this.onCancel,
    required this.onPay,
  });

  Color get _statusColor {
    switch (transaction.status) {
      case TransactionStatus.paid:
        return _SN.neonGreen;
      case TransactionStatus.pending:
        return _SN.amber;
      case TransactionStatus.partiallyPaid:
        return _SN.amber;
      case TransactionStatus.overdue:
        return _SN.error;
      case TransactionStatus.cancelled:
        return _SN.textMuted;
      case TransactionStatus.waived:
        return _SN.textMuted;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _SN.surfaceDark,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: transaction.isOverdue
              ? _SN.error.withOpacity(0.3)
              : _SN.gold.withOpacity(0.1),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top row: type + status
          Row(
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: _statusColor.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  transaction.status.display,
                  style: GoogleFonts.outfit(
                    fontSize: 10,
                    color: _statusColor,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const Spacer(),
              Text(
                currencyFormat.format(transaction.amount),
                style: GoogleFonts.bebasNeue(
                  fontSize: 20,
                  color: _SN.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          // Type
          Text(
            transaction.transactionType.display,
            style: GoogleFonts.outfit(
              fontSize: 14,
              color: _SN.textPrimary,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 4),
          // Team / Player
          Row(
            children: [
              Icon(Icons.shield, size: 12, color: _SN.textMuted),
              const SizedBox(width: 4),
              Text(
                transaction.teamName ?? 'Equipo',
                style: GoogleFonts.outfit(
                  fontSize: 12,
                  color: _SN.textSecondary,
                ),
              ),
              if (transaction.playerName != null) ...[
                const SizedBox(width: 8),
                Icon(Icons.person, size: 12, color: _SN.textMuted),
                const SizedBox(width: 4),
                Text(
                  transaction.playerName!,
                  style: GoogleFonts.outfit(
                    fontSize: 12,
                    color: _SN.textSecondary,
                  ),
                ),
              ],
            ],
          ),
          if (transaction.description != null &&
              transaction.description!.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              transaction.description!,
              style: GoogleFonts.outfit(
                fontSize: 12,
                color: _SN.textMuted,
                fontStyle: FontStyle.italic,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
          // Paid progress
          if (transaction.amountPaid > 0 && !transaction.isPaid) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: transaction.amountPaid / transaction.amount,
                      backgroundColor: _SN.cardDark,
                      valueColor:
                          AlwaysStoppedAnimation<Color>(_SN.neonGreen),
                      minHeight: 4,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  '${currencyFormat.format(transaction.amountPaid)} pagado',
                  style: GoogleFonts.outfit(
                    fontSize: 10,
                    color: _SN.neonGreen,
                  ),
                ),
              ],
            ),
          ],
          // Actions
          if (transaction.status != TransactionStatus.paid &&
              transaction.status != TransactionStatus.cancelled &&
              transaction.status != TransactionStatus.waived) ...[
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                GestureDetector(
                  onTap: onCancel,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: _SN.error.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: _SN.error.withOpacity(0.3)),
                    ),
                    child: Text(
                      'Cancelar',
                      style: GoogleFonts.outfit(
                        fontSize: 11,
                        color: _SN.error,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: onPay,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [_SN.gold, _SN.amber],
                      ),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      'Registrar Pago',
                      style: GoogleFonts.outfit(
                        fontSize: 11,
                        color: Colors.black,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

// ===== TEAM BALANCE CARD =====
class _TeamBalanceCard extends StatelessWidget {
  final FinanceTeamBalanceEntity balance;
  final NumberFormat currencyFormat;

  const _TeamBalanceCard({
    required this.balance,
    required this.currencyFormat,
  });

  @override
  Widget build(BuildContext context) {
    final percentage = balance.paymentPercentage;
    final progressColor = percentage >= 80
        ? _SN.neonGreen
        : percentage >= 50
            ? _SN.amber
            : _SN.error;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _SN.surfaceDark,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _SN.gold.withOpacity(0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Team name + total charges
          Row(
            children: [
              _buildTeamAvatar(balance.teamLogo),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  balance.teamName,
                  style: GoogleFonts.outfit(
                    fontSize: 15,
                    color: _SN.textPrimary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    currencyFormat.format(balance.totalCharges),
                    style: GoogleFonts.bebasNeue(
                      fontSize: 18,
                      color: _SN.textPrimary,
                    ),
                  ),
                  Text(
                    'Total',
                    style: GoogleFonts.outfit(
                      fontSize: 10,
                      color: _SN.textMuted,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 14),
          // Progress bar
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: percentage / 100,
              backgroundColor: _SN.cardDark,
              valueColor: AlwaysStoppedAnimation<Color>(progressColor),
              minHeight: 6,
            ),
          ),
          const SizedBox(height: 10),
          // Stats row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _buildMiniStat(
                  'Pagado', currencyFormat.format(balance.totalPaid),
                  color: _SN.neonGreen),
              _buildMiniStat(
                  'Pendiente', currencyFormat.format(balance.totalPending),
                  color: _SN.amber),
              _buildMiniStat(
                  'Vencido', currencyFormat.format(balance.totalOverdue),
                  color: balance.totalOverdue > 0
                      ? _SN.error
                      : _SN.textMuted),
              Text(
                '${percentage.toStringAsFixed(0)}%',
                style: GoogleFonts.bebasNeue(
                  fontSize: 18,
                  color: progressColor,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTeamAvatar(String? logo) {
    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        color: _SN.cardDark,
        borderRadius: BorderRadius.circular(8),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: logo != null
            ? _buildLogoImage(logo)
            : Icon(Icons.shield, size: 20, color: _SN.gold.withOpacity(0.5)),
      ),
    );
  }

  Widget _buildLogoImage(String logoData) {
    try {
      if (logoData.startsWith('data:image/')) {
        final base64Data = logoData.split(',')[1];
        final Uint8List bytes = base64Decode(base64Data);
        return Image.memory(bytes,
            width: 36, height: 36, fit: BoxFit.cover,
            errorBuilder: (_, __, ___) =>
                Icon(Icons.shield, size: 20, color: _SN.gold.withOpacity(0.5)));
      }
      return Image.network(logoData,
          width: 36, height: 36, fit: BoxFit.cover,
          errorBuilder: (_, __, ___) =>
              Icon(Icons.shield, size: 20, color: _SN.gold.withOpacity(0.5)));
    } catch (_) {
      return Icon(Icons.shield, size: 20, color: _SN.gold.withOpacity(0.5));
    }
  }

  Widget _buildMiniStat(String label, String value, {Color? color}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          value,
          style: GoogleFonts.outfit(
            fontSize: 12,
            color: color ?? _SN.textPrimary,
            fontWeight: FontWeight.w600,
          ),
        ),
        Text(
          label,
          style: GoogleFonts.outfit(
            fontSize: 10,
            color: _SN.textMuted,
          ),
        ),
      ],
    );
  }
}
