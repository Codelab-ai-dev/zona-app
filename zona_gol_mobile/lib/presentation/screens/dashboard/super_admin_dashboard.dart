import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/config/theme.dart';
import '../../../domain/entities/user_entity.dart';
import '../../bloc/auth/auth_bloc.dart';
import '../../bloc/auth/auth_event.dart';
import '../../widgets/dashboard/dashboard_action_card.dart';
import '../../widgets/dashboard/dashboard_header.dart';
import '../league/create_league_screen.dart';
import '../league/leagues_list_screen.dart';

/// Super Admin Dashboard
/// Full access to all system features
class SuperAdminDashboard extends StatelessWidget {
  final UserEntity user;

  const SuperAdminDashboard({
    super.key,
    required this.user,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          // Header
          DashboardHeader(user: user),

          // Content
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Welcome message
                Text(
                  'Panel de Control Completo',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Tienes acceso total al sistema',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Colors.grey[600],
                      ),
                ),
                const SizedBox(height: 24),

                // League Management Section
                _buildSectionHeader(context, 'Gestión de Ligas'),
                const SizedBox(height: 12),
                DashboardActionCard(
                  title: 'Ligas',
                  subtitle: 'Ver y administrar todas las ligas',
                  icon: Icons.emoji_events,
                  color: AppTheme.primary,
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
                  color: AppTheme.success,
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (context) => const CreateLeagueScreen(),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 24),

                // User Management Section
                _buildSectionHeader(context, 'Gestión de Usuarios'),
                const SizedBox(height: 12),
                DashboardActionCard(
                  title: 'Usuarios',
                  subtitle: 'Administrar usuarios y roles',
                  icon: Icons.people,
                  color: AppTheme.info,
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Próximamente: Gestión de Usuarios')),
                    );
                  },
                ),
                const SizedBox(height: 8),
                DashboardActionCard(
                  title: 'Asignar Roles',
                  subtitle: 'Gestionar permisos de administradores',
                  icon: Icons.admin_panel_settings,
                  color: AppTheme.warning,
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Próximamente: Asignar Roles')),
                    );
                  },
                ),
                const SizedBox(height: 24),

                // System Section
                _buildSectionHeader(context, 'Sistema'),
                const SizedBox(height: 12),
                DashboardActionCard(
                  title: 'Configuración',
                  subtitle: 'Ajustes generales del sistema',
                  icon: Icons.settings,
                  color: Colors.grey[700],
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Próximamente: Configuración')),
                    );
                  },
                ),
                const SizedBox(height: 8),
                DashboardActionCard(
                  title: 'Estadísticas Globales',
                  subtitle: 'Ver métricas del sistema',
                  icon: Icons.analytics,
                  color: AppTheme.info,
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Próximamente: Estadísticas')),
                    );
                  },
                ),
                const SizedBox(height: 8),
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
            style: TextButton.styleFrom(
              foregroundColor: AppTheme.error,
            ),
            child: const Text('Salir'),
          ),
        ],
      ),
    );
  }
}
