import { randomBytes, randomInt } from "crypto";
import type { WebSocket } from "ws";

export interface Room {
  sessionId: string;
  pairingToken: string;
  simulationSocket: WebSocket;
  controllerSocket: WebSocket | null;
  /** Set while a PAIR_REQUEST is awaiting the simulation device's PAIR_ACCEPT. */
  pendingControllerSocket: WebSocket | null;
  paired: boolean;
  createdAt: number;
  /** Session is destroyed if not paired by this timestamp. */
  pairByExpiresAt: number;
  lastActivityAt: number;
}

export const UNPAIRED_TTL_MS = 2 * 60 * 1000; // ~2 minutes, per doc
export const INACTIVITY_TTL_MS = 30 * 60 * 1000; // destroy paired-but-idle rooms

export interface RoomRegistryOptions {
  /** Overrides exist so tests can exercise expiry without waiting minutes. */
  unpairedTtlMs?: number;
  inactivityTtlMs?: number;
}

const SESSION_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

function generateSessionId(): string {
  let id = "";
  for (let i = 0; i < 6; i++) {
    id += SESSION_ID_ALPHABET[randomInt(SESSION_ID_ALPHABET.length)];
  }
  return id;
}

function generatePairingToken(): string {
  return randomBytes(24).toString("base64url");
}

export class RoomRegistry {
  private rooms = new Map<string, Room>();
  private readonly unpairedTtlMs: number;
  private readonly inactivityTtlMs: number;

  constructor(options: RoomRegistryOptions = {}) {
    this.unpairedTtlMs = options.unpairedTtlMs ?? UNPAIRED_TTL_MS;
    this.inactivityTtlMs = options.inactivityTtlMs ?? INACTIVITY_TTL_MS;
  }

  createRoom(simulationSocket: WebSocket): Room {
    let sessionId = generateSessionId();
    while (this.rooms.has(sessionId)) sessionId = generateSessionId();

    const now = Date.now();
    const room: Room = {
      sessionId,
      pairingToken: generatePairingToken(),
      simulationSocket,
      controllerSocket: null,
      pendingControllerSocket: null,
      paired: false,
      createdAt: now,
      pairByExpiresAt: now + this.unpairedTtlMs,
      lastActivityAt: now,
    };
    this.rooms.set(sessionId, room);
    return room;
  }

  get(sessionId: string): Room | undefined {
    return this.rooms.get(sessionId);
  }

  touch(room: Room): void {
    room.lastActivityAt = Date.now();
  }

  pair(room: Room, controllerSocket: WebSocket): void {
    room.controllerSocket = controllerSocket;
    room.pendingControllerSocket = null;
    room.paired = true;
    // one-time token: invalidate immediately so it can't be reused
    room.pairingToken = "";
    this.touch(room);
  }

  destroy(sessionId: string): void {
    this.rooms.delete(sessionId);
  }

  findBySocket(socket: WebSocket): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.simulationSocket === socket || room.controllerSocket === socket) {
        return room;
      }
    }
    return undefined;
  }

  /** Call on an interval; closes and drops rooms past their TTL. */
  sweepExpired(onExpire: (room: Room, reason: string) => void): void {
    const now = Date.now();
    for (const room of this.rooms.values()) {
      if (!room.paired && now > room.pairByExpiresAt) {
        onExpire(room, "unpaired_timeout");
        this.destroy(room.sessionId);
        continue;
      }
      if (room.paired && now - room.lastActivityAt > this.inactivityTtlMs) {
        onExpire(room, "inactivity_timeout");
        this.destroy(room.sessionId);
      }
    }
  }

  size(): number {
    return this.rooms.size;
  }
}
