const DEFAULT_COORDS = {
  lat: 38.8951,
  lon: -77.0364,
};

const CATEGORY_BY_CODE = {
  TI: 'CRITICAL_INJURY',
  TU: 'TRAPPED',
  MH: 'MEDICAL',
  FI: 'FIRE',
  FL: 'FLOOD',
  GE: 'GENERAL',
  OT: 'CUSTOM_INCIDENT',
};

const CATEGORY_TO_CODE = {
  CRITICAL_INJURY: 'TI',
  STRUCTURAL_COLLAPSE: 'TU',
  TRAPPED: 'TU',
  MEDICAL: 'MH',
  MEDICAL_ACUTE: 'MH',
  FIRE: 'FI',
  HAZMAT_FIRE: 'FI',
  FLOOD: 'FL',
  FLASH_FLOOD: 'FL',
  GENERAL: 'GE',
  EVAC_SUPPORT: 'GE',
  CUSTOM_INCIDENT: 'OT',
};

const TRIAGE_BY_SEVERITY = {
  critical: 'ALPHA',
  urgent: 'BRAVO',
  standard: 'CHARLIE',
};

function toMillis(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric;
    }

    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  return Date.now();
}

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toNullableNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function normalizeSeverity(severity) {
  if (severity === 'safe') {
    return 'standard';
  }

  if (severity === 'critical' || severity === 'urgent' || severity === 'standard') {
    return severity;
  }

  return 'standard';
}

function normalizeStatus(status) {
  if (status === 'claimed' || status === 'resolved' || status === 'active') {
    return status;
  }

  return 'active';
}

function deriveCategoryCode(source) {
  if (source.category_code) {
    return source.category_code;
  }

  if (source.condition_code) {
    return source.condition_code;
  }

  if (source.packet && typeof source.packet === 'string') {
    const dashParts = source.packet.split('-');
    if (dashParts.length >= 3 && dashParts[2]) {
      return dashParts[2];
    }
  }

  if (source.category && CATEGORY_TO_CODE[source.category]) {
    return CATEGORY_TO_CODE[source.category];
  }

  return 'GE';
}

function deriveCategory(source, categoryCode) {
  if (source.category) {
    return source.category;
  }

  if (source.condition) {
    return String(source.condition).toUpperCase();
  }

  return CATEGORY_BY_CODE[categoryCode] || 'GENERAL';
}

export function normalizeIncident(source = {}, cloudId) {
  const ts = toMillis(source.ts ?? source.timestamp ?? source.syncedAt);
  const severity = normalizeSeverity(source.severity);
  const status = normalizeStatus(source.status);
  const categoryCode = deriveCategoryCode(source);
  const category = deriveCategory(source, categoryCode);
  const peopleCount = toNumber(
    source.people_count ?? source.peopleCount ?? source.data?.people_count ?? source.people,
    1,
  );
  const lat = toNumber(
    source.lat ?? source.latitude ?? source.gps?.lat,
    DEFAULT_COORDS.lat,
  );
  const lon = toNumber(
    source.lon ?? source.lng ?? source.longitude ?? source.gps?.lng,
    DEFAULT_COORDS.lon,
  );
  const claimedBy = source.claimed_by ?? source.claimedBy ?? source.team ?? null;
  const recResponders = toNullableNumber(
    source.rec_responders ?? source.recResponders ?? source.data?.rec_responders,
  );
  const recTeamType = source.rec_team_type ?? source.recTeamType ?? null;

  const data = {
    ...source.data,
    ai_source: source.data?.ai_source ?? source.ai_source,
    people_count: source.data?.people_count ?? peopleCount,
    reasoning: source.data?.reasoning ?? source.reasoning,
    sensor_conflict: source.data?.sensor_conflict ?? false,
    triage_code: source.data?.triage_code ?? TRIAGE_BY_SEVERITY[severity],
    truth_score: source.data?.truth_score,
    sensors: source.data?.sensors,
  };

  return {
    ...source,
    cloudId,
    id: source.id ?? cloudId,
    ts,
    timestamp: ts,
    severity,
    status,
    category,
    category_code: categoryCode,
    people_count: peopleCount,
    peopleCount,
    lat,
    lon,
    lng: lon,
    latitude: lat,
    longitude: lon,
    packet: source.packet ?? source.rawPacket ?? '',
    rawPacket: source.packet ?? source.rawPacket ?? '',
    confidence: toNumber(source.confidence, 0),
    claimed_by: claimedBy,
    team: claimedBy,
    description: source.description ?? null,
    phone: source.phone ?? source.phoneNumber ?? null,
    rec_responders: recResponders,
    recResponders,
    rec_team_type: recTeamType,
    recTeamType,
    data,
    synced: source.synced ?? true,
  };
}

export function toFirestoreIncident(source = {}) {
  const incident = normalizeIncident(source, source.cloudId);

  return {
    id: incident.id,
    ts: incident.ts,
    timestamp: incident.ts,
    severity: incident.severity,
    category: incident.category,
    category_code: incident.category_code,
    people_count: incident.people_count,
    lat: incident.lat,
    lon: incident.lon,
    lng: incident.lon,
    packet: incident.packet,
    confidence: incident.confidence,
    status: incident.status,
    claimed_by: incident.claimed_by,
    description: incident.description,
    phone: incident.phone,
    rec_responders: incident.rec_responders,
    rec_team_type: incident.rec_team_type,
    ai_source: incident.data?.ai_source ?? null,
    reasoning: incident.data?.reasoning ?? null,
    data: incident.data,
    sync_mode: source.sync_mode ?? 'WEB_DIRECT_UPLINK',
    syncedAt: new Date(incident.ts).toISOString(),
  };
}
