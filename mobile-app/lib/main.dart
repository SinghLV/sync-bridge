import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'screens/auth/mode_selection_page.dart';
import 'screens/auth/tactical_auth_page.dart';
import 'screens/victim/victim_flow_page.dart';
import 'screens/rescue/command_grid_page.dart';
import 'services/firestore_service.dart';
import 'services/edge_ai_service.dart';

import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // ── Firebase ──────────────────────────────────────────────────────────
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    print('🔥 Firebase initialized successfully.');
  } catch (e) {
    print('⚠️ Firebase initialization failed: $e');
  }

  // ── FirestoreService bootstrap ────────────────────────────────────────
  // Restores persisted offline queue and starts the 10-second retry loop.
  await FirestoreService().initialize();

  // Seed 3 demo incidents into Firestore (merge:true — safe to call every run).
  // Remove this call once the app has real incident data.
  try {
    await FirestoreService().seedDemoData();
  } catch (e) {
    print('⚠️ Demo seed failed (no connectivity?): $e');
  }

  // ── Edge AI pre-warm ──────────────────────────────────────────────────
  // Initialises the active runtime path in the background so the first SOS
  // classification has no cold-start delay.
  EdgeAIService().initModel().then((_) {
    print('🧠 EdgeAI runtime: ${EdgeAIService().diagnosticsSnapshot()}');
  }).catchError((e) {
    print('⚠️ EdgeAI pre-warm failed: $e');
  });

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
        scaffoldBackgroundColor: Colors.black,
        primaryColor: const Color(0xFF3B82F6),
        useMaterial3: true,
        textTheme: GoogleFonts.spaceGroteskTextTheme(ThemeData.dark().textTheme),
      ),
      home: const MainRouter(),
    );
  }
}

class MainRouter extends StatefulWidget {
  const MainRouter({super.key});

  @override
  State<MainRouter> createState() => _MainRouterState();
}

class _MainRouterState extends State<MainRouter> {
  String _currentRoute = 'selection'; // selection, auth, victim, rescue

  void _navigateTo(String route) {
    setState(() => _currentRoute = route);
  }

  @override
  Widget build(BuildContext context) {
    switch (_currentRoute) {
      case 'selection':
        return ModeSelectionPage(
          onSelectVictim: () => _navigateTo('victim'),
          onSelectRescue: () => _navigateTo('auth'),
        );
      case 'auth':
        return TacticalAuthPage(
          onBack: () => _navigateTo('selection'),
          onLogin: (id, pin) {
            // Basic demo validation
            if (id == 'ADMIN_01' && pin == 'SYNC_BRIDGE_2026') {
              _navigateTo('rescue');
            } else {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('INVALID_CREDENTIALS')),
              );
            }
          },
        );
      case 'victim':
        return VictimFlowPage(
          onBack: () => _navigateTo('selection'),
        );
      case 'rescue':
        return CommandGridPage(
          onLogout: () => _navigateTo('selection'),
        );
      default:
        return const Scaffold(body: Center(child: Text('ROUTE_ERR')));
    }
  }
}
