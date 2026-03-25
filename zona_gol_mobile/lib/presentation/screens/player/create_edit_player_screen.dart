import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';

import '../../../core/di/injection.dart';
import '../../../core/utils/age_utils.dart';
import '../../../data/datasources/remote/supabase_client.dart';
import '../../../domain/entities/player_entity.dart';
import '../../../domain/entities/tournament_entity.dart';
import '../../bloc/player/player_bloc.dart';
import '../../bloc/player/player_event.dart';
import '../../bloc/player/player_state.dart';

/// Stadium Nights Design System
class _StadiumNights {
  static const Color backgroundDark = Color(0xFF050508);
  static const Color surfaceDark = Color(0xFF0A0A0F);
  static const Color cardDark = Color(0xFF12121A);
  static const Color gold = Color(0xFFFFD700);
  static const Color neonGreen = Color(0xFF00FF7F);
  static const Color success = Color(0xFF10B981);
  static const Color error = Color(0xFFEF4444);
  static const Color textPrimary = Color(0xFFFAFAFA);
  static const Color textSecondary = Color(0xFF9CA3AF);
  static const Color textMuted = Color(0xFF6B7280);
}

/// Position options with DB values
const _positionOptions = [
  {'label': 'Portero', 'value': 'GK'},
  {'label': 'Defensa', 'value': 'DEF'},
  {'label': 'Mediocampista', 'value': 'MID'},
  {'label': 'Delantero', 'value': 'FWD'},
];

/// Create/Edit Player Screen
class CreateEditPlayerScreen extends StatefulWidget {
  final String teamId;
  final String teamName;
  final PlayerEntity? player; // null = create, non-null = edit
  final TournamentEntity? tournament; // optional: for age validation
  final int usedAgeExceptions; // how many age exceptions already used by team

  const CreateEditPlayerScreen({
    super.key,
    required this.teamId,
    required this.teamName,
    this.player,
    this.tournament,
    this.usedAgeExceptions = 0,
  });

  bool get isEditing => player != null;

  @override
  State<CreateEditPlayerScreen> createState() => _CreateEditPlayerScreenState();
}

class _CreateEditPlayerScreenState extends State<CreateEditPlayerScreen> {
  final _formKey = GlobalKey<FormState>();
  final _imagePicker = ImagePicker();
  late final TextEditingController _nameController;
  late final TextEditingController _jerseyController;
  String? _selectedPosition;
  DateTime? _birthDate;

