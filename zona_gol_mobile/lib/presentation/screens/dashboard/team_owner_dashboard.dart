import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/di/injection.dart';
import '../../../domain/entities/team_entity.dart';
import '../../../domain/entities/user_entity.dart';
import '../../../domain/repositories/team_repository.dart';
import '../../bloc/auth/auth_bloc.dart';
import '../../bloc/auth/auth_event.dart';
import '../../bloc/player/player_bloc.dart';
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

  /// The owner's team: the profile's team_id, otherwise the first of
  /// `GET /my-teams`. Shows a message and returns null when there is none.
  Future<TeamEntity?> _resolveTeam(BuildContext context) async {
    final result = await sl<TeamRepository>().getMyTeams();
    if (!context.mounted) return null;
    final teams = result.getOrElse(() => const <TeamEntity>[]);
    TeamEntity? team;
    for (final t in teams) {
      if (t.id == user.teamId) team = t;
    }
    team ??= teams.isNotEmpty ? teams.first : null;
    if (team == null && user.teamId == null) {
      final message = result.fold((f) => f.message, (_) => 'No tienes un equipo asignado');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: const Color(0xFFEF4444),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        ),
      );
      return null;
    }
    return team ??
        TeamEntity(
          id: user.teamId!,
          name: 'Mi Equipo',
          slug: '',
          leagueId: user.leagueId ?? '',
          ownerId: user.id,
          isActive: true,
        );
  }

  Future<void> _openForTeam(
    BuildContext context,
    Widget Function(TeamEntity team) screen,
  ) async {
    final team = await _resolveTeam(context);
    if (team == null || !context.mounted) return;
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => screen(team)),
    );
  }

  void _navigateToTeamStats(BuildContext context) {
    _openForTeam(
      context,
      (team) => TeamStatsScreen(
        user: UserEntity(
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          leagueId: user.leagueId ?? team.leagueId,
          teamId: team.id,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt,
        ),
      ),
    );
  }

  void _navigateToPlayerList(BuildContext context) {
    _openForTeam(
      context,
      (team) => PlayerListScreen(
        teamId: team.id,
        teamName: team.name,
        canEdit: true,
      ),
    );
  }

  void _navigateToCreatePlayer(BuildContext context) {
    _openForTeam(
      context,
      (team) => BlocProvider(
        create: (_) => sl<PlayerBloc>(),
        child: CreateEditPlayerScreen(
          teamId: team.id,
          teamName: team.name,
        ),
      ),
    );
  }

  void _navigateToCoachingStaff(BuildContext context) {
    _openForTeam(
      context,
      (team) => CoachingStaffScreen(
        teamId: team.id,
        teamName: team.name,
        canEdit: true,
      ),
    );
  }

  void _navigateToCredentials(BuildContext context) {
    _openForTeam(
      context,
      (team) => PlayerCredentialScreen(
        teamId: team.id,
        teamName: team.name,
        leagueId: user.leagueId ?? team.leagueId,
      ),
    );
  }

  void _navigateToQrCodes(BuildContext context) {
    _openForTeam(
      context,
      (team) => PlayerQrScreen(
        teamId: team.id,
        teamName: team.name,
        leagueId: user.leagueId ?? team.leagueId,
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
