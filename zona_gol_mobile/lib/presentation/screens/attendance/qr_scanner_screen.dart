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

/// QR Scanner Screen — scans player QR codes for attendance
class QrScannerScreen extends StatelessWidget {
  final UserEntity user;
  final String? matchId;
  final String? matchName;

  const QrScannerScreen({
    super.key,
    required this.user,
    this.matchId,
    this.matchName,
  });

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => sl<AttendanceBloc>(),
      child: _QrScannerView(
        user: user,
        matchId: matchId,
        matchName: matchName,
      ),
    );
  }
}

class _QrScannerView extends StatefulWidget {
  final UserEntity user;
  final String? matchId;
  final String? matchName;

  const _QrScannerView({
    required this.user,
    this.matchId,
    this.matchName,
  });

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
          if (state is QRScanned) {
            _scannerController.stop();
            // Check if already checked in
            context.read<AttendanceBloc>().add(CheckAttendanceEvent(
              playerId: state.playerData.playerId,
              matchId: widget.matchId,
            ));
          } else if (state is AttendanceRegistered) {
            HapticFeedback.heavyImpact();
          } else if (state is QRScanError) {
            HapticFeedback.vibrate();
          }
        },
        builder: (context, state) {
          if (state is QRScanned ||
              state is AttendanceRegistering ||
              state is AttendanceRegistered ||
              state is AttendanceRegisterError) {
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
                if (widget.matchName != null)
                  Flexible(
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.black54,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        widget.matchName!,
                        style: const TextStyle(
                            color: _SN.textPrimary, fontSize: 12),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ),
                const Spacer(),
                const SizedBox(width: 40),
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

  Widget _buildConfirmationView(BuildContext context, AttendanceState state) {
    QRPlayerData? playerData;
    bool? alreadyCheckedIn;

    if (state is QRScanned) {
      playerData = state.playerData;
      alreadyCheckedIn = state.alreadyCheckedIn;
    } else if (state is AttendanceRegistering && _getPlayerData() != null) {
      playerData = _getPlayerData();
    } else if (state is AttendanceRegistered) {
      return _buildSuccessView(context, state);
    } else if (state is AttendanceRegisterError) {
      playerData = _getPlayerData();
    }

    if (playerData == null) {
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
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
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
                        border: Border.all(
                            color: _SN.neonGreen.withOpacity(0.6), width: 2),
                      ),
                      child: Center(
                        child: Text(
                          playerData.jerseyNumber > 0
                              ? '${playerData.jerseyNumber}'
                              : '?',
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
                        style: const TextStyle(
                            color: _SN.textSecondary, fontSize: 16),
                      ),

                    const SizedBox(height: 32),

                    // Already checked in warning
                    if (alreadyCheckedIn == true)
                      Container(
                        margin: const EdgeInsets.only(bottom: 16),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: _SN.gold.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                          border:
                              Border.all(color: _SN.gold.withOpacity(0.4)),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.info_outline,
                                color: _SN.gold, size: 20),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                'Este jugador ya tiene asistencia registrada.',
                                style: TextStyle(
                                    color: _SN.gold, fontSize: 13),
                              ),
                            ),
                          ],
                        ),
                      ),

                    // Error message
                    if (state is AttendanceRegisterError)
                      Container(
                        margin: const EdgeInsets.only(bottom: 16),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: _SN.error.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                          border:
                              Border.all(color: _SN.error.withOpacity(0.4)),
                        ),
                        child: Text(
                          state.message,
                          style:
                              const TextStyle(color: _SN.error, fontSize: 13),
                          textAlign: TextAlign.center,
                        ),
                      ),

                    // Register button
                    if (state is! AttendanceRegistering)
                      SizedBox(
                        width: double.infinity,
                        height: 56,
                        child: ElevatedButton.icon(
                          onPressed: alreadyCheckedIn == true
                              ? null
                              : () {
                                  context.read<AttendanceBloc>().add(
                                        RegisterAttendanceEvent(
                                          playerData: playerData!,
                                          matchId: widget.matchId,
                                          scannedByUserId: widget.user.id,
                                        ),
                                      );
                                },
                          icon: const Icon(Icons.check_circle, size: 24),
                          label: Text(
                            'REGISTRAR ASISTENCIA',
                            style: GoogleFonts.bebasNeue(
                              fontSize: 18,
                              letterSpacing: 1.5,
                            ),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: _SN.neonGreen,
                            foregroundColor: Colors.black,
                            disabledBackgroundColor:
                                _SN.neonGreen.withOpacity(0.3),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                        ),
                      ),

                    // Loading
                    if (state is AttendanceRegistering)
                      const SizedBox(
                        width: 56,
                        height: 56,
                        child: CircularProgressIndicator(
                            color: _SN.neonGreen, strokeWidth: 3),
                      ),

                    const SizedBox(height: 16),

                    // Scan another
                    TextButton.icon(
                      onPressed: () {
                        _lastScannedCode = null;
                        context
                            .read<AttendanceBloc>()
                            .add(const ResetScannerEvent());
                        _scannerController.start();
                      },
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

  Widget _buildSuccessView(
      BuildContext context, AttendanceRegistered state) {
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
                  color: _SN.neonGreen.withOpacity(0.15),
                  border: Border.all(color: _SN.neonGreen, width: 3),
                ),
                child: const Icon(
                  Icons.check,
                  color: _SN.neonGreen,
                  size: 56,
                ),
              ),
              const SizedBox(height: 24),
              Text(
                'ASISTENCIA REGISTRADA',
                style: GoogleFonts.bebasNeue(
                  color: _SN.neonGreen,
                  fontSize: 26,
                  letterSpacing: 2,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                state.attendance.displayName,
                style: const TextStyle(
                    color: _SN.textPrimary, fontSize: 18),
              ),
              Text(
                state.attendance.checkedInTimeDisplay,
                style: const TextStyle(
                    color: _SN.textSecondary, fontSize: 14),
              ),
              const SizedBox(height: 40),

              // Scan another
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton.icon(
                  onPressed: () {
                    _lastScannedCode = null;
                    context
                        .read<AttendanceBloc>()
                        .add(const ResetScannerEvent());
                    _scannerController.start();
                  },
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

  QRPlayerData? _getPlayerData() {
    // Try to recover playerData from previous states
    // This is a simple approach - in production you might store it in the BLoC
    return null;
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
