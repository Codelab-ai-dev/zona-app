import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import '../../../core/config/theme.dart';
import '../../../core/di/injection.dart';
import '../../../domain/entities/league_entity.dart';
import '../../../domain/entities/team_entity.dart';
import '../../../domain/entities/tournament_entity.dart';
import '../../bloc/league/league_bloc.dart';
import '../../bloc/league/league_event.dart';
import '../../bloc/league/league_state.dart';
import '../../bloc/team/team_bloc.dart';
import '../../bloc/team/team_event.dart';
import '../../bloc/team/team_state.dart';
import '../../bloc/tournament/tournament_bloc.dart';
import '../../bloc/tournament/tournament_event.dart';
import '../../bloc/tournament/tournament_state.dart';

/// League Detail Screen
/// Shows detailed information about a league
class LeagueDetailScreen extends StatelessWidget {
  final LeagueEntity league;

  const LeagueDetailScreen({
    super.key,
    required this.league,
  });

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => sl<LeagueBloc>()
        ..add(LoadLeagueByIdEvent(league.id)),
      child: _LeagueDetailView(initialLeague: league),
    );
  }
}

class _LeagueDetailView extends StatelessWidget {
  final LeagueEntity initialLeague;

  const _LeagueDetailView({required this.initialLeague});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        body: BlocBuilder<LeagueBloc, LeagueState>(
          builder: (context, state) {
            final league = state is LeagueDetailLoaded
                ? state.league
                : initialLeague;

            return NestedScrollView(
              headerSliverBuilder: (context, innerBoxIsScrolled) {
                return [
                  SliverAppBar(
                    expandedHeight: 200,
                    pinned: true,
                    backgroundColor: AppTheme.primary,
                    foregroundColor: Colors.white,
                    flexibleSpace: FlexibleSpaceBar(
                      title: Text(
                        league.name,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          shadows: [
                            Shadow(
                              offset: Offset(0, 1),
                              blurRadius: 3,
                              color: Colors.black26,
                            ),
                          ],
                        ),
                      ),
                      background: Stack(
                        fit: StackFit.expand,
                        children: [
                          // Background gradient
                          Container(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                colors: [
                                  AppTheme.primary,
                                  AppTheme.primary.withOpacity(0.8),
                                ],
                              ),
                            ),
                          ),
                          // Logo
                          if (league.hasLogo)
                            Center(
                              child: Container(
                                width: 120,
                                height: 120,
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(16),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withOpacity(0.2),
                                      blurRadius: 10,
                                      offset: const Offset(0, 4),
                                    ),
                                  ],
                                ),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(16),
                                  child: _buildLeagueHeaderLogo(league.logo!),
                                ),
                              ),
                            )
                          else
                            const Center(
                              child: Icon(
                                Icons.emoji_events,
                                size: 80,
                                color: Colors.white70,
                              ),
                            ),
                        ],
                      ),
                    ),
                    bottom: TabBar(
                      indicatorColor: Colors.white,
                      labelColor: Colors.white,
                      unselectedLabelColor: Colors.white70,
                      tabs: const [
                        Tab(
                          icon: Icon(Icons.info_outline),
                          text: 'Información',
                        ),
                        Tab(
                          icon: Icon(Icons.sports_soccer),
                          text: 'Torneos',
                        ),
                        Tab(
                          icon: Icon(Icons.groups),
                          text: 'Equipos',
                        ),
                      ],
                    ),
                  ),
                ];
              },
              body: TabBarView(
                children: [
                  _InfoTab(league: league),
                  _TournamentsTab(league: league),
                  _TeamsTab(league: league),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  /// Build league logo widget for header
  /// Supports both base64 data URIs and HTTP/HTTPS URLs
  Widget _buildLeagueHeaderLogo(String logoData) {
    try {
      if (logoData.startsWith('data:image/')) {
        // Data URI (Base64)
        final base64Data = logoData.split(',')[1];
        final Uint8List bytes = base64Decode(base64Data);
        return Image.memory(
          bytes,
          width: 120,
          height: 120,
          fit: BoxFit.contain,
          errorBuilder: (context, error, stackTrace) {
            return const Icon(
              Icons.emoji_events,
              size: 80,
              color: AppTheme.primary,
            );
          },
        );
      } else {
        // HTTP/HTTPS URL
        return Image.network(
          logoData,
          width: 120,
          height: 120,
          fit: BoxFit.contain,
          loadingBuilder: (context, child, loadingProgress) {
            if (loadingProgress == null) return child;
            return Center(
              child: CircularProgressIndicator(
                value: loadingProgress.expectedTotalBytes != null
                    ? loadingProgress.cumulativeBytesLoaded /
                        loadingProgress.expectedTotalBytes!
                    : null,
                strokeWidth: 3,
                color: AppTheme.primary,
              ),
            );
          },
          errorBuilder: (context, error, stackTrace) {
            return const Icon(
              Icons.emoji_events,
              size: 80,
              color: AppTheme.primary,
            );
          },
        );
      }
    } catch (e) {
      // Fallback for any errors
      return const Icon(
        Icons.emoji_events,
        size: 80,
        color: AppTheme.primary,
      );
    }
  }
}

/// Information Tab
class _InfoTab extends StatelessWidget {
  final LeagueEntity league;

  const _InfoTab({required this.league});

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('dd/MM/yyyy');

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Status Badge
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: league.isActive
                ? AppTheme.success.withOpacity(0.1)
                : Colors.grey.withOpacity(0.1),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                league.isActive ? Icons.check_circle : Icons.cancel,
                size: 16,
                color: league.isActive ? AppTheme.success : Colors.grey,
              ),
              const SizedBox(width: 4),
              Text(
                league.statusText,
                style: TextStyle(
                  color: league.isActive ? AppTheme.success : Colors.grey,
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),

        // Description
        _InfoSection(
          title: 'Descripción',
          icon: Icons.description,
          child: Text(
            league.description,
            style: Theme.of(context).textTheme.bodyLarge,
          ),
        ),
        const SizedBox(height: 16),

        // Slug
        _InfoSection(
          title: 'Identificador (Slug)',
          icon: Icons.tag,
          child: Text(
            league.slug,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  fontFamily: 'monospace',
                  color: AppTheme.primary,
                ),
          ),
        ),
        const SizedBox(height: 16),

        // Created Date
        if (league.createdAt != null)
          _InfoSection(
            title: 'Fecha de Creación',
            icon: Icons.calendar_today,
            child: Text(
              dateFormat.format(league.createdAt!),
              style: Theme.of(context).textTheme.bodyLarge,
            ),
          ),
        const SizedBox(height: 16),

        // Updated Date
        if (league.updatedAt != null)
          _InfoSection(
            title: 'Última Actualización',
            icon: Icons.update,
            child: Text(
              dateFormat.format(league.updatedAt!),
              style: Theme.of(context).textTheme.bodyLarge,
            ),
          ),
        const SizedBox(height: 24),

        // Actions (only for admins)
        // TODO: Add permission checks
        // _AdminActions(league: league),
      ],
    );
  }
}

