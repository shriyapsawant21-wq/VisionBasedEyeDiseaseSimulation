import { createRelay } from "./server";
import { startDiscovery } from "./discovery";
import type { Socket } from "node:dgram";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const port = Number(process.env.PORT ?? 8787);
const log = (event: string, fields: Record<string, unknown>) =>
  console.log(JSON.stringify({ ts: Date.now(), event, ...fields }));
const relay = createRelay({ port, logger: log });
let discovery: Socket | null = null;

void relay.listen().then(() => {
  const keyPath = resolve(process.env.DISCOVERY_PRIVATE_KEY_PATH ?? ".discovery-private-key.pem");
  try {
    discovery = startDiscovery(port, readFileSync(keyPath, "utf8"), log);
  } catch (error) {
    log("discovery_disabled", {
      message: error instanceof Error ? error.message : "could not load discovery private key",
    });
  }
}).catch((error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.log(`VisionBridge relay is already running on port ${port}. Use the existing window.`);
    process.exit(0);
  }
  console.error(error);
  process.exit(1);
});

// Give connected devices an END_SESSION before the process goes away, so a
// restart or redeploy leaves Unity showing normal vision rather than a frozen
// affected view. Rooms are in-memory, so both devices must re-pair afterwards.
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, () => {
    discovery?.close();
    void relay.shutdown().then(() => process.exit(0));
  });
}
