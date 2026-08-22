import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRelay, type Relay } from "../../relay/src/server";
import { RelayConnector, type ControllerState } from "../src/connector";

/**
 * End-to-end tests across the real relay and the real controller connector.
 *
 * connector.test.ts stubs the socket, so it proves the connector emits
 * well-formed frames but never that the relay accepts them. These tests run
 * the actual relay on an ephemeral port and stand in for Unity with a plain
 * WebSocket, so a protocol drift between the two halves fails here.
 *
 * Node 18+ ships a WHATWG WebSocket global, which is the same API React
 * Native gives connector.ts in the app - no stubbing needed.
 */

/**
 * Passes the schema's length rule (>= 16 chars) but will not match any real
 * room token, so the relay gets far enough to compare it and answer
 * invalid_token instead of rejecting the envelope outright.
 */
const WRONG_BUT_WELL_FORMED_TOKEN = "x".repeat(32);

/** Minimal stand-in for the Unity headset app. */
class FakeSimulation {
  private socket: WebSocket;
  readonly received: any[] = [];
  private waiters: Array<{ match: (m: any) => boolean; resolve: (m: any) => void }> = [];
  sessionId = "";
  pairingToken = "";
  private seq = 0;

  private constructor(socket: WebSocket) {
    this.socket = socket;
    socket.onmessage = (event) => {
      const message = JSON.parse(String(event.data));
      this.received.push(message);
      const index = this.waiters.findIndex((w) => w.match(message));
      if (index >= 0) this.waiters.splice(index, 1)[0].resolve(message);
    };
  }

  static async open(url: string): Promise<FakeSimulation> {
    const socket = new WebSocket(url);
    const sim = new FakeSimulation(socket);
    await new Promise<void>((resolve, reject) => {
      socket.onopen = () => resolve();
      socket.onerror = () => reject(new Error("simulation socket failed to open"));
    });
    return sim;
  }

  send(type: string, payload: Record<string, unknown>): void {
    this.socket.send(
      JSON.stringify({ v: 1, type, seq: this.seq++, timestamp: Date.now(), payload }),
    );
  }

  waitFor(type: string, timeoutMs = 2000): Promise<any> {
    const buffered = this.received.find((m) => m.type === type);
    if (buffered) return Promise.resolve(buffered);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const seen = this.received.map((m) => m.type).join(", ") || "nothing";
        reject(new Error(`simulation timed out waiting for ${type}; received: [${seen}]`));
      }, timeoutMs);
      this.waiters.push({
        match: (m) => m.type === type,
        resolve: (m) => {
          clearTimeout(timer);
          resolve(m);
        },
      });
    });
  }

  /** Proves a message was NOT forwarded, e.g. when a role gate should block it. */
  async expectNo(type: string, ms = 200): Promise<void> {
    await new Promise((r) => setTimeout(r, ms));
    const hit = this.received.find((m) => m.type === type);
    expect(hit, `expected the relay not to forward ${type}`).toBeUndefined();
  }

  close(): void {
    this.socket.close();
  }
}

/** Collects the callbacks the app's context normally wires up. */
function trackConnector(url: string) {
  const events = {
    paired: [] as string[],
    states: [] as ControllerState[],
    errors: [] as Array<{ code: string; message: string }>,
    sessionEnded: 0,
    closed: [] as Array<{ code: number; reason: string }>,
  };
  const connector = new RelayConnector(url, {
    onPaired: (sessionId) => events.paired.push(sessionId),
    onStateUpdated: (state) => events.states.push(state),
    onProtocolError: (code, message) => events.errors.push({ code, message }),
    onSessionEnded: () => (events.sessionEnded += 1),
    onClose: (code, reason) => events.closed.push({ code, reason }),
  });
  return { connector, events };
}

function waitUntil(predicate: () => boolean, label: string, timeoutMs = 2000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (predicate()) return resolve();
      if (Date.now() - start > timeoutMs) return reject(new Error(`timed out waiting for ${label}`));
      setTimeout(tick, 10);
    };
    tick();
  });
}

let relay: Relay;
let url: string;
const openConnectors: RelayConnector[] = [];
const openSims: FakeSimulation[] = [];

