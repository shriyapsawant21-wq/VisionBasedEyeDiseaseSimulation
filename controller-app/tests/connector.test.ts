import { describe, it, expect, vi, beforeEach } from "vitest";
import { RelayConnector } from "../src/connector";

class FakeWebSocket {
  static OPEN = 1;
  readyState = FakeWebSocket.OPEN;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: { code: number; reason: string }) => void) | null = null;
  onerror: ((event: { message?: string }) => void) | null = null;

  constructor(public url: string) {
    lastSocket = this;
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {}
}

let lastSocket: FakeWebSocket;

beforeEach(() => {
  vi.stubGlobal("WebSocket", FakeWebSocket);
});

describe("RelayConnector", () => {
  it("sends a HELLO with role CONTROLLER on open", () => {
    const connector = new RelayConnector("ws://localhost:8787");
    connector.connect();
    lastSocket.onopen?.();

    expect(lastSocket.sent).toHaveLength(1);
    const message = JSON.parse(lastSocket.sent[0]);
    expect(message.type).toBe("HELLO");
    expect(message.payload).toEqual({ role: "CONTROLLER" });
    expect(message.v).toBe(1);
  });

  it("increments seq across messages", () => {
    const connector = new RelayConnector("ws://localhost:8787");
    connector.connect();
    lastSocket.onopen?.();
    connector.setSeverity(0.5);

    const seqs = lastSocket.sent.map((raw) => JSON.parse(raw).seq);
    expect(seqs).toEqual([0, 1]);
  });

  it("invokes onPaired when a PAIRED message arrives", () => {
    const onPaired = vi.fn();
    const connector = new RelayConnector("ws://localhost:8787", { onPaired });
    connector.connect();
    lastSocket.onmessage?.({
      data: JSON.stringify({ v: 1, type: "PAIRED", seq: 0, timestamp: Date.now(), payload: { sessionId: "AB12CD" } }),
    });

    expect(onPaired).toHaveBeenCalledWith("AB12CD");
  });

  it("invokes onStateUpdated when a STATE_UPDATED message arrives", () => {
    const onStateUpdated = vi.fn();
    const connector = new RelayConnector("ws://localhost:8787", { onStateUpdated });
    connector.connect();
    const state = { disease: "TUNNEL_VISION", severity: 0.7, comparison: "AFFECTED", scene: "GARDEN" };
    lastSocket.onmessage?.({
      data: JSON.stringify({ v: 1, type: "STATE_UPDATED", seq: 0, timestamp: Date.now(), payload: state }),
    });

    expect(onStateUpdated).toHaveBeenCalledWith(state);
  });

  it("invokes onProtocolError when an ERROR message arrives", () => {
    const onProtocolError = vi.fn();
    const connector = new RelayConnector("ws://localhost:8787", { onProtocolError });
    connector.connect();
    lastSocket.onmessage?.({
      data: JSON.stringify({
        v: 1,
        type: "ERROR",
        seq: 0,
        timestamp: Date.now(),
        payload: { code: "session_not_found", message: "unknown or expired session" },
      }),
    });

    expect(onProtocolError).toHaveBeenCalledWith("session_not_found", "unknown or expired session");
  });

  it("invokes onClose with the close code and reason", () => {
    const onClose = vi.fn();
    const connector = new RelayConnector("ws://localhost:8787", { onClose });
    connector.connect();
    lastSocket.onclose?.({ code: 1000, reason: "session ended" });

    expect(onClose).toHaveBeenCalledWith(1000, "session ended");
  });

  it("does not send once the socket is no longer open", () => {
    const connector = new RelayConnector("ws://localhost:8787");
    connector.connect();
    lastSocket.readyState = 3; // CLOSED
    connector.setSeverity(0.5);

    expect(lastSocket.sent).toHaveLength(0);
  });
});
