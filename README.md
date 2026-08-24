# VisionBridge VR — Medical Eye Disease Simulation

A full-stack networked VR platform for real-time visualization and education of eye disease progression. Doctors control the simulation on a mobile app; patients experience the effects in a VR headset. The relay server orchestrates real-time synchronization between both devices.

**Status:** Near-production (90+ tests passing, pairing & effects verified, known issues documented below)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Mobile Controller                         │
│              (React Native + Expo, TypeScript)              │
│  • QR pairing scanner + manual code entry                   │
│  • Severity sliders (Symptoms tab)                          │
│  • Disease progression 30s auto-play (Diseases tab)         │
│  • Real-time connection status & reconnect flow             │
└────────────────┬──────────────────────────────────────────────┘
                 │ WebSocket (ws:// or wss://)
                 │ protocol: HELLO → PAIR_REQUEST/ACCEPT → PAIRED
                 │ commands: SET_DISEASE, SET_SEVERITY, START_DISEASE_SIMULATION
                 │
┌────────────────▼──────────────────────────────────────────────┐
│                    Relay Server                               │
│              (Node.js + TypeScript, Zod validation)          │
│  • Room/session management with TTL expiry                   │
│  • ZOD-validated protocol (13 message types)                 │
│  • Rate limiting (20 msg/sec) & heartbeat (PING every 20s)   │
│  • UDP discovery (RSA-SHA256 signed) for dynamic relay find   │
│  • Graceful shutdown with END_SESSION broadcast              │
│  • Role-gating (CONTROLLER_ONLY, SIMULATION_ONLY commands)   │
└────────────────┬──────────────────────────────────────────────┘
                 │ WebSocket (ws:// or wss://)
                 │ forward all commands, relay STATE_UPDATED
                 │
┌────────────────▼──────────────────────────────────────────────┐
│                  VR Headset (Unity)                           │
│     (Google Cardboard XR, C#, custom shader effects)         │
│  • Pairing flow: QR display + manual code + confirmation     │
│  • 4 disease effects (Metamorphopsia, Central Blur,          │
│    Tunnel Vision, Floaters) as HLSL shaders                  │
│  • 5 disease progressions (30s each, cumulative effects)     │
│  • Command handler (RelayCommandBridge) auto-installs        │
│  • STATE_UPDATED echo of current simulation state            │
└─────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. **Relay Server** (`relay/`)
WebSocket server managing pairing, session lifecycle, and command routing.

**Key files:**
- `src/protocol.ts` — Zod schemas for all 13 message types (source of truth)
- `src/server.ts` — HTTP+WS server, room management, rate limiting
- `src/rooms.ts` — Session/room registry with TTL expiry
- `src/discovery.ts` — UDP discovery with cryptographic verification
- `shared/protocol/` — Generated JSON schema, examples, docs

**Setup:**
```bash
cd relay
npm install
cp .env.example .env          # fill in PORT, DISCOVERY_PRIVATE_KEY_PATH
npm run dev                    # hot-reload on port 8787
npm test                       # 90/90 tests
npm run schema:check           # verify controller/Unity mirror the protocol
npm run discovery:key          # generate relay identity (first time only)
npm run endpoint               # print ws:// URL for teammates
```

**Demo checklist:**
- ✅ `npm test` passes
- ✅ `npm run schema:check` clean
- ✅ `.discovery-private-key.pem` exists (if using UDP discovery)
- ✅ Network: laptop's LAN IP reachable from phone/headset (same WiFi)
- ⚠️ If discovery fails, manually set relay URL on phone

---

### 2. **Mobile Controller** (`controller-app/`)
React Native app for doctors: pairing, disease selection, severity control, progression viewing.

**Key screens:**
- **Splash/Disclaimer/DepartmentSelect** — onboarding flow
- **Pairing** — QR scanner (expo-camera) + manual 6-char code entry + relay URL field
- **Dashboard (Disease tab)** — 5 disease program cards + Background (Garden/Hospital) toggle + Adjust View (recenter)
- **DiseaseProgression** — 30s auto-play timeline with play/pause/reset controls, stage visualization
- **SymptomListScreen (Symptoms tab)** — individual effects with severity slider (old slider-based controls, fully working)
- **DiseaseControl** — manual severity/comparison for individual symptoms
- **ConnectionLost** — reconnect prompt if session drops

**Setup:**
```bash
cd controller-app
npm install
npm run dev                    # Expo dev server (scan QR to run on device/emulator)
npx tsc --noEmit               # type-check
npm test                       # 13 integration tests against live relay
```

**Testing:**
```bash
# Requires relay running (npm run dev from relay/)
npm test

# Manual: scan pairing QR from headset, tap disease, adjust severity, watch headset update
```

**Known issue:** Default relay URL on Android is `10.0.2.2:8787` (emulator host alias). On physical device, must scan QR or enter IP manually.

---

### 3. **VR Headset (Unity)** (`unity-vr/`)
Cardboard VR app displaying disease effects in real-time.

**Key scenes:**
- **Bootstrap.unity** — creates RelaySession singleton (persists across scenes)
- **Pairing.unity** — QR code display (701-line custom encoder), manual code, confirmation prompt
- **Garden.unity** — main simulation scene (~1500 GameObjects, outdoor environment)
- **Hospital.unity** — identical rig, different background

**Key scripts:**
- `Networking/RelaySession.cs` — WebSocket lifecycle, HELLO/PAIR_REQUEST/PAIR_ACCEPT handshake, heartbeat
- `Networking/RelayCommandBridge.cs` — auto-installing command handler; subscribes to all 8 relay commands
- `DiseaseEffects/VisionEffectManager.cs` — applies effects based on disease + severity; runs 30s disease timelines
- `DiseaseEffects/{Metamorphopsia,CentralBlur,TunnelVision,Floaters}Effect.cs` — shader-based rendering
- `UI/VisionDebugControls.cs` — keyboard shortcuts (1-5 for disease programs, 0 reset, arrows for severity)

**Setup:**
```bash
cd unity-vr

# Open in Unity 2023 LTS (6000.0+) with XR Plugin Management
# Assign Google Cardboard v1.34 plugin (already in Assets/)
# Both Garden and Hospital scenes must be in Build Settings > Scene List

# Build & run on Android device (minimum Android 7.0)
# Or test in Editor with DesktopMouseLook + keyboard controls
```

**In-headset controls:**
- **Tab key** (or screen tap) — toggle Garden ↔ Hospital
- **1-5 keys** — start RP/RRD/CSCR/DR_DME/CNVM progression
- **0 key** — reset to normal vision
- **↑/↓ arrows** — adjust severity (debug only)
- **S key** — Central Scotoma
- **F key** — Flashes
- **C key** — Curtain
- **B key** — Blood Streak

---

## Running the Full Stack Locally

### Prerequisites
- **Relay:** Node.js 20+, npm
- **Controller:** iOS 15+, Android 7+, or iOS/Android simulator (Xcode/Android Studio)
- **Headset:** Unity 2023 LTS, Android 7+ device with Cardboard viewer

### Step 1: Start Relay
```bash
cd relay
npm install
npm run dev
```
You should see:
```
{"ts":1692547200000,"event":"relay_listening","port":8787}
{"ts":1692547200000,"event":"discovery_listening","port":8788}
```

### Step 2: Get Relay URL
```bash
npm run endpoint
```
Prints: `ws://192.168.1.100:8787` (your laptop's LAN IP)

### Step 3: Start Controller
```bash
cd controller-app
npm install
npm run dev
```
Scan QR with phone, or open `http://localhost:19000` in browser to load Expo Go.

### Step 4: Build & Deploy Headset
```bash
cd unity-vr
# Open in Unity Editor
# File > Build Settings:
#   - Scenes: Bootstrap, Pairing, Garden, Hospital (in order)
#   - Platform: Android
#   - Cardboard XR Plugin enabled
# Build > Build and Run (or Build APK to side-load)
```

### Step 5: Pair
1. **Headset:** Pairing scene appears, displays QR code + 6-char session ID
2. **Controller:** Tap "Connect / Pair" → scan QR or enter code + relay URL
3. **Headset:** Pairing confirmation prompt appears
4. **Headset:** Accept → loads Garden scene
5. **Controller:** "Paired" status shows, dashboard appears

### Step 6: Test
**Controller (Disease tab):**
- Tap "RP" → headset shows tunnel vision, controller shows 30s progression timeline
- Tap Play → both devices start 30s synchronized run
- Tap Pause → both hold at current stage

**Controller (Symptoms tab):**
- Tap any symptom → opens control screen with severity slider
- Move slider → headset updates in real-time

**Background toggle:**
- Tap Garden/Hospital on controller → headset switches scene
- Controller shows current scene in dashboard

---

## Protocol Overview

All messages are JSON with envelope:
```json
{
  "v": 1,                    // protocol version
  "seq": 42,                 // message sequence number
  "timestamp": 1692547200,   // unix millis
  "type": "SET_DISEASE",     // message type
  "payload": {               // type-specific
    "disease": "METAMORPHOPSIA"
  }
}
```

**Handshake:**
```
Controller                          Relay                          Headset
   |                                  |                               |
   +---- HELLO(CONTROLLER) ---------->|                               |
   |                                  +--- HELLO(SIMULATION) -------->|
   |                                  |                               |
   |                    <SESSION_CREATED (sessionId, token, expiresAt)--
   |                                                                   |
   |   (display QR with sessionId + token)                            |
   |                                                                   |
   +---- PAIR_REQUEST(sessionId, token) -----+                        |
   |                                          +--- PAIR_REQUEST ------>|
   |                                          |                       |
   |                                          |<---- PAIR_ACCEPT ----+
   |                                          +---- PAIRED ---------->|
   |<------- PAIRED (sessionId) ----+                                |
   |                                |                                 |
   (paired, send commands now)      (paired, relay commands now)     (paired, listen for commands)
```

**Core commands (controller → headset via relay):**
- `SET_DISEASE` — choose which effect to show
- `SET_SEVERITY` — adjust intensity (0.0–1.0)
- `SET_COMPARISON` — toggle "Normal vision" vs. "Affected"
- `START_DISEASE_SIMULATION` — begin 30s auto-play program
- `PAUSE_PROGRESSION` — hold/resume timeline
- `SET_SCENE` — switch Garden ↔ Hospital
- `RECENTER` — reset headset "forward" direction
- `RESET` — clear all effects, return to normal

**Headset response (auto-sent by bridge):**
- `STATE_UPDATED` — echo of current disease/severity/comparison/scene (so controller stays in sync if headset local controls are used)

**Relay-generated:**
- `ERROR` — rejected command (rate limit, validation, role gate, expired session, etc.)
- `END_SESSION` — peer disconnected or relay shutting down

Full spec in `shared/protocol/commands.md`.

---

## Known Issues & Workarounds

### Critical Demo Issues
1. **Screen tap toggles scene** (VisionDebugControls.cs:33)
   - Cardboard trigger = screen tap → flips Garden/Hospital
   - Workaround: disable `toggleSceneOnScreenTap` in inspector or code
   - Fix: set to `false` before building APK

2. **Relay discovery disabled if `.discovery-private-key.pem` missing**
   - Symptom: relay logs `discovery_disabled`
   - Fallback: hardcoded `ws://192.168.1.100:8787` (may be DHCP-stale)
   - Workaround: manually edit relay URL on pairing screen
   - Fix: `npm run discovery:key` from relay/ (rebuilds APK afterwards to embed public key)

3. **automatedSimulationActive flag never clears after disease program finishes**
   - Symptom: severity slider dead after playing any disease
   - Workaround: select new disease or press Reset to restore slider
   - Fix: add `automatedSimulationActive = false;` at line 158 of VisionEffectManager.cs

4. **Scene toggle not reflected on controller dashboard**
   - Symptom: controller shows Garden even after switching to Hospital
   - Root cause: no STATE_UPDATED sent when disease is None
   - Workaround: select any disease before switching scenes
   - Fix: allow STATE_UPDATED when disease is None, or send dummy disease

### Medium Priority
5. **No reconnect on socket loss** — must re-pair from scratch (by design for demo simplicity)
6. **Socket orphaning on rapid reconnects** — unlikely in practice, low impact
7. **Manual pairing requires knowing 32-char token** — token never displayed; QR scan workaround
8. **Rate limiter is fixed-window** — ~2× configured limit possible at boundary (20 msg/sec realistic cap ~40)

### Low Priority
9. **RelayCommandBridge loops on every frame** until VisionEffectManager found (small GC hit during Bootstrap/Pairing)
10. **PairingScreen recomputes countdown every Update** (string allocation churn)
11. **findBySocket() in rooms.ts is dead code** (safe to remove)

---

## Testing

### Relay Tests
```bash
cd relay
npm test
```
**90 tests** across:
- Rooms & session management (TTL, pairing flow)
- Validation (schema compliance, role gates)
- Examples (16 valid, 11 rejection cases auto-validated)
- Integration (end-to-end pairing, command forwarding, graceful shutdown)

### Controller Integration Tests
```bash
cd controller-app
npm test
```
**13 tests** against live relay:
- Pairing handshake
- Command sending (SET_DISEASE, SET_SEVERITY, etc.)
- STATE_UPDATED reception
- Connection loss recovery

### Manual E2E
1. Start relay (`relay/npm run dev`)
2. Start controller (`controller-app/npm run dev`)
3. Build & deploy headset (Unity)
4. Scan QR or enter code → pair
5. **Dashboard:** Tap disease card → headset effect updates + controller shows progression timeline
6. **Progression:** Tap Play → both devices run 30s synchronized timeline
7. **Slider (Symptoms tab):** Move severity → headset updates in real-time
8. **Scene toggle:** Tap Garden/Hospital → headset switches

---

## Architecture Decisions

### Why WebSocket + JSON?
- Real-time bidirectional sync (not request/response)
- Platform-agnostic (Node/browser/Unity all support it)
- Human-readable for debugging
- Zod validation catches schema drift at runtime

### Why Relay Server?
- Decouples mobile app from headset (both can be offline, reconnect separately)
- Single source of truth for session state
- Rate limiting & heartbeat prevent abuse & idle expiry
- Role gates prevent controller from spoofing headset state

### Why 30-Second Timelines?
- Clinical accuracy: disease progression happens over months/years IRL
- 30s is enough for education without fatigue
- Both devices run independent timers (minimal sync overhead)

### Why Cumulative Effects?
- Diseases don't replace symptoms; they layer them
- E.g., RRD: start with floaters → add ring → add flashes → add curtain
- Teaches realistic progression, not isolated symptoms

---

## Deployment

### Local Demo (Recommended for Hackathon)
Relay runs on laptop's LAN IP (`ws://192.168.1.X:8787`), reachable from phone/headset on same WiFi. No internet required.

**Checklist:**
- [ ] Laptop and phone/headset on same WiFi
- [ ] Relay running: `npm run dev` from relay/
- [ ] `npm run endpoint` prints correct LAN IP
- [ ] Controller pairing screen editable (manual URL entry)
- [ ] `.discovery-private-key.pem` exists if using discovery
- [ ] Headset APK built with current laptop IP (or editable via discovery)

### Hosted Deployment
**Requirements:**
- Relay must run as **exactly one always-on instance** (no scaling, no autoscaling)
- Rooms live in process memory → relay restart = everyone re-pairs
- Use `Dockerfile` + `fly.toml` for hosting (Fly.io, Azure Container Apps, Render)

**Hosting options:**
- **Fly.io** — `fly deploy` from relay/
- **Azure Container Apps** — push image, set `webSocketsEnabled: true`
- **Render** — buildpack + environment variables

**Note:** Deployed URL must be hardcoded into mobile/headset builds (no discovery on HTTPS).

---

## Contributing

1. **Relay protocol changes** route through relay owner (`relay/src/protocol.ts` is source of truth)
2. **Schema regeneration** auto-validated in CI: `npm run schema:check` must pass
3. **All changes** require: lint (`eslint`), typecheck (`tsc`), tests (`vitest` or integration tests)
4. **New disease effects** added to Unity, then register in VisionEffectManager + relay DiseaseEnum

---

## Troubleshooting

### Pairing fails with "session_not_found"
- **Cause:** QR code expired (>2 min old) or headset session doesn't exist
- **Fix:** Tap "New code" on headset pairing screen, scan again

### Pairing fails with "invalid_token"
- **Cause:** Token mismatch (corrupted QR, wrong manual entry)
- **Fix:** Rescan QR or re-enter 6-char code carefully

### Pairing succeeds but commands don't work
- **Cause 1:** Relay URL wrong (headset connected to different relay than controller)
- **Cause 2:** Rate limited (spinning slider sends >20 msg/sec)
- **Fix:** Check `STATUS_UPDATED` arrives on controller (confirms link works)

### Headset shows "Could not connect"
- **Cause:** Relay URL unreachable (firewall, wrong IP, laptop offline)
- **Fix:** Ping relay: `curl http://<relay-ip>:8787/health`

### Severity slider frozen after disease program
- **Cause:** `automatedSimulationActive` flag bug (issue #3 above)
- **Fix:** Select new disease or press Reset in DiseaseControl

### Scene doesn't toggle on controller
- **Cause:** STATE_UPDATED not sent (disease is None), controller shows stale scene
- **Fix:** Select any disease first, then switch scenes

---

## License

[Add your license here, e.g., MIT, Apache 2.0]

---

## Team

- **Relay & Backend:** [Your name]
- **Mobile Controller:** [Team member]
- **VR Headset & Effects:** [Team member]

---

## References

- [WebSocket Protocol (RFC 6455)](https://tools.ietf.org/html/rfc6455)
- [Zod TypeScript validation](https://zod.dev)
- [React Navigation](https://reactnavigation.org)
- [Unity XR Plugin Management](https://docs.unity3d.com/Manual/XRManagementConceptDocs.html)
- [Google Cardboard SDK](https://developers.google.com/cardboard/develop/unity)
- `shared/protocol/commands.md` — full protocol reference
