import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/di/injection.dart';
import '../../../domain/entities/team_entity.dart';
import '../../../domain/entities/tournament_entity.dart';
import '../../../domain/entities/user_entity.dart';
import '../../bloc/team/team_bloc.dart';
import '../../bloc/team/team_event.dart';
import '../../bloc/team/team_state.dart';
import '../../bloc/tournament/tournament_bloc.dart';
import '../../bloc/tournament/tournament_event.dart';
import '../../bloc/tournament/tournament_state.dart';
import 'player_list_screen.dart';

/// Stadium Nights Design System
class _StadiumNights {
  static const Color backgroundDark = Color(0xFF050508);
  static const Color surfaceDark = Color(0xFF0A0A0F);
  static const Color cardDark = Color(0xFF12121A);
  static const Color gold = Color(0xFFFFD700);
  static const Color textPrimary = Color(0xFFFAFAFA);
  static const Color textSecondary = Color(0xFF9CA3AF);
  static const Color textMuted = Color(0xFF6B7280);
}

/// Team Players Screen
/// Shows teams for a league; tapping a team navigates to its player list
class TeamPlayersScreen extends StatelessWidget {
  final UserEntity user;

  const TeamPlayersScreen({
    super.key,
    required this.user,
  });

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(
          create: (context) {
            final bloc = sl<TeamBloc>();
            if (user.leagueId != null) {
              bloc.add(LoadTeamsByLeagueEvent(leagueId: user.leagueId!));
            }
            return bloc;
          },
        ),
        BlocProvider(
          create: (context) {
            final bloc = sl<TournamentBloc>();
            if (user.leagueId != null) {
              bloc.add(LoadTournamentsByLeagueEvent(leagueId: user.leagueId!));
            }
            return bloc;
          },
        ),
      ],
      child: _TeamPlayersView(user: user),
    );
  }
}

class _TeamPlayersView extends StatefulWidget {
  final UserEntity user;

  const _TeamPlayersView({required this.user});

  @override
  State<_TeamPlayersView> createState() => _TeamPlayersViewState();
}

class _TeamPlayersViewState extends State<_TeamPlayersView> {
  TournamentEntity? _selectedTournament;

  void _onTournamentChanged(TournamentEntity? tournament) {
    setState(() => _selectedTournament = tournament);

    if (widget.user.leagueId == null) return;

    if (tournament == null) {
      context.read<TeamBloc>().add(
            LoadTeamsByLeagueEvent(leagueId: widget.user.leagueId!),
          );
    } else {
      context.read<TeamBloc>().add(
            LoadTeamsByTournamentEvent(tournamentId: tournament.id),
          );
    }
  }

