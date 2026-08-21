import { createRelay } from "./server";

const relay = createRelay({ port: Number(process.env.PORT ?? 8787) });

void relay.listen();

// Give connected devices an END_SESSION before the process goes away, so a
// restart or redeploy leaves Unity showing normal vision rather than a frozen
// affected view. Rooms are in-memory, so both devices must re-pair afterwards.
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, () => {
    void relay.shutdown().then(() => process.exit(0));
  });
}
