import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/di/injection.dart';
import '../../../core/utils/feature_gate.dart';
import '../../../domain/entities/user_entity.dart';
import '../../../domain/entities/whatsapp_link_entity.dart';
import '../../bloc/whatsapp/whatsapp_bloc.dart';
import '../../bloc/whatsapp/whatsapp_event.dart';
import '../../bloc/whatsapp/whatsapp_state.dart';

/// Stadium Nights Design System
class _StadiumNights {
  static const Color backgroundDark = Color(0xFF050508);
  static const Color surfaceDark = Color(0xFF0A0A0F);
  static const Color cardDark = Color(0xFF12121A);
  static const Color gold = Color(0xFFFFD700);
  static const Color neonGreen = Color(0xFF00FF7F);
  static const Color error = Color(0xFFEF4444);
  static const Color textPrimary = Color(0xFFFAFAFA);
  static const Color textSecondary = Color(0xFF9CA3AF);
  static const Color textMuted = Color(0xFF6B7280);
  static const Color whatsappGreen = Color(0xFF25D366);
}

/// WhatsApp Management Screen
/// Manages WhatsApp user links for a league
class WhatsAppManagementScreen extends StatelessWidget {
  final UserEntity user;

  const WhatsAppManagementScreen({
    super.key,
    required this.user,
  });

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => sl<WhatsAppBloc>(),
      child: _WhatsAppManagementView(user: user),
    );
  }
}

class _WhatsAppManagementView extends StatefulWidget {
  final UserEntity user;

  const _WhatsAppManagementView({required this.user});

  @override
  State<_WhatsAppManagementView> createState() =>
      _WhatsAppManagementViewState();
}

class _WhatsAppManagementViewState extends State<_WhatsAppManagementView> {
  bool _featureEnabled = false;
  bool _featureLoading = true;

  String get _leagueId => widget.user.leagueId ?? '';

  @override
  void initState() {
    super.initState();
    _checkFeatureAndLoad();
  }

