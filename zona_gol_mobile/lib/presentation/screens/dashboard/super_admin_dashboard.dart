import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../data/datasources/remote/supabase_client.dart';
import '../../../domain/entities/user_entity.dart';
import '../../bloc/auth/auth_bloc.dart';
import '../../bloc/auth/auth_event.dart';
import '../../widgets/dashboard/dashboard_background.dart';
import '../../widgets/dashboard/dashboard_action_card.dart';
import '../../widgets/dashboard/dashboard_header.dart';
import '../league/create_league_screen.dart';
import '../league/leagues_list_screen.dart';
import '../users/users_list_screen.dart';
import '../settings/settings_screen.dart';
import '../statistics/global_statistics_screen.dart';

/// Super Admin Dashboard - "Noche de Partido" Edition
/// Full access to all system features with premium UI
class SuperAdminDashboard extends StatefulWidget {
  final UserEntity user;

  const SuperAdminDashboard({
    super.key,
    required this.user,
  });

  @override
  State<SuperAdminDashboard> createState() => _SuperAdminDashboardState();
}

class _SuperAdminDashboardState extends State<SuperAdminDashboard> {
  int _leaguesCount = 0;
  int _teamsCount = 0;
  int _usersCount = 0;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadDashboardStats();
  }

  Future<void> _loadDashboardStats() async {
    try {
      final client = SupabaseClientService.instance.client;

      // Fetch all counts in parallel
      final results = await Future.wait([
        client.from('leagues').select('id').eq('is_active', true),
        client.from('teams').select('id').eq('is_active', true),
        client.from('users').select('id'),
      ]);

      if (mounted) {
        setState(() {
          _leaguesCount = (results[0] as List).length;
          _teamsCount = (results[1] as List).length;
          _usersCount = (results[2] as List).length;
          _isLoading = false;
        });
      }
    } catch (e) {
      print('❌ Error loading dashboard stats: $e');
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // Set status bar style for dark theme
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light,
        statusBarBrightness: Brightness.dark,
      ),
    );

    return Scaffold(
      backgroundColor: const Color(0xFF0A0F1C),
      body: DashboardBackground(
        child: Column(
          children: [
            // Header
            DashboardHeader(user: widget.user),

            // Content
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                children: [
                  // Welcome Section
                  _buildWelcomeSection(context),
                  const SizedBox(height: 20),

                  // Quick Stats Row
                  _buildQuickStats(context),
                  const SizedBox(height: 24),

                  // League Management Section
                  const DashboardSectionHeader(
                    title: 'GESTIÓN DE LIGAS',
                    icon: Icons.emoji_events,
                    animationDelay: 0,
                  ),
                  const SizedBox(height: 12),
                  DashboardActionCard(
                    title: 'Ligas',
                    subtitle: 'Ver y administrar todas las ligas',
                    icon: Icons.emoji_events,
                    color: const Color(0xFF10B981),
                    animationDelay: 1,
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (context) => const LeaguesListScreen(),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 8),
                  DashboardActionCard(
                    title: 'Crear Nueva Liga',
                    subtitle: 'Configurar una nueva liga de fútbol',
                    icon: Icons.add_circle,
                    color: const Color(0xFF22C55E),
                    animationDelay: 2,
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (context) => const CreateLeagueScreen(),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 20),

                  // User Management Section
                  const DashboardSectionHeader(
                    title: 'GESTIÓN DE USUARIOS',
                    icon: Icons.people,
                    animationDelay: 3,
                  ),
                  const SizedBox(height: 12),
                  DashboardActionCard(
                    title: 'Usuarios',
                    subtitle: 'Administrar usuarios y roles',
                    icon: Icons.people,
                    color: const Color(0xFF3B82F6),
                    animationDelay: 4,
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (context) => const UsersListScreen(),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 8),
                  DashboardActionCard(
                    title: 'Asignar Roles',
                    subtitle: 'Gestionar permisos de administradores',
                    icon: Icons.admin_panel_settings,
                    color: const Color(0xFFF59E0B),
                    animationDelay: 5,
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (context) => const UsersListScreen(),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 20),

                  // System Section
                  const DashboardSectionHeader(
                    title: 'SISTEMA',
                    icon: Icons.settings,
                    animationDelay: 6,
                  ),
                  const SizedBox(height: 12),
                  DashboardActionCard(
                    title: 'Configuración',
                    subtitle: 'Ajustes generales del sistema',
                    icon: Icons.settings,
                    color: const Color(0xFF6B7280),
                    animationDelay: 7,
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (context) => const SettingsScreen(),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 8),
                  DashboardActionCard(
                    title: 'Estadísticas Globales',
                    subtitle: 'Ver métricas del sistema',
                    icon: Icons.analytics,
                    color: const Color(0xFF8B5CF6),
                    animationDelay: 8,
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (context) => const GlobalStatisticsScreen(),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 20),

                  // Logout
                  DashboardActionCard(
                    title: 'Cerrar Sesión',
                    subtitle: 'Salir de la aplicación',
                    icon: Icons.logout,
                    color: const Color(0xFFEF4444),
                    animationDelay: 9,
                    onTap: () => _handleLogout(context),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWelcomeSection(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.0, end: 1.0),
      duration: const Duration(milliseconds: 600),
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ShaderMask(
            shaderCallback: (bounds) => const LinearGradient(
              colors: [
                Colors.white,
                Color(0xFF10B981),
              ],
            ).createShader(bounds),
            child: const Text(
              'Panel de Control',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Colors.white,
                letterSpacing: 0.5,
              ),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Acceso total al sistema',
            style: TextStyle(
              fontSize: 14,
              color: Colors.white.withOpacity(0.5),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickStats(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.0, end: 1.0),
      duration: const Duration(milliseconds: 700),
      curve: Curves.easeOut,
      builder: (context, value, child) {
        return Opacity(
          opacity: value,
          child: Transform.scale(
            scale: 0.9 + (0.1 * value),
            child: child,
          ),
        );
      },
      child: Row(
        children: [
          Expanded(
            child: _buildStatCard(
              icon: Icons.emoji_events,
              value: _isLoading ? '...' : '$_leaguesCount',
              label: 'Ligas',
              color: const Color(0xFF10B981),
              isLoading: _isLoading,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: _buildStatCard(
              icon: Icons.groups,
              value: _isLoading ? '...' : '$_teamsCount',
              label: 'Equipos',
              color: const Color(0xFF3B82F6),
              isLoading: _isLoading,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: _buildStatCard(
              icon: Icons.people,
              value: _isLoading ? '...' : '$_usersCount',
              label: 'Usuarios',
              color: const Color(0xFF8B5CF6),
              isLoading: _isLoading,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard({
    required IconData icon,
    required String value,
    required String label,
    required Color color,
    bool isLoading = false,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: color.withOpacity(0.2),
          width: 1,
        ),
      ),
      child: Column(
        children: [
          Icon(
            icon,
            color: color,
            size: 22,
          ),
          const SizedBox(height: 6),
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 300),
            child: isLoading
                ? SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(color),
                    ),
                  )
                : Text(
                    value,
                    key: ValueKey(value),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              color: Colors.white.withOpacity(0.5),
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }

  void _showComingSoon(BuildContext context, String feature) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Próximamente: $feature'),
        backgroundColor: const Color(0xFF1F2937),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
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
}
