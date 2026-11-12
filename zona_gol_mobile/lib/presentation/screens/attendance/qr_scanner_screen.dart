import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../../core/di/injection.dart';
import '../../../domain/entities/attendance_entity.dart';
import '../../../domain/entities/user_entity.dart';
import '../../bloc/attendance/attendance_bloc.dart';
import '../../bloc/attendance/attendance_event.dart';
import '../../bloc/attendance/attendance_state.dart';

/// Stadium Nights Design System
class _SN {
  static const Color backgroundDark = Color(0xFF050508);
  static const Color gold = Color(0xFFFFD700);
  static const Color neonGreen = Color(0xFF00FF7F);
  static const Color neonBlue = Color(0xFF00BFFF);
  static const Color error = Color(0xFFEF4444);
  static const Color textPrimary = Color(0xFFFAFAFA);
  static const Color textSecondary = Color(0xFF9CA3AF);
  static const Color textMuted = Color(0xFF6B7280);
}

/// QR Scanner Screen — scans player QR codes for attendance.
/// The match is resolved from the scanned player: the team's matches today.
class QrScannerScreen extends StatelessWidget {
  final UserEntity user;

  const QrScannerScreen({
    super.key,
    required this.user,
  });

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => sl<AttendanceBloc>(),
      child: const _QrScannerView(),
    );
  }
}

class _QrScannerView extends StatefulWidget {
  const _QrScannerView();

  @override
  State<_QrScannerView> createState() => _QrScannerViewState();
}

