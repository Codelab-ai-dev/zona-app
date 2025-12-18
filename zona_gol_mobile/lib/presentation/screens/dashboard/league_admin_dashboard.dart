import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/config/theme.dart';
import '../../../domain/entities/user_entity.dart';
import '../../bloc/auth/auth_bloc.dart';
import '../../bloc/auth/auth_event.dart';
import '../../widgets/dashboard/dashboard_action_card.dart';
import '../../widgets/dashboard/dashboard_header.dart';

/// League Admin Dashboard
/// Manage tournaments, teams, and matches for a specific league
class LeagueAdminDashboard extends StatelessWidget {
  final UserEntity user;

  const LeagueAdminDashboard({
    super.key,
    required this.user,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          DashboardHeader(user: user),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text(
                  'Gestión de Liga',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Administra torneos, equipos y partidos',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Colors.grey[600],
                      ),
                ),
                const SizedBox(height: 24),

                // Tournaments
                _buildSectionHeader(context, 'Torneos'),
                const SizedBox(height: 12),
                DashboardActionCard(
                  title: 'Mis Torneos',
                  subtitle: 'Ver y gestionar torneos activos',
                  icon: Icons.sports_soccer,
                  color: AppTheme.primary,
                  onTap: () => _showComingSoon(context, 'Lista de Torneos'),
                ),
                const SizedBox(height: 8),
                DashboardActionCard(
                  title: 'Crear Torneo',
                  subtitle: 'Configurar un nuevo torneo',
                  icon: Icons.add_circle,
                  color: AppTheme.success,
                  onTap: () => _showComingSoon(context, 'Crear Torneo'),
                ),
                const SizedBox(height: 8),
                DashboardActionCard(
                  title: 'Calendario',
                  subtitle: 'Ver fixture y resultados',
                  icon: Icons.calendar_month,
                  color: AppTheme.info,
                  onTap: () => _showComingSoon(context, 'Calendario'),
                ),
                const SizedBox(height: 24),

                // Teams
                _buildSectionHeader(context, 'Equipos'),
                const SizedBox(height: 12),
                DashboardActionCard(
                  title: 'Equipos',
                  subtitle: 'Gestionar equipos de la liga',
                  icon: Icons.groups,
                  color: AppTheme.primary,
                  onTap: () => _showComingSoon(context, 'Lista de Equipos'),
                ),
                const SizedBox(height: 8),
                DashboardActionCard(
                  title: 'Tabla de Posiciones',
                  subtitle: 'Ver clasificación actual',
                  icon: Icons.emoji_events,
                  color: AppTheme.warning,
                  onTap: () => _showComingSoon(context, 'Tabla de Posiciones'),
                ),
                const SizedBox(height: 24),

                // Matches
                _buildSectionHeader(context, 'Partidos'),
                const SizedBox(height: 12),
                DashboardActionCard(
                  title: 'Registrar Resultado',
                  subtitle: 'Ingresar resultado de partido',
                  icon: Icons.scoreboard,
                  color: AppTheme.success,
                  onTap: () => _showComingSoon(context, 'Registrar Resultado'),
                ),
                const SizedBox(height: 8),
                DashboardActionCard(
                  title: 'Generar Fixture',
                  subtitle: 'Crear calendario de partidos',
                  icon: Icons.settings,
                  color: AppTheme.info,
                  onTap: () => _showComingSoon(context, 'Generar Fixture'),
                ),
                const SizedBox(height: 24),

                // Settings
                DashboardActionCard(
                  title: 'Cerrar Sesión',
                  subtitle: 'Salir de la aplicación',
                  icon: Icons.logout,
                  color: AppTheme.error,
                  onTap: () => _handleLogout(context),
                ),
                const SizedBox(height: 32),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(BuildContext context, String title) {
    return Row(
      children: [
        Container(
          width: 4,
          height: 20,
          decoration: BoxDecoration(
            color: AppTheme.primary,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          title,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
      ],
    );
  }

  void _showComingSoon(BuildContext context, String feature) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Próximamente: $feature')),
    );
  }

  void _handleLogout(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cerrar Sesión'),
        content: const Text('¿Estás seguro que deseas salir?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              context.read<AuthBloc>().add(const LogoutEvent());
            },
            style: TextButton.styleFrom(foregroundColor: AppTheme.error),
            child: const Text('Salir'),
          ),
        ],
      ),
    );
  }
}
