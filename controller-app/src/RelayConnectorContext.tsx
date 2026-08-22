import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RelayConnector, type ControllerState } from "./connector";
import type { Disease, DiseaseProgram, Comparison } from "../../relay/src/protocol";

// "sessionLost" is distinct from "disconnected": it means the socket closed
// (or the relay reported the peer left) while we were paired and the user
// didn't ask for that - RootNavigator routes it to ConnectionLost instead
// of back to Pairing. Whether a close counts as "lost" vs. an intentional
// "disconnected" is decided here via wasPairedRef, not by the navigator
// racing a screen's own navigation call.
export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "paired" | "sessionLost";

export interface ProtocolErrorInfo {
  code: string;
  message: string;
}

export interface RelayConnectorContextValue {
  status: ConnectionStatus;
  sessionId: string | null;
  controllerState: ControllerState | null;
  lastError: ProtocolErrorInfo | null;
  connect: (relayUrl: string) => void;
  disconnect: () => void;
  pairRequest: (sessionId: string, pairingToken: string) => void;
  setDisease: (disease: Disease) => void;
  setSeverity: (severity: number) => void;
  setComparison: (comparison: Comparison) => void;
  startProgression: (durationSeconds: number) => void;
  startDiseaseSimulation: (program: DiseaseProgram, durationSeconds: number) => void;
  pauseProgression: (paused?: boolean) => void;
  recenter: () => void;
  reset: () => void;
  endSession: () => void;
}

const RelayConnectorContext = createContext<RelayConnectorContextValue | null>(null);

// relayUrl is chosen at connect-time (not fixed at app startup) because the
// right value depends on where the app is running: an Android emulator
// reaches the host machine at 10.0.2.2, a real device on the same network
// needs the host's LAN IP, and a deployed build needs the production
// relay's wss:// URL. See PairingScreen for the actual input.
export function RelayConnectorProvider({ children }: { children: React.ReactNode }) {
  const connectorRef = useRef<RelayConnector | null>(null);
  const wasPairedRef = useRef(false);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [controllerState, setControllerState] = useState<ControllerState | null>(null);
  const [lastError, setLastError] = useState<ProtocolErrorInfo | null>(null);

  const connect = useCallback((relayUrl: string) => {
    wasPairedRef.current = false;
    setStatus("connecting");
    setLastError(null);
    const connector = new RelayConnector(relayUrl, {
      onOpen: () => setStatus("connected"),
      onClose: () => {
        connectorRef.current = null;
        setSessionId(null);
        setStatus(wasPairedRef.current ? "sessionLost" : "disconnected");
        wasPairedRef.current = false;
      },
      onSocketError: (err) => setLastError({ code: "socket_error", message: err.message }),
      onPaired: (id) => {
        wasPairedRef.current = true;
        setSessionId(id);
        setStatus("paired");
        // a failed attempt (expired code, wrong token) leaves an error behind;
        // clear it so a successful pair doesn't render "Connected" next to it
        setLastError(null);
      },
      onStateUpdated: (state) => setControllerState(state),
      onProtocolError: (code, message) => setLastError({ code, message }),
      onSessionEnded: () => {
        // just close - let onClose (fired asynchronously as a result) be
        // the single place that decides sessionLost vs. disconnected, so
        // wasPairedRef isn't cleared here and then raced by that same close.
        connectorRef.current?.close();
      },
    });
    connectorRef.current = connector;
    connector.connect();
  }, []);

  const disconnect = useCallback(() => {
    wasPairedRef.current = false;
    connectorRef.current?.close();
    connectorRef.current = null;
    setStatus("disconnected");
    setSessionId(null);
  }, []);

  useEffect(() => () => connectorRef.current?.close(), []);

  const value = useMemo<RelayConnectorContextValue>(
    () => ({
      status,
      sessionId,
      controllerState,
      lastError,
      connect,
      disconnect,
      pairRequest: (id, token) => connectorRef.current?.pairRequest(id, token),
      setDisease: (disease) => connectorRef.current?.setDisease(disease),
      setSeverity: (severity) => connectorRef.current?.setSeverity(severity),
      setComparison: (comparison) => connectorRef.current?.setComparison(comparison),
      startProgression: (durationSeconds) => connectorRef.current?.startProgression(durationSeconds),
      startDiseaseSimulation: (program, durationSeconds) =>
        connectorRef.current?.startDiseaseSimulation(program, durationSeconds),
      pauseProgression: (paused) => connectorRef.current?.pauseProgression(paused),
      recenter: () => connectorRef.current?.recenter(),
      reset: () => connectorRef.current?.reset(),
      endSession: () => connectorRef.current?.endSession(),
    }),
    [status, sessionId, controllerState, lastError, connect, disconnect]
  );

  return <RelayConnectorContext.Provider value={value}>{children}</RelayConnectorContext.Provider>;
}

export { RelayConnectorContext };
