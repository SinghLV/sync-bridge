# 🚀 Sync Bridge: Final Hackathon Checklist

This document outlines the final steps to transition the Sync Bridge from a "code complete" state to a fully functional, demo-ready application.

## 🧠 Backend & AI Tasks (Your Tasks)

You are responsible for wiring up the intelligence and cloud infrastructure.

### 1. Integrate Gemini API Keys
The system is currently using placeholders for the Hybrid AI handover. You need to provide real API keys from Google AI Studio.

*   [ ] **Mobile App:** Rename `mobile-app/.env.example` to `mobile-app/.env` and paste your key there (`GEMINI_API_KEY=...`).
*   [ ] **Web App:** Rename `sync-bridge/.env.example` to `sync-bridge/.env` and paste your key there (`VITE_GEMINI_API_KEY=...`).

> Note: The code is now configured to automatically read from these `.env` files. Ensure you do not commit the actual `.env` files to GitHub (they should be added to your `.gitignore`).


### 3. Prepare TFLite Models (Optional for Demo)
The current Edge AI service *simulates* the TFLite categorization (Medical, Structural, etc.). If you want to go the extra mile for the judges:

*   [x] Procure or train simple `.tflite` models for hazard detection.
*   [x] Place them in `mobile-app/assets/models/`.
*   [x] Uncomment the `Tflite.loadModel()` block in `mobile-app/lib/services/edge_ai_service.dart`.


---

## 📱 Flutter Tasks (Divit's Tasks)

Divit is responsible for getting the native app building and running on a physical device.

### 1. Initialize Platform Folders
The current `mobile-app` directory contains the Dart code but is missing the native Android/iOS shells.

*   [ ] Open a terminal, navigate into the `mobile-app` directory.
*   [ ] Run `flutter create .` to generate the `android`, `ios`, `macos`, and `web` directories.

### 2. Create and Configure Firebase
You are the owner of the Firebase project. You will need to set it up for both the Mobile app and hand off the Web keys to the backend lead.

*   [ ] Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
*   [ ] Create a **Firestore Database** (Start in Test Mode for the hackathon).
*   [ ] **Mobile Setup:** Run `flutterfire configure` inside the `mobile-app` directory and select your new project. This automatically links the Flutter app. Update `main.dart` with: `await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);`
*   [ ] **Web Setup:** In the Firebase console, add a "Web App" to the project. Copy the resulting config values (API Key, Project ID, etc.) and send them to your backend lead so they can put them in the Web App's `.env` file.

### 3. Add Android Permissions
The `SyncManager` relies on detecting network bars (Connectivity) to trigger the Adaptive Serialization (Ultra-Light vs Nominal mode).

*   [ ] Open `mobile-app/android/app/src/main/AndroidManifest.xml`.
*   [ ] Add the following permissions above the `<application>` tag:
    ```xml
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    ```

### 4. Build and Test
*   [ ] Run `flutter pub get` to install all dependencies (HTTP, Provider, Connectivity, Firestore).
*   [ ] Deploy the app to a **Physical Android Device**.
*   [ ] **Test the Network Sensing:** Turn off WiFi and switch to cellular, or put the phone in airplane mode to watch the `SyncManager` automatically switch the UI to "OFFLINE_MESH" or "LOW_BW_MODE".
## 🔑 API Keys & AI Setup (Lakshay's Final Check)
To ensure the Edge AI (Mobile) and the Truth Anchor (Web) function correctly during the demo, ensure the Gemini API key is configured in both places:

*   [ ] **Web App (Truth Anchor):** Ensure `VITE_GEMINI_API_KEY=your_key_here` is in the `sync-bridge/.env` file.
*   [ ] **Mobile App (Edge AI Fallback):** Ensure `GEMINI_API_KEY=your_key_here` is in the `sync-bridge/mobile-app/.env` file. (I have created this file for you, just paste the key inside it).
