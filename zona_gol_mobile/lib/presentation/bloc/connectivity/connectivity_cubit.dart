import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';

import '../../../core/network/connectivity_manager.dart';

/// Connectivity state
class ConnectivityState extends Equatable {
  final bool isOnline;
  final ConnectivityStatus type;

  const ConnectivityState({
    required this.isOnline,
    required this.type,
  });

  const ConnectivityState.online(ConnectivityStatus type)
      : isOnline = true,
        type = type;

  const ConnectivityState.offline()
      : isOnline = false,
        type = ConnectivityStatus.none;

  const ConnectivityState.unknown()
      : isOnline = true,
        type = ConnectivityStatus.unknown;

  String get connectionLabel {
    switch (type) {
      case ConnectivityStatus.wifi:
        return 'WiFi';
      case ConnectivityStatus.mobile:
        return 'Datos Móviles';
      case ConnectivityStatus.ethernet:
        return 'Ethernet';
      case ConnectivityStatus.vpn:
        return 'VPN';
      case ConnectivityStatus.none:
        return 'Sin Conexión';
      case ConnectivityStatus.unknown:
        return 'Desconocido';
    }
  }

  @override
  List<Object?> get props => [isOnline, type];
}

/// Cubit that monitors connectivity changes via ConnectivityManager
class ConnectivityCubit extends Cubit<ConnectivityState> {
  final ConnectivityManager _connectivityManager;
  StreamSubscription<ConnectivityStatus>? _subscription;

  ConnectivityCubit(this._connectivityManager)
      : super(const ConnectivityState.unknown()) {
    _init();
  }

  void _init() {
    // Set initial state
    final status = _connectivityManager.currentStatus;
    _emitStatus(status);

    // Listen to changes
    _subscription = _connectivityManager.onConnectivityChanged.listen(
      _emitStatus,
    );
  }

  void _emitStatus(ConnectivityStatus status) {
    if (status == ConnectivityStatus.none) {
      emit(const ConnectivityState.offline());
    } else if (status == ConnectivityStatus.unknown) {
      emit(const ConnectivityState.unknown());
    } else {
      emit(ConnectivityState.online(status));
    }
  }

  /// Force a connectivity check
  Future<void> checkConnectivity() async {
    await _connectivityManager.checkConnectivity();
  }

  @override
  Future<void> close() {
    _subscription?.cancel();
    return super.close();
  }
}
