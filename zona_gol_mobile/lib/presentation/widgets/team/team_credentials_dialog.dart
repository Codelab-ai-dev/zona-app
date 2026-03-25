import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

/// Stadium Nights Design System
class _SN {
  static const Color backgroundDark = Color(0xFF050508);
  static const Color surfaceDark = Color(0xFF0A0A0F);
  static const Color cardDark = Color(0xFF12121A);
  static const Color gold = Color(0xFFFFD700);
  static const Color neonGreen = Color(0xFF00FF7F);
  static const Color amber = Color(0xFFF59E0B);
  static const Color error = Color(0xFFEF4444);
  static const Color textPrimary = Color(0xFFFAFAFA);
  static const Color textSecondary = Color(0xFF9CA3AF);
  static const Color textMuted = Color(0xFF6B7280);
}

/// Dialog that displays generated owner credentials after team creation.
/// Shows email and password with copy-to-clipboard functionality.
class TeamCredentialsDialog extends StatelessWidget {
  final String email;
  final String password;

  const TeamCredentialsDialog({
    super.key,
    required this.email,
    required this.password,
  });

  /// Show the dialog from any context
  static Future<void> show(
    BuildContext context, {
    required String email,
    required String password,
  }) {
    return showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => TeamCredentialsDialog(
        email: email,
        password: password,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: _SN.surfaceDark,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(color: _SN.gold.withOpacity(0.3)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Icon
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: _SN.neonGreen.withOpacity(0.1),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: _SN.neonGreen.withOpacity(0.3),
                ),
              ),
              child: const Icon(
                Icons.check_circle_outline,
                color: _SN.neonGreen,
                size: 32,
              ),
            ),
            const SizedBox(height: 20),

            // Title
            Text(
              'CREDENCIALES DEL OWNER',
              style: GoogleFonts.bebasNeue(
                fontSize: 22,
                color: _SN.gold,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Equipo creado exitosamente',
              style: GoogleFonts.outfit(
                fontSize: 14,
                color: _SN.textSecondary,
              ),
            ),
            const SizedBox(height: 24),

            // Email field
            _buildCredentialField(
              context,
              label: 'Email',
              value: email,
              icon: Icons.email_outlined,
            ),
            const SizedBox(height: 12),

            // Password field
            _buildCredentialField(
              context,
              label: 'Contrasena',
              value: password,
              icon: Icons.lock_outline,
            ),
            const SizedBox(height: 20),

            // Warning text
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: _SN.amber.withOpacity(0.1),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: _SN.amber.withOpacity(0.3),
                ),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.warning_amber_rounded,
                    color: _SN.amber,
                    size: 20,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Guarda estas credenciales. La contrasena no se puede recuperar.',
                      style: GoogleFonts.outfit(
                        fontSize: 12,
                        color: _SN.amber,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Close button
            SizedBox(
              width: double.infinity,
              child: GestureDetector(
                onTap: () => Navigator.of(context).pop(),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 14),
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
                  child: Center(
                    child: Text(
                      'CERRAR',
                      style: GoogleFonts.bebasNeue(
                        fontSize: 16,
                        color: Colors.black,
                        letterSpacing: 2,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCredentialField(
    BuildContext context, {
    required String label,
    required String value,
    required IconData icon,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: _SN.cardDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: _SN.gold.withOpacity(0.15),
        ),
      ),
      child: Row(
        children: [
          Icon(icon, color: _SN.gold, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: GoogleFonts.outfit(
                    fontSize: 11,
                    color: _SN.textMuted,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: GoogleFonts.outfit(
                    fontSize: 14,
                    color: _SN.textPrimary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          GestureDetector(
            onTap: () {
              Clipboard.setData(ClipboardData(text: value));
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    '$label copiado al portapapeles',
                    style: GoogleFonts.outfit(fontSize: 13),
                  ),
                  backgroundColor: _SN.neonGreen.withOpacity(0.9),
                  behavior: SnackBarBehavior.floating,
                  duration: const Duration(seconds: 2),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              );
            },
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: _SN.gold.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: _SN.gold.withOpacity(0.2),
                ),
              ),
              child: const Icon(
                Icons.copy,
                color: _SN.gold,
                size: 18,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
