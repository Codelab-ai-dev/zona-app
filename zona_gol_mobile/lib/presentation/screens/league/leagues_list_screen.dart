import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/config/theme.dart';
import '../../../core/di/injection.dart';
import '../../../domain/entities/league_entity.dart';
import '../../bloc/league/league_bloc.dart';
import '../../bloc/league/league_event.dart';
import '../../bloc/league/league_state.dart';
import 'league_detail_screen.dart';

/// Leagues List Screen
/// Displays a list of all leagues with management options for super admins
class LeaguesListScreen extends StatelessWidget {
  final bool isSuperAdmin;

  const LeaguesListScreen({
    super.key,
    this.isSuperAdmin = true,
  });

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => sl<LeagueBloc>()..add(const LoadAllLeaguesEvent()),
      child: _LeaguesListView(isSuperAdmin: isSuperAdmin),
    );
  }
}

class _LeaguesListView extends StatelessWidget {
  final bool isSuperAdmin;

  const _LeaguesListView({required this.isSuperAdmin});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Ligas'),
        backgroundColor: AppTheme.primary,
        foregroundColor: Colors.white,
      ),
      body: BlocConsumer<LeagueBloc, LeagueState>(
        listener: (context, state) {
          if (state is LeagueUpdated) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Liga "${state.league.name}" actualizada'),
                backgroundColor: AppTheme.success,
              ),
            );
            context.read<LeagueBloc>().add(const LoadAllLeaguesEvent());
          } else if (state is LeagueDeleted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Liga eliminada correctamente'),
                backgroundColor: AppTheme.success,
              ),
            );
            context.read<LeagueBloc>().add(const LoadAllLeaguesEvent());
          } else if (state is LeagueStatusToggled) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  'Liga ${state.league.isActive ? "activada" : "desactivada"}',
                ),
                backgroundColor: AppTheme.success,
              ),
            );
            context.read<LeagueBloc>().add(const LoadAllLeaguesEvent());
          } else if (state is LeagueError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: AppTheme.error,
              ),
            );
          }
        },
        builder: (context, state) {
          if (state is LeagueLoading) {
            return const Center(
              child: CircularProgressIndicator(),
            );
          }

          if (state is LeagueError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.error_outline,
                    size: 64,
                    color: AppTheme.error,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Error al cargar ligas',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 32),
                    child: Text(
                      state.message,
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Colors.grey[600],
                          ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: () {
                      context
                          .read<LeagueBloc>()
                          .add(const LoadAllLeaguesEvent());
                    },
                    icon: const Icon(Icons.refresh),
                    label: const Text('Reintentar'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primary,
                      foregroundColor: Colors.white,
                    ),
                  ),
                ],
              ),
            );
          }

          if (state is LeaguesLoaded) {
            if (state.leagues.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.emoji_events_outlined,
                      size: 64,
                      color: Colors.grey,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'No hay ligas disponibles',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Las ligas aparecerán aquí cuando se creen',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Colors.grey[600],
                          ),
                    ),
                  ],
                ),
              );
            }

            return RefreshIndicator(
              onRefresh: () async {
                context.read<LeagueBloc>().add(const LoadAllLeaguesEvent());
              },
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: state.leagues.length,
                itemBuilder: (context, index) {
                  final league = state.leagues[index];
                  return _LeagueCard(
                    league: league,
                    isSuperAdmin: isSuperAdmin,
                  );
                },
              ),
            );
          }

          return const Center(
            child: Text('Cargando...'),
          );
        },
      ),
    );
  }
}

/// League Card Widget
/// Displays a single league in a card format with management options
class _LeagueCard extends StatelessWidget {
  final LeagueEntity league;
  final bool isSuperAdmin;