/// Info Section Widget
class _InfoSection extends StatelessWidget {
  final String title;
  final IconData icon;
  final Widget child;

  const _InfoSection({
    required this.title,
    required this.icon,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(
              icon,
              size: 20,
              color: AppTheme.primary,
            ),
            const SizedBox(width: 8),
            Text(
              title,
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: Colors.grey[700],
                  ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Padding(
          padding: const EdgeInsets.only(left: 28),
          child: child,
        ),
      ],
    );
  }
}

/// Tournaments Tab
class _TournamentsTab extends StatelessWidget {
  final LeagueEntity league;

  const _TournamentsTab({required this.league});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => sl<TournamentBloc>()
        ..add(LoadTournamentsByLeagueEvent(leagueId: league.id)),
      child: BlocBuilder<TournamentBloc, TournamentState>(
        builder: (context, state) {
          if (state is TournamentLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is TournamentError) {
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
                    'Error al cargar torneos',
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
                ],
              ),
            );
          }

          if (state is TournamentsLoaded) {
            if (state.tournaments.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.sports_soccer,
                      size: 80,
                      color: Colors.grey,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Sin torneos',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 32),
                      child: Text(
                        'Esta liga aún no tiene torneos creados',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: Colors.grey[600],
                            ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton.icon(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Próximamente: Crear Torneo'),
                          ),
                        );
                      },
                      icon: const Icon(Icons.add),
                      label: const Text('Crear Torneo'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primary,
                        foregroundColor: Colors.white,
                      ),
                    ),
                  ],
                ),
              );
            }

            return RefreshIndicator(
              onRefresh: () async {
                context.read<TournamentBloc>().add(
                      LoadTournamentsByLeagueEvent(leagueId: league.id),
                    );
              },
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: state.tournaments.length,
                itemBuilder: (context, index) {
                  final tournament = state.tournaments[index];
                  return _TournamentCard(tournament: tournament);
                },
              ),
            );
          }

          return const Center(child: Text('Cargando torneos...'));
        },
      ),
    );
  }
}

