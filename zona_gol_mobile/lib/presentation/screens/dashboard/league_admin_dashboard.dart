import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/di/injection.dart';
import '../../../core/utils/feature_gate.dart';
import '../../../domain/entities/user_entity.dart';
import '../../bloc/auth/auth_bloc.dart';
import '../../bloc/auth/auth_event.dart';
import '../../bloc/tournament/tournament_bloc.dart';
import '../../widgets/dashboard/dashboard_background.dart';
import '../../widgets/dashboard/dashboard_header.dart';
import '../tournament/tournaments_list_screen.dart';
import '../tournament/create_tournament_screen.dart';
import '../fixture/fixture_generator_screen.dart';
import '../match/calendar_screen.dart';
import '../match/pending_matches_screen.dart';
import '../player/team_players_screen.dart';
import '../player/player_verification_screen.dart';
import '../player/batch_qr_generation_screen.dart';
import '../standings/standings_screen.dart';
import '../statistics/top_scorers_screen.dart';
import '../suspension/suspensions_management_screen.dart';
import '../attendance/qr_scanner_screen.dart';
import '../match/create_match_screen.dart';
import '../team/team_management_screen.dart';
import '../finance/finance_module_screen.dart';
import '../whatsapp/whatsapp_management_screen.dart';
import '../settings/change_password_screen.dart';
import '../statistics/league_statistics_screen.dart';

/// League Admin Dashboard - "Noche de Partido" Edition
class LeagueAdminDashboard extends StatefulWidget {
  final UserEntity user;

  const LeagueAdminDashboard({
    super.key,
    required this.user,
  });

  @override
  State<LeagueAdminDashboard> createState() => _LeagueAdminDashboardState();
}

class _LeagueAdminDashboardState extends State<LeagueAdminDashboard> {
  bool _hasFinances = false;
  bool _hasWhatsApp = false;
  String _selectedCategory = 'all';

  // Category definitions
  static const _categories = <String, String>{
    'all': 'Todos',
    'torneos': 'Torneos',
    'equipos': 'Equipos',
    'partidos': 'Partidos',
    'stats': 'Stats',
    'modulos': 'Módulos',
  };

  static const _categoryIcons = <String, IconData>{
    'all': Icons.apps,
    'torneos': Icons.sports_soccer,
    'equipos': Icons.groups,
    'partidos': Icons.scoreboard,
    'stats': Icons.leaderboard,
    'modulos': Icons.extension,
  };

  @override
  void initState() {
    super.initState();
    _checkFeatures();
  }

  Future<void> _checkFeatures() async {
    if (widget.user.leagueId == null) return;
    final finances = await FeatureGate.hasFeature(widget.user.leagueId!, 'finances');
    final whatsapp = await FeatureGate.hasFeature(widget.user.leagueId!, 'whatsapp');
    if (mounted) {
      setState(() {
        _hasFinances = finances;
        _hasWhatsApp = whatsapp;
      });
    }
  }

