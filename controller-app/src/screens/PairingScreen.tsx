import { useEffect, useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";
import { useRelayConnector } from "../useRelayConnector";
import { defaultRelayUrl } from "../relayUrl";

/**
 * Unstyled placeholder for Phase 2 - proves the pairing state machine
 * works via manual code entry. QR scanning + real visual design lands in
 * Phase 3, replacing this screen's body without touching the wiring below.
 */
export function PairingScreen() {
  const { status, lastError, connect, pairRequest } = useRelayConnector();
  const [relayUrl, setRelayUrl] = useState(defaultRelayUrl());
  const [sessionId, setSessionId] = useState("");
  const [pairingToken, setPairingToken] = useState("");

  const busy = status === "connecting" || status === "connected";

  function handlePair() {
    connect(relayUrl);
  }

  // once the socket is open, send the pairing request the user typed in
  useEffect(() => {
    if (status === "connected" && sessionId && pairingToken) {
      pairRequest(sessionId.trim().toUpperCase(), pairingToken.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Relay URL</Text>
      <TextInput
        style={styles.input}
        value={relayUrl}
        onChangeText={setRelayUrl}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!busy}
      />

      <Text style={styles.label}>Session code</Text>
      <TextInput
        style={styles.input}
        value={sessionId}
        onChangeText={setSessionId}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={6}
        editable={!busy}
        placeholder="e.g. AB12CD"
      />

      <Text style={styles.label}>Pairing token</Text>
      <TextInput
        style={styles.input}
        value={pairingToken}
        onChangeText={setPairingToken}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!busy}
      />

      <Button
        title={busy ? "Connecting..." : "Connect & pair"}
        onPress={handlePair}
        disabled={busy || !sessionId || !pairingToken}
      />

      <Text style={styles.status}>status: {status}</Text>
      {lastError ? (
        <Text style={styles.error}>
          {lastError.code}: {lastError.message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    gap: 4,
  },
  label: {
    marginTop: 12,
    fontWeight: "bold",
  },
  input: {
    borderWidth: 1,
    borderColor: "#999",
    padding: 8,
    marginTop: 4,
  },
  status: {
    marginTop: 16,
  },
  error: {
    marginTop: 8,
    color: "red",
  },
});
