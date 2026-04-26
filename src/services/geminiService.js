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
