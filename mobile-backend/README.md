# Mobile Backend - Embedded Python

Questo modulo contiene il backend Python embeddabile per le app mobile Android/iOS.

## Architettura

```
┌─────────────────────────────────────────────────────────────┐
│                    App Mobile                                │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │   React App     │───▶│  API Service (TypeScript)       │ │
│  │   (Capacitor)   │    │  - Rileva modalità online/offline│ │
│  └─────────────────┘    └─────────────────────────────────┘ │
│                                    │                         │
│           ┌────────────────────────┼────────────────────┐   │
│           ▼                        ▼                    │   │
│  ┌─────────────────┐    ┌─────────────────────────────┐ │   │
│  │ OFFLINE MODE    │    │ ONLINE MODE                 │ │   │
│  │ (Chaquopy)      │    │ (Remote Backend)            │ │   │
│  │                 │    │                             │ │   │
│  │ ✅ Flashcards   │    │ ✅ Flashcards               │ │   │
│  │ ✅ Progress     │    │ ✅ Progress                 │ │   │
│  │ ✅ Library      │    │ ✅ Library                  │ │   │
│  │ ✅ Grammar      │    │ ✅ Grammar + Validation     │ │   │
│  │ ❌ YouTube      │    │ ✅ YouTube Videos           │ │   │
│  │ ❌ AI Videos    │    │ ✅ AI Videos (Sora)         │ │   │
│  │ ❌ TTS          │    │ ✅ Text-to-Speech           │ │   │
│  └─────────────────┘    └─────────────────────────────┘ │   │
│           │                        │                    │   │
│           ▼                        ▼                    │   │
│  ┌─────────────────┐    ┌─────────────────────────────┐ │   │
│  │ SQLite (locale) │    │ Backend AWS/Server          │ │   │
│  └─────────────────┘    └─────────────────────────────┘ │   │
└─────────────────────────────────────────────────────────────┘
```

## File

- `embedded_backend.py` - Backend Python leggero per Chaquopy
- `requirements.txt` - Dipendenze (solo stdlib, nessuna esterna)

## Funzionalità Offline

| Feature | Disponibile | Note |
|---------|-------------|------|
| Flashcards | ✅ | Database SQLite locale |
| Progress tracking | ✅ | Salvataggio locale |
| Words Library | ✅ | Filtri e ricerca |
| Grammar sentences | ✅ | Dati statici |
| Grammar validation | ❌ | Richiede LLM |
| YouTube videos | ❌ | Richiede API |
| AI videos | ❌ | Richiede OpenAI |
| Text-to-speech | ❌ | Richiede OpenAI |

## Integrazione Chaquopy (Android)

### 1. Aggiungere Chaquopy al progetto

In `android/app/build.gradle`:

```gradle
plugins {
    id 'com.chaquo.python' version '15.0.1'
}

android {
    defaultConfig {
        python {
            version "3.11"
        }
    }
}

chaquopy {
    defaultConfig {
        pip {
            // Nessuna dipendenza esterna necessaria
        }
    }
    sourceSets {
        main {
            srcDir "src/main/python"
        }
    }
}
```

### 2. Copiare il backend

```bash
cp mobile-backend/embedded_backend.py frontend/android/app/src/main/python/
```

### 3. Chiamare da Kotlin/Java

```kotlin
import com.chaquo.python.Python
import com.chaquo.python.android.AndroidPlatform

class EmbeddedBackendBridge {
    private val python = Python.getInstance()
    private val backend = python.getModule("embedded_backend")
    
    fun handleRequest(method: String, path: String, body: String? = null): String {
        return backend.callAttr("handle_request", method, path, body).toString()
    }
}
```

## Test Locale

```bash
cd mobile-backend
python embedded_backend.py
```

## Build Scripts

- `scripts/package_native.sh android --run --offline` - Build con backend embedded
- `scripts/package_native.sh android --run --online` - Build con backend remoto
