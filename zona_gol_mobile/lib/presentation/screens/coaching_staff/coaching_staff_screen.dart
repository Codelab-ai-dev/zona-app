import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import '../../../core/di/injection.dart';
import '../../../domain/entities/coaching_staff_entity.dart';
import '../../bloc/coaching_staff/coaching_staff_bloc.dart';
import '../../bloc/coaching_staff/coaching_staff_event.dart';
import '../../bloc/coaching_staff/coaching_staff_state.dart';

/// Stadium Nights palette
class _SN {
  static const Color bg = Color(0xFF050508);
  static const Color surface = Color(0xFF0D1117);
  static const Color card = Color(0xFF161B22);
  static const Color gold = Color(0xFFFFD700);
  static const Color neonGreen = Color(0xFF00FF7F);
  static const Color neonBlue = Color(0xFF00BFFF);
  static const Color error = Color(0xFFEF4444);
  static const Color textPrimary = Color(0xFFFAFAFA);
  static const Color textSecondary = Color(0xFF9CA3AF);
  static const Color textMuted = Color(0xFF6B7280);
  static const Color divider = Color(0xFF1E2733);
}

/// Available coaching staff roles
const _roles = [
  {'key': 'director_tecnico', 'label': 'Director T\u00e9cnico'},
  {'key': 'asistente_tecnico', 'label': 'Asistente T\u00e9cnico'},
  {'key': 'preparador_fisico', 'label': 'Preparador F\u00edsico'},
  {'key': 'fisioterapeuta', 'label': 'Fisioterapeuta'},
  {'key': 'medico', 'label': 'M\u00e9dico'},
  {'key': 'kinesiologo', 'label': 'Kinesi\u00f3logo'},
  {'key': 'utilero', 'label': 'Utilero'},
  {'key': 'manager', 'label': 'Manager'},
];

/// Coaching Staff Management Screen
class CoachingStaffScreen extends StatelessWidget {
  final String teamId;
  final String teamName;
  final bool canEdit;

  const CoachingStaffScreen({
    super.key,
    required this.teamId,
    required this.teamName,
    this.canEdit = true,
  });

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => sl<CoachingStaffBloc>()
        ..add(LoadStaffByTeamEvent(teamId: teamId)),
      child: _CoachingStaffView(
        teamId: teamId,
        teamName: teamName,
        canEdit: canEdit,
      ),
    );
  }
}

class _CoachingStaffView extends StatelessWidget {
  final String teamId;
  final String teamName;
  final bool canEdit;

  const _CoachingStaffView({
    required this.teamId,
    required this.teamName,
    required this.canEdit,
  });

