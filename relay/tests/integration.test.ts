import { describe, it, expect, afterEach } from "vitest";
import { startHarness, pairedPair, sleep, type Harness } from "./helpers/harness";
import { CONTROLLER_ONLY_TYPES, MAX_MESSAGE_BYTES } from "../src/protocol";

/**
 * End-to-end tests against a real relay over a real WebSocket, driving fake
 * Unity and controller clients. These cover the paths unit tests cannot:
 * ordering, role enforcement across two sockets, teardown, and abuse.
 */

let harness: Harness;

afterEach(async () => {
  await harness?.closeAll();
});

describe("handshake", () => {
  it("pairs a simulation and a controller end to end", async () => {
    harness = await startHarness();
    const { sessionId } = await pairedPair(harness);

    expect(sessionId).toHaveLength(6);
    expect(harness.logs.map((l) => l.event)).toContain("paired");
  });

  it("issues a 6-character session id free of ambiguous characters", async () => {
    harness = await startHarness();
    const sim = await harness.connect();
    sim.send("HELLO", { role: "SIMULATION" });
    const created = await sim.waitFor("SESSION_CREATED");

    expect(created.payload.sessionId).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    expect(created.payload.pairingToken.length).toBeGreaterThanOrEqual(16);
    expect(created.payload.expiresAt).toBeGreaterThan(Date.now());
  });

  it("never reveals the pairing token to the controller", async () => {
    harness = await startHarness();
    const { controller, pairingToken } = await pairedPair(harness);

    const seen = JSON.stringify(controller.received);
    expect(seen).not.toContain(pairingToken);
  });

  it("strips the pairing token from the PAIR_REQUEST forwarded to the simulation", async () => {
    harness = await startHarness();
    const sim = await harness.connect();
    sim.send("HELLO", { role: "SIMULATION" });
    const created = await sim.waitFor("SESSION_CREATED");

    const controller = await harness.connect();
    controller.send("HELLO", { role: "CONTROLLER" });
    controller.send("PAIR_REQUEST", {
      sessionId: created.payload.sessionId,
      pairingToken: created.payload.pairingToken,
    });

    const forwarded = await sim.waitFor("PAIR_REQUEST");
    expect(forwarded.payload).toEqual({ sessionId: created.payload.sessionId });
    expect(forwarded.payload.pairingToken).toBeUndefined();
  });

  it("tears the room down when the simulation rejects the pairing", async () => {
    harness = await startHarness();
    const sim = await harness.connect();
    sim.send("HELLO", { role: "SIMULATION" });
    const created = await sim.waitFor("SESSION_CREATED");

    const controller = await harness.connect();
    controller.send("HELLO", { role: "CONTROLLER" });
    controller.send("PAIR_REQUEST", {
      sessionId: created.payload.sessionId,
      pairingToken: created.payload.pairingToken,
    });
    await sim.waitFor("PAIR_REQUEST");

    sim.send("PAIR_ACCEPT", { accepted: false });
    await controller.waitForError("pair_rejected");

    // the room is gone -- the same credentials cannot be retried
    const retry = await harness.connect();
    retry.send("HELLO", { role: "CONTROLLER" });
    retry.send("PAIR_REQUEST", {
      sessionId: created.payload.sessionId,
      pairingToken: created.payload.pairingToken,
    });
    await retry.waitForError("session_not_found");
  });
});

