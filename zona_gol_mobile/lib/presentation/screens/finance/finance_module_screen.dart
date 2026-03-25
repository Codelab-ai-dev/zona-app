import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/utils/feature_gate.dart';
import 'finance_dashboard_screen.dart';

/// Stadium Nights Design System
class _SN {
  static const Color backgroundDark = Color(0xFF050508);
  static const Color surfaceDark = Color(0xFF0A0A0F);
  static const Color cardDark = Color(0xFF12121A);
  static const Color gold = Color(0xFFFFD700);
  static const Color neonGreen = Color(0xFF00FF7F);
  static const Color textPrimary = Color(0xFFFAFAFA);
  static const Color textSecondary = Color(0xFF9CA3AF);
  static const Color textMuted = Color(0xFF6B7280);
}

/// Finance Module Screen
/// Feature-gated entry point for the finance module.
/// Checks FeatureGate to verify the league has finances enabled.
class FinanceModuleScreen extends StatefulWidget {
  final String leagueId;
  final String leagueName;

  const FinanceModuleScreen({
    super.key,
    required this.leagueId,
    required this.leagueName,
  });

  @override
  State<FinanceModuleScreen> createState() => _FinanceModuleScreenState();
}

class _FinanceModuleScreenState extends State<FinanceModuleScreen> {
  bool _isLoading = true;
  bool _isEnabled = false;

  @override
  void initState() {
    super.initState();
    _checkFeature();
  }

  Future<void> _checkFeature() async {
    final enabled =
        await FeatureGate.hasFeature(widget.leagueId, 'finances');
    if (mounted) {
      setState(() {
        _isEnabled = enabled;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return AnnotatedRegion<SystemUiOverlayStyle>(
        value: SystemUiOverlayStyle.light.copyWith(
          statusBarColor: Colors.transparent,
          systemNavigationBarColor: _SN.backgroundDark,
        ),
        child: Scaffold(
          backgroundColor: _SN.backgroundDark,
          body: Center(
            child: CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(_SN.gold),
            ),
          ),
        ),
      );
    }

    if (_isEnabled) {
      return FinanceDashboardScreen(
        leagueId: widget.leagueId,
        leagueName: widget.leagueName,
      );
    }

    return _buildLockedScreen(context);
  }

  Widget _buildLockedScreen(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light.copyWith(
        statusBarColor: Colors.transparent,
        systemNavigationBarColor: _SN.backgroundDark,
      ),
      child: Scaffold(
        backgroundColor: _SN.backgroundDark,
        appBar: AppBar(
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
              child: Icon(Icons.arrow_back, color: _SN.gold, size: 18),
            ),
            onPressed: () => Navigator.pop(context),
          ),
          title: Text(
            'FINANZAS',
            style: GoogleFonts.bebasNeue(
              fontSize: 22,
              color: _SN.textPrimary,
              letterSpacing: 2,
            ),
          ),
          centerTitle: true,
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(40),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    color: _SN.cardDark,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: _SN.gold.withOpacity(0.3),
                      width: 2,
                    ),
                  ),
                  child: Icon(
                    Icons.lock_outline,
                    size: 48,
                    color: _SN.gold.withOpacity(0.6),
                  ),
                ),
                const SizedBox(height: 32),
                Text(
                  'MODULO NO DISPONIBLE',
                  style: GoogleFonts.bebasNeue(
                    fontSize: 24,
                    color: _SN.textPrimary,
                    letterSpacing: 2,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'El modulo de finanzas no esta habilitado para esta liga. '
                  'Contacta al administrador para activar esta funcion.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.outfit(
                    fontSize: 14,
                    color: _SN.textSecondary,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 32),
                GestureDetector(
                  onTap: () => Navigator.pop(context),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 32,
                      vertical: 14,
                    ),
                    decoration: BoxDecoration(
                      color: _SN.cardDark,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: _SN.gold.withOpacity(0.3),
                      ),
                    ),
                    child: Text(
                      'VOLVER',
                      style: GoogleFonts.bebasNeue(
                        fontSize: 16,
                        color: _SN.gold,
                        letterSpacing: 1.5,
                      ),
                    ),
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
