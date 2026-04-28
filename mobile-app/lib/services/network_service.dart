import 'dart:async';
import 'package:http/http.dart' as http;

enum BridgeMode { nominal, ultraLight, blackout }

/// NETWORK SERVICE — TACTICAL SIGNAL PROBE
/// Automatically detects signal strength and determines the best Sync Bridge mode.
class NetworkService {
  static final NetworkService _instance = NetworkService._internal();
  factory NetworkService() => _instance;
  NetworkService._internal();

  final _modeController = StreamController<BridgeMode>.broadcast();
  final _signalController = StreamController<int>.broadcast();

  Stream<BridgeMode> get modeStream => _modeController.stream;
  Stream<int> get signalStream => _signalController.stream;

  BridgeMode _currentMode = BridgeMode.nominal;
  int _currentSignal = -65; // dBm
  Timer? _probeTimer;

  void startProbing() {
    _probeTimer?.cancel();
    _probeTimer = Timer.periodic(const Duration(seconds: 5), (_) => _probe());
    _probe(); // Initial probe
  }

  void stopProbing() {
    _probeTimer?.cancel();
  }

  Future<void> _probe() async {
    try {
      final start = DateTime.now();
      // Probe a lightweight URL (Google's connectivity check)
      final response = await http.get(Uri.parse('https://www.google.com/generate_204'))
          .timeout(const Duration(seconds: 3));
      
      final latency = DateTime.now().difference(start).inMilliseconds;

      if (response.statusCode == 204 || response.statusCode == 200) {
        if (latency < 400) {
          _update(BridgeMode.nominal, -60 - (latency ~/ 20));
        } else {
          _update(BridgeMode.ultraLight, -90 - (latency ~/ 50));
        }
      } else {
        _update(BridgeMode.blackout, -115);
      }
    } catch (e) {
      _update(BridgeMode.blackout, -120);
    }
  }

  void _update(BridgeMode mode, int signal) {
    if (_currentMode != mode) {
      _currentMode = mode;
      _modeController.add(mode);
      print("📡 [NetworkService] Bridge Mode Shift: $mode ($signal dBm)");
    }
    if (_currentSignal != signal) {
      _currentSignal = signal;
      _signalController.add(signal);
    }
  }

  BridgeMode get currentMode => _currentMode;
  int get currentSignal => _currentSignal;
}
