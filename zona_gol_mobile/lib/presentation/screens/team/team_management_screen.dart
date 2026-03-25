import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/di/injection.dart';
import '../../../domain/entities/user_entity.dart';
import '../../bloc/team/team_bloc.dart';
import '../../bloc/team/team_event.dart';
import '../../bloc/team/team_state.dart';
import 'create_team_screen.dart';

/// Stadium Nights Design System
class _SN {
  static const Color backgroundDark = Color(0xFF050508);
  static const Color surfaceDark = Color(0xFF0A0A0F);
  static const Color cardDark = Color(0xFF12121A);
  static const Color gold = Color(0xFFFFD700);
  static const Color amber = Color(0xFFF59E0B);
  static const Color neonGreen = Color(0xFF00FF7F);
  static const Color neonBlue = Color(0xFF00BFFF);
  static const Color error = Color(0xFFEF4444);
  static const Color textPrimary = Color(0xFFFAFAFA);
  static const Color textSecondary = Color(0xFF9CA3AF);
  static const Color textMuted = Color(0xFF6B7280);
}

/// Team Management Screen
/// Allows league admins to view, create, edit, and delete teams.
class TeamManagementScreen extends StatelessWidget {
  final UserEntity user;

  const TeamManagementScreen({
    super.key,
    required this.user,
  });

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) {
        final bloc = sl<TeamBloc>();
        if (user.leagueId != null) {
          bloc.add(LoadTeamsByLeagueEvent(leagueId: user.leagueId!));
        }
        return bloc;
      },
      child: _TeamManagementView(user: user),
    );
  }
}

class _TeamManagementView extends StatefulWidget {
  final UserEntity user;

  const _TeamManagementView({required this.user});

  @override
  State<_TeamManagementView> createState() => _TeamManagementViewState();
}

class _TeamManagementViewState extends State<_TeamManagementView> {
  String? _selectedTournamentFilter;

