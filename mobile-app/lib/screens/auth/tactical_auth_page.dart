import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../widgets/tactical_container.dart';

class TacticalAuthPage extends StatefulWidget {
  final VoidCallback onBack;
  final Function(String id, String pin) onLogin;

  const TacticalAuthPage({super.key, required this.onBack, required this.onLogin});

  @override
  State<TacticalAuthPage> createState() => _TacticalAuthPageState();
}

class _TacticalAuthPageState extends State<TacticalAuthPage> {
  final _idController = TextEditingController();
  final _pinController = TextEditingController();
  bool _isAuthenticating = false;

  void _handleLogin() async {
    setState(() => _isAuthenticating = true);
    await Future.delayed(const Duration(seconds: 2));
    widget.onLogin(_idController.text, _pinController.text);
    setState(() => _isAuthenticating = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          const ScanlineOverlay(),
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(32.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  IconButton(onPressed: widget.onBack, icon: const Icon(Icons.arrow_back, color: Color(0xFF475569))),
                  const SizedBox(height: 40),
                  Text('SECURE_GATEWAY', style: GoogleFonts.spaceGrotesk(fontSize: 12, letterSpacing: 4, fontWeight: FontWeight.bold, color: const Color(0xFFF43F5E))),
                  Text('COMMAND_GRID_ACCESS', style: GoogleFonts.spaceGrotesk(fontSize: 32, fontWeight: FontWeight.w900, color: Colors.white)),
                  const SizedBox(height: 12),
                  Text('AUTHORIZED_RESCUE_PERSONNEL_ONLY\nCREDENTIALS_ENCRYPTED_VIA_AES_256', 
                    style: GoogleFonts.jetBrainsMono(fontSize: 8, color: const Color(0xFF475569), fontWeight: FontWeight.bold)
                  ),
                  const SizedBox(height: 60),
                  TacticalContainer(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('OPERATOR_ID', style: GoogleFonts.jetBrainsMono(fontSize: 8, color: const Color(0xFF475569), fontWeight: FontWeight.bold)),
                        TextField(
                          controller: _idController,
                          style: GoogleFonts.jetBrainsMono(color: Colors.white, fontSize: 16),
                          decoration: InputDecoration(
                            hintText: 'ADMIN_XX',
                            hintStyle: GoogleFonts.jetBrainsMono(color: const Color(0xFF1E293B)),
                            border: InputBorder.none,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  TacticalContainer(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('SECURE_ACCESS_PIN', style: GoogleFonts.jetBrainsMono(fontSize: 8, color: const Color(0xFF475569), fontWeight: FontWeight.bold)),
                        TextField(
                          controller: _pinController,
                          obscureText: true,
                          style: GoogleFonts.jetBrainsMono(color: Colors.white, fontSize: 16),
                          decoration: InputDecoration(
                            hintText: '••••••••',
                            hintStyle: GoogleFonts.jetBrainsMono(color: const Color(0xFF1E293B)),
                            border: InputBorder.none,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 60),
                  SizedBox(
                    width: double.infinity,
                    height: 60,
                    child: ElevatedButton(
                      onPressed: _isAuthenticating ? null : _handleLogin,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFF43F5E),
                        foregroundColor: Colors.white,
                        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                      ),
                      child: _isAuthenticating 
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : Text('VERIFY_IDENTITY', style: GoogleFonts.spaceGrotesk(fontWeight: FontWeight.w900, letterSpacing: 1)),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Center(
                    child: Text('DEMO: ADMIN_01 / SYNC_BRIDGE_2026', style: GoogleFonts.jetBrainsMono(fontSize: 8, color: const Color(0xFF1E293B))),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
