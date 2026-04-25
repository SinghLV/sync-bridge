# SYNC BRIDGE: SOFTWARE ARCHITECTURE & AI RESEARCH

## 🧠 Edge AI: On-Device Triage
Our strategy focuses on running **Deep Learning** models directly on the user's smartphone, eliminating the need for a cloud connection during the critical first minutes of a disaster.

### Model Strategy
*   **Target Model:** BERT-Tiny (Quantized to 4-bit) / Gemini Nano.
*   **Inference Engine:** TensorFlow Lite (WASM for Web, Native for Mobile).
*   **Benefit:** 100% Privacy and 0ms Latency. Triage happens instantly even in "Airplane Mode".

## 📡 Software-Defined Mesh (SDM)
Since we are focusing on a software-only implementation, we use **Software-Defined Mesh** principles:
*   **Browser-to-Browser Relay:** Using Service Workers and background sync to store packets until a "Bridge Node" (Rescuer) is within range.
*   **Micro-Packet Encoding:** We use a custom 12-byte header that packs:
    - User ID (3 bytes)
    - Severity (1 byte)
    - Condition Code (1 byte)
    - Location Delta (4 bytes)
    - Checksum (3 bytes)

## 📱 PWA Resilience
The "Victim App" is built as a **Progressive Web App (PWA)** to ensure:
*   **Instant Installation:** No App Store required.
*   **Offline Persistence:** Service Workers cache the entire UI and the AI models.
*   **Cross-Platform:** One codebase for Android, iOS, and Desktop.

## 🗺️ Operational Command Center
The Rescue Dashboard is designed for high-stress environments:
*   **Deduplication Engine:** Automatically merges duplicate mesh pings into a single mission card.
*   **Tactical Mapping:** Real-time heatmaps showing where the "Edge AI" has identified the highest density of critical victims.
