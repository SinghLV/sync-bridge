#  Sync Bridge — When Networks Fail, Communication Survives

**Sync Bridge** is an offline-first disaster communication system powered by Edge AI (inspired by Gemini Nano). It is designed to function even when traditional network infrastructure collapses during emergencies like earthquakes, floods, or urban disasters.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Hackathon](https://img.shields.io/badge/Hackathon-Google%20Hackathon%202026-blue)](https://github.com/topics/hackathon)

---

## 📖 Overview

During disasters, communication infrastructure (cellular networks, internet) is the first to fail due to overload or damage. Most SOS apps depend entirely on internet connectivity. **Sync Bridge** solves this by shifting intelligence to the edge.

### Core Insight:
> "Even if connectivity fails, intelligence and prioritization must continue."

## ✨ Key Features

- **📱 Native Mobile Client:** A **Flutter** app built for victims, supporting hardware mesh integration and background packet relay.
- **🧠 Local Edge AI:** Real-time on-device classification using **TensorFlow Lite** & **Gemini Nano** (via AICore). Zero-data-required triage.
- **📦 Micro-Packet Protocol:** Custom 12-byte bit-packing logic to transmit complex SOS data over low-bandwidth LoRa/Mesh frequencies.
- **📡 Offline-First Sync:** Intelligent queueing that automatically broadcasts data the moment a bridge node is detected.
- **🛡️ Rescue Dashboard:** Real-time, map-based visualization for rescue teams to prioritize high-severity incidents.
- **📡 Intelligent Sync:** Automatically pushes queued data to the cloud the moment any signal returns.

## 🛠️ Tech Stack & Efficiency

- **Frontend:** React + Vite
- **AI Layer:** Custom On-Device Keyword NLP (Gemini Nano Philosophy)
- **Cloud Backend:** Firebase (Optimized for **Spark Free Plan**)
- **Styling:** Vanilla CSS (Modern Tactical Aesthetics)
- **Storage:** LocalStorage (Offline Persistence)

### 💰 Cost-Effectiveness (Spark Plan Ready)
Sync Bridge is designed to be deployed with **zero infrastructure costs**. By shifting AI processing to the user's device and using micro-packet data structures, the system stays well within the limits of the **Firebase Spark Plan**, making it an ideal solution for resource-constrained disaster zones.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/sync-bridge.git
   cd sync-bridge
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## 🎮 Demo Flow

1. **Simulate Failure:** Toggle "Airplane Mode" in the Victim App.
2. **Enter Emergency:** Load a demo scenario (e.g., "Trapped under debris").
3. **Local AI:** Watch the on-device AI classify the severity and encode the packet.
4. **Queue:** The message is saved to the local offline queue.
5. **Restore Signal:** Toggle "Online Mode."
6. **Live Sync:** Watch the packet sync to the Rescue Dashboard in real-time.

## 🏗️ System Architecture

1. **User Input** → Text or voice entry.
2. **Edge AI Classification** → Severity scoring (on-device).
3. **Data Structuring** → Standardized schema mapping.
4. **Packet Compression** → Binary-equivalent string encoding.
5. **Local Storage** → Persistence in the offline queue.
6. **Network Detection** → Monitoring for signal.
7. **Cloud Sync** → Transmission to Rescue Ops.
8. **Dashboard** → Real-time map visualization.

## ⚖️ License

Distributed under the MIT License. See `LICENSE` for more information.

---

*Developed for the Google Hackathon 2026.*
