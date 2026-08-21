import { describe, it, expect } from "vitest";
import { parseIncoming } from "../src/validation";

describe("parseIncoming", () => {
  it("accepts a valid HELLO message", () => {
    const raw = JSON.stringify({
      v: 1,
      type: "HELLO",
      seq: 0,
      timestamp: Date.now(),
      payload: { role: "SIMULATION" },
    });
    const result = parseIncoming(raw);
    expect(result.ok).toBe(true);
  });

  it("rejects malformed JSON", () => {
    const result = parseIncoming("{not json");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("invalid_json");
  });

  it("rejects an unknown message type", () => {
    const raw = JSON.stringify({
      v: 1,
      type: "DO_SOMETHING_BAD",
      seq: 0,
      timestamp: Date.now(),
      payload: {},
    });
    const result = parseIncoming(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("invalid_message");
  });

  it("rejects severity outside 0..1", () => {
    const raw = JSON.stringify({
      v: 1,
      type: "SET_SEVERITY",
      seq: 1,
      timestamp: Date.now(),
      payload: { severity: 1.5 },
    });
    const result = parseIncoming(raw);
    expect(result.ok).toBe(false);
  });

  it("rejects an oversized message", () => {
    const raw = JSON.stringify({
      v: 1,
      type: "SET_DISEASE",
      seq: 1,
      timestamp: Date.now(),
      payload: { disease: "METAMORPHOPSIA", padding: "x".repeat(20_000) },
    });
    const result = parseIncoming(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("message_too_large");
  });
});
