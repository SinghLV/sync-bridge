import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../models/incident.dart';
import '../../services/device_location_service.dart';
import '../../services/edge_ai_service.dart';
import '../../services/firestore_service.dart';
import '../../widgets/tactical_container.dart';
import '../../services/network_service.dart';

class VictimFlowPage extends StatefulWidget {
  final VoidCallback onBack;

  const VictimFlowPage({super.key, required this.onBack});

  @override
  State<VictimFlowPage> createState() => _VictimFlowPageState();
}

class _VictimFlowPageState extends State<VictimFlowPage> {
  int _step =
      0; // 0: Category, 1: Description (if other), 2: Phone, 3: Count, 4: Inference, 5: Review, 6: Success
  String? _selectedCategory;
  String? _selectedCode;
  String _customDescription = "";
  String _phoneNumber = "";
  int _peopleCount = 1;
  Map<String, dynamic>? _inferenceResult;
  bool _isSyncing = false;
  bool _isResolvingLocation = false;
  String _locationStatus = 'GPS_LOCK_PENDING';
  LiveLocationLock? _liveLocation;
  Future<bool>? _locationRequest;
  SyncDispatchResult? _lastDispatchResult;

  final DeviceLocationService _locationService = DeviceLocationService();
  final NetworkService _networkService = NetworkService();
  StreamSubscription? _networkSub;
  int _signalDbm = -82;
  BridgeMode _bridgeMode = BridgeMode.nominal;

  String get _bridgeLabel {
    switch (_bridgeMode) {
      case BridgeMode.nominal:
        return 'NETWORK_READY';
      case BridgeMode.ultraLight:
        return 'LOW_BW_MODE';
      case BridgeMode.blackout:
        return 'OFFLINE_MESH';
    }
  }

  String get _bridgeRoute {
    switch (_bridgeMode) {
      case BridgeMode.nominal:
        return 'REAL_TIME';
      case BridgeMode.ultraLight:
        return 'BIT_PACKED';
      case BridgeMode.blackout:
        return 'BUFFERED';
    }
  }

  String get _bridgeSummary {
    switch (_bridgeMode) {
      case BridgeMode.nominal:
        return 'Full uplink path with cloud-assisted triage available.';
      case BridgeMode.ultraLight:
        return 'Bandwidth-aware relay mode for unstable links.';
      case BridgeMode.blackout:
        return 'Packets stay in the local queue until a mesh bridge opens.';
    }
  }

  @override
  void initState() {
    super.initState();
    _networkService.startProbing();
    _networkSub = _networkService.signalStream.listen((dbm) {
      if (mounted) {
        setState(() {
          _signalDbm = dbm;
          _bridgeMode = _networkService.currentMode;
        });
      }
    });
  }

  @override
  void dispose() {
    _networkSub?.cancel();
    _networkService.stopProbing();
    super.dispose();
  }

  final List<Map<String, String>> _categories = [
    {'id': 'TI', 'label': 'CRITICAL_INJURY', 'sub': 'TRAUMA / HEMORRHAGE'},
    {'id': 'TU', 'label': 'STRUCTURAL_COLLAPSE', 'sub': 'ENTRAPMENT_ACTIVE'},
    {'id': 'MH', 'label': 'MEDICAL_ACUTE', 'sub': 'CARDIAC / RESPIRATORY'},
    {'id': 'FI', 'label': 'HAZMAT_FIRE', 'sub': 'THERMAL_THREAT'},
    {'id': 'FL', 'label': 'FLASH_FLOOD', 'sub': 'WATER_LEVEL_CRITICAL'},
    {'id': 'GE', 'label': 'EVAC_SUPPORT', 'sub': 'LOGISTICAL_EXTRACTION'},
    {'id': 'OT', 'label': 'OTHER_EMERGENCY', 'sub': 'MANUAL_BRIEF_REQUIRED'},
  ];

  void _prevStep() {
    if (_step == 2 && _selectedCode != 'OT') {
      setState(() => _step = 0);
    } else {
      setState(() => _step--);
    }
  }

  void _runInference() async {
    _resetLocationLock();
    _lastDispatchResult = null;
    setState(() => _step = 4); // Move to inference
    final ai = EdgeAIService();
    final message = _selectedCode == 'OT'
        ? _customDescription
        : "Emergency in $_selectedCategory";
    final result = await ai.classifySOS(message, peopleCount: _peopleCount);
    if (!mounted) return;
    setState(() {
      _inferenceResult = result;
      _step = 5; // Move to review
    });
    unawaited(_captureLiveLocation());
  }