  List<_DashboardItem> _getGridItems() {
    final items = <_DashboardItem>[
      _DashboardItem('torneos', 'Mis Torneos', Icons.sports_soccer, const Color(0xFF10B981), () => _navigateToTournaments(context)),
      _DashboardItem('torneos', 'Crear Torneo', Icons.add_circle, const Color(0xFF22C55E), () => _navigateToCreateTournament(context)),
      _DashboardItem('torneos', 'Calendario', Icons.calendar_month, const Color(0xFF3B82F6), () => _navigateToCalendar(context)),
      _DashboardItem('equipos', 'Equipos', Icons.groups, const Color(0xFF10B981), () => _navigateToTeamManagement(context)),
      _DashboardItem('equipos', 'Jugadores', Icons.person, const Color(0xFF06B6D4), () => _navigateToTeams(context)),
      _DashboardItem('equipos', 'Posiciones', Icons.emoji_events, const Color(0xFFF59E0B), () => _navigateToStandings(context)),
      _DashboardItem('equipos', 'Verificar', Icons.verified_user, const Color(0xFF8B5CF6), () => _navigateToPlayerVerification(context)),
      _DashboardItem('partidos', 'Resultado', Icons.scoreboard, const Color(0xFF22C55E), () => _navigateToRegisterResults(context)),
      _DashboardItem('partidos', 'Programar', Icons.add_box, const Color(0xFF06B6D4), () => _navigateToCreateMatch(context)),
      _DashboardItem('partidos', 'Fixture', Icons.settings, const Color(0xFF8B5CF6), () => _navigateToFixtureGenerator(context)),
      _DashboardItem('partidos', 'QR Masivo', Icons.qr_code_2, const Color(0xFFF59E0B), () => _navigateToBatchQr(context)),
      _DashboardItem('stats', 'Goleadores', Icons.leaderboard, const Color(0xFF3B82F6), () => _navigateToTopScorers(context)),
      _DashboardItem('stats', 'Suspensiones', Icons.gavel, const Color(0xFFEF4444), () => _navigateToSuspensions(context)),
      _DashboardItem('stats', 'Estadísticas', Icons.analytics, const Color(0xFF00FF7F), () => _navigateToLeagueStatistics(context)),
      if (_hasFinances)
        _DashboardItem('modulos', 'Finanzas', Icons.account_balance_wallet, const Color(0xFF10B981), () => _navigateToFinances(context)),
      if (_hasWhatsApp)
        _DashboardItem('modulos', 'WhatsApp', Icons.chat, const Color(0xFF25D366), () => _navigateToWhatsApp(context)),
    ];

    if (_selectedCategory == 'all') return items;
    return items.where((i) => i.category == _selectedCategory).toList();
  }