  @override
  Widget build(BuildContext context) {
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light,
      ),
    );

    return Scaffold(
      backgroundColor: _SN.backgroundDark,
      body: BlocConsumer<TeamBloc, TeamState>(
        listener: (context, state) {
          if (state is TeamCreated) {
            _showSuccessSnackBar(
                context, 'Equipo "${state.team.name}" creado exitosamente');
            _reloadTeams(context);
          } else if (state is TeamCreatedWithOwner) {
            _showSuccessSnackBar(
                context, 'Equipo "${state.team.name}" creado con owner');
            _reloadTeams(context);
          } else if (state is TeamUpdated) {
            _showSuccessSnackBar(
                context, 'Equipo "${state.team.name}" actualizado');
            _reloadTeams(context);
          } else if (state is TeamDeleted) {
            _showSuccessSnackBar(context, 'Equipo eliminado correctamente');
            _reloadTeams(context);
          } else if (state is TeamError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  state.message,
                  style: GoogleFonts.outfit(fontSize: 13),
                ),
                backgroundColor: _SN.error,
                behavior: SnackBarBehavior.floating,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            );
          }
        },
        buildWhen: (prev, curr) =>
            curr is TeamLoading || curr is TeamsLoaded || curr is TeamError,
        builder: (context, state) {
          return CustomScrollView(
            slivers: [
              _buildAppBar(context),
              if (state is TeamLoading)
                const SliverFillRemaining(
                  child: Center(
                    child: CircularProgressIndicator(color: _SN.gold),
                  ),
                )
              else if (state is TeamError)
                SliverFillRemaining(
                  child: _buildErrorState(context, state.message),
                )
              else if (state is TeamsLoaded)
                ..._buildLoadedContent(context, state),
            ],
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _navigateToCreateTeam(context),
        backgroundColor: _SN.neonGreen,
        child: const Icon(Icons.add, color: Colors.black),
      ),
    );
  }

  SliverAppBar _buildAppBar(BuildContext context) {
    return SliverAppBar(
      expandedHeight: 120,
      pinned: true,
      backgroundColor: _SN.backgroundDark,
      leading: IconButton(
        icon: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.3),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: _SN.gold.withOpacity(0.2)),
          ),
          child: const Icon(
            Icons.arrow_back,
            color: _SN.gold,
            size: 18,
          ),
        ),
        onPressed: () => Navigator.pop(context),
      ),
      actions: [
        IconButton(
          icon: const Icon(Icons.refresh, color: _SN.textSecondary),
          onPressed: () => _reloadTeams(context),
        ),
      ],
      flexibleSpace: FlexibleSpaceBar(
        title: Text(
          'GESTION DE EQUIPOS',
          style: GoogleFonts.bebasNeue(
            color: _SN.textPrimary,
            fontSize: 22,
            letterSpacing: 1.5,
          ),
        ),
        background: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                _SN.gold.withOpacity(0.12),
                _SN.backgroundDark,
              ],
            ),
          ),
        ),
      ),
    );
  }

  List<Widget> _buildLoadedContent(BuildContext context, TeamsLoaded state) {
    final teams = state.teams;

    // Collect unique tournament IDs for the filter
    final tournamentIds = <String>{};
    for (final team in teams) {
      if (team.tournamentId != null) {
        tournamentIds.add(team.tournamentId!);
      }
    }

    // Apply filter
    final filteredTeams = _selectedTournamentFilter == null
        ? teams
        : teams
            .where(
                (team) => team.tournamentId == _selectedTournamentFilter)
            .toList();

    final slivers = <Widget>[];

    // Summary bar
    slivers.add(
      SliverToBoxAdapter(
        child: _buildSummaryBar(teams.length, filteredTeams.length),
      ),
    );

    // Tournament filter dropdown (only show if there are tournaments)
    if (tournamentIds.isNotEmpty) {
      slivers.add(
        SliverToBoxAdapter(
          child: _buildTournamentFilter(tournamentIds),
        ),
      );
    }

    // Team list
    if (filteredTeams.isEmpty) {
      slivers.add(
        SliverFillRemaining(
          child: _buildEmptyState(),
        ),
      );
    } else {
      slivers.add(
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
          sliver: SliverList(
            delegate: SliverChildBuilderDelegate(
              (context, index) => _buildTeamCard(context, filteredTeams[index]),
              childCount: filteredTeams.length,
            ),
          ),
        ),
      );
    }

    return slivers;
  }

  Widget _buildSummaryBar(int totalTeams, int filteredCount) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: _SN.cardDark,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: _SN.gold.withOpacity(0.15)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: _SN.gold.withOpacity(0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.groups, color: _SN.gold, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '$totalTeams equipos registrados',
                    style: GoogleFonts.outfit(
                      color: _SN.textPrimary,
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (_selectedTournamentFilter != null)
                    Text(
                      '$filteredCount mostrando con filtro',
                      style: GoogleFonts.outfit(
                        color: _SN.textMuted,
                        fontSize: 12,
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTournamentFilter(Set<String> tournamentIds) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
        decoration: BoxDecoration(
          color: _SN.cardDark,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: _SN.neonBlue.withOpacity(0.2)),
        ),
        child: DropdownButtonHideUnderline(
          child: DropdownButton<String?>(
            value: _selectedTournamentFilter,
            isExpanded: true,
            icon: const Icon(Icons.filter_list, color: _SN.neonBlue, size: 20),
            dropdownColor: _SN.cardDark,
            hint: Row(
              children: [
                const Icon(Icons.emoji_events, color: _SN.neonBlue, size: 18),
                const SizedBox(width: 10),
                Text(
                  'Filtrar por torneo',
                  style: GoogleFonts.outfit(
                    color: _SN.textSecondary,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
            items: [
              DropdownMenuItem<String?>(
                value: null,
                child: Text(
                  'Todos los torneos',
                  style: GoogleFonts.outfit(
                    color: _SN.textPrimary,
                    fontSize: 14,
                  ),
                ),
              ),
              ...tournamentIds.map((id) => DropdownMenuItem<String?>(
                    value: id,
                    child: Text(
                      'Torneo: ${id.substring(0, 8)}...',
                      style: GoogleFonts.outfit(
                        color: _SN.textPrimary,
                        fontSize: 14,
                      ),
                    ),
                  )),
            ],
            onChanged: (value) {
              setState(() {
                _selectedTournamentFilter = value;
              });
            },
          ),
        ),
      ),
    );
  }

  Widget _buildTeamCard(BuildContext context, dynamic team) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: _SN.cardDark,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: team.isActive
              ? _SN.gold.withOpacity(0.12)
              : _SN.error.withOpacity(0.15),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            // Team logo / avatar
            Container(
              width: 50,
              height: 50,
              decoration: BoxDecoration(
                color: _SN.gold.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: _SN.gold.withOpacity(0.2)),
                image: team.hasLogo
                    ? DecorationImage(
                        image: NetworkImage(team.logo!),
                        fit: BoxFit.cover,
                      )
                    : null,
              ),
              child: team.hasLogo
                  ? null
                  : Center(
                      child: Text(
                        team.name.isNotEmpty
                            ? team.name[0].toUpperCase()
                            : '?',
                        style: GoogleFonts.bebasNeue(
                          color: _SN.gold,
                          fontSize: 22,
                        ),
                      ),
                    ),
            ),
            const SizedBox(width: 14),

            // Team info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Name + active badge
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          team.name,
                          style: GoogleFonts.outfit(
                            color: _SN.textPrimary,
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      _buildStatusBadge(team.isActive),
                    ],
                  ),
                  const SizedBox(height: 4),

                  // Owner ID
                  Row(
                    children: [
                      const Icon(Icons.person_outline,
                          color: _SN.textMuted, size: 14),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          team.ownerId,
                          style: GoogleFonts.outfit(
                            color: _SN.textMuted,
                            fontSize: 12,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),

                  // Tournament info
                  if (team.tournamentId != null) ...[
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        const Icon(Icons.emoji_events,
                            color: _SN.amber, size: 14),
                        const SizedBox(width: 4),
                        Text(
                          'Torneo: ${team.tournamentId!.substring(0, 8)}...',
                          style: GoogleFonts.outfit(
                            color: _SN.amber,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),

            // Action buttons
            Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _buildActionButton(
                  icon: Icons.edit,
                  color: _SN.neonBlue,
                  onTap: () => _showEditDialog(context, team),
                ),
                const SizedBox(height: 6),
                _buildActionButton(
                  icon: Icons.delete_outline,
                  color: _SN.error,
                  onTap: () => _showDeleteConfirmation(context, team),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusBadge(bool isActive) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: isActive
            ? _SN.neonGreen.withOpacity(0.15)
            : _SN.error.withOpacity(0.15),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(
          color: isActive
              ? _SN.neonGreen.withOpacity(0.3)
              : _SN.error.withOpacity(0.3),
        ),
      ),
      child: Text(
        isActive ? 'Activo' : 'Inactivo',
        style: GoogleFonts.outfit(
          color: isActive ? _SN.neonGreen : _SN.error,
          fontSize: 10,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildActionButton({
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Icon(icon, color: color, size: 18),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: _SN.gold.withOpacity(0.1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Icon(
              Icons.groups_outlined,
              color: _SN.gold,
              size: 40,
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'Sin equipos',
            style: GoogleFonts.bebasNeue(
              color: _SN.textPrimary,
              fontSize: 22,
              letterSpacing: 1.5,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _selectedTournamentFilter != null
                ? 'No hay equipos en este torneo'
                : 'Agrega el primer equipo de tu liga',
            style: GoogleFonts.outfit(
              color: _SN.textMuted,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 24),
          GestureDetector(
            onTap: () => _navigateToCreateTeam(context),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [_SN.gold, _SN.amber],
                ),
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: _SN.gold.withOpacity(0.3),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.add, color: Colors.black, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    'CREAR EQUIPO',
                    style: GoogleFonts.bebasNeue(
                      fontSize: 16,
                      color: Colors.black,
                      letterSpacing: 2,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState(BuildContext context, String message) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 70,
              height: 70,
              decoration: BoxDecoration(
                color: _SN.error.withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Icon(
                Icons.error_outline,
                color: _SN.error,
                size: 36,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Error al cargar equipos',
              style: GoogleFonts.bebasNeue(
                color: _SN.textPrimary,
                fontSize: 20,
                letterSpacing: 1.5,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: GoogleFonts.outfit(
                color: _SN.textMuted,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 24),
            GestureDetector(
              onTap: () => _reloadTeams(context),
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                decoration: BoxDecoration(
                  color: _SN.gold.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: _SN.gold.withOpacity(0.3)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.refresh, color: _SN.gold, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      'Reintentar',
                      style: GoogleFonts.outfit(
                        color: _SN.gold,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showSuccessSnackBar(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          message,
          style: GoogleFonts.outfit(fontSize: 13),
        ),
        backgroundColor: _SN.neonGreen.withOpacity(0.9),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
        ),
      ),
    );
  }

  void _reloadTeams(BuildContext context) {
    if (widget.user.leagueId != null) {
      context
          .read<TeamBloc>()
          .add(LoadTeamsByLeagueEvent(leagueId: widget.user.leagueId!));
    }
  }

  void _navigateToCreateTeam(BuildContext context) {
    if (widget.user.leagueId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('No tienes una liga asignada'),
          backgroundColor: _SN.error,
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
        builder: (context) => BlocProvider(
          create: (context) => sl<TeamBloc>(),
          child: CreateTeamScreen(leagueId: widget.user.leagueId!),
        ),
      ),
    ).then((result) {
      if (result == true) {
        _reloadTeams(context);
      }
    });
  }

  void _showEditDialog(BuildContext context, dynamic team) {
    final nameController = TextEditingController(text: team.name);
    final slugController = TextEditingController(text: team.slug);
    final descriptionController =
        TextEditingController(text: team.description ?? '');
    bool isActive = team.isActive;

    showDialog(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (builderContext, setDialogState) {
            return Dialog(
              backgroundColor: _SN.surfaceDark,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
                side: BorderSide(color: _SN.gold.withOpacity(0.3)),
              ),
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Title
                      Center(
                        child: Text(
                          'EDITAR EQUIPO',
                          style: GoogleFonts.bebasNeue(
                            fontSize: 22,
                            color: _SN.gold,
                            letterSpacing: 2,
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Name field
                      _buildDialogTextField(
                        controller: nameController,
                        label: 'Nombre',
                        icon: Icons.shield,
                      ),
                      const SizedBox(height: 14),

                      // Slug field
                      _buildDialogTextField(
                        controller: slugController,
                        label: 'Slug',
                        icon: Icons.link,
                      ),
                      const SizedBox(height: 14),

                      // Description field
                      _buildDialogTextField(
                        controller: descriptionController,
                        label: 'Descripcion',
                        icon: Icons.description,
                        maxLines: 2,
                      ),
                      const SizedBox(height: 16),

                      // Active toggle
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: _SN.cardDark,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isActive
                                ? _SN.neonGreen.withOpacity(0.2)
                                : _SN.error.withOpacity(0.2),
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              isActive
                                  ? Icons.check_circle
                                  : Icons.cancel,
                              color: isActive ? _SN.neonGreen : _SN.error,
                              size: 20,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                'Equipo activo',
                                style: GoogleFonts.outfit(
                                  color: _SN.textPrimary,
                                  fontSize: 14,
                                ),
                              ),
                            ),
                            Switch(
                              value: isActive,
                              onChanged: (value) {
                                setDialogState(() => isActive = value);
                              },
                              activeColor: _SN.neonGreen,
                              activeTrackColor:
                                  _SN.neonGreen.withOpacity(0.3),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Action buttons
                      Row(
                        children: [
                          Expanded(
                            child: GestureDetector(
                              onTap: () => Navigator.pop(dialogContext),
                              child: Container(
                                padding:
                                    const EdgeInsets.symmetric(vertical: 14),
                                decoration: BoxDecoration(
                                  color: _SN.cardDark,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: _SN.textMuted.withOpacity(0.3),
                                  ),
                                ),
                                child: Center(
                                  child: Text(
                                    'CANCELAR',
                                    style: GoogleFonts.bebasNeue(
                                      fontSize: 14,
                                      color: _SN.textSecondary,
                                      letterSpacing: 1.5,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: GestureDetector(
                              onTap: () {
                                final name = nameController.text.trim();
                                final slug = slugController.text.trim();
                                if (name.isEmpty || slug.isEmpty) return;

                                Navigator.pop(dialogContext);
                                context.read<TeamBloc>().add(
                                      UpdateTeamEvent(
                                        teamId: team.id,
                                        name: name,
                                        slug: slug,
                                        description: descriptionController
                                                .text
                                                .trim()
                                                .isNotEmpty
                                            ? descriptionController.text.trim()
                                            : null,
                                        isActive: isActive,
                                      ),
                                    );
                              },
                              child: Container(
                                padding:
                                    const EdgeInsets.symmetric(vertical: 14),
                                decoration: BoxDecoration(
                                  gradient: const LinearGradient(
                                    colors: [_SN.gold, _SN.amber],
                                  ),
                                  borderRadius: BorderRadius.circular(12),
                                  boxShadow: [
                                    BoxShadow(
                                      color: _SN.gold.withOpacity(0.3),
                                      blurRadius: 8,
                                      offset: const Offset(0, 2),
                                    ),
                                  ],
                                ),
                                child: Center(
                                  child: Text(
                                    'GUARDAR',
                                    style: GoogleFonts.bebasNeue(
                                      fontSize: 14,
                                      color: Colors.black,
                                      letterSpacing: 1.5,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildDialogTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    int maxLines = 1,
  }) {
    return TextFormField(
      controller: controller,
      style: GoogleFonts.outfit(
        color: _SN.textPrimary,
        fontSize: 14,
      ),
      maxLines: maxLines,
      cursorColor: _SN.gold,
      decoration: InputDecoration(
        labelText: label,
        filled: true,
        fillColor: _SN.cardDark,
        labelStyle: GoogleFonts.outfit(
          color: _SN.textMuted,
          fontSize: 13,
        ),
        prefixIcon: Icon(icon, color: _SN.gold, size: 18),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: _SN.gold.withOpacity(0.2)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: _SN.gold.withOpacity(0.2)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: _SN.gold, width: 1.5),
        ),
        contentPadding: const EdgeInsets.all(14),
      ),
    );
  }

  void _showDeleteConfirmation(BuildContext context, dynamic team) {
    showDialog(
      context: context,
      builder: (dialogContext) => Dialog(
        backgroundColor: _SN.surfaceDark,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(color: _SN.error.withOpacity(0.3)),
        ),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Warning icon
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: _SN.error.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: _SN.error.withOpacity(0.3)),
                ),
                child: const Icon(
                  Icons.warning_amber_rounded,
                  color: _SN.error,
                  size: 32,
                ),
              ),
              const SizedBox(height: 20),

              Text(
                'ELIMINAR EQUIPO',
                style: GoogleFonts.bebasNeue(
                  fontSize: 22,
                  color: _SN.error,
                  letterSpacing: 2,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Estas seguro de que deseas eliminar "${team.name}"?\nEsta accion no se puede deshacer.',
                textAlign: TextAlign.center,
                style: GoogleFonts.outfit(
                  color: _SN.textSecondary,
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 24),

              // Action buttons
              Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => Navigator.pop(dialogContext),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        decoration: BoxDecoration(
                          color: _SN.cardDark,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: _SN.textMuted.withOpacity(0.3),
                          ),
                        ),
                        child: Center(
                          child: Text(
                            'CANCELAR',
                            style: GoogleFonts.bebasNeue(
                              fontSize: 14,
                              color: _SN.textSecondary,
                              letterSpacing: 1.5,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: GestureDetector(
                      onTap: () {
                        Navigator.pop(dialogContext);
                        context
                            .read<TeamBloc>()
                            .add(DeleteTeamEvent(teamId: team.id));
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        decoration: BoxDecoration(
                          color: _SN.error,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [
                            BoxShadow(
                              color: _SN.error.withOpacity(0.3),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Center(
                          child: Text(
                            'ELIMINAR',
                            style: GoogleFonts.bebasNeue(
                              fontSize: 14,
                              color: Colors.white,
                              letterSpacing: 1.5,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
