import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/di/injection.dart';
import '../../../domain/entities/suspension_entity.dart';
import '../../../domain/entities/user_entity.dart';
import '../../../domain/repositories/suspension_repository.dart';
import '../../bloc/suspension/suspension_bloc.dart';
import '../../bloc/suspension/suspension_event.dart';
import '../../bloc/suspension/suspension_state.dart';

/// Stadium Nights Design System
class _SN {
  static const Color backgroundDark = Color(0xFF050508);
  static const Color cardDark = Color(0xFF12121A);
  static const Color gold = Color(0xFFFFD700);
  static const Color neonGreen = Color(0xFF00FF7F);
  static const Color neonBlue = Color(0xFF00BFFF);
  static const Color amber = Color(0xFFF59E0B);
  static const Color error = Color(0xFFEF4444);
  static const Color textPrimary = Color(0xFFFAFAFA);
  static const Color textSecondary = Color(0xFF9CA3AF);
  static const Color textMuted = Color(0xFF6B7280);
}

/// Suspensions Management Screen
/// Allows league admins to manage player suspensions
class SuspensionsManagementScreen extends StatelessWidget {
  final UserEntity user;

  const SuspensionsManagementScreen({super.key, required this.user});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) {
        final bloc = sl<SuspensionBloc>();
        if (user.leagueId != null) {
          bloc.add(LoadSuspensionsEvent(leagueId: user.leagueId!));
        }
        return bloc;
      },
      child: _SuspensionsView(user: user),
    );
  }
}

class _SuspensionsView extends StatefulWidget {
  final UserEntity user;

  const _SuspensionsView({required this.user});

  @override
  State<_SuspensionsView> createState() => _SuspensionsViewState();
}

