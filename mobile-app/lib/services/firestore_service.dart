import 'dart:async';
import 'dart:convert';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/incident.dart';
import '../models/rescue_team.dart';
import '../utils/packet_shredder.dart';

enum SyncDispatchOutcome {
  uplinked,
  buffered,
}

class SyncDispatchResult {
  const SyncDispatchResult({
    required this.outcome,
    required this.queuedCount,
    required this.syncMode,
  });

  final SyncDispatchOutcome outcome;
  final int queuedCount;
  final String syncMode;
}

/// FIRESTORE SERVICE — SYNC BRIDGE NATIVE
/// Handles the "Final Bridge" synchronization using Firebase Spark Plan (Direct Write).
class FirestoreService {
  static final FirestoreService _instance = FirestoreService._internal();
  factory FirestoreService() => _instance;
  FirestoreService._internal();

  static const Map<String, int> _teamCapacity = {
    'STRIKE_ALPHA': 6,
    'RESCUE_DELTA': 5,
    'MEDICAL_SIERRA': 4,
    'HEAVY_BRAVO': 8,
  };
  static const _teamsKey = 'sync_bridge_team_roster';
  static const _autoResolveWindow = Duration(seconds: 45);

  FirebaseFirestore? _dbInstance;
  FirebaseFirestore get _db {
    _dbInstance ??= FirebaseFirestore.instance;
    return _dbInstance!;
  }

  // ------------------------------------------------------------------
  // Offline Queue — persisted to SharedPreferences across restarts
  // ------------------------------------------------------------------
  final List<Incident> _offlineQueue = [];
  static const _queueKey = 'sync_bridge_offline_queue';

  // ------------------------------------------------------------------
  // In-memory cache of the latest Firestore snapshot
  // ------------------------------------------------------------------
  List<Incident> _cachedIncidents = [];
  Map<String, int> _currentTeamUnits = Map<String, int>.from(_teamCapacity);
  List<RescueTeam> _teamRoster = const [
    RescueTeam(id: 'STRIKE_ALPHA', displayName: 'STRIKE_ALPHA', capacity: 6),
    RescueTeam(id: 'RESCUE_DELTA', displayName: 'RESCUE_DELTA', capacity: 5),
    RescueTeam(
        id: 'MEDICAL_SIERRA', displayName: 'MEDICAL_SIERRA', capacity: 4),
    RescueTeam(id: 'HEAVY_BRAVO', displayName: 'HEAVY_BRAVO', capacity: 8),
  ];
  StreamSubscription<QuerySnapshot<Map<String, dynamic>>>? _incidentMirrorSub;
  Timer? _offlineRetryTimer;
  Timer? _claimLifecycleTimer;
  final Set<String> _autoResolvingIds = <String>{};

  // ------------------------------------------------------------------
  // Public streams
  // ------------------------------------------------------------------
  final _stabilityController = StreamController<double>.broadcast();
  final _unitsController = StreamController<Map<String, int>>.broadcast();
  final _teamRosterController = StreamController<List<RescueTeam>>.broadcast();

  /// Live stream of incidents directly from Firestore.
  Stream<List<Incident>> get incidentsStream => _db
          .collection('incidents')
          .orderBy('ts', descending: true)
          .snapshots()
          .map((snapshot) {
        _cachedIncidents =
            snapshot.docs.map((doc) => Incident.fromJson(doc.data())).toList();
        _publishTeamAvailability();
        return _cachedIncidents;
      });

  Stream<double> get stabilityStream => _stabilityController.stream;
  Stream<Map<String, int>> get unitsStream => _unitsController.stream;
  Stream<List<RescueTeam>> get teamRosterStream => _teamRosterController.stream;

  double get syncStability => 99.98;
  Map<String, int> get teamUnits => Map.unmodifiable(_currentTeamUnits);
  List<RescueTeam> get teamRoster => List.unmodifiable(_teamRoster);
  int get offlineQueueLength => _offlineQueue.length;

  Map<String, dynamic> _serializeIncident(
    Incident incident, {
    required String syncMode,
    String? packetHash,
  }) {
    final payload = <String, dynamic>{
      ...incident.toJson(),
      'sync_mode': syncMode,
      'synced': true,
      'syncedAt': DateTime.now().toIso8601String(),
    };

    if (packetHash != null) {
      payload['packet_hash'] = packetHash;
    }

    return payload;
  }

  // ------------------------------------------------------------------
  // Initialise: load persisted offline queue, start retry loop
  // ------------------------------------------------------------------
  Future<void> initialize() async {
    await _loadOfflineQueue();
    await _loadTeamRoster();
    _stabilityController.add(syncStability);
    _publishTeamRoster();
    _publishTeamAvailability();
    _startIncidentMirror();
    _claimLifecycleTimer?.cancel();
    _claimLifecycleTimer = Timer.periodic(
      const Duration(seconds: 1),
      (_) => _syncClaimLifecycle(),
    );
    // Retry persisted offline queue every 10 seconds
    _offlineRetryTimer?.cancel();
    _offlineRetryTimer = Timer.periodic(
        const Duration(seconds: 10), (_) => _processOfflineQueue());
  }

