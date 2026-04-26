import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'services/edge_ai_service.dart';
import 'services/firestore_service.dart';

void main() {
  // NOTE: Firebase.initializeApp() should be here, but requires firebase_options.dart
  runApp(const SyncBridgeApp());
}

class SyncBridgeApp extends StatelessWidget {
  const SyncBridgeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Sync Bridge Tactical',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF05070A),
        primaryColor: const Color(0xFF3B82F6),
        useMaterial3: true,
        textTheme: GoogleFonts.spaceGroteskTextTheme(ThemeData.dark().textTheme),
      ),
      home: const LocalBeaconNode(),
    );
  }
}

class LocalBeaconNode extends StatefulWidget {
  const LocalBeaconNode({super.key});

  @override
  State<LocalBeaconNode> createState() => _LocalBeaconNodeState();
}

class _LocalBeaconNodeState extends State<LocalBeaconNode> {
  final TextEditingController _controller = TextEditingController();
  final EdgeAIService _aiService = EdgeAIService();
  final FirestoreService _firestoreService = FirestoreService();
  
  bool _isProcessing = false;
  Map<String, dynamic>? _result;

  void _processInference() async {
    if (_controller.text.isEmpty) return;
    
    setState(() => _isProcessing = true);
    final result = await _aiService.classifySOS(_controller.text);
    setState(() {
      _result = result;
      _isProcessing = false;
    });
  }

  void _uplinkPacket() async {
    if (_result == null) return;
    
    final packet = {
      'id': 'BEACON-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}',
      'ts': DateTime.now().millisecondsSinceEpoch,
      'severity': _result!['severity'],
      'packet': _controller.text,
      'confidence': _result!['confidence'],
      'status': 'active'
    };
    
    await _firestoreService.syncSOSPacket(packet);
    
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('[ SUCCESS ] PACKET_UPLINK_COMPLETE'),
          backgroundColor: Color(0xFF10B981),
        )
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('SIGNAL_STRENGTH // -82dBm', 
                        style: GoogleFonts.jetbrainsMono(fontSize: 8, color: const Color(0xFF475569), fontWeight: FontWeight.bold)
                      ),
                      Text('SYNC_BRIDGE_MOBILE_V4', 
                        style: GoogleFonts.spaceGrotesk(fontWeight: FontWeight.w900, fontSize: 16, letterSpacing: 1)
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      border: Border.all(color: const Color(0xFF10B981).withOpacity(0.5)),
                      color: const Color(0xFF10B981).withOpacity(0.1)
                    ),
                    child: Text('LOCKED', style: GoogleFonts.jetbrainsMono(fontSize: 8, color: const Color(0xFF10B981), fontWeight: FontWeight.bold)),
                  )
                ],
              ),
              const SizedBox(height: 48),
              Text('EMERGENCY_REPORT_INIT', 
                style: GoogleFonts.spaceGrotesk(fontSize: 28, fontWeight: FontWeight.w900, letterSpacing: -1)
              ),
              const SizedBox(height: 8),
              Text('LOCAL_INFERENCE_ENGINE: ACTIVE (INT8_QUANTIZED)', 
                style: GoogleFonts.jetbrainsMono(color: const Color(0xFF475569), fontSize: 10, fontWeight: FontWeight.bold)
              ),
              const SizedBox(height: 32),
              
              TextField(
                controller: _controller,
                maxLines: 4,
                style: GoogleFonts.jetbrainsMono(fontSize: 14),
                decoration: InputDecoration(
                  hintText: 'DESCRIBE_SITUATION...',
                  hintStyle: GoogleFonts.jetbrainsMono(color: const Color(0xFF1E293B)),
                  filled: true,
                  fillColor: Colors.black,
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.zero,
                    borderSide: BorderSide(color: const Color(0xFF1F2937))
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.zero,
                    borderSide: const BorderSide(color: Color(0xFF3B82F6), width: 1)
                  ),
                ),
              ),
              
              const SizedBox(height: 24),
              
              if (_isProcessing)
                Container(
                  padding: const EdgeInsets.all(20),
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: Colors.black,
                    border: Border.all(color: const Color(0xFF1F2937))
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const LinearProgressIndicator(backgroundColor: Colors.transparent, color: Color(0xFF3B82F6), minHeight: 1),
                      const SizedBox(height: 16),
                      Text(
                        "[ SYSTEM ] INITIALIZING_TPU_CORE...\n[ AI ] RUNNING_SEMANTIC_ANALYSIS...\n[ AI ] VECTORIZING_INPUT_STREAM...\n[ AI ] THREAT_LEVEL_CALCULATION...",
                        style: GoogleFonts.jetbrainsMono(color: const Color(0xFF10B981), fontSize: 10, height: 1.6),
                      ),
                    ],
                  ),
                )
              else if (_result != null)
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.black,
                    border: Border(left: BorderSide(color: _result!['severity'] == 'critical' ? const Color(0xFFF43F5E) : const Color(0xFF3B82F6), width: 4), top: const BorderSide(color: Color(0xFF1F2937)), right: const BorderSide(color: Color(0xFF1F2937)), bottom: const BorderSide(color: Color(0xFF1F2937)))
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('SEVERITY: ${_result!['severity'].toString().toUpperCase()}', 
                            style: GoogleFonts.jetbrainsMono(fontWeight: FontWeight.w900, color: _result!['severity'] == 'critical' ? const Color(0xFFF43F5E) : const Color(0xFF3B82F6), fontSize: 12)
                          ),
                          Text('${(_result!['confidence'] * 100).toInt()}%_CONF', style: GoogleFonts.jetbrainsMono(fontSize: 10, color: const Color(0xFF475569)))
                        ],
                      ),
                      const SizedBox(height: 16),
                      Text('INFERENCE_METRICS:', style: GoogleFonts.jetbrainsMono(fontSize: 8, color: const Color(0xFF475569), fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      Text('LATENCY: 124ms | CORE: NANO_V2 | BITRATE: 4.2kbps', style: GoogleFonts.jetbrainsMono(fontSize: 8, color: const Color(0xFF475569))),
                      const SizedBox(height: 24),
                      SizedBox(
                        width: double.infinity,
                        height: 50,
                        child: ElevatedButton(
                          onPressed: _uplinkPacket,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF3B82F6),
                            foregroundColor: Colors.white,
                            shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero)
                          ),
                          child: Text('UPLINK_TO_COMMAND_GRID', style: GoogleFonts.spaceGrotesk(fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 1)),
                        ),
                      )
                    ],
                  ),
                )
              else
                SizedBox(
                  width: double.infinity,
                  height: 60,
                  child: OutlinedButton(
                    onPressed: _processInference,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      side: const BorderSide(color: Color(0xFF1F2937)),
                      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero)
                    ),
                    child: Text('INITIATE_LOCAL_INFERENCE', style: GoogleFonts.spaceGrotesk(fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 1)),
                  ),
                ),
                
              const Spacer(),
              Center(
                child: Column(
                  children: [
                    Text('SECURE_NODE_IDENTIFIER: ${DateTime.now().year}.SHL.01', 
                      style: GoogleFonts.jetbrainsMono(fontSize: 8, color: const Color(0xFF1E293B), letterSpacing: 1, fontWeight: FontWeight.bold)
                    ),
                    const SizedBox(height: 4),
                    Text('TPU_ID: ${(_result?['model'] ?? 'STANDBY').toUpperCase()}', 
                      style: GoogleFonts.jetbrainsMono(fontSize: 8, color: const Color(0xFF1E293B), letterSpacing: 1)
                    ),
                  ],
                )
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
