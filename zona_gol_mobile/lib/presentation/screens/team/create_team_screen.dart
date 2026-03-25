import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../bloc/team/team_bloc.dart';
import '../../bloc/team/team_event.dart';
import '../../bloc/team/team_state.dart';
import '../../widgets/team/team_credentials_dialog.dart';

/// Stadium Nights Design System
class _SN {
  static const Color backgroundDark = Color(0xFF050508);
  static const Color surfaceDark = Color(0xFF0A0A0F);
  static const Color cardDark = Color(0xFF12121A);
  static const Color gold = Color(0xFFFFD700);
  static const Color amber = Color(0xFFF59E0B);
  static const Color neonGreen = Color(0xFF00FF7F);
  static const Color error = Color(0xFFEF4444);
  static const Color textPrimary = Color(0xFFFAFAFA);
  static const Color textSecondary = Color(0xFF9CA3AF);
  static const Color textMuted = Color(0xFF6B7280);
}

/// Create Team Screen
/// Allows league admins to create a new team, optionally with a new owner account.
class CreateTeamScreen extends StatefulWidget {
  final String leagueId;

  const CreateTeamScreen({
    super.key,
    required this.leagueId,
  });

  @override
  State<CreateTeamScreen> createState() => _CreateTeamScreenState();
}

