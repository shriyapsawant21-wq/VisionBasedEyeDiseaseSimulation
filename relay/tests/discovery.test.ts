import { generateKeyPairSync, verify } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  DISCOVERY_REQUEST,
  DISCOVERY_RESPONSE,
  createDiscoveryResponse,
} from "../src/discovery";

describe("relay discovery", () => {
  it("signs the request nonce, advertised host, and port", () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const nonce = Buffer.alloc(16, 7).toString("base64");
    const response = createDiscoveryResponse(
      `${DISCOVERY_REQUEST}:${nonce}`,
      "192.168.10.4",
      8787,
      privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    );

    const parts = response!.split(":");
    expect(parts.slice(0, 4)).toEqual([DISCOVERY_RESPONSE, "8787", "192.168.10.4", nonce]);
    expect(verify(
      "RSA-SHA256",
      Buffer.from(`${nonce}:192.168.10.4:8787`),
      publicKey,
      Buffer.from(parts[4]!, "base64"),
    )).toBe(true);
    expect(verify(
      "RSA-SHA256",
      Buffer.from(`${nonce}:192.168.10.99:8787`),
      publicKey,
      Buffer.from(parts[4]!, "base64"),
    )).toBe(false);
  });
});
