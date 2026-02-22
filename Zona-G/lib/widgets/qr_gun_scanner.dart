import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/qr_service.dart';
import '../models/qr_data.dart';

/// Result of a QR gun scan
class QRGunScanResult {
  final String rawData;
  final QRPlayerData? playerData;
  final bool isValid;
  final String? error;

  const QRGunScanResult({
    required this.rawData,
    this.playerData,
    required this.isValid,
    this.error,
  });
}

/// Widget that captures QR gun scanner input (HID keyboard mode)
///
/// QR gun scanners work as HID devices - they send characters rapidly
/// followed by Enter. This widget detects that pattern and assembles
/// the complete scan data.
class QRGunScannerWidget extends StatefulWidget {
  /// Child widget to wrap
  final Widget child;

  /// Whether the scanner is actively listening
  final bool enabled;

  /// Callback when a scan is completed
  final void Function(QRGunScanResult result)? onScan;

  /// Callback for scan errors
  final void Function(String error)? onError;

  /// Callback when scanning starts/stops (lightweight, no setState)
  final void Function(bool isScanning)? onScanningChanged;

  /// Timeout in milliseconds to consider rapid input as scanner (default: 50ms)
  final int rapidInputThreshold;

  /// Timeout in milliseconds to finalize scan after last character (default: 100ms)
  final int scanTimeout;

  /// Minimum characters for a valid scan (default: 10)
  final int minLength;

  /// Whether to show visual indicator when scanning
  final bool showIndicator;

  /// Whether to auto-focus for keyboard capture
  final bool autoFocus;

  const QRGunScannerWidget({
    super.key,
    required this.child,
    this.enabled = true,
    this.onScan,
    this.onError,
    this.onScanningChanged,
    this.rapidInputThreshold = 50,
    this.scanTimeout = 100,
    this.minLength = 10,
    this.showIndicator = true,
    this.autoFocus = true,
  });

  @override
  State<QRGunScannerWidget> createState() => _QRGunScannerWidgetState();
}

class _QRGunScannerWidgetState extends State<QRGunScannerWidget> {
  final FocusNode _focusNode = FocusNode();
  final StringBuffer _buffer = StringBuffer();
  Timer? _timeoutTimer;
  DateTime? _lastKeystroke;
  DateTime? _lastCompletedScan;
  bool _isScanning = false;

  @override
  void initState() {
    super.initState();
    if (widget.autoFocus) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _focusNode.requestFocus();
      });
    }
  }

  @override
  void dispose() {
    _timeoutTimer?.cancel();
    _focusNode.dispose();
    super.dispose();
  }

  void _clearBuffer() {
    _buffer.clear();
    if (_isScanning) {
      _isScanning = false;
      widget.onScanningChanged?.call(false);
      if (widget.showIndicator && mounted) setState(() {});
    }
  }

  void _completeScan() {
    final rawData = _buffer.toString().trim();
    _timeoutTimer?.cancel();
    _buffer.clear();

    if (_isScanning) {
      _isScanning = false;
      widget.onScanningChanged?.call(false);
      if (widget.showIndicator && mounted) setState(() {});
    }

    if (rawData.isEmpty) return;

    // Debounce: ignore scans within 500ms of last completed scan
    final now = DateTime.now();
    if (_lastCompletedScan != null &&
        now.difference(_lastCompletedScan!).inMilliseconds < 500) {
      return;
    }
    _lastCompletedScan = now;

    // Defer parsing to let UI update first (hide "Escaneando...")
    Future.microtask(() {
      if (!mounted) return;

      final playerData = QRService.parseQRCode(rawData);

      final result = QRGunScanResult(
        rawData: rawData,
        playerData: playerData,
        isValid: playerData != null,
        error: playerData == null ? 'Código QR inválido' : null,
      );

      if (result.isValid) {
        HapticFeedback.heavyImpact();
        widget.onScan?.call(result);
      } else {
        HapticFeedback.vibrate();
        widget.onError?.call(result.error ?? 'Error');
      }
    });
  }

  KeyEventResult _handleKeyEvent(FocusNode node, KeyEvent event) {
    if (!widget.enabled || event is! KeyDownEvent) return KeyEventResult.ignored;

    final now = DateTime.now();
    final timeSinceLastKeystroke = _lastKeystroke != null
        ? now.difference(_lastKeystroke!).inMilliseconds
        : widget.rapidInputThreshold + 1;
    _lastKeystroke = now;

    // Clear buffer if too much time has passed
    if (timeSinceLastKeystroke > widget.rapidInputThreshold * 3 && _buffer.isNotEmpty) {
      _clearBuffer();
    }

    _timeoutTimer?.cancel();

    // Enter key completes the scan
    if (event.logicalKey == LogicalKeyboardKey.enter ||
        event.logicalKey == LogicalKeyboardKey.numpadEnter) {
      if (_buffer.length >= widget.minLength) {
        _completeScan();
        return KeyEventResult.handled;
      } else if (_buffer.isNotEmpty) {
        _clearBuffer();
        return KeyEventResult.handled;
      }
      return KeyEventResult.ignored;
    }

    // Get the character
    final character = event.character;
    if (character == null || character.isEmpty) return KeyEventResult.ignored;

    // Ignore modifier keys
    if (HardwareKeyboard.instance.isControlPressed ||
        HardwareKeyboard.instance.isMetaPressed ||
        HardwareKeyboard.instance.isAltPressed) {
      return KeyEventResult.ignored;
    }

    // Detect rapid input (scanner)
    final isRapidInput = timeSinceLastKeystroke < widget.rapidInputThreshold || _buffer.isEmpty;

    if (isRapidInput || _buffer.isNotEmpty) {
      _buffer.write(character);

      if (!_isScanning) {
        _isScanning = true;
        widget.onScanningChanged?.call(true);
        if (widget.showIndicator && mounted) setState(() {});
      }

      _timeoutTimer = Timer(Duration(milliseconds: widget.scanTimeout), () {
        if (_buffer.length >= widget.minLength) {
          _completeScan();
        } else {
          _clearBuffer();
        }
      });

      return KeyEventResult.handled;
    }

    return KeyEventResult.ignored;
  }

  @override
  Widget build(BuildContext context) {
    return Focus(
      focusNode: _focusNode,
      autofocus: widget.autoFocus,
      onKeyEvent: _handleKeyEvent,
      child: GestureDetector(
        onTap: () => _focusNode.requestFocus(),
        child: Stack(
          children: [
            widget.child,
            // Scanning indicator
            if (widget.showIndicator && _isScanning)
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: _ScanningIndicator(
                  bufferLength: _buffer.length,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// Visual indicator shown while scanning
class _ScanningIndicator extends StatelessWidget {
  final int bufferLength;

  const _ScanningIndicator({required this.bufferLength});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        top: MediaQuery.of(context).padding.top + 8,
        bottom: 8,
        left: 16,
        right: 16,
      ),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            const Color(0xFF00FF7F).withOpacity(0.3),
            const Color(0xFF00FF7F).withOpacity(0.1),
            Colors.transparent,
          ],
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const SizedBox(
            width: 16,
            height: 16,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF00FF7F)),
            ),
          ),
          const SizedBox(width: 12),
          Text(
            'Escaneando... ($bufferLength caracteres)',
            style: const TextStyle(
              color: Color(0xFF00FF7F),
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
