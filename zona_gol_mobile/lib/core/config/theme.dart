import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'zona_brand.dart';

/// App theme: the Zona Gol module of Zona OS. The app is always dark (every
/// screen is designed on carbon), with the Zona Gol green for actions.
abstract final class AppTheme {
  static const Color primary = ZonaColors.gol;

  static ThemeData get theme {
    final base = ThemeData(useMaterial3: true, brightness: Brightness.dark);
    final text = GoogleFonts.interTextTheme(base.textTheme).apply(
      bodyColor: ZonaColors.text,
      displayColor: ZonaColors.text,
    );
    TextStyle? title(TextStyle? s) =>
        s == null ? null : GoogleFonts.montserrat(textStyle: s, fontWeight: FontWeight.w700);

    const radius = BorderRadius.all(Radius.circular(12));
    OutlineInputBorder outline(Color color, [double width = 1]) =>
        OutlineInputBorder(borderRadius: radius, borderSide: BorderSide(color: color, width: width));

    return base.copyWith(
      scaffoldBackgroundColor: ZonaColors.background,
      colorScheme: const ColorScheme.dark(
        primary: ZonaColors.gol,
        onPrimary: ZonaColors.onGol,
        secondary: ZonaColors.zona,
        onSecondary: Colors.white,
        tertiary: ZonaColors.info,
        error: ZonaColors.error,
        onError: Colors.white,
        surface: ZonaColors.surface,
        onSurface: ZonaColors.text,
        onSurfaceVariant: ZonaColors.textMuted,
        surfaceContainerHighest: ZonaColors.raised,
        outline: ZonaColors.line,
        outlineVariant: ZonaColors.lineSoft,
      ),
      textTheme: text.copyWith(
        displayLarge: title(text.displayLarge),
        displayMedium: title(text.displayMedium),
        displaySmall: title(text.displaySmall),
        headlineLarge: title(text.headlineLarge),
        headlineMedium: title(text.headlineMedium),
        headlineSmall: title(text.headlineSmall),
        titleLarge: title(text.titleLarge),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: ZonaColors.background,
        foregroundColor: ZonaColors.text,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: GoogleFonts.montserrat(fontSize: 18, fontWeight: FontWeight.w700, color: ZonaColors.text),
      ),
      cardTheme: const CardThemeData(
        color: ZonaColors.surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(16)),
          side: BorderSide(color: ZonaColors.lineSoft),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: ZonaColors.gol,
          foregroundColor: ZonaColors.onGol,
          elevation: 0,
          minimumSize: const Size(64, 48),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: const RoundedRectangleBorder(borderRadius: radius),
          textStyle: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 15),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: ZonaColors.gol,
          foregroundColor: ZonaColors.onGol,
          minimumSize: const Size(64, 48),
          shape: const RoundedRectangleBorder(borderRadius: radius),
          textStyle: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 15),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: ZonaColors.text,
          minimumSize: const Size(64, 48),
          side: const BorderSide(color: ZonaColors.line),
          shape: const RoundedRectangleBorder(borderRadius: radius),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(foregroundColor: ZonaColors.gol),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: ZonaColors.panel,
        hintStyle: const TextStyle(color: ZonaColors.textSubtle),
        labelStyle: const TextStyle(color: ZonaColors.textMuted),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: outline(ZonaColors.line),
        enabledBorder: outline(ZonaColors.line),
        focusedBorder: outline(ZonaColors.gol, 2),
        errorBorder: outline(ZonaColors.error),
        focusedErrorBorder: outline(ZonaColors.error, 2),
      ),
      dialogTheme: const DialogThemeData(
        backgroundColor: ZonaColors.surface,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(20))),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: ZonaColors.surface,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      ),
      snackBarTheme: const SnackBarThemeData(
        backgroundColor: ZonaColors.raised,
        contentTextStyle: TextStyle(color: ZonaColors.text),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: radius),
      ),
      chipTheme: const ChipThemeData(
        backgroundColor: ZonaColors.raised,
        selectedColor: ZonaColors.gol,
        labelStyle: TextStyle(color: ZonaColors.text),
        secondaryLabelStyle: TextStyle(color: ZonaColors.onGol),
        side: BorderSide(color: ZonaColors.line),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(10))),
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(color: ZonaColors.gol),
      dividerTheme: const DividerThemeData(color: ZonaColors.lineSoft, thickness: 1, space: 1),
      iconTheme: const IconThemeData(color: ZonaColors.text, size: 24),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith(
            (s) => s.contains(WidgetState.selected) ? ZonaColors.onGol : ZonaColors.textMuted),
        trackColor: WidgetStateProperty.resolveWith(
            (s) => s.contains(WidgetState.selected) ? ZonaColors.gol : ZonaColors.raised),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: ZonaColors.surface,
        indicatorColor: ZonaColors.gol.withValues(alpha: 0.18),
        labelTextStyle: WidgetStateProperty.all(GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600)),
      ),
    );
  }
}
