import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Zona OS / Zona Gol brand palette (Zona OS Brand Kit v1.1 and Zona Gol
/// Brand Kit v2.1).
///
/// The app is the Zona Gol module of Zona OS: actions and accents use the
/// energy green [gol] with dark text on fills (white on #A3FF12 fails
/// contrast); purple [zona] is reserved for the Zona OS identity.
abstract final class ZonaColors {
  // Zona OS identity.
  static const zona = Color(0xFF8B4DF6);
  static const zonaLight = Color(0xFFA66CFF);
  static const zonaDark = Color(0xFF4A28D8);

  // Zona Gol product accent.
  static const gol = Color(0xFFA3FF12);
  static const golLight = Color(0xFFC4FF66);
  static const golDark = Color(0xFF76C000);
  /// Text and icons drawn on a [gol] fill.
  static const onGol = Color(0xFF080F1A);

  // Carbon surfaces, darkest to lightest.
  static const background = Color(0xFF080F1A);
  static const panel = Color(0xFF0C1422);
  static const surface = Color(0xFF101827);
  static const raised = Color(0xFF161F33);
  static const line = Color(0xFF303A4C);
  /// Hairlines between cards and rows.
  static const lineSoft = Color(0xFF1E2940);

  // Text on carbon.
  static const text = Color(0xFFF5F7FF);
  static const textMuted = Color(0xFF9EACC4);
  static const textSubtle = Color(0xFF6B7891);

  // Semantic states. Success stays emerald so a win or an "active" badge is
  // never mistaken for an action.
  static const success = Color(0xFF10B981);
  static const error = Color(0xFFEF4444);
  static const warning = Color(0xFFF59E0B);
  static const info = Color(0xFF38BDF8);
}

/// Brand type: Montserrat for titles and figures, Inter for UI and data.
abstract final class ZonaType {
  /// Titles, scoreboards and big numbers.
  static TextStyle display({
    double fontSize = 24,
    FontWeight fontWeight = FontWeight.w800,
    Color? color,
    double? letterSpacing,
    double? height,
  }) =>
      GoogleFonts.montserrat(
        fontSize: fontSize,
        fontWeight: fontWeight,
        color: color,
        letterSpacing: letterSpacing ?? -0.02 * fontSize,
        height: height,
      );

  /// Replacement for the former Bebas Neue headings (condensed caps with
  /// wide tracking). Montserrat is much wider, so the size shrinks a little
  /// and the tracking mostly goes away: the text keeps roughly the same
  /// footprint and layouts designed for Bebas do not overflow.
  static TextStyle headline({
    double fontSize = 16,
    Color? color,
    double? letterSpacing,
    double? height,
    List<Shadow>? shadows,
  }) {
    final size = fontSize * 0.86;
    return GoogleFonts.montserrat(
      fontSize: size,
      fontWeight: FontWeight.w800,
      color: color,
      letterSpacing: (letterSpacing ?? 0) * 0.15 - 0.01 * size,
      height: height,
      shadows: shadows,
    );
  }

  /// Body, labels and data.
  static TextStyle ui({
    double fontSize = 14,
    FontWeight fontWeight = FontWeight.w400,
    Color? color,
    double? letterSpacing,
    double? height,
  }) =>
      GoogleFonts.inter(
        fontSize: fontSize,
        fontWeight: fontWeight,
        color: color,
        letterSpacing: letterSpacing,
        height: height,
      );
}

/// Zona OS symbol: three rounded blocks, same path as the official SVG.
class ZonaMark extends StatelessWidget {
  const ZonaMark({super.key, this.size = 32, this.monochrome});

  /// Height of the mark.
  final double size;
  final Color? monochrome;

  @override
  Widget build(BuildContext context) => CustomPaint(
        size: Size(size * 139 / 106, size),
        painter: _ZonaMarkPainter(monochrome: monochrome),
      );
}

class _ZonaMarkPainter extends CustomPainter {
  _ZonaMarkPainter({this.monochrome});

  final Color? monochrome;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.scale(size.width / 139, size.height / 106);
    final path = Path()
      ..moveTo(89, 0)
      ..lineTo(135, 0)
      ..quadraticBezierTo(138, 0, 137, 4)
      ..lineTo(128, 23)
      ..quadraticBezierTo(124, 29, 118, 29)
      ..lineTo(74, 29)
      ..quadraticBezierTo(72, 29, 74, 25)
      ..lineTo(82, 8)
      ..quadraticBezierTo(85, 0, 89, 0)
      ..close()
      ..moveTo(19, 30)
      ..lineTo(67, 30)
      ..quadraticBezierTo(70, 30, 69, 34)
      ..lineTo(60, 53)
      ..quadraticBezierTo(57, 61, 43, 61)
      ..lineTo(2, 61)
      ..quadraticBezierTo(-1, 61, 0, 57)
      ..lineTo(10, 36)
      ..quadraticBezierTo(14, 30, 19, 30)
      ..close()
      ..moveTo(67, 55)
      ..lineTo(124, 55)
      ..quadraticBezierTo(128, 55, 126, 61)
      ..lineTo(112, 92)
      ..quadraticBezierTo(107, 102, 96, 103)
      ..lineTo(45, 103)
      ..quadraticBezierTo(41, 103, 43, 98)
      ..lineTo(57, 68)
      ..quadraticBezierTo(62, 55, 67, 55)
      ..close();
    final paint = Paint()..style = PaintingStyle.fill;
    if (monochrome != null) {
      paint.color = monochrome!;
    } else {
      paint.shader = const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Color(0xFFB266FF), ZonaColors.zona, Color(0xFF692CE4)],
        stops: [0, 0.58, 1],
      ).createShader(const Rect.fromLTWH(0, 0, 139, 106));
    }
    canvas.drawPath(path, paint);
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _ZonaMarkPainter old) => old.monochrome != monochrome;
}