/** Full happy-path handshake, returning both ends already paired. */
async function pairedPair() {
  const sim = await FakeSimulation.open(url);
  openSims.push(sim);
  sim.send("HELLO", { role: "SIMULATION" });
  const created = await sim.waitFor("SESSION_CREATED");
  sim.sessionId = created.payload.sessionId;
  sim.pairingToken = created.payload.pairingToken;

  const { connector, events } = trackConnector(url);
  openConnectors.push(connector);
  connector.connect();
  await new Promise((r) => setTimeout(r, 50)); // let HELLO land
  connector.pairRequest(sim.sessionId, sim.pairingToken);

  await sim.waitFor("PAIR_REQUEST");
  sim.send("PAIR_ACCEPT", { accepted: true });

  await sim.waitFor("PAIRED");
  await waitUntil(() => events.paired.length === 1, "controller PAIRED");

  return { sim, connector, events };
}

beforeEach(async () => {
  relay = createRelay({ port: 0, logger: () => {} });
  const port = await relay.listen();
  url = `ws://127.0.0.1:${port}`;
});

afterEach(async () => {
  for (const c of openConnectors) c.close();
  for (const s of openSims) s.close();
  openConnectors.length = 0;
  openSims.length = 0;
  await relay.close();
});

describe("relay <-> controller handshake", () => {
  it("completes the full pairing handshake", async () => {
    const { sim, events } = await pairedPair();
    expect(events.paired).toEqual([sim.sessionId]);
    expect(events.errors).toEqual([]);
  });

  it("surfaces a bad pairing token as a protocol error, not a crash", async () => {
    const sim = await FakeSimulation.open(url);
    openSims.push(sim);
    sim.send("HELLO", { role: "SIMULATION" });
    const created = await sim.waitFor("SESSION_CREATED");

    const { connector, events } = trackConnector(url);
    openConnectors.push(connector);
    connector.connect();
    await new Promise((r) => setTimeout(r, 50));
    connector.pairRequest(created.payload.sessionId, WRONG_BUT_WELL_FORMED_TOKEN);

    await waitUntil(() => events.errors.length > 0, "invalid_token error");
    expect(events.errors[0].code).toBe("invalid_token");
  });

  it("rejects an unknown session code", async () => {
    const { connector, events } = trackConnector(url);
    openConnectors.push(connector);
    connector.connect();
    await new Promise((r) => setTimeout(r, 50));
    connector.pairRequest("ZZZZZZ", WRONG_BUT_WELL_FORMED_TOKEN);

    await waitUntil(() => events.errors.length > 0, "session_not_found error");
    expect(events.errors[0].code).toBe("session_not_found");
  });

  it("reports a too-short token as a raw schema error", async () => {
    // The schema requires pairingToken >= 16 chars, so a half-typed token
    // never reaches the token comparison and surfaces as invalid_message
    // rather than invalid_token. PairingScreen shows this text verbatim.
    const { connector, events } = trackConnector(url);
    openConnectors.push(connector);
    connector.connect();
    await new Promise((r) => setTimeout(r, 50));
    connector.pairRequest("ZZZZZZ", "abc123");

    await waitUntil(() => events.errors.length > 0, "invalid_message error");
    expect(events.errors[0].code).toBe("invalid_message");
    expect(events.errors[0].message).toMatch(/pairingToken/);
  });
});