class _QrScannerViewState extends State<_QrScannerView> {
  late MobileScannerController _scannerController;
  String? _lastScannedCode;
  bool _isFlashOn = false;
  bool _cameraError = false;
  final _manualInputController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _scannerController = MobileScannerController(
      detectionSpeed: DetectionSpeed.normal,
      facing: CameraFacing.back,
    );
  }

  @override
  void dispose() {
    _scannerController.dispose();
    _manualInputController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light,
      ),
    );

    return Scaffold(
      backgroundColor: _SN.backgroundDark,
      body: BlocConsumer<AttendanceBloc, AttendanceState>(
        listener: (context, state) {
          if (state is TodayMatchesLoading) {
            _scannerController.stop();
          } else if (state is AttendanceRegistered) {
            HapticFeedback.heavyImpact();
          } else if (state is QRScanError) {
            HapticFeedback.vibrate();
          }
        },
        builder: (context, state) {
          if (state is AttendanceRegistered) {
            return _buildSuccessView(context, state);
          }
          if (state is TodayMatchesLoading ||
              state is TodayMatchesError ||
              state is QRScanned ||
              state is AttendanceRegistering) {
            return _buildConfirmationView(context, state);
          }

          return _buildScannerView(context, state);
        },
      ),
    );
  }

  // ==================== Scanner View ====================

  Widget _buildScannerView(BuildContext context, AttendanceState state) {
    return Stack(
      children: [
        // Camera or fallback
        if (_cameraError)
          _buildManualInputView(context)
        else
          MobileScanner(
            controller: _scannerController,
            onDetect: _onDetect,
            errorBuilder: (context, error) {
              WidgetsBinding.instance.addPostFrameCallback((_) {
                if (mounted && !_cameraError) {
                  setState(() => _cameraError = true);
                }
              });
              return const SizedBox.shrink();
            },
          ),

        // Overlay (only when camera is active)
        if (!_cameraError) _buildScanOverlay(),

        // Top bar
        SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                _buildCircleButton(
                  icon: Icons.arrow_back,
                  onTap: () => Navigator.pop(context),
                ),
                const Spacer(),
              ],
            ),
          ),
        ),

        // Bottom controls
        Positioned(
          bottom: 0,
          left: 0,
          right: 0,
          child: Container(
            padding: EdgeInsets.fromLTRB(
                32, 24, 32, MediaQuery.of(context).padding.bottom + 24),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.transparent,
                  Colors.black.withOpacity(0.8),
                  Colors.black,
                ],
              ),
            ),
            child: Column(
              children: [
                Text(
                  'ESCANEAR QR',
                  style: GoogleFonts.bebasNeue(
                    color: _SN.gold,
                    fontSize: 22,
                    letterSpacing: 2,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Apunta la c\u00e1mara al c\u00f3digo QR del jugador',
                  style: TextStyle(color: _SN.textMuted, fontSize: 13),
                ),
                const SizedBox(height: 20),
                if (!_cameraError)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _buildCircleButton(
                        icon: _isFlashOn ? Icons.flash_on : Icons.flash_off,
                        color: _isFlashOn ? _SN.gold : null,
                        onTap: () {
                          _scannerController.toggleTorch();
                          setState(() => _isFlashOn = !_isFlashOn);
                        },
                      ),
                      const SizedBox(width: 32),
                      _buildCircleButton(
                        icon: Icons.cameraswitch,
                        onTap: () => _scannerController.switchCamera(),
                      ),
                    ],
                  ),

                // Error message
                if (state is QRScanError)
                  Padding(
                    padding: const EdgeInsets.only(top: 16),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 10),
                      decoration: BoxDecoration(
                        color: _SN.error.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(12),
                        border:
                            Border.all(color: _SN.error.withOpacity(0.5)),
                      ),
                      child: Text(
                        state.message,
                        style:
                            const TextStyle(color: _SN.error, fontSize: 13),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildManualInputView(BuildContext context) {
    return Container(
      color: _SN.backgroundDark,
      width: double.infinity,
      height: double.infinity,
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 80, 24, 24),
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: _SN.gold.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: _SN.gold.withOpacity(0.3)),
                ),
                child: Column(
                  children: [
                    const Icon(Icons.videocam_off, color: _SN.gold, size: 40),
                    const SizedBox(height: 12),
                    Text(
                      'C\u00e1mara no disponible',
                      style: GoogleFonts.bebasNeue(
                        color: _SN.gold,
                        fontSize: 22,
                        letterSpacing: 1,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Ingresa los datos del QR manualmente',
                      style: TextStyle(color: _SN.textSecondary, fontSize: 13),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              TextField(
                controller: _manualInputController,
                style: const TextStyle(color: _SN.textPrimary, fontSize: 14),
                maxLines: 3,
                decoration: InputDecoration(
                  hintText: 'Pega el contenido del QR aqu\u00ed...\nEj: {"playerId":"...","name":"...","teamId":"...","jersey":10}',
                  hintStyle: TextStyle(
                      color: _SN.textMuted.withOpacity(0.6), fontSize: 13),
                  filled: true,
                  fillColor: Colors.white.withOpacity(0.05),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: _SN.textMuted.withOpacity(0.3)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: _SN.textMuted.withOpacity(0.3)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: _SN.gold),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton.icon(
                  onPressed: () {
                    final text = _manualInputController.text.trim();
                    if (text.isEmpty) return;
                    _manualInputController.clear();
                    context.read<AttendanceBloc>().add(
                          ScanQRCodeEvent(qrData: text),
                        );
                  },
                  icon: const Icon(Icons.qr_code, size: 22),
                  label: Text(
                    'PROCESAR QR',
                    style: GoogleFonts.bebasNeue(
                        fontSize: 16, letterSpacing: 1.5),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _SN.neonGreen,
                    foregroundColor: Colors.black,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildScanOverlay() {
    return CustomPaint(
      painter: _ScanOverlayPainter(),
      child: const SizedBox.expand(),
    );
  }

  Widget _buildCircleButton({
    required IconData icon,
    required VoidCallback onTap,
    Color? color,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: Colors.black45,
          border: Border.all(color: Colors.white24),
        ),
        child: Icon(icon, color: color ?? Colors.white, size: 22),
      ),
    );
  }

  void _onDetect(BarcodeCapture capture) {
    final barcodes = capture.barcodes;
    if (barcodes.isEmpty) return;

    final code = barcodes.first.rawValue;
    if (code == null || code == _lastScannedCode) return;

    _lastScannedCode = code;
    HapticFeedback.mediumImpact();
    context.read<AttendanceBloc>().add(ScanQRCodeEvent(qrData: code));
  }

  // ==================== Confirmation View ====================

  void _scanAnother(BuildContext context) {
    _lastScannedCode = null;
    context.read<AttendanceBloc>().add(const ResetScannerEvent());
    _scannerController.start();
  }

  Widget _buildConfirmationView(BuildContext context, AttendanceState state) {
    final QRPlayerData playerData;
    if (state is TodayMatchesLoading) {
      playerData = state.playerData;
    } else if (state is TodayMatchesError) {
      playerData = state.playerData;
    } else if (state is QRScanned) {
      playerData = state.playerData;
    } else if (state is AttendanceRegistering) {
      playerData = state.playerData;
    } else {
      return _buildScannerView(context, state);
    }

    return SafeArea(
      child: Column(
        children: [
          // Top bar
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.arrow_back, color: _SN.textPrimary),
                  onPressed: () => Navigator.pop(context),
                ),
                const Spacer(),
                Text(
                  'JUGADOR DETECTADO',
                  style: GoogleFonts.bebasNeue(
                    color: _SN.gold,
                    fontSize: 18,
                    letterSpacing: 1.5,
                  ),
                ),
                const Spacer(),
                const SizedBox(width: 48),
              ],
            ),
          ),

          Expanded(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _buildPlayerHeader(playerData),
                    const SizedBox(height: 32),
                    ..._buildMatchSection(context, state),
                    const SizedBox(height: 16),

                    // Scan another
                    TextButton.icon(
                      onPressed: () => _scanAnother(context),
                      icon: const Icon(Icons.qr_code_scanner, size: 18),
                      label: const Text('Escanear otro'),
                      style: TextButton.styleFrom(
                        foregroundColor: _SN.neonBlue,
                      ),
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

  Widget _buildPlayerHeader(QRPlayerData playerData) {
    return Column(
      children: [
        // Player avatar
        Container(
          width: 100,
          height: 100,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: LinearGradient(
              colors: [
                _SN.neonGreen.withOpacity(0.3),
                _SN.neonBlue.withOpacity(0.3),
              ],
            ),
            border:
                Border.all(color: _SN.neonGreen.withOpacity(0.6), width: 2),
          ),
          child: Center(
            child: Text(
              playerData.jerseyNumber > 0 ? '${playerData.jerseyNumber}' : '?',
              style: GoogleFonts.bebasNeue(
                color: _SN.neonGreen,
                fontSize: 40,
              ),
            ),
          ),
        ),
        const SizedBox(height: 20),

        // Player name
        Text(
          playerData.playerName,
          style: GoogleFonts.bebasNeue(
            color: _SN.textPrimary,
            fontSize: 28,
            letterSpacing: 1,
          ),
          textAlign: TextAlign.center,
        ),
        if (playerData.jerseyNumber > 0)
          Text(
            'Dorsal #${playerData.jerseyNumber}',
            style: const TextStyle(color: _SN.textSecondary, fontSize: 16),
          ),
      ],
    );
  }

  List<Widget> _buildMatchSection(BuildContext context, AttendanceState state) {
    if (state is TodayMatchesLoading) {
      return const [
        SizedBox(
          width: 40,
          height: 40,
          child: CircularProgressIndicator(color: _SN.neonGreen, strokeWidth: 3),
        ),
        SizedBox(height: 12),
        Text(
          'Buscando partidos de hoy...',
          style: TextStyle(color: _SN.textSecondary, fontSize: 13),
        ),
      ];
    }

    if (state is TodayMatchesError) {
      return [
        _buildNotice(state.message, _SN.error, Icons.error_outline),
        SizedBox(
          width: double.infinity,
          height: 52,
          child: OutlinedButton.icon(
            onPressed: () => context
                .read<AttendanceBloc>()
                .add(LoadTodayMatchesEvent(playerData: state.playerData)),
            icon: const Icon(Icons.refresh, size: 20),
            label: const Text('Reintentar'),
            style: OutlinedButton.styleFrom(
              foregroundColor: _SN.neonGreen,
              side: BorderSide(color: _SN.neonGreen.withOpacity(0.6)),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
            ),
          ),
        ),
      ];
    }

    if (state is AttendanceRegistering) {
      return [
        _buildMatchCard(context, state.match, selected: true, selectable: false),
        const SizedBox(height: 16),
        const SizedBox(
          width: 56,
          height: 56,
          child: CircularProgressIndicator(color: _SN.neonGreen, strokeWidth: 3),
        ),
      ];
    }

    final scanned = state as QRScanned;
    if (scanned.hasNoMatch) {
      return [
        _buildNotice(
          'El equipo de este jugador no tiene partido hoy',
          _SN.gold,
          Icons.event_busy,
        ),
      ];
    }

    final selected = scanned.selectedMatch;
    final several = scanned.matches.length > 1;
    return [
      if (several)
        const Padding(
          padding: EdgeInsets.only(bottom: 12),
          child: Text(
            'Selecciona el partido',
            style: TextStyle(color: _SN.textSecondary, fontSize: 13),
          ),
        ),
      for (final match in scanned.matches)
        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: _buildMatchCard(
            context,
            match,
            selected: match.matchId == scanned.selectedMatchId,
            selectable: several,
          ),
        ),

      // Error message
      if (scanned.errorMessage != null)
        _buildNotice(scanned.errorMessage!, _SN.error, Icons.error_outline),

      const SizedBox(height: 4),

      // Register button
      SizedBox(
        width: double.infinity,
        height: 56,
        child: ElevatedButton.icon(
          onPressed: selected == null || selected.alreadyRegistered
              ? null
              : () => context
                  .read<AttendanceBloc>()
                  .add(const RegisterAttendanceEvent()),
          icon: const Icon(Icons.check_circle, size: 24),
          label: Text(
            selected != null && selected.alreadyRegistered
                ? 'YA REGISTRADO'
                : 'REGISTRAR ASISTENCIA',
            style: GoogleFonts.bebasNeue(
              fontSize: 18,
              letterSpacing: 1.5,
            ),
          ),
          style: ElevatedButton.styleFrom(
            backgroundColor: _SN.neonGreen,
            foregroundColor: Colors.black,
            disabledBackgroundColor: _SN.neonGreen.withOpacity(0.3),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
          ),
        ),
      ),
    ];
  }

  Widget _buildNotice(String message, Color color, IconData icon) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.4)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              message,
              style: TextStyle(color: color, fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMatchCard(
    BuildContext context,
    TodayMatchEntity match, {
    required bool selected,
    required bool selectable,
  }) {
    final borderColor =
        selected ? _SN.neonGreen : _SN.textMuted.withOpacity(0.3);
    return GestureDetector(
      onTap: selectable
          ? () => context
              .read<AttendanceBloc>()
              .add(SelectMatchEvent(matchId: match.matchId))
          : null,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: selected
              ? _SN.neonGreen.withOpacity(0.08)
              : Colors.white.withOpacity(0.04),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: borderColor, width: selected ? 2 : 1),
        ),
        child: Row(
          children: [
            Icon(
              selectable
                  ? (selected
                      ? Icons.radio_button_checked
                      : Icons.radio_button_unchecked)
                  : Icons.sports_soccer,
              color: selected ? _SN.neonGreen : _SN.textMuted,
              size: 22,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    match.displayName,
                    style: const TextStyle(
                      color: _SN.textPrimary,
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (match.fieldNumber != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Text(
                        'Cancha ${match.fieldNumber}',
                        style: const TextStyle(
                            color: _SN.textSecondary, fontSize: 12),
                      ),
                    ),
                ],
              ),
            ),
            if (match.alreadyRegistered)
              Container(
                margin: const EdgeInsets.only(left: 8),
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: _SN.gold.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: _SN.gold.withOpacity(0.5)),
                ),
                child: const Text(
                  'Ya registrado',
                  style: TextStyle(color: _SN.gold, fontSize: 11),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildSuccessView(
      BuildContext context, AttendanceRegistered state) {
    final color = state.alreadyRegistered ? _SN.gold : _SN.neonGreen;
    return SafeArea(
      child: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Success icon
              Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: color.withOpacity(0.15),
                  border: Border.all(color: color, width: 3),
                ),
                child: Icon(
                  state.alreadyRegistered ? Icons.info_outline : Icons.check,
                  color: color,
                  size: 56,
                ),
              ),
              const SizedBox(height: 24),
              Text(
                state.alreadyRegistered
                    ? 'YA REGISTRADO'
                    : 'ASISTENCIA REGISTRADA',
                style: GoogleFonts.bebasNeue(
                  color: color,
                  fontSize: 26,
                  letterSpacing: 2,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                state.playerData.displayName,
                style: const TextStyle(
                    color: _SN.textPrimary, fontSize: 18),
                textAlign: TextAlign.center,
              ),
              Text(
                state.match.displayName,
                style: const TextStyle(
                    color: _SN.textSecondary, fontSize: 14),
                textAlign: TextAlign.center,
              ),
              if (!state.alreadyRegistered)
                Text(
                  state.registeredTimeDisplay,
                  style: const TextStyle(
                      color: _SN.textSecondary, fontSize: 14),
                ),
              const SizedBox(height: 40),

              // Scan another
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton.icon(
                  onPressed: () => _scanAnother(context),
                  icon: const Icon(Icons.qr_code_scanner, size: 24),
                  label: Text(
                    'ESCANEAR OTRO',
                    style: GoogleFonts.bebasNeue(
                      fontSize: 18,
                      letterSpacing: 1.5,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _SN.neonBlue,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Volver',
                    style: TextStyle(color: _SN.textMuted)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Custom painter for scan overlay with viewfinder
class _ScanOverlayPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final scanSize = size.width * 0.7;
    final scanRect = Rect.fromCenter(
      center: center,
      width: scanSize,
      height: scanSize,
    );

    // Dark overlay with hole
    final overlayPaint = Paint()..color = Colors.black54;
    canvas.drawPath(
      Path.combine(
        PathOperation.difference,
        Path()..addRect(Rect.fromLTWH(0, 0, size.width, size.height)),
        Path()
          ..addRRect(RRect.fromRectAndRadius(
              scanRect, const Radius.circular(20))),
      ),
      overlayPaint,
    );

    // Corner brackets
    final bracketPaint = Paint()
      ..color = _SN.gold
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke;

    const bracketLen = 30.0;
    const radius = 20.0;

    // Top-left
    canvas.drawPath(
      Path()
        ..moveTo(scanRect.left, scanRect.top + bracketLen)
        ..lineTo(scanRect.left, scanRect.top + radius)
        ..quadraticBezierTo(
            scanRect.left, scanRect.top, scanRect.left + radius, scanRect.top)
        ..lineTo(scanRect.left + bracketLen, scanRect.top),
      bracketPaint,
    );

    // Top-right
    canvas.drawPath(
      Path()
        ..moveTo(scanRect.right - bracketLen, scanRect.top)
        ..lineTo(scanRect.right - radius, scanRect.top)
        ..quadraticBezierTo(scanRect.right, scanRect.top, scanRect.right,
            scanRect.top + radius)
        ..lineTo(scanRect.right, scanRect.top + bracketLen),
      bracketPaint,
    );

    // Bottom-left
    canvas.drawPath(
      Path()
        ..moveTo(scanRect.left, scanRect.bottom - bracketLen)
        ..lineTo(scanRect.left, scanRect.bottom - radius)
        ..quadraticBezierTo(scanRect.left, scanRect.bottom,
            scanRect.left + radius, scanRect.bottom)
        ..lineTo(scanRect.left + bracketLen, scanRect.bottom),
      bracketPaint,
    );

    // Bottom-right
    canvas.drawPath(
      Path()
        ..moveTo(scanRect.right - bracketLen, scanRect.bottom)
        ..lineTo(scanRect.right - radius, scanRect.bottom)
        ..quadraticBezierTo(scanRect.right, scanRect.bottom, scanRect.right,
            scanRect.bottom - radius)
        ..lineTo(scanRect.right, scanRect.bottom - bracketLen),
      bracketPaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
