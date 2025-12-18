import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';

/// Service for monitoring network connectivity status
/// Provides real-time connectivity updates and offline/online detection
class ConnectivityService {
  static final ConnectivityService _instance = ConnectivityService._internal();
  factory ConnectivityService() => _instance;
  ConnectivityService._internal();

  final Connectivity _connectivity = Connectivity();

  // Stream controller for connectivity changes
  final _connectivityController = StreamController<bool>.broadcast();

  // Current connectivity status
  bool _isOnline = true;
  StreamSubscription<List<ConnectivityResult>>? _subscription;

  /// Stream of connectivity status (true = online, false = offline)
  Stream<bool> get connectivityStream => _connectivityController.stream;

  /// Current connectivity status
  bool get isOnline => _isOnline;

  /// Initialize connectivity monitoring
  Future<void> init() async {
    // Check initial connectivity status
    await _updateConnectivityStatus();

    // Listen to connectivity changes
    _subscription = _connectivity.onConnectivityChanged.listen(
      (List<ConnectivityResult> results) {
        _handleConnectivityChange(results);
      },
    );

    print('✅ Connectivity service initialized. Status: ${_isOnline ? "Online" : "Offline"}');
  }

  /// Handle connectivity changes
  void _handleConnectivityChange(List<ConnectivityResult> results) {
    final wasOnline = _isOnline;

    // Consider online if any connection type is available
    // (except ConnectivityResult.none)
    _isOnline = results.any((result) => result != ConnectivityResult.none);

    // Only emit if status actually changed
    if (wasOnline != _isOnline) {
      print(_isOnline
          ? '🟢 Network connection restored'
          : '🔴 Network connection lost');

      _connectivityController.add(_isOnline);
    }
  }

  /// Update connectivity status (useful for manual refresh)
  Future<void> _updateConnectivityStatus() async {
    try {
      final results = await _connectivity.checkConnectivity();
      _handleConnectivityChange(results);
    } catch (e) {
      print('❌ Error checking connectivity: $e');
      // Assume offline if check fails
      _isOnline = false;
      _connectivityController.add(false);
    }
  }

  /// Manually check and update connectivity status
  Future<bool> checkConnectivity() async {
    await _updateConnectivityStatus();
    return _isOnline;
  }

  /// Wait for network connection to be restored
  /// Returns true when online, or false after timeout
  Future<bool> waitForConnection({Duration timeout = const Duration(seconds: 30)}) async {
    if (_isOnline) return true;

    try {
      await _connectivityController.stream
          .firstWhere((isOnline) => isOnline)
          .timeout(timeout);
      return true;
    } on TimeoutException {
      print('⚠️ Timeout waiting for network connection');
      return false;
    } catch (e) {
      print('❌ Error waiting for connection: $e');
      return false;
    }
  }

  /// Get detailed connectivity information
  Future<Map<String, dynamic>> getConnectivityDetails() async {
    final results = await _connectivity.checkConnectivity();

    return {
      'is_online': _isOnline,
      'connection_types': results.map((r) => r.name).toList(),
      'has_wifi': results.contains(ConnectivityResult.wifi),
      'has_mobile': results.contains(ConnectivityResult.mobile),
      'has_ethernet': results.contains(ConnectivityResult.ethernet),
    };
  }

  /// Dispose resources
  void dispose() {
    _subscription?.cancel();
    _connectivityController.close();
  }
}
