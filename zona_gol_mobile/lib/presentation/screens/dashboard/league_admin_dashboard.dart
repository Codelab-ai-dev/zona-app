import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../domain/entities/user_entity.dart';
import '../../bloc/auth/auth_bloc.dart';
import '../../bloc/auth/auth_event.dart';
import '../../widgets/dashboard/dashboard_background.dart';
import '../../widgets/dashboard/dashboard_action_card.dart';
import '../../widgets/dashboard/dashboard_header.dart';

/// League Admin Dashboard - "Noche de Partido" Edition
/// Manage tournaments, teams, and matches for a specific league
class LeagueAdminDashboard extends StatelessWidget {
  final UserEntity user;

  const LeagueAdminDashboard({
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

                  // Tournaments
                  const DashboardSectionHeader(
                    title: 'TORNEOS',
                    icon: Icons.sports_soccer,
                    animationDelay: 0,
                  ),
                  const SizedBox(height: 12),
                  DashboardActionCard(
                    title: 'Mis Torneos',
                    subtitle: 'Ver y gestionar torneos activos',
                    icon: Icons.sports_soccer,
                    color: const Color(0xFF10B981),
                    animationDelay: 1,
                    onTap: () => _showComingSoon(context, 'Lista de Torneos'),
                  ),
                  const SizedBox(height: 8),
                  DashboardActionCard(
                    title: 'Crear Torneo',
                    subtitle: 'Configurar un nuevo torneo',
                    icon: Icons.add_circle,
                    color: const Color(0xFF22C55E),
                    animationDelay: 2,
                    onTap: () => _showComingSoon(context, 'Crear Torneo'),
                  ),
                  const SizedBox(height: 8),
                  DashboardActionCard(
                    title: 'Calendario',
                    subtitle: 'Ver fixture y resultados',
                    icon: Icons.calendar_month,
                    color: const Color(0xFF3B82F6),
                    animationDelay: 3,
                    onTap: () => _showComingSoon(context, 'Calendario'),
                  ),
                  const SizedBox(height: 20),

                  // Teams
                  const DashboardSectionHeader(
                    title: 'EQUIPOS',
                    icon: Icons.groups,
                    animationDelay: 4,
                  ),
                  const SizedBox(height: 12),
                  DashboardActionCard(
                    title: 'Equipos',
                    subtitle: 'Gestionar equipos de la liga',
                    icon: Icons.groups,
                    color: const Color(0xFF10B981),
                    animationDelay: 5,
                    onTap: () => _showComingSoon(context, 'Lista de Equipos'),
                  ),
                  const SizedBox(height: 8),
                  DashboardActionCard(
                    title: 'Tabla de Posiciones',
                    subtitle: 'Ver clasificación actual',
                    icon: Icons.emoji_events,
                    color: const Color(0xFFF59E0B),
                    animationDelay: 6,
                    onTap: () => _showComingSoon(context, 'Tabla de Posiciones'),
                  ),
                  const SizedBox(height: 20),

                  // Matches
                  const DashboardSectionHeader(
                    title: 'PARTIDOS',
                    icon: Icons.scoreboard,
                    animationDelay: 7,
                  ),
                  const SizedBox(height: 12),
                  DashboardActionCard(
                    title: 'Registrar Resultado',
                    subtitle: 'Ingresar resultado de partido',
                    icon: Icons.scoreboard,
                    color: const Color(0xFF22C55E),
                    animationDelay: 8,
                    onTap: () => _showComingSoon(context, 'Registrar Resultado'),
                  ),
                  const SizedBox(height: 8),
                  DashboardActionCard(
                    title: 'Generar Fixture',
                    subtitle: 'Crear calendario de partidos',
                    icon: Icons.settings,
                    color: const Color(0xFF8B5CF6),
                    animationDelay: 9,
                    onTap: () => _showComingSoon(context, 'Generar Fixture'),
                  ),
                  const SizedBox(height: 20),

                  // Logout
                  DashboardActionCard(
                    title: 'Cerrar Sesión',
                    subtitle: 'Salir de la aplicación',
                    icon: Icons.logout,
                    color: const Color(0xFFEF4444),
                    animationDelay: 10,
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
              'Gestión de Liga',
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
            'Administra torneos, equipos y partidos',
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
