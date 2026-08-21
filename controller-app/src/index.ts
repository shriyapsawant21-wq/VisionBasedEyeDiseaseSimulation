import { RelayConnector } from "./connector";

const RELAY_URL = process.env.RELAY_URL ?? "ws://localhost:8787";
const SESSION_ID = process.env.SESSION_ID ?? "";
const PAIRING_TOKEN = process.env.PAIRING_TOKEN ?? "";

const connector = new RelayConnector(RELAY_URL, {
  onOpen: () => {
    console.log("connected to relay, requesting pairing");
    connector.pairRequest(SESSION_ID, PAIRING_TOKEN);
  },
  onPaired: (sessionId) => {
    console.log("paired", sessionId);
  },
  onStateUpdated: (state) => {
    console.log("state", state);
  },
  onProtocolError: (code, message) => {
    console.error("relay error", code, message);
  },
  onClose: (code, reason) => {
    console.log("connection closed", code, reason);
  },
});

connector.connect();