describe("controller commands reach the simulation", () => {
  it("relays SET_DISEASE for every disease in the shared enum", async () => {
    const { sim, connector } = await pairedPair();
    // deliberately includes RETINAL_DETACHMENT: the relay and controller both
    // carry it, so this locks in that the wire accepts all four.
    for (const disease of ["METAMORPHOPSIA", "CENTRAL_BLUR", "TUNNEL_VISION", "RETINAL_DETACHMENT"] as const) {
      connector.setDisease(disease);
      const relayed = await sim.waitFor("SET_DISEASE");
      expect(relayed.payload.disease).toBe(disease);
      sim.received.length = 0; // clear so the next waitFor sees a fresh frame
    }
  });

  it("relays severity, comparison, recenter and reset", async () => {
    const { sim, connector } = await pairedPair();

    connector.setSeverity(0.65);
    expect((await sim.waitFor("SET_SEVERITY")).payload.severity).toBeCloseTo(0.65);

    connector.setComparison("AFFECTED");
    expect((await sim.waitFor("SET_COMPARISON")).payload.comparison).toBe("AFFECTED");

    connector.setScene("HOSPITAL");
    expect((await sim.waitFor("SET_SCENE")).payload.scene).toBe("HOSPITAL");

    connector.recenter();
    await sim.waitFor("RECENTER");

    connector.reset();
    await sim.waitFor("RESET");
  });

  it("relays a normal progression start and pause", async () => {
    const { sim, connector } = await pairedPair();
    connector.startProgression(300);
    expect((await sim.waitFor("START_PROGRESSION")).payload.durationSeconds).toBe(300);

    connector.pauseProgression();
    expect((await sim.waitFor("PAUSE_PROGRESSION")).payload.paused).toBe(true);
  });

  it("relays a scripted disease program, its pause and its resume", async () => {
    const { sim, connector } = await pairedPair();
    const ofType = (type: string) => sim.received.filter((m) => m.type === type);

    connector.startDiseaseSimulation("RRD", 30);
    const started = await sim.waitFor("START_DISEASE_SIMULATION");
    expect(started.payload.program).toBe("RRD");
    expect(started.payload.durationSeconds).toBe(30);

    // Asserted on the received sequence rather than repeated waitFor calls,
    // which resolve from the buffer and would keep returning the first pause.
    connector.pauseProgression(true);
    connector.pauseProgression(false);
    await waitUntil(() => ofType("PAUSE_PROGRESSION").length === 2, "both pause frames");
    expect(ofType("PAUSE_PROGRESSION").map((m) => m.payload.paused)).toEqual([true, false]);

    // Reset is a restart, so it goes out as the same command a fresh Play does.
    connector.startDiseaseSimulation("RRD", 30);
    await waitUntil(() => ofType("START_DISEASE_SIMULATION").length === 2, "restart frame");
  });

  it("passes STATE_UPDATED from the simulation back to the controller", async () => {
    const { sim, events } = await pairedPair();
    sim.send("STATE_UPDATED", {
      disease: "TUNNEL_VISION",
      severity: 0.4,
      comparison: "AFFECTED",
      scene: "GARDEN",
    });

    await waitUntil(() => events.states.length === 1, "STATE_UPDATED on controller");
    expect(events.states[0]).toEqual({
      disease: "TUNNEL_VISION",
      severity: 0.4,
      comparison: "AFFECTED",
      scene: "GARDEN",
    });
  });
});

describe("teardown paths the app depends on", () => {
  it("tells the controller the session ended when the simulation drops", async () => {
    const { sim, events } = await pairedPair();
    sim.close();
    await waitUntil(() => events.sessionEnded === 1, "onSessionEnded after sim drop");
  });

  it("relays an explicit END_SESSION to the simulation", async () => {
    const { sim, connector } = await pairedPair();
    connector.endSession();
    await sim.waitFor("END_SESSION");
  });
});

describe("known rough edges", () => {
  it("rejects a zero duration rather than treating it as 'no ramp'", async () => {
    const { connector, events } = await pairedPair();
    // The old Dashboard sent this by computing (total - elapsed) and letting it
    // reach 0 at the end of its timeline. That screen is gone - programs now
    // carry a fixed durationSeconds - but the guard is what kept a spent
    // timeline from silently becoming an instant jump to full severity.
    connector.startProgression(0);
    await waitUntil(() => events.errors.length > 0, "invalid_message error");
    expect(events.errors[0].code).toBe("invalid_message");
    expect(events.errors[0].message).toMatch(/durationSeconds/);
  });

  it("blocks a controller from sending simulation-only messages", async () => {
    const { sim, connector, events } = await pairedPair();
    // reaches past the typed helpers on purpose - the relay must not rely on
    // the client being well-behaved.
    (connector as unknown as { send: (t: string, p: object) => void }).send("PAIR_ACCEPT", {
      accepted: true,
    });
    await waitUntil(() => events.errors.length > 0, "forbidden error");
    expect(events.errors[0].code).toBe("forbidden");
    await sim.expectNo("PAIR_ACCEPT");
  });

  it("survives a burst of slider updates without dropping the connection", async () => {
    const { sim, connector, events } = await pairedPair();
    // 20/sec is the relay's cap; a drag that is not throttled will exceed it.
    for (let i = 0; i < 40; i++) connector.setSeverity(i / 40);
    await new Promise((r) => setTimeout(r, 300));

    const relayed = sim.received.filter((m) => m.type === "SET_SEVERITY").length;
    const limited = events.errors.filter((e) => e.code === "rate_limited").length;
    expect(relayed + limited).toBeGreaterThan(0);
    expect(events.closed).toEqual([]); // rate limiting must not kill the socket
  });
});
