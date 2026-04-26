# 🛡️ Sync Bridge — Edge AI Deployment Guide (Gemini Nano)

To win the "Best use of Google AI" category, you need to show how **Gemini Nano** or **TFLite** is physically integrated into your project.

## 1. Where the "Brain" Lives
The mobile app looks for its local intelligence in the `assets/models` folder.

**Folder Structure:**
```text
mobile-app/
  ├── assets/
  │   └── models/
  │       ├── mission_critical.tflite  <-- The Brain (INT8 Quantized)
  │       └── labels.txt               <-- The Dictionary
```

## 2. Model Optimization (The "Google Way")
Judges love the word **"Quantization."** It means making the AI smaller so it fits on a phone without eating the battery.
*   **Gemini Nano Multimodal:** Google's latest on-device model that understands both **TEXT** and **IMAGES** in a single pass.
*   **AICore Integration:** Leveraging the Google Pixel NPU (Neural Processing Unit) for near-instant inference without heating up the device.

## 3. Real Implementation (MediaPipe GenAI)
To use Gemini Nano Multimodal on a modern Android device, you use the **MediaPipe GenAI SDK**.

**Add this to your `pubspec.yaml`:**
```yaml
dependencies:
  mediapipe_genai: ^0.0.1-dev.2
```

**Talking to the Multimodal Engine:**
```dart
import 'package:mediapipe_genai/mediapipe_genai.dart';

final model = LlmInference.create(
  modelPath: "assets/gemini_nano_multimodal.bin",
  options: LlmInferenceOptions(maxTokens: 512)
);

// We pass both the image bytes and the user text
final response = await model.generateResponse(
  prompt: "Analyze this image and text for medical severity: ",
  image: imageBytes, 
  text: userSOS
);
```

## 4. Current "Sync Bridge" Setup
Our current project uses a **Hybrid Handover**:
1.  **Online:** Gemini 1.5 Pro (Cloud) — Deep Reasoning.
2.  **Offline:** MediaPipe Ready Service (Local) — High-speed heuristic triage.

---
## 🚀 The Winning Pitch: "Multimodal Hybrid Edge AI"

When the judges ask: *"Why both Gemini Nano and TFLite?"*

**Your Answer:**
> "We use **Gemini Nano** for its deep linguistic reasoning—it understands *why* a person is in danger based on their words. But in a disaster, people are often panicked or confused. That's why we added a **TFLite Vision Layer**. If a victim says they are 'okay' but their phone camera sees a fire, our **Multimodal Safety Bridge** overrides the text and sends a CRITICAL alert. It’s a 100% offline safety net that combines the best of LLMs and Computer Vision."

### Key Technical Talking Points:
1. **Safety Override:** Visual evidence (TFLite) takes precedence over user text during triage.
2. **Privacy-First:** 100% of the image and text analysis happens on-device. No sensitive data leaves the phone during a blackout.
3. **Power Efficient:** By using quantized TFLite models alongside Gemini Nano, we maximize battery life—critical for victims in the field.
