import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../domain/entities/user_entity.dart';
import '../../bloc/auth/auth_bloc.dart';
import '../../bloc/auth/auth_event.dart';
import '../../widgets/dashboard/dashboard_background.dart';
import '../../widgets/dashboard/dashboard_action_card.dart';
import '../../widgets/dashboard/dashboard_header.dart';
import '../player/player_list_screen.dart';
import '../player/create_edit_player_screen.dart';
import '../match/calendar_screen.dart';
import '../coaching_staff/coaching_staff_screen.dart';
import '../statistics/team_stats_screen.dart';
import '../player/player_qr_screen.dart';
import '../player/player_credential_screen.dart';

/// Team Owner Dashboard - "Noche de Partido" Edition
/// Manage team players and view statistics
class TeamOwnerDashboard extends StatelessWidget {
  final UserEntity user;

  const TeamOwnerDashboard({
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

                  // Team
                  const DashboardSectionHeader(
                    title: 'MI EQUIPO',
                    icon: Icons.shield,
                    animationDelay: 0,
                  ),
                  const SizedBox(height: 12),
                  DashboardActionCard(
                    title: 'Información del Equipo',
                    subtitle: 'Ver y editar datos del equipo',
                    icon: Icons.shield,
                    color: const Color(0xFF10B981),
                    animationDelay: 1,
                    onTap: () => _showComingSoon(context, 'Información del Equipo'),
                  ),
                  const SizedBox(height: 20),

                  // Players
                  const DashboardSectionHeader(
                    title: 'JUGADORES',
                    icon: Icons.people,
                    animationDelay: 2,
                  ),
                  const SizedBox(height: 12),
                  DashboardActionCard(
                    title: 'Lista de Jugadores',
                    subtitle: 'Ver todos los jugadores',
                    icon: Icons.people,
                    color: const Color(0xFF10B981),
                    animationDelay: 3,
                    onTap: () => _navigateToPlayerList(context),
                  ),
                  const SizedBox(height: 8),
                  DashboardActionCard(
                    title: 'Agregar Jugador',
                    subtitle: 'Registrar nuevo jugador',
                    icon: Icons.person_add,
                    color: const Color(0xFF22C55E),
                    animationDelay: 4,
                    onTap: () => _navigateToCreatePlayer(context),
                  ),
                  const SizedBox(height: 8),
                  DashboardActionCard(
                    title: 'Cuerpo T\u00e9cnico',
                    subtitle: 'Gestionar directores y asistentes',
                    icon: Icons.groups_3,
                    color: const Color(0xFF8B5CF6),
                    animationDelay: 5,
                    onTap: () => _navigateToCoachingStaff(context),
                  ),
                  const SizedBox(height: 8),
                  DashboardActionCard(
                    title: 'Códigos QR',
                    subtitle: 'Generar QR de jugadores',
                    icon: Icons.qr_code_2,
                    color: const Color(0xFFFFD700),
                    animationDelay: 6,
                    onTap: () => _navigateToQrCodes(context),
                  ),
                  const SizedBox(height: 8),
                  DashboardActionCard(
                    title: 'Credenciales',
                    subtitle: 'Tarjetas de identificación',
                    icon: Icons.badge,
                    color: const Color(0xFF3B82F6),
                    animationDelay: 7,
                    onTap: () => _navigateToCredentials(context),
                  ),
                  const SizedBox(height: 20),

                  // Stats
                  const DashboardSectionHeader(
                    title: 'ESTADÍSTICAS',
                    icon: Icons.bar_chart,
                    animationDelay: 7,
                  ),
                  const SizedBox(height: 12),
                  DashboardActionCard(
                    title: 'Estadísticas del Equipo',
                    subtitle: 'Ver rendimiento y métricas',
                    icon: Icons.bar_chart,
                    color: const Color(0xFF3B82F6),
                    animationDelay: 8,
                    onTap: () => _navigateToTeamStats(context),
                  ),
                  const SizedBox(height: 8),
                  DashboardActionCard(
                    title: 'Próximos Partidos',
                    subtitle: 'Ver calendario de partidos',
                    icon: Icons.calendar_today,
                    color: const Color(0xFFF59E0B),
                    animationDelay: 9,
                    onTap: () => _navigateToCalendar(context),
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
              'Gestión de Equipo',
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
            'Administra tu equipo y jugadores',
            style: TextStyle(
              fontSize: 14,
              color: Colors.white.withOpacity(0.5),
            ),
          ),
        ],
      ),
    );
  }

  void _navigateToTeamStats(BuildContext context) {
    if (user.teamId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('No tienes un equipo asignado'),
          backgroundColor: const Color(0xFFEF4444),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        ),
      );
      return;
    }

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => TeamStatsScreen(user: user),
      ),
    );
  }

  void _navigateToPlayerList(BuildContext context) {
    if (user.teamId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('No tienes un equipo asignado'),
          backgroundColor: const Color(0xFFEF4444),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        ),
      );
      return;
    }

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => PlayerListScreen(
          teamId: user.teamId!,
          teamName: 'Mi Equipo',
          canEdit: true,
        ),
      ),
    );
  }

  void _navigateToCreatePlayer(BuildContext context) {
    if (user.teamId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('No tienes un equipo asignado'),
          backgroundColor: const Color(0xFFEF4444),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        ),
      );
      return;
    }

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => CreateEditPlayerScreen(
          teamId: user.teamId!,
          teamName: 'Mi Equipo',
        ),
      ),
    );
  }

  void _navigateToCoachingStaff(BuildContext context) {
    if (user.teamId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('No tienes un equipo asignado'),
          backgroundColor: const Color(0xFFEF4444),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        ),
      );
      return;
    }

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => CoachingStaffScreen(
          teamId: user.teamId!,
          teamName: 'Mi Equipo',
          canEdit: true,
        ),
      ),
    );
  }

  void _navigateToCredentials(BuildContext context) {
    if (user.teamId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('No tienes un equipo asignado'),
          backgroundColor: const Color(0xFFEF4444),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        ),
      );
      return;
    }

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => PlayerCredentialScreen(
          teamId: user.teamId!,
          teamName: 'Mi Equipo',
          leagueId: user.leagueId,
        ),
      ),
    );
  }

  void _navigateToQrCodes(BuildContext context) {
    if (user.teamId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('No tienes un equipo asignado'),
          backgroundColor: const Color(0xFFEF4444),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        ),
      );
      return;
    }

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => PlayerQrScreen(
          teamId: user.teamId!,
          teamName: 'Mi Equipo',
          leagueId: user.leagueId,
        ),
      ),
    );
  }

  void _navigateToCalendar(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => CalendarScreen(user: user),
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
