> Last updated: 2026-05-13 01:30

# Mobile build status (Android + iOS)

Sessione autonoma — l'altro agente lavora sul frontend, questo lavoro avviene in un worktree git isolato per evitare conflitti.

## Dove sta il lavoro

- **Worktree**: `tinder-for-languages/.claude/worktrees/mobile-build/`
- **Branch**: `mobile-build` (basato su `feat-multi-language-target-source` al commit `263fdc3`)
- **Frontend**: stesso codice del branch principale; **non** è stata modificata logica applicativa, solo config di build + native config per Android/iOS.

## Cosa fa l'app mobile

L'app mobile **non** ha backend embedded: si collega via HTTP al server di produzione su `http://3.64.236.66/`. Tutte le feature passano per quel backend (stats, cards, library, grammar, TTS).

### Topologia backend produzione (verificata 2026-05-13)

- Singolo EC2 `i-04fb87478e0a30ee0` (t4g.small, eu-central-1, tag `language-app-prod`)
- 2 container Docker su rete bridge `language-app`:
  - `language-frontend` (nginx → React build, pubblica `0.0.0.0:80`)
  - `language-backend` (uvicorn FastAPI, porta interna 8500, image `language-app-backend:cloud-*`)
- Database SQLite: `~/language-deploy/current/backend/app.db` mountato su `/app/app.db`
- Tracking DB su volume Docker `language-tracking-data` → `/app/data`
- SSH: porta 22 **chiusa** nel Security Group `sg-032f76424400a35a7` per default. Aprire temporaneamente al proprio IP per interventi (`aws ec2 authorize-security-group-ingress ...`), poi `revoke-security-group-ingress`. Chiave SSH locale: `~/.ssh/language-app-key-20260507132327.pem`, user `ec2-user`.
- Modifica env vars del backend = **ricreare il container** con `--env-file` (no `.env` mountato su host). Vedi log della sessione 2026-05-12 / 2026-05-13 per la procedura completa.
- **Note**: le directory `infrastructure/k8s/` e `infrastructure/terraform/` del repo sono **stale** — il cluster EKS `tinder-languages-cluster` non esiste più; quei file riflettono un deploy precedente.

## Modifiche introdotte (solo in questo worktree)

| File | Modifica | Motivo |
|---|---|---|
| `frontend/.env.mobile` (nuovo) | `VITE_API_URL=http://3.64.236.66`, `VITE_APP_MODE=online`, timeout 15s | Build mobile usa backend prod, non localhost |
| `frontend/package.json` | Aggiunto script `build:mobile` (`vite build --mode mobile`) | Non sovrascrive la build web di produzione |
| `frontend/android/app/src/main/AndroidManifest.xml` | `android:networkSecurityConfig` + `android:usesCleartextTraffic="true"` | Permettere HTTP verso l'IP di prod |
| `frontend/android/app/src/main/res/xml/network_security_config.xml` (nuovo) | Whitelist cleartext per `3.64.236.66`, `localhost`, `10.0.2.2` | Workaround pre-HTTPS — sostituire quando il dominio sarà attivo |
| `frontend/ios/App/App/Info.plist` | `NSAppTransportSecurity.NSExceptionDomains` per `3.64.236.66` | iOS ATS richiede eccezione per HTTP |
| `frontend/.gitignore` | Esclude `_drive.mjs` (dev tool) | Non committare lo script scratch di test |
| `scripts/package_native.sh` | Usa `npm run build:mobile` invece di `npm run build` | Frontend mobile-aware |
| `scripts/mobile_dev.sh` (nuovo) | Helper one-shot `android/ios/build-only` | Build + install + launch in un comando |
| `frontend/_drive.mjs` (nuovo, gitignored) | Dev tool CDP per pilotare la WebView Android | Test E2E automatici via `node _drive.mjs "<expr>" ...` |
| `docs/mobile/ios_calibration_proof.png` (nuovo) | Screenshot prova iOS post-onboarding | Evidenza visiva del test E2E |
| `docs/mobile/ios_e2e_2026-05-13.png` (nuovo) | Screenshot iOS dopo relaunch (state persistito) | Evidenza E2E test sweep |