class _CreateTeamScreenState extends State<CreateTeamScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _slugController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _ownerEmailController = TextEditingController();
  final _ownerNameController = TextEditingController();
  final _existingOwnerIdController = TextEditingController();

  bool _createOwnerAccount = true;
  bool _isLoading = false;
  bool _slugManuallyEdited = false;

  @override
  void initState() {
    super.initState();
    _nameController.addListener(_autoGenerateSlug);
  }

  @override
  void dispose() {
    _nameController.removeListener(_autoGenerateSlug);
    _nameController.dispose();
    _slugController.dispose();
    _descriptionController.dispose();
    _ownerEmailController.dispose();
    _ownerNameController.dispose();
    _existingOwnerIdController.dispose();
    super.dispose();
  }

  void _autoGenerateSlug() {
    if (_slugManuallyEdited) return;
    final name = _nameController.text.trim();
    final slug = name
        .toLowerCase()
        .replaceAll(RegExp(r'[áàäâ]'), 'a')
        .replaceAll(RegExp(r'[éèëê]'), 'e')
        .replaceAll(RegExp(r'[íìïî]'), 'i')
        .replaceAll(RegExp(r'[óòöô]'), 'o')
        .replaceAll(RegExp(r'[úùüû]'), 'u')
        .replaceAll(RegExp(r'[ñ]'), 'n')
        .replaceAll(RegExp(r'[^a-z0-9\s-]'), '')
        .replaceAll(RegExp(r'\s+'), '-')
        .replaceAll(RegExp(r'-+'), '-')
        .replaceAll(RegExp(r'^-|-$'), '');
    _slugController.text = slug;
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<TeamBloc, TeamState>(
      listener: (context, state) {
        if (state is TeamCreatedWithOwner) {
          setState(() => _isLoading = false);
          TeamCredentialsDialog.show(
            context,
            email: state.ownerEmail,
            password: state.ownerPassword,
          ).then((_) {
            if (context.mounted) {
              Navigator.of(context).pop(true);
            }
          });
        } else if (state is TeamCreated) {
          setState(() => _isLoading = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'Equipo "${state.team.name}" creado exitosamente',
                style: GoogleFonts.outfit(fontSize: 13),
              ),
              backgroundColor: _SN.neonGreen.withOpacity(0.9),
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
          );
          Navigator.of(context).pop(true);
        } else if (state is TeamError) {
          setState(() => _isLoading = false);
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
        } else if (state is TeamLoading) {
          setState(() => _isLoading = true);
        }
      },
      child: Scaffold(
        backgroundColor: _SN.backgroundDark,
        appBar: _buildAppBar(),
        body: _buildForm(),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      backgroundColor: _SN.surfaceDark,
      foregroundColor: _SN.textPrimary,
      elevation: 0,
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
      title: Text(
        'CREAR EQUIPO',
        style: GoogleFonts.bebasNeue(
          fontSize: 22,
          color: _SN.textPrimary,
          letterSpacing: 2,
        ),
      ),
      centerTitle: true,
    );
  }

  Widget _buildForm() {
    return Form(
      key: _formKey,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // Team Icon
          Center(
            child: Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: _SN.gold.withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: _SN.gold.withOpacity(0.3),
                ),
              ),
              child: const Icon(
                Icons.groups,
                size: 40,
                color: _SN.gold,
              ),
            ),
          ),
          const SizedBox(height: 32),

          // Team Info Section
          _buildSectionTitle('INFORMACION DEL EQUIPO'),
          const SizedBox(height: 12),
          _buildTextField(
            controller: _nameController,
            label: 'Nombre del Equipo',
            hint: 'Ej: Deportivo FC',
            icon: Icons.shield,
            validator: (value) {
              if (value == null || value.trim().isEmpty) {
                return 'El nombre es requerido';
              }
              if (value.trim().length < 2) {
                return 'Minimo 2 caracteres';
              }
              return null;
            },
          ),
          const SizedBox(height: 14),
          _buildTextField(
            controller: _slugController,
            label: 'Slug del Equipo',
            hint: 'deportivo-fc',
            icon: Icons.link,
            onChanged: (_) {
              _slugManuallyEdited = true;
            },
            validator: (value) {
              if (value == null || value.trim().isEmpty) {
                return 'El slug es requerido';
              }
              if (!RegExp(r'^[a-z0-9-]+$').hasMatch(value.trim())) {
                return 'Solo letras minusculas, numeros y guiones';
              }
              return null;
            },
          ),
          const SizedBox(height: 14),
          _buildTextField(
            controller: _descriptionController,
            label: 'Descripcion (Opcional)',
            hint: 'Breve descripcion del equipo',
            icon: Icons.description,
            maxLines: 3,
          ),
          const SizedBox(height: 28),

          // Owner Section
          _buildSectionTitle('PROPIETARIO DEL EQUIPO'),
          const SizedBox(height: 12),

          // Toggle: Create owner account
          _buildOwnerToggle(),
          const SizedBox(height: 16),

          if (_createOwnerAccount) ...[
            _buildTextField(
              controller: _ownerEmailController,
              label: 'Email del Owner',
              hint: 'owner@ejemplo.com',
              icon: Icons.email_outlined,
              keyboardType: TextInputType.emailAddress,
              validator: (value) {
                if (!_createOwnerAccount) return null;
                if (value == null || value.trim().isEmpty) {
                  return 'El email es requerido';
                }
                if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$')
                    .hasMatch(value.trim())) {
                  return 'Ingresa un email valido';
                }
                return null;
              },
            ),
            const SizedBox(height: 14),
            _buildTextField(
              controller: _ownerNameController,
              label: 'Nombre del Owner',
              hint: 'Juan Perez',
              icon: Icons.person_outline,
              validator: (value) {
                if (!_createOwnerAccount) return null;
                if (value == null || value.trim().isEmpty) {
                  return 'El nombre es requerido';
                }
                return null;
              },
            ),
          ] else ...[
            _buildTextField(
              controller: _existingOwnerIdController,
              label: 'ID del Owner Existente',
              hint: 'UUID del usuario owner',
              icon: Icons.person_search,
              validator: (value) {
                if (_createOwnerAccount) return null;
                if (value == null || value.trim().isEmpty) {
                  return 'El ID del owner es requerido';
                }
                return null;
              },
            ),
          ],
          const SizedBox(height: 40),

          // Submit Button
          _buildSubmitButton(),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: GoogleFonts.bebasNeue(
        fontSize: 16,
        color: _SN.gold,
        letterSpacing: 2,
      ),
    );
  }

  Widget _buildOwnerToggle() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _SN.cardDark,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: _SN.neonGreen.withOpacity(0.2),
        ),
      ),
      child: Row(
        children: [
          Icon(
            _createOwnerAccount ? Icons.person_add : Icons.person_search,
            color: _SN.neonGreen,
            size: 20,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Crear cuenta de Owner',
                  style: GoogleFonts.outfit(
                    color: _SN.textPrimary,
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  _createOwnerAccount
                      ? 'Se generaran credenciales automaticamente'
                      : 'Asignar un usuario existente como owner',
                  style: GoogleFonts.outfit(
                    color: _SN.textMuted,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          Switch(
            value: _createOwnerAccount,
            onChanged: (value) => setState(() => _createOwnerAccount = value),
            activeColor: _SN.neonGreen,
            activeTrackColor: _SN.neonGreen.withOpacity(0.3),
          ),
        ],
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    TextInputType keyboardType = TextInputType.text,
    String? Function(String?)? validator,
    ValueChanged<String>? onChanged,
    int maxLines = 1,
  }) {
    return TextFormField(
      controller: controller,
      style: GoogleFonts.outfit(
        color: _SN.textPrimary,
        fontSize: 15,
      ),
      keyboardType: keyboardType,
      validator: validator,
      onChanged: onChanged,
      maxLines: maxLines,
      cursorColor: _SN.gold,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        filled: true,
        fillColor: _SN.cardDark,
        labelStyle: GoogleFonts.outfit(
          color: _SN.textMuted,
          fontSize: 14,
        ),
        hintStyle: GoogleFonts.outfit(
          color: _SN.textMuted.withOpacity(0.5),
          fontSize: 14,
        ),
        prefixIcon: Icon(
          icon,
          color: _SN.gold,
          size: 20,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(
            color: _SN.gold.withOpacity(0.2),
          ),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(
            color: _SN.gold.withOpacity(0.2),
          ),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(
            color: _SN.gold,
            width: 1.5,
          ),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(
            color: _SN.error,
          ),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(
            color: _SN.error,
            width: 1.5,
          ),
        ),
        contentPadding: const EdgeInsets.all(16),
        errorStyle: GoogleFonts.outfit(
          color: _SN.error,
          fontSize: 12,
        ),
      ),
    );
  }

  Widget _buildSubmitButton() {
    return GestureDetector(
      onTap: _isLoading ? null : _handleSubmit,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 18),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: _isLoading
                ? [_SN.textMuted, _SN.textMuted]
                : [_SN.gold, _SN.amber],
          ),
          borderRadius: BorderRadius.circular(14),
          boxShadow: _isLoading
              ? null
              : [
                  BoxShadow(
                    color: _SN.gold.withOpacity(0.3),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (_isLoading)
              const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.black54),
                ),
              )
            else
              const Icon(Icons.check, color: Colors.black, size: 22),
            const SizedBox(width: 10),
            Text(
              _isLoading ? 'CREANDO...' : 'CREAR EQUIPO',
              style: GoogleFonts.bebasNeue(
                fontSize: 18,
                color: Colors.black,
                letterSpacing: 2,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _handleSubmit() {
    if (!_formKey.currentState!.validate()) return;

    final name = _nameController.text.trim();
    final slug = _slugController.text.trim();
    final description = _descriptionController.text.trim().isNotEmpty
        ? _descriptionController.text.trim()
        : null;

    if (_createOwnerAccount) {
      context.read<TeamBloc>().add(
            CreateTeamWithOwnerEvent(
              teamName: name,
              teamSlug: slug,
              leagueId: widget.leagueId,
              description: description,
              ownerEmail: _ownerEmailController.text.trim(),
              ownerName: _ownerNameController.text.trim(),
            ),
          );
    } else {
      context.read<TeamBloc>().add(
            CreateTeamEvent(
              name: name,
              slug: slug,
              leagueId: widget.leagueId,
              ownerId: _existingOwnerIdController.text.trim(),
              description: description,
            ),
          );
    }
  }
}
