import { createRelay } from "./server";

const relay = createRelay({ port: Number(process.env.PORT ?? 8787) });

void relay.listen();

process.on("SIGTERM", () => {
  void relay.close();
});