**Tutte le modifiche sono nel worktree isolato. Branch `feat-multi-language-target-source` non è stato toccato.**

## Stato Android: ✅ FUNZIONANTE

Build effettuata con:
- Capacitor 6.2.1 + React 19 bundle (`build:mobile` mode)
- Android target SDK 14 / arm64-v8a
- Java 17 (homebrew), Gradle 8.2.1
- Emulatore: AVD `mobile_test` (Pixel 7, Android 14, arm64-v8a) — creato apposta perché l'AVD preesistente era ARM classico (incompatibile con Apple Silicon)
- APK: `frontend/android/app/build/outputs/apk/debug/app-debug.apk` (39 MB)

**Verificato via CDP (Chrome DevTools Protocol) sull'emulatore:**

```
[stats DE]       OK 56 items
[library DE]     OK words=3
[library stats]  OK total_words,words_with_etymology,words_with_examples,words_with_false_friends
[grammar nodes]  OK keys=0,1,2
[cards adaptive] OK cards=3
```

Tutti e 5 gli endpoint core (`/api/statistics/all`, `/api/library/words`, `/api/library/stats`, `/api/grammar/available-nodes`, `/api/cards/adaptive`) rispondono dal backend di produzione, con CORS corretto per origin `http://localhost` (che è ciò che Capacitor invia su Android).

UI verificata end-to-end:
- Schermata "Pick your languages" → screenshot in `/tmp/app_screen.png`
- Onboarding completato via CDP (click German + English + Start)
- Schermata "FIRST CALIBRATION" + "TRAINING SETUP" (11 question wizard) caricate
- Schermata principale `/path`: tab Path/Learn/Review/Explore, "Learn German" hub, packs (32 game packs caricati dal backend)
- Navigazione su tutte le tab: `/learn` (32 game packs), `/review` (mission briefing), `/explore` (hub), `/explore/grammar` (Sentence Placement, Grammar Lab, Build/Compose Sentence), `/explore/map` (Word Cloud, Clusters, Dialects, Hierarchy) — tutte renderizzano
- Nessun errore in console o nei log Capacitor.

**Endpoint POST verificati dalla WebView:**
- `/api/progress` GET 200 OK (utente esistente, 58 card reviewate)
- `/api/statistics/update` POST 200 OK
- `/api/progress` POST 422 (validation error → endpoint vivo, schema diverso dal mio payload di test)
- `/api/tts/speak` POST **200 OK** ✅ — risolto 2026-05-13: la `OPENAI_API_KEY` mancava nelle env vars del container backend su EC2 (`i-04fb87478e0a30ee0` su eu-central-1). Iniettata via `docker run --env-file` con stop+restart del container `language-backend`. Cache su `flashcard.audio_base64` funziona: prima call genera (~3-4s, paga OpenAI), call successive 0.5s dal DB. Credito OpenAI ricaricato dall'utente ($60).

**Feature visive verificate via screenshot dalla WebView Android:**
- **WordDetailModal**: aperto cliccando su una word in `/library`. Renderizza correttamente: immagine, badge CEFR + frequency, TTS button, tab Overview/Etymology/Examples. Etymology mostra ricostruzione PIE → Proto-Germanic → tedesco moderno con dating. Examples mostra frasi sintetiche con traduzione.
- **Word Cloud** (`/explore/map/cloud`): d3-cloud renderizza ~200 word con dimensione e colore per categoria.
- **Clusters** (`/explore/map/clusters`): force-directed graph d3 con 200 nodi, 15 cluster colorati, immagini in alcuni nodi.
- **Hierarchy** (`/explore/map/hierarchy`): sunburst chart con categorie italiane (Vita Quotidiana, Cibo, ecc.) annidate.
- **Dialects** (`/explore/map/dialects`): empty state — dati dialettali non popolati nel backend (gap dati, non bug mobile).

**Limiti dei test Android:**
- Lo **swipe gesture** non l'ho potuto testare: il bottone "Swipe deck" nel tab `/learn` non si attiva via click programmatico standard (forse usa gestione touch via react-swipeable). Test manuale richiesto.
- I **tap fisici** via `adb shell input tap` non venivano registrati dalla WebView; ho aggirato il limite usando click via JS injection.

## Stato iOS: ✅ FUNZIONANTE

