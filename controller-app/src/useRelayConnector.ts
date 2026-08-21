import { useContext } from "react";
import { RelayConnectorContext, type RelayConnectorContextValue } from "./RelayConnectorContext";

export function useRelayConnector(): RelayConnectorContextValue {
  const value = useContext(RelayConnectorContext);
  if (!value) {
    throw new Error("useRelayConnector must be used within a RelayConnectorProvider");
  }
  return value;
}
