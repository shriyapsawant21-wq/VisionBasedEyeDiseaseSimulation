import {
  PROTOCOL_VERSION,
  type Disease,
  type Comparison,
} from "../../relay/src/protocol";

// Uses the ambient WebSocket global (React Native and browsers both provide
// one with the same WHATWG API) instead of the Node-only "ws" package.

export interface ControllerState {
  disease: Disease;
  severity: number;
  comparison: Comparison;
  scene: "GARDEN";
}

export interface ConnectorEvents {
  onOpen?: () => void;
  onClose?: (code: number, reason: string) => void;
  onSocketError?: (err: Error) => void;
  onPaired?: (sessionId: string) => void;
  onStateUpdated?: (state: ControllerState) => void;
  onSessionEnded?: () => void;
  onProtocolError?: (code: string, message: string) => void;
}

/**
 * Doctor-side client for the relay. Handles the HELLO/PAIR_REQUEST handshake
 * and exposes typed helpers for the CONTROLLER_ONLY_TYPES commands.
 * Mirrors relay/src/protocol.ts, the source of truth for message shapes.
 */
export class RelayConnector {
  private socket: WebSocket | null = null;
  private seq = 0;
  private sessionId: string | null = null;

  constructor(
    private readonly relayUrl: string,
    private readonly events: ConnectorEvents = {}
  ) {}

  connect(): void {
    this.socket = new WebSocket(this.relayUrl);

    this.socket.onopen = () => {
      this.events.onOpen?.();
      this.send("HELLO", { role: "CONTROLLER" });
    };

    this.socket.onmessage = (event: MessageEvent) => {
      this.handleMessage(JSON.parse(String(event.data)));
    };

    this.socket.onclose = (event: CloseEvent) => {
      this.events.onClose?.(event.code, event.reason);
    };

    this.socket.onerror = (event: Event) => {
      const message = "message" in event ? String((event as { message: unknown }).message) : "WebSocket error";
      this.events.onSocketError?.(new Error(message));
    };
  }

  pairRequest(sessionId: string, pairingToken: string): void {
    this.send("PAIR_REQUEST", { sessionId, pairingToken });
  }

  setDisease(disease: Disease): void {
    this.send("SET_DISEASE", { disease });
  }

  setSeverity(severity: number): void {
    this.send("SET_SEVERITY", { severity });
  }

  setComparison(comparison: Comparison): void {
    this.send("SET_COMPARISON", { comparison });
  }

  startProgression(durationSeconds: number): void {
    this.send("START_PROGRESSION", { durationSeconds });
  }

  pauseProgression(): void {
    this.send("PAUSE_PROGRESSION", {});
  }

  recenter(): void {
    this.send("RECENTER", {});
  }

  reset(): void {
    this.send("RESET", {});
  }

  endSession(): void {
    this.send("END_SESSION", {});
  }

  close(): void {
    this.socket?.close(1000, "controller closing");
  }

  private handleMessage(message: Record<string, unknown>): void {
    switch (message.type) {
      case "PAIRED": {
        const payload = message.payload as { sessionId: string };
        this.sessionId = payload.sessionId;
        this.events.onPaired?.(payload.sessionId);
        return;
      }
      case "STATE_UPDATED": {
        this.events.onStateUpdated?.(message.payload as ControllerState);
        return;
      }
      case "END_SESSION": {
        // the relay sends this (without closing our socket) when the other
        // side of the pairing disconnects - the room is already gone.
        this.events.onSessionEnded?.();
        return;
      }
      case "ERROR": {
        const payload = message.payload as { code: string; message: string };
        this.events.onProtocolError?.(payload.code, payload.message);
        return;
      }
    }
  }

  private send(type: string, payload: Record<string, unknown>): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(
      JSON.stringify({
        v: PROTOCOL_VERSION,
        seq: this.seq++,
        timestamp: Date.now(),
        type,
        payload,
      })
    );
  }
}