class _SuspensionsViewState extends State<_SuspensionsView> {
  String _statusFilter = 'all'; // all, active, completed, cancelled

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
      body: BlocConsumer<SuspensionBloc, SuspensionState>(
        listener: (context, state) {
          if (state is SuspensionActionSuccess) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: _SN.neonGreen.withOpacity(0.9),
                behavior: SnackBarBehavior.floating,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10)),
              ),
            );
          } else if (state is SuspensionActionError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: _SN.error,
                behavior: SnackBarBehavior.floating,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10)),
              ),
            );
          }
        },
        buildWhen: (prev, curr) =>
            curr is SuspensionLoading ||
            curr is SuspensionLoaded ||
            curr is SuspensionError,
        builder: (context, state) {
          return CustomScrollView(
            slivers: [
              _buildAppBar(context, state),
              if (state is SuspensionLoading)
                const SliverFillRemaining(
                  child: Center(
                    child: CircularProgressIndicator(color: _SN.gold),
                  ),
                )
              else if (state is SuspensionError)
                SliverFillRemaining(
                  child: _buildErrorState(context, state.message),
                )
              else if (state is SuspensionLoaded)
                ..._buildLoadedContent(context, state),
            ],
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showCreateDialog(context),
        backgroundColor: _SN.neonGreen,
        child: const Icon(Icons.add, color: Colors.black),
      ),
    );
  }

  SliverAppBar _buildAppBar(BuildContext context, SuspensionState state) {
    return SliverAppBar(
      expandedHeight: 120,
      pinned: true,
      backgroundColor: _SN.backgroundDark,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back, color: _SN.textPrimary),
        onPressed: () => Navigator.pop(context),
      ),
      actions: [
        if (state is SuspensionLoaded && state.suspensions.isNotEmpty)
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert, color: _SN.textSecondary),
            color: _SN.cardDark,
            onSelected: (value) {
              if (value == 'clear_all') {
                _showClearAllDialog(context, state);
              }
            },
            itemBuilder: (context) => [
              PopupMenuItem(
                value: 'clear_all',
                child: Row(
                  children: [
                    Icon(Icons.delete_sweep, color: _SN.error, size: 20),
                    const SizedBox(width: 8),
                    Text('Limpiar Todo',
                        style: TextStyle(color: _SN.error)),
                  ],
                ),
              ),
            ],
          ),
      ],
      flexibleSpace: FlexibleSpaceBar(
        title: Text(
          'Suspensiones',
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
                _SN.error.withOpacity(0.15),
                _SN.backgroundDark,
              ],
            ),
          ),
        ),
      ),
    );
  }

  List<Widget> _buildLoadedContent(
      BuildContext context, SuspensionLoaded state) {
    // Summary cards
    final widgets = <Widget>[
      SliverToBoxAdapter(child: _buildSummaryRow(state)),
      SliverToBoxAdapter(child: _buildFilterChips(state)),
    ];

    final filtered = _filterSuspensions(state.suspensions);

    if (filtered.isEmpty) {
      widgets.add(SliverFillRemaining(
        child: _buildEmptyState(),
      ));
    } else {
      widgets.add(SliverPadding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
        sliver: SliverList(
          delegate: SliverChildBuilderDelegate(
            (context, index) =>
                _buildSuspensionCard(context, filtered[index]),
            childCount: filtered.length,
          ),
        ),
      ));
    }

    return widgets;
  }

  Widget _buildSummaryRow(SuspensionLoaded state) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Row(
        children: [
          _buildSummaryChip(
            'Activas',
            state.activeCount,
            _SN.error,
          ),
          const SizedBox(width: 8),
          _buildSummaryChip(
            'Completadas',
            state.completedCount,
            _SN.textMuted,
          ),
          const SizedBox(width: 8),
          _buildSummaryChip(
            'Canceladas',
            state.cancelledCount,
            _SN.textMuted.withOpacity(0.5),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryChip(String label, int count, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Column(
          children: [
            Text(
              '$count',
              style: GoogleFonts.bebasNeue(
                color: color,
                fontSize: 24,
              ),
            ),
            Text(
              label,
              style: TextStyle(
                color: color.withOpacity(0.8),
                fontSize: 11,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChips(SuspensionLoaded state) {
    final filters = [
      ('all', 'Todos', state.suspensions.length),
      ('active', 'Activas', state.activeCount),
      ('completed', 'Completadas', state.completedCount),
      ('cancelled', 'Canceladas', state.cancelledCount),
    ];

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
      child: Row(
        children: filters.map((f) {
          final isSelected = _statusFilter == f.$1;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: FilterChip(
              selected: isSelected,
              label: Text('${f.$2} (${f.$3})'),
              labelStyle: TextStyle(
                color: isSelected ? Colors.black : _SN.textSecondary,
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
              ),
              backgroundColor: _SN.cardDark,
              selectedColor: _SN.gold,
              checkmarkColor: Colors.black,
              side: BorderSide(
                color: isSelected
                    ? _SN.gold
                    : _SN.textMuted.withOpacity(0.3),
              ),
              onSelected: (selected) {
                setState(() {
                  _statusFilter = selected ? f.$1 : 'all';
                });
              },
            ),
          );
        }).toList(),
      ),
    );
  }

  List<SuspensionEntity> _filterSuspensions(
      List<SuspensionEntity> suspensions) {
    if (_statusFilter == 'all') return suspensions;
    return suspensions
        .where((s) => s.status.name == _statusFilter)
        .toList();
  }

  Widget _buildSuspensionCard(
      BuildContext context, SuspensionEntity suspension) {
    final isActive = suspension.status == SuspensionStatus.active;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: _SN.cardDark,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isActive
              ? _SN.error.withOpacity(0.3)
              : _SN.textMuted.withOpacity(0.15),
        ),
      ),
      child: Column(
        children: [
          // Header: Player info + status badge
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
            child: Row(
              children: [
                // Player avatar
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: isActive
                        ? _SN.error.withOpacity(0.2)
                        : _SN.textMuted.withOpacity(0.15),
                    border: Border.all(
                      color: isActive
                          ? _SN.error.withOpacity(0.5)
                          : _SN.textMuted.withOpacity(0.3),
                      width: 1.5,
                    ),
                  ),
                  child: Center(
                    child: Text(
                      suspension.jerseyNumber != null
                          ? '${suspension.jerseyNumber}'
                          : '?',
                      style: GoogleFonts.bebasNeue(
                        color: isActive ? _SN.error : _SN.textMuted,
                        fontSize: 18,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                // Name + team
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        suspension.playerName ?? 'Jugador',
                        style: const TextStyle(
                          color: _SN.textPrimary,
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (suspension.teamName != null)
                        Text(
                          suspension.teamName!,
                          style: const TextStyle(
                            color: _SN.textSecondary,
                            fontSize: 12,
                          ),
                        ),
                    ],
                  ),
                ),
                // Status badge
                _buildStatusBadge(suspension.status),
              ],
            ),
          ),

          // Divider
          Divider(
            color: _SN.textMuted.withOpacity(0.15),
            height: 1,
          ),

          // Details row
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
            child: Row(
              children: [
                // Type badge
                _buildTypeBadge(suspension.suspensionType),
                const Spacer(),
                // Progress
                Text(
                  '${suspension.matchesServed}/${suspension.matchesToServe}',
                  style: GoogleFonts.bebasNeue(
                    color: isActive ? _SN.error : _SN.textMuted,
                    fontSize: 20,
                  ),
                ),
                const SizedBox(width: 4),
                Text(
                  'partidos',
                  style: TextStyle(
                    color: _SN.textMuted,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),

          // Reason (if exists)
          if (suspension.reason != null &&
              suspension.reason!.trim().isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.notes,
                      size: 14, color: _SN.textMuted.withOpacity(0.5)),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      suspension.reason!,
                      style: TextStyle(
                        color: _SN.textMuted,
                        fontSize: 12,
                        fontStyle: FontStyle.italic,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),

          // Progress bar (active only)
          if (isActive) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 4),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: suspension.progressPercentage / 100,
                  backgroundColor: _SN.error.withOpacity(0.15),
                  valueColor:
                      AlwaysStoppedAnimation<Color>(_SN.error.withOpacity(0.7)),
                  minHeight: 4,
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 2, 16, 8),
              child: Text(
                suspension.suspensionSummary,
                style: const TextStyle(color: _SN.textMuted, fontSize: 11),
              ),
            ),
          ],

          // Action buttons (active only)
          if (isActive)
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 0, 8, 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton.icon(
                    onPressed: () =>
                        _showEditDialog(context, suspension),
                    icon: const Icon(Icons.edit, size: 16),
                    label: const Text('Editar'),
                    style: TextButton.styleFrom(
                      foregroundColor: _SN.neonBlue,
                      textStyle: const TextStyle(fontSize: 12),
                    ),
                  ),
                  TextButton.icon(
                    onPressed: () =>
                        _showCompleteConfirm(context, suspension),
                    icon: const Icon(Icons.check_circle, size: 16),
                    label: const Text('Completar'),
                    style: TextButton.styleFrom(
                      foregroundColor: _SN.neonGreen,
                      textStyle: const TextStyle(fontSize: 12),
                    ),
                  ),
                  TextButton.icon(
                    onPressed: () =>
                        _showCancelConfirm(context, suspension),
                    icon: const Icon(Icons.cancel, size: 16),
                    label: const Text('Cancelar'),
                    style: TextButton.styleFrom(
                      foregroundColor: _SN.error.withOpacity(0.7),
                      textStyle: const TextStyle(fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildStatusBadge(SuspensionStatus status) {
    Color color;
    switch (status) {
      case SuspensionStatus.active:
        color = _SN.error;
        break;
      case SuspensionStatus.completed:
        color = _SN.textMuted;
        break;
      case SuspensionStatus.cancelled:
        color = _SN.textMuted.withOpacity(0.5);
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.4)),
      ),
      child: Text(
        status.display,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildTypeBadge(SuspensionType type) {
    Color color;
    IconData icon;
    switch (type) {
      case SuspensionType.redCard:
        color = _SN.error;
        icon = Icons.square;
        break;
      case SuspensionType.yellowAccumulation:
        color = _SN.amber;
        icon = Icons.square;
        break;
      case SuspensionType.disciplinaryCommittee:
        color = _SN.neonBlue;
        icon = Icons.gavel;
        break;
      case SuspensionType.other:
        color = _SN.textMuted;
        icon = Icons.info_outline;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(
            type.display,
            style: TextStyle(color: color, fontSize: 11),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.gavel, size: 64, color: _SN.textMuted.withOpacity(0.3)),
          const SizedBox(height: 16),
          Text(
            _statusFilter == 'all'
                ? 'No hay suspensiones registradas'
                : 'No hay suspensiones con este filtro',
            style: const TextStyle(
              color: _SN.textSecondary,
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Usa el bot\u00f3n + para crear una suspensi\u00f3n',
            style: TextStyle(
              color: _SN.textMuted,
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState(BuildContext context, String message) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 48, color: _SN.error),
          const SizedBox(height: 16),
          Text(
            message,
            style: const TextStyle(color: _SN.textSecondary, fontSize: 14),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () {
              if (widget.user.leagueId != null) {
                context.read<SuspensionBloc>().add(
                    LoadSuspensionsEvent(leagueId: widget.user.leagueId!));
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: _SN.gold,
              foregroundColor: Colors.black,
            ),
            child: const Text('Reintentar'),
          ),
        ],
      ),
    );
  }

  // ==================== Dialogs ====================

  void _showCreateDialog(BuildContext context) {
    if (widget.user.leagueId == null) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => _CreateSuspensionSheet(
        leagueId: widget.user.leagueId!,
        suspensionBloc: context.read<SuspensionBloc>(),
      ),
    );
  }

  void _showEditDialog(BuildContext context, SuspensionEntity suspension) {
    final controller = TextEditingController(
        text: suspension.matchesToServe.toString());

    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: _SN.cardDark,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Editar Suspensi\u00f3n',
            style: TextStyle(color: _SN.textPrimary)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Player info
            Text(
              suspension.displayName,
              style: const TextStyle(
                  color: _SN.textPrimary, fontWeight: FontWeight.w600),
            ),
            if (suspension.teamName != null)
              Text(suspension.teamName!,
                  style: const TextStyle(color: _SN.textSecondary, fontSize: 13)),
            Text(suspension.suspensionType.display,
                style: const TextStyle(color: _SN.textMuted, fontSize: 12)),
            const SizedBox(height: 4),
            Text(
              'Cumplidos: ${suspension.matchesServed}',
              style: const TextStyle(color: _SN.textMuted, fontSize: 12),
            ),
            const SizedBox(height: 16),
            // Matches to serve
            TextField(
              controller: controller,
              keyboardType: TextInputType.number,
              style: const TextStyle(color: _SN.textPrimary),
              decoration: InputDecoration(
                labelText: 'Partidos a cumplir',
                labelStyle: const TextStyle(color: _SN.textSecondary),
                filled: true,
                fillColor: _SN.backgroundDark,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: _SN.gold),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: Text('Cancelar',
                style: TextStyle(color: _SN.textMuted)),
          ),
          ElevatedButton(
            onPressed: () {
              final matches = int.tryParse(controller.text);
              if (matches != null && matches > 0) {
                context.read<SuspensionBloc>().add(UpdateSuspensionEvent(
                  suspensionId: suspension.id,
                  matchesToServe: matches,
                  leagueId: widget.user.leagueId!,
                ));
                Navigator.pop(dialogContext);
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: _SN.gold,
              foregroundColor: Colors.black,
            ),
            child: const Text('Guardar'),
          ),
        ],
      ),
    );
  }

  void _showCompleteConfirm(
      BuildContext context, SuspensionEntity suspension) {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: _SN.cardDark,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Completar Suspensi\u00f3n',
            style: TextStyle(color: _SN.textPrimary)),
        content: Text(
          '\u00bfMarcar como completada la suspensi\u00f3n de ${suspension.playerName}?',
          style: const TextStyle(color: _SN.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: Text('No', style: TextStyle(color: _SN.textMuted)),
          ),
          ElevatedButton(
            onPressed: () {
              context.read<SuspensionBloc>().add(CompleteSuspensionEvent(
                suspensionId: suspension.id,
                leagueId: widget.user.leagueId!,
              ));
              Navigator.pop(dialogContext);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: _SN.neonGreen,
              foregroundColor: Colors.black,
            ),
            child: const Text('Completar'),
          ),
        ],
      ),
    );
  }

  void _showCancelConfirm(
      BuildContext context, SuspensionEntity suspension) {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: _SN.cardDark,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Cancelar Suspensi\u00f3n',
            style: TextStyle(color: _SN.textPrimary)),
        content: Text(
          '\u00bfCancelar la suspensi\u00f3n de ${suspension.playerName}?',
          style: const TextStyle(color: _SN.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: Text('No', style: TextStyle(color: _SN.textMuted)),
          ),
          ElevatedButton(
            onPressed: () {
              context.read<SuspensionBloc>().add(CancelSuspensionEvent(
                suspensionId: suspension.id,
                leagueId: widget.user.leagueId!,
              ));
              Navigator.pop(dialogContext);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: _SN.error,
              foregroundColor: Colors.white,
            ),
            child: const Text('Cancelar Suspensi\u00f3n'),
          ),
        ],
      ),
    );
  }

  void _showClearAllDialog(
      BuildContext context, SuspensionLoaded state) {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: _SN.cardDark,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Icon(Icons.warning_amber, color: _SN.error),
            const SizedBox(width: 8),
            const Text('Limpiar Todo',
                style: TextStyle(color: _SN.textPrimary)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Se eliminar\u00e1n TODAS las suspensiones:',
              style: TextStyle(color: _SN.textSecondary, fontSize: 14),
            ),
            const SizedBox(height: 12),
            _clearAllRow('Activas', state.activeCount, _SN.error),
            _clearAllRow('Completadas', state.completedCount, _SN.textMuted),
            _clearAllRow(
                'Canceladas', state.cancelledCount, _SN.textMuted.withOpacity(0.5)),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: _SN.error.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: _SN.error.withOpacity(0.3)),
              ),
              child: const Text(
                'Esta acci\u00f3n no se puede deshacer.',
                style: TextStyle(color: _SN.error, fontSize: 12),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: Text('Cancelar',
                style: TextStyle(color: _SN.textMuted)),
          ),
          ElevatedButton(
            onPressed: () {
              context.read<SuspensionBloc>().add(ClearAllSuspensionsEvent(
                leagueId: widget.user.leagueId!,
              ));
              Navigator.pop(dialogContext);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: _SN.error,
              foregroundColor: Colors.white,
            ),
            child: const Text('Eliminar Todo'),
          ),
        ],
      ),
    );
  }

  Widget _clearAllRow(String label, int count, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 8),
          Text('$count $label',
              style: TextStyle(color: _SN.textSecondary, fontSize: 13)),
        ],
      ),
    );
  }
}