  @override
  Widget build(BuildContext context) {
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light,
      ),
    );

    return Scaffold(
      backgroundColor: _SN.bg,
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(context),
            Expanded(
              child: BlocConsumer<CoachingStaffBloc, CoachingStaffState>(
                listener: (context, state) {
                  if (state is CoachingStaffCreated) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                            '${state.member.name} agregado al cuerpo t\u00e9cnico'),
                        backgroundColor: _SN.neonGreen.withValues(alpha: 0.8),
                      ),
                    );
                  } else if (state is CoachingStaffUpdated) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('${state.member.name} actualizado'),
                        backgroundColor: _SN.neonBlue.withValues(alpha: 0.8),
                      ),
                    );
                  } else if (state is CoachingStaffDeleted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Miembro eliminado'),
                        backgroundColor: Color(0xFFEF4444),
                      ),
                    );
                  } else if (state is CoachingStaffError) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(state.message),
                        backgroundColor: _SN.error,
                      ),
                    );
                  }
                },
                builder: (context, state) {
                  if (state is CoachingStaffLoading) {
                    return const Center(
                      child:
                          CircularProgressIndicator(color: _SN.gold),
                    );
                  }

                  if (state is CoachingStaffLoaded) {
                    if (state.staff.isEmpty) {
                      return _buildEmptyState(context);
                    }
                    return _buildStaffList(context, state.staff);
                  }

                  if (state is CoachingStaffError) {
                    return _buildErrorState(context, state.message);
                  }

                  return const SizedBox.shrink();
                },
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: canEdit
          ? FloatingActionButton(
              onPressed: () => _showCreateSheet(context),
              backgroundColor: _SN.neonGreen,
              child: const Icon(Icons.person_add, color: Colors.black),
            )
          : null,
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(8, 8, 16, 16),
      decoration: BoxDecoration(
        color: _SN.surface,
        border: Border(bottom: BorderSide(color: _SN.divider)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back, color: _SN.textPrimary),
                onPressed: () => Navigator.pop(context),
              ),
              const SizedBox(width: 4),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'CUERPO T\u00c9CNICO',
                      style: GoogleFonts.bebasNeue(
                        color: _SN.gold,
                        fontSize: 22,
                        letterSpacing: 2,
                      ),
                    ),
                    Text(
                      teamName,
                      style: const TextStyle(
                          color: _SN.textSecondary, fontSize: 13),
                    ),
                  ],
                ),
              ),
              BlocBuilder<CoachingStaffBloc, CoachingStaffState>(
                builder: (context, state) {
                  if (state is CoachingStaffLoaded) {
                    return Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: _SN.neonGreen.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                            color: _SN.neonGreen.withValues(alpha: 0.3)),
                      ),
                      child: Text(
                        '${state.activeCount} activos',
                        style: const TextStyle(
                            color: _SN.neonGreen, fontSize: 12),
                      ),
                    );
                  }
                  return const SizedBox.shrink();
                },
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStaffList(
      BuildContext context, List<CoachingStaffEntity> staff) {
    return RefreshIndicator(
      color: _SN.gold,
      backgroundColor: _SN.surface,
      onRefresh: () async {
        context
            .read<CoachingStaffBloc>()
            .add(LoadStaffByTeamEvent(teamId: teamId));
      },
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: staff.length,
        itemBuilder: (context, index) {
          return _buildStaffCard(context, staff[index]);
        },
      ),
    );
  }

  Widget _buildStaffCard(BuildContext context, CoachingStaffEntity member) {
    final roleColor = _getRoleColor(member.role);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: _SN.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: member.isActive
              ? _SN.divider
              : _SN.error.withValues(alpha: 0.3),
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: canEdit ? () => _showEditSheet(context, member) : null,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                // Avatar
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      colors: [
                        roleColor.withValues(alpha: 0.3),
                        roleColor.withValues(alpha: 0.1),
                      ],
                    ),
                    border: Border.all(
                        color: roleColor.withValues(alpha: 0.5), width: 1.5),
                  ),
                  child: Center(
                    child: Text(
                      member.initials,
                      style: GoogleFonts.bebasNeue(
                        color: roleColor,
                        fontSize: 20,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                // Info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              member.name,
                              style: const TextStyle(
                                color: _SN.textPrimary,
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          if (!member.isActive)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: _SN.error.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Text(
                                'Inactivo',
                                style: TextStyle(
                                    color: _SN.error, fontSize: 10),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: roleColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          member.roleDisplay,
                          style: TextStyle(
                              color: roleColor, fontSize: 11),
                        ),
                      ),
                      if (member.hasCedula) ...[
                        const SizedBox(height: 4),
                        Text(
                          'C\u00e9dula: ${member.cedula}',
                          style: const TextStyle(
                              color: _SN.textMuted, fontSize: 11),
                        ),
                      ],
                    ],
                  ),
                ),
                if (canEdit)
                  const Icon(Icons.chevron_right,
                      color: _SN.textMuted, size: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.groups_3,
                color: _SN.textMuted.withValues(alpha: 0.5), size: 64),
            const SizedBox(height: 16),
            Text(
              'Sin cuerpo t\u00e9cnico',
              style: GoogleFonts.bebasNeue(
                color: _SN.textSecondary,
                fontSize: 22,
                letterSpacing: 1,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Agrega directores t\u00e9cnicos, asistentes\ny preparadores f\u00edsicos de tu equipo',
              style: TextStyle(color: _SN.textMuted, fontSize: 13),
              textAlign: TextAlign.center,
            ),
            if (canEdit) ...[
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: () => _showCreateSheet(context),
                icon: const Icon(Icons.person_add, size: 20),
                label: const Text('Agregar miembro'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _SN.neonGreen,
                  foregroundColor: Colors.black,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildErrorState(BuildContext context, String message) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, color: _SN.error, size: 48),
            const SizedBox(height: 16),
            Text(
              message,
              style: const TextStyle(color: _SN.textSecondary, fontSize: 14),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            TextButton.icon(
              onPressed: () => context
                  .read<CoachingStaffBloc>()
                  .add(LoadStaffByTeamEvent(teamId: teamId)),
              icon: const Icon(Icons.refresh, size: 18),
              label: const Text('Reintentar'),
              style: TextButton.styleFrom(foregroundColor: _SN.gold),
            ),
          ],
        ),
      ),
    );
  }

  // ==================== Create / Edit Sheet ====================

  void _showCreateSheet(BuildContext context) {
    final bloc = context.read<CoachingStaffBloc>();
    _showStaffFormSheet(context, bloc: bloc, teamId: teamId);
  }

  void _showEditSheet(BuildContext context, CoachingStaffEntity member) {
    final bloc = context.read<CoachingStaffBloc>();
    _showStaffFormSheet(context, bloc: bloc, teamId: teamId, member: member);
  }

  Color _getRoleColor(String role) {
    switch (role) {
      case 'director_tecnico':
      case 'head_coach':
        return _SN.gold;
      case 'asistente_tecnico':
      case 'assistant_coach':
        return _SN.neonBlue;
      case 'preparador_fisico':
      case 'trainer':
        return _SN.neonGreen;
      case 'medico':
      case 'doctor':
      case 'fisioterapeuta':
      case 'physiotherapist':
      case 'kinesiologo':
        return const Color(0xFFA78BFA);
      default:
        return _SN.textSecondary;
    }
  }
}

