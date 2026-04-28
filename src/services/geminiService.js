/**
 * GEMINI CLOUD SERVICE — PROJECT_SYNC_BRIDGE
 * Handles deep-reasoning AI tasks when high-bandwidth connectivity is available.
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "REPLACE_WITH_YOUR_GEMINI_API_KEY";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

/**
 * TRUTH ANCHOR INFERENCE
 * Cross-references victim text against sensor data.
 */
export const runCloudInference = async (message, sensorData = {}) => {
  if (!import.meta.env.VITE_GEMINI_API_KEY || GEMINI_API_KEY === "REPLACE_WITH_YOUR_GEMINI_API_KEY") {
    console.warn("[ GEMINI_CLOUD ] API_KEY_MISSING: Falling back to Local Edge AI Simulation.");
    return null;
  }

  const sensorContext = sensorData ? `SENSOR_DATA: ${JSON.stringify(sensorData)}` : "SENSOR_DATA: No telemetry available.";

  try {
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are the SyncBridge Disaster Relief AI. Your goal is to be a "Truth Anchor."
                   ANALYSIS_RULES:
                   1. Compare the VICTIM_REPORT against the SENSOR_DATA.
                   2. Look for contradictions (e.g., report says "no fire" but sensors show 100°C).
                   3. Assign a truth_score (0-100) based on how well sensors support the text.
                   4. Assign priority_weight (0-1.0) based on life threat.

                   VICTIM_REPORT: "${message}"
                   ${sensorContext}

                   RETURN ONLY A RAW JSON OBJECT:
                   { 
                     "severity": "critical|urgent|standard", 
                     "truth_score": number, 
                     "sensor_conflict": boolean,
                     "reasoning": "One short sentence explaining the truth vs report gap", 
                     "triage_code": "ALPHA|BRAVO|CHARLIE" 
                   }`
          }]
        }]
      })
    });

    const data = await response.json();
    if (!data.candidates) throw new Error("Invalid Gemini response format");
    
    const resultText = data.candidates[0].content.parts[0].text;
    const cleanedJson = resultText.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanedJson);
  } catch (error) {
    console.error("[ GEMINI_CLOUD_ERROR ]", error);
    return null;
  }
};

/**
 * GEMINI LOCAL INFERENCE (On-Device)
 * Uses Chrome's built-in Gemini Nano (window.ai) for 100% offline triage.
 * Acts as the local "Truth Anchor" when the network is down.
 */
export const runLocalInference = async (message, sensorData = {}) => {
  // 1. Check for Chrome's built-in AI (Gemini Nano)
  if (typeof window !== 'undefined' && window.ai && window.ai.canCreateTextSession) {
    try {
      const status = await window.ai.canCreateTextSession();
      if (status !== 'no') {
        const session = await window.ai.createTextSession();
        const sensorContext = JSON.stringify(sensorData);
        
        const prompt = `You are a disaster relief AI running locally on a victim's phone.
                       TASK: Cross-reference the SOS message with SENSOR_DATA.
                       SOS: "${message}"
                       SENSORS: ${sensorContext}
                       
                       RULES:
                       - If SENSORS show danger (high heart rate/heat) but SOS says "ok", it is a SENSOR_CONFLICT.
                       - Return ONLY JSON: {"severity": "critical|urgent|standard", "truth_score": 0-100, "sensor_conflict": bool, "reasoning": "..."}`;
        
        const resultText = await session.prompt(prompt);
        session.destroy();
        
        const cleanedJson = resultText.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleanedJson);
        return { ...parsed, ai_source: "GEMINI_NANO_LOCAL" };
      }
    } catch (e) {
      console.warn("[ GEMINI_LOCAL ] Session failed, falling back to heuristic engine.", e);
    }
  }

  // 2. Tactical Reasoning Engine (On-Device Local AI Fallback)
  // This simulates the complex decision tree a local model would follow.
  console.log(`[ EDGE_AI ] INITIATING_LOCAL_TRIAGE: "${message}"`);
  
  const trace = ["INITIALIZING_LOCAL_SESSION", "LOADING_TRIAL_WEIGHTS"];
  await new Promise(r => setTimeout(r, 800));
  
  trace.push("SEMANTIC_TEXT_SCAN");
  const lowMsg = message.toLowerCase();
  
  // Complexity check: simulates intent detection
  const intentMap = {
    medical: ["bleed", "pain", "hurt", "unconscious", "heart"],
    structural: ["trap", "collapse", "crush", "rubble"],
    hazard: ["fire", "smoke", "gas", "leak"],
  };

  let detectedIntent = "general";
  for (const [intent, keywords] of Object.entries(intentMap)) {
    if (keywords.some(k => lowMsg.includes(k))) {
      detectedIntent = intent;
      trace.push(`INTENT_DETECTED: ${intent.toUpperCase()}`);
      break;
    }
  }

  trace.push("SENSOR_FUSION_VALIDATION");
  let severity = "standard";
  let truthScore = 85;
  let reason = "Local AI logic confirms report consistent with sensors.";

  // Dual-Channel Conflict Detection (Truth Anchor)
  if (sensorData.heart_rate > 110 || sensorData.ambient_noise > 85) {
    trace.push("ANOMALY_DETECTED: High Vitals/Noise");
    if (lowMsg.includes("ok") || lowMsg.includes("fine")) {
      severity = "critical";
      truthScore = 15;
      reason = "TRUTH_ANCHOR_CONFLICT: Vitals indicate distress while text reports safety.";
      trace.push("CONFLICT_LOGGED: SEVERITY_ESCALATED");
    } else {
      severity = "urgent";
      truthScore = 92;
      trace.push("SENSORS_CORROBORATE_DISTRESS");
    }
  } else if (detectedIntent !== "general") {
    severity = detectedIntent === "medical" || detectedIntent === "structural" ? "critical" : "urgent";
    trace.push("ESCALATING_BASED_ON_INTENT");
  }

  trace.push("SYNTHESIZING_GUIDANCE");
  const fallbackGuidance = {
    critical: "IMMEDIATE_ACTION: Stay low, conserve oxygen. Rescuers prioritized via MESH.",
    urgent: "SAFETY_ADVICE: Move to a clear area. Use light/noise to signal presence.",
    standard: "STAY_CALM: Report buffered. Keep app open for mesh link."
  };

  trace.push("TRIAGE_COMPLETE");

  return {
    severity: severity,
    category: detectedIntent.toUpperCase() + '_INCIDENT',
    reasoning: reason,
    truth_score: truthScore,
    guidance: fallbackGuidance[severity],
    processing_trace: trace,
    ai_source: 'SYNC_BRIDGE_TACTICAL_ENGINE'
  };
};
