import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../services/qr_service.dart';
import '../models/qr_data.dart';
import 'player_detail_screen.dart';

class QRScannerScreen extends StatefulWidget {
  final String? matchId;
  final String? matchName;

  const QRScannerScreen({
    super.key,
    this.matchId,
    this.matchName,
  });

  @override
  State<QRScannerScreen> createState() => _QRScannerScreenState();
}

class _QRScannerScreenState extends State<QRScannerScreen>
    with TickerProviderStateMixin {
  MobileScannerController? controller;
  bool isScanning = true;
  bool isFlashOn = false;
  String? lastScannedCode;

  late AnimationController _scanLineController;
  late AnimationController _pulseController;
  late AnimationController _cornerController;
  late Animation<double> _scanLineAnimation;
  late Animation<double> _pulseAnimation;
  late Animation<double> _cornerAnimation;

  // Stadium Nights color palette
  static const Color _primaryDark = Color(0xFF0A0A0A);
  static const Color _neonGreen = Color(0xFF00FF7F);
  static const Color _gold = Color(0xFFFFD700);
  static const Color _surfaceDark = Color(0xFF1A1A1A);

  @override
  void initState() {
    super.initState();
    controller = MobileScannerController();

    // Scan line animation (moves up and down)
    _scanLineController = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    )..repeat(reverse: true);

    _scanLineAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _scanLineController,
      curve: Curves.easeInOut,
    ));

    // Pulse animation for corners
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    )..repeat();

    _pulseAnimation = Tween<double>(
      begin: 0.8,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _pulseController,
      curve: Curves.easeInOut,
    ));

    // Corner entrance animation
    _cornerController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    )..forward();

    _cornerAnimation = CurvedAnimation(
      parent: _cornerController,
      curve: Curves.elasticOut,
    );
  }

  @override
  void dispose() {
    _scanLineController.dispose();
    _pulseController.dispose();
    _cornerController.dispose();
    controller?.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    final List<Barcode> barcodes = capture.barcodes;
    if (isScanning && barcodes.isNotEmpty) {
      final barcode = barcodes.first;
      if (barcode.rawValue != null && barcode.rawValue != lastScannedCode) {
        lastScannedCode = barcode.rawValue;
        HapticFeedback.mediumImpact();
        _handleQRCode(barcode.rawValue!);
      }
    }
  }

  void _handleQRCode(String qrData) {
    setState(() {
      isScanning = false;
    });

    // Parse QR code
    final QRPlayerData? playerData = QRService.parseQRCode(qrData);

    if (playerData != null) {
      HapticFeedback.heavyImpact();
      // Navigate to player detail screen with match context
      Navigator.pushReplacement(
        context,
        PageRouteBuilder(
          pageBuilder: (context, animation, secondaryAnimation) =>
            PlayerDetailScreen(
              qrData: playerData,
              matchId: widget.matchId,
            ),
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return FadeTransition(
              opacity: animation,
              child: SlideTransition(
                position: Tween<Offset>(
                  begin: const Offset(0, 0.1),
                  end: Offset.zero,
                ).animate(CurvedAnimation(
                  parent: animation,
                  curve: Curves.easeOut,
                )),
                child: child,
              ),
            );
          },
          transitionDuration: const Duration(milliseconds: 300),
        ),
      );
    } else {
      HapticFeedback.vibrate();
      _showErrorDialog('Código QR inválido', 'El código escaneado no contiene información válida de jugador.');
    }
  }

  void _showErrorDialog(String title, String message) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: _surfaceDark,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: Colors.red.withOpacity(0.5),
              width: 1,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.red.withOpacity(0.2),
                blurRadius: 20,
                spreadRadius: 2,
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.red.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.error_outline,
                  color: Colors.red,
                  size: 48,
                ),
              ),
              const SizedBox(height: 20),
              Text(
                title,
                style: GoogleFonts.bebasNeue(
                  fontSize: 24,
                  color: Colors.white,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                message,
                style: GoogleFonts.outfit(
                  fontSize: 14,
                  color: Colors.white70,
                  height: 1.4,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: _buildDialogButton(
                      'Cerrar',
                      Colors.white24,
                      Colors.white,
                      () {
                        Navigator.pop(context);
                        Navigator.pop(context);
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildDialogButton(
                      'Reintentar',
                      _neonGreen,
                      _primaryDark,
                      () {
                        Navigator.pop(context);
                        setState(() {
                          isScanning = true;
                          lastScannedCode = null;
                        });
                      },
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

  Widget _buildDialogButton(
    String label,
    Color bgColor,
    Color textColor,
    VoidCallback onPressed,
  ) {
    return Material(
      color: bgColor,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: () {
          HapticFeedback.lightImpact();
          onPressed();
        },
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          alignment: Alignment.center,
          child: Text(
            label,
            style: GoogleFonts.outfit(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: textColor,
            ),
          ),
        ),
      ),
    );
  }

  void _toggleFlash() {
    HapticFeedback.lightImpact();
    controller?.toggleTorch();
    setState(() {
      isFlashOn = !isFlashOn;
    });
  }

  void _flipCamera() {
    HapticFeedback.lightImpact();
    controller?.switchCamera();
  }

  @override
  Widget build(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;
    final scanAreaSize = screenSize.width * 0.7;

    return Scaffold(
      backgroundColor: _primaryDark,
      body: Stack(
        children: [
          // Camera view
          Positioned.fill(
            child: MobileScanner(
              controller: controller,
              onDetect: _onDetect,
            ),
          ),

          // Dark overlay with cutout
          Positioned.fill(
            child: CustomPaint(
              painter: _ScannerOverlayPainter(
                scanAreaSize: scanAreaSize,
                overlayColor: _primaryDark.withOpacity(0.85),
              ),
            ),
          ),

          // Scan frame and animations
          Center(
            child: SizedBox(
              width: scanAreaSize,
              height: scanAreaSize,
              child: Stack(
                children: [
                  // Animated scan line
                  if (isScanning)
                    AnimatedBuilder(
                      animation: _scanLineAnimation,
                      builder: (context, child) {
                        return Positioned(
                          top: _scanLineAnimation.value * (scanAreaSize - 4),
                          left: 0,
                          right: 0,
                          child: Container(
                            height: 3,
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [
                                  _neonGreen.withOpacity(0),
                                  _neonGreen,
                                  _neonGreen.withOpacity(0),
                                ],
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: _neonGreen.withOpacity(0.8),
                                  blurRadius: 12,
                                  spreadRadius: 2,
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),

                  // Animated corners
                  AnimatedBuilder(
                    animation: Listenable.merge([_cornerAnimation, _pulseAnimation]),
                    builder: (context, child) {
                      return Stack(
                        children: [
                          // Top-left corner
                          Positioned(
                            top: 0,
                            left: 0,
                            child: _buildCorner(
                              rotation: 0,
                              scale: _cornerAnimation.value * _pulseAnimation.value,
                            ),
                          ),
                          // Top-right corner
                          Positioned(
                            top: 0,
                            right: 0,
                            child: _buildCorner(
                              rotation: 90,
                              scale: _cornerAnimation.value * _pulseAnimation.value,
                            ),
                          ),
                          // Bottom-right corner
                          Positioned(
                            bottom: 0,
                            right: 0,
                            child: _buildCorner(
                              rotation: 180,
                              scale: _cornerAnimation.value * _pulseAnimation.value,
                            ),
                          ),
                          // Bottom-left corner
                          Positioned(
                            bottom: 0,
                            left: 0,
                            child: _buildCorner(
                              rotation: 270,
                              scale: _cornerAnimation.value * _pulseAnimation.value,
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                ],
              ),
            ),
          ),

          // Top header
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: EdgeInsets.only(
                top: MediaQuery.of(context).padding.top + 8,
                left: 16,
                right: 16,
                bottom: 20,
              ),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    _primaryDark,
                    _primaryDark.withOpacity(0.8),
                    Colors.transparent,
                  ],
                ),
              ),
              child: Row(
                children: [
                  // Back button
                  _buildControlButton(
                    Icons.arrow_back,
                    () {
                      HapticFeedback.lightImpact();
                      Navigator.pop(context);
                    },
                  ),
                  const SizedBox(width: 16),
                  // Title
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'ESCANEAR QR',
                          style: GoogleFonts.bebasNeue(
                            fontSize: 22,
                            color: Colors.white,
                            letterSpacing: 2,
                          ),
                        ),
                        if (widget.matchName != null)
                          Text(
                            widget.matchName!,
                            style: GoogleFonts.outfit(
                              fontSize: 12,
                              color: _neonGreen,
                              fontWeight: FontWeight.w500,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                      ],
                    ),
                  ),
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
              padding: EdgeInsets.only(
                top: 24,
                left: 24,
                right: 24,
                bottom: MediaQuery.of(context).padding.bottom + 24,
              ),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                  colors: [
                    _primaryDark,
                    _primaryDark.withOpacity(0.9),
                    Colors.transparent,
                  ],
                ),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Status text
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      color: isScanning
                          ? _neonGreen.withOpacity(0.15)
                          : _gold.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(30),
                      border: Border.all(
                        color: isScanning
                            ? _neonGreen.withOpacity(0.3)
                            : _gold.withOpacity(0.3),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (!isScanning) ...[
                          SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation<Color>(_gold),
                            ),
                          ),
                          const SizedBox(width: 10),
                        ] else ...[
                          Icon(
                            Icons.qr_code_scanner,
                            color: _neonGreen,
                            size: 18,
                          ),
                          const SizedBox(width: 10),
                        ],
                        Text(
                          isScanning
                              ? 'Enfoca el código QR del jugador'
                              : 'Procesando...',
                          style: GoogleFonts.outfit(
                            fontSize: 14,
                            color: isScanning ? _neonGreen : _gold,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Control buttons
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _buildControlButton(
                        isFlashOn ? Icons.flash_on : Icons.flash_off,
                        _toggleFlash,
                        isActive: isFlashOn,
                        size: 56,
                      ),
                      const SizedBox(width: 32),
                      _buildControlButton(
                        Icons.flip_camera_ios,
                        _flipCamera,
                        size: 56,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCorner({required double rotation, required double scale}) {
    return Transform.rotate(
      angle: rotation * (math.pi / 180),
      child: Transform.scale(
        scale: scale,
        child: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            border: Border(
              top: BorderSide(color: _neonGreen, width: 4),
              left: BorderSide(color: _neonGreen, width: 4),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildControlButton(
    IconData icon,
    VoidCallback onPressed, {
    bool isActive = false,
    double size = 44,
  }) {
    return Material(
      color: isActive ? _neonGreen : Colors.white.withOpacity(0.15),
      borderRadius: BorderRadius.circular(size / 2),
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(size / 2),
        child: Container(
          width: size,
          height: size,
          alignment: Alignment.center,
          child: Icon(
            icon,
            color: isActive ? _primaryDark : Colors.white,
            size: size * 0.5,
          ),
        ),
      ),
    );
  }
}

// Custom painter for the scanner overlay
class _ScannerOverlayPainter extends CustomPainter {
  final double scanAreaSize;
  final Color overlayColor;

  _ScannerOverlayPainter({
    required this.scanAreaSize,
    required this.overlayColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = overlayColor
      ..style = PaintingStyle.fill;

    final scanRect = Rect.fromCenter(
      center: Offset(size.width / 2, size.height / 2),
      width: scanAreaSize,
      height: scanAreaSize,
    );

    // Create path with cutout
    final path = Path()
      ..addRect(Rect.fromLTWH(0, 0, size.width, size.height))
      ..addRRect(RRect.fromRectAndRadius(scanRect, const Radius.circular(16)))
      ..fillType = PathFillType.evenOdd;

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(_ScannerOverlayPainter oldDelegate) {
    return oldDelegate.scanAreaSize != scanAreaSize ||
           oldDelegate.overlayColor != overlayColor;
  }
}
