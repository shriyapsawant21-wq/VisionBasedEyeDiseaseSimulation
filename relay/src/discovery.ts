import { createSocket, type Socket } from "node:dgram";

export const DISCOVERY_PORT = Number(process.env.DISCOVERY_PORT ?? 8788);
export const DISCOVERY_REQUEST = "VISIONBRIDGE_DISCOVER_V1";
export const DISCOVERY_RESPONSE = "VISIONBRIDGE_RELAY_V1";

/** Lets simulation devices find this relay on the local network without an IP field. */
export function startDiscovery(port: number, logger: (event: string, fields: Record<string, unknown>) => void): Socket {
  const socket = createSocket("udp4");

  socket.on("message", (message, remote) => {
    if (message.toString("utf8") !== DISCOVERY_REQUEST) return;
    socket.send(`${DISCOVERY_RESPONSE}:${port}`, remote.port, remote.address);
  });
  socket.on("error", (error) => logger("discovery_error", { message: error.message }));
  socket.bind(DISCOVERY_PORT, "0.0.0.0", () => {
    logger("discovery_listening", { port: DISCOVERY_PORT });
  });

  return socket;
}
