import 'package:flutter/foundation.dart';
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

class _QRScannerScreenState extends State<QRScannerScreen> {
  MobileScannerController? controller;
  bool isScanning = true;
  bool isFlashOn = false;
  String? lastScannedCode;

  // Stadium Nights color palette
  static const Color _primaryDark = Color(0xFF0A0A0A);
  static const Color _neonGreen = Color(0xFF00FF7F);
  static const Color _gold = Color(0xFFFFD700);
  static const Color _surfaceDark = Color(0xFF1A1A1A);

  @override
  void initState() {
    super.initState();
    controller = MobileScannerController();
  }

  @override
  void dispose() {
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
    final stopwatch = Stopwatch()..start();
    debugPrint('📷 Cámara QR: ${qrData.length} chars');
    debugPrint('📷 Raw: ${qrData.substring(0, qrData.length > 80 ? 80 : qrData.length)}...');

    setState(() {
      isScanning = false;
    });

    // Parse QR code
    final QRPlayerData? playerData = QRService.parseQRCode(qrData);
    debugPrint('📷 Parse: ${stopwatch.elapsedMilliseconds}ms - $playerData');

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
    return Scaffold(
      backgroundColor: _primaryDark,
      body: Stack(
        children: [
          // Camera view - full screen without overlay
          Positioned.fill(
            child: MobileScanner(
              controller: controller,
              onDetect: _onDetect,
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
