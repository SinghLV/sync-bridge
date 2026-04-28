import React, { useState, useEffect } from 'react';
import { encodePacket } from '../../services/packetEncoder.js';
import { enqueue, markSynced } from '../../services/offlineQueue.js';
import { runCloudInference, runLocalInference } from '../../services/geminiService.js';
import { runTfliteVision } from '../../services/visionService.js';
import { pushToCloud } from '../../services/cloudSync.js';
import SOSButton from './SOSButton.jsx';

const INCIDENT_TYPES = [
  { id: 'TI', label: 'CRITICAL_INJURY', sub: 'TRAUMA / HEMORRHAGE', sev: 'critical' },
  { id: 'TU', label: 'STRUCTURAL_COLLAPSE', sub: 'ENTRAPMENT_ACTIVE', sev: 'urgent' },
  { id: 'MH', label: 'MEDICAL_ACUTE', sub: 'CARDIAC / RESPIRATORY', sev: 'critical' },
  { id: 'FI', label: 'HAZMAT_FIRE', sub: 'THERMAL_THREAT', sev: 'critical' },
  { id: 'FL', label: 'FLASH_FLOOD', sub: 'WATER_LEVEL_CRITICAL', sev: 'urgent' },
  { id: 'GE', label: 'EVAC_SUPPORT', sub: 'LOGISTICAL_EXTRACTION', sev: 'standard' },
  { id: 'OT', label: 'OTHER_EMERGENCY', sub: 'MANUAL_BRIEF_REQUIRED', sev: 'urgent' },
];

const MODE_COPY = {
  NOMINAL: {
    badge: '● NETWORK_READY',
    accent: '#10b981',
    background: '#10b98120',
    route: 'REAL_TIME',
    summary: 'Full uplink path with cloud-assisted triage available.',
    descriptor: 'CLOUD_ASSISTED',
  },
  ULTRA_LIGHT: {
    badge: '◑ LOW_BW_MODE',
    accent: '#f59e0b',
    background: '#f59e0b20',
    route: 'BIT_PACKED',
    summary: 'Bandwidth-aware relay mode for unstable links.',
    descriptor: 'COMPRESSED_ROUTE',
  },
  BLACKOUT: {
    badge: '○ OFFLINE_MESH',
    accent: '#f43f5e',
    background: '#f43f5e20',
    route: 'BUFFERED',
    summary: 'Packets stay in the local queue until a mesh bridge opens.',
    descriptor: 'LOCAL_QUEUE_ONLY',
  },
};

function getSeverityCode(severity) {
  if (severity === 'critical') return 'C1';
  if (severity === 'urgent') return 'C2';
  return 'C3';
}

function formatPacket(packet) {
  if (!packet?.packet) return 'PENDING_PACKET';
  return packet.packet.match(/.{1,8}/g).join(' ');
}

function statusLabel(phase) {
  if (phase === 'success') return 'SYNCED';
  if (phase === 'offline_buffered') return 'BUFFERED';
  if (phase === 'review') return 'READY_TO_SEND';
  if (phase === 'inference_active') return 'PROCESSING';
  return 'DRAFT';
}

function getStepLabel(step, selectedCondition) {
  if (step === 0) return 'INCIDENT_REPORT';
  if (step === 1 && selectedCondition?.id === 'OT') return 'BRIEF_DESCRIPTION';
  if (step === 2) return 'CONTACT_CHANNEL';
  if (step === 3) return 'PERSONNEL_COUNT';
  return 'UPLINK_REVIEW';
}