  const _LeagueCard({
    required this.league,
    required this.isSuperAdmin,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      child: InkWell(
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (context) => LeagueDetailScreen(league: league),
            ),
          );
        },
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Row(
                children: [
                  // League Logo/Icon
                  Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: league.hasLogo
                        ? ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: _buildLeagueLogo(league.logo!),
                          )
                        : const Icon(
                            Icons.emoji_events,
                            size: 32,
                            color: AppTheme.primary,
                          ),
                  ),
                  const SizedBox(width: 16),

                  // League Info
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // League Name
                        Text(
                          league.name,
                          style:
                              Theme.of(context).textTheme.titleMedium?.copyWith(
                                    fontWeight: FontWeight.bold,
                                  ),
                        ),
                        const SizedBox(height: 4),

                        // League Description
                        Text(
                          league.description,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style:
                              Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: Colors.grey[600],
                                  ),
                        ),
                        const SizedBox(height: 8),

                        // League Status
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: league.isActive
                                    ? AppTheme.success.withOpacity(0.1)
                                    : Colors.grey.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                league.statusText,
                                style: TextStyle(
                                  fontSize: 12,
                                  color: league.isActive
                                      ? AppTheme.success
                                      : Colors.grey,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              '/${league.slug}',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey[500],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  // Arrow or Menu Icon
                  if (isSuperAdmin)
                    PopupMenuButton<String>(
                      icon: const Icon(Icons.more_vert, color: Colors.grey),
                      onSelected: (value) =>
                          _handleMenuAction(context, value, league),
                      itemBuilder: (context) => [
                        const PopupMenuItem(
                          value: 'edit',
                          child: Row(
                            children: [
                              Icon(Icons.edit, size: 20),
                              SizedBox(width: 8),
                              Text('Editar'),
                            ],
                          ),
                        ),
                        PopupMenuItem(
                          value: 'toggle',
                          child: Row(
                            children: [
                              Icon(
                                league.isActive
                                    ? Icons.visibility_off
                                    : Icons.visibility,
                                size: 20,
                              ),
                              const SizedBox(width: 8),
                              Text(league.isActive ? 'Desactivar' : 'Activar'),
                            ],
                          ),
                        ),
                        const PopupMenuItem(
                          value: 'delete',
                          child: Row(
                            children: [
                              Icon(Icons.delete, size: 20, color: Colors.red),
                              SizedBox(width: 8),
                              Text('Eliminar',
                                  style: TextStyle(color: Colors.red)),
                            ],
                          ),
                        ),
                      ],
                    )
                  else
                    const Icon(
                      Icons.arrow_forward_ios,
                      size: 16,
                      color: Colors.grey,
                    ),
                ],
              ),
              // Action buttons for super admin
              if (isSuperAdmin) ...[
                const Divider(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _ActionButton(
                      icon: Icons.edit,
                      label: 'Editar',
                      onTap: () => _showEditDialog(context, league),
                    ),
                    _ActionButton(
                      icon: league.isActive
                          ? Icons.visibility_off
                          : Icons.visibility,
                      label: league.isActive ? 'Desactivar' : 'Activar',
                      onTap: () => _toggleStatus(context, league),
                    ),
                    _ActionButton(
                      icon: Icons.delete,
                      label: 'Eliminar',
                      color: Colors.red,
                      onTap: () => _confirmDelete(context, league),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  void _handleMenuAction(
      BuildContext context, String action, LeagueEntity league) {
    switch (action) {
      case 'edit':
        _showEditDialog(context, league);
        break;
      case 'toggle':
        _toggleStatus(context, league);
        break;
      case 'delete':
        _confirmDelete(context, league);
        break;
    }
  }

  void _showEditDialog(BuildContext context, LeagueEntity league) {
    final nameController = TextEditingController(text: league.name);
    final slugController = TextEditingController(text: league.slug);
    final descriptionController =
        TextEditingController(text: league.description);
    final formKey = GlobalKey<FormState>();

    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Editar Liga'),
        content: SingleChildScrollView(
          child: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: nameController,
                  decoration: const InputDecoration(
                    labelText: 'Nombre',
                    border: OutlineInputBorder(),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'El nombre es requerido';
                    }
                    if (value.length < 3) {
                      return 'Mínimo 3 caracteres';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: slugController,
                  decoration: const InputDecoration(
                    labelText: 'Slug (URL)',
                    border: OutlineInputBorder(),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'El slug es requerido';
                    }
                    if (!RegExp(r'^[a-z0-9]+(?:-[a-z0-9]+)*$').hasMatch(value)) {
                      return 'Solo minúsculas, números y guiones';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: descriptionController,
                  decoration: const InputDecoration(
                    labelText: 'Descripción',
                    border: OutlineInputBorder(),
                  ),
                  maxLines: 3,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'La descripción es requerida';
                    }
                    return null;
                  },
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () {
              if (formKey.currentState!.validate()) {
                context.read<LeagueBloc>().add(UpdateLeagueEvent(
                      leagueId: league.id,
                      name: nameController.text.trim(),
                      slug: slugController.text.trim().toLowerCase(),
                      description: descriptionController.text.trim(),
                    ));
                Navigator.pop(dialogContext);
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primary,
              foregroundColor: Colors.white,
            ),
            child: const Text('Guardar'),
          ),
        ],
      ),
    );
  }

  void _toggleStatus(BuildContext context, LeagueEntity league) {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(league.isActive ? 'Desactivar Liga' : 'Activar Liga'),
        content: Text(
          league.isActive
              ? '¿Estás seguro de que deseas desactivar "${league.name}"?\n\nLa liga no será visible para los usuarios.'
              : '¿Estás seguro de que deseas activar "${league.name}"?\n\nLa liga será visible para los usuarios.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () {
              context.read<LeagueBloc>().add(ToggleLeagueStatusEvent(
                    leagueId: league.id,
                    currentStatus: league.isActive,
                  ));
              Navigator.pop(dialogContext);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor:
                  league.isActive ? Colors.orange : AppTheme.success,
              foregroundColor: Colors.white,
            ),
            child: Text(league.isActive ? 'Desactivar' : 'Activar'),
          ),
        ],
      ),
    );
  }

  void _confirmDelete(BuildContext context, LeagueEntity league) {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Eliminar Liga'),
        content: Text(
          '¿Estás seguro de que deseas eliminar "${league.name}"?\n\nEsta acción desactivará la liga permanentemente.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () {
              context.read<LeagueBloc>().add(DeleteLeagueEvent(league.id));
              Navigator.pop(dialogContext);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );
  }

  /// Build league logo widget
  Widget _buildLeagueLogo(String logoData) {
    try {
      if (logoData.startsWith('data:image/')) {
        final base64Data = logoData.split(',')[1];
        final Uint8List bytes = base64Decode(base64Data);
        return Image.memory(
          bytes,
          width: 60,
          height: 60,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) {
            return _buildFallbackLogo();
          },
        );
      } else {
        return Image.network(
          logoData,
          width: 60,
          height: 60,
          fit: BoxFit.cover,
          loadingBuilder: (context, child, loadingProgress) {
            if (loadingProgress == null) return child;
            return Center(
              child: CircularProgressIndicator(
                value: loadingProgress.expectedTotalBytes != null
                    ? loadingProgress.cumulativeBytesLoaded /
                        loadingProgress.expectedTotalBytes!
                    : null,
                strokeWidth: 2,
              ),
            );
          },
          errorBuilder: (context, error, stackTrace) {
            return _buildFallbackLogo();
          },
        );
      }
    } catch (e) {
      return _buildFallbackLogo();
    }
  }

  Widget _buildFallbackLogo() {
    return Container(
      width: 60,
      height: 60,
      color: AppTheme.primary.withOpacity(0.1),
      child: const Icon(
        Icons.emoji_events,
        size: 32,
        color: AppTheme.primary,
      ),
    );
  }
}

/// Action Button Widget
class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color? color;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.onTap,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Column(
          children: [
            Icon(icon, size: 20, color: color ?? Colors.grey[700]),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                color: color ?? Colors.grey[700],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
