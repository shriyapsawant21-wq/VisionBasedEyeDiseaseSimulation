import { describe, expect, it } from "vitest";
import { decodePairingPayload } from "../src/pairingPayload";

describe("decodePairingPayload", () => {
  it("reads the relay URL from a current pairing code", () => {
    expect(
      decodePairingPayload(JSON.stringify({
        version: 2,
        sessionId: "ab12cd",
        pairingToken: "secret",
        relayUrl: "ws://10.98.251.129:8787",
      })),
    ).toEqual({
      sessionId: "AB12CD",
      pairingToken: "secret",
      relayUrl: "ws://10.98.251.129:8787",
    });
  });

  it("keeps legacy codes compatible with the manual relay setting", () => {
    expect(
      decodePairingPayload(JSON.stringify({ sessionId: "ABC123", pairingToken: "secret" })),
    ).toEqual({ sessionId: "ABC123", pairingToken: "secret", relayUrl: undefined });
  });

  it.each(["https://example.com", "not a url", "file:///tmp/socket"])(
    "rejects an unsafe relay URL: %s",
    (relayUrl) => {
      expect(
        decodePairingPayload(JSON.stringify({ sessionId: "ABC123", pairingToken: "secret", relayUrl })),
      ).toBeNull();
    },
  );
});