  // ------------------------------------------------------------------
  // Cache accessor — returns latest snapshot (used as initialData)
  // ------------------------------------------------------------------
  List<Incident> getIncidents() => List.unmodifiable(_cachedIncidents);

  // ------------------------------------------------------------------
  // Demo seeder — idempotent (uses fixed IDs so re-runs don't duplicate)
  // ------------------------------------------------------------------
  Future<void> seedDemoData() async {
    final demoIncidents = [
      {
        'id': 'DEMO-001',
        'ts': DateTime.now()
            .subtract(const Duration(minutes: 12))
            .millisecondsSinceEpoch,
        'severity': 'critical',
        'category': 'TRAPPED',
        'category_code': 'TU',
        'people_count': 3,
        'lat': 38.8951,
        'lon': -77.0364,
        'packet': 'PKT_TU_03_C_DEMO',
        'confidence': 0.95,
        'status': 'active',
        'claimed_by': null,
        'description':
            'Structural collapse — 3 people trapped under debris on 3rd floor.',
        'phone': '+1 202-555-0101',
        'rec_responders': 6,
        'rec_team_type': 'HEAVY_RESCUE',
        'ai_source': 'SEED_SCENARIO',
        'reasoning': 'Seeded trapped-person incident for dashboard validation.',
        'truth_score': 92,
        'data': {
          'ai_source': 'SEED_SCENARIO',
          'people_count': 3,
          'reasoning':
              'Seeded trapped-person incident for dashboard validation.',
          'sensor_conflict': false,
          'triage_code': 'ALPHA',
          'truth_score': 92,
          'runtime_mode': 'DEMO_SEED',
        },
        'sync_mode': 'SEED_DATA',
      },
      {
        'id': 'DEMO-002',
        'ts': DateTime.now()
            .subtract(const Duration(minutes: 27))
            .millisecondsSinceEpoch,
        'severity': 'urgent',
        'category': 'FIRE',
        'category_code': 'FI',
        'people_count': 1,
        'lat': 38.9072,
        'lon': -77.0369,
        'packet': 'PKT_FI_01_U_DEMO',
        'confidence': 0.88,
        'status': 'claimed',
        'claimed_by': 'STRIKE_ALPHA',
        'claimed_team_id': 'STRIKE_ALPHA',
        'claimed_at': DateTime.now().millisecondsSinceEpoch,
        'auto_resolve_at':
            DateTime.now().add(_autoResolveWindow).millisecondsSinceEpoch,
        'description': null,
        'phone': '+1 202-555-0199',
        'rec_responders': 4,
        'rec_team_type': 'STANDARD_RESPONSE',
        'ai_source': 'SEED_SCENARIO',
        'reasoning': 'Seeded fire incident already claimed by Strike Alpha.',
        'truth_score': 84,
        'data': {
          'ai_source': 'SEED_SCENARIO',
          'people_count': 1,
          'reasoning': 'Seeded fire incident already claimed by Strike Alpha.',
          'sensor_conflict': false,
          'triage_code': 'BRAVO',
          'truth_score': 84,
          'runtime_mode': 'DEMO_SEED',
        },
        'sync_mode': 'SEED_DATA',
      },
      {
        'id': 'DEMO-003',
        'ts': DateTime.now()
            .subtract(const Duration(minutes: 45))
            .millisecondsSinceEpoch,
        'severity': 'standard',
        'category': 'GENERAL',
        'category_code': 'GE',
        'people_count': 2,
        'lat': 38.8830,
        'lon': -77.0200,
        'packet': 'PKT_GE_02_S_DEMO',
        'confidence': 0.72,
        'status': 'resolved',
        'claimed_by': 'MEDICAL_SIERRA',
        'claimed_team_id': 'MEDICAL_SIERRA',
        'resolved_at': DateTime.now()
            .subtract(const Duration(minutes: 8))
            .millisecondsSinceEpoch,
        'description': null,
        'phone': '+1 202-555-0142',
        'rec_responders': 2,
        'rec_team_type': 'STANDARD_RESPONSE',
        'ai_source': 'SEED_SCENARIO',
        'reasoning':
            'Seeded lower-priority support request for resolved-state testing.',
        'truth_score': 71,
        'data': {
          'ai_source': 'SEED_SCENARIO',
          'people_count': 2,
          'reasoning':
              'Seeded lower-priority support request for resolved-state testing.',
          'sensor_conflict': false,
          'triage_code': 'CHARLIE',
          'truth_score': 71,
          'runtime_mode': 'DEMO_SEED',
        },
        'sync_mode': 'SEED_DATA',
      },
    ];

    final batch = _db.batch();
    for (final data in demoIncidents) {
      final ref = _db.collection('incidents').doc(data['id'] as String);
      // merge: true avoids overwriting incidents that have been updated (e.g. claimed/resolved)
      batch.set(ref, data, SetOptions(merge: true));
    }
    await batch.commit();
    print('🌱 [SyncBridge] Demo data seeded (3 incidents).');
  }