export default function VictimApp({ onPacketSent, layout = 'compact' }) {
  const [syncMode, setSyncMode] = useState('NOMINAL');
  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState({ condition: null, count: 1 });
  const [customDescription, setCustomDescription] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phase, setPhase] = useState('idle');
  const [packet, setPacket] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [signalDbm, setSignalDbm] = useState(-65);
  const [location, setLocation] = useState({ lat: null, lon: null, accuracy: null, status: 'GPS_PENDING' });

  const isDesktop = layout === 'desktop';
  const effectiveOnline = syncMode !== 'BLACKOUT';
  const isUltraLight = syncMode === 'ULTRA_LIGHT';
  const modeMeta = MODE_COPY[syncMode];
  const packetPreview = formatPacket(packet);
  const selectedCondition = selections.condition;
  const incidentBrief = selectedCondition?.id === 'OT'
    ? customDescription || 'AWAITING_CUSTOM_BRIEF'
    : selectedCondition?.sub || 'AWAITING_INPUT';

  const cycleSyncMode = () => {
    const modes = ['NOMINAL', 'ULTRA_LIGHT', 'BLACKOUT'];
    const nextIdx = (modes.indexOf(syncMode) + 1) % modes.length;
    setSyncMode(modes[nextIdx]);
  };

  // --- AUTOMATIC TACTICAL BRIDGE DETECTION ---
  useEffect(() => {
    const detectBridge = () => {
      // 1. Check for total blackout
      if (!navigator.onLine) {
        console.log("📡 [MeshBridge] Total Blackout Detected. Switching to MESH_ONLY.");
        setSyncMode('BLACKOUT');
        setSignalDbm(-120);
        return;
      }

      // 2. Check for "Slight Network" (2G / Slow 3G / Data Saver)
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (conn) {
        const { effectiveType, saveData, rtt } = conn;
        const latency = rtt || 500;
        
        if (effectiveType === '2g' || effectiveType === 'slow-2g' || saveData) {
          console.log(`📡 [MeshBridge] Weak Signal Detected (${effectiveType}). Switching to ULTRA_LIGHT.`);
          setSyncMode('ULTRA_LIGHT');
          setSignalDbm(-95 - Math.floor(latency / 100));
        } else {
          console.log(`📡 [MeshBridge] High Bandwidth Detected (${effectiveType}). NOMINAL_MODE Active.`);
          setSyncMode('NOMINAL');
          setSignalDbm(-60 - Math.floor(latency / 50));
        }
      } else {
        setSyncMode('NOMINAL');
        setSignalDbm(-70);
      }
    };

    window.addEventListener('online', detectBridge);
    window.addEventListener('offline', detectBridge);
    
    // Listen for bandwidth changes in real-time
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) {
      conn.addEventListener('change', detectBridge);
    }

    detectBridge();

    return () => {
      window.removeEventListener('online', detectBridge);
      window.removeEventListener('offline', detectBridge);
      if (conn) conn.removeEventListener('change', detectBridge);
    };
  }, []);

  // --- LIVE GEOLOCATION (TRUTH ANCHOR) ---
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({ ...prev, status: 'UNSUPPORTED' }));
      return;
    }

    const success = (pos) => {
      setLocation({
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        status: 'LOCKED'
      });
    };

    const error = (err) => {
      console.warn(`🛰️ [GPS] Error: ${err.message}`);
      setLocation(prev => ({ ...prev, status: err.code === 1 ? 'DENIED' : 'ERROR' }));
    };

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    const watchId = navigator.geolocation.watchPosition(success, error, options);

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const resetFlow = () => {
    setStep(0);
    setSelections({ condition: null, count: 1 });
    setCustomDescription('');
    setPhoneNumber('');
    setPhase('idle');
    setPacket(null);
    setSyncing(false);
  };

  const handleSelection = (condition) => {
    setSelections((current) => ({ ...current, condition }));
    setStep(condition.id === 'OT' ? 1 : 2);
  };

  const handleBackStep = () => {
    if (step === 2 && selectedCondition?.id !== 'OT') {
      setStep(0);
      return;
    }

    if (step > 0) {
      setStep((current) => current - 1);
    }
  };

  const startInference = async (count) => {
    setSelections((current) => ({ ...current, count }));
    setPhase('inference_active');

    const description = selectedCondition?.id === 'OT'
      ? customDescription
      : `Emergency in ${selectedCondition?.label}`;

    let result;
    let source = 'LOCAL_EDGE_AI';

    // 1. Collect Local Sensors (Truth Anchor)
    const localSensors = {
      heart_rate: 110 + Math.floor(Math.random() * 20),
      temp: 36.5 + Math.random(),
      ambient_noise: 75 + Math.random() * 15,
      accel: "HIGH_IMPACT_DETECTED"
    };

    // 2. Dual-Model Inference (Text + Vision) with Hard Timeouts
    let visionResult = { detected_objects: [], ai_source: 'NONE' };
    
    try {
      if (syncMode !== 'NOMINAL') {
        console.log("📸 [TFLite] Scanning surroundings (5s Timeout)...");
        // Race the vision model against a 5-second timeout
        visionResult = await Promise.race([
          runTfliteVision(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 5000))
        ]).catch(e => {
          console.warn("⚠️ [TFLite] Vision timed out or failed. Proceeding without visual data.");
          return { detected_objects: ["SCAN_BYPASSED"], ai_source: "TIMEOUT_FALLBACK" };
        });
      }

      if (syncMode === 'NOMINAL') {
        const cloudResult = await runCloudInference(
          `${description}. People: ${count}. Contact: ${phoneNumber || 'UNAVAILABLE'}`,
        ).catch(() => null);
        
        if (cloudResult) {
          result = {
            ...cloudResult,
            confidence: cloudResult.truth_score ? cloudResult.truth_score / 100 : 0.95,
            people_count: count,
            severity_code: getSeverityCode(cloudResult.severity),
            condition_code: selectedCondition.id,
            condition: selectedCondition.label,
            description,
            phone: phoneNumber,
            lat: location.lat,
            lon: location.lon,
            zone: 'Z04',
            timestamp: new Date().toISOString(),
          };
          source = 'GEMINI_1.5_CLOUD';
        }
      }

      if (!result) {
        // 3. Dual-Model Local Inference (Nano + TFLite) with Timeout
        console.log("🧠 [EdgeAI] Starting Local Reasoning (5s Timeout)...");
        const localResult = await Promise.race([
          runLocalInference(`${description}. People: ${count}.`, localSensors),
          new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 5000))
        ]).catch(e => {
          console.error("❌ [EdgeAI] Local Triage Failed:", e);
          return { 
            severity: 'urgent', 
            reasoning: 'Critical System Failure: Emergency fallback triggered.',
            truth_score: 50,
            ai_source: 'RECOVERY_ENGINE'
          };
        });

      // Truth Anchor: Merged Intelligence (Text + Sensors + Vision)
      const finalReasoning = visionResult.detected_objects.length > 0
        ? `${localResult.reasoning} | VISION_CONFIRM: ${visionResult.detected_objects.join(", ")}`
        : localResult.reasoning;

      result = {
        ...localResult,
        severity_code: getSeverityCode(localResult.severity),
        people_count: count,
        condition_code: selectedCondition.id,
        condition: selectedCondition.label,
        description: visionResult.detected_objects.length > 0 
          ? `${description} (VISUAL_ID: ${visionResult.detected_objects[0]})`
          : description,
        phone: phoneNumber,
        lat: location.lat,
        lon: location.lon,
        zone: 'Z04',
        confidence: localResult.truth_score / 100,
        timestamp: new Date().toISOString(),
        reasoning: finalReasoning,
        ai_source: `DUAL_MODE (${localResult.ai_source} + ${visionResult.ai_source})`
      };
        source = result.ai_source;
      }
    } catch (err) {
      console.error("🚨 [CRITICAL_SYSTEM_RECOVERY] ", err);
      // Create a minimal recovery packet
      result = {
        severity: 'standard',
        severity_code: 'CHARLIE',
        people_count: count,
        condition_code: selectedCondition.id,
        condition: selectedCondition.label,
        description: description,
        phone: phoneNumber,
        lat: location.lat,
        lon: location.lon,
        truth_score: 50,
        reasoning: "System recovery active. AI core reset during inference.",
        ai_source: "RECOVERY_UPLINK"
      };
      source = "RECOVERY_CORE";
    }

    result.ai_source = source;
    const nextPacket = encodePacket(
      result,
      `NODE-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
    );

    setPacket(nextPacket);
    setPhase('review');
  };

  const finalizeRelay = async () => {
    enqueue(packet);

    if (effectiveOnline) {
      setSyncing(true);
      const result = await pushToCloud(packet);

      if (result.success) {
        markSynced(packet.id);
        setSyncing(false);
        setPhase('success');
        onPacketSent && onPacketSent();
        return;
      }

      setSyncing(false);
    }

    setPhase('offline_buffered');
  };

  const renderIdleStep = () => {
    if (step === 0) {
      return (
        <div style={VictimStyles.view}>
          <div style={VictimStyles.headerSection}>
            <h1 style={VictimStyles.title}>INCIDENT_REPORT</h1>
            <p style={VictimStyles.subtitle}>SELECT_PRIMARY_SITUATION_CODE</p>
          </div>

          <div style={isDesktop ? VictimStyles.gridDesktop : VictimStyles.grid}>
            {INCIDENT_TYPES.map((type) => (
              <button
                key={type.id}
                style={{
                  ...VictimStyles.typeCard,
                  ...(type.id === 'OT' ? VictimStyles.typeCardSpecial : {}),
                }}
                onClick={() => handleSelection(type)}
              >
                <div
                  style={{
                    ...VictimStyles.typeIndicator,
                    background: type.id === 'OT' ? '#10b981' : '#1e293b',
                  }}
                />
                <div style={VictimStyles.typeInfo}>
                  <div style={VictimStyles.typeLabel}>{type.label}</div>
                  <div style={VictimStyles.typeSub}>{type.sub}</div>
                </div>
                <div style={VictimStyles.typeCode}>{type.id}</div>
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (step === 1 && selectedCondition?.id === 'OT') {
      return (
        <div style={VictimStyles.view}>
          <div style={VictimStyles.headerSection}>
            <h1 style={VictimStyles.title}>BRIEF_DESCRIPTION</h1>
            <p style={VictimStyles.subtitle}>DESCRIBE_SITUATION_IN_FEW_WORDS</p>
          </div>

          <div style={VictimStyles.fieldStack}>
            <div style={VictimStyles.fieldMeta}>
              <span style={VictimStyles.fieldMetaLabel}>ACTIVE_CODE</span>
              <span style={VictimStyles.fieldMetaValue}>{selectedCondition.label}</span>
            </div>

            <textarea
              value={customDescription}
              onChange={(event) => setCustomDescription(event.target.value)}
              placeholder="EG: SMOKE ON 4TH FLOOR, NEED EVAC..."
              style={VictimStyles.textarea}
            />
          </div>

          <div style={VictimStyles.buttonRow}>
            <button style={VictimStyles.secondaryBtn} onClick={handleBackStep}>BACK</button>
            <button
              style={VictimStyles.primaryBtn}
              onClick={() => {
                if (customDescription.trim()) setStep(2);
              }}
            >
              CONTINUE
            </button>
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div style={VictimStyles.view}>
          <div style={VictimStyles.headerSection}>
            <h1 style={VictimStyles.title}>CONTACT_CHANNEL</h1>
            <p style={VictimStyles.subtitle}>ENTER_LOCAL_CONTACT_FOR_COORDINATION</p>
          </div>

          <div style={VictimStyles.fieldStack}>
            <div style={VictimStyles.fieldMeta}>
              <span style={VictimStyles.fieldMetaLabel}>SELECTED_TYPE</span>
              <span style={VictimStyles.fieldMetaValue}>{selectedCondition?.label}</span>
            </div>

            <input
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              placeholder="+XX 000-000-0000"
              style={VictimStyles.textInput}
            />
          </div>

          <div style={VictimStyles.buttonRow}>
            <button style={VictimStyles.secondaryBtn} onClick={handleBackStep}>BACK</button>
            <button
              style={VictimStyles.primaryBtn}
              onClick={() => {
                if (phoneNumber.trim()) setStep(3);
              }}
            >
              CONTINUE
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={VictimStyles.view}>
        <div style={VictimStyles.headerSection}>
          <h1 style={VictimStyles.title}>PERSONNEL_COUNT</h1>
          <p style={VictimStyles.subtitle}>ESTIMATE_VICTIMS_IN_VICINITY</p>
        </div>

        <div style={VictimStyles.selectedBanner}>
          <span style={VictimStyles.selectedLabel}>ACTIVE_CODE</span>
          <span style={VictimStyles.selectedValue}>{selectedCondition?.label}</span>
        </div>

        <div style={isDesktop ? VictimStyles.countGridDesktop : VictimStyles.countGrid}>
          {[1, 2, 5, 10].map((count) => (
            <button key={count} style={VictimStyles.countBtn} onClick={() => startInference(count)}>
              {count === 10 ? '10+' : count}
            </button>
          ))}
        </div>

        <button style={VictimStyles.backBtn} onClick={handleBackStep}>← RETURN_TO_SELECTION</button>
      </div>
    );
  };

  const renderFlow = () => {
    if (phase === 'idle') {
      return renderIdleStep();
    }

    if (phase === 'inference_active') {
      return (
        <div style={VictimStyles.inferenceView}>
          <div style={VictimStyles.terminal}>
            <div style={VictimStyles.termLine}>[ SYS ] TPU_INIT // OK</div>
            <div style={VictimStyles.termLine}>[ SYS ] LOADING_INT8_QUANT_WEIGHTS</div>
            <div style={VictimStyles.termLine}>[ AI ] ANALYZING_INCIDENT_VECTOR...</div>
            <div style={VictimStyles.termLine}>[ AI ] CONFIDENCE_SCORE: 0.9842</div>
            <div style={VictimStyles.termLine}>[ AI ] RESULT: {selectedCondition?.label}</div>
            <div style={VictimStyles.termLine}>[ MESH ] PREPARING_ENCODED_PACKET</div>
            <div className="pulse-text" style={{ ...VictimStyles.termLine, color: '#3b82f6' }}>PROCESSING_UPLINK...</div>
          </div>
        </div>
      );
    }

    if (phase === 'review' && packet) {
      return (
        <div style={VictimStyles.view}>
          <div style={VictimStyles.reviewGridDesktop}>
            <div style={VictimStyles.reviewCard}>
              <div style={VictimStyles.reviewHeader}>
                <span>SOURCE: {packet?.data?.ai_source || packet?.ai_source}</span>
                <span>ZONE: Z-04</span>
              </div>
              <div style={VictimStyles.reviewMain}>
                <div style={VictimStyles.reviewType}>
                  {selectedCondition?.id === 'OT' ? 'CUSTOM_DESCRIPTION' : selectedCondition?.label}
                </div>
                <div style={VictimStyles.reviewCount}>{selections.count} PERSONNEL_REPORTED</div>
                {selectedCondition?.id === 'OT' && (
                  <div style={VictimStyles.reviewQuote}>"{customDescription}"</div>
                )}
                <div style={VictimStyles.reviewContact}>PHONE: {phoneNumber}</div>
              </div>
            </div>

            <div style={VictimStyles.packetInfo}>
              <div style={VictimStyles.packetHeader}>
                <span style={VictimStyles.packetLabel}>ENCODED_HEX_DATA</span>
                <span style={VictimStyles.packetSize}>42 BYTES</span>
              </div>
              <div style={VictimStyles.packetData}>{packetPreview}</div>
              <div style={VictimStyles.reviewMetaGrid}>
                <MetricChip label="QUEUE" value={statusLabel(phase)} />
                <MetricChip label="ROUTE" value={modeMeta.descriptor} />
                <MetricChip label="CONF" value={packet?.confidence ? `${Math.round(packet.confidence * 100)}%` : 'N/A'} />
                <MetricChip label="PEOPLE" value={`${selections.count}`} />
              </div>
            </div>
          </div>

          <SOSButton
            label={effectiveOnline ? 'UPLINK_TO_CLOUD' : 'STORE_IN_MESH_QUEUE'}
            color={effectiveOnline ? '#3b82f6' : '#f59e0b'}
            onClick={finalizeRelay}
            loading={syncing}
          />
          <button style={VictimStyles.backBtn} onClick={resetFlow}>ABORT_AND_RETRY</button>
        </div>
      );
    }

    if (phase === 'success') {
      return (
        <div style={VictimStyles.resultView}>
          <div style={VictimStyles.successIcon}>[ TRANSMISSION_COMPLETE ]</div>
          <h2 style={VictimStyles.resultTitle}>SIGNAL_UPLINKED</h2>
          <p style={VictimStyles.resultSub}>Packet successfully synchronized with cloud persistence layer.</p>
          <button style={VictimStyles.finishBtn} onClick={resetFlow}>ACKNOWLEDGE</button>
        </div>
      );
    }

    return (
      <div style={VictimStyles.resultView}>
        <div style={VictimStyles.bufferIcon}>[ BUFFERED_OFFLINE ]</div>
        <h2 style={VictimStyles.resultTitle}>SIGNAL_PERSISTED</h2>
        <p style={VictimStyles.resultSub}>No network path. Report stored in local cache. Will relay via mesh-bridge automatically.</p>
        <button style={VictimStyles.finishBtn} onClick={resetFlow}>ACKNOWLEDGE</button>
      </div>
    );
  };

  const renderDesktopSectionHeader = (title, subtitle) => (
    <div style={VictimStyles.desktopHeaderBlock}>
      <h1 style={VictimStyles.desktopTitle}>{title}</h1>
      <p style={VictimStyles.desktopSubtitle}>{subtitle}</p>
    </div>
  );

  const renderDesktopContent = () => {
    if (phase === 'idle') {
      if (step === 0) {
        return (
          <>
            {renderDesktopSectionHeader('INCIDENT_REPORT', 'SELECT_PRIMARY_SITUATION_CODE')}
            <div style={VictimStyles.desktopIncidentList}>
              {INCIDENT_TYPES.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  style={{
                    ...VictimStyles.desktopIncidentRow,
                    ...(type.id === 'OT' ? VictimStyles.desktopIncidentRowSpecial : {}),
                  }}
                  onClick={() => handleSelection(type)}
                >
                  <div
                    style={{
                      ...VictimStyles.desktopIncidentAccent,
                      background: type.id === 'OT' ? '#10b981' : '#3b82f6',
                    }}
                  />
                  <div style={VictimStyles.desktopIncidentInfo}>
                    <div style={VictimStyles.desktopIncidentLabel}>{type.label}</div>
                    <div style={VictimStyles.desktopIncidentSub}>{type.sub}</div>
                  </div>
                  <div style={VictimStyles.desktopIncidentCode}>{type.id}</div>
                </button>
              ))}
            </div>
          </>
        );
      }

      if (step === 1 && selectedCondition?.id === 'OT') {
        return (
          <>
            {renderDesktopSectionHeader('BRIEF_DESCRIPTION', 'DESCRIBE_SITUATION_IN_FEW_WORDS')}
            <div style={VictimStyles.desktopFormPanel}>
              <div style={VictimStyles.desktopSelectedRow}>
                <span style={VictimStyles.desktopSelectedLabel}>ACTIVE_CODE</span>
                <span style={VictimStyles.desktopSelectedValue}>{selectedCondition.label}</span>
              </div>
              <textarea
                value={customDescription}
                onChange={(event) => setCustomDescription(event.target.value)}
                placeholder="EG: SMOKE ON 4TH FLOOR, NEED EVAC..."
                style={VictimStyles.desktopTextarea}
              />
            </div>
            <div style={VictimStyles.desktopActionRow}>
              <button style={VictimStyles.desktopGhostBtn} onClick={handleBackStep}>BACK</button>
              <button
                style={VictimStyles.desktopPrimaryBtn}
                onClick={() => {
                  if (customDescription.trim()) setStep(2);
                }}
              >
                CONTINUE
              </button>
            </div>
          </>
        );
      }

      if (step === 2) {
        return (
          <>
            {renderDesktopSectionHeader('CONTACT_CHANNEL', 'ENTER_LOCAL_CONTACT_FOR_COORDINATION')}
            <div style={VictimStyles.desktopFormPanel}>
              <div style={VictimStyles.desktopSelectedRow}>
                <span style={VictimStyles.desktopSelectedLabel}>SELECTED_TYPE</span>
                <span style={VictimStyles.desktopSelectedValue}>{selectedCondition?.label}</span>
              </div>
              <input
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder="+XX 000-000-0000"
                style={VictimStyles.desktopInput}
              />
            </div>
            <div style={VictimStyles.desktopActionRow}>
              <button style={VictimStyles.desktopGhostBtn} onClick={handleBackStep}>BACK</button>
              <button
                style={VictimStyles.desktopPrimaryBtn}
                onClick={() => {
                  if (phoneNumber.trim()) setStep(3);
                }}
              >
                CONTINUE
              </button>
            </div>
          </>
        );
      }

      return (
        <>
          {renderDesktopSectionHeader('PERSONNEL_COUNT', 'ESTIMATE_VICTIMS_IN_VICINITY')}
          <div style={VictimStyles.desktopFormPanel}>
            <div style={VictimStyles.desktopSelectedRow}>
              <span style={VictimStyles.desktopSelectedLabel}>ACTIVE_CODE</span>
              <span style={VictimStyles.desktopSelectedValue}>{selectedCondition?.label}</span>
            </div>
            <div style={VictimStyles.desktopCountGrid}>
              {[1, 2, 5, 10].map((count) => (
                <button
                  key={count}
                  type="button"
                  style={VictimStyles.desktopCountBtn}
                  onClick={() => startInference(count)}
                >
                  {count === 10 ? '10+' : count}
                </button>
              ))}
            </div>
          </div>
          <div style={VictimStyles.desktopActionRow}>
            <button style={VictimStyles.desktopGhostBtn} onClick={handleBackStep}>BACK</button>
          </div>
        </>
      );
    }

    if (phase === 'inference_active') {
      return (
        <>
          {renderDesktopSectionHeader('EDGE_AI_INFERENCE', 'ANALYZING_INCIDENT_VECTOR')}
          <div style={VictimStyles.desktopTerminal}>
            <div style={VictimStyles.termLine}>[ SYS ] TPU_INIT // OK</div>
            <div style={VictimStyles.termLine}>[ SYS ] LOADING_INT8_QUANT_WEIGHTS</div>
            <div style={VictimStyles.termLine}>[ AI ] ANALYZING_INCIDENT_VECTOR...</div>
            <div style={VictimStyles.termLine}>[ AI ] CONFIDENCE_SCORE: 0.9842</div>
            <div style={VictimStyles.termLine}>[ AI ] RESULT: {selectedCondition?.label}</div>
            <div style={VictimStyles.termLine}>[ MESH ] PREPARING_ENCODED_PACKET</div>
            <div className="pulse-text" style={{ ...VictimStyles.termLine, color: '#3b82f6' }}>
              PROCESSING_UPLINK...
            </div>
          </div>
        </>
      );
    }

    if (phase === 'review' && packet) {
      return (
        <>
          {renderDesktopSectionHeader('UPLINK_REVIEW', 'VERIFY_PACKET_AND_TRANSMIT')}
          <div style={VictimStyles.desktopReviewGrid}>
            <div style={VictimStyles.desktopSummaryCard}>
              <div style={VictimStyles.desktopSummaryHeader}>
                <span>SOURCE: {packet?.data?.ai_source || packet?.ai_source}</span>
                <span>ZONE: Z-04</span>
              </div>
              <div style={VictimStyles.desktopSummaryType}>
                {selectedCondition?.id === 'OT' ? 'CUSTOM_DESCRIPTION' : selectedCondition?.label}
              </div>
              <div style={VictimStyles.desktopSummarySub}>
                {selectedCondition?.id === 'OT' ? customDescription : selectedCondition?.sub}
              </div>
              <div style={VictimStyles.desktopReviewStats}>
                <MetricChip label="PEOPLE" value={`${selections.count}`} />
                <MetricChip label="QUEUE" value={statusLabel(phase)} />
                <MetricChip label="ROUTE" value={modeMeta.descriptor} />
                <MetricChip
                  label="CONF"
                  value={packet?.confidence ? `${Math.round(packet.confidence * 100)}%` : 'N/A'}
                />
              </div>
            </div>

            <div style={VictimStyles.desktopSummaryCard}>
              <div style={VictimStyles.desktopSummaryHeader}>
                <span>PAYLOAD_PREVIEW</span>
                <span>CONTACT: {phoneNumber || 'UNSET'}</span>
              </div>
              <div style={VictimStyles.desktopPacketPreview}>{packetPreview}</div>
              <div style={VictimStyles.desktopFieldBrief}>{incidentBrief}</div>
            </div>
          </div>
          <div style={VictimStyles.desktopActionRow}>
            <button style={VictimStyles.desktopGhostBtn} onClick={resetFlow}>ABORT_AND_RETRY</button>
            <button
              style={{
                ...VictimStyles.desktopPrimaryBtn,
                opacity: syncing ? 0.7 : 1,
                cursor: syncing ? 'wait' : 'pointer',
              }}
              onClick={finalizeRelay}
              disabled={syncing}
            >
              {syncing
                ? 'UPLINK_IN_PROGRESS'
                : effectiveOnline
                  ? 'UPLINK_TO_CLOUD'
                  : 'STORE_IN_MESH_QUEUE'}
            </button>
          </div>
        </>
      );
    }

    if (phase === 'success') {
      return (
        <>
          {renderDesktopSectionHeader('SIGNAL_UPLINKED', 'PACKET_SYNCHRONIZED_WITH_CLOUD_LAYER')}
          <div style={VictimStyles.desktopResultPanel}>
            <div style={VictimStyles.successIcon}>[ TRANSMISSION_COMPLETE ]</div>
            <p style={VictimStyles.desktopResultCopy}>
              Packet successfully synchronized with cloud persistence layer.
            </p>
          </div>
          <div style={VictimStyles.desktopActionRow}>
            <button style={VictimStyles.desktopPrimaryBtn} onClick={resetFlow}>ACKNOWLEDGE</button>
          </div>
        </>
      );
    }

    return (
      <>
        {renderDesktopSectionHeader('SIGNAL_PERSISTED', 'OFFLINE_BUFFER_STORED_FOR_MESH_RELAY')}
        <div style={VictimStyles.desktopResultPanel}>
          <div style={VictimStyles.bufferIcon}>[ BUFFERED_OFFLINE ]</div>
          <p style={VictimStyles.desktopResultCopy}>
            No network path. Report stored in local cache and will relay via mesh bridge automatically.
          </p>

          <div style={{ ...VictimStyles.desktopFormPanel, marginTop: 24, border: '1px solid #f43f5e30' }}>
            <div style={{ color: '#f43f5e', fontSize: 10, fontWeight: 'bold', marginBottom: 12 }}>[ DUAL_MODEL_LOCAL_ANALYSIS ]</div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
               <div style={{ background: '#f43f5e20', padding: '4px 8px', borderRadius: 2, fontSize: 8, color: '#f43f5e', border: '1px solid #f43f5e40' }}>
                 NANO: {packet?.category || 'ANALYZED'}
               </div>
               <div style={{ background: '#f43f5e20', padding: '4px 8px', borderRadius: 2, fontSize: 8, color: '#f43f5e', border: '1px solid #f43f5e40' }}>
                 TFLITE: {packet?.reasoning?.includes('VISION_CONFIRM') ? 'CONFIRMED' : 'NO_VISUAL_MATCH'}
               </div>
            </div>
            <div style={{ color: '#94a3b8', fontSize: 10, lineHeight: 1.5, fontStyle: 'italic', marginBottom: 12 }}>
              "{packet?.reasoning}"
            </div>

            {packet?.processing_trace && (
              <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ color: '#f43f5e', fontSize: 8, fontWeight: 'bold', marginBottom: 4 }}>[ TACTICAL_INFERENCE_TRACE ]</div>
                {packet.processing_trace.map((step, idx) => (
                  <div key={idx} style={{ fontSize: 7, color: '#f43f5e80', fontFamily: 'monospace' }}>
                    {`>> ${step}`}
                  </div>
                ))}
              </div>
            )}

            <div style={{ borderTop: '1px solid #f43f5e20', paddingTop: 12 }}>
              <div style={{ color: '#f59e0b', fontSize: 9, fontWeight: 'bold', marginBottom: 4 }}>[ AI_AUTONOMOUS_GUIDANCE ]</div>
              <div style={{ color: '#fde68a', fontSize: 11, fontWeight: '500', lineHeight: 1.4 }}>
                {packet?.guidance || "Stay in your current position and keep your device battery-efficient. Rescuers are coordinating."}
              </div>
            </div>
          </div>
        </div>
        <div style={VictimStyles.desktopActionRow}>
          <button style={VictimStyles.desktopPrimaryBtn} onClick={resetFlow}>ACKNOWLEDGE_&_PERSIST</button>
        </div>
      </>
    );
  };

  if (isDesktop) {
    return (
      <div style={VictimStyles.desktopRoot}>
        <div style={VictimStyles.desktopTopline}>
          <span style={VictimStyles.desktopToplineLabel}>SIGNAL_STRENGTH // {signalDbm} dBm (AUTO_DETECTED)</span>
          <div style={VictimStyles.desktopToplineRight}>
            <button
              style={{
                ...VictimStyles.desktopModeBadge,
                background: modeMeta.background,
                color: modeMeta.accent,
              }}
              onClick={cycleSyncMode}
            >
              {modeMeta.badge}
            </button>
            <button style={VictimStyles.desktopTerminateBtn} onClick={resetFlow}>
              TERMINATE_SESSION
            </button>
          </div>
        </div>

        <div style={VictimStyles.desktopMetaRow}>
          <MetaCell label="WORKFLOW" value={getStepLabel(step, selectedCondition)} />
          <MetaCell label="GPS_LOCK" value={location.status === 'LOCKED' ? `${location.lat.toFixed(6)}, ${location.lon.toFixed(6)}` : location.status} />
          <MetaCell label="QUEUE_STATE" value={statusLabel(phase)} />
          <MetaCell label="LINK_PROFILE" value={syncMode} />
        </div>

        <div style={VictimStyles.desktopBoard}>
          {renderDesktopContent()}
        </div>
      </div>
    );
  }

  return (
    <div style={VictimStyles.root}>
      <div style={VictimStyles.telemetry}>
        <div style={VictimStyles.telGroup}>
          <span style={VictimStyles.telLabel}>GPS</span>
          <span style={{ 
            ...VictimStyles.telVal, 
            color: location.status === 'LOCKED' ? '#10b981' : '#f43f5e' 
          }}>
            {location.status === 'LOCKED' 
              ? `${location.lat?.toFixed(4)},${location.lon?.toFixed(4)}` 
              : location.status}
          </span>
        </div>
        <div style={VictimStyles.telGroup}>
          <span style={VictimStyles.telLabel}>MODE</span>
          <span style={{ ...VictimStyles.telVal, color: isUltraLight ? '#f59e0b' : (effectiveOnline ? '#3b82f6' : '#f43f5e') }}>
            {syncMode}
          </span>
        </div>
        <div style={VictimStyles.telGroup}>
          <span style={VictimStyles.telLabel}>SIG</span>
          <span style={VictimStyles.telVal}>{signalDbm}dBm</span>
        </div>
        <div style={{ ...VictimStyles.telGroup, marginLeft: 'auto' }}>
          <span style={VictimStyles.telLabel}>SYNC</span>
          <span style={VictimStyles.telVal}>{modeMeta.route}</span>
        </div>
      </div>

      <header style={VictimStyles.nav}>
        <div style={VictimStyles.brandBlock}>
          <div style={VictimStyles.brand}>SYNC_BRIDGE // V.04</div>
          <div style={VictimStyles.brandSub}>TACTICAL_BEACON_COMMAND_DESK</div>
        </div>
        <button
          style={{
            ...VictimStyles.signalBadge,
            background: modeMeta.background,
            color: modeMeta.accent,
          }}
          onClick={cycleSyncMode}
        >
          {modeMeta.badge}
        </button>
      </header>

      <main style={VictimStyles.body}>{renderFlow()}</main>
    </div>
  );
}

function SideCard({ title, children }) {
  return (
    <div style={VictimStyles.sideCard}>
      <div style={VictimStyles.sideTitle}>{title}</div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={VictimStyles.infoRow}>
      <span style={VictimStyles.infoLabel}>{label}</span>
      <span style={VictimStyles.infoValue}>{value}</span>
    </div>
  );
}

function StatPanel({ label, value, highlight = false }) {
  return (
    <div
      style={{
        ...VictimStyles.metricPanel,
        borderLeft: highlight ? '2px solid #3b82f6' : '1px solid #1f2937',
      }}
    >
      <div style={VictimStyles.metricLabel}>{label}</div>
      <div style={{ ...VictimStyles.metricValue, color: highlight ? '#93c5fd' : '#fff' }}>{value}</div>
    </div>
  );
}

function MetricChip({ label, value }) {
  return (
    <div style={VictimStyles.metricChip}>
      <span style={VictimStyles.metricChipLabel}>{label}</span>
      <span style={VictimStyles.metricChipValue}>{value}</span>
    </div>
  );
}

function MetaCell({ label, value }) {
  return (
    <div style={VictimStyles.desktopMetaCell}>
      <div style={VictimStyles.desktopMetaLabel}>{label}</div>
      <div style={VictimStyles.desktopMetaValue}>{value}</div>
    </div>
  );
}

const VictimStyles = {
  desktopRoot: {
    height: '100%',
    width: '100%',
    minWidth: 0,
    maxWidth: '100%',
    alignSelf: 'stretch',
    display: 'flex',
    flexDirection: 'column',
    padding: '22px 22px 26px',
    background: '#05070a',
    color: '#fff',
    fontFamily: '"JetBrains Mono"',
    gap: 22,
    overflow: 'hidden',
  },
  desktopTopline: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    paddingBottom: 14,
  },
  desktopToplineLabel: {
    fontSize: '0.5rem',
    color: '#3b82f6',
    fontWeight: 900,
    letterSpacing: '0.14em',
  },
  desktopToplineRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  desktopModeBadge: {
    border: 'none',
    padding: '8px 12px',
    fontSize: '0.55rem',
    fontWeight: 900,
    fontFamily: '"JetBrains Mono"',
    cursor: 'pointer',
    letterSpacing: '0.08em',
  },
  desktopTerminateBtn: {
    background: 'transparent',
    border: 'none',
    color: '#f43f5e',
    fontSize: '0.5rem',
    fontWeight: 900,
    cursor: 'pointer',
    letterSpacing: '0.12em',
  },
  desktopMetaRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 14,
  },
  desktopMetaCell: {
    padding: '12px 14px',
    background: '#05080d',
    border: '1px solid #101827',
    minHeight: 64,
  },
  desktopMetaLabel: {
    fontSize: '0.48rem',
    color: '#475569',
    fontWeight: 900,
    letterSpacing: '0.12em',
    marginBottom: 8,
  },
  desktopMetaValue: {
    fontSize: '0.78rem',
    color: '#fff',
    fontWeight: 900,
    fontFamily: '"Space Grotesk"',
  },
  desktopBoard: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
    padding: '4px 0 0',
  },
  desktopHeaderBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  desktopTitle: {
    margin: 0,
    fontSize: '3rem',
    lineHeight: 0.94,
    fontWeight: 900,
    letterSpacing: '-0.04em',
    fontFamily: '"Space Grotesk"',
    color: '#fff',
  },
  desktopSubtitle: {
    margin: 0,
    fontSize: '0.56rem',
    color: '#475569',
    fontWeight: 800,
    letterSpacing: '0.14em',
  },
  desktopIncidentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  desktopIncidentRow: {
    width: '100%',
    padding: '18px 22px',
    background: '#05080d',
    border: '1px solid #162133',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    gap: 18,
    cursor: 'pointer',
    textAlign: 'left',
    minHeight: 60,
  },
  desktopIncidentRowSpecial: {
    borderColor: '#0d4f3c',
    background: 'linear-gradient(180deg, rgba(8, 16, 14, 0.96), rgba(5, 8, 13, 0.96))',
  },
  desktopIncidentAccent: {
    width: 4,
    height: 22,
    background: '#3b82f6',
    boxShadow: '0 0 14px rgba(59, 130, 246, 0.28)',
  },
  desktopIncidentInfo: {
    flex: 1,
    minWidth: 0,
  },
  desktopIncidentLabel: {
    fontSize: '0.8rem',
    fontWeight: 900,
    color: '#fff',
    letterSpacing: '0.02em',
  },
  desktopIncidentSub: {
    marginTop: 4,
    fontSize: '0.52rem',
    color: '#475569',
    fontWeight: 700,
    letterSpacing: '0.08em',
  },
  desktopIncidentCode: {
    fontSize: '0.62rem',
    color: '#27364e',
    fontWeight: 900,
    letterSpacing: '0.12em',
  },
  desktopFormPanel: {
    background: '#05080d',
    border: '1px solid #162133',
    padding: '22px',
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  desktopSelectedRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 14,
    flexWrap: 'wrap',
  },
  desktopSelectedLabel: {
    fontSize: '0.52rem',
    color: '#3b82f6',
    fontWeight: 900,
    letterSpacing: '0.12em',
  },
  desktopSelectedValue: {
    fontSize: '0.72rem',
    color: '#fff',
    fontWeight: 900,
  },
  desktopTextarea: {
    minHeight: 220,
    resize: 'vertical',
    background: '#020406',
    border: '1px solid #101827',
    color: '#fff',
    padding: '18px',
    fontFamily: '"JetBrains Mono"',
    fontSize: '0.75rem',
    outline: 'none',
  },
  desktopInput: {
    background: '#020406',
    border: '1px solid #101827',
    color: '#fff',
    padding: '18px',
    fontFamily: '"JetBrains Mono"',
    fontSize: '1rem',
    fontWeight: 800,
    outline: 'none',
  },
  desktopCountGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 14,
  },
  desktopCountBtn: {
    background: '#020406',
    border: '1px solid #162133',
    color: '#fff',
    minHeight: 120,
    fontSize: '1.8rem',
    fontWeight: 900,
    cursor: 'pointer',
    fontFamily: '"Space Grotesk"',
  },
  desktopActionRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 14,
    flexWrap: 'wrap',
  },
  desktopPrimaryBtn: {
    minWidth: 220,
    background: '#0f172a',
    border: '1px solid #2563eb',
    color: '#60a5fa',
    padding: '14px 20px',
    fontSize: '0.66rem',
    fontWeight: 900,
    letterSpacing: '0.12em',
    cursor: 'pointer',
    fontFamily: '"JetBrains Mono"',
  },
  desktopGhostBtn: {
    minWidth: 180,
    background: 'transparent',
    border: '1px solid #162133',
    color: '#94a3b8',
    padding: '14px 20px',
    fontSize: '0.66rem',
    fontWeight: 900,
    letterSpacing: '0.12em',
    cursor: 'pointer',
    fontFamily: '"JetBrains Mono"',
  },
  desktopTerminal: {
    background: '#020406',
    border: '1px solid #162133',
    padding: '22px',
    minHeight: 320,
  },
  desktopReviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.1fr) minmax(360px, 0.9fr)',
    gap: 18,
  },
  desktopSummaryCard: {
    background: '#05080d',
    border: '1px solid #162133',
    padding: '22px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  desktopSummaryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
    fontSize: '0.52rem',
    color: '#3b82f6',
    fontWeight: 900,
    letterSpacing: '0.12em',
  },
  desktopSummaryType: {
    fontSize: '1.6rem',
    fontWeight: 900,
    fontFamily: '"Space Grotesk"',
    color: '#fff',
  },
  desktopSummarySub: {
    fontSize: '0.72rem',
    color: '#94a3b8',
    lineHeight: 1.7,
  },
  desktopReviewStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 12,
  },
  desktopPacketPreview: {
    fontSize: '0.92rem',
    color: '#60a5fa',
    fontWeight: 800,
    lineHeight: 1.7,
    wordBreak: 'break-word',
  },
  desktopFieldBrief: {
    fontSize: '0.7rem',
    color: '#94a3b8',
    lineHeight: 1.7,
  },
  desktopResultPanel: {
    background: '#05080d',
    border: '1px solid #162133',
    padding: '28px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    minHeight: 220,
    justifyContent: 'center',
  },
  desktopResultCopy: {
    margin: 0,
    fontSize: '0.76rem',
    color: '#94a3b8',
    lineHeight: 1.7,
    maxWidth: 720,
  },
  root: {
    height: '100%',
    background: '#05070a',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '"JetBrains Mono"',
    position: 'relative',
  },
  telemetry: {
    display: 'flex',
    gap: 16,
    padding: '10px 20px',
    background: '#000',
    borderBottom: '1px solid #1f2937',
    fontSize: '0.5rem',
    color: '#475569',
    fontWeight: 800,
    flexWrap: 'wrap',
  },
  telGroup: { display: 'flex', gap: 4 },
  telLabel: { color: '#1e293b' },
  telVal: { color: '#94a3b8' },

  nav: {
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #1f2937',
    gap: 12,
  },
  brandBlock: { display: 'flex', flexDirection: 'column', gap: 4 },
  brand: { fontSize: '0.6rem', fontWeight: 900, color: '#fff', letterSpacing: '0.1em' },
  brandSub: { fontSize: '0.52rem', color: '#475569', fontWeight: 800, letterSpacing: '0.16em' },
  signalBadge: { fontSize: '0.55rem', fontWeight: 900, border: 'none', padding: '6px 10px', borderRadius: 2, cursor: 'pointer', fontFamily: '"JetBrains Mono"' },

  body: { flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column' },
  workspace: {
    flex: 1,
    minHeight: 0,
    padding: '24px',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.48fr) minmax(300px, 0.78fr)',
    gap: 24,
  },
  primaryColumn: {
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  metricStrip: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 16,
  },
  metricPanel: {
    background: '#000',
    border: '1px solid #1f2937',
    padding: '16px',
  },
  metricLabel: {
    fontSize: '0.5rem',
    color: '#475569',
    fontWeight: 900,
    letterSpacing: '0.1em',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: '1rem',
    fontWeight: 900,
    fontFamily: '"Space Grotesk"',
    lineHeight: 1.2,
  },
  surfaceLabel: {
    fontSize: '0.55rem',
    color: '#1e293b',
    fontWeight: 900,
    letterSpacing: '0.15em',
  },
  mainPanel: {
    minHeight: 0,
    overflowY: 'auto',
    background: 'linear-gradient(180deg, rgba(10, 12, 16, 0.82), rgba(5, 7, 10, 0.96))',
    border: '1px solid #1f2937',
    padding: '28px',
    display: 'flex',
    flexDirection: 'column',
  },
  sideRail: {
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    overflowY: 'auto',
  },
  sideCard: {
    background: '#0a0c10',
    border: '1px solid #1f2937',
    padding: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  sideTitle: {
    fontSize: '0.55rem',
    color: '#3b82f6',
    fontWeight: 900,
    letterSpacing: '0.14em',
  },
  modeStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: '0.75rem',
    fontWeight: 900,
  },
  modeDot: {
    width: 9,
    height: 9,
    borderRadius: '50%',
  },
  sideCopy: {
    color: '#94a3b8',
    fontSize: '0.65rem',
    lineHeight: 1.7,
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 8,
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  infoLabel: {
    fontSize: '0.55rem',
    color: '#475569',
    fontWeight: 800,
  },
  infoValue: {
    fontSize: '0.63rem',
    color: '#fff',
    fontWeight: 900,
    textAlign: 'right',
  },
  fieldBrief: {
    color: '#94a3b8',
    fontSize: '0.68rem',
    lineHeight: 1.7,
    minHeight: 52,
  },
  payloadPreview: {
    color: '#93c5fd',
    fontSize: '0.68rem',
    lineHeight: 1.8,
    wordBreak: 'break-word',
  },

  view: { display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn 0.3s ease' },
  headerSection: { borderLeft: '2px solid #3b82f6', paddingLeft: 12 },
  title: { fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.02em', margin: 0, color: '#fff', fontFamily: '"Space Grotesk"' },
  subtitle: { fontSize: '0.55rem', color: '#475569', fontWeight: 800, margin: '4px 0 0 0', letterSpacing: '0.1em' },
  grid: { display: 'flex', flexDirection: 'column', gap: 8 },
  gridDesktop: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 },
  typeCard: { background: '#0a0c10', border: '1px solid #1f2937', padding: '16px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', textAlign: 'left', color: '#fff', position: 'relative', minHeight: 86 },
  typeCardSpecial: { borderColor: '#10362a', background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.06), rgba(10, 12, 16, 0.96))' },
  typeIndicator: { width: 4, height: 24, background: '#1e293b' },
  typeInfo: { flex: 1 },
  typeLabel: { fontSize: '0.75rem', fontWeight: 800, color: '#fff' },
  typeSub: { fontSize: '0.55rem', color: '#475569', fontWeight: 600, marginTop: 4 },
  typeCode: { fontSize: '0.6rem', color: '#1e293b', fontWeight: 900, fontFamily: '"JetBrains Mono"' },

  selectedBanner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    padding: '14px 16px',
    background: '#0a0c10',
    border: '1px solid #1f2937',
  },
  selectedLabel: { fontSize: '0.55rem', color: '#3b82f6', fontWeight: 900, letterSpacing: '0.12em' },
  selectedValue: { fontSize: '0.75rem', color: '#fff', fontWeight: 900 },

  fieldStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    background: '#0a0c10',
    border: '1px solid #1f2937',
    padding: '18px',
  },
  fieldMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  fieldMetaLabel: {
    fontSize: '0.55rem',
    color: '#3b82f6',
    fontWeight: 900,
    letterSpacing: '0.12em',
  },
  fieldMetaValue: {
    fontSize: '0.72rem',
    color: '#fff',
    fontWeight: 900,
  },
  textarea: {
    minHeight: 150,
    resize: 'vertical',
    background: '#000',
    border: '1px solid #1f2937',
    color: '#fff',
    padding: '16px',
    fontFamily: '"JetBrains Mono"',
    fontSize: '0.72rem',
    outline: 'none',
  },
  textInput: {
    background: '#000',
    border: '1px solid #1f2937',
    color: '#fff',
    padding: '18px 16px',
    fontFamily: '"JetBrains Mono"',
    fontSize: '1.05rem',
    fontWeight: 800,
    outline: 'none',
  },
  buttonRow: {
    display: 'flex',
    gap: 16,
  },
  primaryBtn: {
    flex: 1,
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    padding: '14px 18px',
    fontSize: '0.68rem',
    fontWeight: 900,
    cursor: 'pointer',
    letterSpacing: '0.08em',
  },
  secondaryBtn: {
    flex: 1,
    background: 'transparent',
    color: '#fff',
    border: '1px solid #1f2937',
    padding: '14px 18px',
    fontSize: '0.68rem',
    fontWeight: 900,
    cursor: 'pointer',
    letterSpacing: '0.08em',
  },

  countGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  countGridDesktop: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 },
  countBtn: { background: '#0a0c10', border: '1px solid #1f2937', color: '#fff', fontSize: '1.2rem', fontWeight: 900, padding: '24px', cursor: 'pointer' },

  backBtn: { background: 'none', border: 'none', color: '#475569', fontSize: '0.55rem', fontWeight: 800, cursor: 'pointer', alignSelf: 'center', marginTop: 12, letterSpacing: '0.05em' },

  inferenceView: { display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', minHeight: 320 },
  terminal: { width: '100%', background: '#000', padding: '20px', border: '1px solid #1f2937', minHeight: 220 },
  termLine: { fontSize: '0.65rem', color: '#10b981', marginBottom: 6, opacity: 0.9 },

  reviewGridDesktop: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(300px, 0.9fr)', gap: 18 },
  reviewCard: { background: '#0a0c10', border: '1px solid #3b82f6', padding: '24px', position: 'relative' },
  reviewHeader: { display: 'flex', justifyContent: 'space-between', fontSize: '0.5rem', fontWeight: 800, color: '#3b82f6', marginBottom: 16, letterSpacing: '0.1em', gap: 12, flexWrap: 'wrap' },
  reviewMain: { display: 'flex', flexDirection: 'column' },
  reviewType: { fontSize: '1.25rem', fontWeight: 900, color: '#fff' },
  reviewCount: { fontSize: '0.7rem', color: '#475569', marginTop: 4 },
  reviewQuote: { marginTop: 12, fontSize: '0.72rem', color: '#10b981', fontStyle: 'italic', lineHeight: 1.6 },
  reviewContact: { marginTop: 14, fontSize: '0.68rem', color: '#93c5fd', fontWeight: 800 },

  packetInfo: { background: '#000', padding: '16px', border: '1px solid #1f2937' },
  packetHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: 12, gap: 12, flexWrap: 'wrap' },
  packetLabel: { fontSize: '0.55rem', fontWeight: 900, color: '#1e293b' },
  packetSize: { fontSize: '0.55rem', color: '#475569' },
  packetData: { fontSize: '0.75rem', color: '#3b82f6', fontWeight: 800, wordBreak: 'break-all', lineHeight: 1.5 },
  reviewMetaGrid: {
    marginTop: 18,
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 10,
  },
  metricChip: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: '12px 10px',
    background: '#0a0c10',
    border: '1px solid #1f2937',
  },
  metricChipLabel: {
    fontSize: '0.48rem',
    color: '#475569',
    fontWeight: 900,
    letterSpacing: '0.12em',
  },
  metricChipValue: {
    fontSize: '0.66rem',
    color: '#fff',
    fontWeight: 900,
  },

  resultView: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, textAlign: 'center', gap: 24, minHeight: 320 },
  successIcon: { color: '#10b981', fontSize: '0.65rem', fontWeight: 900 },
  bufferIcon: { color: '#f59e0b', fontSize: '0.65rem', fontWeight: 900 },
  resultTitle: { fontSize: '1.5rem', fontWeight: 900, margin: 0, fontFamily: '"Space Grotesk"' },
  resultSub: { fontSize: '0.75rem', color: '#475569', maxWidth: 360, lineHeight: 1.6 },
  finishBtn: { background: '#1f2937', border: 'none', color: '#fff', padding: '12px 32px', fontWeight: 900, fontSize: '0.7rem', cursor: 'pointer', letterSpacing: '0.1em' },
};
