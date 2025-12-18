import 'package:flutter/material.dart';
import '../services/offline_session_manager.dart';
import '../services/connectivity_service.dart';
import '../screens/login_screen.dart';

/// Widget that blocks access to protected routes if user is offline without a cached session
/// Allows access if:
/// - Online with valid session
/// - Offline with valid cached session (within TTL)
class OfflineGate extends StatefulWidget {
  final Widget child;
  final String routeName;

  const OfflineGate({
    super.key,
    required this.child,
    this.routeName = 'protected route',
  });

  @override
  State<OfflineGate> createState() => _OfflineGateState();
}

class _OfflineGateState extends State<OfflineGate> {
  final OfflineSessionManager _sessionManager = OfflineSessionManager();
  final ConnectivityService _connectivity = ConnectivityService();

  bool _isChecking = true;
  bool _hasAccess = false;
  String _denialReason = '';

  @override
  void initState() {
    super.initState();
    _checkAccess();
  }

  Future<void> _checkAccess() async {
    setState(() {
      _isChecking = true;
    });

    try {
      final canAccess = await _sessionManager.canAccessApp();
      final isOnline = _connectivity.isOnline;

      if (canAccess) {
        setState(() {
          _hasAccess = true;
          _isChecking = false;
        });
      } else {
        // Determine why access was denied
        String reason;
        if (!isOnline) {
          reason =
              'No tienes acceso sin conexión. Por favor, conéctate a internet para iniciar sesión.';
        } else {
          reason =
              'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
        }

        setState(() {
          _hasAccess = false;
          _denialReason = reason;
          _isChecking = false;
        });

        // Redirect to login after showing message
        Future.delayed(const Duration(seconds: 2), () {
          if (mounted) {
            Navigator.of(context).pushAndRemoveUntil(
              MaterialPageRoute(builder: (context) => const LoginScreen()),
              (route) => false,
            );
          }
        });
      }
    } catch (e) {
      print('❌ Error checking offline access: $e');
      setState(() {
        _hasAccess = false;
        _denialReason = 'Error verificando acceso. Por favor, intenta de nuevo.';
        _isChecking = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isChecking) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const CircularProgressIndicator(),
              const SizedBox(height: 16),
              Text(
                'Verificando acceso...',
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.grey[600],
                ),
              ),
            ],
          ),
        ),
      );
    }

    if (!_hasAccess) {
      return Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.block,
                  size: 64,
                  color: Colors.red[300],
                ),
                const SizedBox(height: 24),
                Text(
                  'Acceso Denegado',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.grey[800],
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  _denialReason,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.grey[600],
                  ),
                ),
                const SizedBox(height: 24),
                const CircularProgressIndicator(),
                const SizedBox(height: 8),
                Text(
                  'Redirigiendo al inicio de sesión...',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey[500],
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    // Access granted - render child widget
    return widget.child;
  }
}

/// Offline Gate for specific tournament/league access
/// Checks if user has cached access to specific tournament
class TournamentOfflineGate extends StatefulWidget {
  final Widget child;
  final String? tournamentId;
  final String? leagueId;

  const TournamentOfflineGate({
    super.key,
    required this.child,
    this.tournamentId,
    this.leagueId,
  });

  @override
  State<TournamentOfflineGate> createState() => _TournamentOfflineGateState();
}

class _TournamentOfflineGateState extends State<TournamentOfflineGate> {
  final OfflineSessionManager _sessionManager = OfflineSessionManager();
  final ConnectivityService _connectivity = ConnectivityService();

  bool _isChecking = true;
  bool _hasAccess = false;
  String _denialReason = '';

  @override
  void initState() {
    super.initState();
    _checkAccess();
  }

  Future<void> _checkAccess() async {
    setState(() {
      _isChecking = true;
    });

    try {
      // First check basic session access
      final canAccess = await _sessionManager.canAccessApp();
      if (!canAccess) {
        setState(() {
          _hasAccess = false;
          _denialReason = 'Sesión inválida o expirada';
          _isChecking = false;
        });
        return;
      }

      final isOnline = _connectivity.isOnline;

      if (isOnline) {
        // Online: Allow access (will fetch fresh data)
        setState(() {
          _hasAccess = true;
          _isChecking = false;
        });
      } else {
        // Offline: Check if user has cached profile with access to this league/tournament
        final profile = await _sessionManager.getCachedUserProfile();

        if (profile == null) {
          setState(() {
            _hasAccess = false;
            _denialReason =
                'No hay datos en caché. Conéctate a internet para cargar tus torneos.';
            _isChecking = false;
          });
          return;
        }

        // Check league access
        if (widget.leagueId != null) {
          final userLeagueId = profile['league_id'];
          if (userLeagueId != widget.leagueId) {
            setState(() {
              _hasAccess = false;
              _denialReason =
                  'No tienes acceso a esta liga en modo offline.';
              _isChecking = false;
            });
            return;
          }
        }

        // If we get here, user has offline access
        setState(() {
          _hasAccess = true;
          _isChecking = false;
        });
      }
    } catch (e) {
      print('❌ Error checking tournament offline access: $e');
      setState(() {
        _hasAccess = false;
        _denialReason = 'Error verificando acceso';
        _isChecking = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isChecking) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (!_hasAccess) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Acceso Restringido'),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.wifi_off,
                  size: 64,
                  color: Colors.orange[300],
                ),
                const SizedBox(height: 24),
                Text(
                  'Modo Offline',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.grey[800],
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  _denialReason,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.grey[600],
                  ),
                ),
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  onPressed: () {
                    Navigator.of(context).pop();
                  },
                  icon: const Icon(Icons.arrow_back),
                  label: const Text('Volver'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return widget.child;
  }
}
