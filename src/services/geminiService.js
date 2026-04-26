/**
 * GEMINI CLOUD SERVICE — PROJECT_SYNC_BRIDGE
 * Handles deep-reasoning AI tasks when high-bandwidth connectivity is available.
 */

const GEMINI_API_KEY = "REPLACE_WITH_YOUR_GEMINI_API_KEY";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export const runCloudInference = async (message) => {
  if (GEMINI_API_KEY === "REPLACE_WITH_YOUR_GEMINI_API_KEY") {
    console.warn("[ GEMINI_CLOUD ] API_KEY_MISSING: Falling back to Local Edge AI Simulation.");
    return null;
  }

  try {
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a disaster relief AI. Analyze this message and return ONLY a JSON object with: 
                   { "severity": "critical|urgent|standard", "reasoning": "short explanation", "triage_code": "code" }.
                   Message: ${message}`
          }]
        }]
      })
    });

    const data = await response.json();
    const resultText = data.candidates[0].content.parts[0].text;
    
    // Clean JSON from response if Gemini adds markdown backticks
    const cleanedJson = resultText.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanedJson);
  } catch (error) {
    console.error("[ GEMINI_CLOUD_ERROR ]", error);
    return null;
  }
};
