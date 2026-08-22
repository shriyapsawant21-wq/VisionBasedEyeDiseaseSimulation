import { generateKeyPairSync } from "node:crypto";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
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

const unitySourcePath = resolve(
  "..",
  "unity-vr",
  "Assets",
  "Project",
  "Scripts",
  "Networking",
  "RelayDiscovery.cs",
);
const toBase64 = (value: string) => {
  const standard = value.replace(/-/g, "+").replace(/_/g, "/");
  return standard.padEnd(Math.ceil(standard.length / 4) * 4, "=");
};

const unitySource = readFileSync(unitySourcePath, "utf8");
const modulusPattern = /private const string PublicModulus =\s*"[^"]+";/;
const exponentPattern = /private const string PublicExponent = "[^"]+";/;
if (!modulusPattern.test(unitySource) || !exponentPattern.test(unitySource)) {
  throw new Error(`could not find the pinned discovery key in ${unitySourcePath}`);
}
const withModulus = unitySource.replace(
  modulusPattern,
  `private const string PublicModulus =\n            "${toBase64(publicKey.n!)}";`,
);
const pinnedSource = withModulus.replace(
  exponentPattern,
  `private const string PublicExponent = "${toBase64(publicKey.e!)}";`,
);
const privateKeyTempPath = `${privateKeyPath}.tmp-${process.pid}`;
const unitySourceTempPath = `${unitySourcePath}.tmp-${process.pid}`;
writeFileSync(privateKeyTempPath, privateKey, { mode: 0o600, flag: "wx" });
writeFileSync(unitySourceTempPath, pinnedSource, { flag: "wx" });

// Commit the public pin first. If the process stops before the private-key
// rename, no key exists and rerunning this command safely repairs the setup.
renameSync(unitySourceTempPath, unitySourcePath);
renameSync(privateKeyTempPath, privateKeyPath);

console.log(`Generated relay identity and pinned its public key in ${unitySourcePath}`);
