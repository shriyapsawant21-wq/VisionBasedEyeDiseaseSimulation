import { generateKeyPairSync } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const privateKeyPath = resolve(".discovery-private-key.pem");
if (existsSync(privateKeyPath)) {
  throw new Error(`${privateKeyPath} already exists; refusing to replace the relay identity`);
}

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "jwk" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

writeFileSync(privateKeyPath, privateKey, { mode: 0o600 });

console.log(JSON.stringify({ modulus: publicKey.n, exponent: publicKey.e }));
