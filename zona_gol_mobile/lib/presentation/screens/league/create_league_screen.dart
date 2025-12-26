import 'dart:convert';
import 'dart:math' as math;
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;

import '../../../core/config/app_config.dart';
import '../../../core/di/injection.dart';
import '../../bloc/league/league_bloc.dart';
import '../../bloc/league/league_event.dart';
import '../../bloc/league/league_state.dart';

/// Stadium Nights Design System
class _StadiumNights {
  static const Color backgroundDark = Color(0xFF050508);
  static const Color surfaceDark = Color(0xFF0A0A0F);
  static const Color cardDark = Color(0xFF12121A);
  static const Color gold = Color(0xFFFFD700);
  static const Color goldLight = Color(0xFFFFF0B3);
  static const Color amber = Color(0xFFF59E0B);
  static const Color neonGreen = Color(0xFF00FF7F);
  static const Color neonBlue = Color(0xFF00BFFF);
  static const Color success = Color(0xFF10B981);
  static const Color error = Color(0xFFEF4444);
  static const Color textPrimary = Color(0xFFFAFAFA);
  static const Color textSecondary = Color(0xFF9CA3AF);
  static const Color textMuted = Color(0xFF6B7280);
}

/// Create League Screen - Stadium Nights Edition
/// A premium multi-step form for creating new leagues
class CreateLeagueScreen extends StatefulWidget {
  const CreateLeagueScreen({super.key});

  @override
  State<CreateLeagueScreen> createState() => _CreateLeagueScreenState();
}

