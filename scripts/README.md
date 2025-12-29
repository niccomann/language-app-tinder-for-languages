# Native App Build Scripts

Script per convertire l'app React **Tinder for Languages** in app native iOS/Android usando **Capacitor**.

**Verificato funzionante: 25 Dicembre 2025**

## Quick Start

```bash
# Dalla root del progetto
./scripts/package_native.sh ios --run    # Builda e avvia su simulatore iPhone
./scripts/package_native.sh android --run # Builda e avvia su emulatore Android
```

## Prerequisiti

### iOS
- **Xcode** (da App Store)
- **CocoaPods**: `brew install cocoapods`
- **iOS Simulator Runtime**: scaricato automaticamente dallo script

### Android
- **Android Studio**: `brew install --cask android-studio`
- **Java 17**: `brew install openjdk@17`
- **Emulatore**: creato tramite Android Studio > Tools > Device Manager

### Configurazione una tantum

```bash
# iOS: xcode-select
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer

# Android: adb reverse (per connessione al backend locale)
# Lo script lo fa automaticamente, ma se serve manualmente:
~/Library/Android/sdk/platform-tools/adb reverse tcp:8500 tcp:8500
```

## Comandi

### Da terminale (consigliato)
```bash
# iOS
./scripts/package_native.sh ios          # Solo build e sync
./scripts/package_native.sh ios --run    # Build + avvia su simulatore

# Android  
./scripts/package_native.sh android      # Solo build e sync
./scripts/package_native.sh android --run # Build + avvia su emulatore

# Entrambi
./scripts/package_native.sh both         # Build e sync entrambi
```

### Da npm (dalla cartella frontend/)
```bash
cd frontend
npm run native:ios       # Build iOS
npm run native:android   # Build Android
```

## Cosa fa lo script

1. Installa dipendenze Capacitor (con `--legacy-peer-deps` per react-simple-maps)
2. Builda l'app web (`npm run build`)
3. Crea/aggiorna progetto nativo (`npx cap add ios/android`)
4. Sincronizza assets (`npx cap sync ios/android`)
5. Con `--run`: avvia simulatore e installa app

## Comandi verificati funzionanti

```bash
# Installazione dipendenze (richiede --legacy-peer-deps)
npm install @capacitor/core@^6 --save --legacy-peer-deps
npm install @capacitor/cli@^6 --save-dev --legacy-peer-deps
npm install @capacitor/ios@^6 --save-dev --legacy-peer-deps

# Sync e run iOS
npx cap sync ios
npx cap run ios --target <SIMULATOR_UUID>

# Gestione simulatore
xcrun simctl list devices available
xcrun simctl boot "iPhone 16"
open -a Simulator

# Download runtime iOS (se mancante)
xcodebuild -downloadPlatform iOS
```

## Struttura progetto

```
tinder-for-languages/
├── frontend/
│   ├── ios/                    # Progetto Xcode (generato)
│   ├── android/                # Progetto Android Studio (generato)
│   ├── dist/                   # Build web
│   └── capacitor.config.ts     # Config Capacitor
├── scripts/
│   ├── package_native.sh       # Script principale
│   ├── make_artifacts.sh       # Crea APK/IPA
│   └── README.md
└── artifacts/                  # APK/IPA generati
```

## Configurazione App

- **App ID**: `it.nicco.tinderforlanguages`
- **Nome**: "Tinder for Languages"
- **Web Dir**: `dist`

## Troubleshooting

### "xcodebuild requires Xcode"
```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

### "No iOS simulators found"
Lo script scarica automaticamente il runtime iOS. Se fallisce:
1. Apri Xcode > Settings > Platforms
2. Clicca + e scarica iOS 18.x

### Errore npm con dipendenze
Usa sempre `--legacy-peer-deps` (lo script lo fa automaticamente)

### Errore firma iOS
In Xcode: App > Signing & Capabilities > seleziona il tuo Team

### Android: No emulators found
1. Apri Android Studio
2. Tools > Device Manager
3. Create Device > seleziona un telefono (es. Pixel 8)
4. Scarica un System Image (es. API 34)
5. Finish

### Android Studio MCP (opzionale)
Per usare Gemini AI con MCP in Android Studio:
1. File > Settings > Tools > Gemini > MCP Servers
2. Abilita "Enable MCP Servers"
3. Aggiungi configurazione (es. GitHub, Figma, etc.)

Vedi: https://developer.android.com/studio/gemini/add-mcp-server