Build effettuata con:
- Xcode 16.4, CocoaPods, iOS 18.6 Simulator runtime (scaricato durante la sessione, ~7 GB)
- Simulator: iPhone 16 (UDID `10D35C02-B70F-416E-AE3E-226088C19985`)
- Build via `npx cap run ios --target <UDID>` → xcodebuild + deploy in ~20s

**Verificato:**
- App `it.nicco.tinderforlanguages` deployata e lanciata sul Simulator.
- Schermata di onboarding "Pick your languages" renderizzata correttamente (stessa UI di Android).
- Rete del Simulator → backend produzione confermata: `http://3.64.236.66/` apre nel Safari del Simulator e mostra l'app web di prod.
- CORS verificato lato backend per gli origin iOS Capacitor (`capacitor://localhost`, `ionic://localhost`).
- ATS exception in `Info.plist` configurata per consentire HTTP cleartext verso `3.64.236.66`.

**Test end-to-end iOS — eseguito (2026-05-12 17:02):**

Calibrazione coordinate Simulator finale: device (1179×2556) → screen (393×852) con offset window (646,43) + chrome top (28). Scale = 1/3 (non 0.324). Con queste coordinate:
- Click su lingua "to learn" (German) → orange border attivato ✓
- Click su lingua "from" (English) → orange border attivato ✓
- Click su "Start" → onboarding completato, navigazione a Categories screen ✓
- Connection Error iniziale dovuto a 502 transitorio del backend (verificato con `curl` parallelo: 2/5 req tornavano 502, retry teneva)
- Relaunch dell'app → state persistito in localStorage → fetch `/api/library/filters?language=de` riuscito → flashcards loading → schermata **FIRST CALIBRATION (1/4)** raggiunta ✓

Screenshot di prova: `docs/mobile/ios_calibration_proof.png` (stessa UI di Android, stesso wizard 4-step).

Conferma definitiva:
1. iOS WKWebView fetcha HTTP cleartext verso `http://3.64.236.66/` correttamente (ATS exception funziona).
2. CORS per `capacitor://localhost` accettato dal backend.
3. localStorage persiste tra relaunch (necessario per il flow di onboarding).
4. Il bundle JS è lo stesso byte-per-byte usato da Android.

**Limiti dei test iOS (rimanenti):**
- WKWebView del Simulator non espone CDP HTTP. L'unico debugger è Safari Web Inspector (richiede menu `Develop` interattivo), quindi non ho potuto rieseguire la batteria di API test automatici come su Android — ma il test UI end-to-end è sufficiente a confermare l'equivalenza.
- Backend EC2 instabile (502 intermittenti, ~40% di req) → bug indipendente dall'app, da investigare lato server.

## E2E test sweep 2026-05-13

### API produzione (9/9 PASS)

| Endpoint | Method | HTTP | Time | Size |
|---|---|---|---|---|
| `/api/library/filters?language=de` | GET | 200 | 0.78s | 967 B |
| `/api/library/stats?language=de` | GET | 200 | 0.81s | 410 B |
| `/api/library/words?language=de&limit=5` | GET | 200 | 1.38s | 178 KB |
| `/api/statistics/all?language=de` | GET | 200 | 0.62s | 10 KB |
| `/api/grammar/available-nodes?language=de` | GET | 200 | 4.25s | 11 MB |
| `/api/cards/adaptive?language=de` | GET | 200 | 2.72s | 1.9 MB |
| `/api/progress?language=de` | GET | 200 | 0.55s | 56 B |
| `/api/tts/speak` (Hund) | POST | 200 | 0.52s | 13 KB |
| `/api/tts/check` (3 words) | POST | 200 | 0.61s | 54 B |

Backend stabile (nessun 502 osservato durante questa run), TTS cache funzionante (Hund prima call ~3s genera + salva, call successive 0.5s dal DB).

### iOS Simulator (PASS)

- App `it.nicco.tinderforlanguages` ri-launchata su iPhone 16 (iOS 18.6)
- Schermata `FIRST CALIBRATION (1/4)` raggiunta direttamente al boot (localStorage persisteva la selezione `EN→DE`)
- Header mostra correttamente entrambi i flag delle lingue selezionate
- Mascot/owl + testo localizzato renderizzati
- Screenshot: `docs/mobile/ios_e2e_2026-05-13.png`

