import 'dart:ui';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';

/// Stadium Nights Design System
class _StadiumNights {
  static const Color backgroundDark = Color(0xFF050508);
  static const Color surfaceDark = Color(0xFF0A0A0F);
  static const Color cardDark = Color(0xFF12121A);

  static const Color gold = Color(0xFFFFD700);
  static const Color amber = Color(0xFFF59E0B);

  static const Color neonGreen = Color(0xFF00FF7F);
  static const Color neonBlue = Color(0xFF00BFFF);
  static const Color neonPurple = Color(0xFF8B5CF6);

  static const Color success = Color(0xFF10B981);
  static const Color error = Color(0xFFEF4444);
  static const Color warning = Color(0xFFF59E0B);

  static const Color textPrimary = Color(0xFFFAFAFA);
  static const Color textSecondary = Color(0xFF9CA3AF);
  static const Color textMuted = Color(0xFF6B7280);
}

/// Settings Screen - Stadium Nights Edition
class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen>
    with TickerProviderStateMixin {
  late AnimationController _headerController;
  late Animation<double> _headerAnimation;

  String _appVersion = '...';
  String _buildNumber = '...';
  bool _isLoading = false;

  // Settings
  bool _notificationsEnabled = true;
  bool _darkMode = true;
  bool _hapticFeedback = true;

  @override
  void initState() {
    super.initState();

    _headerController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    );

    _headerAnimation = CurvedAnimation(
      parent: _headerController,
      curve: Curves.easeOutCubic,
    );

    _headerController.forward();
    _loadAppInfo();
    _loadSettings();
  }

  Future<void> _loadAppInfo() async {
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      if (mounted) {
        setState(() {
          _appVersion = packageInfo.version;
          _buildNumber = packageInfo.buildNumber;
        });
      }
    } catch (e) {
      // Fallback values
      setState(() {
        _appVersion = '1.0.0';
        _buildNumber = '1';
      });
    }
  }

  Future<void> _loadSettings() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (mounted) {
        setState(() {
          _notificationsEnabled = prefs.getBool('notifications_enabled') ?? true;
          _darkMode = prefs.getBool('dark_mode') ?? true;
          _hapticFeedback = prefs.getBool('haptic_feedback') ?? true;
        });
      }
    } catch (e) {
      // Use default values
    }
  }

  Future<void> _saveSetting(String key, bool value) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(key, value);
    } catch (e) {
      // Handle error silently
    }
  }

  @override
  void dispose() {
    _headerController.dispose();
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
        body: Stack(
          children: [
            const _StadiumFieldBackground(),
            _buildSpotlightEffects(),
            SafeArea(
              child: Column(
                children: [
                  _buildHeader(),
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.fromLTRB(20, 16, 20, 100),
                      children: [
                        // App Preferences Section
                        _buildSectionHeader('PREFERENCIAS', Icons.tune),
                        const SizedBox(height: 12),
                        _buildSettingsCard([
                          _buildSwitchTile(
                            icon: Icons.notifications_active,
                            title: 'Notificaciones',
                            subtitle: 'Recibir alertas de partidos',
                            value: _notificationsEnabled,
                            color: _StadiumNights.neonGreen,
                            onChanged: (value) {
                              setState(() => _notificationsEnabled = value);
                              _saveSetting('notifications_enabled', value);
                            },
                          ),
                          _buildDivider(),
                          _buildSwitchTile(
                            icon: Icons.vibration,
                            title: 'Vibración',
                            subtitle: 'Feedback háptico en acciones',
                            value: _hapticFeedback,
                            color: _StadiumNights.neonBlue,
                            onChanged: (value) {
                              setState(() => _hapticFeedback = value);
                              _saveSetting('haptic_feedback', value);
                              if (value) HapticFeedback.mediumImpact();
                            },
                          ),
                          _buildDivider(),
                          _buildSwitchTile(
                            icon: Icons.dark_mode,
                            title: 'Modo Oscuro',
                            subtitle: 'Tema Stadium Nights',
                            value: _darkMode,
                            color: _StadiumNights.neonPurple,
                            enabled: false, // Always dark for now
                            onChanged: (value) {
                              // Show message that dark mode is always on
                              _showInfoMessage('El modo oscuro siempre está activo');
                            },
                          ),
                        ]),
                        const SizedBox(height: 24),

                        // Data Section
                        _buildSectionHeader('DATOS Y ALMACENAMIENTO', Icons.storage),
                        const SizedBox(height: 12),
                        _buildSettingsCard([
                          _buildActionTile(
                            icon: Icons.cached,
                            title: 'Limpiar Caché',
                            subtitle: 'Liberar espacio de almacenamiento',
                            color: _StadiumNights.amber,
                            onTap: () => _showClearCacheDialog(),
                          ),
                          _buildDivider(),
                          _buildActionTile(
                            icon: Icons.sync,
                            title: 'Sincronizar Datos',
                            subtitle: 'Actualizar información del servidor',
                            color: _StadiumNights.neonBlue,
                            isLoading: _isLoading,
                            onTap: () => _syncData(),
                          ),
                        ]),
                        const SizedBox(height: 24),

                        // Support Section
                        _buildSectionHeader('SOPORTE', Icons.help_outline),
                        const SizedBox(height: 12),
                        _buildSettingsCard([
                          _buildActionTile(
                            icon: Icons.bug_report,
                            title: 'Reportar Problema',
                            subtitle: 'Enviar reporte de error',
                            color: _StadiumNights.error,
                            onTap: () => _reportBug(),
                          ),
                          _buildDivider(),
                          _buildActionTile(
                            icon: Icons.email,
                            title: 'Contactar Soporte',
                            subtitle: 'soporte@zonagol.com',
                            color: _StadiumNights.neonGreen,
                            onTap: () => _contactSupport(),
                          ),
                        ]),
                        const SizedBox(height: 24),

                        // About Section
                        _buildSectionHeader('ACERCA DE', Icons.info_outline),
                        const SizedBox(height: 12),
                        _buildSettingsCard([
                          _buildInfoTile(
                            icon: Icons.sports_soccer,
                            title: 'Zona Gol',
                            subtitle: 'Gestión de ligas de fútbol',
                            color: _StadiumNights.gold,
                          ),
                          _buildDivider(),
                          _buildInfoTile(
                            icon: Icons.new_releases,
                            title: 'Versión',
                            subtitle: '$_appVersion ($_buildNumber)',
                            color: _StadiumNights.neonBlue,
                          ),
                          _buildDivider(),
                          _buildActionTile(
                            icon: Icons.description,
                            title: 'Términos y Condiciones',
                            subtitle: 'Leer términos de uso',
                            color: _StadiumNights.textMuted,
                            onTap: () => _openTerms(),
                          ),
                          _buildDivider(),
                          _buildActionTile(
                            icon: Icons.privacy_tip,
                            title: 'Política de Privacidad',
                            subtitle: 'Leer política de privacidad',
                            color: _StadiumNights.textMuted,
                            onTap: () => _openPrivacy(),
                          ),
                        ]),
                        const SizedBox(height: 32),

                        // Developer Info
                        _buildDeveloperInfo(),
                      ],
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

  Widget _buildSpotlightEffects() {
    return AnimatedBuilder(
      animation: _headerAnimation,
      builder: (context, child) {
        return Stack(
          children: [
            Positioned(
              top: -100,
              right: -50,
              child: Opacity(
                opacity: 0.25 * _headerAnimation.value,
                child: Container(
                  width: 300,
                  height: 400,
                  decoration: BoxDecoration(
                    gradient: RadialGradient(
                      colors: [
                        _StadiumNights.neonPurple.withOpacity(0.4),
                        _StadiumNights.neonPurple.withOpacity(0.1),
                        Colors.transparent,
                      ],
                      stops: const [0.0, 0.4, 1.0],
                    ),
                  ),
                ),
              ),
            ),
            Positioned(
              top: -80,
              left: -80,
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
                    onTap: () {
                      HapticFeedback.lightImpact();
                      Navigator.pop(context);
                    },
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: _StadiumNights.cardDark,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: _StadiumNights.neonPurple.withOpacity(0.2),
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: _StadiumNights.neonPurple.withOpacity(0.1),
                            blurRadius: 12,
                            spreadRadius: -2,
                          ),
                        ],
                      ),
                      child: Icon(
                        Icons.arrow_back,
                        color: _StadiumNights.neonPurple,
                        size: 20,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),

                  // Title with icon
                  _buildAnimatedIcon(),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'CONFIGURACIÓN',
                        style: GoogleFonts.bebasNeue(
                          fontSize: 28,
                          color: _StadiumNights.textPrimary,
                          letterSpacing: 3,
                          height: 1,
                        ),
                      ),
                      Text(
                        'Ajustes del sistema',
                        style: GoogleFonts.outfit(
                          fontSize: 12,
                          color: _StadiumNights.neonPurple,
                          letterSpacing: 0.5,
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
  }

  Widget _buildAnimatedIcon() {
    return AnimatedBuilder(
      animation: _headerAnimation,
      builder: (context, child) {
        return Transform.scale(
          scale: 0.8 + (0.2 * _headerAnimation.value),
          child: Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  _StadiumNights.neonPurple,
                  _StadiumNights.neonBlue,
                ],
              ),
              borderRadius: BorderRadius.circular(14),
              boxShadow: [
                BoxShadow(
                  color: _StadiumNights.neonPurple.withOpacity(0.4 * _headerAnimation.value),
                  blurRadius: 20,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: const Icon(
              Icons.settings,
              color: Colors.white,
              size: 26,
            ),
          ),
        );
      },
    );
  }

  Widget _buildSectionHeader(String title, IconData icon) {
    return Row(
      children: [
        Icon(
          icon,
          size: 16,
          color: _StadiumNights.textMuted,
        ),
        const SizedBox(width: 8),
        Text(
          title,
          style: GoogleFonts.bebasNeue(
            fontSize: 14,
            color: _StadiumNights.textMuted,
            letterSpacing: 2,
          ),
        ),
      ],
    );
  }

  Widget _buildSettingsCard(List<Widget> children) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Colors.white.withOpacity(0.08),
                Colors.white.withOpacity(0.03),
              ],
            ),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: Colors.white.withOpacity(0.08),
            ),
          ),
          child: Column(children: children),
        ),
      ),
    );
  }

  Widget _buildDivider() {
    return Container(
      height: 1,
      margin: const EdgeInsets.symmetric(horizontal: 16),
      color: Colors.white.withOpacity(0.05),
    );
  }

  Widget _buildSwitchTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required bool value,
    required Color color,
    required Function(bool) onChanged,
    bool enabled = true,
  }) {
    return Opacity(
      opacity: enabled ? 1.0 : 0.5,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: color.withOpacity(0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: GoogleFonts.outfit(
                      fontSize: 15,
                      color: _StadiumNights.textPrimary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: GoogleFonts.outfit(
                      fontSize: 12,
                      color: _StadiumNights.textMuted,
                    ),
                  ),
                ],
              ),
            ),
            Switch(
              value: value,
              onChanged: enabled ? onChanged : null,
              activeColor: color,
              activeTrackColor: color.withOpacity(0.3),
              inactiveThumbColor: _StadiumNights.textMuted,
              inactiveTrackColor: Colors.white.withOpacity(0.1),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
    bool isLoading = false,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: isLoading ? null : onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: color.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: isLoading
                    ? Padding(
                        padding: const EdgeInsets.all(10),
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(color),
                        ),
                      )
                    : Icon(icon, color: color, size: 20),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: GoogleFonts.outfit(
                        fontSize: 15,
                        color: _StadiumNights.textPrimary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      subtitle,
                      style: GoogleFonts.outfit(
                        fontSize: 12,
                        color: _StadiumNights.textMuted,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right,
                color: _StadiumNights.textMuted,
                size: 20,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: color.withOpacity(0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: GoogleFonts.outfit(
                    fontSize: 15,
                    color: _StadiumNights.textPrimary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  subtitle,
                  style: GoogleFonts.outfit(
                    fontSize: 12,
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

  Widget _buildDeveloperInfo() {
    return Center(
      child: Column(
        children: [
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  _StadiumNights.gold.withOpacity(0.2),
                  _StadiumNights.amber.withOpacity(0.1),
                ],
              ),
              shape: BoxShape.circle,
              border: Border.all(
                color: _StadiumNights.gold.withOpacity(0.3),
              ),
            ),
            child: Icon(
              Icons.sports_soccer,
              color: _StadiumNights.gold,
              size: 30,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'ZONA GOL',
            style: GoogleFonts.bebasNeue(
              fontSize: 24,
              color: _StadiumNights.textPrimary,
              letterSpacing: 4,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Hecho con pasión por el fútbol',
            style: GoogleFonts.outfit(
              fontSize: 13,
              color: _StadiumNights.textMuted,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '© 2024 Zona Gol. Todos los derechos reservados.',
            style: GoogleFonts.outfit(
              fontSize: 11,
              color: _StadiumNights.textMuted.withOpacity(0.6),
            ),
          ),
        ],
      ),
    );
  }

  // Actions
  void _showClearCacheDialog() {
    showDialog(
      context: context,
      builder: (dialogContext) => Dialog(
        backgroundColor: Colors.transparent,
        child: Container(
          constraints: const BoxConstraints(maxWidth: 360),
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: _StadiumNights.surfaceDark,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: _StadiumNights.amber.withOpacity(0.3)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: _StadiumNights.amber.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.cached,
                  color: _StadiumNights.amber,
                  size: 32,
                ),
              ),
              const SizedBox(height: 20),
              Text(
                'LIMPIAR CACHÉ',
                style: GoogleFonts.bebasNeue(
                  fontSize: 22,
                  color: _StadiumNights.textPrimary,
                  letterSpacing: 2,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                '¿Limpiar datos en caché?\nEsto liberará espacio pero puede ralentizar la app temporalmente.',
                textAlign: TextAlign.center,
                style: GoogleFonts.outfit(
                  fontSize: 14,
                  color: _StadiumNights.textSecondary,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => Navigator.pop(dialogContext),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.05),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Center(
                          child: Text(
                            'Cancelar',
                            style: GoogleFonts.outfit(
                              color: _StadiumNights.textSecondary,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: GestureDetector(
                      onTap: () async {
                        Navigator.pop(dialogContext);
                        await _clearCache();
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        decoration: BoxDecoration(
                          color: _StadiumNights.amber,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Center(
                          child: Text(
                            'Limpiar',
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
    );
  }

  Future<void> _clearCache() async {
    HapticFeedback.mediumImpact();
    // Clear shared preferences cache (except important settings)
    try {
      final prefs = await SharedPreferences.getInstance();
      // Keep user settings, clear cache keys
      final keysToRemove = prefs.getKeys().where((key) => key.startsWith('cache_'));
      for (final key in keysToRemove) {
        await prefs.remove(key);
      }
      _showSuccessMessage('Caché limpiado correctamente');
    } catch (e) {
      _showErrorMessage('Error al limpiar caché');
    }
  }

  Future<void> _syncData() async {
    if (_isLoading) return;

    setState(() => _isLoading = true);
    HapticFeedback.mediumImpact();

    try {
      // Simulate sync - in a real app this would refresh data from server
      await Future.delayed(const Duration(seconds: 2));

      if (mounted) {
        _showSuccessMessage('Datos sincronizados');
      }
    } catch (e) {
      if (mounted) {
        _showErrorMessage('Error al sincronizar');
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _reportBug() {
    HapticFeedback.lightImpact();
    // Open email with bug report template
    final Uri emailUri = Uri(
      scheme: 'mailto',
      path: 'soporte@zonagol.com',
      query: 'subject=Reporte de Error - Zona Gol v$_appVersion&body=Describe el problema:\n\n\nPasos para reproducir:\n\n\nDispositivo: \nVersión: $_appVersion ($_buildNumber)',
    );
    _launchUrl(emailUri.toString());
  }

  void _contactSupport() {
    HapticFeedback.lightImpact();
    final Uri emailUri = Uri(
      scheme: 'mailto',
      path: 'soporte@zonagol.com',
      query: 'subject=Soporte - Zona Gol',
    );
    _launchUrl(emailUri.toString());
  }

  void _openTerms() {
    HapticFeedback.lightImpact();
    _launchUrl('https://zonagol.com/terminos');
  }

  void _openPrivacy() {
    HapticFeedback.lightImpact();
    _launchUrl('https://zonagol.com/privacidad');
  }

  Future<void> _launchUrl(String urlString) async {
    try {
      final Uri url = Uri.parse(urlString);
      if (await canLaunchUrl(url)) {
        await launchUrl(url, mode: LaunchMode.externalApplication);
      } else {
        _showErrorMessage('No se pudo abrir el enlace');
      }
    } catch (e) {
      _showErrorMessage('Error al abrir enlace');
    }
  }

  void _showInfoMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(Icons.info_outline, color: Colors.black, size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: GoogleFonts.outfit(
                  color: Colors.black,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
        backgroundColor: _StadiumNights.neonBlue,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  void _showSuccessMessage(String message) {
    HapticFeedback.mediumImpact();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle, color: Colors.black, size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: GoogleFonts.outfit(
                  color: Colors.black,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
        backgroundColor: _StadiumNights.neonGreen,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  void _showErrorMessage(String message) {
    HapticFeedback.heavyImpact();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.error, color: Colors.white, size: 20),
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
}

/// Stadium Field Background
class _StadiumFieldBackground extends StatefulWidget {
  const _StadiumFieldBackground();

  @override
  State<_StadiumFieldBackground> createState() => _StadiumFieldBackgroundState();
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
      ..color = _StadiumNights.neonPurple.withOpacity(0.02)
      ..strokeWidth = 1.0
      ..style = PaintingStyle.stroke;

    final centerX = size.width / 2;
    final centerY = size.height / 2;

    final pulseScale = 1.0 + (math.sin(animationValue * 2 * math.pi) * 0.02);
    canvas.drawCircle(
      Offset(centerX, centerY),
      60 * pulseScale,
      paint,
    );

    canvas.drawLine(
      Offset(0, centerY),
      Offset(size.width, centerY),
      paint,
    );

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