describe("pairing abuse", () => {
  it("rejects a pairing token that does not match", async () => {
    harness = await startHarness();
    const sim = await harness.connect();
    sim.send("HELLO", { role: "SIMULATION" });
    const created = await sim.waitFor("SESSION_CREATED");

    const attacker = await harness.connect();
    attacker.send("HELLO", { role: "CONTROLLER" });
    attacker.send("PAIR_REQUEST", {
      sessionId: created.payload.sessionId,
      pairingToken: "x".repeat(32),
    });

    await attacker.waitForError("invalid_token");
    await sim.expectSilence();
  });

  it("rejects an unknown session id", async () => {
    harness = await startHarness();
    const controller = await harness.connect();
    controller.send("HELLO", { role: "CONTROLLER" });
    controller.send("PAIR_REQUEST", { sessionId: "ZZZZZZ", pairingToken: "x".repeat(32) });

    await controller.waitForError("session_not_found");
  });

  it("refuses a replayed token once the session is already paired", async () => {
    harness = await startHarness();
    const { sessionId, pairingToken } = await pairedPair(harness);

    const third = await harness.connect();
    third.send("HELLO", { role: "CONTROLLER" });
    third.send("PAIR_REQUEST", { sessionId, pairingToken });

    await third.waitForError("session_already_paired");
  });

  it("refuses a third device while another controller is awaiting confirmation", async () => {
    harness = await startHarness();
    const sim = await harness.connect();
    sim.send("HELLO", { role: "SIMULATION" });
    const created = await sim.waitFor("SESSION_CREATED");
    const { sessionId, pairingToken } = created.payload;

    const first = await harness.connect();
    first.send("HELLO", { role: "CONTROLLER" });
    first.send("PAIR_REQUEST", { sessionId, pairingToken });
    await sim.waitFor("PAIR_REQUEST");

    const second = await harness.connect();
    second.send("HELLO", { role: "CONTROLLER" });
    second.send("PAIR_REQUEST", { sessionId, pairingToken });

    await second.waitForError("pairing_in_progress");
  });

  it("expires an unpaired session and closes the simulation socket", async () => {
    harness = await startHarness({ unpairedTtlMs: 30, sweepIntervalMs: 15 });
    const sim = await harness.connect();
    sim.send("HELLO", { role: "SIMULATION" });
    const created = await sim.waitFor("SESSION_CREATED");

    const closed = await sim.waitForClose();
    expect(closed.reason).toBe("unpaired_timeout");

    const late = await harness.connect();
    late.send("HELLO", { role: "CONTROLLER" });
    late.send("PAIR_REQUEST", {
      sessionId: created.payload.sessionId,
      pairingToken: created.payload.pairingToken,
    });
    await late.waitForError("session_not_found");
  });

  it("rejects PAIR_ACCEPT from a controller", async () => {
    harness = await startHarness();
    const { controller } = await pairedPair(harness);

    controller.send("PAIR_ACCEPT", { accepted: true });
    await controller.waitForError("forbidden");
  });

  it("rejects PAIR_ACCEPT when nothing is pending", async () => {
    harness = await startHarness();
    const sim = await harness.connect();
    sim.send("HELLO", { role: "SIMULATION" });
    await sim.waitFor("SESSION_CREATED");

    sim.send("PAIR_ACCEPT", { accepted: true });
    await sim.waitForError("no_pending_pair");
  });
});

describe("command relay", () => {
  it("forwards every controller command type to the simulation", async () => {
    harness = await startHarness();
    const { sim, controller } = await pairedPair(harness);

    const commands: Array<[string, unknown]> = [
      ["SET_DISEASE", { disease: "TUNNEL_VISION" }],
      ["SET_SEVERITY", { severity: 0.65 }],
      ["SET_COMPARISON", { comparison: "AFFECTED" }],
      ["START_PROGRESSION", { durationSeconds: 30 }],
      ["PAUSE_PROGRESSION", { paused: true }],
      ["START_DISEASE_SIMULATION", { program: "RRD", durationSeconds: 30 }],
      ["SET_SCENE", { scene: "GARDEN" }],
      ["RECENTER", {}],
      ["RESET", {}],
    ];

    for (const [type, payload] of commands) {
      controller.send(type, payload);
      const received = await sim.waitFor(type);
      expect(received.payload).toEqual(payload);
    }

    // every controller-only type except the two handled during pairing/teardown
    const covered = new Set(commands.map(([type]) => type));
    for (const type of CONTROLLER_ONLY_TYPES) {
      if (type === "PAIR_REQUEST" || type === "END_SESSION") continue;
      expect(covered.has(type)).toBe(true);
    }
  });

  it("forwards STATE_UPDATED from the simulation back to the controller", async () => {
    harness = await startHarness();
    const { sim, controller } = await pairedPair(harness);

    const state = {
      disease: "CENTRAL_BLUR",
      severity: 0.4,
      comparison: "NORMAL",
      scene: "GARDEN",
    };
    sim.send("STATE_UPDATED", state);

    const received = await controller.waitFor("STATE_UPDATED");
    expect(received.payload).toEqual(state);
  });

  it("preserves the sender's seq so replies can be correlated", async () => {
    harness = await startHarness();
    const { sim, controller } = await pairedPair(harness);

    controller.sendRaw(
      JSON.stringify({ v: 1, type: "SET_SEVERITY", seq: 4242, timestamp: 111, payload: { severity: 0.5 } }),
    );

    const forwarded = await sim.waitFor("SET_SEVERITY");
    expect(forwarded.seq).toBe(4242);
    // the sender's timestamp survives the hop too, so latency can be measured
    expect(forwarded.timestamp).toBe(111);
  });

  it("relays duplicate commands verbatim without deduplicating", async () => {
    harness = await startHarness();
    const { sim, controller } = await pairedPair(harness);

    controller.send("SET_SEVERITY", { severity: 0.5 });
    controller.send("SET_SEVERITY", { severity: 0.5 });
    await sleep(80);

    const severities = sim.received.filter((m) => m.type === "SET_SEVERITY");
    expect(severities).toHaveLength(2);
  });

  it("relays out-of-order seq numbers without reordering or dropping", async () => {
    harness = await startHarness();
    const { sim, controller } = await pairedPair(harness);

    // deliberately descending seq -- the relay must not care
    for (const [seq, severity] of [[99, 0.9], [3, 0.3], [50, 0.5]] as const) {
      controller.sendRaw(
        JSON.stringify({ v: 1, type: "SET_SEVERITY", seq, timestamp: Date.now(), payload: { severity } }),
      );
    }
    await sleep(100);

    const order = sim.received.filter((m) => m.type === "SET_SEVERITY").map((m) => m.payload.severity);
    expect(order).toEqual([0.9, 0.3, 0.5]);
  });

  it("never forwards PING to the peer but keeps the room alive", async () => {
    harness = await startHarness();
    const { sim, controller } = await pairedPair(harness);

    controller.send("PING", {});
    await sim.expectSilence();
    expect(harness.relay.rooms.size()).toBe(1);
  });
});

