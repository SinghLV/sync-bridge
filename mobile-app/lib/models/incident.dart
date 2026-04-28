enum IncidentSeverity {
  critical,
  urgent,
  standard,
}

enum IncidentStatus {
  active,
  claimed,
  resolved,
}

int _coerceMillis(dynamic value) {
  if (value is int) return value;
  if (value is double) return value.round();
  if (value is String) {
    final numeric = int.tryParse(value);
    if (numeric != null) return numeric;
    final parsed = DateTime.tryParse(value);
    if (parsed != null) return parsed.millisecondsSinceEpoch;
  }
  if (value is DateTime) return value.millisecondsSinceEpoch;
  return DateTime.now().millisecondsSinceEpoch;
}

DateTime? _coerceDateTime(dynamic value) {
  if (value == null) return null;
  return DateTime.fromMillisecondsSinceEpoch(_coerceMillis(value));
}

double _coerceDouble(dynamic value, [double fallback = 0.0]) {
  if (value is num) return value.toDouble();
  if (value is String) {
    final parsed = double.tryParse(value);
    if (parsed != null) return parsed;
  }
  return fallback;
}

double? _coerceNullableDouble(dynamic value) {
  if (value == null) return null;
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value);
  return null;
}

int _coerceInt(dynamic value, [int fallback = 0]) {
  if (value is int) return value;
  if (value is num) return value.round();
  if (value is String) {
    final parsed = int.tryParse(value);
    if (parsed != null) return parsed;
  }
  return fallback;
}

bool? _coerceBool(dynamic value) {
  if (value is bool) return value;
  if (value is String) {
    if (value.toLowerCase() == 'true') return true;
    if (value.toLowerCase() == 'false') return false;
  }
  return null;
}

Map<String, dynamic>? _coerceMap(dynamic value) {
  if (value is Map<String, dynamic>) return Map<String, dynamic>.from(value);
  if (value is Map) {
    return value.map(
      (key, mapValue) => MapEntry(key.toString(), mapValue),
    );
  }
  return null;
}

IncidentSeverity _parseSeverity(dynamic value) {
  final raw = value?.toString() ?? IncidentSeverity.standard.name;
  return IncidentSeverity.values.cast<IncidentSeverity?>().firstWhere(
        (entry) => entry?.name == raw,
        orElse: () => IncidentSeverity.standard,
      ) ??
      IncidentSeverity.standard;
}

IncidentStatus _parseStatus(dynamic value) {
  final raw = value?.toString() ?? IncidentStatus.active.name;
  return IncidentStatus.values.cast<IncidentStatus?>().firstWhere(
        (entry) => entry?.name == raw,
        orElse: () => IncidentStatus.active,
      ) ??
      IncidentStatus.active;
}

String _defaultTriageCode(IncidentSeverity severity) {
  switch (severity) {
    case IncidentSeverity.critical:
      return 'ALPHA';
    case IncidentSeverity.urgent:
      return 'BRAVO';
    case IncidentSeverity.standard:
      return 'CHARLIE';
  }
}

class Incident {
  final String id;
  final DateTime timestamp;
  final IncidentSeverity severity;
  final String category;
  final String categoryCode;
  final int peopleCount;
  final double latitude;
  final double longitude;
  final String rawPacket;
  final double confidence;
  final IncidentStatus status;
  final String? claimedBy;
  final String? claimedTeamId;
  final String? description;
  final String? phoneNumber;
  final DateTime? claimedAt;
  final DateTime? autoResolveAt;
  final DateTime? resolvedAt;

  // AI Recommendations
  final int? recResponders;
  final String? recTeamType;
  final String? aiSource;
  final String? aiModel;
  final String? reasoning;
  final double? truthScore;
  final bool? sensorConflict;
  final String? triageCode;
  final String? runtimeMode;
  final String? syncMode;
  final bool synced;
  final Map<String, dynamic>? data;

  Incident({
    required this.id,
    required this.timestamp,
    required this.severity,
    required this.category,
    required this.categoryCode,
    required this.peopleCount,
    required this.latitude,
    required this.longitude,
    required this.rawPacket,
    this.confidence = 0.0,
    this.status = IncidentStatus.active,
    this.claimedBy,
    this.claimedTeamId,
    this.description,
    this.phoneNumber,
    this.claimedAt,
    this.autoResolveAt,
    this.resolvedAt,
    this.recResponders,
    this.recTeamType,
    this.aiSource,
    this.aiModel,
    this.reasoning,
    this.truthScore,
    this.sensorConflict,
    this.triageCode,
    this.runtimeMode,
    this.syncMode,
    this.synced = true,
    this.data,
  });

