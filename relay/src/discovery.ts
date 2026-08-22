import { createSocket, type Socket } from "node:dgram";
import { createSign } from "node:crypto";
import { networkInterfaces } from "node:os";

export const DISCOVERY_PORT = Number(process.env.DISCOVERY_PORT ?? 8788);
export const DISCOVERY_REQUEST = "VISIONBRIDGE_DISCOVER_V3";
export const DISCOVERY_RESPONSE = "VISIONBRIDGE_RELAY_V3";

export function createDiscoveryResponse(
  request: string,
  advertisedHost: string,
  port: number,
  privateKey: string,
): string | null {
  const prefix = `${DISCOVERY_REQUEST}:`;
  if (!request.startsWith(prefix)) return null;

  const nonce = request.slice(prefix.length);
  if (!/^[A-Za-z0-9+/]{22}==$/.test(nonce)) return null;
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(advertisedHost)) return null;

  const signature = createSign("RSA-SHA256")
    .update(`${nonce}:${advertisedHost}:${port}`, "utf8")
    .sign(privateKey, "base64");
  return `${DISCOVERY_RESPONSE}:${port}:${advertisedHost}:${nonce}:${signature}`;
}

function ipv4ToInt(address: string): number {
  return address.split(".").reduce((value, part) => ((value << 8) | Number(part)) >>> 0, 0);
}

export function findLanAddress(remoteAddress: string): string | null {
  const remote = ipv4ToInt(remoteAddress);
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family !== "IPv4" || entry.internal) continue;
      const mask = ipv4ToInt(entry.netmask);
      if (((ipv4ToInt(entry.address) & mask) >>> 0) === ((remote & mask) >>> 0))
        return entry.address;
    }
  }
  return null;
}

/** Lets simulation devices find this relay on the local network without an IP field. */
export function startDiscovery(
  port: number,
  privateKey: string,
  logger: (event: string, fields: Record<string, unknown>) => void,
): Socket {
  const socket = createSocket("udp4");

  socket.on("message", (message, remote) => {
    const advertisedHost = findLanAddress(remote.address);
    if (advertisedHost === null) return;
    const response = createDiscoveryResponse(message.toString("utf8"), advertisedHost, port, privateKey);
    if (response !== null) socket.send(response, remote.port, remote.address);
  });
  socket.on("error", (error) => logger("discovery_error", { message: error.message }));
  socket.bind(DISCOVERY_PORT, "0.0.0.0", () => {
    logger("discovery_listening", { port: DISCOVERY_PORT });
  });

  return socket;
}