class _CreateLeagueScreenState extends State<CreateLeagueScreen>
    with TickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final PageController _pageController = PageController();

  // Animation controllers
  late AnimationController _headerController;
  late AnimationController _formController;
  late Animation<double> _headerAnimation;
  late Animation<double> _formAnimation;

  // Current step
  int _currentStep = 0;
  final int _totalSteps = 2;

  // League fields
  final _nameController = TextEditingController();
  final _slugController = TextEditingController();
  final _descriptionController = TextEditingController();

  // Admin fields
  final _adminNameController = TextEditingController();
  final _adminEmailController = TextEditingController();
  final _adminPhoneController = TextEditingController();

  // Focus nodes
  final _nameFocus = FocusNode();
  final _slugFocus = FocusNode();
  final _descriptionFocus = FocusNode();
  final _adminNameFocus = FocusNode();
  final _adminEmailFocus = FocusNode();
  final _adminPhoneFocus = FocusNode();

  bool _isLoading = false;
  bool _autoGenerateSlug = true;
  String? _createdAdminId;
  String? _generatedPassword;
  String _productMode = 'full'; // 'full' or 'web_only'

  // BLoC instance
  late final LeagueBloc _leagueBloc;

  @override
  void initState() {
    super.initState();

    // Initialize BLoC
    _leagueBloc = sl<LeagueBloc>();

    _headerController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    );

    _formController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );

    _headerAnimation = CurvedAnimation(
      parent: _headerController,
      curve: Curves.easeOutCubic,
    );

    _formAnimation = CurvedAnimation(
      parent: _formController,
      curve: Curves.easeOutCubic,
    );

    _headerController.forward();
    _formController.forward();

    _nameController.addListener(_onNameChanged);
  }

  @override
  void dispose() {
    _headerController.dispose();
    _formController.dispose();
    _pageController.dispose();
    _nameController.removeListener(_onNameChanged);
    _nameController.dispose();
    _slugController.dispose();
    _descriptionController.dispose();
    _adminNameController.dispose();
    _adminEmailController.dispose();
    _adminPhoneController.dispose();
    _nameFocus.dispose();
    _slugFocus.dispose();
    _descriptionFocus.dispose();
    _adminNameFocus.dispose();
    _adminEmailFocus.dispose();
    _adminPhoneFocus.dispose();
    _leagueBloc.close();
    super.dispose();
  }

  void _onNameChanged() {
    if (_autoGenerateSlug) {
      _slugController.text = _generateSlug(_nameController.text);
    }
  }

  String _generateSlug(String name) {
    return name
        .toLowerCase()
        .replaceAll(RegExp(r'[áàäâã]'), 'a')
        .replaceAll(RegExp(r'[éèëê]'), 'e')
        .replaceAll(RegExp(r'[íìïî]'), 'i')
        .replaceAll(RegExp(r'[óòöôõ]'), 'o')
        .replaceAll(RegExp(r'[úùüû]'), 'u')
        .replaceAll(RegExp(r'[ñ]'), 'n')
        .replaceAll(RegExp(r'[^a-z0-9\s-]'), '')
        .replaceAll(RegExp(r'\s+'), '-')
        .replaceAll(RegExp(r'-+'), '-')
        .replaceAll(RegExp(r'^-|-$'), '');
  }

  String _generatePassword() {
    const chars =
        'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#\$%&*';
    final random = math.Random.secure();
    return List.generate(12, (index) => chars[random.nextInt(chars.length)])
        .join();
  }

  bool _validateCurrentStep() {
    if (_currentStep == 0) {
      // Validate league fields
      if (_nameController.text.trim().isEmpty) {
        _showError('El nombre de la liga es requerido');
        return false;
      }
      if (_nameController.text.trim().length < 3) {
        _showError('El nombre debe tener al menos 3 caracteres');
        return false;
      }
      if (_slugController.text.trim().isEmpty) {
        _showError('El slug es requerido');
        return false;
      }
      if (!RegExp(r'^[a-z0-9]+(?:-[a-z0-9]+)*$')
          .hasMatch(_slugController.text.trim())) {
        _showError('El slug solo puede contener minúsculas, números y guiones');
        return false;
      }
      if (_descriptionController.text.trim().isEmpty) {
        _showError('La descripción es requerida');
        return false;
      }
      if (_descriptionController.text.trim().length < 10) {
        _showError('La descripción debe tener al menos 10 caracteres');
        return false;
      }
    } else if (_currentStep == 1) {
      // Validate admin fields
      if (_adminNameController.text.trim().isEmpty) {
        _showError('El nombre del administrador es requerido');
        return false;
      }
      if (_adminEmailController.text.trim().isEmpty) {
        _showError('El email del administrador es requerido');
        return false;
      }
      if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$')
          .hasMatch(_adminEmailController.text.trim())) {
        _showError('Ingresa un email válido');
        return false;
      }
    }
    return true;
  }

  void _nextStep() {
    if (!_validateCurrentStep()) return;

    if (_currentStep < _totalSteps - 1) {
      HapticFeedback.lightImpact();
      _pageController.nextPage(
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeOutCubic,
      );
    } else {
      _createLeague();
    }
  }

  void _previousStep() {
    if (_currentStep > 0) {
      HapticFeedback.lightImpact();
      _pageController.previousPage(
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeOutCubic,
      );
    } else {
      Navigator.pop(context);
    }
  }

  void _showError(String message) {
    HapticFeedback.heavyImpact();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.error_outline, color: Colors.white, size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: GoogleFonts.outfit(color: Colors.white),
              ),
            ),
          ],
        ),
        backgroundColor: _StadiumNights.error,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  Future<void> _createLeague() async {
    if (!_validateCurrentStep()) return;

    setState(() => _isLoading = true);
    HapticFeedback.mediumImpact();

    try {
      // Step 1: Generate password and create auth user
      _generatedPassword = _generatePassword();

      final userResponse = await http.post(
        Uri.parse('${AppConfig.apiBaseUrl}/api/auth/create-user'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': _adminEmailController.text.trim(),
          'password': _generatedPassword,
          'user_metadata': {
            'name': _adminNameController.text.trim(),
            'phone': _adminPhoneController.text.trim(),
            'role': 'league_admin',
          },
        }),
      );

      if (userResponse.statusCode != 201) {
        final errorData = jsonDecode(userResponse.body);
        throw Exception(errorData['error'] ?? 'Error al crear usuario');
      }

      final userData = jsonDecode(userResponse.body);
      _createdAdminId = userData['user']['id'];

      if (_createdAdminId == null) {
        throw Exception('No se pudo obtener el ID del usuario creado');
      }

      // Step 2: Create the league using the bloc
      if (mounted) {
        _leagueBloc.add(CreateLeagueEvent(
              name: _nameController.text.trim(),
              slug: _slugController.text.trim(),
              description: _descriptionController.text.trim(),
              adminId: _createdAdminId!,
              productMode: _productMode,
            ));
      }
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        _showError(e.toString().replaceAll('Exception: ', ''));
      }
    }
  }

  void _showCredentialsDialog(String leagueName) {
    HapticFeedback.heavyImpact();

    showDialog(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.black87,
      builder: (context) => _CredentialsDialog(
        leagueName: leagueName,
        email: _adminEmailController.text,
        password: _generatedPassword ?? '',
        onClose: () {
          Navigator.of(context).pop();
          Navigator.of(context).pop();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider.value(
      value: _leagueBloc,
      child: BlocConsumer<LeagueBloc, LeagueState>(
        listener: (context, state) {
          if (state is LeagueCreated) {
            setState(() => _isLoading = false);
            _showCredentialsDialog(state.league.name);
          } else if (state is LeagueError) {
            setState(() => _isLoading = false);
            _showError(state.message);
          }
        },
        builder: (context, state) {
          return AnnotatedRegion<SystemUiOverlayStyle>(
            value: SystemUiOverlayStyle.light.copyWith(
              statusBarColor: Colors.transparent,
              systemNavigationBarColor: _StadiumNights.backgroundDark,
            ),
            child: Scaffold(
              backgroundColor: _StadiumNights.backgroundDark,
              body: Stack(
                children: [
                  // Background
                  const _StadiumFieldBackground(),

                  // Spotlight effects
                  _buildSpotlightEffects(),

                  // Main content
                  SafeArea(
                    child: Column(
                      children: [
                        // Header
                        _buildHeader(),

                        // Progress indicator
                        _buildProgressIndicator(),

                        // Form pages
                        Expanded(
                          child: PageView(
                            controller: _pageController,
                            physics: const NeverScrollableScrollPhysics(),
                            onPageChanged: (index) {
                              setState(() => _currentStep = index);
                            },
                            children: [
                              _buildLeagueInfoStep(),
                              _buildAdminInfoStep(),
                            ],
                          ),
                        ),

                        // Navigation buttons
                        _buildNavigationButtons(),
                      ],
                    ),
                  ),

                  // Loading overlay
                  if (_isLoading) _buildLoadingOverlay(),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildSpotlightEffects() {
    return AnimatedBuilder(
      animation: _headerAnimation,
      builder: (context, child) {
        return Stack(
          children: [
            Positioned(
              top: -100,
              left: -50,
              child: Opacity(
                opacity: 0.25 * _headerAnimation.value,
                child: Container(
                  width: 300,
                  height: 400,
                  decoration: BoxDecoration(
                    gradient: RadialGradient(
                      colors: [
                        _StadiumNights.neonGreen.withOpacity(0.3),
                        Colors.transparent,
                      ],
                    ),
                  ),
                ),
              ),
            ),
            Positioned(
              top: -80,
              right: -80,
              child: Opacity(
                opacity: 0.2 * _headerAnimation.value,
                child: Container(
                  width: 350,
                  height: 350,
                  decoration: BoxDecoration(
                    gradient: RadialGradient(
                      colors: [
                        _StadiumNights.gold.withOpacity(0.3),
                        Colors.transparent,
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildHeader() {
    return AnimatedBuilder(
      animation: _headerAnimation,
      builder: (context, child) {
        return Transform.translate(
          offset: Offset(0, -30 * (1 - _headerAnimation.value)),
          child: Opacity(
            opacity: _headerAnimation.value,
            child: Container(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
              child: Row(
                children: [
                  // Back button
                  GestureDetector(
                    onTap: _previousStep,
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: _StadiumNights.cardDark,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: _StadiumNights.gold.withOpacity(0.2),
                        ),
                      ),
                      child: Icon(
                        _currentStep == 0 ? Icons.close : Icons.arrow_back,
                        color: _StadiumNights.gold,
                        size: 20,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),

                  // Title with icon
                  Expanded(
                    child: Row(
                      children: [
                        Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [
                                _StadiumNights.neonGreen,
                                _StadiumNights.neonGreen.withOpacity(0.8),
                              ],
                            ),
                            borderRadius: BorderRadius.circular(14),
                            boxShadow: [
                              BoxShadow(
                                color:
                                    _StadiumNights.neonGreen.withOpacity(0.3),
                                blurRadius: 16,
                                spreadRadius: 2,
                              ),
                            ],
                          ),
                          child: const Icon(
                            Icons.add_circle,
                            color: Colors.black,
                            size: 26,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'NUEVA LIGA',
                              style: GoogleFonts.bebasNeue(
                                fontSize: 28,
                                color: _StadiumNights.textPrimary,
                                letterSpacing: 3,
                                height: 1,
                              ),
                            ),
                            Text(
                              _currentStep == 0
                                  ? 'Información de la liga'
                                  : 'Datos del administrador',
                              style: GoogleFonts.outfit(
                                fontSize: 12,
                                color: _StadiumNights.neonGreen,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildProgressIndicator() {
    return AnimatedBuilder(
      animation: _headerAnimation,
      builder: (context, child) {
        return Opacity(
          opacity: _headerAnimation.value,
          child: Container(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            child: Row(
              children: List.generate(_totalSteps, (index) {
                final isActive = index == _currentStep;
                final isCompleted = index < _currentStep;

                return Expanded(
                  child: Row(
                    children: [
                      Expanded(
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 300),
                          height: 4,
                          decoration: BoxDecoration(
                            color: isCompleted || isActive
                                ? _StadiumNights.neonGreen
                                : Colors.white.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(2),
                            boxShadow: isActive
                                ? [
                                    BoxShadow(
                                      color: _StadiumNights.neonGreen
                                          .withOpacity(0.5),
                                      blurRadius: 8,
                                    ),
                                  ]
                                : null,
                          ),
                        ),
                      ),
                      if (index < _totalSteps - 1) const SizedBox(width: 8),
                    ],
                  ),
                );
              }),
            ),
          ),
        );
      },
    );
  }

  Widget _buildLeagueInfoStep() {
    return AnimatedBuilder(
      animation: _formAnimation,
      builder: (context, child) {
        return Transform.translate(
          offset: Offset(0, 20 * (1 - _formAnimation.value)),
          child: Opacity(
            opacity: _formAnimation.value,
            child: child,
          ),
        );
      },
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Section header
            _buildSectionHeader(
              icon: Icons.emoji_events,
              title: 'INFORMACIÓN DE LA LIGA',
              subtitle: 'Datos principales de tu competición',
            ),
            const SizedBox(height: 24),

            // League name
            _buildTextField(
              controller: _nameController,
              focusNode: _nameFocus,
              label: 'Nombre de la Liga',
              hint: 'Ej: Liga Elite Soccer',
              icon: Icons.sports_soccer,
              required: true,
            ),
            const SizedBox(height: 20),

            // Slug
            _buildSlugField(),
            const SizedBox(height: 20),

            // Description
            _buildTextField(
              controller: _descriptionController,
              focusNode: _descriptionFocus,
              label: 'Descripción',
              hint: 'Describe brevemente tu liga...',
              icon: Icons.description,
              maxLines: 4,
              required: true,
            ),
            const SizedBox(height: 24),

            // Product Mode Selector
            _buildProductModeSelector(),

            // Extra padding at bottom for scroll
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildProductModeSelector() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              'Tipo de Producto',
              style: GoogleFonts.outfit(
                fontSize: 14,
                color: _StadiumNights.textSecondary,
                fontWeight: FontWeight.w500,
              ),
            ),
            Text(
              ' *',
              style: GoogleFonts.outfit(
                fontSize: 14,
                color: _StadiumNights.gold,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Full Mode Option
        _buildProductModeOption(
          mode: 'full',
          title: 'Zona-G Completo',
          subtitle: 'App móvil + QR + Reconocimiento Facial',
          icon: Icons.sports_soccer,
          features: ['App Móvil', 'Códigos QR', 'Reconocimiento Facial', 'Tiempo Real'],
          isSelected: _productMode == 'full',
        ),
        const SizedBox(height: 12),

        // Web Only Option
        _buildProductModeOption(
          mode: 'web_only',
          title: 'Zona-G Web',
          subtitle: 'Portal web con captura manual',
          icon: Icons.language,
          features: ['Portal Público', 'Captura Manual', 'Estadísticas', 'Agente AI'],
          isSelected: _productMode == 'web_only',
        ),
      ],
    );
  }

  Widget _buildProductModeOption({
    required String mode,
    required String title,
    required String subtitle,
    required IconData icon,
    required List<String> features,
    required bool isSelected,
  }) {
    final borderColor = isSelected
        ? _StadiumNights.neonGreen
        : Colors.white.withOpacity(0.1);
    final bgColor = isSelected
        ? _StadiumNights.neonGreen.withOpacity(0.08)
        : _StadiumNights.cardDark;

    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        setState(() => _productMode = mode);
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: borderColor,
            width: isSelected ? 2 : 1,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: _StadiumNights.neonGreen.withOpacity(0.15),
                    blurRadius: 12,
                    spreadRadius: 1,
                  ),
                ]
              : null,
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Icon container
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                gradient: isSelected
                    ? LinearGradient(
                        colors: [
                          _StadiumNights.neonGreen,
                          _StadiumNights.neonGreen.withOpacity(0.8),
                        ],
                      )
                    : null,
                color: isSelected ? null : Colors.white.withOpacity(0.05),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                icon,
                color: isSelected ? Colors.black : _StadiumNights.textMuted,
                size: 24,
              ),
            ),
            const SizedBox(width: 14),

            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          title,
                          style: GoogleFonts.outfit(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: isSelected
                                ? _StadiumNights.textPrimary
                                : _StadiumNights.textSecondary,
                          ),
                        ),
                      ),
                      if (isSelected)
                        Container(
                          width: 22,
                          height: 22,
                          decoration: BoxDecoration(
                            color: _StadiumNights.neonGreen,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.check,
                            color: Colors.black,
                            size: 14,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: GoogleFonts.outfit(
                      fontSize: 12,
                      color: _StadiumNights.textMuted,
                    ),
                  ),
                  const SizedBox(height: 10),

                  // Features chips
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: features.map((feature) {
                      return Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? _StadiumNights.neonGreen.withOpacity(0.15)
                              : Colors.white.withOpacity(0.05),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          feature,
                          style: GoogleFonts.outfit(
                            fontSize: 10,
                            color: isSelected
                                ? _StadiumNights.neonGreen
                                : _StadiumNights.textMuted,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAdminInfoStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Section header
          _buildSectionHeader(
            icon: Icons.admin_panel_settings,
            title: 'ADMINISTRADOR',
            subtitle: 'Se creará una cuenta para gestionar la liga',
          ),
          const SizedBox(height: 24),

          // Info card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: _StadiumNights.neonBlue.withOpacity(0.1),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: _StadiumNights.neonBlue.withOpacity(0.2),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.info_outline,
                  color: _StadiumNights.neonBlue,
                  size: 20,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Se generará una contraseña segura automáticamente',
                    style: GoogleFonts.outfit(
                      fontSize: 13,
                      color: _StadiumNights.neonBlue,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Admin name
          _buildTextField(
            controller: _adminNameController,
            focusNode: _adminNameFocus,
            label: 'Nombre del Administrador',
            hint: 'Ej: Juan Pérez',
            icon: Icons.person,
            required: true,
            textCapitalization: TextCapitalization.words,
          ),
          const SizedBox(height: 20),

          // Admin email
          _buildTextField(
            controller: _adminEmailController,
            focusNode: _adminEmailFocus,
            label: 'Email del Administrador',
            hint: 'Ej: admin@liga.com',
            icon: Icons.email,
            required: true,
            keyboardType: TextInputType.emailAddress,
          ),
          const SizedBox(height: 20),

          // Admin phone
          _buildTextField(
            controller: _adminPhoneController,
            focusNode: _adminPhoneFocus,
            label: 'Teléfono (Opcional)',
            hint: 'Ej: +52 123 456 7890',
            icon: Icons.phone,
            keyboardType: TextInputType.phone,
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader({
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.white.withOpacity(0.08),
            Colors.white.withOpacity(0.03),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: Row(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  _StadiumNights.gold,
                  _StadiumNights.amber,
                ],
              ),
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: _StadiumNights.gold.withOpacity(0.3),
                  blurRadius: 16,
                ),
              ],
            ),
            child: Icon(icon, color: Colors.black, size: 28),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: GoogleFonts.bebasNeue(
                    fontSize: 20,
                    color: _StadiumNights.textPrimary,
                    letterSpacing: 2,
                  ),
                ),
                Text(
                  subtitle,
                  style: GoogleFonts.outfit(
                    fontSize: 13,
                    color: _StadiumNights.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required FocusNode focusNode,
    required String label,
    required String hint,
    required IconData icon,
    bool required = false,
    int maxLines = 1,
    TextInputType keyboardType = TextInputType.text,
    TextCapitalization textCapitalization = TextCapitalization.none,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              label,
              style: GoogleFonts.outfit(
                fontSize: 14,
                color: _StadiumNights.textSecondary,
                fontWeight: FontWeight.w500,
              ),
            ),
            if (required)
              Text(
                ' *',
                style: GoogleFonts.outfit(
                  fontSize: 14,
                  color: _StadiumNights.gold,
                  fontWeight: FontWeight.w600,
                ),
              ),
          ],
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: _StadiumNights.cardDark,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: focusNode.hasFocus
                  ? _StadiumNights.gold.withOpacity(0.5)
                  : Colors.white.withOpacity(0.1),
              width: 1.5,
            ),
          ),
          child: TextField(
            controller: controller,
            focusNode: focusNode,
            maxLines: maxLines,
            keyboardType: keyboardType,
            textCapitalization: textCapitalization,
            cursorColor: _StadiumNights.gold,
            style: GoogleFonts.outfit(
              color: Colors.white,
              fontSize: 15,
            ),
            onTap: () => setState(() {}),
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: GoogleFonts.outfit(
                color: Colors.white.withOpacity(0.3),
                fontSize: 15,
              ),
              prefixIcon: Icon(
                icon,
                color: _StadiumNights.gold.withOpacity(0.7),
                size: 22,
              ),
              border: InputBorder.none,
              enabledBorder: InputBorder.none,
              focusedBorder: InputBorder.none,
              errorBorder: InputBorder.none,
              disabledBorder: InputBorder.none,
              focusedErrorBorder: InputBorder.none,
              filled: false,
              contentPadding: EdgeInsets.symmetric(
                horizontal: 16,
                vertical: maxLines > 1 ? 16 : 18,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSlugField() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Text(
                  'Slug (URL)',
                  style: GoogleFonts.outfit(
                    fontSize: 14,
                    color: _StadiumNights.textSecondary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                Text(
                  ' *',
                  style: GoogleFonts.outfit(
                    fontSize: 14,
                    color: _StadiumNights.gold,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            // Auto toggle
            GestureDetector(
              onTap: () {
                HapticFeedback.selectionClick();
                setState(() {
                  _autoGenerateSlug = !_autoGenerateSlug;
                  if (_autoGenerateSlug) {
                    _slugController.text = _generateSlug(_nameController.text);
                  }
                });
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: _autoGenerateSlug
                      ? _StadiumNights.neonGreen.withOpacity(0.15)
                      : Colors.white.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: _autoGenerateSlug
                        ? _StadiumNights.neonGreen.withOpacity(0.3)
                        : Colors.white.withOpacity(0.1),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      _autoGenerateSlug ? Icons.auto_awesome : Icons.edit,
                      size: 14,
                      color: _autoGenerateSlug
                          ? _StadiumNights.neonGreen
                          : _StadiumNights.textMuted,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      _autoGenerateSlug ? 'Auto' : 'Manual',
                      style: GoogleFonts.outfit(
                        fontSize: 12,
                        color: _autoGenerateSlug
                            ? _StadiumNights.neonGreen
                            : _StadiumNights.textMuted,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: _autoGenerateSlug
                ? _StadiumNights.cardDark.withOpacity(0.5)
                : _StadiumNights.cardDark,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: _slugFocus.hasFocus
                  ? _StadiumNights.gold.withOpacity(0.5)
                  : Colors.white.withOpacity(0.1),
              width: 1.5,
            ),
          ),
          child: TextField(
            controller: _slugController,
            focusNode: _slugFocus,
            enabled: !_autoGenerateSlug,
            cursorColor: _StadiumNights.gold,
            style: GoogleFonts.jetBrainsMono(
              color: _autoGenerateSlug
                  ? _StadiumNights.textMuted
                  : Colors.white,
              fontSize: 14,
            ),
            onTap: () => setState(() {}),
            decoration: InputDecoration(
              hintText: 'liga-elite-soccer',
              hintStyle: GoogleFonts.jetBrainsMono(
                color: Colors.white.withOpacity(0.2),
                fontSize: 14,
              ),
              prefixIcon: Icon(
                Icons.link,
                color: _StadiumNights.gold.withOpacity(0.7),
                size: 22,
              ),
              border: InputBorder.none,
              enabledBorder: InputBorder.none,
              focusedBorder: InputBorder.none,
              errorBorder: InputBorder.none,
              disabledBorder: InputBorder.none,
              focusedErrorBorder: InputBorder.none,
              filled: false,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 18,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildNavigationButtons() {
    final isLastStep = _currentStep == _totalSteps - 1;

    return Container(
      padding: EdgeInsets.fromLTRB(
        20,
        16,
        20,
        MediaQuery.of(context).padding.bottom + 16,
      ),
      decoration: BoxDecoration(
        color: _StadiumNights.surfaceDark,
        border: Border(
          top: BorderSide(color: Colors.white.withOpacity(0.05)),
        ),
      ),
      child: Row(
        children: [
          // Back button
          if (_currentStep > 0)
            Expanded(
              child: GestureDetector(
                onTap: _previousStep,
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Center(
                    child: Text(
                      'Anterior',
                      style: GoogleFonts.outfit(
                        color: _StadiumNights.textSecondary,
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          if (_currentStep > 0) const SizedBox(width: 12),

          // Next/Create button
          Expanded(
            flex: _currentStep > 0 ? 1 : 2,
            child: GestureDetector(
              onTap: _nextStep,
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 16),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: isLastStep
                        ? [_StadiumNights.neonGreen, _StadiumNights.neonGreen.withOpacity(0.8)]
                        : [_StadiumNights.gold, _StadiumNights.amber],
                  ),
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [
                    BoxShadow(
                      color: (isLastStep
                              ? _StadiumNights.neonGreen
                              : _StadiumNights.gold)
                          .withOpacity(0.3),
                      blurRadius: 16,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      isLastStep ? 'Crear Liga' : 'Siguiente',
                      style: GoogleFonts.outfit(
                        color: Colors.black,
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Icon(
                      isLastStep ? Icons.check_circle : Icons.arrow_forward,
                      color: Colors.black,
                      size: 20,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLoadingOverlay() {
    return Container(
      color: Colors.black.withOpacity(0.7),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
        child: Center(
          child: Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: _StadiumNights.surfaceDark,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: _StadiumNights.neonGreen.withOpacity(0.3),
              ),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox(
                  width: 56,
                  height: 56,
                  child: CircularProgressIndicator(
                    strokeWidth: 3,
                    valueColor:
                        AlwaysStoppedAnimation<Color>(_StadiumNights.neonGreen),
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  'CREANDO LIGA',
                  style: GoogleFonts.bebasNeue(
                    fontSize: 20,
                    color: _StadiumNights.textPrimary,
                    letterSpacing: 2,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Configurando administrador...',
                  style: GoogleFonts.outfit(
                    fontSize: 14,
                    color: _StadiumNights.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Credentials Dialog - Premium design
class _CredentialsDialog extends StatefulWidget {
  final String leagueName;
  final String email;
  final String password;
  final VoidCallback onClose;

  const _CredentialsDialog({
    required this.leagueName,
    required this.email,
    required this.password,
    required this.onClose,
  });

  @override
  State<_CredentialsDialog> createState() => _CredentialsDialogState();
}

class _CredentialsDialogState extends State<_CredentialsDialog>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _fadeAnimation;
  bool _copied = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );

    _scaleAnimation = Tween<double>(begin: 0.8, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutBack),
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOut),
    );

    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _copyCredentials() {
    Clipboard.setData(ClipboardData(
      text: 'Email: ${widget.email}\nContraseña: ${widget.password}',
    ));
    HapticFeedback.mediumImpact();
    setState(() => _copied = true);
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Opacity(
          opacity: _fadeAnimation.value,
          child: Transform.scale(
            scale: _scaleAnimation.value,
            child: child,
          ),
        );
      },
      child: Dialog(
        backgroundColor: Colors.transparent,
        child: Container(
          constraints: const BoxConstraints(maxWidth: 400),
          decoration: BoxDecoration(
            color: _StadiumNights.surfaceDark,
            borderRadius: BorderRadius.circular(28),
            border: Border.all(
              color: _StadiumNights.neonGreen.withOpacity(0.3),
            ),
            boxShadow: [
              BoxShadow(
                color: _StadiumNights.neonGreen.withOpacity(0.2),
                blurRadius: 40,
                spreadRadius: 5,
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.all(28),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Success icon with animation
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        _StadiumNights.neonGreen,
                        _StadiumNights.neonGreen.withOpacity(0.8),
                      ],
                    ),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: _StadiumNights.neonGreen.withOpacity(0.4),
                        blurRadius: 24,
                        spreadRadius: 4,
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.check,
                    color: Colors.black,
                    size: 44,
                  ),
                ),
                const SizedBox(height: 24),

                // Title
                Text(
                  'LIGA CREADA',
                  style: GoogleFonts.bebasNeue(
                    fontSize: 28,
                    color: _StadiumNights.textPrimary,
                    letterSpacing: 3,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  widget.leagueName,
                  style: GoogleFonts.outfit(
                    fontSize: 16,
                    color: _StadiumNights.neonGreen,
                    fontWeight: FontWeight.w600,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),

                // Credentials card
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: _StadiumNights.cardDark,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: Colors.white.withOpacity(0.1),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            Icons.key,
                            color: _StadiumNights.gold,
                            size: 18,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Credenciales del Administrador',
                            style: GoogleFonts.outfit(
                              fontSize: 13,
                              color: _StadiumNights.gold,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Email
                      _buildCredentialRow('Email', widget.email),
                      const SizedBox(height: 12),

                      // Password
                      _buildCredentialRow('Contraseña', widget.password),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Warning
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: _StadiumNights.amber.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: _StadiumNights.amber.withOpacity(0.2),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.warning_amber,
                        color: _StadiumNights.amber,
                        size: 20,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Guarda estas credenciales, no se mostrarán de nuevo',
                          style: GoogleFonts.outfit(
                            fontSize: 12,
                            color: _StadiumNights.amber,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Buttons
                Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: _copyCredentials,
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          decoration: BoxDecoration(
                            color: _copied
                                ? _StadiumNights.neonGreen.withOpacity(0.15)
                                : Colors.white.withOpacity(0.05),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: _copied
                                  ? _StadiumNights.neonGreen.withOpacity(0.3)
                                  : Colors.white.withOpacity(0.1),
                            ),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                _copied ? Icons.check : Icons.copy,
                                color: _copied
                                    ? _StadiumNights.neonGreen
                                    : _StadiumNights.textSecondary,
                                size: 18,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                _copied ? 'Copiado' : 'Copiar',
                                style: GoogleFonts.outfit(
                                  color: _copied
                                      ? _StadiumNights.neonGreen
                                      : _StadiumNights.textSecondary,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: GestureDetector(
                        onTap: widget.onClose,
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [
                                _StadiumNights.neonGreen,
                                _StadiumNights.neonGreen.withOpacity(0.8),
                              ],
                            ),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Center(
                            child: Text(
                              'Aceptar',
                              style: GoogleFonts.outfit(
                                color: Colors.black,
                                fontWeight: FontWeight.w600,
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
      ),
    );
  }

  Widget _buildCredentialRow(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 80,
          child: Text(
            label,
            style: GoogleFonts.outfit(
              fontSize: 12,
              color: _StadiumNights.textMuted,
            ),
          ),
        ),
        Expanded(
          child: SelectableText(
            value,
            style: GoogleFonts.jetBrainsMono(
              fontSize: 13,
              color: _StadiumNights.textPrimary,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ],
    );
  }
}

/// Stadium Field Background
class _StadiumFieldBackground extends StatefulWidget {
  const _StadiumFieldBackground();

  @override
  State<_StadiumFieldBackground> createState() =>
      _StadiumFieldBackgroundState();
}

class _StadiumFieldBackgroundState extends State<_StadiumFieldBackground>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 20),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          return CustomPaint(
            painter: _StadiumFieldPainter(
              animationValue: _controller.value,
            ),
          );
        },
      ),
    );
  }
}

class _StadiumFieldPainter extends CustomPainter {
  final double animationValue;

  _StadiumFieldPainter({required this.animationValue});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = _StadiumNights.neonGreen.withOpacity(0.025)
      ..strokeWidth = 1.0
      ..style = PaintingStyle.stroke;

    final centerX = size.width / 2;
    final centerY = size.height / 2;

    // Center circle with subtle pulse
    final pulseScale = 1.0 + (math.sin(animationValue * 2 * math.pi) * 0.02);
    canvas.drawCircle(
      Offset(centerX, centerY),
      60 * pulseScale,
      paint,
    );

    // Center line
    canvas.drawLine(
      Offset(0, centerY),
      Offset(size.width, centerY),
      paint,
    );

    // Outer rectangle
    final pitchRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(
        size.width * 0.08,
        size.height * 0.2,
        size.width * 0.84,
        size.height * 0.6,
      ),
      const Radius.circular(4),
    );
    canvas.drawRRect(pitchRect, paint);
  }

  @override
  bool shouldRepaint(covariant _StadiumFieldPainter oldDelegate) {
    return oldDelegate.animationValue != animationValue;
  }
}