/// Create Suspension Bottom Sheet
class _CreateSuspensionSheet extends StatefulWidget {
  final String leagueId;
  final SuspensionBloc suspensionBloc;

  const _CreateSuspensionSheet({
    required this.leagueId,
    required this.suspensionBloc,
  });

  @override
  State<_CreateSuspensionSheet> createState() =>
      _CreateSuspensionSheetState();
}

class _CreateSuspensionSheetState extends State<_CreateSuspensionSheet> {
  List<Map<String, dynamic>> _players = [];
  bool _loadingPlayers = true;
  String? _errorMessage;

  Map<String, dynamic>? _selectedPlayer;
  String _suspensionType = 'red_card';
  final _reasonCtrl = TextEditingController();
  final _matchesCtrl = TextEditingController(text: '1');

  @override
  void initState() {
    super.initState();
    _loadPlayers();
  }

  Future<void> _loadPlayers() async {
    final repo = sl<SuspensionRepository>();
    final result = await repo.getLeaguePlayers(widget.leagueId);

    if (!mounted) return;

    result.fold(
      (failure) {
        setState(() {
          _loadingPlayers = false;
          _errorMessage = failure.message;
        });
      },
      (players) {
        setState(() {
          _players = players;
          _loadingPlayers = false;
        });
      },
    );
  }

