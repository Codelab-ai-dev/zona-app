import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';

/// Connectivity Manager
/// Monitors network connectivity and provides real-time updates
class ConnectivityManager {
  static ConnectivityManager? _instance;
  final Connectivity _connectivity = Connectivity();

  // Stream controller for connectivity changes
  final _connectivityStreamController = StreamController<ConnectivityStatus>.broadcast();

  // Current connectivity status
  ConnectivityStatus _currentStatus = ConnectivityStatus.unknown;

  ConnectivityManager._() {
    _init();
  }

  /// Get singleton instance
  static ConnectivityManager get instance {
    _instance ??= ConnectivityManager._();
    return _instance!;
  }

  /// Initialize connectivity monitoring
  Future<void> _init() async {
    try {
      // Check initial connectivity
      final initialResult = await _connectivity.checkConnectivity();
      _currentStatus = _mapConnectivityResult(initialResult.first);
      _connectivityStreamController.add(_currentStatus);

      // Listen to connectivity changes
      _connectivity.onConnectivityChanged.listen((results) {
        final newStatus = _mapConnectivityResult(results.first);
        if (newStatus != _currentStatus) {
          _currentStatus = newStatus;
          _connectivityStreamController.add(newStatus);

          if (!kReleaseMode) {
            debugPrint('📡 Connectivity changed: ${newStatus.name}');
          }
        }
      });

      if (!kReleaseMode) {
        debugPrint('✅ Connectivity Manager initialized: ${_currentStatus.name}');
      }
    } catch (e) {
      debugPrint('❌ Failed to initialize Connectivity Manager: $e');
      _currentStatus = ConnectivityStatus.unknown;
      _connectivityStreamController.add(_currentStatus);
    }
  }

  /// Map ConnectivityResult to ConnectivityStatus
  ConnectivityStatus _mapConnectivityResult(ConnectivityResult result) {
    switch (result) {
      case ConnectivityResult.wifi:
        return ConnectivityStatus.wifi;
      case ConnectivityResult.mobile:
        return ConnectivityStatus.mobile;
      case ConnectivityResult.ethernet:
        return ConnectivityStatus.ethernet;
      case ConnectivityResult.vpn:
        return ConnectivityStatus.vpn;
      case ConnectivityResult.none:
        return ConnectivityStatus.none;
      default:
        return ConnectivityStatus.unknown;
    }
  }

  /// Get current connectivity status
  ConnectivityStatus get currentStatus => _currentStatus;

  /// Stream of connectivity changes
  Stream<ConnectivityStatus> get onConnectivityChanged =>
      _connectivityStreamController.stream;

  /// Check if device is online
  bool get isOnline =>
      _currentStatus != ConnectivityStatus.none &&
      _currentStatus != ConnectivityStatus.unknown;

  /// Check if device is offline
  bool get isOffline => !isOnline;

  /// Check if connected via WiFi
  bool get isWifi => _currentStatus == ConnectivityStatus.wifi;

  /// Check if connected via Mobile
  bool get isMobile => _currentStatus == ConnectivityStatus.mobile;

  /// Check if connected via Ethernet
  bool get isEthernet => _currentStatus == ConnectivityStatus.ethernet;

  /// Check if connected via VPN
  bool get isVpn => _currentStatus == ConnectivityStatus.vpn;

  /// Check connectivity and update status
  Future<bool> checkConnectivity() async {
    try {
      final result = await _connectivity.checkConnectivity();
      final newStatus = _mapConnectivityResult(result.first);

      if (newStatus != _currentStatus) {
        _currentStatus = newStatus;
        _connectivityStreamController.add(newStatus);
      }

      return isOnline;
    } catch (e) {
      debugPrint('Error checking connectivity: $e');
      return false;
    }
  }

  /// Wait for online status
  /// Returns true when device comes online, or false if timeout expires
  Future<bool> waitForOnline({Duration timeout = const Duration(seconds: 30)}) async {
    if (isOnline) return true;

    try {
      await onConnectivityChanged
          .firstWhere(
            (status) =>
                status != ConnectivityStatus.none &&
                status != ConnectivityStatus.unknown,
          )
          .timeout(timeout);
      return true;
    } on TimeoutException {
      return false;
    }
  }

  /// Dispose resources
  void dispose() {
    _connectivityStreamController.close();
  }

  /// Debug info
  void printDebugInfo() {
    if (!kReleaseMode) {
      debugPrint('═══════════════════════════════════════════════');
      debugPrint('📡 CONNECTIVITY MANAGER INFO');
      debugPrint('═══════════════════════════════════════════════');
      debugPrint('Current Status:  ${_currentStatus.name}');
      debugPrint('Is Online:       $isOnline');
      debugPrint('Is WiFi:         $isWifi');
      debugPrint('Is Mobile:       $isMobile');
      debugPrint('═══════════════════════════════════════════════');
    }
  }
}

/// Connectivity Status Enum
enum ConnectivityStatus {
  wifi,
  mobile,
  ethernet,
  vpn,
  none,
  unknown,
}
