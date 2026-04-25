#!/bin/bash

# SYNC BRIDGE — ANDROID BUILD SCRIPT
# Run this script if you have the Flutter SDK installed to generate a standalone APK.

echo "🚀 Starting Standalone Android Build..."

cd mobile-app

# 1. Clean and get dependencies
flutter clean
flutter pub get

# 2. Build Release APK
echo "📦 Compiling Native ARM-V8 Binary..."
flutter build apk --release --split-per-abi

echo "✅ DONE! Your standalone app is located at:"
echo "mobile-app/build/app/outputs/flutter-apk/app-release.apk"
