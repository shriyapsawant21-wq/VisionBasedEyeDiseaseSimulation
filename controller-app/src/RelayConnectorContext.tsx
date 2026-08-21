import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RelayConnector, type ControllerState } from "./connector";
import type { Disease, Comparison } from "../../relay/src/protocol";

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "paired";

export interface ProtocolErrorInfo {
  code: string;
  message: string;
}

export interface RelayConnectorContextValue {
  status: ConnectionStatus;
  sessionId: string | null;
  controllerState: ControllerState | null;
  lastError: ProtocolErrorInfo | null;
  connect: () => void;
  disconnect: () => void;
  pairRequest: (sessionId: string, pairingToken: string) => void;
  setDisease: (disease: Disease) => void;
  setSeverity: (severity: number) => void;
  setComparison: (comparison: Comparison) => void;
  startProgression: (durationSeconds: number) => void;
  pauseProgression: () => void;
  recenter: () => void;
  reset: () => void;
  endSession: () => void;
}

const RelayConnectorContext = createContext<RelayConnectorContextValue | null>(null);

export function RelayConnectorProvider({
  relayUrl,
  children,
}: {
  relayUrl: string;
  children: React.ReactNode;
}) {
  const connectorRef = useRef<RelayConnector | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [controllerState, setControllerState] = useState<ControllerState | null>(null);
  const [lastError, setLastError] = useState<ProtocolErrorInfo | null>(null);

  const connect = useCallback(() => {
    setStatus("connecting");
    setLastError(null);
    const connector = new RelayConnector(relayUrl, {
      onOpen: () => setStatus("connected"),
      onClose: () => {
        setStatus("disconnected");
        setSessionId(null);
      },
      onSocketError: (err) => setLastError({ code: "socket_error", message: err.message }),
      onPaired: (id) => {
        setSessionId(id);
        setStatus("paired");
      },
      onStateUpdated: (state) => setControllerState(state),
      onProtocolError: (code, message) => setLastError({ code, message }),
    });
    connectorRef.current = connector;
    connector.connect();
  }, [relayUrl]);

  const disconnect = useCallback(() => {
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
      pauseProgression: () => connectorRef.current?.pauseProgression(),
      recenter: () => connectorRef.current?.recenter(),
      reset: () => connectorRef.current?.reset(),
      endSession: () => connectorRef.current?.endSession(),
    }),
    [status, sessionId, controllerState, lastError, connect, disconnect]
  );

  return <RelayConnectorContext.Provider value={value}>{children}</RelayConnectorContext.Provider>;
}

export { RelayConnectorContext };