  // ------------------------------------------------------------------
  // Sync a new SOS packet — direct Spark write, queue on failure
  // ------------------------------------------------------------------
  Future<SyncDispatchResult> syncSOSPacket(Incident incident) async {
    try {
      print('☁️ [SyncBridge] Pushing packet (Spark Mode): ${incident.id}');
      final shredded = PacketShredder.shred(incident);
      print('📦 [SyncBridge] Shredded into ${shredded.length} bytes.');

      await _db.collection('incidents').doc(incident.id).set(
            _serializeIncident(
              incident,
              syncMode: 'SPARK_DIRECT_UPLINK',
              packetHash: shredded.hashCode.toString(),
            ),
          );

      print('✅ [SyncBridge] Spark Sync Successful.');
      return SyncDispatchResult(
        outcome: SyncDispatchOutcome.uplinked,
        queuedCount: _offlineQueue.length,
        syncMode: 'SPARK_DIRECT_UPLINK',
      );
    } catch (e) {
      print('⚠️ [SyncBridge] Sync failed — saving to Offline Queue: $e');
      _offlineQueue.add(
        incident.copyWith(
          syncMode: 'OFFLINE_QUEUED',
          synced: false,
        ),
      );
      await _saveOfflineQueue();
      return SyncDispatchResult(
        outcome: SyncDispatchOutcome.buffered,
        queuedCount: _offlineQueue.length,
        syncMode: 'OFFLINE_QUEUED',
      );
    }
  }

  // ------------------------------------------------------------------
  // Flush offline queue to Firestore
  // ------------------------------------------------------------------
  Future<void> _processOfflineQueue() async {
    if (_offlineQueue.isEmpty) return;

    print(
        '🔄 [SyncBridge] Retrying offline queue (${_offlineQueue.length} items)...');
    final toRetry = List<Incident>.from(_offlineQueue);

    for (final incident in toRetry) {
      try {
        await _db.collection('incidents').doc(incident.id).set(
              _serializeIncident(
                incident,
                syncMode: 'SPARK_RECOVERY_UPLINK',
              ),
            );
        _offlineQueue.removeWhere((i) => i.id == incident.id);
        print('✅ [SyncBridge] Recovered incident: ${incident.id}');
      } catch (e) {
        print(
            '❌ [SyncBridge] Recovery failed for ${incident.id}: Still offline.');
        break; // Stop on first failure — network not yet available
      }
    }

    await _saveOfflineQueue();
  }

  // ------------------------------------------------------------------
  // Real-time listener (used directly if preferred over incidentsStream)
  // ------------------------------------------------------------------
  Stream<List<Incident>> listenToGlobalIncidents() {
    return _db
        .collection('incidents')
        .orderBy('ts', descending: true)
        .snapshots()
        .map((snapshot) {
      final incidents =
          snapshot.docs.map((doc) => Incident.fromJson(doc.data())).toList();
      _cachedIncidents = incidents;
      _publishTeamAvailability();
      return incidents;
    });
  }

  // ------------------------------------------------------------------
  // Dispatch: claim an incident for a rescue team
  // ------------------------------------------------------------------
  Future<bool> claimIncident(
      String id, String teamName, int responderCount) async {
    try {
      final team = _findTeamById(teamName);
      final claimedAt = DateTime.now();
      await _db.collection('incidents').doc(id).update({
        'status': 'claimed',
        'claimed_by': team?.displayName ?? teamName,
        'claimed_team_id': teamName,
        'claimed_at': claimedAt.millisecondsSinceEpoch,
        'auto_resolve_at':
            claimedAt.add(_autoResolveWindow).millisecondsSinceEpoch,
        'resolved_at': null,
        'rec_responders': responderCount,
      });
      return true;
    } catch (e) {
      print('❌ [Dispatch] Claim failed: $e');
      return false;
    }
  }

  // ------------------------------------------------------------------
  // Resolve an incident (Mission Complete)
  // ------------------------------------------------------------------
  Future<bool> resolveIncident(String id) async {
    try {
      await _db.collection('incidents').doc(id).update({
        'status': 'resolved',
        'resolved_at': DateTime.now().millisecondsSinceEpoch,
      });
      return true;
    } catch (e) {
      print('❌ [Resolution] Resolve failed: $e');
      return false;
    }
  }

