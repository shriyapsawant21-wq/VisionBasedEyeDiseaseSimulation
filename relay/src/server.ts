import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import {
  CONTROLLER_ONLY_TYPES,
  SIMULATION_ONLY_TYPES,
  EITHER_ROLE_TYPES,
  PROTOCOL_VERSION,
  type ClientMessage,
} from "./protocol";
import { RoomRegistry, type Room } from "./rooms";
import { parseIncoming } from "./validation";
import { RateLimiter } from "./rateLimit";

export const DEFAULTS = {
  heartbeatIntervalMs: 15_000,
  sweepIntervalMs: 10_000,
  maxMessagesPerWindow: 20,
  rateWindowMs: 1000,
} as const;

export type Logger = (event: string, fields: Record<string, unknown>) => void;

export interface RelayOptions {
  port?: number;
  heartbeatIntervalMs?: number;
  sweepIntervalMs?: number;
  maxMessagesPerWindow?: number;
  rateWindowMs?: number;
  /** Room TTL overrides; defaults live in rooms.ts. */
  unpairedTtlMs?: number;
  inactivityTtlMs?: number;
  /** Defaults to a structured line on stdout. Injected in tests to assert on log content. */
  logger?: Logger;
}

export interface Relay {
  /** Resolves with the actual bound port (useful when port 0 was requested). */
  listen(): Promise<number>;
  /** Immediate teardown. Sockets are terminated without notice. */
  close(): Promise<void>;
  /**
   * Graceful stop. Tells every connected client the session is over before
   * closing, so Unity resets to normal vision instead of just watching the
   * socket vanish. Rooms live in this process, so a restart always means
   * both devices must re-pair -- this only makes that legible to them.
   */
  shutdown(graceMs?: number): Promise<void>;
  readonly rooms: RoomRegistry;
  readonly httpServer: Server;
}

type Role = "SIMULATION" | "CONTROLLER" | "UNASSIGNED";

interface SocketMeta {
  role: Role;
  sessionId: string | null;
  isAlive: boolean;
}