describe("role enforcement", () => {
  it("blocks a controller from forging STATE_UPDATED", async () => {
    harness = await startHarness();
    const { sim, controller } = await pairedPair(harness);

    controller.send("STATE_UPDATED", {
      disease: "TUNNEL_VISION",
      severity: 1,
      comparison: "AFFECTED",
      scene: "GARDEN",
    });

    const error = await controller.waitForError("forbidden");
    expect(error.payload.message).toContain("STATE_UPDATED");
    await sim.expectSilence();
  });

  it("blocks the simulation from issuing controller commands", async () => {
    harness = await startHarness();
    const { sim, controller } = await pairedPair(harness);

    sim.send("SET_DISEASE", { disease: "CENTRAL_BLUR" });

    const error = await sim.waitForError("forbidden");
    expect(error.payload.message).toContain("SET_DISEASE");
    await controller.expectSilence();
  });

  it("rejects commands sent before pairing completes", async () => {
    harness = await startHarness();
    const sim = await harness.connect();
    sim.send("HELLO", { role: "SIMULATION" });
    await sim.waitFor("SESSION_CREATED");

    sim.send("STATE_UPDATED", {
      disease: "TUNNEL_VISION",
      severity: 0,
      comparison: "NORMAL",
      scene: "GARDEN",
    });
    await sim.waitForError("not_paired");
  });

  it("rejects commands from a socket that never said HELLO", async () => {
    harness = await startHarness();
    const stranger = await harness.connect();

    stranger.send("SET_SEVERITY", { severity: 0.5 });
    await stranger.waitForError("not_paired");
  });
});

describe("malformed input", () => {
  it("rejects non-JSON frames", async () => {
    harness = await startHarness();
    const client = await harness.connect();

    client.sendRaw("this is not json");
    await client.waitForError("invalid_json");
  });

  it("rejects an unsupported protocol version", async () => {
    harness = await startHarness();
    const client = await harness.connect();

    client.sendRaw(JSON.stringify({ v: 2, type: "HELLO", seq: 1, timestamp: 0, payload: { role: "SIMULATION" } }));
    await client.waitForError("invalid_message");
  });

  it("rejects an unknown message type", async () => {
    harness = await startHarness();
    const client = await harness.connect();

    client.sendRaw(JSON.stringify({ v: 1, type: "DROP_TABLES", seq: 1, timestamp: 0, payload: {} }));
    await client.waitForError("invalid_message");
  });

  it("rejects a relay-originated type sent by a client", async () => {
    harness = await startHarness();
    const client = await harness.connect();

    client.sendRaw(
      JSON.stringify({
        v: 1,
        type: "SESSION_CREATED",
        seq: 1,
        timestamp: 0,
        payload: { sessionId: "AAAAAA", pairingToken: "x".repeat(32), expiresAt: 0 },
      }),
    );
    await client.waitForError("invalid_message");
  });

  it("rejects out-of-range severity instead of clamping it", async () => {
    harness = await startHarness();
    const { sim, controller } = await pairedPair(harness);

    controller.sendRaw(
      JSON.stringify({ v: 1, type: "SET_SEVERITY", seq: 1, timestamp: 0, payload: { severity: 42 } }),
    );
    await controller.waitForError("invalid_message");
    await sim.expectSilence();
  });

  it("rejects a payload larger than the size limit", async () => {
    harness = await startHarness();
    const client = await harness.connect();

    const oversized = JSON.stringify({
      v: 1,
      type: "SET_SEVERITY",
      seq: 1,
      timestamp: 0,
      payload: { severity: 0.5, junk: "x".repeat(MAX_MESSAGE_BYTES) },
    });
    expect(oversized.length).toBeGreaterThan(MAX_MESSAGE_BYTES);

    client.sendRaw(oversized);
    await client.waitForError("message_too_large");
  });

  it("survives a burst of garbage without dropping the connection", async () => {
    harness = await startHarness();
    const client = await harness.connect();

    for (const junk of ["{", "[]", "null", '{"v":1}', '{"type":"HELLO"}']) {
      client.sendRaw(junk);
    }
    await sleep(80);

    // still usable afterwards
    client.send("HELLO", { role: "SIMULATION" });
    const created = await client.waitFor("SESSION_CREATED");
    expect(created.payload.sessionId).toHaveLength(6);
  });
});

