import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'services/edge_ai_service.dart';

void main() {
  runApp(const SyncBridgeApp());
}

class SyncBridgeApp extends StatelessWidget {
  const SyncBridgeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Sync Bridge Native',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF05070A),
        primaryColor: const Color(0xFF4A9EFF),
        useMaterial3: true,
        textTheme: GoogleFonts.spaceGroteskTextTheme(ThemeData.dark().textTheme),
      ),
      home: const VictimHomeScreen(),
    );
  }
}

class VictimHomeScreen extends StatefulWidget {
  const VictimHomeScreen({super.key});

  @override
  State<VictimHomeScreen> createState() => _VictimHomeScreenState();
}

class _VictimHomeScreenState extends State<VictimHomeScreen> {
  final TextEditingController _controller = TextEditingController();
  final EdgeAIService _aiService = EdgeAIService();
  
  bool _isProcessing = false;
  Map<String, dynamic>? _result;

  void _processSOS() async {
    if (_controller.text.isEmpty) return;
    
    setState(() => _isProcessing = true);
    final result = await _aiService.classifySOS(_controller.text);
    setState(() {
      _result = result;
      _isProcessing = false;
    });
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
              const SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('⚡ SYNC BRIDGE', 
                    style: GoogleFonts.spaceGrotesk(
                      fontWeight: FontWeight.w900, 
                      fontSize: 18, 
                      letterSpacing: 2,
                      color: const Color(0xFF4A9EFF)
                    )
                  ),
                  const CircleAvatar(
                    radius: 4,
                    backgroundColor: Colors.greenAccent,
                  )
                ],
              ),
              const SizedBox(height: 40),
              Text('Emergency Report', 
                style: GoogleFonts.spaceGrotesk(fontSize: 32, fontWeight: FontWeight.w800)
              ),
              const SizedBox(height: 8),
              Text('Input your situation. Analysis happens on-device.', 
                style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 14)
              ),
              const SizedBox(height: 30),
              
              TextField(
                controller: _controller,
                maxLines: 5,
                decoration: InputDecoration(
                  hintText: 'What is your emergency?',
                  filled: true,
                  fillColor: Colors.white.withOpacity(0.03),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(20),
                    borderSide: BorderSide(color: Colors.white.withOpacity(0.1))
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(20),
                    borderSide: const BorderSide(color: Color(0xFF4A9EFF), width: 2)
                  ),
                ),
              ),
              
              const SizedBox(height: 24),
              
              if (_isProcessing)
                const Center(
                  child: Column(
                    children: [
                      CircularProgressIndicator(color: Color(0xFF4A9EFF)),
                      SizedBox(height: 16),
                      Text('RUNNING EDGE AI INFERENCE...', style: TextStyle(fontSize: 10, letterSpacing: 1, fontWeight: FontWeight.bold))
                    ],
                  ),
                )
              else if (_result != null)
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: const Color(0xFF4A9EFF).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFF4A9EFF).withOpacity(0.3))
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('SEVERITY: ${_result!['severity'].toString().toUpperCase()}', 
                            style: const TextStyle(fontWeight: FontWeight.w900, color: Color(0xFF4A9EFF))
                          ),
                          Text('${_result!['confidence'] * 100}% CONF', style: const TextStyle(fontSize: 10))
                        ],
                      ),
                      const SizedBox(height: 12),
                      const Divider(color: Colors.white10),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        height: 50,
                        child: ElevatedButton(
                          onPressed: () {},
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF4A9EFF),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))
                          ),
                          child: const Text('BROADCAST VIA MESH', style: TextStyle(fontWeight: FontWeight.w800)),
                        ),
                      )
                    ],
                  ),
                )
              else
                SizedBox(
                  width: double.infinity,
                  height: 60,
                  child: ElevatedButton(
                    onPressed: _processSOS,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white.withOpacity(0.05),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      side: BorderSide(color: Colors.white.withOpacity(0.1))
                    ),
                    child: const Text('ANALYZE LOCALLY', style: TextStyle(fontWeight: FontWeight.w800)),
                  ),
                ),
                
              const Spacer(),
              Center(
                child: Text('ENGINE: ${_result?['model'] ?? 'Ready'}', 
                  style: const TextStyle(fontSize: 9, color: Colors.white24, letterSpacing: 1)
                )
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}