  Future<void> _checkFeatureAndLoad() async {
    if (_leagueId.isEmpty) {
      setState(() {
        _featureLoading = false;
        _featureEnabled = false;
      });
      return;
    }

    final hasFeature = await FeatureGate.hasFeature(_leagueId, 'whatsapp');
    if (mounted) {
      setState(() {
        _featureEnabled = hasFeature;
        _featureLoading = false;
      });

      if (hasFeature) {
        context.read<WhatsAppBloc>().add(
              LoadWhatsAppLinks(leagueId: _leagueId),
            );
      }
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
        appBar: _buildAppBar(context),
        body: _buildBody(context),
        floatingActionButton: _featureEnabled
            ? FloatingActionButton(
                onPressed: () => _showCreateEditDialog(context),
                backgroundColor: _StadiumNights.whatsappGreen,
                child: const Icon(Icons.add, color: Colors.white),
              )
            : null,
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(BuildContext context) {
    return AppBar(
      backgroundColor: _StadiumNights.surfaceDark,
      foregroundColor: _StadiumNights.textPrimary,
      elevation: 0,
      leading: IconButton(
        icon: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.3),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
                color: _StadiumNights.gold.withOpacity(0.2)),
          ),
          child: const Icon(Icons.arrow_back,
              color: _StadiumNights.gold, size: 18),
        ),
        onPressed: () => Navigator.pop(context),
      ),
      title: Column(
        children: [
          Text(
            'WHATSAPP',
            style: GoogleFonts.bebasNeue(
              fontSize: 22,
              color: _StadiumNights.textPrimary,
              letterSpacing: 2,
            ),
          ),
          Text(
            'Gestión de Enlaces',
            style: GoogleFonts.outfit(
              fontSize: 12,
              color: _StadiumNights.textSecondary,
            ),
          ),
        ],
      ),
      centerTitle: true,
      actions: [
        if (_featureEnabled)
          IconButton(
            icon:
                const Icon(Icons.refresh, color: _StadiumNights.gold),
            onPressed: () {
              context.read<WhatsAppBloc>().add(
                    LoadWhatsAppLinks(leagueId: _leagueId),
                  );
            },
          ),
      ],
    );
  }

  Widget _buildBody(BuildContext context) {
    if (_featureLoading) {
      return _buildLoadingState();
    }

    if (!_featureEnabled) {
      return _buildFeatureDisabledState();
    }

    return BlocConsumer<WhatsAppBloc, WhatsAppState>(
      listener: (context, state) {
        if (state is WhatsAppLinkCreated ||
            state is WhatsAppLinkUpdated ||
            state is WhatsAppLinkDeleted ||
            state is WhatsAppLinkToggled) {
          // Reload after mutation
          context.read<WhatsAppBloc>().add(
                LoadWhatsAppLinks(leagueId: _leagueId),
              );

          String message = '';
          if (state is WhatsAppLinkCreated) {
            message = 'Enlace creado exitosamente';
          } else if (state is WhatsAppLinkUpdated) {
            message = 'Enlace actualizado exitosamente';
          } else if (state is WhatsAppLinkDeleted) {
            message = 'Enlace eliminado exitosamente';
          } else if (state is WhatsAppLinkToggled) {
            final toggled = state.link;
            message = toggled.isActive
                ? 'Enlace activado'
                : 'Enlace desactivado';
          }

          if (message.isNotEmpty) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  message,
                  style: GoogleFonts.outfit(color: Colors.white),
                ),
                backgroundColor: _StadiumNights.neonGreen.withOpacity(0.8),
                behavior: SnackBarBehavior.floating,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            );
          }
        }

        if (state is WhatsAppError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                state.message,
                style: GoogleFonts.outfit(color: Colors.white),
              ),
              backgroundColor: _StadiumNights.error,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
          );
        }
      },
      builder: (context, state) {
        if (state is WhatsAppLoading) {
          return _buildLoadingState();
        }
        if (state is WhatsAppError) {
          return _buildErrorState(context, state.message);
        }
        if (state is WhatsAppLinksLoaded) {
          if (state.links.isEmpty) {
            return _buildEmptyState(context);
          }
          return _buildLinksContent(context, state.links);
        }
        return _buildLoadingState();
      },
    );
  }

  Widget _buildLoadingState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const SizedBox(
            width: 50,
            height: 50,
            child: CircularProgressIndicator(
              strokeWidth: 3,
              valueColor:
                  AlwaysStoppedAnimation<Color>(_StadiumNights.gold),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'CARGANDO ENLACES',
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

  Widget _buildFeatureDisabledState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: _StadiumNights.textMuted.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.lock_outline,
                size: 50,
                color: _StadiumNights.textMuted,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'FUNCIÓN NO DISPONIBLE',
              style: GoogleFonts.bebasNeue(
                fontSize: 24,
                color: _StadiumNights.textPrimary,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'La integración de WhatsApp no está habilitada para esta liga. '
              'Contacta al administrador para activarla.',
              textAlign: TextAlign.center,
              style: GoogleFonts.outfit(
                fontSize: 14,
                color: _StadiumNights.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: _StadiumNights.whatsappGreen.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.chat_outlined,
                size: 50,
                color: _StadiumNights.whatsappGreen,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'SIN ENLACES',
              style: GoogleFonts.bebasNeue(
                fontSize: 24,
                color: _StadiumNights.textPrimary,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Aún no hay enlaces de WhatsApp configurados para esta liga.',
              textAlign: TextAlign.center,
              style: GoogleFonts.outfit(
                fontSize: 14,
                color: _StadiumNights.textSecondary,
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => _showCreateEditDialog(context),
              icon: const Icon(Icons.add, size: 18),
              label: const Text('Agregar Enlace'),
              style: ElevatedButton.styleFrom(
                backgroundColor: _StadiumNights.whatsappGreen,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(
                    horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorState(BuildContext context, String message) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 70,
              height: 70,
              decoration: BoxDecoration(
                color: _StadiumNights.error.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.error_outline,
                size: 36,
                color: _StadiumNights.error,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'ERROR',
              style: GoogleFonts.bebasNeue(
                fontSize: 24,
                color: _StadiumNights.textPrimary,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: GoogleFonts.outfit(
                fontSize: 14,
                color: _StadiumNights.textSecondary,
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () {
                context.read<WhatsAppBloc>().add(
                      LoadWhatsAppLinks(leagueId: _leagueId),
                    );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: _StadiumNights.gold,
                foregroundColor: Colors.black,
              ),
              child: const Text('Reintentar'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLinksContent(
      BuildContext context, List<WhatsAppLinkEntity> links) {
    final activeCount = links.where((l) => l.isActive).length;
    final inactiveCount = links.length - activeCount;

    return Column(
      children: [
        // Stats row
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: Row(
            children: [
              _buildStatCard('Total', links.length.toString(),
                  _StadiumNights.gold),
              const SizedBox(width: 8),
              _buildStatCard('Activos', activeCount.toString(),
                  _StadiumNights.neonGreen),
              const SizedBox(width: 8),
              _buildStatCard('Inactivos', inactiveCount.toString(),
                  _StadiumNights.error),
            ],
          ),
        ),

        // Links list
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 80),
            itemCount: links.length,
            itemBuilder: (context, index) {
              return _buildLinkCard(context, links[index]);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildStatCard(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
        decoration: BoxDecoration(
          color: _StadiumNights.cardDark,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Column(
          children: [
            Text(
              value,
              style: GoogleFonts.bebasNeue(
                fontSize: 24,
                color: color,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: GoogleFonts.outfit(
                fontSize: 11,
                color: _StadiumNights.textMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLinkCard(BuildContext context, WhatsAppLinkEntity link) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: _StadiumNights.cardDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: link.isActive
              ? _StadiumNights.whatsappGreen.withOpacity(0.15)
              : _StadiumNights.error.withOpacity(0.15),
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () => _showCreateEditDialog(context, link: link),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                // Avatar
                _buildAvatar(link),
                const SizedBox(width: 12),
                // Info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Phone number
                      Text(
                        link.formattedPhone,
                        style: GoogleFonts.outfit(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: link.isActive
                              ? _StadiumNights.textPrimary
                              : _StadiumNights.textMuted,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          // Display name
                          if (link.hasDisplayName) ...[
                            Flexible(
                              child: Text(
                                link.displayName!,
                                style: GoogleFonts.outfit(
                                  fontSize: 12,
                                  color: _StadiumNights.textSecondary,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(width: 8),
                          ],
                          // Role badge
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: _getRoleColor(link.role)
                                  .withOpacity(0.1),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              link.roleDisplay,
                              style: GoogleFonts.outfit(
                                fontSize: 10,
                                color: _getRoleColor(link.role),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                // Active toggle
                Switch(
                  value: link.isActive,
                  onChanged: (value) {
                    context.read<WhatsAppBloc>().add(
                          ToggleWhatsAppLink(
                            id: link.id,
                            isActive: value,
                          ),
                        );
                  },
                  activeColor: _StadiumNights.whatsappGreen,
                  inactiveThumbColor: _StadiumNights.textMuted,
                  inactiveTrackColor:
                      _StadiumNights.textMuted.withOpacity(0.3),
                ),
                // Delete button
                IconButton(
                  icon: const Icon(Icons.delete_outline,
                      color: _StadiumNights.error, size: 20),
                  onPressed: () =>
                      _showDeleteConfirmation(context, link),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(
                    minWidth: 36,
                    minHeight: 36,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildAvatar(WhatsAppLinkEntity link) {
    final color = link.isActive
        ? _StadiumNights.whatsappGreen
        : _StadiumNights.textMuted;

    return Container(
      width: 48,
      height: 48,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: link.isActive
              ? [
                  _StadiumNights.whatsappGreen.withOpacity(0.2),
                  _StadiumNights.neonGreen.withOpacity(0.1),
                ]
              : [
                  _StadiumNights.textMuted.withOpacity(0.2),
                  _StadiumNights.textMuted.withOpacity(0.1),
                ],
        ),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Center(
        child: link.hasDisplayName
            ? Text(
                link.initials,
                style: GoogleFonts.bebasNeue(
                  fontSize: 18,
                  color: color,
                ),
              )
            : Icon(
                Icons.chat,
                color: color,
                size: 22,
              ),
      ),
    );
  }

  Color _getRoleColor(String? role) {
    switch (role) {
      case 'super_admin':
        return _StadiumNights.gold;
      case 'league_admin':
        return _StadiumNights.neonGreen;
      case 'team_owner':
        return const Color(0xFF60A5FA);
      case 'public':
        return _StadiumNights.textSecondary;
      default:
        return _StadiumNights.textMuted;
    }
  }

  void _showCreateEditDialog(BuildContext context,
      {WhatsAppLinkEntity? link}) {
    final isEdit = link != null;
    final phoneController = TextEditingController(
      text: isEdit
          ? (link.phoneNumber.startsWith('+52')
              ? link.phoneNumber.substring(3)
              : link.phoneNumber)
          : '',
    );
    final nameController =
        TextEditingController(text: link?.displayName ?? '');
    String selectedRole = link?.role ?? 'public';

    final bloc = context.read<WhatsAppBloc>();

    showDialog(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (dialogContext, setDialogState) {
            return Dialog(
              backgroundColor: _StadiumNights.surfaceDark,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: BorderSide(
                    color: _StadiumNights.gold.withOpacity(0.2)),
              ),
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Title
                      Text(
                        isEdit ? 'EDITAR ENLACE' : 'NUEVO ENLACE',
                        style: GoogleFonts.bebasNeue(
                          fontSize: 22,
                          color: _StadiumNights.gold,
                          letterSpacing: 2,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 24),

                      // Phone number field
                      Text(
                        'Número de teléfono',
                        style: GoogleFonts.outfit(
                          fontSize: 13,
                          color: _StadiumNights.textSecondary,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Container(
                        decoration: BoxDecoration(
                          color: _StadiumNights.cardDark,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                              color: _StadiumNights.gold
                                  .withOpacity(0.15)),
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 14),
                              decoration: BoxDecoration(
                                border: Border(
                                  right: BorderSide(
                                    color: _StadiumNights.gold
                                        .withOpacity(0.15),
                                  ),
                                ),
                              ),
                              child: Text(
                                '+52',
                                style: GoogleFonts.outfit(
                                  fontSize: 14,
                                  color: _StadiumNights.gold,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                            Expanded(
                              child: TextField(
                                controller: phoneController,
                                style: GoogleFonts.outfit(
                                    color:
                                        _StadiumNights.textPrimary),
                                keyboardType: TextInputType.phone,
                                inputFormatters: [
                                  FilteringTextInputFormatter
                                      .digitsOnly,
                                  LengthLimitingTextInputFormatter(
                                      10),
                                ],
                                decoration: InputDecoration(
                                  hintText: '1234567890',
                                  hintStyle: GoogleFonts.outfit(
                                      color:
                                          _StadiumNights.textMuted),
                                  border: InputBorder.none,
                                  contentPadding:
                                      const EdgeInsets.symmetric(
                                          horizontal: 12,
                                          vertical: 14),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Display name field
                      Text(
                        'Nombre para mostrar',
                        style: GoogleFonts.outfit(
                          fontSize: 13,
                          color: _StadiumNights.textSecondary,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Container(
                        decoration: BoxDecoration(
                          color: _StadiumNights.cardDark,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                              color: _StadiumNights.gold
                                  .withOpacity(0.15)),
                        ),
                        child: TextField(
                          controller: nameController,
                          style: GoogleFonts.outfit(
                              color: _StadiumNights.textPrimary),
                          decoration: InputDecoration(
                            hintText: 'Nombre del contacto',
                            hintStyle: GoogleFonts.outfit(
                                color: _StadiumNights.textMuted),
                            border: InputBorder.none,
                            contentPadding:
                                const EdgeInsets.symmetric(
                                    horizontal: 12, vertical: 14),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Role dropdown
                      Text(
                        'Rol',
                        style: GoogleFonts.outfit(
                          fontSize: 13,
                          color: _StadiumNights.textSecondary,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Container(
                        decoration: BoxDecoration(
                          color: _StadiumNights.cardDark,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                              color: _StadiumNights.gold
                                  .withOpacity(0.15)),
                        ),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: selectedRole,
                            isExpanded: true,
                            dropdownColor: _StadiumNights.cardDark,
                            style: GoogleFonts.outfit(
                              color: _StadiumNights.textPrimary,
                              fontSize: 14,
                            ),
                            icon: const Icon(Icons.expand_more,
                                color: _StadiumNights.gold),
                            items: const [
                              DropdownMenuItem(
                                value: 'league_admin',
                                child: Text('Admin Liga'),
                              ),
                              DropdownMenuItem(
                                value: 'team_owner',
                                child: Text('Dueño Equipo'),
                              ),
                              DropdownMenuItem(
                                value: 'public',
                                child: Text('Público'),
                              ),
                            ],
                            onChanged: (value) {
                              if (value != null) {
                                setDialogState(() {
                                  selectedRole = value;
                                });
                              }
                            },
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Action buttons
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () =>
                                  Navigator.pop(dialogContext),
                              style: OutlinedButton.styleFrom(
                                foregroundColor:
                                    _StadiumNights.textSecondary,
                                side: BorderSide(
                                    color: _StadiumNights.textMuted
                                        .withOpacity(0.3)),
                                padding:
                                    const EdgeInsets.symmetric(
                                        vertical: 14),
                                shape: RoundedRectangleBorder(
                                  borderRadius:
                                      BorderRadius.circular(10),
                                ),
                              ),
                              child: Text(
                                'Cancelar',
                                style: GoogleFonts.outfit(
                                    fontWeight: FontWeight.w500),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: ElevatedButton(
                              onPressed: () {
                                final phone = phoneController.text
                                    .trim();
                                if (phone.isEmpty ||
                                    phone.length < 10) {
                                  ScaffoldMessenger.of(
                                          dialogContext)
                                      .showSnackBar(
                                    SnackBar(
                                      content: Text(
                                        'Ingrese un número de 10 dígitos',
                                        style: GoogleFonts.outfit(),
                                      ),
                                      backgroundColor:
                                          _StadiumNights.error,
                                      behavior: SnackBarBehavior
                                          .floating,
                                    ),
                                  );
                                  return;
                                }

                                final fullPhone = '+52$phone';
                                final displayName =
                                    nameController.text.trim();

                                if (isEdit) {
                                  bloc.add(UpdateWhatsAppLink(
                                    id: link.id,
                                    phoneNumber: fullPhone,
                                    role: selectedRole,
                                    displayName:
                                        displayName.isNotEmpty
                                            ? displayName
                                            : null,
                                  ));
                                } else {
                                  bloc.add(CreateWhatsAppLink(
                                    phoneNumber: fullPhone,
                                    role: selectedRole,
                                    displayName:
                                        displayName.isNotEmpty
                                            ? displayName
                                            : null,
                                    leagueId: _leagueId,
                                  ));
                                }

                                Navigator.pop(dialogContext);
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor:
                                    _StadiumNights.whatsappGreen,
                                foregroundColor: Colors.white,
                                padding:
                                    const EdgeInsets.symmetric(
                                        vertical: 14),
                                shape: RoundedRectangleBorder(
                                  borderRadius:
                                      BorderRadius.circular(10),
                                ),
                              ),
                              child: Text(
                                isEdit ? 'Guardar' : 'Crear',
                                style: GoogleFonts.outfit(
                                  fontWeight: FontWeight.w600,
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

  void _showDeleteConfirmation(
      BuildContext context, WhatsAppLinkEntity link) {
    final bloc = context.read<WhatsAppBloc>();

    showDialog(
      context: context,
      builder: (dialogContext) {
        return Dialog(
          backgroundColor: _StadiumNights.surfaceDark,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(
                color: _StadiumNights.error.withOpacity(0.3)),
          ),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    color: _StadiumNights.error.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.delete_outline,
                    color: _StadiumNights.error,
                    size: 30,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'ELIMINAR ENLACE',
                  style: GoogleFonts.bebasNeue(
                    fontSize: 20,
                    color: _StadiumNights.error,
                    letterSpacing: 2,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Se eliminará el enlace de WhatsApp para:',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.outfit(
                    fontSize: 14,
                    color: _StadiumNights.textSecondary,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  link.formattedPhone,
                  style: GoogleFonts.outfit(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: _StadiumNights.textPrimary,
                  ),
                ),
                if (link.hasDisplayName) ...[
                  const SizedBox(height: 4),
                  Text(
                    link.displayName!,
                    style: GoogleFonts.outfit(
                      fontSize: 13,
                      color: _StadiumNights.textMuted,
                    ),
                  ),
                ],
                const SizedBox(height: 8),
                Text(
                  'Esta acción no se puede deshacer.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.outfit(
                    fontSize: 12,
                    color: _StadiumNights.error.withOpacity(0.8),
                    fontStyle: FontStyle.italic,
                  ),
                ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () =>
                            Navigator.pop(dialogContext),
                        style: OutlinedButton.styleFrom(
                          foregroundColor:
                              _StadiumNights.textSecondary,
                          side: BorderSide(
                              color: _StadiumNights.textMuted
                                  .withOpacity(0.3)),
                          padding: const EdgeInsets.symmetric(
                              vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius:
                                BorderRadius.circular(10),
                          ),
                        ),
                        child: Text(
                          'Cancelar',
                          style: GoogleFonts.outfit(
                              fontWeight: FontWeight.w500),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () {
                          bloc.add(
                              DeleteWhatsAppLink(id: link.id));
                          Navigator.pop(dialogContext);
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _StadiumNights.error,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(
                              vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius:
                                BorderRadius.circular(10),
                          ),
                        ),
                        child: Text(
                          'Eliminar',
                          style: GoogleFonts.outfit(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