  // Photo state
  File? _selectedPhotoFile;
  bool _isUploadingPhoto = false;
  String? _existingPhotoUrl;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.player?.name ?? '');
    _jerseyController = TextEditingController(
      text: widget.player?.jerseyNumber?.toString() ?? '',
    );
    _selectedPosition = widget.player?.position;
    _birthDate = widget.player?.birthDate;
    _existingPhotoUrl = widget.player?.photo;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _jerseyController.dispose();
    super.dispose();
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
        body: BlocConsumer<PlayerBloc, PlayerState>(
          listener: (context, state) async {
            if (state is PlayerCreated) {
              // Upload photo if one was selected during create
              if (_selectedPhotoFile != null) {
                final photoUrl = await _uploadPhoto(state.player.id);
                if (photoUrl != null && mounted) {
                  context.read<PlayerBloc>().add(
                    UpdatePlayerEvent(
                      playerId: state.player.id,
                      photo: photoUrl,
                    ),
                  );
                  // Don't pop yet — wait for update to finish
                  return;
                }
              }
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Jugador ${state.player.name} creado'),
                    backgroundColor: _StadiumNights.success,
                  ),
                );
                Navigator.pop(context);
              }
            } else if (state is PlayerUpdated) {
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Jugador ${state.player.name} actualizado'),
                    backgroundColor: _StadiumNights.success,
                  ),
                );
                Navigator.pop(context);
              }
            } else if (state is PlayerError) {
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(state.message),
                    backgroundColor: _StadiumNights.error,
                  ),
                );
              }
            }
          },
          builder: (context, state) {
            final isLoading = state is PlayerLoading;
            return Stack(
              children: [
                _buildForm(context),
                if (isLoading)
                  Container(
                    color: Colors.black.withOpacity(0.5),
                    child: const Center(
                      child: CircularProgressIndicator(
                        valueColor: AlwaysStoppedAnimation<Color>(_StadiumNights.gold),
                      ),
                    ),
                  ),
              ],
            );
          },
        ),
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
            border: Border.all(color: _StadiumNights.gold.withOpacity(0.2)),
          ),
          child: const Icon(Icons.arrow_back, color: _StadiumNights.gold, size: 18),
        ),
        onPressed: () => Navigator.pop(context),
      ),
      title: Column(
        children: [
          Text(
            widget.isEditing ? 'EDITAR JUGADOR' : 'NUEVO JUGADOR',
            style: GoogleFonts.bebasNeue(
              fontSize: 22,
              color: _StadiumNights.textPrimary,
              letterSpacing: 2,
            ),
          ),
          Text(
            widget.teamName,
            style: GoogleFonts.outfit(
              fontSize: 12,
              color: _StadiumNights.textSecondary,
            ),
          ),
        ],
      ),
      centerTitle: true,
    );
  }

  Widget _buildForm(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Photo picker
            _buildPhotoSection(),
            const SizedBox(height: 24),

            // Name field
            _buildLabel('Nombre Completo *'),
            const SizedBox(height: 8),
            _buildTextField(
              controller: _nameController,
              hint: 'Ej: Juan Pérez',
              icon: Icons.person,
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'El nombre es requerido';
                }
                return null;
              },
            ),
            const SizedBox(height: 20),

            // Jersey number field
            _buildLabel('Número de Camiseta'),
            const SizedBox(height: 8),
            _buildTextField(
              controller: _jerseyController,
              hint: 'Ej: 10',
              icon: Icons.tag,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              validator: (value) {
                if (value != null && value.isNotEmpty) {
                  final number = int.tryParse(value);
                  if (number == null || number < 0 || number > 99) {
                    return 'Ingresa un número entre 0 y 99';
                  }
                }
                return null;
              },
            ),
            const SizedBox(height: 20),

            // Position dropdown
            _buildLabel('Posición'),
            const SizedBox(height: 8),
            _buildPositionDropdown(),
            const SizedBox(height: 20),

            // Birth date picker
            _buildLabel('Fecha de Nacimiento'),
            const SizedBox(height: 8),
            _buildDatePicker(context),
            // Age validation info
            if (widget.tournament != null && widget.tournament!.hasAgeValidation) ...[
              const SizedBox(height: 8),
              _buildAgeValidationInfo(),
            ],
            const SizedBox(height: 32),

            // Submit button
            _buildSubmitButton(context),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  // ==================== Photo Section ====================

  Widget _buildPhotoSection() {
    return Center(
      child: GestureDetector(
        onTap: _showPhotoOptions,
        child: Stack(
          children: [
            // Avatar
            Container(
              width: 110,
              height: 110,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: _StadiumNights.cardDark,
                border: Border.all(
                  color: _StadiumNights.gold.withOpacity(0.3),
                  width: 2,
                ),
              ),
              child: ClipOval(
                child: _buildPhotoContent(),
              ),
            ),
            // Camera badge
            Positioned(
              bottom: 0,
              right: 0,
              child: Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: _StadiumNights.gold,
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: _StadiumNights.backgroundDark,
                    width: 3,
                  ),
                ),
                child: const Icon(
                  Icons.camera_alt,
                  color: Colors.black,
                  size: 16,
                ),
              ),
            ),
            // Upload spinner
            if (_isUploadingPhoto)
              Container(
                width: 110,
                height: 110,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.black.withOpacity(0.6),
                ),
                child: const Center(
                  child: SizedBox(
                    width: 30,
                    height: 30,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      valueColor: AlwaysStoppedAnimation<Color>(_StadiumNights.gold),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildPhotoContent() {
    // Show selected local file
    if (_selectedPhotoFile != null) {
      return Image.file(
        _selectedPhotoFile!,
        width: 110,
        height: 110,
        fit: BoxFit.cover,
      );
    }

    // Show existing photo URL
    if (_existingPhotoUrl != null && _existingPhotoUrl!.isNotEmpty) {
      if (_existingPhotoUrl!.startsWith('data:image/')) {
        try {
          final base64Data = _existingPhotoUrl!.split(',')[1];
          final bytes = base64Decode(base64Data);
          return Image.memory(
            bytes,
            width: 110,
            height: 110,
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => _buildPhotoPlaceholder(),
          );
        } catch (_) {
          return _buildPhotoPlaceholder();
        }
      }
      return Image.network(
        _existingPhotoUrl!,
        width: 110,
        height: 110,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => _buildPhotoPlaceholder(),
      );
    }

    return _buildPhotoPlaceholder();
  }

  Widget _buildPhotoPlaceholder() {
    return Container(
      width: 110,
      height: 110,
      color: _StadiumNights.cardDark,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.person,
            size: 40,
            color: _StadiumNights.gold.withOpacity(0.4),
          ),
          const SizedBox(height: 4),
          Text(
            'FOTO',
            style: GoogleFonts.bebasNeue(
              fontSize: 11,
              color: _StadiumNights.textMuted,
              letterSpacing: 1,
            ),
          ),
        ],
      ),
    );
  }

  void _showPhotoOptions() {
    showModalBottomSheet(
      context: context,
      backgroundColor: _StadiumNights.cardDark,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(top: 12),
              decoration: BoxDecoration(
                color: _StadiumNights.textMuted.withOpacity(0.3),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'SELECCIONAR FOTO',
              style: GoogleFonts.bebasNeue(
                fontSize: 18,
                color: _StadiumNights.gold,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 16),
            ListTile(
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: _StadiumNights.gold.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.camera_alt, color: _StadiumNights.gold),
              ),
              title: Text('Tomar foto', style: GoogleFonts.outfit(color: _StadiumNights.textPrimary)),
              subtitle: Text('Usar la cámara', style: GoogleFonts.outfit(color: _StadiumNights.textMuted, fontSize: 12)),
              onTap: () {
                Navigator.pop(context);
                _pickPhoto(ImageSource.camera);
              },
            ),
            ListTile(
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: _StadiumNights.gold.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.photo_library, color: _StadiumNights.gold),
              ),
              title: Text('Elegir de galería', style: GoogleFonts.outfit(color: _StadiumNights.textPrimary)),
              subtitle: Text('Seleccionar imagen existente', style: GoogleFonts.outfit(color: _StadiumNights.textMuted, fontSize: 12)),
              onTap: () {
                Navigator.pop(context);
                _pickPhoto(ImageSource.gallery);
              },
            ),
            if (_selectedPhotoFile != null || (_existingPhotoUrl != null && _existingPhotoUrl!.isNotEmpty))
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: _StadiumNights.error.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.delete_outline, color: _StadiumNights.error),
                ),
                title: Text('Quitar foto', style: GoogleFonts.outfit(color: _StadiumNights.error)),
                onTap: () {
                  Navigator.pop(context);
                  setState(() {
                    _selectedPhotoFile = null;
                    _existingPhotoUrl = null;
                  });
                },
              ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Future<void> _pickPhoto(ImageSource source) async {
    try {
      final picked = await _imagePicker.pickImage(
        source: source,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 80,
      );

      if (picked != null) {
        setState(() {
          _selectedPhotoFile = File(picked.path);
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error al seleccionar foto: $e'),
            backgroundColor: _StadiumNights.error,
          ),
        );
      }
    }
  }

  /// Upload photo to Supabase Storage and return public URL
  Future<String?> _uploadPhoto(String playerId) async {
    if (_selectedPhotoFile == null) return null;

    try {
      setState(() => _isUploadingPhoto = true);

      final supabase = sl<SupabaseClientService>();
      final bytes = await _selectedPhotoFile!.readAsBytes();
      final fileName = 'photo_${DateTime.now().millisecondsSinceEpoch}.jpg';
      final path = 'players/$playerId/$fileName';

      final publicUrl = await supabase.uploadFile(
        bucket: 'player-photos',
        path: path,
        file: Uint8List.fromList(bytes),
        metadata: {'contentType': 'image/jpeg'},
      );

      return publicUrl;
    } catch (e) {
      print('Error uploading photo: $e');
      return null;
    } finally {
      if (mounted) {
        setState(() => _isUploadingPhoto = false);
      }
    }
  }

  // ==================== Form Fields ====================

  Widget _buildLabel(String text) {
    return Text(
      text.toUpperCase(),
      style: GoogleFonts.bebasNeue(
        fontSize: 14,
        color: _StadiumNights.gold,
        letterSpacing: 1.5,
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    TextInputType? keyboardType,
    List<TextInputFormatter>? inputFormatters,
    String? Function(String?)? validator,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: _StadiumNights.cardDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _StadiumNights.gold.withOpacity(0.15)),
      ),
      child: TextFormField(
        controller: controller,
        keyboardType: keyboardType,
        inputFormatters: inputFormatters,
        validator: validator,
        style: GoogleFonts.outfit(color: _StadiumNights.textPrimary),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: GoogleFonts.outfit(color: _StadiumNights.textMuted),
          prefixIcon: Icon(icon, color: _StadiumNights.gold.withOpacity(0.7), size: 20),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          errorStyle: GoogleFonts.outfit(color: _StadiumNights.error, fontSize: 12),
        ),
      ),
    );
  }

  Widget _buildPositionDropdown() {
    return Container(
      decoration: BoxDecoration(
        color: _StadiumNights.cardDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _StadiumNights.gold.withOpacity(0.15)),
      ),
      child: DropdownButtonFormField<String>(
        value: _selectedPosition,
        dropdownColor: _StadiumNights.cardDark,
        style: GoogleFonts.outfit(color: _StadiumNights.textPrimary),
        decoration: InputDecoration(
          prefixIcon: Icon(
            Icons.sports_soccer,
            color: _StadiumNights.gold.withOpacity(0.7),
            size: 20,
          ),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        ),
        hint: Text('Seleccionar posición', style: GoogleFonts.outfit(color: _StadiumNights.textMuted)),
        items: _positionOptions.map((pos) {
          return DropdownMenuItem<String>(
            value: pos['value'],
            child: Text(pos['label']!),
          );
        }).toList(),
        onChanged: (value) => setState(() => _selectedPosition = value),
      ),
    );
  }

  Widget _buildDatePicker(BuildContext context) {
    return GestureDetector(
      onTap: () => _selectDate(context),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: _StadiumNights.cardDark,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: _StadiumNights.gold.withOpacity(0.15)),
        ),
        child: Row(
          children: [
            Icon(Icons.calendar_today, color: _StadiumNights.gold.withOpacity(0.7), size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                _birthDate != null
                    ? DateFormat('dd/MM/yyyy').format(_birthDate!)
                    : 'Seleccionar fecha',
                style: GoogleFonts.outfit(
                  color: _birthDate != null
                      ? _StadiumNights.textPrimary
                      : _StadiumNights.textMuted,
                ),
              ),
            ),
            if (_birthDate != null)
              GestureDetector(
                onTap: () => setState(() => _birthDate = null),
                child: const Icon(Icons.clear, color: _StadiumNights.textMuted, size: 18),
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _selectDate(BuildContext context) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _birthDate ?? DateTime(2000, 1, 1),
      firstDate: DateTime(1960),
      lastDate: DateTime.now(),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.dark(
              primary: _StadiumNights.gold,
              onPrimary: Colors.black,
              surface: _StadiumNights.cardDark,
              onSurface: _StadiumNights.textPrimary,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() => _birthDate = picked);
    }
  }

  Widget _buildAgeValidationInfo() {
    final tournament = widget.tournament!;
    final rulesText = AgeUtils.describeAgeRules(tournament);

    // If birth date is selected, show validation result
    if (_birthDate != null) {
      final result = AgeUtils.validatePlayerAge(
        _birthDate,
        tournament,
        usedExceptions: widget.usedAgeExceptions,
      );

      Color borderColor;
      Color bgColor;
      IconData icon;
      String message;

      if (result.isValid && !result.isException) {
        borderColor = _StadiumNights.neonGreen.withOpacity(0.3);
        bgColor = _StadiumNights.neonGreen.withOpacity(0.08);
        icon = Icons.check_circle;
        message = 'Edad válida: ${AgeUtils.formatAge(result.age)}';
      } else if (result.isValid && result.isException) {
        borderColor = _StadiumNights.gold.withOpacity(0.3);
        bgColor = _StadiumNights.gold.withOpacity(0.08);
        icon = Icons.warning_amber;
        message = result.reason ?? 'Excepción de edad';
      } else {
        borderColor = _StadiumNights.error.withOpacity(0.3);
        bgColor = _StadiumNights.error.withOpacity(0.08);
        icon = Icons.error_outline;
        message = result.reason ?? 'Edad no válida';
      }

      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: borderColor),
        ),
        child: Row(
          children: [
            Icon(icon, color: borderColor.withOpacity(1), size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    message,
                    style: GoogleFonts.outfit(
                      fontSize: 13,
                      color: _StadiumNights.textPrimary,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    rulesText,
                    style: GoogleFonts.outfit(
                      fontSize: 11,
                      color: _StadiumNights.textMuted,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    // No birth date yet - show rules info
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: _StadiumNights.gold.withOpacity(0.05),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: _StadiumNights.gold.withOpacity(0.15)),
      ),
      child: Row(
        children: [
          Icon(Icons.info_outline, color: _StadiumNights.gold.withOpacity(0.7), size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              rulesText,
              style: GoogleFonts.outfit(
                fontSize: 12,
                color: _StadiumNights.textSecondary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSubmitButton(BuildContext context) {
    return ElevatedButton(
      onPressed: () => _submit(context),
      style: ElevatedButton.styleFrom(
        backgroundColor: _StadiumNights.neonGreen,
        foregroundColor: Colors.black,
        padding: const EdgeInsets.symmetric(vertical: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        elevation: 0,
      ),
      child: Text(
        widget.isEditing ? 'GUARDAR CAMBIOS' : 'CREAR JUGADOR',
        style: GoogleFonts.bebasNeue(
          fontSize: 18,
          letterSpacing: 2,
        ),
      ),
    );
  }

  Future<void> _submit(BuildContext context) async {
    if (!_formKey.currentState!.validate()) return;

    // Age validation check
    if (widget.tournament != null &&
        widget.tournament!.hasAgeValidation &&
        _birthDate != null) {
      final result = AgeUtils.validatePlayerAge(
        _birthDate,
        widget.tournament!,
        usedExceptions: widget.usedAgeExceptions,
      );

      if (!result.isValid) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result.reason ?? 'El jugador no cumple los requisitos de edad'),
            backgroundColor: _StadiumNights.error,
          ),
        );
        return;
      }

      // Show confirmation for exceptions
      if (result.isException) {
        final confirmed = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            backgroundColor: _StadiumNights.cardDark,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: Text(
              'Excepción de Edad',
              style: GoogleFonts.outfit(color: _StadiumNights.gold, fontWeight: FontWeight.w600),
            ),
            content: Text(
              result.reason ?? 'Este jugador será registrado como excepción de edad.',
              style: GoogleFonts.outfit(color: _StadiumNights.textSecondary),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: Text('Cancelar', style: TextStyle(color: _StadiumNights.textMuted)),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context, true),
                style: TextButton.styleFrom(foregroundColor: _StadiumNights.gold),
                child: const Text('Confirmar'),
              ),
            ],
          ),
        );
        if (confirmed != true) return;
      }
    }

    final name = _nameController.text.trim();
    final jerseyNumber = _jerseyController.text.isNotEmpty
        ? int.tryParse(_jerseyController.text)
        : null;

    // Determine photo URL
    String? photoUrl;

    // For editing: upload photo first if a new one was selected
    if (widget.isEditing && _selectedPhotoFile != null) {
      photoUrl = await _uploadPhoto(widget.player!.id);
    }

    // Handle removed photo (user cleared existing photo)
    final photoCleared = widget.isEditing &&
        _existingPhotoUrl == null &&
        _selectedPhotoFile == null &&
        widget.player?.photo != null;

    if (!mounted) return;

    if (widget.isEditing) {
      context.read<PlayerBloc>().add(
            UpdatePlayerEvent(
              playerId: widget.player!.id,
              name: name,
              position: _selectedPosition,
              jerseyNumber: jerseyNumber,
              birthDate: _birthDate,
              photo: photoUrl ?? (photoCleared ? '' : null),
            ),
          );
    } else {
      // For create: create player first, photo will be uploaded on success
      context.read<PlayerBloc>().add(
            CreatePlayerEvent(
              name: name,
              teamId: widget.teamId,
              position: _selectedPosition,
              jerseyNumber: jerseyNumber,
              birthDate: _birthDate,
            ),
          );
    }
  }
}
