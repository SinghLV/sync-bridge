# 🌉 Sync Bridge — Emergency Communication System

> **"When the network dies, we don't."**

Sync Bridge is an Edge AI–powered disaster communication platform that keeps rescue operations running even when cellular networks fail. It uses on-device AI triage, offline-first data queuing, and Google Cloud to bridge the gap between victims and rescue commanders.

---

## ⚡ Quick Start

> First-time setup? See [Prerequisites](#prerequisites) and [Setup & Installation](#setup--installation) for full details.

```bash
# 1. Clone the repo
git clone https://github.com/your-org/sync-bridge.git
cd sync-bridge

# 2. Install all dependencies
npm install                              # Web dashboard
cd functions && npm install && cd ..     # Cloud Functions
cd mobile-app && flutter pub get && cd .. # Flutter app

# 3. Set up environment variables
cp .env.example .env
# Open .env and fill in your Firebase + Gemini keys

# 4. Link Firebase project
firebase login
firebase use sync-bridge-f88c2

# 5. Run the web dashboard  →  http://localhost:5173
npm run dev

# 6. Run the Flutter app (open a second terminal)
cd mobile-app
flutter run --dart-define=GEMINI_API_KEY=YOUR_GEMINI_KEY_HERE
```

**Demo login (Rescue Commander):**
```
ID:  ADMIN_01
PIN: SYNC_BRIDGE_2026
```

---

## 📋 Table of Contents

- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup & Installation](#setup--installation)
  - [1. One-Time CLI Tool Setup](#1-one-time-cli-tool-setup)
  - [2. Firebase Setup](#2-firebase-setup)
  - [3. Web Dashboard (Rescue Command Grid)](#3-web-dashboard-rescue-command-grid)
  - [4. Flutter Mobile App (Victim SOS Client)](#4-flutter-mobile-app-victim-sos-client)
  - [5. Cloud Functions](#5-cloud-functions)
- [Running the Project](#running-the-project)
- [CLI Reference](#cli-reference)
- [Environment Variables](#environment-variables)
- [Demo Credentials](#demo-credentials)
- [Tech Stack](#tech-stack)
- [SDG Alignment](#sdg-alignment)

---

## The Problem

In major urban disasters — floods, earthquakes, stampedes — the **cellular network is the first thing to fail**. Existing SOS apps are "dumb": they require a live 4G/5G connection to push data to the cloud. If the network is jammed or down, the SOS **never leaves the phone**.

---

## The Solution

Sync Bridge solves this with three core mechanisms:

| Mechanism | What it does |
|---|---|
| **Offline Triage** | Gemini AI (cloud) or a keyword fallback engine (offline) classifies every SOS by severity without requiring internet |
| **Packet Shredding** | High-priority incident data is compressed into 12-byte micro-packets that can squeeze through even a failing 2G signal |
| **Sync Bridge** | Google Cloud Pub/Sub + Firebase Firestore synchronises queued packets the instant any connection is briefly restored |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    VICTIM DEVICE (Flutter)                       │
│                                                                   │
│  SOS Input → Edge AI Triage → Packet Shredder → Offline Queue   │
│                                        ↓ (on connection)         │
│                              Firebase Firestore Direct Write     │
└─────────────────────────────────────────────────────────────────┘
                                  ↕ Real-time Sync
┌─────────────────────────────────────────────────────────────────┐
│               RESCUE COMMAND GRID (Web Dashboard)                │
│                                                                   │
│  Firestore Live Stream → Incident Cards → Team Dispatch          │
│  Heat Map (Google Maps) → Claim/Resolve Workflow                │
└─────────────────────────────────────────────────────────────────┘
                                  ↕
┌─────────────────────────────────────────────────────────────────┐
│              GOOGLE CLOUD BACKEND (Firebase Functions)           │
│                                                                   │
│  ingestPacket (HTTPS) → Cloud Pub/Sub → processEmergencyPacket  │
│                                        → Firestore Update        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
sync-bridge/
├── mobile-app/                  # Flutter native app (Victim SOS Client)
│   ├── lib/
│   │   ├── main.dart            # Entry point — Firebase init, EdgeAI pre-warm
│   │   ├── firebase_options.dart
│   │   ├── models/              # Incident, RescueTeam data models
│   │   ├── screens/
│   │   │   ├── auth/            # Mode selection + Tactical auth (rescue login)
│   │   │   ├── victim/          # Multi-step SOS submission flow
│   │   │   └── rescue/          # Command Grid dashboard
│   │   ├── services/
│   │   │   ├── edge_ai_service.dart      # Gemini API + keyword fallback
│   │   │   ├── firestore_service.dart    # Offline queue + Firestore sync
│   │   │   ├── device_location_service.dart
│   │   │   └── network_service.dart      # Signal strength + bridge mode
│   │   ├── utils/
│   │   │   └── packet_shredder.dart      # 12-byte micro-packet encoder
│   │   └── widgets/
│   │       └── tactical_container.dart
│   └── pubspec.yaml
│
├── src/                         # React web dashboard (alternative/companion)
│   ├── App.jsx
│   ├── components/
│   ├── services/
│   └── firebase.js
│
├── functions/                   # Firebase Cloud Functions
│   └── index.js                 # ingestPacket + processEmergencyPacket
│
├── .env                         # Firebase + Gemini API keys (see below)
├── package.json                 # Web dashboard dependencies (Vite + React)
├── vite.config.js
└── README.md
```

---

## Prerequisites

### Global Tools

| Tool | Minimum Version | Install |
|---|---|---|
| **Flutter SDK** | 3.0.0+ | [flutter.dev](https://flutter.dev/docs/get-started/install) |
| **Dart SDK** | 3.0.0+ | Bundled with Flutter |
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org) |
| **npm** | 9+ | Bundled with Node.js |
| **Firebase CLI** | Latest | `npm install -g firebase-tools` |
| **Git** | Any | [git-scm.com](https://git-scm.com) |

### Firebase Project Requirements

- Firebase project with **Firestore** enabled (Native mode)
- Firebase project connected to **Google Cloud** (for Pub/Sub)
- A **Gemini API key** from [Google AI Studio](https://aistudio.google.com/app/apikey)

---

## Setup & Installation

### 1. One-Time CLI Tool Setup

Run these **once** on a fresh machine:

```bash
# Install Node.js via nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.zshrc
nvm install 18 && nvm use 18
node -v   # v18.x.x
npm -v    # 9.x.x+

# Install Flutter (macOS via Homebrew)
brew install --cask flutter
flutter doctor   # fix anything flagged here

# Install Firebase CLI
npm install -g firebase-tools
firebase --version

# Install FlutterFire CLI (generates firebase_options.dart)
dart pub global activate flutterfire_cli
export PATH="$PATH:$HOME/.pub-cache/bin"   # add to ~/.zshrc to make permanent

# Install Google Cloud CLI (needed for Pub/Sub)
brew install --cask google-cloud-sdk
gcloud init
gcloud pubsub topics create emergency-packets
```

---

### 2. Firebase Setup

```bash
# Login and link the project (run from repo root)
firebase login
firebase use sync-bridge-f88c2

# Regenerate firebase_options.dart for Flutter
cd mobile-app
flutterfire configure --project=sync-bridge-f88c2
cd ..
```

Create a Firestore collection named `incidents` with the following security rules (for dev):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /incidents/{id} {
      allow read, write: if true; // Tighten for production
    }
  }
}
```

---

### 3. Web Dashboard (Rescue Command Grid)

```bash
# From the repo root
npm install

# Copy and fill in your keys
cp .env.example .env
# Open .env and fill in VITE_FIREBASE_* and VITE_GEMINI_API_KEY values

# Start the dev server
npm run dev
# → Opens at http://localhost:5173
```

---

### 4. Flutter Mobile App (Victim SOS Client)

```bash
cd mobile-app

# Install Flutter dependencies
flutter pub get

# Verify your environment
flutter doctor

# List available devices / emulators
flutter devices

# Run — Option A: Offline mode (no API key needed, uses keyword fallback)
flutter run

# Run — Option B: Full Gemini AI triage
flutter run --dart-define=GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE

# Run on a specific device
flutter run -d <device-id> --dart-define=GEMINI_API_KEY=YOUR_KEY

# Build a release APK (Android)
flutter build apk --dart-define=GEMINI_API_KEY=YOUR_KEY

# Build for iOS (requires Xcode on macOS)
flutter build ios --dart-define=GEMINI_API_KEY=YOUR_KEY
```

> **Note on `firebase_options.dart`:** This file is auto-generated by `flutterfire configure`. If it is missing or out of date, run:
> ```bash
> dart pub global activate flutterfire_cli
> flutterfire configure --project=sync-bridge-f88c2
> ```

#### Android-specific Setup

Add the following permissions to `mobile-app/android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.INTERNET" />
```

#### iOS-specific Setup

Add to `mobile-app/ios/Runner/Info.plist`:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Sync Bridge needs your location to send rescue coordinates.</string>
<key>NSLocationAlwaysUsageDescription</key>
<string>Sync Bridge needs your location for continuous rescue tracking.</string>
```

---

### 5. Cloud Functions

```bash
cd functions
npm install
cd ..

# Deploy to Firebase (Blaze plan required)
firebase deploy --only functions

# Or test locally with the emulator suite
firebase emulators:start --only functions,firestore
```

The deployed functions:
- **`ingestPacket`** — HTTPS endpoint that accepts shredded binary packets and publishes them to Cloud Pub/Sub (`emergency-packets` topic)
- **`processEmergencyPacket`** — Pub/Sub–triggered function that writes decoded incident data to Firestore

---

## Running the Project

### Full Stack (recommended for demo)

**Terminal 1 — Web Dashboard:**
```bash
npm run dev
```

**Terminal 2 — Flutter App:**
```bash
cd mobile-app
flutter run --dart-define=GEMINI_API_KEY=YOUR_KEY
```

### Offline-only mode (no API key needed)
```bash
cd mobile-app
flutter run
# EdgeAI automatically falls back to the built-in keyword triage engine
```

### Run Firebase emulators locally (no cloud needed)
```bash
firebase emulators:start --only functions,firestore
# Firestore UI → http://localhost:4000
```

### Build production bundles
```bash
# Web dashboard
npm run build
npm run preview   # preview the production build locally

# Flutter Android release APK
cd mobile-app
flutter build apk --dart-define=GEMINI_API_KEY=YOUR_KEY

# Flutter iOS release (macOS + Xcode required)
flutter build ios --dart-define=GEMINI_API_KEY=YOUR_KEY
```

---

## Environment Variables

Create a `.env` file in the **repo root** (for the web dashboard):

```env
# Firebase — Web SDK
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Gemini API
VITE_GEMINI_API_KEY=your_gemini_api_key
```

For the **Flutter app**, the Gemini key is passed at build time (never hardcoded):

```bash
flutter run --dart-define=GEMINI_API_KEY=your_gemini_api_key
```

> ⚠️ **Never commit real API keys to source control.** The `.env` file is listed in `.gitignore`.

---

## CLI Reference

### Global Tools — Install Once

```bash
npm install -g firebase-tools                  # Firebase CLI
dart pub global activate flutterfire_cli       # FlutterFire CLI
nvm install 18 && nvm use 18                   # Node.js 18 via nvm
brew install --cask flutter                    # Flutter SDK (macOS)
brew install --cask google-cloud-sdk           # gcloud CLI (macOS)
```

### Dependency Installation

```bash
npm install                                    # Web dashboard deps
cd functions && npm install && cd ..           # Cloud Functions deps
cd mobile-app && flutter pub get && cd ..      # Flutter deps
```

### Development

```bash
npm run dev                                    # Web dashboard  → :5173
cd mobile-app && flutter run                   # Flutter (offline mode)
cd mobile-app && flutter run --dart-define=GEMINI_API_KEY=KEY  # Flutter (AI mode)
firebase emulators:start                       # Full local Firebase stack
```

### Deployment

```bash
firebase deploy --only functions               # Deploy Cloud Functions
firebase deploy --only firestore:rules         # Deploy Firestore rules
npm run build                                  # Build web dashboard
flutter build apk --dart-define=GEMINI_API_KEY=KEY   # Android APK
flutter build ios --dart-define=GEMINI_API_KEY=KEY   # iOS (needs Xcode)
```

### Diagnostics

```bash
flutter doctor -v                              # Full Flutter environment check
flutter devices                                # List connected devices
firebase projects:list                         # Verify Firebase project link
gcloud pubsub topics list                      # Verify Pub/Sub topic exists
```

---

## Demo Credentials

The app auto-seeds 3 demo incidents into Firestore on each launch (safe — uses `merge: true`).

**Rescue Commander Login:**
```
ID:  ADMIN_01
PIN: SYNC_BRIDGE_2026
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Mobile App** | Flutter 3 (Dart) |
| **Edge AI — Primary** | Google Gemini 1.5 Flash (via `google_generative_ai`) |
| **Edge AI — Fallback** | Built-in keyword rule engine (100% offline) |
| **Backend** | Firebase Cloud Functions (Node.js) |
| **Message Queue** | Google Cloud Pub/Sub |
| **Database** | Firebase Firestore (real-time) |
| **Offline Persistence** | `shared_preferences` (local queue across restarts) |
| **Location** | `geolocator` |
| **Web Dashboard** | React 18 + Vite |
| **Maps** | `@react-google-maps/api` |

---

## SDG Alignment

| Goal | Contribution |
|---|---|
| **SDG 11** — Sustainable Cities & Communities | Provides resilient emergency communication infrastructure for urban disaster scenarios |
| **SDG 11.5** — Disaster Impact Reduction | Directly reduces disaster mortality by ensuring SOS signals reach rescue teams even when networks fail |
| **SDG 3** — Good Health & Well-Being | AI triage prioritises critical medical cases to get the right team deployed first |

---

## How the Offline Queue Works

```
Victim sends SOS
      │
      ▼
Packet Shredder → 12-byte micro-packet
      │
      ▼
Try direct Firestore write
      │
   Success? ──YES──▶ ✅ Synced to rescue dashboard
      │
      NO
      ▼
Add to Offline Queue (persisted to SharedPreferences)
      │
      ▼
Retry timer fires every 10 seconds
      │
   Network back? ──YES──▶ Flush queue → Firestore ✅
      │
      NO
      ▼
Queue persists across app restarts until delivery confirmed
```

---

## AI Triage Logic

The `EdgeAIService` uses a three-tier runtime cascade:

```
1. CLOUD_GEMINI_1.5   ← If GEMINI_API_KEY is set
        │ fails / no key
        ▼
2. OFFLINE_KEYWORD_FALLBACK  ← Built-in rule engine (always available)
        │ always runs in parallel
        ▼
3. TFLITE_V3_NATIVE  ← Simulated vision engine (structural/smoke/flood detection)
```

Outputs per classification:
- `severity` — `critical` | `urgent` | `standard`
- `triage_code` — `ALPHA` | `BRAVO` | `CHARLIE`
- `truth_score` — 0–100 confidence score
- `rec_responders` — Recommended team size
- `rec_team_type` — `MEDICAL_RESPONSE` | `HEAVY_RESCUE` | `FIRE_SUPPRESSION` | etc.
- `reasoning` — One-line human-readable explanation

---

*Built for Google Solution Challenge 2026 · Sync Bridge Team*
