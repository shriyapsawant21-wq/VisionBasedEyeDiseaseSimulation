import { generateKeyPairSync, verify } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  DISCOVERY_REQUEST,
  DISCOVERY_RESPONSE,
  createDiscoveryResponse,
} from "../src/discovery";

describe("relay discovery", () => {
  it("signs the request nonce and advertised port", () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const nonce = Buffer.alloc(16, 7).toString("base64");
    const response = createDiscoveryResponse(
      `${DISCOVERY_REQUEST}:${nonce}`,
      8787,
      privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    );

    const parts = response!.split(":");
    expect(parts.slice(0, 3)).toEqual([DISCOVERY_RESPONSE, "8787", nonce]);
    expect(verify("RSA-SHA256", Buffer.from(`${nonce}:8787`), publicKey, Buffer.from(parts[3]!, "base64"))).toBe(true);
  });
});