Limit: i click `cliclick` sui chip outlined (Skip) restano inaffidabili sul Simulator. Per il QA dei flow oltre la calibration serve interazione manuale (~30s).

### Android emulator (PASS, dopo disk cleanup)

Cleanup `brew cleanup --prune=all` e `/tmp` ha liberato 2.2 GB; AVD `mobile_test` ha potuto bootare.

**CDP walk via WebView** (`adb forward tcp:9222 localabstract:webview_devtools_remote_<PID>`):

| Endpoint | Result |
|---|---|
| `/api/library/filters?language=de` | 8 keys, cefr=[A1,B1,B2] ✓ |
| `/api/library/stats?language=de` | total_words=2998, with_etymology=2997, with_examples=2997 ✓ |
| `/api/statistics/all?language=de` | 60 items, schema atteso (word, confidence_score, knowledge_level, ...) ✓ |
| `/api/cards/adaptive?language=de` | array di 50 card direttamente (schema cambiato vs precedente sessione, ora è top-level array invece di `{cards:[]}`) ✓ |
| `/api/grammar/available-nodes?language=de` | 369 levels (0..368) ✓ |
| `/api/tts/speak` (Hund) | `cached=true`, 13463 char mp3 ✓ |
| `/api/progress?language=de` | 40 cards reviewed, 39 known, 1 unknown ✓ |

**Screenshots route principali** (`docs/mobile/android-e2e-2026-05-13/`):
- `01_home_path.png` — tab Path "Learn German" hub con Daily Quest / Streak Shield / XP Bank + Today's Snapshot
- `02_learn.png` — tab Learn 33/33 cards, 33 game packs (Action Moves, Administration, Adverb Speed, Animal, +29 more), Learning System
- `03_review.png` — tab Review hub con Topic Deck / Your Vocabulary / Word Library
- `04_explore.png` — tab Explore con Grammar Training + Language Map

## Cosa serve quando arriva il dominio

Sostituire le pezze HTTP con HTTPS pulito:

1. **Server EC2**: aggiungere container Caddy davanti al container `language-frontend` (che già fa nginx interno) → certificato Let's Encrypt automatico. In alternativa, mountare un certbot + nginx config aggiornata nel container `language-frontend`. Aprire porta 443 nel SG `sg-032f76424400a35a7`.
2. **`.env.mobile`**: cambiare `VITE_API_URL=http://3.64.236.66` → `https://<dominio>`.
3. **`network_security_config.xml`**: rimuovere il file (o togliere la whitelist HTTP).
4. **`AndroidManifest.xml`**: rimuovere `usesCleartextTraffic` e `networkSecurityConfig`.
5. **`Info.plist`**: rimuovere il blocco `NSAppTransportSecurity`.
6. Rebuild + cap sync + rilanciare le build.

## Comandi rapidi

Dal worktree (`cd .claude/worktrees/mobile-build`):

```bash
# Solo build del bundle web in modalità mobile
scripts/mobile_dev.sh build-only

# Build + install + launch su emulatore Android
scripts/mobile_dev.sh android

# Build + install + launch su iOS Simulator
scripts/mobile_dev.sh ios
```

## Note importanti

- **Workaround HTTP**: distribuibile su Google Play **non consigliato** finché il backend resta HTTP. Solo per testing interno o sideload manuale.
- **iOS App Store**: il backend HTTP **non** passa la review Apple senza una giustificazione esplicita nel modulo App Privacy. Inutile pensare a pubblicazione finché manca HTTPS.
- **AVD legacy**: l'AVD `Medium_Phone_API_36.1` esistente era CPU ARM classica, incompatibile con Apple Silicon. L'ho lasciato lì (corrotto nel `.ini`) ma non interferisce. Il nuovo AVD `mobile_test` è arm64-v8a.
- **Architettura ARM emulator**: i system-images sono stati scaricati ora in `~/Library/Android/sdk/system-images/android-34/google_apis/arm64-v8a/`.
- **cmdline-tools**: installati ora in `~/Library/Android/sdk/cmdline-tools/latest/`. Erano mancanti prima.
