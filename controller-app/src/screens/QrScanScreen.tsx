import { useEffect, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useRelayConnector } from "../useRelayConnector";
import { defaultRelayUrl } from "../relayUrl";

type Props = NativeStackScreenProps<RootStackParamList, "QrScan">;

interface PairingPayload {
  sessionId: string;
  pairingToken: string;
}

/**
 * Decodes a QR payload into { sessionId, pairingToken }. Placeholder shape
 * ({"sessionId":"...","pairingToken":"..."} as JSON) - MUST be confirmed
 * against whatever Unity's Pairing.unity scene actually encodes in its QR
 * code before this is real. Screen navigation and permission handling
 * around it are complete either way.
 */
function decodePairingPayload(raw: string): PairingPayload | null {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.sessionId === "string" && typeof parsed.pairingToken === "string") {
      return { sessionId: parsed.sessionId, pairingToken: parsed.pairingToken };
    }
  } catch {
    // not JSON - fall through
  }
  return null;
}

export function QrScanScreen({ navigation }: Props) {
  const { status, lastError, connect, pairRequest } = useRelayConnector();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [pending, setPending] = useState<PairingPayload | null>(null);

  function handleScanned(raw: string) {
    if (scanned) return;
    setScanned(true);

    const payload = decodePairingPayload(raw);
    if (!payload) {
      setDecodeError("Unrecognized QR code - expected a VisionBridge pairing code.");
      setScanned(false);
      return;
    }

    setDecodeError(null);
    setPending(payload);
    connect(defaultRelayUrl());
  }

  // same connect-then-pair pattern as PairingScreen's manual entry flow
  useEffect(() => {
    if (status === "connected" && pending) {
      pairRequest(pending.sessionId, pending.pairingToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // let the user rescan if pairing the scanned code failed
  useEffect(() => {
    if (lastError && pending) {
      setPending(null);
      setScanned(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastError]);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Camera access is needed to scan the pairing QR code.</Text>
        <Button title="Grant camera access" onPress={requestPermission} />
        <Button title="Back" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={scanned ? undefined : ({ data }) => handleScanned(data)}
      />
      <View style={styles.overlay}>
        {decodeError ? <Text style={styles.error}>{decodeError}</Text> : null}
        {lastError ? (
          <Text style={styles.error}>
            {lastError.code}: {lastError.message}
          </Text>
        ) : null}
        <Button title="Cancel" onPress={() => navigation.goBack()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    padding: 24,
  },
  message: {
    color: "#fff",
    textAlign: "center",
  },
  overlay: {
    position: "absolute",
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 8,
  },
  error: {
    color: "#ff6b6b",
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 8,
  },
});