/// Horizontal Zona OS lockup: symbol, "Zona" in white and "OS" in purple.
class ZonaOSLogo extends StatelessWidget {
  const ZonaOSLogo({super.key, this.height = 28, this.descriptor = false});

  /// Height of the symbol; the wordmark scales with it.
  final double height;

  /// Shows "PLATAFORMA OPERATIVA" under the wordmark.
  final bool descriptor;

  @override
  Widget build(BuildContext context) {
    final word = height * 0.82;
    return Semantics(
      label: 'Zona OS',
      image: true,
      excludeSemantics: true,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          ZonaMark(size: height),
          SizedBox(width: height * 0.32),
          Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text.rich(
                TextSpan(children: [
                  const TextSpan(text: 'Zona ', style: TextStyle(color: ZonaColors.text)),
                  const TextSpan(text: 'OS', style: TextStyle(color: ZonaColors.zona)),
                ]),
                style: ZonaType.display(fontSize: word, height: 1, letterSpacing: -0.045 * word),
              ),
              if (descriptor)
                Padding(
                  padding: EdgeInsets.only(top: height * 0.12),
                  child: Text(
                    'PLATAFORMA OPERATIVA',
                    style: ZonaType.ui(
                      fontSize: height * 0.26,
                      fontWeight: FontWeight.w500,
                      color: ZonaColors.textMuted,
                      letterSpacing: height * 0.1,
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Zona Gol horizontal logo. Approved raster art (kit v2.1): never redrawn
/// or stretched, only scaled with its aspect ratio.
class ZonaGolLogo extends StatelessWidget {
  const ZonaGolLogo({super.key, this.width = 280});

  final double width;

  @override
  Widget build(BuildContext context) => Image.asset(
        'assets/brand/zona-gol-logo.png',
        width: width,
        fit: BoxFit.contain,
        filterQuality: FilterQuality.medium,
        semanticLabel: 'Zona Gol, gestión de ligas de fútbol',
      );
}

/// Zona Gol symbol: the ball with its green motion trail.
class ZonaGolMark extends StatelessWidget {
  const ZonaGolMark({super.key, this.height = 32, this.semanticLabel});

  final double height;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) => Image.asset(
        'assets/brand/zona-gol-simbolo.png',
        height: height,
        fit: BoxFit.contain,
        filterQuality: FilterQuality.medium,
        semanticLabel: semanticLabel,
        excludeFromSemantics: semanticLabel == null,
      );
}