  Map<String, dynamic> toJson() {
    final payloadData = <String, dynamic>{
      ...?data,
      'ai_source': data?['ai_source'] ?? aiSource,
      'ai_model': data?['ai_model'] ?? aiModel,
      'people_count': data?['people_count'] ?? peopleCount,
      'reasoning': data?['reasoning'] ?? reasoning,
      'sensor_conflict': data?['sensor_conflict'] ?? sensorConflict,
      'triage_code': data?['triage_code'] ?? triageCode ?? _defaultTriageCode(severity),
      'truth_score': data?['truth_score'] ?? truthScore,
      'runtime_mode': data?['runtime_mode'] ?? runtimeMode,
    }..removeWhere((_, value) => value == null);

    return {
      'id': id,
      'ts': timestamp.millisecondsSinceEpoch,
      'timestamp': timestamp.millisecondsSinceEpoch,
      'severity': severity.name,
      'category': category,
      'category_code': categoryCode,
      'people_count': peopleCount,
      'lat': latitude,
      'lon': longitude,
      'lng': longitude,
      'packet': rawPacket,
      'confidence': confidence,
      'status': status.name,
      'claimed_by': claimedBy,
      'claimed_team_id': claimedTeamId,
      'description': description,
      'phone': phoneNumber,
      'claimed_at': claimedAt?.millisecondsSinceEpoch,
      'auto_resolve_at': autoResolveAt?.millisecondsSinceEpoch,
      'resolved_at': resolvedAt?.millisecondsSinceEpoch,
      'rec_responders': recResponders,
      'rec_team_type': recTeamType,
      'ai_source': aiSource ?? payloadData['ai_source'],
      'ai_model': aiModel ?? payloadData['ai_model'],
      'reasoning': reasoning ?? payloadData['reasoning'],
      'truth_score': truthScore ?? payloadData['truth_score'],
      'sensor_conflict': sensorConflict ?? payloadData['sensor_conflict'],
      'triage_code': triageCode ?? payloadData['triage_code'],
      'runtime_mode': runtimeMode ?? payloadData['runtime_mode'],
      'sync_mode': syncMode,
      'data': payloadData,
      'synced': synced,
      'syncedAt': DateTime.now().toIso8601String(),
    };
  }

  factory Incident.fromJson(Map<String, dynamic> json) {
    final payloadData = _coerceMap(json['data']);

    return Incident(
      id: json['id'],
      timestamp: DateTime.fromMillisecondsSinceEpoch(
        _coerceMillis(json['ts'] ?? json['timestamp'] ?? json['syncedAt']),
      ),
      severity: _parseSeverity(json['severity']),
      category: json['category'] ?? 'UNKNOWN',
      categoryCode: json['category_code'] ?? '??',
      peopleCount: _coerceInt(
        json['people_count'] ?? json['peopleCount'] ?? payloadData?['people_count'],
        1,
      ),
      latitude: _coerceDouble(json['lat'] ?? json['latitude'], 0.0),
      longitude: _coerceDouble(json['lon'] ?? json['lng'] ?? json['longitude'], 0.0),
      rawPacket: json['packet'] ?? json['rawPacket'] ?? '',
      confidence: _coerceDouble(json['confidence'], 0.0),
      status: _parseStatus(json['status']),
      claimedBy: json['claimed_by'],
      claimedTeamId: json['claimed_team_id'],
      description: json['description'],
      phoneNumber: json['phone'] ?? json['phoneNumber'],
      claimedAt: _coerceDateTime(json['claimed_at']),
      autoResolveAt: _coerceDateTime(json['auto_resolve_at']),
      resolvedAt: _coerceDateTime(json['resolved_at']),
      recResponders: json['rec_responders'],
      recTeamType: json['rec_team_type'],
      aiSource: payloadData?['ai_source'] ?? json['ai_source'],
      aiModel: payloadData?['ai_model'] ?? json['ai_model'] ?? json['model'],
      reasoning: payloadData?['reasoning'] ?? json['reasoning'],
      truthScore: _coerceNullableDouble(
        payloadData?['truth_score'] ?? json['truth_score'],
      ),
      sensorConflict: _coerceBool(
        payloadData?['sensor_conflict'] ?? json['sensor_conflict'],
      ),
      triageCode: payloadData?['triage_code'] ?? json['triage_code'],
      runtimeMode: payloadData?['runtime_mode'] ?? json['runtime_mode'],
      syncMode: json['sync_mode'],
      synced: _coerceBool(json['synced']) ?? true,
      data: payloadData,
    );
  }

  Incident copyWith({
    IncidentStatus? status,
    String? claimedBy,
    String? claimedTeamId,
    int? recResponders,
    String? recTeamType,
    DateTime? claimedAt,
    DateTime? autoResolveAt,
    DateTime? resolvedAt,
    String? aiSource,
    String? aiModel,
    String? reasoning,
    double? truthScore,
    bool? sensorConflict,
    String? triageCode,
    String? runtimeMode,
    String? syncMode,
    bool? synced,
    Map<String, dynamic>? data,
  }) {
    return Incident(
      id: id,
      timestamp: timestamp,
      severity: severity,
      category: category,
      categoryCode: categoryCode,
      peopleCount: peopleCount,
      latitude: latitude,
      longitude: longitude,
      rawPacket: rawPacket,
      confidence: confidence,
      status: status ?? this.status,
      claimedBy: claimedBy ?? this.claimedBy,
      claimedTeamId: claimedTeamId ?? this.claimedTeamId,
      description: description,
      phoneNumber: phoneNumber,
      claimedAt: claimedAt ?? this.claimedAt,
      autoResolveAt: autoResolveAt ?? this.autoResolveAt,
      resolvedAt: resolvedAt ?? this.resolvedAt,
      recResponders: recResponders ?? this.recResponders,
      recTeamType: recTeamType ?? this.recTeamType,
      aiSource: aiSource ?? this.aiSource,
      aiModel: aiModel ?? this.aiModel,
      reasoning: reasoning ?? this.reasoning,
      truthScore: truthScore ?? this.truthScore,
      sensorConflict: sensorConflict ?? this.sensorConflict,
      triageCode: triageCode ?? this.triageCode,
      runtimeMode: runtimeMode ?? this.runtimeMode,
      syncMode: syncMode ?? this.syncMode,
      synced: synced ?? this.synced,
      data: data ?? this.data,
    );
  }
}
