import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/config/theme.dart';
import '../../../domain/entities/user_entity.dart';
import '../../bloc/auth/auth_bloc.dart';
import '../../bloc/auth/auth_event.dart';
import '../../widgets/dashboard/dashboard_action_card.dart';
import '../../widgets/dashboard/dashboard_header.dart';

/// Team Owner Dashboard
/// Manage team players and view statistics
class TeamOwnerDashboard extends StatelessWidget {
  final UserEntity user;

  const TeamOwnerDashboard({
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
                  'Gestión de Equipo',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Administra tu equipo y jugadores',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Colors.grey[600],
                      ),
                ),
                const SizedBox(height: 24),

                // Team
                _buildSectionHeader(context, 'Mi Equipo'),
                const SizedBox(height: 12),
                DashboardActionCard(
                  title: 'Información del Equipo',
                  subtitle: 'Ver y editar datos del equipo',
                  icon: Icons.shield,
                  color: AppTheme.primary,
                  onTap: () => _showComingSoon(context, 'Información del Equipo'),
                ),
                const SizedBox(height: 24),

                // Players
                _buildSectionHeader(context, 'Jugadores'),
                const SizedBox(height: 12),
                DashboardActionCard(
                  title: 'Lista de Jugadores',
                  subtitle: 'Ver todos los jugadores',
                  icon: Icons.people,
                  color: AppTheme.primary,
                  onTap: () => _showComingSoon(context, 'Lista de Jugadores'),
                ),
                const SizedBox(height: 8),
                DashboardActionCard(
                  title: 'Agregar Jugador',
                  subtitle: 'Registrar nuevo jugador',
                  icon: Icons.person_add,
                  color: AppTheme.success,
                  onTap: () => _showComingSoon(context, 'Agregar Jugador'),
                ),
                const SizedBox(height: 24),

                // Stats
                _buildSectionHeader(context, 'Estadísticas'),
                const SizedBox(height: 12),
                DashboardActionCard(
                  title: 'Estadísticas del Equipo',
                  subtitle: 'Ver rendimiento y métricas',
                  icon: Icons.bar_chart,
                  color: AppTheme.info,
                  onTap: () => _showComingSoon(context, 'Estadísticas'),
                ),
                const SizedBox(height: 8),
                DashboardActionCard(
                  title: 'Próximos Partidos',
                  subtitle: 'Ver calendario de partidos',
                  icon: Icons.calendar_today,
                  color: AppTheme.warning,
                  onTap: () => _showComingSoon(context, 'Calendario'),
                ),
                const SizedBox(height: 24),

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