  @override
  void dispose() {
    _reasonCtrl.dispose();
    _matchesCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.85,
      ),
      decoration: const BoxDecoration(
        color: _SN.cardDark,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle
          Container(
            margin: const EdgeInsets.only(top: 12),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: _SN.textMuted.withOpacity(0.3),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          // Title
          Padding(
            padding: const EdgeInsets.all(20),
            child: Text(
              'NUEVA SUSPENSI\u00d3N',
              style: GoogleFonts.bebasNeue(
                color: _SN.textPrimary,
                fontSize: 20,
                letterSpacing: 1.5,
              ),
            ),
          ),

          // Content
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Player Selector
                  const Text('Jugador',
                      style: TextStyle(
                          color: _SN.textSecondary,
                          fontSize: 13,
                          fontWeight: FontWeight.w500)),
                  const SizedBox(height: 8),
                  _buildPlayerSelector(),
                  const SizedBox(height: 20),

                  // Suspension Type
                  const Text('Tipo de Suspensi\u00f3n',
                      style: TextStyle(
                          color: _SN.textSecondary,
                          fontSize: 13,
                          fontWeight: FontWeight.w500)),
                  const SizedBox(height: 8),
                  _buildTypeSelector(),
                  const SizedBox(height: 20),

                  // Reason
                  const Text('Raz\u00f3n',
                      style: TextStyle(
                          color: _SN.textSecondary,
                          fontSize: 13,
                          fontWeight: FontWeight.w500)),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _reasonCtrl,
                    maxLines: 2,
                    style: const TextStyle(color: _SN.textPrimary),
                    decoration: InputDecoration(
                      hintText: 'Descripci\u00f3n de la raz\u00f3n...',
                      hintStyle: TextStyle(color: _SN.textMuted),
                      filled: true,
                      fillColor: _SN.backgroundDark,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide.none,
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: _SN.gold),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Matches to serve
                  const Text('Partidos a Cumplir',
                      style: TextStyle(
                          color: _SN.textSecondary,
                          fontSize: 13,
                          fontWeight: FontWeight.w500)),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _matchesCtrl,
                    keyboardType: TextInputType.number,
                    style: const TextStyle(color: _SN.textPrimary),
                    decoration: InputDecoration(
                      hintText: '1',
                      hintStyle: TextStyle(color: _SN.textMuted),
                      filled: true,
                      fillColor: _SN.backgroundDark,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide.none,
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: _SN.gold),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Warning
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: _SN.amber.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                      border:
                          Border.all(color: _SN.amber.withOpacity(0.3)),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.info_outline,
                            size: 16, color: _SN.amber),
                        const SizedBox(width: 8),
                        const Expanded(
                          child: Text(
                            'La suspensi\u00f3n se aplicar\u00e1 inmediatamente.',
                            style: TextStyle(
                                color: _SN.amber, fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Submit button
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      onPressed: _selectedPlayer == null ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _SN.error,
                        foregroundColor: Colors.white,
                        disabledBackgroundColor:
                            _SN.error.withOpacity(0.3),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: Text(
                        'CREAR SUSPENSI\u00d3N',
                        style: GoogleFonts.bebasNeue(
                          fontSize: 16,
                          letterSpacing: 1.5,
                        ),
                      ),
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

  Widget _buildPlayerSelector() {
    if (_loadingPlayers) {
      return Container(
        height: 56,
        decoration: BoxDecoration(
          color: _SN.backgroundDark,
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Center(
          child: SizedBox(
            width: 24,
            height: 24,
            child: CircularProgressIndicator(
                color: _SN.gold, strokeWidth: 2),
          ),
        ),
      );
    }

    if (_errorMessage != null) {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: _SN.error.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(_errorMessage!,
            style: const TextStyle(color: _SN.error, fontSize: 12)),
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: _SN.backgroundDark,
        borderRadius: BorderRadius.circular(12),
      ),
      child: DropdownButtonFormField<String>(
        value: _selectedPlayer?['id'] as String?,
        hint: const Text('Seleccionar jugador...',
            style: TextStyle(color: _SN.textMuted)),
        dropdownColor: _SN.cardDark,
        decoration: InputDecoration(
          filled: true,
          fillColor: _SN.backgroundDark,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        ),
        isExpanded: true,
        items: _players.map((player) {
          final name = player['name'] as String;
          final jersey = player['jersey_number'] as int?;
          final teamName = player['team_name'] as String;
          return DropdownMenuItem(
            value: player['id'] as String,
            child: Text(
              jersey != null
                  ? '#$jersey $name ($teamName)'
                  : '$name ($teamName)',
              style: const TextStyle(color: _SN.textPrimary, fontSize: 14),
              overflow: TextOverflow.ellipsis,
            ),
          );
        }).toList(),
        onChanged: (value) {
          setState(() {
            _selectedPlayer =
                _players.firstWhere((p) => p['id'] == value);
          });
        },
      ),
    );
  }

  Widget _buildTypeSelector() {
    final types = [
      ('red_card', 'Tarjeta Roja', Icons.square, _SN.error),
      ('yellow_accumulation', 'Acumulaci\u00f3n', Icons.square, _SN.amber),
      ('disciplinary_committee', 'Comit\u00e9', Icons.gavel, _SN.neonBlue),
      ('other', 'Otro', Icons.info_outline, _SN.textMuted),
    ];

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: types.map((t) {
        final isSelected = _suspensionType == t.$1;
        return ChoiceChip(
          selected: isSelected,
          label: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(t.$3, size: 14, color: isSelected ? Colors.black : t.$4),
              const SizedBox(width: 4),
              Text(t.$2),
            ],
          ),
          labelStyle: TextStyle(
            color: isSelected ? Colors.black : _SN.textSecondary,
            fontSize: 12,
          ),
          backgroundColor: _SN.backgroundDark,
          selectedColor: t.$4,
          side: BorderSide(
            color: isSelected ? t.$4 : _SN.textMuted.withOpacity(0.3),
          ),
          onSelected: (selected) {
            if (selected) {
              setState(() => _suspensionType = t.$1);
            }
          },
        );
      }).toList(),
    );
  }

  void _submit() {
    if (_selectedPlayer == null) return;

    final matches = int.tryParse(_matchesCtrl.text);
    if (matches == null || matches <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Ingresa un n\u00famero v\u00e1lido de partidos'),
          backgroundColor: _SN.error,
          behavior: SnackBarBehavior.floating,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
      return;
    }

    widget.suspensionBloc.add(CreateSuspensionEvent(
      playerId: _selectedPlayer!['id'] as String,
      teamId: _selectedPlayer!['team_id'] as String,
      leagueId: widget.leagueId,
      suspensionType: _suspensionType,
      reason: _reasonCtrl.text.trim().isEmpty ? null : _reasonCtrl.text.trim(),
      matchesToServe: matches,
    ));

    Navigator.pop(context);
  }
}
