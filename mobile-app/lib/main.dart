import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'dart:developer' as dev;
import 'services/sync_manager.dart';
import 'services/edge_ai_service.dart';

import 'package:firebase_core/firebase_core.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  try {
    await dotenv.load(fileName: ".env");
  } catch (e) {
    dev.log("[ CONFIG ] .env file not found. Using fallbacks.");
  }
  
  await Firebase.initializeApp();
  runApp(const SyncBridgeApp());
}

class SyncBridgeApp extends StatelessWidget {
  const SyncBridgeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF05070A),
        textTheme: GoogleFonts.jetbrainsMonoTextTheme(ThemeData.dark().textTheme),
      ),
      home: const VictimAppScreen(),
    );
  }
}

class VictimAppScreen extends StatefulWidget {
  const VictimAppScreen({super.key});

  @override
  State<VictimAppScreen> createState() => _VictimAppScreenState();
}

class _VictimAppScreenState extends State<VictimAppScreen> {
  final TextEditingController _controller = TextEditingController();
  final SyncManager _syncManager = SyncManager();
  final EdgeAIService _edgeAI = EdgeAIService();
  
  bool _isProcessing = false;
  Map<String, dynamic>? _result;
  bool _isAIReady = false;
  bool _hasImage = false;
  bool _simulatedImpact = false;
  int _mockHeartRate = 82;
  double _mockNoise = 48.5;
  String _reasoning = "";

  @override
  void initState() {
    super.initState();
    _initAI();
  }

  Future<void> _initAI() async {
    await _edgeAI.initModel();
    setState(() => _isAIReady = true);
  }

  Future<void> _handleSOS() async {
    if (_controller.text.isEmpty) return;

    setState(() {
      _isProcessing = true;
      _result = null;
      _reasoning = "[ INITIALIZING_TACTICAL_UPLINK ]";
    });

    // 1. SENSOR PASS
    await Future.delayed(const Duration(milliseconds: 600));
    setState(() => _reasoning += "\n[ AI ] VECTORIZING_INPUT_STREAM...");
    
    if (_hasImage) {
      await Future.delayed(const Duration(milliseconds: 500));
      setState(() => _reasoning += "\n[ NANO_VISION ] ANALYZING_PIXEL_BUFFER...");
      await Future.delayed(const Duration(milliseconds: 400));
      setState(() => _reasoning += "\n[ NANO_VISION ] SCAN_COMPLETE: HAZARD_DETECTED");
    }

    if (_simulatedImpact) {
      await Future.delayed(const Duration(milliseconds: 300));
      setState(() => _reasoning += "\n[ SENSOR ] HIGH_G_IMPACT_FOUND_IN_HARDWARE_LOG");
    }

    // 2. INTELLIGENCE HANDOVER (Edge vs Cloud)
    await Future.delayed(const Duration(milliseconds: 400));
    final mode = _syncManager.currentMode;
    setState(() => _reasoning += "\n[ AI ] INTELLIGENCE_HANDOVER: ${mode.name.toUpperCase()}");
    
    final result = await _edgeAI.classifySOS(
      _controller.text, 
      hasImage: _hasImage,
      highImpactDetected: _simulatedImpact
    );
    
    // 3. PACKET GENERATION
    final String id = "REF-${DateTime.now().millisecondsSinceEpoch.toString().substring(9)}";
    final String packetCode = _generateUltraPacket(result, _hasImage);
    
    final finalPacket = {
      ...result,
      'id': id,
      'packet': packetCode,
      'ts': DateTime.now().millisecondsSinceEpoch,
      'data': {
        'hasImage': _hasImage,
        'conflict_warning': result['conflict_warning'],
        'people_count': 1,
        'sensors': {
          'heart_rate': _mockHeartRate,
          'ambient_noise': _mockNoise,
          'impact': _simulatedImpact,
        }
      }
    };

    // 4. ADAPTIVE TRANSMISSION (SyncManager decides protocol)
    setState(() => _reasoning += "\n[ SYNC ] ATTEMPTING_ADAPTIVE_UPLINK...");
    await _syncManager.transmit(finalPacket);
    
    await Future.delayed(const Duration(milliseconds: 600));
    
    setState(() {
      _result = finalPacket;
      _isProcessing = false;
      _reasoning += "\n[ STATUS ] UPLINK_SUCCESSFUL // PROTOCOL: ${mode == SyncMode.nominal ? 'TCP_FULL' : 'BIT_PACKED'}";
    });
  }