/// Tournament Card Widget
/// Displays a single tournament in a card format
class _TournamentCard extends StatelessWidget {
  final TournamentEntity tournament;

  const _TournamentCard({required this.tournament});

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('dd/MM/yyyy');

    // Determine status color
    Color statusColor;
    if (tournament.isCurrentlyActive) {
      statusColor = AppTheme.success;
    } else if (tournament.isUpcoming) {
      statusColor = Colors.blue;
    } else {
      statusColor = Colors.grey;
    }

    // Determine status text
    String statusText;
    if (tournament.isCurrentlyActive) {
      statusText = 'En curso';
    } else if (tournament.isUpcoming) {
      statusText = 'Próximo';
    } else {
      statusText = 'Finalizado';
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      child: InkWell(
        onTap: () {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Ver detalles de ${tournament.name}'),
              duration: const Duration(seconds: 1),
            ),
          );
        },
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header: Name and Status
              Row(
                children: [
                  Expanded(
                    child: Text(
                      tournament.name,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      statusText,
                      style: TextStyle(
                        fontSize: 12,
                        color: statusColor,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Format Info
              Row(
                children: [
                  Icon(
                    Icons.emoji_events_outlined,
                    size: 16,
                    color: Colors.grey[600],
                  ),
                  const SizedBox(width: 4),
                  Text(
                    tournament.formatText,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.grey[600],
                        ),
                  ),
                  const SizedBox(width: 16),
                  Icon(
                    Icons.calendar_today,
                    size: 16,
                    color: Colors.grey[600],
                  ),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      '${dateFormat.format(tournament.startDate)} - ${dateFormat.format(tournament.endDate)}',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Colors.grey[600],
                          ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // Format Description
              Text(
                tournament.formatDescription,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Colors.grey[700],
                      fontStyle: FontStyle.italic,
                    ),
              ),

              // Duration
              const SizedBox(height: 4),
              Text(
                'Duración: ${tournament.durationInDays} días',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Colors.grey[600],
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Teams Tab
class _TeamsTab extends StatelessWidget {
  final LeagueEntity league;

  const _TeamsTab({required this.league});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => sl<TeamBloc>()
        ..add(LoadTeamsByLeagueEvent(leagueId: league.id)),
      child: BlocBuilder<TeamBloc, TeamState>(
        builder: (context, state) {
          if (state is TeamLoading) {
            return const Center(
              child: CircularProgressIndicator(),
            );
          }

          if (state is TeamError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.error_outline,
                    size: 80,
                    color: Colors.red,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Error al cargar equipos',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
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
                      context.read<TeamBloc>().add(
                            LoadTeamsByLeagueEvent(leagueId: league.id),
                          );
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

          if (state is TeamsLoaded) {
            if (state.teams.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.groups,
                      size: 80,
                      color: Colors.grey,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Sin equipos',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 32),
                      child: Text(
                        'Aún no hay equipos en esta liga',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: Colors.grey[600],
                            ),
                      ),
                    ),
                  ],
                ),
              );
            }

            return RefreshIndicator(
              onRefresh: () async {
                context.read<TeamBloc>().add(
                      LoadTeamsByLeagueEvent(leagueId: league.id),
                    );
              },
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: state.teams.length,
                itemBuilder: (context, index) {
                  final team = state.teams[index];
                  return _TeamCard(team: team);
                },
              ),
            );
          }

          return const SizedBox.shrink();
        },
      ),
    );
  }
}

/// Team Card Widget
class _TeamCard extends StatelessWidget {
  final TeamEntity team;

  const _TeamCard({required this.team});

