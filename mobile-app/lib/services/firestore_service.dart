import 'package:cloud_firestore/cloud_firestore.dart';

/// FIRESTORE SERVICE — SYNC BRIDGE NATIVE
/// Handles the "Final Bridge" synchronization for native mobile devices.
class FirestoreService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  /// Pushes a triaged SOS packet to the global mesh cloud.
  Future<void> syncSOSPacket(Map<String, dynamic> packet) async {
    try {
      print("☁️ [NativeSync] Attempting to push packet: ${packet['id']}");
      
      await _db.collection('incidents').add({
        ...packet,
        'timestamp': FieldValue.serverTimestamp(),
        'platform': 'native_mobile',
      });

      print("✅ [NativeSync] Packet successfully persistent in Firestore.");
    } catch (e) {
      print("⚠️ [NativeSync] Sync failed (Offline Mode Active): $e");
      // Background sync would typically queue this in SQLite/SharedPreferences
    }
  }

  /// Real-time stream for the Rescue Dashboard (if used on mobile).
  Stream<List<Map<String, dynamic>>> getIncidentStream() {
    return _db.collection('incidents')
      .orderBy('timestamp', descending: true)
      .limit(50)
      .snapshots()
      .map((snapshot) => snapshot.docs.map((doc) => doc.data()).toList());
  }
}
