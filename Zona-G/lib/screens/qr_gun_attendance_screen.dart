import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../widgets/qr_gun_scanner.dart';
import '../models/qr_data.dart';
import '../services/api_service.dart';
import 'player_detail_screen.dart';

/// Screen for scanning player QR codes using a QR gun scanner (HID mode)
/// Behavior is identical to QRScannerScreen but uses keyboard input instead of camera
class QRGunAttendanceScreen extends StatefulWidget {
  final String? matchId;
  final String? matchName;

  const QRGunAttendanceScreen({
    super.key,
    this.matchId,
    this.matchName,
  });

  @override
  State<QRGunAttendanceScreen> createState() => _QRGunAttendanceScreenState();
}

class _QRGunAttendanceScreenState extends State<QRGunAttendanceScreen> {
  // Stadium Nights color palette (same as QRScannerScreen)
  static const Color _primaryDark = Color(0xFF0A0A0A);
  static const Color _neonGreen = Color(0xFF00FF7F);
  static const Color _gold = Color(0xFFFFD700);
  static const Color _surfaceDark = Color(0xFF1A1A1A);

  bool _isProcessing = false;
  final ValueNotifier<bool> _isScanning = ValueNotifier(false);

  @override
  void dispose() {
    _isScanning.dispose();
    super.dispose();
  }

  void _handleScan(QRGunScanResult result) {
    if (_isProcessing) return;

    setState(() {
      _isProcessing = true;
    });

    if (result.isValid && result.playerData != null) {
      _handleValidQR(result.playerData!);
    } else {
      _handleInvalidQR(result.error ?? 'Código QR inválido');
    }
  }

  void _handleValidQR(QRPlayerData playerData) async {
    HapticFeedback.heavyImpact();

    // Precargar jugador en paralelo con la navegación
    final playerFuture = ApiService.getPlayer(
      playerData.playerId,
      playerName: playerData.playerName,
      jerseyNumber: playerData.jerseyNumber,
      teamId: playerData.teamId,
    );

    // Navigate to player detail screen with preloaded data
    Navigator.pushReplacement(
      context,
      PageRouteBuilder(
        pageBuilder: (context, animation, secondaryAnimation) =>
          PlayerDetailScreen(
            qrData: playerData,
            matchId: widget.matchId,
            scanSource: ScanSource.gun,
            preloadedPlayer: playerFuture,
          ),
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(opacity: animation, child: child);
        },
        transitionDuration: const Duration(milliseconds: 200),
      ),
    );
  }

  void _handleInvalidQR(String error) {
    HapticFeedback.vibrate();
    _showErrorDialog('Código QR inválido', error);
  }

  void _handleScanError(String error) {
    if (_isProcessing) return;
    HapticFeedback.vibrate();
    _showErrorDialog('Error de escaneo', error);
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
                          _isProcessing = false;
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

  @override
  Widget build(BuildContext context) {
    return QRGunScannerWidget(
      enabled: !_isProcessing,
      onScan: _handleScan,
      onError: _handleScanError,
      onScanningChanged: (scanning) => _isScanning.value = scanning,
      showIndicator: false,
      child: Scaffold(
        backgroundColor: _primaryDark,
        body: Stack(
          children: [
            // Main content - scanning area
            Positioned.fill(
              child: _buildScanningArea(),
            ),

            // Top header
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: _buildHeader(),
            ),

            // Bottom controls
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: _buildBottomStatus(),
            ),

            // Scanning indicator (lightweight, only rebuilds this widget)
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: ValueListenableBuilder<bool>(
                valueListenable: _isScanning,
                builder: (context, isScanning, _) {
                  if (!isScanning) return const SizedBox.shrink();
                  return Container(
                    padding: EdgeInsets.only(
                      top: MediaQuery.of(context).padding.top + 60,
                      bottom: 12,
                    ),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          _neonGreen.withOpacity(0.3),
                          _neonGreen.withOpacity(0.1),
                          Colors.transparent,
                        ],
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(_neonGreen),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Text(
                          'Escaneando...',
                          style: GoogleFonts.outfit(
                            fontSize: 14,
                            color: _neonGreen,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildScanningArea() {
    return Container(
      decoration: BoxDecoration(
        gradient: RadialGradient(
          center: Alignment.center,
          radius: 1.2,
          colors: [
            _surfaceDark,
            _primaryDark,
          ],
        ),
      ),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // QR Gun icon
            Container(
              padding: const EdgeInsets.all(32),
              decoration: BoxDecoration(
                color: _neonGreen.withOpacity(0.1),
                shape: BoxShape.circle,
                border: Border.all(
                  color: _neonGreen.withOpacity(0.3),
                  width: 2,
                ),
                boxShadow: [
                  BoxShadow(
                    color: _neonGreen.withOpacity(0.2),
                    blurRadius: 30,
                    spreadRadius: 5,
                  ),
                ],
              ),
              child: Icon(
                Icons.qr_code_scanner,
                color: _neonGreen,
                size: 80,
              ),
            ),
            const SizedBox(height: 32),
            // Instructions
            Text(
              'PISTOLA QR LISTA',
              style: GoogleFonts.bebasNeue(
                fontSize: 28,
                color: Colors.white,
                letterSpacing: 3,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Escanea la credencial del jugador',
              style: GoogleFonts.outfit(
                fontSize: 16,
                color: Colors.white60,
              ),
            ),
            const SizedBox(height: 40),
            // Visual indicator
            if (!_isProcessing)
              _buildPulsingIndicator()
            else
              _buildProcessingIndicator(),
          ],
        ),
      ),
    );
  }

  Widget _buildPulsingIndicator() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      decoration: BoxDecoration(
        color: _neonGreen.withOpacity(0.1),
        borderRadius: BorderRadius.circular(30),
        border: Border.all(
          color: _neonGreen.withOpacity(0.3),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(
              color: _neonGreen,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: _neonGreen.withOpacity(0.5),
                  blurRadius: 8,
                  spreadRadius: 2,
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Text(
            'Esperando escaneo...',
            style: GoogleFonts.outfit(
              fontSize: 14,
              color: _neonGreen,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProcessingIndicator() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      decoration: BoxDecoration(
        color: _gold.withOpacity(0.15),
        borderRadius: BorderRadius.circular(30),
        border: Border.all(
          color: _gold.withOpacity(0.3),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: 16,
            height: 16,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation<Color>(_gold),
            ),
          ),
          const SizedBox(width: 12),
          Text(
            'Procesando...',
            style: GoogleFonts.outfit(
              fontSize: 14,
              color: _gold,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
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
                  'PISTOLA QR',
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
    );
  }

  Widget _buildBottomStatus() {
    return Container(
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
          // Info card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: _surfaceDark.withOpacity(0.8),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: Colors.white.withOpacity(0.1),
              ),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: _gold.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    Icons.info_outline,
                    color: _gold,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Modo Pistola HID',
                        style: GoogleFonts.outfit(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'La pistola debe estar configurada en modo teclado',
                        style: GoogleFonts.outfit(
                          fontSize: 11,
                          color: Colors.white54,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildControlButton(IconData icon, VoidCallback onPressed) {
    return Material(
      color: Colors.white.withOpacity(0.15),
      borderRadius: BorderRadius.circular(22),
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(22),
        child: Container(
          width: 44,
          height: 44,
          alignment: Alignment.center,
          child: Icon(
            icon,
            color: Colors.white,
            size: 22,
          ),
        ),
      ),
    );
  }
}