  @override
  Widget build(BuildContext context) {
    print('🎨 _TeamCard rendering: ${team.name}');
    print('🎨 Team logo: ${team.logo}');
    print('🎨 Has logo: ${team.hasLogo}');

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: InkWell(
        onTap: () {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Detalles de ${team.name}')),
          );
        },
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Team Name and Status
              Row(
                children: [
                  // Logo or Icon - Circular Avatar
                  if (team.hasLogo)
                    CircleAvatar(
                      radius: 28,
                      backgroundColor: Colors.grey[200],
                      child: ClipOval(
                        child: _buildTeamLogo(team.logo!),
                      ),
                    )
                  else
                    CircleAvatar(
                      radius: 28,
                      backgroundColor: team.hasHomeColors && team.homePrimaryColor != null
                          ? _parseColor(team.homePrimaryColor!)
                          : AppTheme.primary.withOpacity(0.1),
                      child: Icon(
                        Icons.shield,
                        size: 32,
                        color: team.hasHomeColors && team.homePrimaryColor != null
                            ? Colors.white
                            : AppTheme.primary,
                      ),
                    ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          team.name,
                          style: Theme.of(context)
                              .textTheme
                              .titleMedium
                              ?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          team.slug,
                          style:
                              Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: Colors.grey[600],
                                    fontFamily: 'monospace',
                                  ),
                        ),
                      ],
                    ),
                  ),
                  // Status Badge
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: team.isActive
                          ? AppTheme.success.withOpacity(0.1)
                          : Colors.grey.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          team.isActive ? Icons.check_circle : Icons.cancel,
                          size: 14,
                          color: team.isActive ? AppTheme.success : Colors.grey,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          team.isActive ? 'Activo' : 'Inactivo',
                          style: TextStyle(
                            color:
                                team.isActive ? AppTheme.success : Colors.grey,
                            fontWeight: FontWeight.w600,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Description (if available)
              if (team.description != null && team.description!.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(
                    team.description!,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Colors.grey[700],
                        ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),

              // Group Info (if assigned to tournament)
              if (team.groupName != null)
                Row(
                  children: [
                    Icon(
                      Icons.groups_3,
                      size: 16,
                      color: Colors.grey[600],
                    ),
                    const SizedBox(width: 4),
                    Text(
                      team.groupDisplayText,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Colors.grey[600],
                          ),
                    ),
                  ],
                ),

              // Colors Info (if available)
              if (team.hasHomeColors)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Row(
                    children: [
                      Icon(
                        Icons.sports_soccer,
                        size: 16,
                        color: Colors.grey[600],
                      ),
                      const SizedBox(width: 4),
                      Text(
                        'Uniformes configurados',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Colors.grey[600],
                            ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  /// Helper method to build team logo from URL or Base64
  /// Supports: HTTP/HTTPS URLs and data:image URIs
  Widget _buildTeamLogo(String logoData) {
    try {
      // Check if it's a data URI (base64)
      if (logoData.startsWith('data:image/')) {
        // Extract base64 data after the comma
        final base64Data = logoData.split(',')[1];
        final Uint8List bytes = base64Decode(base64Data);

        return Image.memory(
          bytes,
          width: 56,
          height: 56,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) {
            print('❌ Error loading base64 image: $error');
            return Container(
              width: 56,
              height: 56,
              color: AppTheme.primary.withOpacity(0.1),
              child: const Icon(
                Icons.shield,
                size: 32,
                color: AppTheme.primary,
              ),
            );
          },
        );
      } else {
        // It's a regular HTTP/HTTPS URL
        return Image.network(
          logoData,
          width: 56,
          height: 56,
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
            print('❌ Error loading network image: $error');
            return Container(
              width: 56,
              height: 56,
              color: AppTheme.primary.withOpacity(0.1),
              child: const Icon(
                Icons.shield,
                size: 32,
                color: AppTheme.primary,
              ),
            );
          },
        );
      }
    } catch (e) {
      print('❌ Error building team logo: $e');
      return Container(
        width: 56,
        height: 56,
        color: AppTheme.primary.withOpacity(0.1),
        child: const Icon(
          Icons.shield,
          size: 32,
          color: AppTheme.primary,
        ),
      );
    }
  }

  /// Helper method to parse color strings (hex format)
  /// Supports formats: "#FF5733", "FF5733", "0xFFFF5733"
  Color _parseColor(String colorString) {
    try {
      String hexColor = colorString.toUpperCase().replaceAll('#', '');

      // Remove "0X" prefix if present
      if (hexColor.startsWith('0X')) {
        hexColor = hexColor.substring(2);
      }

      // Add alpha channel if not present (6 digits -> 8 digits)
      if (hexColor.length == 6) {
        hexColor = 'FF$hexColor';
      }

      return Color(int.parse(hexColor, radix: 16));
    } catch (e) {
      // Return default color if parsing fails
      return AppTheme.primary;
    }
  }
}
