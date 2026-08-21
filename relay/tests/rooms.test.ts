import { describe, it, expect, vi } from "vitest";
import { RoomRegistry } from "../src/rooms";

function fakeSocket() {
  return {} as unknown as import("ws").WebSocket;
}

describe("RoomRegistry", () => {
  it("creates a room with a 6-char session id and a token", () => {
    const rooms = new RoomRegistry();
    const room = rooms.createRoom(fakeSocket());
    expect(room.sessionId).toHaveLength(6);
    expect(room.pairingToken.length).toBeGreaterThan(0);
    expect(room.paired).toBe(false);
  });

  it("pairing invalidates the token and marks the room paired", () => {
    const rooms = new RoomRegistry();
    const room = rooms.createRoom(fakeSocket());
    const controller = fakeSocket();
    rooms.pair(room, controller);

    expect(room.paired).toBe(true);
    expect(room.pairingToken).toBe("");
    expect(room.controllerSocket).toBe(controller);
  });

  it("sweeps unpaired rooms past their TTL", () => {
    vi.useFakeTimers();
    const rooms = new RoomRegistry();
    const room = rooms.createRoom(fakeSocket());

    vi.advanceTimersByTime(3 * 60 * 1000); // past the 2-minute unpaired TTL

    const expired: string[] = [];
    rooms.sweepExpired((r) => expired.push(r.sessionId));

    expect(expired).toContain(room.sessionId);
    expect(rooms.get(room.sessionId)).toBeUndefined();
    vi.useRealTimers();
  });
});
