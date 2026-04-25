/**
 * SYNC BRIDGE — GLOBAL SYSTEM CONFIGURATION
 * Centralized constants for the disaster communication network.
 */

export const SYSTEM_CONFIG = {
  PROTOCOL_VERSION: "2.4.0-BETA",
  MESH: {
    MAX_HOPS: 5,
    DEDUPLICATION_WINDOW_MS: 300000, // 5 minutes
    HEARTBEAT_INTERVAL_MS: 15000,
  },
  ENCODING: {
    PACKET_SIZE_BYTES: 12,
    COMPRESSION_ALGO: "LZ-FIELD-PACK",
    CHECKSUM_BITS: 8
  },
  TRIAGE: {
    SEVERITY_LEVELS: {
      CRITICAL: { weight: 1.0, color: '#ff3d55', label: 'C1 - IMMEDIATE' },
      URGENT: { weight: 0.7, color: '#ff9500', label: 'C2 - HIGH' },
      STANDARD: { weight: 0.3, color: '#4a9eff', label: 'C3 - STABLE' }
    }
  },
  NETWORK: {
    TIMEOUT_MS: 8000,
    RETRY_LIMIT: 3,
    NTFY_TOPIC: "sync_bridge_sar_alerts_2026_main"
  }
};
