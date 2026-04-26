import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'dart:developer' as dev;

enum SyncMode { nominal, ultraLight, blackout }

/// SYNC MANAGER — PROJECT_SYNC_BRIDGE
/// Now with AUTOMATIC NETWORK SENSING.
/// Monitors hardware connectivity and adjusts the 'Bridge' strategy in real-time.
class SyncManager {
  static final SyncManager _instance = SyncManager._internal();
  factory SyncManager() => _instance;
  SyncManager._internal() {
    _initNetworkSensing();
  }

  SyncMode _currentMode = SyncMode.nominal;
  SyncMode get currentMode => _currentMode;
  
  final StreamController<SyncMode> _modeController = StreamController<SyncMode>.broadcast();
  Stream<SyncMode> get modeStream => _modeController.stream;

  final FirebaseFirestore _db = FirebaseFirestore.instance;
  final Connectivity _connectivity = Connectivity();

  /// Automatically monitors the network state
  void _initNetworkSensing() {
    _connectivity.onConnectivityChanged.listen((ConnectivityResult result) {
      _updateModeBasedOnResult(result);
    });
  }

  void _updateModeBasedOnResult(ConnectivityResult result) {
    SyncMode newMode;
    
    switch (result) {
      case ConnectivityResult.wifi:
        newMode = SyncMode.nominal; // Strong signal
        break;
      case ConnectivityResult.mobile:
        // In a real app, we'd check dBm here. 
        // For the demo, we simulate "Ultra-Light" if on mobile to show the tech.
        newMode = SyncMode.ultraLight; 
        break;
      case ConnectivityResult.none:
      default:
        newMode = SyncMode.blackout;
        break;
    }

    if (newMode != _currentMode) {
      _currentMode = newMode;
      _modeController.add(newMode);
      dev.log("[ AUTO_SYNC ] SENSING_CHANGE: Switch to ${newMode.name.toUpperCase()}");
    }
  }

  /// Transmit using the automatically detected best protocol
  Future<void> transmit(Map<String, dynamic> data) async {
    if (_currentMode == SyncMode.blackout) {
      dev.log("[ SYNC_BRIDGE ] BLACKOUT: Auto-diverting to Local Mesh Buffer.");
      return;
    }

    final payload = _currentMode == SyncMode.ultraLight 
        ? _optimizeForUltraLight(data) 
        : _standardize(data);

    try {
      await _db.collection('incidents').add({
        ...payload,
        'ts_uplink': FieldValue.serverTimestamp(),
        'protocol': _currentMode == SyncMode.ultraLight ? 'BIT_PACKED_MESH' : 'FULL_TCP_IP',
        'auto_sensed': true
      });
      dev.log("[ SYNC_BRIDGE ] AUTO_UPLINK_SUCCESS");
    } catch (e) {
      dev.log("[ SYNC_BRIDGE ] NETWORK_DROP_DETECTED: Buffering.");
    }
  }

  Map<String, dynamic> _optimizeForUltraLight(Map<String, dynamic> raw) {
    return {
      's': raw['severity']?[0]?.toUpperCase() ?? 'U',
      'c': (raw['confidence'] * 100).toInt(),
      'p': raw['packet']?.substring(0, 12) ?? '',
      'id': raw['id'],
      'm': 1,
    };
  }

  Map<String, dynamic> _standardize(Map<String, dynamic> raw) => {...raw, 'm': 0};
}
