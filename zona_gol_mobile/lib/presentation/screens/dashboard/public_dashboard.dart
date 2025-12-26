import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../domain/entities/user_entity.dart';
import '../../bloc/auth/auth_bloc.dart';
import '../../bloc/auth/auth_event.dart';
import '../../widgets/dashboard/dashboard_background.dart';
import '../../widgets/dashboard/dashboard_action_card.dart';
import '../../widgets/dashboard/dashboard_header.dart';
import '../league/leagues_list_screen.dart';

/// Public Dashboard - "Noche de Partido" Edition
/// Read-only access to view leagues, matches, and statistics
class PublicDashboard extends StatelessWidget {
  final UserEntity user;

  const PublicDashboard({
    super.key,
    required this.user,
  });

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
            DashboardHeader(user: user),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                children: [
                  // Welcome Section
                  _buildWelcomeSection(context),
                  const SizedBox(height: 24),

                  // Browse
                  const DashboardSectionHeader(
                    title: 'EXPLORAR',
                    icon: Icons.explore,
                    animationDelay: 0,
                  ),
                  const SizedBox(height: 12),
                  DashboardActionCard(
                    title: 'Ligas',
                    subtitle: 'Ver todas las ligas activas',
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
                    title: 'Partidos',
                    subtitle: 'Ver calendario y resultados',
                    icon: Icons.sports_soccer,
                    color: const Color(0xFF3B82F6),
                    animationDelay: 2,
                    onTap: () => _showComingSoon(context, 'Partidos'),
                  ),
                  const SizedBox(height: 8),
                  DashboardActionCard(
                    title: 'Equipos',
                    subtitle: 'Explorar todos los equipos',
                    icon: Icons.groups,
                    color: const Color(0xFFF59E0B),
                    animationDelay: 3,
                    onTap: () => _showComingSoon(context, 'Equipos'),
                  ),
                  const SizedBox(height: 20),

                  // Stats
                  const DashboardSectionHeader(
                    title: 'ESTADÍSTICAS',
                    icon: Icons.leaderboard,
                    animationDelay: 4,
                  ),
                  const SizedBox(height: 12),
                  DashboardActionCard(
                    title: 'Tablas de Posiciones',
                    subtitle: 'Ver clasificaciones',
                    icon: Icons.leaderboard,
                    color: const Color(0xFF22C55E),
                    animationDelay: 5,
                    onTap: () => _showComingSoon(context, 'Tablas'),
                  ),
                  const SizedBox(height: 8),
                  DashboardActionCard(
                    title: 'Goleadores',
                    subtitle: 'Top scorers del torneo',
                    icon: Icons.sports_score,
                    color: const Color(0xFF8B5CF6),
                    animationDelay: 6,
                    onTap: () => _showComingSoon(context, 'Goleadores'),
                  ),
                  const SizedBox(height: 20),

                  // Logout
                  DashboardActionCard(
                    title: 'Cerrar Sesión',
                    subtitle: 'Salir de la aplicación',
                    icon: Icons.logout,
                    color: const Color(0xFFEF4444),
                    animationDelay: 7,
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
              'Bienvenido a Zona Gol',
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
            'Explora ligas, partidos y estadísticas',
            style: TextStyle(
              fontSize: 14,
              color: Colors.white.withOpacity(0.5),
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
