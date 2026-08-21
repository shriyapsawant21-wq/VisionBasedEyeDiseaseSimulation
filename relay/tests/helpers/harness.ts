import { WebSocket } from "ws";
import { createRelay, type Relay, type RelayOptions } from "../../src/server";
import { PROTOCOL_VERSION } from "../../src/protocol";

export interface LogLine {
  event: string;
  fields: Record<string, unknown>;
}

export interface Harness {
  relay: Relay;
  url: string;
  port: number;
  logs: LogLine[];
  /** Every raw frame the relay sent to any client, for leak assertions. */
  outbound: string[];
  connect(): Promise<FakeClient>;
  closeAll(): Promise<void>;
}

/**
 * Boots a real relay on an ephemeral port. Every knob is tightened so tests
 * finish in milliseconds rather than minutes.
 */
export async function startHarness(options: RelayOptions = {}): Promise<Harness> {
  const logs: LogLine[] = [];
  const outbound: string[] = [];
  const clients: FakeClient[] = [];

  const relay = createRelay({
    port: 0,
    heartbeatIntervalMs: 60_000, // effectively off unless a test overrides
    sweepIntervalMs: 20,
    ...options,
    logger: (event, fields) => logs.push({ event, fields }),
  });

  const port = await relay.listen();

  return {
    relay,
    port,
    url: `ws://127.0.0.1:${port}`,
    logs,
    outbound,
    async connect() {
      const client = await FakeClient.open(`ws://127.0.0.1:${port}`, outbound);
      clients.push(client);
      return client;
    },
    async closeAll() {
      for (const client of clients) client.close();
      await relay.close();
    },
  };
}

let nextSeq = 1;

/** A scriptable stand-in for the Unity app or the doctor controller. */
export class FakeClient {
  private inbox: any[] = [];
  private waiters: Array<{ match: (m: any) => boolean; resolve: (m: any) => void }> = [];
  /** Every message this client received, in order. */
  readonly received: any[] = [];
  closedWith: { code: number; reason: string } | null = null;

  private constructor(
    private readonly socket: WebSocket,
    private readonly outbound: string[],
  ) {}

  static open(url: string, outbound: string[]): Promise<FakeClient> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(url);
      const client = new FakeClient(socket, outbound);

      socket.on("message", (data) => {
        const raw = data.toString();
        outbound.push(raw);
        const message = JSON.parse(raw);
        client.received.push(message);

        const index = client.waiters.findIndex((w) => w.match(message));
        if (index >= 0) {
          const [waiter] = client.waiters.splice(index, 1);
          waiter.resolve(message);
        } else {
          client.inbox.push(message);
        }
      });

      socket.on("close", (code, reason) => {
        client.closedWith = { code, reason: reason.toString() };
      });

      socket.once("open", () => resolve(client));
      socket.once("error", reject);
    });
  }

  send(type: string, payload: unknown = {}): this {
    this.socket.send(JSON.stringify({ v: PROTOCOL_VERSION, type, seq: nextSeq++, timestamp: Date.now(), payload }));
    return this;
  }

  /** Bypasses the envelope entirely, for malformed-input tests. */
  sendRaw(raw: string): this {
    this.socket.send(raw);
    return this;
  }

  /** Resolves with the next message of the given type (checking already-buffered ones first). */
  waitFor(type: string, timeoutMs = 1500): Promise<any> {
    return this.waitWhere((m) => m.type === type, `type ${type}`, timeoutMs);
  }

  /** Resolves with the next ERROR carrying the given code. */
  waitForError(code: string, timeoutMs = 1500): Promise<any> {
    return this.waitWhere(
      (m) => m.type === "ERROR" && m.payload?.code === code,
      `ERROR(${code})`,
      timeoutMs,
    );
  }

  private waitWhere(match: (m: any) => boolean, label: string, timeoutMs: number): Promise<any> {
    const buffered = this.inbox.findIndex(match);
    if (buffered >= 0) {
      const [message] = this.inbox.splice(buffered, 1);
      return Promise.resolve(message);
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const seen = this.received.map((m) => m.type).join(", ") || "nothing";
        reject(new Error(`timed out waiting for ${label}; received: [${seen}]`));
      }, timeoutMs);
      this.waiters.push({
        match,
        resolve: (m) => {
          clearTimeout(timer);
          resolve(m);
        },
      });
    });
  }

  /** Asserts nothing arrives within the window. Used to prove a message was NOT forwarded. */
  async expectSilence(ms = 150): Promise<void> {
    const before = this.received.length;
    await sleep(ms);
    if (this.received.length !== before) {
      const extra = this.received.slice(before).map((m) => m.type);
      throw new Error(`expected silence but received: [${extra.join(", ")}]`);
    }
  }

  waitForClose(timeoutMs = 1500): Promise<{ code: number; reason: string }> {
    if (this.closedWith) return Promise.resolve(this.closedWith);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("timed out waiting for close")), timeoutMs);
      this.socket.once("close", (code, reason) => {
        clearTimeout(timer);
        resolve({ code, reason: reason.toString() });
      });
    });
  }

  close(): void {
    if (this.socket.readyState === WebSocket.OPEN) this.socket.close();
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Runs the full happy-path handshake and returns both ends, already paired. */
export async function pairedPair(harness: Harness) {
  const sim = await harness.connect();
  sim.send("HELLO", { role: "SIMULATION" });
  const created = await sim.waitFor("SESSION_CREATED");
  const { sessionId, pairingToken } = created.payload;

  const controller = await harness.connect();
  controller.send("HELLO", { role: "CONTROLLER" });
  controller.send("PAIR_REQUEST", { sessionId, pairingToken });

  await sim.waitFor("PAIR_REQUEST");
  sim.send("PAIR_ACCEPT", { accepted: true });

  await sim.waitFor("PAIRED");
  await controller.waitFor("PAIRED");

  return { sim, controller, sessionId, pairingToken };
}