  void _refresh() {
    if (widget.user.leagueId == null) return;

    if (_selectedTournament != null) {
      context.read<TeamBloc>().add(
            LoadTeamsByTournamentEvent(tournamentId: _selectedTournament!.id),
          );
    } else {
      context.read<TeamBloc>().add(
            LoadTeamsByLeagueEvent(leagueId: widget.user.leagueId!),
          );
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light.copyWith(
        statusBarColor: Colors.transparent,
        systemNavigationBarColor: _StadiumNights.backgroundDark,
      ),
      child: Scaffold(
        backgroundColor: _StadiumNights.backgroundDark,
        appBar: AppBar(
          backgroundColor: _StadiumNights.surfaceDark,
          foregroundColor: _StadiumNights.textPrimary,
          elevation: 0,
          leading: IconButton(
            icon: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.3),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: _StadiumNights.gold.withOpacity(0.2)),
              ),
              child: const Icon(Icons.arrow_back, color: _StadiumNights.gold, size: 18),
            ),
            onPressed: () => Navigator.pop(context),
          ),
          title: Text(
            'EQUIPOS',
            style: GoogleFonts.bebasNeue(
              fontSize: 22,
              color: _StadiumNights.textPrimary,
              letterSpacing: 2,
            ),
          ),
          centerTitle: true,
          actions: [
            if (widget.user.leagueId != null)
              IconButton(
                icon: const Icon(Icons.refresh, color: _StadiumNights.gold),
                onPressed: _refresh,
              ),
          ],
        ),
        body: Column(
          children: [
            // Tournament filter
            _buildTournamentFilter(),
            // Teams list
            Expanded(
              child: BlocBuilder<TeamBloc, TeamState>(
                builder: (context, state) {
                  if (widget.user.leagueId == null) {
                    return _buildMessage('Sin liga asignada', Icons.error_outline);
                  }
                  if (state is TeamLoading) {
                    return _buildLoading();
                  }
                  if (state is TeamError) {
                    return _buildMessage(state.message, Icons.error_outline);
                  }
                  if (state is TeamsLoaded) {
                    if (state.teams.isEmpty) {
                      final msg = _selectedTournament != null
                          ? 'No hay equipos en este torneo'
                          : 'No hay equipos registrados';
                      return _buildMessage(msg, Icons.groups_outlined);
                    }
                    return _buildTeamsList(context, state.teams);
                  }
                  return _buildLoading();
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTournamentFilter() {
    return BlocBuilder<TournamentBloc, TournamentState>(
      builder: (context, state) {
        List<TournamentEntity> tournaments = [];
        if (state is TournamentsLoaded) {
          tournaments = state.tournaments;
        }

        // Don't show filter if no tournaments loaded yet or loading
        if (tournaments.isEmpty && state is! TournamentsLoaded) {
          return const SizedBox.shrink();
        }

        return Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
          child: Container(
            decoration: BoxDecoration(
              color: _StadiumNights.cardDark,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: _StadiumNights.gold.withOpacity(0.15)),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: _selectedTournament?.id,
                isExpanded: true,
                dropdownColor: _StadiumNights.cardDark,
                icon: const Icon(Icons.expand_more, color: _StadiumNights.gold, size: 22),
                hint: Row(
                  children: [
                    Icon(Icons.emoji_events, color: _StadiumNights.gold.withOpacity(0.7), size: 18),
                    const SizedBox(width: 10),
                    Text(
                      'Todos los equipos',
                      style: GoogleFonts.outfit(
                        color: _StadiumNights.textSecondary,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
                selectedItemBuilder: (context) {
                  return [
                    // "Todos" option
                    _buildSelectedItem('Todos los equipos'),
                    // Tournament items
                    ...tournaments.map((t) => _buildSelectedItem(t.name)),
                  ];
                },
                items: [
                  DropdownMenuItem<String>(
                    value: null,
                    child: Text(
                      'Todos los equipos',
                      style: GoogleFonts.outfit(
                        color: _selectedTournament == null
                            ? _StadiumNights.gold
                            : _StadiumNights.textPrimary,
                        fontSize: 14,
                        fontWeight: _selectedTournament == null
                            ? FontWeight.w600
                            : FontWeight.normal,
                      ),
                    ),
                  ),
                  ...tournaments.map((tournament) {
                    final isSelected = _selectedTournament?.id == tournament.id;
                    return DropdownMenuItem<String>(
                      value: tournament.id,
                      child: Text(
                        tournament.name,
                        style: GoogleFonts.outfit(
                          color: isSelected
                              ? _StadiumNights.gold
                              : _StadiumNights.textPrimary,
                          fontSize: 14,
                          fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                        ),
                      ),
                    );
                  }),
                ],
                onChanged: (tournamentId) {
                  if (tournamentId == null) {
                    _onTournamentChanged(null);
                  } else {
                    final tournament = tournaments.firstWhere((t) => t.id == tournamentId);
                    _onTournamentChanged(tournament);
                  }
                },
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildSelectedItem(String text) {
    return Row(
      children: [
        Icon(Icons.emoji_events, color: _StadiumNights.gold.withOpacity(0.7), size: 18),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            text,
            style: GoogleFonts.outfit(
              color: _StadiumNights.textPrimary,
              fontSize: 14,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  Widget _buildLoading() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const SizedBox(
            width: 50,
            height: 50,
            child: CircularProgressIndicator(
              strokeWidth: 3,
              valueColor: AlwaysStoppedAnimation<Color>(_StadiumNights.gold),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'CARGANDO EQUIPOS',
            style: GoogleFonts.bebasNeue(
              fontSize: 16,
              color: _StadiumNights.textMuted,
              letterSpacing: 2,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMessage(String message, IconData icon) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: _StadiumNights.gold.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 40, color: _StadiumNights.gold),
            ),
            const SizedBox(height: 20),
            Text(
              message,
              textAlign: TextAlign.center,
              style: GoogleFonts.outfit(
                fontSize: 15,
                color: _StadiumNights.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTeamsList(BuildContext context, List<TeamEntity> teams) {
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
      itemCount: teams.length,
      itemBuilder: (context, index) {
        final team = teams[index];
        return _buildTeamCard(context, team);
      },
    );
  }

  Widget _buildTeamCard(BuildContext context, TeamEntity team) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: _StadiumNights.cardDark,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _StadiumNights.gold.withOpacity(0.12)),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () {
            final isAdmin = widget.user.role == 'super_admin' || widget.user.role == 'league_admin';
            final isOwner = widget.user.role == 'team_owner' && team.ownerId == widget.user.id;
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => PlayerListScreen(
                  teamId: team.id,
                  teamName: team.name,
                  canEdit: isAdmin || isOwner,
                ),
              ),
            );
          },
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                // Team logo/shield
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: _StadiumNights.gold.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: _StadiumNights.gold.withOpacity(0.2)),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: team.hasLogo
                        ? _buildLogo(team.logo!)
                        : const Icon(Icons.shield, color: _StadiumNights.gold, size: 24),
                  ),
                ),
                const SizedBox(width: 14),
                // Team info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        team.name,
                        style: GoogleFonts.outfit(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: _StadiumNights.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Toca para ver jugadores',
                        style: GoogleFonts.outfit(
                          fontSize: 12,
                          color: _StadiumNights.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
                // Arrow
                Icon(
                  Icons.chevron_right,
                  color: _StadiumNights.textMuted.withOpacity(0.5),
                  size: 20,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLogo(String logoData) {
    try {
      if (logoData.startsWith('data:image/')) {
        final base64Data = logoData.split(',')[1];
        final Uint8List bytes = base64Decode(base64Data);
        return Image.memory(bytes, width: 48, height: 48, fit: BoxFit.cover);
      }
      return Image.network(logoData, width: 48, height: 48, fit: BoxFit.cover);
    } catch (_) {
      return const Icon(Icons.shield, color: _StadiumNights.gold, size: 24);
    }
  }
}
