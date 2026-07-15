import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for Siya Dental Care Android APK
 *
 * Build steps:
 *   1. npm install -D @capacitor/cli @capacitor/core @capacitor/android
 *   2. npm run build           # builds the Next.js static export
 *   3. npx cap add android     # one-time, scaffolds android/ folder
 *   4. npx cap sync android    # copies built assets into Android project
 *   5. npx cap open android    # opens Android Studio for APK signing
 *
 * For unsigned debug APK from CLI:
 *   cd android && ./gradlew assembleDebug
 *   APK will be at android/app/build/outputs/apk/debug/app-debug.apk
 *
 * For signed release APK:
 *   1. Generate keystore (one time): keytool -genkey -v -keystore siya-release.keystore -alias siya -keyalg RSA -keysize 2048 -validity 10000
 *   2. cp siya-release.keystore android/app/
 *   3. Edit android/app/build.gradle to add signingConfigs block (see FINAL_HANDOFF.md)
 *   4. cd android && ./gradlew assembleRelease
 */

const config: CapacitorConfig = {
  appId: 'in.siyadental.app',
  appName: 'Siya Dental Care',
  webDir: 'out',               // placeholder — app loads the server URL below
  server: {
    // Staff mobile app = WebView onto the clinic server's /m shell
    // (Appointments · Lab · Patients only). The app needs the live API, so
    // server-URL mode is correct — no static export.
    // ⚠ CHANGE THIS to your clinic server's LAN IP / domain before building:
    url: 'http://192.168.1.100:3000/m',
    cleartext: true,           // allow plain http on LAN; use https + remove for a public domain
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#0E7C7B',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,    // set true for dev builds
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0E7C7B',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    Camera: {
      // ml_kit not required — using simple webview camera API
    },
  },
};

export default config;
