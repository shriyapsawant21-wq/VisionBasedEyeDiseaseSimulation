# controller-app

Doctor-facing client that connects to the [relay](../relay) as the `CONTROLLER`
role, pairs with a running Simulation (Unity) device, and drives it via the
commands in `CONTROLLER_ONLY_TYPES` (see `relay/src/protocol.ts`).

`src/connector.ts` is the reusable `RelayConnector` client. It imports its
message shapes directly from `relay/src/protocol.ts` so the two packages
never drift out of sync.

## Setup

```bash
cd controller-app
npm install
```

## Usage

```bash
RELAY_URL=ws://localhost:8787 SESSION_ID=AB12CD PAIRING_TOKEN=<token> npm run dev
```

`SESSION_ID` and `PAIRING_TOKEN` come from whatever the Simulation device
displays (QR code / on-screen code) after it connects to the relay.

## Note on the build output

`src/connector.ts` imports directly from `../relay/src/protocol.ts` (no npm
workspaces are set up yet), so `tsc` treats the repo root as the common
source root and nests output under `dist/controller-app/src/`. `npm run dev`
(tsx) is unaffected — this only matters for `npm run build` / `npm start`.

## Scripts

- `npm run dev` — run with hot-reload
- `npm run build` — compile to `dist/`
- `npm start` — run the compiled build
- `npm test` — run the test suite
- `npm run typecheck` — type-check without emitting
