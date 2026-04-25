# Sync Bridge — Research & Development Log

## Phase 1: Micro-Packet Architecture
**Objective:** Reduce SOS data size to fit within a single LoRa packet (max 255 bytes).
**Result:** Created a dash-separated token system. 
- Original SOS: ~120 chars
- Encoded Packet: 12 chars
- **Compression Ratio:** ~90%

## Phase 2: Edge-AI Heuristics
**Experiment:** Compare MobileBERT vs. Keyword Weighting.
- MobileBERT: High accuracy, but 400ms latency on low-end devices. Battery drain too high.
- **Weighted Keywords (Current):** ~14ms latency. negligible battery drain. Sufficient for initial SAR triage.

## Phase 3: Mesh Simulation (Current Focus)
**Observation:** In disaster zones, signal reflection (multipath interference) is high. 
- **Solution:** Implementing a "Digital Twin" mesh map to visualize packet "hops".
- **Hardware Target:** ESP32 + SX1276 LoRa modules.

## Known Challenges
1. **Clock Drift:** Local timestamps may drift if nodes are offline for >72 hours without NTP.
2. **Buffer Overflows:** Need to implement a FIFO circular buffer for the offline queue to prevent memory leaks during prolonged outages.

---
*SAR System Design Document v0.9.4*
