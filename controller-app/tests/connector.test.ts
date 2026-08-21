import { describe, it, expect, vi } from "vitest";

class FakeWebSocket {
  static OPEN = 1;
  readyState = FakeWebSocket.OPEN;
  sent: string[] = [];
  private handlers: Record<string, (...args: unknown[]) => void> = {};

  on(event: string, handler: (...args: unknown[]) => void) {
    this.handlers[event] = handler;
    return this;
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {}

  emit(event: string, ...args: unknown[]) {
    this.handlers[event]?.(...args);
  }
}

let lastSocket: FakeWebSocket;

vi.mock("ws", () => ({
  default: class {
    static OPEN = FakeWebSocket.OPEN;
    constructor() {
      lastSocket = new FakeWebSocket();
      return lastSocket;
    }
  },
}));

const { RelayConnector } = await import("../src/connector");

describe("RelayConnector", () => {
  it("sends a HELLO with role CONTROLLER on open", () => {
    const connector = new RelayConnector("ws://localhost:8787");
    connector.connect();
    lastSocket.emit("open");

    expect(lastSocket.sent).toHaveLength(1);
    const message = JSON.parse(lastSocket.sent[0]);
    expect(message.type).toBe("HELLO");
    expect(message.payload).toEqual({ role: "CONTROLLER" });
    expect(message.v).toBe(1);
  });

  it("increments seq across messages", () => {
    const connector = new RelayConnector("ws://localhost:8787");
    connector.connect();
    lastSocket.emit("open");
    connector.setSeverity(0.5);

    const seqs = lastSocket.sent.map((raw) => JSON.parse(raw).seq);
    expect(seqs).toEqual([0, 1]);
  });

  it("invokes onPaired when a PAIRED message arrives", () => {
    const onPaired = vi.fn();
    const connector = new RelayConnector("ws://localhost:8787", { onPaired });
    connector.connect();
    lastSocket.emit(
      "message",
      Buffer.from(JSON.stringify({ v: 1, type: "PAIRED", seq: 0, timestamp: Date.now(), payload: { sessionId: "AB12CD" } }))
    );

    expect(onPaired).toHaveBeenCalledWith("AB12CD");
  });
});