  // ------------------------------------------------------------------
  // SharedPreferences persistence for offline queue
  // ------------------------------------------------------------------
  Future<void> _saveOfflineQueue() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final encoded = jsonEncode(_offlineQueue.map((i) => i.toJson()).toList());
      await prefs.setString(_queueKey, encoded);
    } catch (e) {
      print('⚠️ [OfflineQueue] Failed to persist queue: $e');
    }
  }

  Future<void> _loadOfflineQueue() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_queueKey);
      if (raw == null || raw.isEmpty) return;

      final List<dynamic> decoded = jsonDecode(raw);
      _offlineQueue.addAll(
          decoded.map((j) => Incident.fromJson(j as Map<String, dynamic>)));
      print(
          '📂 [OfflineQueue] Restored ${_offlineQueue.length} queued incident(s) from storage.');
    } catch (e) {
      print('⚠️ [OfflineQueue] Failed to restore queue: $e');
    }
  }

  Future<void> _loadTeamRoster() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_teamsKey);
      if (raw == null || raw.isEmpty) return;

      final List<dynamic> decoded = jsonDecode(raw);
      final loaded = decoded
          .map((team) => RescueTeam.fromJson(team as Map<String, dynamic>))
          .toList();

      if (loaded.isNotEmpty) {
        _teamRoster = loaded;
      }
    } catch (e) {
      print('⚠️ [Teams] Failed to restore team roster: $e');
    }
  }

  Future<void> updateTeamRoster(List<RescueTeam> roster) async {
    _teamRoster = roster;
    _publishTeamRoster();
    _publishTeamAvailability();

    try {
      final prefs = await SharedPreferences.getInstance();
      final encoded =
          jsonEncode(_teamRoster.map((team) => team.toJson()).toList());
      await prefs.setString(_teamsKey, encoded);
    } catch (e) {
      print('⚠️ [Teams] Failed to persist team roster: $e');
    }
  }

  void _startIncidentMirror() {
    _incidentMirrorSub?.cancel();
    _incidentMirrorSub = _db
        .collection('incidents')
        .orderBy('ts', descending: true)
        .snapshots()
        .listen(
      (snapshot) {
        _cachedIncidents =
            snapshot.docs.map((doc) => Incident.fromJson(doc.data())).toList();
        _publishTeamAvailability();
      },
      onError: (Object error) {
        print(
            '⚠️ [Units] Failed to mirror incidents for unit availability: $error');
      },
    );
  }

  void _publishTeamAvailability() {
    final nextAvailability = <String, int>{
      for (final team in _teamRoster) team.id: team.capacity,
    };

    for (final incident in _cachedIncidents) {
      if (incident.status != IncidentStatus.claimed) continue;

      final teamName = incident.claimedTeamId ??
          _teamRoster
              .where((team) => team.displayName == incident.claimedBy)
              .map((team) => team.id)
              .cast<String?>()
              .firstWhere(
                (value) => value != null,
                orElse: () => null,
              );
      if (teamName == null || !nextAvailability.containsKey(teamName)) continue;

      final reservedUnits = incident.recResponders ?? 0;
      final remainingUnits =
          (nextAvailability[teamName]! - reservedUnits).clamp(0, 999);
      nextAvailability[teamName] = remainingUnits.toInt();
    }

    _currentTeamUnits = nextAvailability;
    if (!_unitsController.isClosed) {
      _unitsController.add(Map.unmodifiable(_currentTeamUnits));
    }
  }

  void _publishTeamRoster() {
    if (!_teamRosterController.isClosed) {
      _teamRosterController.add(List<RescueTeam>.unmodifiable(_teamRoster));
    }
  }

  RescueTeam? _findTeamById(String id) {
    for (final team in _teamRoster) {
      if (team.id == id) return team;
    }
    return null;
  }

  Future<void> _syncClaimLifecycle() async {
    final now = DateTime.now();
    final dueIncidents = _cachedIncidents.where((incident) {
      return incident.status == IncidentStatus.claimed &&
          incident.autoResolveAt != null &&
          !incident.autoResolveAt!.isAfter(now) &&
          !_autoResolvingIds.contains(incident.id);
    }).toList();

    for (final incident in dueIncidents) {
      _autoResolvingIds.add(incident.id);
      try {
        await resolveIncident(incident.id);
      } finally {
        _autoResolvingIds.remove(incident.id);
      }
    }
  }

  // ------------------------------------------------------------------
  // Command Grid Aliases
  // ------------------------------------------------------------------
  Stream<List<Incident>> get tacticalIncidentsStream => incidentsStream;
  List<Incident> getMergedIncidents() => getIncidents();
}