  @override
  Widget build(BuildContext context) {
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light,
        statusBarBrightness: Brightness.dark,
      ),
    );

    final gridItems = _getGridItems();

    return Scaffold(
      backgroundColor: const Color(0xFF0A0F1C),
      body: DashboardBackground(
        child: Column(
          children: [
            DashboardHeader(user: widget.user),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                children: [
                  _buildQuickActions(),
                  const SizedBox(height: 16),
                  _buildCategoryChips(),
                  const SizedBox(height: 16),
                  _buildActionGrid(gridItems),
                  const SizedBox(height: 20),
                  _buildFooter(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActions() {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.0, end: 1.0),
      duration: const Duration(milliseconds: 500),
      curve: Curves.easeOut,
      builder: (context, value, child) {
        return Opacity(
          opacity: value,
          child: Transform.translate(
            offset: Offset(0, 10 * (1 - value)),
            child: child,
          ),
        );
      },
      child: Row(
        children: [
          Expanded(
            child: _buildQuickActionChip(
              icon: Icons.scoreboard,
              label: 'Registrar Resultado',
              color: const Color(0xFF22C55E),
              onTap: () => _navigateToRegisterResults(context),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: _buildQuickActionChip(
              icon: Icons.qr_code_scanner,
              label: 'Escáner QR',
              color: const Color(0xFFFFD700),
              onTap: () => _navigateToQrScanner(context),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActionChip({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                color.withOpacity(0.2),
                color.withOpacity(0.08),
              ],
            ),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: color.withOpacity(0.35),
              width: 1,
            ),
            boxShadow: [
              BoxShadow(
                color: color.withOpacity(0.15),
                blurRadius: 12,
                spreadRadius: -4,
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: color, size: 20),
              const SizedBox(width: 8),
              Flexible(
                child: Text(
                  label,
                  style: TextStyle(
                    color: color,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCategoryChips() {
    // Hide "Módulos" chip if no modules are enabled
    final visibleCategories = Map<String, String>.from(_categories);
    if (!_hasFinances && !_hasWhatsApp) {
      visibleCategories.remove('modulos');
    }

    return SizedBox(
      height: 36,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: visibleCategories.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final key = visibleCategories.keys.elementAt(index);
          final label = visibleCategories[key]!;
          final isSelected = _selectedCategory == key;
          final chipIcon = _categoryIcons[key];

          return GestureDetector(
            onTap: () => setState(() => _selectedCategory = key),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 0),
              decoration: BoxDecoration(
                color: isSelected
                    ? const Color(0xFF10B981).withOpacity(0.2)
                    : Colors.white.withOpacity(0.05),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(
                  color: isSelected
                      ? const Color(0xFF10B981).withOpacity(0.5)
                      : Colors.white.withOpacity(0.1),
                  width: 1,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (chipIcon != null) ...[
                    Icon(
                      chipIcon,
                      size: 14,
                      color: isSelected
                          ? const Color(0xFF10B981)
                          : Colors.white.withOpacity(0.5),
                    ),
                    const SizedBox(width: 5),
                  ],
                  Text(
                    label,
                    style: TextStyle(
                      color: isSelected
                          ? const Color(0xFF10B981)
                          : Colors.white.withOpacity(0.6),
                      fontSize: 13,
                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildActionGrid(List<_DashboardItem> items) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 10,
        crossAxisSpacing: 10,
        childAspectRatio: 1.1,
      ),
      itemCount: items.length,
      itemBuilder: (context, index) {
        final item = items[index];
        return _CompactTile(
          title: item.title,
          icon: item.icon,
          color: item.color,
          onTap: item.onTap,
          animationDelay: index,
        );
      },
    );
  }

  Widget _buildFooter() {
    return Row(
      children: [
        Expanded(
          child: _buildFooterButton(
            icon: Icons.lock,
            label: 'Contraseña',
            color: const Color(0xFF6B7280),
            onTap: () => _navigateToChangePassword(context),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _buildFooterButton(
            icon: Icons.logout,
            label: 'Cerrar Sesión',
            color: const Color(0xFFEF4444),
            onTap: () => _handleLogout(context),
          ),
        ),
      ],
    );
  }

  Widget _buildFooterButton({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.04),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: color.withOpacity(0.2),
              width: 1,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: color, size: 18),
              const SizedBox(width: 8),
              Text(
                label,
                style: TextStyle(
                  color: color,
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _handleLogout(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1F2937),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: const Text(
          'Cerrar Sesión',
          style: TextStyle(color: Colors.white),
        ),
        content: Text(
          '¿Estás seguro que deseas salir?',
          style: TextStyle(color: Colors.white.withOpacity(0.7)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(
              'Cancelar',
              style: TextStyle(color: Colors.white.withOpacity(0.6)),
            ),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              context.read<AuthBloc>().add(const LogoutEvent());
            },
            style: TextButton.styleFrom(
              foregroundColor: const Color(0xFFEF4444),
            ),
            child: const Text('Salir'),
          ),
        ],
      ),
    );
  }

  void _navigateToTournaments(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => TournamentsListScreen(user: widget.user),
      ),
    );
  }

  void _navigateToCreateTournament(BuildContext context) {
    if (widget.user.leagueId == null) {
      _showNoLeagueError(context);
      return;
    }

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => BlocProvider(
          create: (context) => sl<TournamentBloc>(),
          child: CreateTournamentScreen(leagueId: widget.user.leagueId!),
        ),
      ),
    );
  }

  void _navigateToRegisterResults(BuildContext context) {
    if (widget.user.leagueId == null) {
      _showNoLeagueError(context);
      return;
    }

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => PendingMatchesScreen(user: widget.user),
      ),
    );
  }

  void _navigateToCreateMatch(BuildContext context) {
    if (widget.user.leagueId == null) {
      _showNoLeagueError(context);
      return;
    }

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => CreateMatchScreen(leagueId: widget.user.leagueId!),
      ),
    );
  }

  void _navigateToFixtureGenerator(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => FixtureGeneratorScreen(user: widget.user),
      ),
    );
  }

  void _navigateToCalendar(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => CalendarScreen(user: widget.user),
      ),
    );
  }

  void _navigateToTeams(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => TeamPlayersScreen(user: widget.user),
      ),
    );
  }

  void _navigateToTeamManagement(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => TeamManagementScreen(user: widget.user),
      ),
    );
  }

  void _navigateToTopScorers(BuildContext context) {
    if (widget.user.leagueId == null) {
      _showNoLeagueError(context);
      return;
    }

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => TopScorersScreen(user: widget.user),
      ),
    );
  }

  void _navigateToStandings(BuildContext context) {
    if (widget.user.leagueId == null) {
      _showNoLeagueError(context);
      return;
    }

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => StandingsScreen(user: widget.user),
      ),
    );
  }

  void _navigateToQrScanner(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => QrScannerScreen(user: widget.user),
      ),
    );
  }

  void _navigateToLeagueStatistics(BuildContext context) {
    if (widget.user.leagueId == null) {
      _showNoLeagueError(context);
      return;
    }

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => LeagueStatisticsScreen(user: widget.user),
      ),
    );
  }

  void _navigateToSuspensions(BuildContext context) {
    if (widget.user.leagueId == null) {
      _showNoLeagueError(context);
      return;
    }

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => SuspensionsManagementScreen(user: widget.user),
      ),
    );
  }

  void _navigateToPlayerVerification(BuildContext context) {
    if (widget.user.leagueId == null) {
      _showNoLeagueError(context);
      return;
    }

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => PlayerVerificationScreen(user: widget.user),
      ),
    );
  }

  void _navigateToBatchQr(BuildContext context) {
    if (widget.user.leagueId == null) {
      _showNoLeagueError(context);
      return;
    }

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => BatchQrGenerationScreen(user: widget.user),
      ),
    );
  }

  void _navigateToFinances(BuildContext context) {
    if (widget.user.leagueId == null) {
      _showNoLeagueError(context);
      return;
    }

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => FinanceModuleScreen(
              leagueId: widget.user.leagueId!,
              leagueName: widget.user.name ?? 'Liga',
            ),
      ),
    );
  }

  void _navigateToWhatsApp(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => WhatsAppManagementScreen(user: widget.user),
      ),
    );
  }

  void _navigateToChangePassword(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const ChangePasswordScreen(),
      ),
    );
  }

  void _showNoLeagueError(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('No tienes una liga asignada'),
        backgroundColor: const Color(0xFFEF4444),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
        ),
      ),
    );
  }
}

