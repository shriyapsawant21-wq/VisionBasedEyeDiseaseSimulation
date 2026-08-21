# controller-app

Doctor-facing mobile app (Expo / React Native, Android + iOS) that connects
to the [relay](../relay) as the `CONTROLLER` role, pairs with a running
Simulation (Unity) device, and drives it via the commands in
`CONTROLLER_ONLY_TYPES` (see `relay/src/protocol.ts`).

`src/connector.ts` is the reusable `RelayConnector` client. It imports its
message shapes directly from `relay/src/protocol.ts` so the two packages
never drift out of sync — `metro.config.js` adds the repo root to Metro's
`watchFolders` so that cross-folder import resolves at bundle time, and
`tsconfig.json` includes it for type-checking.

## Setup

```bash
cd controller-app
npm install
```

## Usage

```bash
npm start
```

Then open in Expo Go on a device, an emulator, or `npm run web` for a
browser preview. Pairing (scanning the code shown on the Simulation
device) and the actual control screens are still being built out — see
the implementation plan for phase status.

## Scripts

- `npm start` — start the Expo dev server
- `npm run android` / `npm run ios` / `npm run web` — start targeting a specific platform
- `npm test` — run the connector's unit tests (vitest)
- `npm run typecheck` — type-check without emitting
