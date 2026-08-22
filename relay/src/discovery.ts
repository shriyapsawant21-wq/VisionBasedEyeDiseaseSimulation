import { createSocket, type Socket } from "node:dgram";
import { createSign } from "node:crypto";

export const DISCOVERY_PORT = Number(process.env.DISCOVERY_PORT ?? 8788);
export const DISCOVERY_REQUEST = "VISIONBRIDGE_DISCOVER_V2";
export const DISCOVERY_RESPONSE = "VISIONBRIDGE_RELAY_V2";

export function createDiscoveryResponse(request: string, port: number, privateKey: string): string | null {
  const prefix = `${DISCOVERY_REQUEST}:`;
  if (!request.startsWith(prefix)) return null;

  const nonce = request.slice(prefix.length);
  if (!/^[A-Za-z0-9+/]{22}==$/.test(nonce)) return null;

  const signature = createSign("RSA-SHA256")
    .update(`${nonce}:${port}`, "utf8")
    .sign(privateKey, "base64");
  return `${DISCOVERY_RESPONSE}:${port}:${nonce}:${signature}`;
}

/** Lets simulation devices find this relay on the local network without an IP field. */
export function startDiscovery(
  port: number,
  privateKey: string,
  logger: (event: string, fields: Record<string, unknown>) => void,
): Socket {
  const socket = createSocket("udp4");

  socket.on("message", (message, remote) => {
    const response = createDiscoveryResponse(message.toString("utf8"), port, privateKey);
    if (response !== null) socket.send(response, remote.port, remote.address);
  });
  socket.on("error", (error) => logger("discovery_error", { message: error.message }));
  socket.bind(DISCOVERY_PORT, "0.0.0.0", () => {
    logger("discovery_listening", { port: DISCOVERY_PORT });
  });

  return socket;
}