export function createRelay(options: RelayOptions = {}): Relay {
  const {
    port = 8787,
    heartbeatIntervalMs = DEFAULTS.heartbeatIntervalMs,
    sweepIntervalMs = DEFAULTS.sweepIntervalMs,
    maxMessagesPerWindow = DEFAULTS.maxMessagesPerWindow,
    rateWindowMs = DEFAULTS.rateWindowMs,
    unpairedTtlMs,
    inactivityTtlMs,
  } = options;

  const log: Logger =
    options.logger ??
    ((event, fields) => {
      // structured logs, never include tokens or full payloads
      console.log(JSON.stringify({ ts: Date.now(), event, ...fields }));
    });

  const socketMeta = new WeakMap<WebSocket, SocketMeta>();
  const rooms = new RoomRegistry({ unpairedTtlMs, inactivityTtlMs });
  const rateLimiter = new RateLimiter(maxMessagesPerWindow, rateWindowMs);

  function send(socket: WebSocket, message: Record<string, unknown>) {
    if (socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ v: PROTOCOL_VERSION, timestamp: Date.now(), ...message }));
  }

  function sendError(socket: WebSocket, code: string, reason: string, seq = 0) {
    send(socket, { type: "ERROR", seq, payload: { code, message: reason } });
  }

  function closeRoom(room: Room, code: number, reason: string) {
    for (const socket of [room.simulationSocket, room.controllerSocket]) {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close(code, reason);
      }
    }
    rooms.destroy(room.sessionId);
  }

  const httpServer = createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "ok", rooms: rooms.size() }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  const wss = new WebSocketServer({ server: httpServer });
  // The HTTP server also reports startup failures through the WebSocket
  // server. Keep that secondary event from becoming an uncaught exception;
  // listen() remains the authoritative promise seen by the entry point.
  wss.on("error", (error) => log("websocket_server_error", { message: error.message }));

  wss.on("connection", (socket) => {
    socketMeta.set(socket, { role: "UNASSIGNED", sessionId: null, isAlive: true });
    log("connection_open", {});

    socket.on("pong", () => {
      const meta = socketMeta.get(socket);
      if (meta) meta.isAlive = true;
    });

    socket.on("message", (data) => {
      const meta = socketMeta.get(socket);
      if (!meta) return;

      if (!rateLimiter.allow(socket)) {
        sendError(socket, "rate_limited", "too many messages, slow down");
        log("message_rejected", { code: "rate_limited", role: meta.role });
        return;
      }

      const result = parseIncoming(data.toString());
      if (!result.ok) {
        sendError(socket, result.code, result.reason);
        log("message_rejected", { code: result.code, role: meta.role });
        return;
      }

      handleMessage(socket, meta, result.message);
    });

    socket.on("close", () => {
      const meta = socketMeta.get(socket);
      log("connection_close", { role: meta?.role, sessionId: meta?.sessionId });
      rateLimiter.forget(socket);

      if (!meta?.sessionId) return;
      const room = rooms.get(meta.sessionId);
      if (!room) return;

      // a controller that walked away mid-confirmation only releases its claim;
      // the simulation keeps its session and stays pairable.
      if (!room.paired && room.pendingControllerSocket === socket) {
        room.pendingControllerSocket = null;
        log("pair_abandoned", { sessionId: room.sessionId });
        return;
      }

      // if one side of a paired room drops, tear down the whole room and
      // tell the other side, per "Reset Unity to normal if control is lost."
      const other = room.simulationSocket === socket ? room.controllerSocket : room.simulationSocket;
      if (other) {
        send(other, { type: "END_SESSION", seq: 0, payload: {} });
      }
      rooms.destroy(room.sessionId);
    });

    socket.on("error", (err) => {
      log("socket_error", { message: (err as Error).message });
    });
  });

  function handleMessage(socket: WebSocket, meta: SocketMeta, message: ClientMessage) {
    switch (message.type) {
      case "HELLO": {
        // once per connection: a second HELLO would orphan the first room and
        // let a socket silently switch roles past the role gates below.
        if (meta.role !== "UNASSIGNED") {
          sendError(socket, "forbidden", "HELLO already sent on this connection", message.seq);
          return;
        }
        if (message.payload.role === "SIMULATION") {
          const room = rooms.createRoom(socket);
          meta.role = "SIMULATION";
          meta.sessionId = room.sessionId;
          send(socket, {
            type: "SESSION_CREATED",
            seq: message.seq,
            payload: {
              sessionId: room.sessionId,
              pairingToken: room.pairingToken,
              expiresAt: room.pairByExpiresAt,
            },
          });
          log("session_created", { sessionId: room.sessionId });
        } else {
          // CONTROLLER just announces itself; it must follow up with PAIR_REQUEST
          meta.role = "CONTROLLER";
        }
        return;
      }

      case "PAIR_REQUEST": {
        const room = rooms.get(message.payload.sessionId);
        if (!room) {
          sendError(socket, "session_not_found", "unknown or expired session", message.seq);
          log("pair_rejected", { code: "session_not_found" });
          return;
        }
        if (room.paired) {
          sendError(socket, "session_already_paired", "a controller is already connected", message.seq);
          log("pair_rejected", { code: "session_already_paired", sessionId: room.sessionId });
          return;
        }
        if (room.pendingControllerSocket && room.pendingControllerSocket !== socket) {
          sendError(socket, "pairing_in_progress", "another device is already awaiting confirmation", message.seq);
          log("pair_rejected", { code: "pairing_in_progress", sessionId: room.sessionId });
          return;
        }
        if (room.pairingToken !== message.payload.pairingToken) {
          sendError(socket, "invalid_token", "pairing token mismatch", message.seq);
          log("pair_rejected", { code: "invalid_token", sessionId: room.sessionId });
          return;
        }
        if (Date.now() > room.pairByExpiresAt) {
          sendError(socket, "session_expired", "pairing window has closed", message.seq);
          log("pair_rejected", { code: "session_expired", sessionId: room.sessionId });
          rooms.destroy(room.sessionId);
          return;
        }

        // hold the controller socket pending Unity's confirmation
        meta.role = "CONTROLLER";
        meta.sessionId = room.sessionId;
        room.pendingControllerSocket = socket;

        send(room.simulationSocket, {
          type: "PAIR_REQUEST",
          seq: message.seq,
          payload: { sessionId: room.sessionId },
        });
        return;
      }

      case "PAIR_ACCEPT": {
        if (meta.role !== "SIMULATION" || !meta.sessionId) {
          sendError(socket, "forbidden", "only the simulation device may accept pairing", message.seq);
          return;
        }
        const room = rooms.get(meta.sessionId);
        const pending = room?.pendingControllerSocket;

        if (!room || !pending) {
          sendError(socket, "no_pending_pair", "no pairing request to accept", message.seq);
          return;
        }

        if (!message.payload.accepted) {
          sendError(pending, "pair_rejected", "simulation device rejected the pairing request");
          log("pair_rejected", { code: "rejected_by_simulation", sessionId: room.sessionId });
          rooms.destroy(room.sessionId);
          return;
        }

        rooms.pair(room, pending);
        send(room.simulationSocket, { type: "PAIRED", seq: message.seq, payload: { sessionId: room.sessionId } });
        send(pending, { type: "PAIRED", seq: message.seq, payload: { sessionId: room.sessionId } });
        log("paired", { sessionId: room.sessionId });
        return;
      }

      default: {
        // every remaining command type is just relayed to the other party in the room
        if (!meta.sessionId) {
          sendError(socket, "not_paired", "connect and pair before sending commands", message.seq);
          return;
        }
        const room = rooms.get(meta.sessionId);
        if (!room || !room.paired) {
          sendError(socket, "not_paired", "session is not paired yet", message.seq);
          return;
        }

        if (EITHER_ROLE_TYPES.has(message.type)) {
          // heartbeat-style message: keeps the room alive, never forwarded to the peer
          rooms.touch(room);
          return;
        }

        if (meta.role === "CONTROLLER" && !CONTROLLER_ONLY_TYPES.has(message.type)) {
          sendError(socket, "forbidden", `controller may not send ${message.type}`, message.seq);
          return;
        }
        if (meta.role === "SIMULATION" && !SIMULATION_ONLY_TYPES.has(message.type)) {
          sendError(socket, "forbidden", `simulation may not send ${message.type}`, message.seq);
          return;
        }

        rooms.touch(room);
        const target = meta.role === "CONTROLLER" ? room.simulationSocket : room.controllerSocket;
        if (target) send(target, message);

        if (message.type === "END_SESSION") {
          closeRoom(room, 1000, "session ended");
        }
      }
    }
  }

  // heartbeat: ping every open socket, drop anything that didn't pong last round
  const heartbeat = setInterval(() => {
    for (const socket of wss.clients) {
      const meta = socketMeta.get(socket);
      if (!meta) continue;
      if (!meta.isAlive) {
        socket.terminate();
        continue;
      }
      meta.isAlive = false;
      socket.ping();
    }
  }, heartbeatIntervalMs);

  const sweep = setInterval(() => {
    rooms.sweepExpired((room, reason) => {
      log("room_expired", { sessionId: room.sessionId, reason });
      closeRoom(room, 1000, reason);
    });
  }, sweepIntervalMs);

  // never hold the process open on timers alone
  heartbeat.unref?.();
  sweep.unref?.();

  function hardClose(): Promise<void> {
    clearInterval(heartbeat);
    clearInterval(sweep);
    for (const socket of wss.clients) socket.terminate();
    return new Promise<void>((resolve) => {
      wss.close(() => httpServer.close(() => resolve()));
    });
  }

  const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  return {
    rooms,
    httpServer,
    listen() {
      return new Promise<number>((resolve, reject) => {
        const onStartupError = (err: Error) => reject(err);
        httpServer.once("error", onStartupError);
        httpServer.listen(port, () => {
          // stop intercepting errors, or a later failure resolves nowhere
          httpServer.removeListener("error", onStartupError);
          const address = httpServer.address();
          const boundPort = typeof address === "object" && address ? address.port : port;
          log("relay_listening", { port: boundPort });
          resolve(boundPort);
        });
      });
    },
    close: hardClose,
    async shutdown(graceMs = 250) {
      let notified = 0;
      for (const socket of wss.clients) {
        if (socket.readyState === WebSocket.OPEN) {
          send(socket, { type: "END_SESSION", seq: 0, payload: {} });
          notified += 1;
        }
      }
      log("relay_shutting_down", { clients: notified });

      if (notified > 0) {
        await wait(graceMs); // let the END_SESSION frames flush
        for (const socket of wss.clients) {
          // 1001 "going away" tells clients this was a restart, not a fault
          if (socket.readyState === WebSocket.OPEN) socket.close(1001, "server shutting down");
        }
        await wait(50);
      }
      await hardClose();
    },
  };
}
