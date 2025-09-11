import 'package:flutter/material.dart';
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
  String? lastScannedCode;

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
      // Navigate to player detail screen with match context
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => PlayerDetailScreen(
            qrData: playerData,
            matchId: widget.matchId,
          ),
        ),
      );
    } else {
      // Show error dialog
      _showErrorDialog('Código QR inválido', 'El código escaneado no contiene información válida de jugador.');
    }
  }

  void _showErrorDialog(String title, String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              setState(() {
                isScanning = true;
                lastScannedCode = null;
              });
            },
            child: const Text('Reintentar'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pop(context);
            },
            child: const Text('Cerrar'),
          ),
        ],
      ),
    );
  }

  void _toggleFlash() {
    controller?.toggleTorch();
  }

  void _flipCamera() {
    controller?.switchCamera();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: widget.matchName != null 
            ? Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Escanear QR',
                    style: TextStyle(fontSize: 16),
                  ),
                  Text(
                    widget.matchName!,
                    style: const TextStyle(fontSize: 12),
                  ),
                ],
              )
            : const Text('Escanear QR'),
        backgroundColor: Colors.green,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            onPressed: _toggleFlash,
            icon: const Icon(Icons.flash_on),
            tooltip: 'Toggle Flash',
          ),
          IconButton(
            onPressed: _flipCamera,
            icon: const Icon(Icons.flip_camera_ios),
            tooltip: 'Flip Camera',
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            flex: 5,
            child: MobileScanner(
              controller: controller,
              onDetect: _onDetect,
            ),
          ),
          Expanded(
            flex: 1,
            child: Container(
              padding: const EdgeInsets.all(16),
              color: Colors.white,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    isScanning ? 'Enfoca el código QR del jugador' : 'Procesando...',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  if (!isScanning) ...[
                    const SizedBox(height: 8),
                    const CircularProgressIndicator(),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}