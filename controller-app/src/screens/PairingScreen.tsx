import { useEffect, useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useRelayConnector } from "../useRelayConnector";
import { defaultRelayUrl } from "../relayUrl";
import { OptionsButton } from "../components/OptionsButton";
import { SidePanel } from "../components/SidePanel";

type Props = NativeStackScreenProps<RootStackParamList, "Pairing">;

export function PairingScreen({ navigation }: Props) {
  const { status, lastError, connect, pairRequest } = useRelayConnector();
  const [relayUrl, setRelayUrl] = useState(defaultRelayUrl());
  const [sessionId, setSessionId] = useState("");
  const [pairingToken, setPairingToken] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);

  const busy = status === "connecting";

  function handlePair() {
    if (status === "connected") {
      // already have an open socket (e.g. a previous pair attempt failed) -
      // no need to reconnect, just retry the pairing request
      pairRequest(sessionId.trim().toUpperCase(), pairingToken.trim());
    } else {
      connect(relayUrl);
    }
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
      <View style={styles.header}>
        <Button title="Back" onPress={() => navigation.goBack()} />
        <Text style={styles.title}>VisionBridge</Text>
        <OptionsButton onPress={() => setPanelOpen(true)} />
      </View>

      <View style={styles.form}>
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
          title={busy ? "Connecting..." : status === "connected" ? "Retry pairing" : "Connect & pair"}
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

      <SidePanel visible={panelOpen} onClose={() => setPanelOpen(false)}>
        <Text style={styles.panelTitle}>Options</Text>
        <Button
          title="Scan QR Code"
          onPress={() => {
            setPanelOpen(false);
            navigation.navigate("QrScan");
          }}
        />
      </SidePanel>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  form: {
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
  panelTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
});