  void _uplink() async {
    setState(() => _isSyncing = true);

    final locationReady = await _captureLiveLocation();
    if (!locationReady || _liveLocation == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('LIVE_LOCATION_REQUIRED // $_locationStatus')),
        );
        setState(() => _isSyncing = false);
      }
      return;
    }

    final incident = Incident(
      id: 'BEACON-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}',
      timestamp: DateTime.now(),
      severity: _inferenceResult!['severity'],
      category: _selectedCode == 'OT'
          ? 'CUSTOM_INCIDENT'
          : _inferenceResult!['category'],
      categoryCode: _selectedCode!,
      peopleCount: _peopleCount,
      latitude: _liveLocation!.latitude,
      longitude: _liveLocation!.longitude,
      rawPacket:
          'PKT_${_selectedCode}_0${_peopleCount}_${_inferenceResult!['severity'].toString().split('.').last[0].toUpperCase()}',
      confidence: _inferenceResult!['confidence'],
      description: _selectedCode == 'OT' ? _customDescription : null,
      phoneNumber: _phoneNumber,
      recResponders: _inferenceResult!['rec_responders'],
      recTeamType: _inferenceResult!['rec_team_type'],
      aiSource: _inferenceResult!['ai_source']?.toString(),
      aiModel: (_inferenceResult!['ai_model'] ?? _inferenceResult!['model'])
          ?.toString(),
      reasoning: _inferenceResult!['reasoning']?.toString(),
      truthScore: _asDouble(_inferenceResult!['truth_score']),
      sensorConflict: _inferenceResult!['sensor_conflict'] == true,
      triageCode: _inferenceResult!['triage_code']?.toString(),
      runtimeMode: _inferenceResult!['runtime_mode']?.toString(),
      syncMode: _bridgeMode == BridgeMode.nominal
          ? 'NOMINAL_UPLINK'
          : (_bridgeMode == BridgeMode.ultraLight
              ? 'ULTRA_LIGHT_PACKET'
              : 'OFFLINE_QUEUED'),
      data: {
        'ai_source': _inferenceResult!['ai_source'],
        'ai_model': _inferenceResult!['ai_model'] ?? _inferenceResult!['model'],
        'people_count': _peopleCount,
        'reasoning': _inferenceResult!['reasoning'],
        'sensor_conflict': _inferenceResult!['sensor_conflict'] == true,
        'triage_code': _inferenceResult!['triage_code'],
        'truth_score': _inferenceResult!['truth_score'],
        'runtime_mode': _inferenceResult!['runtime_mode'],
        'tflite_ready': _inferenceResult!['tflite_ready'] == true,
        'tflite_status': _inferenceResult!['tflite_status'],
      },
    );

    final dispatchResult = await FirestoreService().syncSOSPacket(incident);

    // 3. Move to Success Screen (Fast transition)
    if (mounted) {
      Future.delayed(const Duration(milliseconds: 600), () {
        if (mounted) {
          setState(() {
            _isSyncing = false;
            _lastDispatchResult = dispatchResult;
            _step = 6;
          });
        }
      });
    }
  }

  double? _asDouble(dynamic value) {
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value);
    return null;
  }

  void _resetLocationLock() {
    _locationRequest = null;
    _liveLocation = null;
    _isResolvingLocation = false;
    _locationStatus = 'GPS_LOCK_PENDING';
  }

  Future<bool> _captureLiveLocation({bool forceRefresh = false}) {
    if (!forceRefresh && _liveLocation != null) {
      return Future.value(true);
    }

    final activeRequest = _locationRequest;
    if (activeRequest != null) {
      return activeRequest;
    }

    final request = _resolveLiveLocation(forceRefresh: forceRefresh);
    _locationRequest = request;
    request.whenComplete(() {
      if (identical(_locationRequest, request)) {
        _locationRequest = null;
      }
    });
    return request;
  }

  Future<bool> _resolveLiveLocation({bool forceRefresh = false}) async {
    if (mounted) {
      setState(() {
        _isResolvingLocation = true;
        _locationStatus =
            forceRefresh ? 'REFRESHING_GPS_LOCK' : 'ACQUIRING_LIVE_GPS_LOCK';
      });
    }

    try {
      final liveLocation = await _locationService.acquireCurrentLocation();
      if (!mounted) return true;

      final accuracy = liveLocation.accuracyMeters;
      setState(() {
        _liveLocation = liveLocation;
        _locationStatus = accuracy == null
            ? 'GPS_LOCKED'
            : 'GPS_LOCKED // ±${accuracy.toStringAsFixed(0)}M';
      });
      return true;
    } on DeviceLocationException catch (error) {
      if (mounted) {
        setState(() => _locationStatus = error.message);
      }
      return false;
    } catch (_) {
      if (mounted) {
        setState(() => _locationStatus = 'GPS_FIX_UNAVAILABLE');
      }
      return false;
    } finally {
      if (mounted) {
        setState(() => _isResolvingLocation = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          const ScanlineOverlay(),
          SafeArea(
            child: Column(
              children: [
                _buildHeader(),
                Expanded(
                  child: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 300),
                    child: _buildBody(),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text('SIGNAL_STRENGTH // $_signalDbm dBm',
              style: GoogleFonts.jetBrainsMono(
                  fontSize: 8,
                  color: _bridgeMode == BridgeMode.nominal
                      ? const Color(0xFF3B82F6)
                      : (_bridgeMode == BridgeMode.ultraLight
                          ? const Color(0xFFF59E0B)
                          : const Color(0xFFF43F5E)),
                  fontWeight: FontWeight.bold)),
          if (_step < 6)
            InkWell(
              onTap: widget.onBack,
              child: Text('TERMINATE_SESSION',
                  style: GoogleFonts.jetBrainsMono(
                      fontSize: 8,
                      color: const Color(0xFFF43F5E),
                      fontWeight: FontWeight.bold)),
            ),
        ],
      ),
    );
  }

  Widget _buildBody() {
    switch (_step) {
      case 0:
        return _buildCategoryGrid();
      case 1:
        return _buildDescriptionInput();
      case 2:
        return _buildPhoneInput();
      case 3:
        return _buildCountSelector();
      case 4:
        return _buildInferenceUI();
      case 5:
        return _buildReviewUI();
      case 6:
        return _buildSuccessUI();
      default:
        return const SizedBox();
    }
  }

  Widget _buildCategoryGrid() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24.0),
      child: Column(
        key: const ValueKey('step0'),
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('INCIDENT_REPORT',
              style: GoogleFonts.spaceGrotesk(
                  fontSize: 32,
                  fontWeight: FontWeight.w900,
                  color: Colors.white)),
          Text('SELECT_PRIMARY_SITUATION_CODE',
              style: GoogleFonts.jetBrainsMono(
                  fontSize: 10,
                  color: const Color(0xFF475569),
                  fontWeight: FontWeight.bold)),
          const SizedBox(height: 32),
          Expanded(
            child: ListView.separated(
              itemCount: _categories.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final cat = _categories[index];
                return _buildCategoryCard(cat);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryCard(Map<String, String> cat) {
    final isOther = cat['id'] == 'OT';
    return InkWell(
      onTap: () {
        setState(() {
          _resetLocationLock();
          _selectedCategory = cat['label'];
          _selectedCode = cat['id'];
          if (isOther) {
            _step = 1;
          } else {
            _step = 2;
          }
        });
      },
      child: TacticalContainer(
        padding: 0,
        borderColor:
            isOther ? const Color(0xFF10B981) : const Color(0xFF1F2937),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            children: [
              Container(
                  width: 4,
                  height: 24,
                  color: isOther
                      ? const Color(0xFF10B981)
                      : const Color(0xFF3B82F6)),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(cat['label']!,
                        style: GoogleFonts.jetBrainsMono(
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            color: Colors.white)),
                    Text(cat['sub']!,
                        style: GoogleFonts.jetBrainsMono(
                            fontSize: 8,
                            color: const Color(0xFF475569),
                            fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
              Text(cat['id']!,
                  style: GoogleFonts.jetBrainsMono(
                      fontSize: 10,
                      color: const Color(0xFF1E293B),
                      fontWeight: FontWeight.w900)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDescriptionInput() {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        key: const ValueKey('step1'),
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('BRIEF_DESCRIPTION',
              style: GoogleFonts.spaceGrotesk(
                  fontSize: 32,
                  fontWeight: FontWeight.w900,
                  color: Colors.white)),
          Text('DESCRIBE_SITUATION_IN_FEW_WORDS',
              style: GoogleFonts.jetBrainsMono(
                  fontSize: 10,
                  color: const Color(0xFF475569),
                  fontWeight: FontWeight.bold)),
          const SizedBox(height: 48),
          TacticalContainer(
            child: TextField(
              autofocus: true,
              style: GoogleFonts.jetBrainsMono(color: Colors.white),
              onChanged: (v) => _customDescription = v,
              decoration: InputDecoration(
                hintText: 'EG: SMOKE ON 4TH FLOOR, NEED EVAC...',
                hintStyle: GoogleFonts.jetBrainsMono(
                    color: const Color(0xFF1E293B), fontSize: 12),
                border: InputBorder.none,
              ),
              maxLines: 4,
            ),
          ),
          const Spacer(),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _prevStep,
                  style: OutlinedButton.styleFrom(
                      shape: const RoundedRectangleBorder(
                          borderRadius: BorderRadius.zero)),
                  child: Text('BACK',
                      style: GoogleFonts.jetBrainsMono(fontSize: 10)),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: ElevatedButton(
                  onPressed: () {
                    if (_customDescription.isNotEmpty) {
                      setState(() => _step = 2);
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF3B82F6),
                    foregroundColor: Colors.white,
                    shape: const RoundedRectangleBorder(
                        borderRadius: BorderRadius.zero),
                  ),
                  child: Text('CONTINUE',
                      style: GoogleFonts.jetBrainsMono(
                          fontSize: 10, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPhoneInput() {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        key: const ValueKey('step2'),
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('CONTACT_CHANNEL',
              style: GoogleFonts.spaceGrotesk(
                  fontSize: 32,
                  fontWeight: FontWeight.w900,
                  color: Colors.white)),
          Text('ENTER_LOCAL_CONTACT_FOR_COORDINATION',
              style: GoogleFonts.jetBrainsMono(
                  fontSize: 10,
                  color: const Color(0xFF475569),
                  fontWeight: FontWeight.bold)),
          const SizedBox(height: 48),
          TacticalContainer(
            child: TextField(
              autofocus: true,
              keyboardType: TextInputType.phone,
              style: GoogleFonts.jetBrainsMono(
                  color: Colors.white,
                  fontSize: 24,
                  fontWeight: FontWeight.w900),
              onChanged: (v) => _phoneNumber = v,
              decoration: InputDecoration(
                hintText: '+XX 000-000-0000',
                hintStyle: GoogleFonts.jetBrainsMono(
                    color: const Color(0xFF1E293B), fontSize: 16),
                border: InputBorder.none,
              ),
            ),
          ),
          const Spacer(),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _prevStep,
                  style: OutlinedButton.styleFrom(
                      shape: const RoundedRectangleBorder(
                          borderRadius: BorderRadius.zero)),
                  child: Text('BACK',
                      style: GoogleFonts.jetBrainsMono(fontSize: 10)),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: ElevatedButton(
                  onPressed: () {
                    if (_phoneNumber.isNotEmpty) setState(() => _step = 3);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF3B82F6),
                    foregroundColor: Colors.white,
                    shape: const RoundedRectangleBorder(
                        borderRadius: BorderRadius.zero),
                  ),
                  child: Text('CONTINUE',
                      style: GoogleFonts.jetBrainsMono(
                          fontSize: 10, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCountSelector() {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        key: const ValueKey('step3'),
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('PERSONNEL_COUNT',
              style: GoogleFonts.spaceGrotesk(
                  fontSize: 32,
                  fontWeight: FontWeight.w900,
                  color: Colors.white)),
          Text('ESTIMATE_VICTIMS_IN_VICINITY',
              style: GoogleFonts.jetBrainsMono(
                  fontSize: 10,
                  color: const Color(0xFF475569),
                  fontWeight: FontWeight.bold)),
          const SizedBox(height: 48),
          GridView.count(
            shrinkWrap: true,
            crossAxisCount: 2,
            mainAxisSpacing: 16,
            crossAxisSpacing: 16,
            children: [1, 2, 5, 10, 0].map((n) {
              final isOther = n == 0;
              return InkWell(
                onTap: () async {
                  if (isOther) {
                    final result = await showDialog<int>(
                      context: context,
                      builder: (context) => _CustomCountDialog(),
                    );
                    if (result != null) {
                      setState(() => _peopleCount = result);
                      _runInference();
                    }
                  } else {
                    setState(() => _peopleCount = n);
                    _runInference();
                  }
                },
                child: TacticalContainer(
                  showGlow: _peopleCount == n && !isOther,
                  borderColor: _peopleCount == n && !isOther
                      ? const Color(0xFF3B82F6)
                      : const Color(0xFF1F2937),
                  child: Center(
                    child: Text(isOther ? 'OTHER' : (n == 10 ? '10+' : '$n'),
                        style: GoogleFonts.jetBrainsMono(
                            fontSize: isOther ? 14 : 32,
                            fontWeight: FontWeight.w900,
                            color: Colors.white)),
                  ),
                ),
              );
            }).toList(),
          ),
          const Spacer(),
          Center(
            child: TextButton(
              onPressed: _prevStep,
              child: Text('← RETURN_TO_PREVIOUS',
                  style: GoogleFonts.jetBrainsMono(
                      fontSize: 10,
                      color: const Color(0xFF475569),
                      fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInferenceUI() {
    final aiDiagnostics = EdgeAIService().diagnosticsSnapshot();

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40.0),
        child: TacticalContainer(
          showGlow: true,
          borderColor: const Color(0xFF3B82F6),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const LinearProgressIndicator(
                  backgroundColor: Colors.transparent,
                  color: Color(0xFF3B82F6),
                  minHeight: 1),
              const SizedBox(height: 24),
              Text(
                "[ AI ] CHECKING_RUNTIME_PATH...\n"
                "[ AI ] FIRESTORE_LINK_ACTIVE...\n"
                "[ AI ] API_PROXY=${aiDiagnostics['api_key_present'] == true ? 'AVAILABLE' : 'MISSING'}...\n"
                "[ AI ] TFLITE=${aiDiagnostics['tflite_ready'] == true ? 'READY' : 'NOT_BUNDLED'}...\n"
                "[ AI ] RUNNING_TRIAGE_ANALYSIS...",
                style: GoogleFonts.jetBrainsMono(
                    color: const Color(0xFF10B981), fontSize: 10, height: 1.8),
              ),
              const SizedBox(height: 24),
              const Text('PROCESSING_UPLINK...',
                  style: TextStyle(
                      color: Color(0xFF3B82F6),
                      fontSize: 10,
                      fontWeight: FontWeight.bold)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildReviewUI() {
    final severity = _inferenceResult!['severity'] as IncidentSeverity;
    final color = severity == IncidentSeverity.critical
        ? const Color(0xFFF43F5E)
        : const Color(0xFF3B82F6);
    final truthScore = _asDouble(_inferenceResult!['truth_score'])?.round();
    final runtimeMode =
        (_inferenceResult!['runtime_mode'] ?? 'UNKNOWN').toString();
    final aiSource = (_inferenceResult!['ai_source'] ?? 'UNKNOWN').toString();
    final tfliteStatus = _inferenceResult!['tflite_ready'] == true
        ? 'READY'
        : ((_inferenceResult!['tflite_status'] ?? 'NOT_BUNDLED').toString());

    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TacticalContainer(
            borderColor: color,
            showGlow: true,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('LOCAL_INFERENCE_DATA',
                        style: GoogleFonts.jetBrainsMono(
                            fontSize: 8,
                            color: color,
                            fontWeight: FontWeight.bold)),
                    Text('ZONE: Z-04',
                        style: GoogleFonts.jetBrainsMono(
                            fontSize: 8,
                            color: color,
                            fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                    _selectedCode == 'OT'
                        ? 'CUSTOM_DESCRIPTION'
                        : _inferenceResult!['category'],
                    style: GoogleFonts.spaceGrotesk(
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        color: Colors.white)),
                if (_phoneNumber.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 4.0),
                    child: Text('PHONE: $_phoneNumber',
                        style: GoogleFonts.jetBrainsMono(
                            fontSize: 10, color: const Color(0xFF3B82F6))),
                  ),
                if (_selectedCode == 'OT')
                  Padding(
                    padding: const EdgeInsets.only(top: 8.0),
                    child: Text('"$_customDescription"',
                        style: GoogleFonts.jetBrainsMono(
                            fontSize: 10,
                            color: const Color(0xFF10B981),
                            fontStyle: FontStyle.italic)),
                  ),
                const SizedBox(height: 12),
                Text('$_peopleCount PERSONNEL_REPORTED',
                    style: GoogleFonts.jetBrainsMono(
                        fontSize: 12, color: const Color(0xFF475569))),
              ],
            ),
          ),
          const SizedBox(height: 24),
          TacticalContainer(
            borderColor: const Color(0xFF3B82F6),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'EDGE_AI_RUNTIME',
                  style: GoogleFonts.jetBrainsMono(
                    fontSize: 8,
                    color: const Color(0xFF3B82F6),
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: [
                    _buildMetricPill(
                        'SOURCE', aiSource, const Color(0xFF10B981)),
                    _buildMetricPill(
                        'MODE', runtimeMode, const Color(0xFF3B82F6)),
                    _buildMetricPill(
                      'TRUTH_SCORE',
                      truthScore == null ? 'N/A' : '$truthScore%',
                      const Color(0xFFF59E0B),
                    ),
                    _buildMetricPill(
                        'TFLITE', tfliteStatus, const Color(0xFFF43F5E)),
                  ],
                ),
                const SizedBox(height: 14),
                Text(
                  (_inferenceResult!['reasoning'] ??
                          'No reasoning trace returned from the active AI runtime.')
                      .toString(),
                  style: GoogleFonts.jetBrainsMono(
                    fontSize: 10,
                    color: const Color(0xFF94A3B8),
                    height: 1.6,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          TacticalContainer(
            borderColor: _liveLocation == null
                ? const Color(0xFF1F2937)
                : const Color(0xFF10B981),
            showGlow: _liveLocation != null,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'LIVE_LOCATION_LOCK',
                      style: GoogleFonts.jetBrainsMono(
                        fontSize: 8,
                        color: _liveLocation == null
                            ? const Color(0xFF475569)
                            : const Color(0xFF10B981),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    if (_isResolvingLocation)
                      const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Color(0xFF3B82F6),
                        ),
                      )
                    else
                      Text(
                        _liveLocation == null ? 'PENDING' : 'LOCKED',
                        style: GoogleFonts.jetBrainsMono(
                          fontSize: 8,
                          color: _liveLocation == null
                              ? const Color(0xFF475569)
                              : const Color(0xFF10B981),
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 12),
                if (_liveLocation != null) ...[
                  Text(
                    'LAT: ${_liveLocation!.latitude.toStringAsFixed(6)}',
                    style: GoogleFonts.jetBrainsMono(
                      fontSize: 12,
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'LON: ${_liveLocation!.longitude.toStringAsFixed(6)}',
                    style: GoogleFonts.jetBrainsMono(
                      fontSize: 12,
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  if (_liveLocation!.accuracyMeters != null) ...[
                    const SizedBox(height: 6),
                    Text(
                      'ACCURACY: ±${_liveLocation!.accuracyMeters!.toStringAsFixed(0)}M',
                      style: GoogleFonts.jetBrainsMono(
                        fontSize: 10,
                        color: const Color(0xFF10B981),
                      ),
                    ),
                  ],
                ] else
                  Text(
                    _locationStatus,
                    style: GoogleFonts.jetBrainsMono(
                      fontSize: 10,
                      color: const Color(0xFF3B82F6),
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                const SizedBox(height: 12),
                TextButton(
                  onPressed: _isResolvingLocation
                      ? null
                      : () => _captureLiveLocation(forceRefresh: true),
                  child: Text(
                    _liveLocation == null
                        ? 'CAPTURE_CURRENT_POSITION'
                        : 'REFRESH_CURRENT_POSITION',
                    style: GoogleFonts.jetBrainsMono(
                      fontSize: 10,
                      color: const Color(0xFF3B82F6),
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          TacticalContainer(
            borderColor: _bridgeMode == BridgeMode.blackout
                ? const Color(0xFFF43F5E)
                : (_bridgeMode == BridgeMode.ultraLight
                    ? const Color(0xFFF59E0B)
                    : const Color(0xFF10B981)),
            showGlow: _bridgeMode != BridgeMode.nominal,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'DELIVERY_PATH',
                      style: GoogleFonts.jetBrainsMono(
                        fontSize: 8,
                        color: const Color(0xFF94A3B8),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      _bridgeLabel,
                      style: GoogleFonts.jetBrainsMono(
                        fontSize: 8,
                        color: _bridgeMode == BridgeMode.blackout
                            ? const Color(0xFFF43F5E)
                            : (_bridgeMode == BridgeMode.ultraLight
                                ? const Color(0xFFF59E0B)
                                : const Color(0xFF10B981)),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: [
                    _buildMetricPill(
                        'LINK_PROFILE', _bridgeLabel, const Color(0xFF3B82F6)),
                    _buildMetricPill(
                        'ROUTE', _bridgeRoute, const Color(0xFFF59E0B)),
                    _buildMetricPill(
                      'QUEUE_DEPTH',
                      '${FirestoreService().offlineQueueLength}',
                      const Color(0xFFF43F5E),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Text(
                  _bridgeSummary,
                  style: GoogleFonts.jetBrainsMono(
                    fontSize: 10,
                    color: const Color(0xFF94A3B8),
                    height: 1.6,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          TacticalContainer(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('ENCODED_HEX_DATA',
                        style: GoogleFonts.jetBrainsMono(
                            fontSize: 8,
                            color: const Color(0xFF1E293B),
                            fontWeight: FontWeight.bold)),
                    Text('12 BYTES',
                        style: GoogleFonts.jetBrainsMono(
                            fontSize: 8, color: const Color(0xFF475569))),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                    'PKT_${_selectedCode}_0${_peopleCount}_${severity.name[0].toUpperCase()}_8A2F9B',
                    style: GoogleFonts.jetBrainsMono(
                        fontSize: 14,
                        color: const Color(0xFF3B82F6),
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1)),
              ],
            ),
          ),
          const Spacer(),
          SizedBox(
            width: double.infinity,
            height: 60,
            child: ElevatedButton(
              onPressed: _isSyncing ? null : _uplink,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF3B82F6),
                foregroundColor: Colors.white,
                shape: const RoundedRectangleBorder(
                    borderRadius: BorderRadius.zero),
              ),
              child: _isSyncing
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white))
                  : Text('UPLINK_TO_COMMAND_GRID',
                      style: GoogleFonts.spaceGrotesk(
                          fontWeight: FontWeight.w900, letterSpacing: 1)),
            ),
          ),
          const SizedBox(height: 12),
          Center(
            child: TextButton(
              onPressed: () => setState(() {
                _resetLocationLock();
                _step = 0;
              }),
              child: Text('ABORT_AND_RETRY',
                  style: GoogleFonts.jetBrainsMono(
                      fontSize: 10,
                      color: const Color(0xFF475569),
                      fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSuccessUI() {
    final dispatchResult = _lastDispatchResult;
    final wasBuffered = dispatchResult?.outcome == SyncDispatchOutcome.buffered;
    final statusHeadline = wasBuffered ? 'BUFFERED_OFFLINE' : 'SIGNAL_UPLINKED';
    final statusCopy = wasBuffered
        ? 'No network path. Report stored in local cache and will relay via mesh bridge automatically.'
        : 'Packet synchronized through Firestore and Google Cloud.';
    final queueCount =
        dispatchResult?.queuedCount ?? FirestoreService().offlineQueueLength;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('[ TRANSMISSION_COMPLETE ]',
                style: TextStyle(
                    color: Color(0xFF10B981),
                    fontWeight: FontWeight.bold,
                    fontSize: 10)),
            const SizedBox(height: 24),
            Text(statusHeadline,
                style: GoogleFonts.spaceGrotesk(
                    fontSize: 32,
                    fontWeight: FontWeight.w900,
                    color: Colors.white)),
            const SizedBox(height: 8),
            Text(
              statusCopy,
              textAlign: TextAlign.center,
              style: GoogleFonts.jetBrainsMono(
                  fontSize: 10, color: const Color(0xFF475569)),
            ),
            if (wasBuffered) ...[
              const SizedBox(height: 12),
              Text(
                'QUEUE_DEPTH // $queueCount PENDING',
                style: GoogleFonts.jetBrainsMono(
                  fontSize: 10,
                  color: const Color(0xFFF59E0B),
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
            const SizedBox(height: 32),
            TacticalContainer(
              borderColor: wasBuffered
                  ? const Color(0xFFF59E0B)
                  : const Color(0xFF10B981),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    wasBuffered
                        ? '[ LOCAL_QUEUE_RELAY ]'
                        : '[ DUAL_MODEL_LOCAL_ANALYSIS ]',
                    style: GoogleFonts.jetBrainsMono(
                      color: wasBuffered
                          ? const Color(0xFFF59E0B)
                          : const Color(0xFF10B981),
                      fontSize: 8,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (dispatchResult != null) ...[
                    Text(
                      'SYNC_MODE: ${dispatchResult.syncMode}',
                      style: GoogleFonts.jetBrainsMono(
                        fontSize: 9,
                        color: wasBuffered
                            ? const Color(0xFFFDE68A)
                            : const Color(0xFF86EFAC),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 10),
                  ],
                  Text(
                    _inferenceResult?['reasoning']?.toString() ??
                        'No reasoning trace.',
                    style: GoogleFonts.jetBrainsMono(
                        fontSize: 10,
                        color: const Color(0xFF94A3B8),
                        height: 1.5,
                        fontStyle: FontStyle.italic),
                  ),
                  const SizedBox(height: 12),
                  if (_inferenceResult?['processing_trace'] != null)
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('[ TACTICAL_INFERENCE_TRACE ]',
                            style: GoogleFonts.jetBrainsMono(
                                color: const Color(0xFF3B82F6),
                                fontSize: 8,
                                fontWeight: FontWeight.bold)),
                        const SizedBox(height: 4),
                        ...(_inferenceResult!['processing_trace'] as List)
                            .map((step) => Padding(
                                  padding: const EdgeInsets.only(bottom: 2),
                                  child: Text('>> $step',
                                      style: GoogleFonts.jetBrainsMono(
                                          fontSize: 7,
                                          color: const Color(0xFF3B82F6)
                                              .withValues(alpha: 0.6))),
                                )),
                      ],
                    ),
                  const SizedBox(height: 16),
                  const Divider(color: Color(0xFF10B981), thickness: 0.2),
                  const SizedBox(height: 8),
                  Text('[ AI_AUTONOMOUS_GUIDANCE ]',
                      style: GoogleFonts.jetBrainsMono(
                          color: const Color(0xFFF59E0B),
                          fontSize: 8,
                          fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Text(
                    _inferenceResult?['guidance']?.toString() ??
                        'Stay low and conserve battery. Rescuers are coordinating.',
                    style: GoogleFonts.jetBrainsMono(
                        fontSize: 11,
                        color: const Color(0xFFFDE68A),
                        fontWeight: FontWeight.bold,
                        height: 1.4),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 60),
            SizedBox(
              width: 200,
              height: 50,
              child: OutlinedButton(
                onPressed: widget.onBack,
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white,
                  side: const BorderSide(color: Color(0xFF1F2937)),
                  shape: const RoundedRectangleBorder(
                      borderRadius: BorderRadius.zero),
                ),
                child: Text('ACKNOWLEDGE',
                    style: GoogleFonts.jetBrainsMono(
                        fontSize: 10, fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricPill(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: GoogleFonts.jetBrainsMono(
              fontSize: 8,
              color: color,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: GoogleFonts.jetBrainsMono(
              fontSize: 10,
              color: Colors.white,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _CustomCountDialog extends StatefulWidget {
  @override
  State<_CustomCountDialog> createState() => _CustomCountDialogState();
}

class _CustomCountDialogState extends State<_CustomCountDialog> {
  final _controller = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      child: TacticalContainer(
        borderColor: const Color(0xFF3B82F6),
        showGlow: true,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('CUSTOM_COUNT_ENTRY',
                style: GoogleFonts.jetBrainsMono(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF3B82F6))),
            const SizedBox(height: 16),
            TextField(
              controller: _controller,
              keyboardType: TextInputType.number,
              autofocus: true,
              style: GoogleFonts.jetBrainsMono(
                  color: Colors.white,
                  fontSize: 24,
                  fontWeight: FontWeight.w900),
              decoration: InputDecoration(
                hintText: '00',
                hintStyle:
                    GoogleFonts.jetBrainsMono(color: const Color(0xFF1E293B)),
                border: InputBorder.none,
              ),
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text('CANCEL',
                      style: GoogleFonts.jetBrainsMono(
                          fontSize: 10, color: const Color(0xFF475569))),
                ),
                const SizedBox(width: 16),
                ElevatedButton(
                  onPressed: () {
                    final val = int.tryParse(_controller.text);
                    if (val != null && val > 0) {
                      Navigator.pop(context, val);
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF3B82F6),
                    foregroundColor: Colors.white,
                    shape: const RoundedRectangleBorder(
                        borderRadius: BorderRadius.zero),
                  ),
                  child: Text('CONFIRM',
                      style: GoogleFonts.jetBrainsMono(
                          fontSize: 10, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
