import 'connectivity_manager.dart';

/// Network Info
/// Provides information about network connectivity
abstract class NetworkInfo {
  Future<bool> get isConnected;
  bool get isCurrentlyConnected;
  Stream<bool> get onConnectivityChanged;
}

/// Network Info Implementation
class NetworkInfoImpl implements NetworkInfo {
  final ConnectivityManager connectivityManager;

  NetworkInfoImpl(this.connectivityManager);

  @override
  Future<bool> get isConnected async {
    return await connectivityManager.checkConnectivity();
  }

  @override
  bool get isCurrentlyConnected {
    return connectivityManager.isOnline;
  }

  @override
  Stream<bool> get onConnectivityChanged {
    return connectivityManager.onConnectivityChanged.map(
      (status) =>
          status != ConnectivityStatus.none &&
          status != ConnectivityStatus.unknown,
    );
  }

  /// Check if device has WiFi connection
  bool get hasWifi => connectivityManager.isWifi;

  /// Check if device has Mobile connection
  bool get hasMobile => connectivityManager.isMobile;

  /// Get current connection type
  String get connectionType {
    if (connectivityManager.isWifi) return 'WiFi';
    if (connectivityManager.isMobile) return 'Mobile';
    if (connectivityManager.isEthernet) return 'Ethernet';
    if (connectivityManager.isVpn) return 'VPN';
    if (connectivityManager.isOffline) return 'Offline';
    return 'Unknown';
  }

  /// Wait for device to come online
  Future<bool> waitForConnection({Duration timeout = const Duration(seconds: 30)}) {
    return connectivityManager.waitForOnline(timeout: timeout);
  }
}
