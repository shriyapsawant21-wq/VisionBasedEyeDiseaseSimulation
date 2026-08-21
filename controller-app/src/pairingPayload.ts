export interface PairingPayload {
  sessionId: string;
  pairingToken: string;
  relayUrl?: string;
}

function validRelayUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;

  try {
    const parsed = new URL(value);
    return (parsed.protocol === "ws:" || parsed.protocol === "wss:") && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

/** Decode both current (v2) and legacy (v1) VisionBridge pairing codes. */
export function decodePairingPayload(raw: string): PairingPayload | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    const value = parsed as Record<string, unknown>;
    if (
      typeof value.sessionId !== "string" ||
      !value.sessionId.trim() ||
      typeof value.pairingToken !== "string" ||
      !value.pairingToken
    ) {
      return null;
    }

    if (value.relayUrl !== undefined && !validRelayUrl(value.relayUrl)) return null;

    return {
      sessionId: value.sessionId.trim().toUpperCase(),
      pairingToken: value.pairingToken,
      relayUrl: value.relayUrl as string | undefined,
    };
  } catch {
    return null;
  }
}
