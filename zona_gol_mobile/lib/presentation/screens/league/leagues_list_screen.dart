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
/// Displays a list of all leagues
class LeaguesListScreen extends StatelessWidget {
  const LeaguesListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => sl<LeagueBloc>()..add(const LoadAllLeaguesEvent()),
      child: const _LeaguesListView(),
    );
  }
}

class _LeaguesListView extends StatelessWidget {
  const _LeaguesListView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Ligas'),
        backgroundColor: AppTheme.primary,
        foregroundColor: Colors.white,
      ),
      body: BlocBuilder<LeagueBloc, LeagueState>(
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
                  return _LeagueCard(league: league);
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
/// Displays a single league in a card format
class _LeagueCard extends StatelessWidget {
  final LeagueEntity league;

  const _LeagueCard({required this.league});

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
          child: Row(
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
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 4),

                    // League Description
                    Text(
                      league.description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
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
                      ],
                    ),
                  ],
                ),
              ),

              // Arrow Icon
              const Icon(
                Icons.arrow_forward_ios,
                size: 16,
                color: Colors.grey,
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Build league logo widget
  /// Supports both base64 data URIs and HTTP/HTTPS URLs
  Widget _buildLeagueLogo(String logoData) {
    try {
      if (logoData.startsWith('data:image/')) {
        // Data URI (Base64)
        final base64Data = logoData.split(',')[1];
        final Uint8List bytes = base64Decode(base64Data);
        return Image.memory(
          bytes,
          width: 60,
          height: 60,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) {
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
          },
        );
      } else {
        // HTTP/HTTPS URL
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
          },
        );
      }
    } catch (e) {
      // Fallback for any errors
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
}
