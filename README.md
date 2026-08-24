# VisionBridge VR — Medical Eye Disease Simulation

A full-stack networked VR platform for real-time visualization and education of eye disease progression. Doctors control simulations on a mobile app; patients experience effects in a VR headset. A relay server synchronizes both devices in real-time.

**Platforms:** iOS/Android (controller) • Android VR (headset) • Node.js (relay)  
**Status:** Production-ready with 90+ passing tests

---

## Quick Start

### For Doctors (Mobile Controller)
1. Install on iOS or Android
2. Open app → tap "Connect / Pair"
3. Scan QR code from headset, or enter 6-char code
4. Select disease → tap Play to run 30-second progression
5. Adjust severity slider in real-time

### For Patients (VR Headset)
1. Put on Cardboard headset
2. See pairing code on screen
3. Doctor scans it on mobile app
4. Confirm pairing → experience real-time disease progression

### For Developers
```bash
# Clone the repo
git clone https://github.com/Vani-06/VisionBasedEyeDiseaseSim.git
cd VisionBasedEyeDiseaseSim

# Start relay server
cd relay && npm install && npm run dev

# Start mobile controller (Expo)
cd ../controller-app && npm install && npm run dev

# Build & deploy VR headset (Unity)
cd ../unity-vr
# Open in Unity 2023 LTS, configure Android build, deploy to device
```

For detailed setup and architecture, see the [development guide](https://github.com/Vani-06/VisionBasedEyeDiseaseSim/blob/dev2/README.md).

---

## Features

### Disease Progressions (30-second educational timelines)
- **RP (Retinitis Pigmentosa)** — peripheral dimming → pinhole tunnel vision
- **RRD (Rhegmatogenous Retinal Detachment)** — floaters → Weiss ring → flashes → curtain shadow → blackout
- **CSCR (Central Serous Chorioretinopathy)** — faint distortion → metamorphopsia → dense scotoma
- **DR/DME (Diabetic Retinopathy/Macular Edema)** — central blur → red floaters → flashes → vision loss
- **CNVM (Choroidal Neovascular Membrane)** — blur → scotoma formation → metamorphopsia border

### Individual Symptoms (Manual severity slider)
- Central Blur, Central Scotoma, Metamorphopsia (distortion)
- Tunnel Vision, Curtain Sign
- Floaters: Weiss ring, black dots, ghost worms, red floaters
- Photopsia (flashes), blood streaks

### Real-Time Sync
- Controller sliders → headset updates <20ms
- Headset feedback (STATE_UPDATED) → controller mirrors state
- Scene switching (Garden/Hospital) → seamless environment swap
- Pause/resume mid-progression for detailed examination

---

## Architecture

```
Mobile Controller          Relay Server (Node.js)         VR Headset (Unity)
    (React Native)     <-- WebSocket Protocol -->     (Google Cardboard)
  • QR Scanner         • Session Management          • Disease Effects
  • Severity Sliders   • Rate Limiting               • Timeline Playback
  • 30s Timelines      • Role Gating                 • Shader Rendering
  • Connection Status  • UDP Discovery              • Head Tracking
```

**Protocol:** ZOD-validated JSON over WebSocket with role-gated commands (controller-only: SET_DISEASE, SET_SEVERITY, START_DISEASE_SIMULATION, etc.)

**Handshake:** HELLO → SESSION_CREATED → PAIR_REQUEST → PAIR_ACCEPT → PAIRED (requires doctor + patient confirmation)

---

## Technology Stack

| Component | Stack |
|-----------|-------|
| **Relay** | Node.js 20+, TypeScript, Zod validation, WebSocket (ws), UDP discovery |
| **Controller** | React Native, Expo 57, React Navigation, React 19, TypeScript |
| **Headset** | Unity 2023 LTS, Google Cardboard XR Plugin, C# |
| **Protocol** | Custom JSON schema, auto-validated across platforms |
| **Testing** | vitest (relay: 90 tests), React Testing Library (controller: 13 integration tests) |
| **CI/CD** | GitHub Actions (lint, typecheck, schema-validation, test, build) |

---

## Key Achievements

✅ **End-to-end networked sync** across three platforms (relay, mobile, VR)  
✅ **Real-time disease effects** with shader-based rendering (Metamorphopsia, Central Blur, Tunnel Vision, Floaters)  
✅ **Cryptographic discovery** (RSA-SHA256 signed UDP) for dynamic relay detection on DHCP networks  
✅ **90+ passing tests** with protocol validation on every build  
✅ **Graceful shutdown** with END_SESSION broadcast (Unity resets to normal vision, not frozen)  
✅ **Rate limiting & heartbeat** to prevent abuse and idle timeouts  
✅ **Cumulative disease progressions** where effects layer realistically (not just swap)  
✅ **Clinical accuracy** (5 progressions reviewed by domain experts)

---

## Use Cases

### Medical Education
- Train ophthalmologists on disease recognition and progression
- Understand patient experience before & after treatment

### Patient Education
- Show patients what they might experience
- Prepare for lifestyle changes

### Research & Clinical Trials
- Consistent visual stimulus across subjects
- Real-time measurement of patient response

---

## Deployment

### Local Demo (Recommended)
Relay runs on laptop's LAN IP (`ws://192.168.1.X:8787`), reachable from phone & headset on same WiFi. No internet required.

### Production
Use containerized relay (Dockerfile included) on Azure Container Apps, Fly.io, or Render. Relay must run as a single always-on instance (rooms live in memory).

---

## Documentation

- **[Development Guide](https://github.com/Vani-06/VisionBasedEyeDiseaseSim/blob/dev2/README.md)** (dev2 branch) — Full setup, architecture details, protocol spec, known issues, troubleshooting
- **[Protocol Reference](https://github.com/Vani-06/VisionBasedEyeDiseaseSim/blob/dev2/shared/protocol/commands.md)** — Complete message types, error codes, examples

---

## Team

Developed by the VisionBridge team.

---

## License

MIT

---

## Support

For issues, bugs, or feature requests, [open an issue on GitHub](https://github.com/Vani-06/VisionBasedEyeDiseaseSim/issues).

**Status:** This is a mature prototype ready for clinical testing and research deployment.
