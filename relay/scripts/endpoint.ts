import { networkInterfaces } from "os";

/**
 * Prints the URLs to hand the controller and Unity devs.
 *
 * The LAN address is DHCP-assigned, so it changes whenever the laptop rejoins
 * the hotspot. Run this immediately before a demo rather than trusting a value
 * written down earlier.
 */

const PORT = Number(process.env.PORT ?? 8787);

const candidates = Object.entries(networkInterfaces())
  .flatMap(([name, addresses]) => (addresses ?? []).map((address) => ({ name, ...address })))
  .filter((entry) => entry.family === "IPv4" && !entry.internal)
  .filter((entry) => !entry.address.startsWith("169.254.")); // link-local, unroutable

console.log(`\nVisionBridge relay -- port ${PORT}\n`);

if (candidates.length === 0) {
  console.log("  No LAN address found. Connect to Wi-Fi or a hotspot first.\n");
  console.log(`  Local only:  ws://127.0.0.1:${PORT}\n`);
  process.exit(0);
}

for (const { name, address } of candidates) {
  console.log(`  ${name}`);
  console.log(`    relay URL   ws://${address}:${PORT}`);
  console.log(`    health      http://${address}:${PORT}/health\n`);
}

console.log("  Both devices must be on this same network.");
console.log("  Verify from a phone browser by opening the health URL before pairing.\n");
