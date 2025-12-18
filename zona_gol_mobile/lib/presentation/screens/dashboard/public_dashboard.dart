import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/config/theme.dart';
import '../../../domain/entities/user_entity.dart';
import '../../bloc/auth/auth_bloc.dart';
import '../../bloc/auth/auth_event.dart';
import '../../widgets/dashboard/dashboard_action_card.dart';
import '../../widgets/dashboard/dashboard_header.dart';
import '../league/leagues_list_screen.dart';

/// Public Dashboard
/// Read-only access to view leagues, matches, and statistics
class PublicDashboard extends StatelessWidget {
  final UserEntity user;

  const PublicDashboard({
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
                  'Bienvenido a Zona Gol',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Explora ligas, partidos y estadísticas',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Colors.grey[600],
                      ),
                ),
                const SizedBox(height: 24),

                // Browse
                _buildSectionHeader(context, 'Explorar'),
                const SizedBox(height: 12),
                DashboardActionCard(
                  title: 'Ligas',
                  subtitle: 'Ver todas las ligas activas',
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
                  title: 'Partidos',
                  subtitle: 'Ver calendario y resultados',
                  icon: Icons.sports_soccer,
                  color: AppTheme.info,
                  onTap: () => _showComingSoon(context, 'Partidos'),
                ),
                const SizedBox(height: 8),
                DashboardActionCard(
                  title: 'Equipos',
                  subtitle: 'Explorar todos los equipos',
                  icon: Icons.groups,
                  color: AppTheme.warning,
                  onTap: () => _showComingSoon(context, 'Equipos'),
                ),
                const SizedBox(height: 24),

                // Stats
                _buildSectionHeader(context, 'Estadísticas'),
                const SizedBox(height: 12),
                DashboardActionCard(
                  title: 'Tablas de Posiciones',
                  subtitle: 'Ver clasificaciones',
                  icon: Icons.leaderboard,
                  color: AppTheme.success,
                  onTap: () => _showComingSoon(context, 'Tablas'),
                ),
                const SizedBox(height: 8),
                DashboardActionCard(
                  title: 'Goleadores',
                  subtitle: 'Top scorers del torneo',
                  icon: Icons.sports_score,
                  color: AppTheme.warning,
                  onTap: () => _showComingSoon(context, 'Goleadores'),
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