describe("rate limiting", () => {
  it("rejects messages past the per-second cap and recovers next window", async () => {
    harness = await startHarness({ maxMessagesPerWindow: 5, rateWindowMs: 100 });
    const { sim, controller } = await pairedPair(harness);

    const before = controller.received.length;
    for (let i = 0; i < 15; i++) controller.send("PING", {});
    await sleep(60);

    const limited = controller.received
      .slice(before)
      .filter((m) => m.type === "ERROR" && m.payload.code === "rate_limited");
    expect(limited.length).toBeGreaterThan(0);

    // once the window rolls over, real traffic reaches the peer again
    await sleep(120);
    controller.send("SET_SEVERITY", { severity: 0.2 });
    const forwarded = await sim.waitFor("SET_SEVERITY");
    expect(forwarded.payload.severity).toBe(0.2);
  });

  it("rate limits each connection independently", async () => {
    harness = await startHarness({ maxMessagesPerWindow: 3, rateWindowMs: 500 });
    const { sim, controller } = await pairedPair(harness);

    for (let i = 0; i < 10; i++) controller.send("PING", {});
    await sleep(60);

    expect(controller.received.some((m) => m.payload?.code === "rate_limited")).toBe(true);
    expect(sim.received.some((m) => m.payload?.code === "rate_limited")).toBe(false);
  });
});

describe("teardown", () => {
  it("notifies the peer and destroys the room when a socket drops", async () => {
    harness = await startHarness();
    const { sim, controller } = await pairedPair(harness);

    controller.close();
    await sim.waitFor("END_SESSION");
    expect(harness.relay.rooms.size()).toBe(0);
  });

  it("closes both sockets on an explicit END_SESSION", async () => {
    harness = await startHarness();
    const { sim, controller } = await pairedPair(harness);

    controller.send("END_SESSION", {});
    const simClose = await sim.waitForClose();
    const controllerClose = await controller.waitForClose();

    expect(simClose.code).toBe(1000);
    expect(controllerClose.code).toBe(1000);
    expect(harness.relay.rooms.size()).toBe(0);
  });

  it("expires a paired room that has gone idle", async () => {
    harness = await startHarness({ inactivityTtlMs: 40, sweepIntervalMs: 15 });
    const { sim } = await pairedPair(harness);

    const closed = await sim.waitForClose();
    expect(closed.reason).toBe("inactivity_timeout");
    expect(harness.relay.rooms.size()).toBe(0);
  });

  it("keeps a paired room alive while PINGs keep arriving", async () => {
    harness = await startHarness({ inactivityTtlMs: 120, sweepIntervalMs: 15 });
    const { controller } = await pairedPair(harness);

    for (let i = 0; i < 5; i++) {
      controller.send("PING", {});
      await sleep(40);
    }

    expect(harness.relay.rooms.size()).toBe(1);
  });
});