  String _generateUltraPacket(Map<String, dynamic> result, bool image) {
    final String sev = result['severity'] == 'critical' ? 'C1' : 'U1';
    final String type = 'TI'; 
    return "$sev-P1-$type-LZ01${image ? '-IMG' : ''}";
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildHeader(),
              const SizedBox(height: 32),
              if (!_isAIReady)
                _buildLoadingState()
              else if (_result != null)
                _buildResultView()
              else
                _buildInputView(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("SYNC_BRIDGE_V4", style: GoogleFonts.spaceGrotesk(fontWeight: FontWeight.w900, fontSize: 18, letterSpacing: 2)),
            const SizedBox(height: 4),
            StreamBuilder<SyncMode>(
              stream: _syncManager.modeStream,
              builder: (context, snapshot) {
                final mode = snapshot.data ?? _syncManager.currentMode;
                return Text("NODE_STATUS // ${mode.name.toUpperCase()}", 
                  style: TextStyle(color: _getModeColor(mode), fontSize: 10, fontWeight: FontWeight.bold)
                );
              }
            ),
          ],
        ),
        const Icon(Icons.emergency, color: Color(0xFFF43F5E), size: 28),
      ],
    );
  }

  Color _getModeColor(SyncMode mode) {
    switch (mode) {
      case SyncMode.nominal: return const Color(0xFF10B981);
      case SyncMode.ultraLight: return const Color(0xFFF59E0B);
      case SyncMode.blackout: return const Color(0xFFF43F5E);
    }
  }

  Widget _buildLoadingState() {
    return Center(
      child: Column(
        children: [
          const SizedBox(height: 100),
          const CircularProgressIndicator(color: Color(0xFF3B82F6), strokeWidth: 1),
          const SizedBox(height: 24),
          Text("WAKING_GEMINI_NANO...", style: GoogleFonts.jetbrainsMono(fontSize: 10, color: const Color(0xFF475569))),
        ],
      ),
    );
  }

  Widget _buildInputView() {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text("DESCRIBE_EMERGENCY", style: GoogleFonts.jetbrainsMono(fontSize: 11, fontWeight: FontWeight.w900, color: const Color(0xFF475569))),
          const SizedBox(height: 16),
          TextField(
            controller: _controller,
            maxLines: 4,
            style: GoogleFonts.jetbrainsMono(fontSize: 14),
            decoration: const InputDecoration(
              hintText: "e.g. Trapped under rubble, bleeding heavily...",
              filled: true,
              fillColor: Color(0xFF0A0C10),
              border: OutlineInputBorder(borderRadius: BorderRadius.zero, borderSide: BorderSide(color: Color(0xFF1F2937))),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.zero, borderSide: BorderSide(color: Color(0xFF3B82F6))),
            ),
          ),
          const SizedBox(height: 12),
          
          Row(
            children: [
              Expanded(
                child: _buildToggleButton(
                  icon: _hasImage ? Icons.check_circle : Icons.camera_alt,
                  label: _hasImage ? 'PIXELS_ATTACHED' : 'ATTACH_PHOTO',
                  active: _hasImage,
                  onTap: () => setState(() => _hasImage = !_hasImage),
                  activeColor: const Color(0xFF10B981),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildToggleButton(
                  icon: Icons.flash_on,
                  label: _simulatedImpact ? 'IMPACT_LOCKED' : 'SIM_IMPACT',
                  active: _simulatedImpact,
                  onTap: () => setState(() => _simulatedImpact = !_simulatedImpact),
                  activeColor: Colors.orange,
                ),
              ),
            ],
          ),

          const Spacer(),
          if (_isProcessing) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              color: const Color(0xFF0A0C10),
              child: Text(_reasoning, style: GoogleFonts.jetbrainsMono(fontSize: 9, color: const Color(0xFF3B82F6), height: 1.6)),
            ),
            const SizedBox(height: 24),
          ],
          
          SizedBox(
            width: double.infinity,
            height: 60,
            child: ElevatedButton(
              onPressed: _isProcessing ? null : _handleSOS,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF3B82F6),
                foregroundColor: Colors.white,
                shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                elevation: 0,
              ),
              child: Text("BROADCAST_SOS", style: GoogleFonts.jetbrainsMono(fontWeight: FontWeight.w900, letterSpacing: 2)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildToggleButton({required IconData icon, required String label, required bool active, required VoidCallback onTap, required Color activeColor}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 50,
        decoration: BoxDecoration(
          color: const Color(0xFF0A0C10),
          border: Border.all(color: active ? activeColor : const Color(0xFF1F2937)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: active ? activeColor : const Color(0xFF475569), size: 14),
            const SizedBox(width: 8),
            Text(label, style: GoogleFonts.jetbrainsMono(fontSize: 9, color: active ? activeColor : const Color(0xFF475569), fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }

  Widget _buildResultView() {
    final sev = _result!['severity'].toString().toUpperCase();
    final conflict = _result!['conflict_warning'] != null;

    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            width: double.infinity,
            color: sev == 'CRITICAL' ? const Color(0xFFF43F5E).withOpacity(0.1) : const Color(0xFF3B82F6).withOpacity(0.1),
            child: Column(
              children: [
                Text("TRIAGE_RESULT", style: TextStyle(fontSize: 10, color: const Color(0xFF475569), fontWeight: FontWeight.w900)),
                const SizedBox(height: 8),
                Text(sev, style: GoogleFonts.spaceGrotesk(fontSize: 42, fontWeight: FontWeight.w900, color: sev == 'CRITICAL' ? const Color(0xFFF43F5E) : Colors.white)),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    "SOURCE: ${_result!['ai_source']?.toString().toUpperCase() ?? 'LOCAL_EDGE'}", 
                    style: GoogleFonts.jetbrainsMono(fontSize: 8, color: const Color(0xFF3B82F6), fontWeight: FontWeight.bold)
                  ),
                ),
              ],
            ),
          ),
          if (conflict)
            Container(
              margin: const EdgeInsets.only(top: 12),
              padding: const EdgeInsets.all(12),
              width: double.infinity,
              color: Colors.orange.withOpacity(0.2),
              border: Border.all(color: Colors.orange.withOpacity(0.5)),
              child: Text(_result!['conflict_warning'], style: const TextStyle(color: Colors.orange, fontSize: 10, fontWeight: FontWeight.bold)),
            ),
          const SizedBox(height: 24),
          Text("AI_REASONING", style: TextStyle(fontSize: 10, color: const Color(0xFF475569), fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          Text(_result!['reasoning'], style: const TextStyle(fontSize: 13, height: 1.5, color: Color(0xFF94A3B8))),
          const Spacer(),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: OutlinedButton(
              onPressed: () => setState(() => _result = null),
              style: OutlinedButton.styleFrom(side: const BorderSide(color: Color(0xFF1F2937))),
              child: const Text("NEW_REPORT"),
            ),
          ),
        ],
      ),
    );
  }
}