/// Data class for grid items
class _DashboardItem {
  final String category;
  final String title;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _DashboardItem(this.category, this.title, this.icon, this.color, this.onTap);
}

/// Compact square tile for the 2-column grid
class _CompactTile extends StatefulWidget {
  final String title;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  final int animationDelay;

  const _CompactTile({
    required this.title,
    required this.icon,
    required this.color,
    required this.onTap,
    this.animationDelay = 0,
  });

  @override
  State<_CompactTile> createState() => _CompactTileState();
}

class _CompactTileState extends State<_CompactTile>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeIn;
  late Animation<Offset> _slideIn;
  bool _isPressed = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );

    _fadeIn = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOut),
    );

    _slideIn = Tween<Offset>(
      begin: const Offset(0, 0.15),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic));

    Future.delayed(Duration(milliseconds: widget.animationDelay * 60), () {
      if (mounted) _controller.forward();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _fadeIn,
      child: SlideTransition(
        position: _slideIn,
        child: GestureDetector(
          onTapDown: (_) => setState(() => _isPressed = true),
          onTapUp: (_) => setState(() => _isPressed = false),
          onTapCancel: () => setState(() => _isPressed = false),
          onTap: widget.onTap,
          child: AnimatedScale(
            scale: _isPressed ? 0.95 : 1.0,
            duration: const Duration(milliseconds: 100),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.06),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: Colors.white.withOpacity(0.08),
                      width: 1,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: widget.color.withOpacity(_isPressed ? 0.25 : 0.08),
                        blurRadius: _isPressed ? 20 : 12,
                        spreadRadius: _isPressed ? -2 : -5,
                      ),
                    ],
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: widget.color.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: widget.color.withOpacity(0.3),
                            width: 1,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: widget.color.withOpacity(0.3),
                              blurRadius: 10,
                              spreadRadius: -4,
                            ),
                          ],
                        ),
                        child: Icon(
                          widget.icon,
                          color: widget.color,
                          size: 22,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        child: Text(
                          widget.title,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            letterSpacing: 0.1,
                          ),
                          textAlign: TextAlign.center,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