describe("observability", () => {
  it("serves /health with the live room count", async () => {
    harness = await startHarness();
    const empty = await fetch(`http://127.0.0.1:${harness.port}/health`).then((r) => r.json());
    expect(empty).toEqual({ status: "ok", rooms: 0 });

    await pairedPair(harness);
    const busy = await fetch(`http://127.0.0.1:${harness.port}/health`).then((r) => r.json());
    expect(busy.rooms).toBe(1);
  });

  it("404s any other route", async () => {
    harness = await startHarness();
    const res = await fetch(`http://127.0.0.1:${harness.port}/admin`);
    expect(res.status).toBe(404);
  });

  it("never writes a pairing token into the logs", async () => {
    harness = await startHarness();
    const { sim, controller, pairingToken } = await pairedPair(harness);

    controller.send("SET_SEVERITY", { severity: 0.65 });
    await sim.waitFor("SET_SEVERITY");
    controller.send("END_SESSION", {});
    await sleep(50);

    const dumped = JSON.stringify(harness.logs);
    expect(dumped).not.toContain(pairingToken);
  });

  it("never writes a message payload into the logs", async () => {
    harness = await startHarness();
    const { sim, controller } = await pairedPair(harness);

    controller.send("SET_DISEASE", { disease: "METAMORPHOPSIA" });
    await sim.waitFor("SET_DISEASE");

    const dumped = JSON.stringify(harness.logs);
    expect(dumped).not.toContain("METAMORPHOPSIA");
    expect(harness.logs.every((line) => !("payload" in line.fields))).toBe(true);
  });

  it("logs a reason for every rejected pairing attempt", async () => {
    harness = await startHarness();
    const sim = await harness.connect();
    sim.send("HELLO", { role: "SIMULATION" });
    const created = await sim.waitFor("SESSION_CREATED");

    const attacker = await harness.connect();
    attacker.send("HELLO", { role: "CONTROLLER" });
    attacker.send("PAIR_REQUEST", {
      sessionId: created.payload.sessionId,
      pairingToken: "x".repeat(32),
    });
    await attacker.waitForError("invalid_token");

    const rejections = harness.logs.filter((l) => l.event === "pair_rejected");
    expect(rejections).toHaveLength(1);
    expect(rejections[0].fields.code).toBe("invalid_token");
  });
});

describe("connection hygiene", () => {
  it("accepts HELLO only once per connection", async () => {
    harness = await startHarness();
    const sim = await harness.connect();

    sim.send("HELLO", { role: "SIMULATION" });
    await sim.waitFor("SESSION_CREATED");

    sim.send("HELLO", { role: "SIMULATION" });
    await sim.waitForError("forbidden");

    // the second HELLO must not have orphaned a room
    expect(harness.relay.rooms.size()).toBe(1);
  });

  it("stops a paired simulation from switching roles to bypass the command gate", async () => {
    harness = await startHarness();
    const { sim, controller } = await pairedPair(harness);

    sim.send("HELLO", { role: "CONTROLLER" });
    await sim.waitForError("forbidden");

    // still gated as a simulation, so controller-only commands stay rejected
    sim.send("SET_DISEASE", { disease: "CENTRAL_BLUR" });
    const error = await sim.waitForError("forbidden");
    expect(error.payload.message).toContain("SET_DISEASE");
    await controller.expectSilence();
  });

  it("keeps the session alive when a controller abandons pairing mid-confirmation", async () => {
    harness = await startHarness();
    const sim = await harness.connect();
    sim.send("HELLO", { role: "SIMULATION" });
    const created = await sim.waitFor("SESSION_CREATED");
    const { sessionId, pairingToken } = created.payload;

    const abandoner = await harness.connect();
    abandoner.send("HELLO", { role: "CONTROLLER" });
    abandoner.send("PAIR_REQUEST", { sessionId, pairingToken });
    await sim.waitFor("PAIR_REQUEST");

    abandoner.close();
    await sleep(80);

    // the simulation was NOT told the session ended, and the room survives
    expect(sim.received.some((m) => m.type === "END_SESSION")).toBe(false);
    expect(harness.relay.rooms.size()).toBe(1);

    // a second controller can still pair with the original code
    const replacement = await harness.connect();
    replacement.send("HELLO", { role: "CONTROLLER" });
    replacement.send("PAIR_REQUEST", { sessionId, pairingToken });
    await sim.waitFor("PAIR_REQUEST");
    sim.send("PAIR_ACCEPT", { accepted: true });

    const paired = await replacement.waitFor("PAIRED");
    expect(paired.payload.sessionId).toBe(sessionId);
  });
});

describe("graceful shutdown", () => {
  it("tells both devices the session ended before the process goes away", async () => {
    harness = await startHarness();
    const { sim, controller } = await pairedPair(harness);

    await harness.relay.shutdown(50);

    expect(sim.received.some((m) => m.type === "END_SESSION")).toBe(true);
    expect(controller.received.some((m) => m.type === "END_SESSION")).toBe(true);
    // 1001 "going away" distinguishes a restart from a crash
    expect(sim.closedWith?.code).toBe(1001);
    expect(controller.closedWith?.code).toBe(1001);
  });

  it("shuts down cleanly with nobody connected", async () => {
    harness = await startHarness();
    await expect(harness.relay.shutdown(10)).resolves.toBeUndefined();
  });
});
