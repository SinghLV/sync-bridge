import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../widgets/tactical_container.dart';

class ModeSelectionPage extends StatelessWidget {
  final VoidCallback onSelectVictim;
  final VoidCallback onSelectRescue;

  const ModeSelectionPage({
    super.key,
    required this.onSelectVictim,
    required this.onSelectRescue,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          const ScanlineOverlay(),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(32.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Spacer(),
                  Text('SYNC_BRIDGE', style: GoogleFonts.spaceGrotesk(fontSize: 12, letterSpacing: 8, fontWeight: FontWeight.bold, color: const Color(0xFF3B82F6))),
                  const SizedBox(height: 8),
                  Text('TACTICAL_NODE_v5.0', style: GoogleFonts.spaceGrotesk(fontSize: 40, fontWeight: FontWeight.w900, color: Colors.white, height: 1)),
                  const SizedBox(height: 16),
                  Text('OFFLINE_MESH_SYNCHRONIZATION_ACTIVE\nFIRESTORE_SYNC + EDGE_AI_RUNTIME_CHECK', 
                    style: GoogleFonts.jetBrainsMono(fontSize: 8, color: const Color(0xFF475569), fontWeight: FontWeight.bold, height: 1.5)
                  ),
                  const SizedBox(height: 60),
                  _SelectionButton(
                    title: 'BEACON_MODE',
                    subtitle: 'BROADCAST_SOS_SIGNAL',
                    icon: Icons.sensors,
                    onTap: onSelectVictim,
                    color: const Color(0xFF3B82F6),
                  ),
                  const SizedBox(height: 20),
                  _SelectionButton(
                    title: 'COMMAND_GRID',
                    subtitle: 'RESPONDER_COORD_SYSTEM',
                    icon: Icons.security,
                    onTap: onSelectRescue,
                    color: const Color(0xFFF43F5E),
                  ),
                  const Spacer(),
                  Center(
                    child: Text('ENCRYPTED_UPLINK_ESTABLISHED', style: GoogleFonts.jetBrainsMono(fontSize: 6, color: const Color(0xFF1E293B))),
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

class _SelectionButton extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final VoidCallback onTap;
  final Color color;

  const _SelectionButton({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.onTap,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: TacticalContainer(
        borderColor: color,
        showGlow: true,
        padding: 0,
        child: Container(
          padding: const EdgeInsets.all(24),
          child: Row(
            children: [
              Icon(icon, color: color, size: 32),
              const SizedBox(width: 24),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: GoogleFonts.spaceGrotesk(fontSize: 20, fontWeight: FontWeight.w900, color: Colors.white)),
                    Text(subtitle, style: GoogleFonts.jetBrainsMono(fontSize: 8, color: const Color(0xFF475569), fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
              Icon(Icons.arrow_forward_ios, color: color.withValues(alpha: 0.3), size: 16),
            ],
          ),
        ),
      ),
    );
  }
}