// ==================== Form Bottom Sheet ====================

void _showStaffFormSheet(
  BuildContext context, {
  required CoachingStaffBloc bloc,
  required String teamId,
  CoachingStaffEntity? member,
}) {
  final isEditing = member != null;
  final nameCtrl = TextEditingController(text: member?.name ?? '');
  final cedulaCtrl = TextEditingController(text: member?.cedula ?? '');
  String selectedRole = member?.role ?? _roles.first['key']!;
  DateTime? birthDate = member?.birthDate;

  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (sheetContext) {
      return StatefulBuilder(
        builder: (ctx, setSheetState) {
          return Container(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(ctx).size.height * 0.85,
            ),
            decoration: const BoxDecoration(
              color: _SN.surface,
              borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
            ),
            child: Padding(
              padding: EdgeInsets.fromLTRB(
                  20, 16, 20, MediaQuery.of(ctx).viewInsets.bottom + 20),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Handle
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: _SN.textMuted,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Title
                    Text(
                      isEditing
                          ? 'EDITAR MIEMBRO'
                          : 'AGREGAR MIEMBRO',
                      style: GoogleFonts.bebasNeue(
                        color: _SN.gold,
                        fontSize: 22,
                        letterSpacing: 1.5,
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Name
                    _buildTextField(
                      controller: nameCtrl,
                      label: 'Nombre completo',
                      icon: Icons.person,
                    ),
                    const SizedBox(height: 16),

                    // Role selector
                    const Text('Rol',
                        style: TextStyle(color: _SN.textSecondary, fontSize: 12)),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: _roles.map((r) {
                        final isSelected = selectedRole == r['key'];
                        return GestureDetector(
                          onTap: () {
                            setSheetState(() => selectedRole = r['key']!);
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? _SN.gold.withValues(alpha: 0.15)
                                  : _SN.card,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: isSelected
                                    ? _SN.gold
                                    : _SN.divider,
                              ),
                            ),
                            child: Text(
                              r['label']!,
                              style: TextStyle(
                                color: isSelected ? _SN.gold : _SN.textSecondary,
                                fontSize: 13,
                                fontWeight: isSelected
                                    ? FontWeight.w600
                                    : FontWeight.normal,
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 16),

                    // Cedula
                    _buildTextField(
                      controller: cedulaCtrl,
                      label: 'C\u00e9dula (opcional)',
                      icon: Icons.badge,
                    ),
                    const SizedBox(height: 16),

                    // Birth date
                    const Text('Fecha de nacimiento (opcional)',
                        style: TextStyle(color: _SN.textSecondary, fontSize: 12)),
                    const SizedBox(height: 8),
                    GestureDetector(
                      onTap: () async {
                        final picked = await showDatePicker(
                          context: ctx,
                          initialDate: birthDate ?? DateTime(1985),
                          firstDate: DateTime(1940),
                          lastDate: DateTime.now(),
                          builder: (ctx, child) {
                            return Theme(
                              data: ThemeData.dark().copyWith(
                                colorScheme: const ColorScheme.dark(
                                  primary: _SN.gold,
                                  surface: _SN.surface,
                                ),
                              ),
                              child: child!,
                            );
                          },
                        );
                        if (picked != null) {
                          setSheetState(() => birthDate = picked);
                        }
                      },
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 14),
                        decoration: BoxDecoration(
                          color: _SN.card,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: _SN.divider),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.calendar_today,
                                color: _SN.textMuted, size: 18),
                            const SizedBox(width: 10),
                            Text(
                              birthDate != null
                                  ? DateFormat('dd/MM/yyyy').format(birthDate!)
                                  : 'Seleccionar fecha',
                              style: TextStyle(
                                color: birthDate != null
                                    ? _SN.textPrimary
                                    : _SN.textMuted,
                                fontSize: 14,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Buttons
                    Row(
                      children: [
                        // Delete button (only when editing)
                        if (isEditing)
                          Expanded(
                            child: SizedBox(
                              height: 50,
                              child: OutlinedButton.icon(
                                onPressed: () {
                                  Navigator.pop(ctx);
                                  _showDeleteConfirmation(
                                      context, bloc, member);
                                },
                                icon: const Icon(Icons.delete_outline,
                                    size: 18),
                                label: const Text('Eliminar'),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: _SN.error,
                                  side: BorderSide(
                                      color: _SN.error.withValues(alpha: 0.5)),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        if (isEditing) const SizedBox(width: 12),

                        // Save button
                        Expanded(
                          child: SizedBox(
                            height: 50,
                            child: ElevatedButton.icon(
                              onPressed: () {
                                final name = nameCtrl.text.trim();
                                if (name.isEmpty) return;

                                if (isEditing) {
                                  bloc.add(UpdateStaffEvent(
                                    staffId: member.id,
                                    name: name,
                                    role: selectedRole,
                                    cedula: cedulaCtrl.text.trim().isNotEmpty
                                        ? cedulaCtrl.text.trim()
                                        : null,
                                    birthDate: birthDate,
                                  ));
                                } else {
                                  bloc.add(CreateStaffEvent(
                                    name: name,
                                    teamId: teamId,
                                    role: selectedRole,
                                    cedula: cedulaCtrl.text.trim().isNotEmpty
                                        ? cedulaCtrl.text.trim()
                                        : null,
                                    birthDate: birthDate,
                                  ));
                                }
                                Navigator.pop(ctx);
                              },
                              icon: Icon(
                                  isEditing ? Icons.save : Icons.person_add,
                                  size: 18),
                              label: Text(isEditing ? 'Guardar' : 'Agregar'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: _SN.neonGreen,
                                foregroundColor: Colors.black,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),

                    // Toggle active (only when editing)
                    if (isEditing) ...[
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        height: 44,
                        child: TextButton(
                          onPressed: () {
                            bloc.add(UpdateStaffEvent(
                              staffId: member.id,
                              isActive: !member.isActive,
                            ));
                            Navigator.pop(ctx);
                          },
                          style: TextButton.styleFrom(
                            foregroundColor: member.isActive
                                ? _SN.error
                                : _SN.neonGreen,
                          ),
                          child: Text(
                            member.isActive
                                ? 'Desactivar miembro'
                                : 'Reactivar miembro',
                          ),
                        ),
                      ),
                    ],
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

Widget _buildTextField({
  required TextEditingController controller,
  required String label,
  required IconData icon,
}) {
  return TextField(
    controller: controller,
    style: const TextStyle(color: _SN.textPrimary, fontSize: 14),
    decoration: InputDecoration(
      labelText: label,
      labelStyle: const TextStyle(color: _SN.textMuted, fontSize: 13),
      prefixIcon: Icon(icon, color: _SN.textMuted, size: 20),
      filled: true,
      fillColor: _SN.card,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: _SN.divider),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: _SN.divider),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: _SN.gold),
      ),
    ),
  );
}

void _showDeleteConfirmation(
  BuildContext context,
  CoachingStaffBloc bloc,
  CoachingStaffEntity member,
) {
  showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      backgroundColor: _SN.surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: const Text('Eliminar miembro',
          style: TextStyle(color: _SN.textPrimary)),
      content: Text(
        '\u00bfEliminar a ${member.name} del cuerpo t\u00e9cnico?',
        style: const TextStyle(color: _SN.textSecondary),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(ctx),
          child: const Text('Cancelar',
              style: TextStyle(color: _SN.textMuted)),
        ),
        TextButton(
          onPressed: () {
            Navigator.pop(ctx);
            bloc.add(DeleteStaffEvent(staffId: member.id));
          },
          style: TextButton.styleFrom(foregroundColor: _SN.error),
          child: const Text('Eliminar'),
        ),
      ],
    ),
  );
}
