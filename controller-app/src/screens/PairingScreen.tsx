import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useRelayConnector } from "../useRelayConnector";
import { defaultRelayUrl } from "../relayUrl";
import { colors, spacing, type } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Pairing">;

interface PairingPayload {
  sessionId: string;
  pairingToken: string;
}

/**
 * Decodes a QR payload into { sessionId, pairingToken }. Placeholder shape
 * ({"sessionId":"...","pairingToken":"..."} as JSON) - MUST be confirmed
 * against whatever Unity's Pairing.unity scene actually encodes in its QR
 * code before this is real. Screen/permission handling around it is
 * complete either way.
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

export function PairingScreen({ navigation }: Props) {
  const { status, lastError, connect, pairRequest } = useRelayConnector();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [pending, setPending] = useState<PairingPayload | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [pairingToken, setPairingToken] = useState("");
  const [relayUrl, setRelayUrl] = useState(defaultRelayUrl());

  const busy = status === "connecting";
  const showingConnection = status === "connected" || status === "paired" || pending !== null;

  function handleScanned(raw: string) {
    if (scanned) return;
    setScanned(true);

    const payload = decodePairingPayload(raw);
    if (!payload) {
      setDecodeError("Unrecognized QR code - expected a VisionSim VR pairing code.");
      setScanned(false);
      return;
    }

    setDecodeError(null);
    setPending(payload);
    setSessionId(payload.sessionId);
    connect(relayUrl);
  }

  function handleManualConnect() {
    if (status === "connected") {
      pairRequest(sessionId.trim().toUpperCase(), pairingToken.trim());
    } else {
      setPending({ sessionId: sessionId.trim().toUpperCase(), pairingToken: pairingToken.trim() });
      connect(relayUrl);
    }
  }

  // fires the pairing request once the socket opens, whichever path (scan
  // or manual entry) put a pending code in place
  useEffect(() => {
    if (status === "connected" && pending) {
      pairRequest(pending.sessionId, pending.pairingToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // let the user rescan/retry if pairing the pending code failed
  useEffect(() => {
    if (lastError && pending) {
      setPending(null);
      setScanned(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastError]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable style={styles.backBox} onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Pairing</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.scannerPanel}>
        <View style={styles.statusRow}>
          <Text style={styles.statusChip}>Scanner Active</Text>
          <View style={styles.sensorChip}>
            <View style={styles.sensorDot} />
            <Text style={styles.sensorChipText}>Optical Sensor Ready</Text>
          </View>
        </View>

        <View style={styles.viewfinder}>
          {permission?.granted ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={scanned ? undefined : ({ data }) => handleScanned(data)}
            />
          ) : (
            <View style={styles.permissionPrompt}>
              <Text style={styles.permissionText}>Camera access is needed to scan the pairing code.</Text>
              <Pressable style={styles.permissionButton} onPress={requestPermission}>
                <Text style={styles.permissionButtonText}>Grant camera access</Text>
              </Pressable>
            </View>
          )}

          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <View style={[styles.bracket, styles.bracketTopLeft]} />
            <View style={[styles.bracket, styles.bracketTopRight]} />
            <View style={[styles.bracket, styles.bracketBottomLeft]} />
            <View style={[styles.bracket, styles.bracketBottomRight]} />
            <View style={styles.scanLine} />
            <View style={styles.reticle} />
          </View>
        </View>
      </View>

      {showingConnection ? (
        <View style={styles.connectionSection}>
          <Text style={styles.sessionLabel}>Session ID</Text>
          <Text style={styles.sessionValue}>{sessionId || "-"}</Text>
          <Text style={styles.waitingLabel}>
            {status === "paired" ? "Paired" : busy ? "Connecting..." : "Waiting for Approval..."}
          </Text>
        </View>
      ) : null}

      {decodeError ? <Text style={styles.errorText}>{decodeError}</Text> : null}
      {lastError ? (
        <Text style={styles.errorText}>
          {lastError.code}: {lastError.message}
        </Text>
      ) : null}

      <View style={styles.manualSection}>
        <Text style={styles.manualLabel}>Relay URL</Text>
        <TextInput
          style={styles.manualInput}
          value={relayUrl}
          onChangeText={setRelayUrl}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="ws://<laptop-ip>:8787"
          placeholderTextColor={colors.textMuted}
          editable={!busy}
        />

        <Text style={styles.manualLabel}>Enter code manually</Text>
        <View style={styles.manualRow}>
          <TextInput
            style={styles.manualInput}
            value={sessionId}
            onChangeText={setSessionId}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            placeholder="Enter 6-character code"
            placeholderTextColor={colors.textMuted}
            editable={!busy}
          />
          <Pressable
            style={[styles.connectButton, (busy || !sessionId || !pairingToken) && styles.disabled]}
            disabled={busy || !sessionId || !pairingToken}
            onPress={handleManualConnect}
          >
            <Text style={styles.connectButtonText}>Connect</Text>
          </Pressable>
        </View>
        <TextInput
          style={styles.manualInput}
          value={pairingToken}
          onChangeText={setPairingToken}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Pairing token"
          placeholderTextColor={colors.textMuted}
          editable={!busy}
        />
      </View>
    </View>
  );
}

const BRACKET = 26;
const BRACKET_WEIGHT = 2;
const BRACKET_INSET = 14;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.offWhiteDeep,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  backBox: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: colors.charcoal,
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: {
    fontSize: 20,
    color: colors.charcoal,
  },
  headerTitle: {
    ...type.sectionLabel,
    fontSize: 15,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: colors.deepRed,
  },
  scannerPanel: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.deepRed,
    padding: spacing.md,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  statusChip: {
    ...type.sectionLabel,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: colors.sand,
  },
  sensorChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.charcoal,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
  },
  sensorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.teal,
  },
  sensorChipText: {
    ...type.sectionLabel,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: colors.offWhite,
  },
  viewfinder: {
    height: 240,
    backgroundColor: colors.charcoal,
    overflow: "hidden",
  },
  bracket: {
    position: "absolute",
    width: BRACKET,
    height: BRACKET,
    borderColor: colors.offWhite,
  },
  bracketTopLeft: {
    top: BRACKET_INSET,
    left: BRACKET_INSET,
    borderTopWidth: BRACKET_WEIGHT,
    borderLeftWidth: BRACKET_WEIGHT,
  },
  bracketTopRight: {
    top: BRACKET_INSET,
    right: BRACKET_INSET,
    borderTopWidth: BRACKET_WEIGHT,
    borderRightWidth: BRACKET_WEIGHT,
  },
  bracketBottomLeft: {
    bottom: BRACKET_INSET,
    left: BRACKET_INSET,
    borderBottomWidth: BRACKET_WEIGHT,
    borderLeftWidth: BRACKET_WEIGHT,
  },
  bracketBottomRight: {
    bottom: BRACKET_INSET,
    right: BRACKET_INSET,
    borderBottomWidth: BRACKET_WEIGHT,
    borderRightWidth: BRACKET_WEIGHT,
  },
  scanLine: {
    position: "absolute",
    left: BRACKET_INSET,
    right: BRACKET_INSET,
    top: "50%",
    height: 1,
    backgroundColor: colors.offWhite,
  },
  reticle: {
    position: "absolute",
    alignSelf: "center",
    top: "50%",
    marginTop: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.sand,
  },
  permissionPrompt: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.md,
  },
  permissionText: {
    ...type.body,
    color: colors.offWhite,
    textAlign: "center",
  },
  permissionButton: {
    backgroundColor: colors.coral,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  permissionButtonText: {
    ...type.button,
    color: colors.white,
  },
  connectionSection: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.charcoal,
  },
  sessionLabel: {
    ...type.sectionLabel,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: colors.sand,
  },
  sessionValue: {
    ...type.title,
    color: colors.offWhite,
    marginTop: spacing.xs,
  },
  waitingLabel: {
    ...type.sectionLabel,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: colors.sand,
    marginTop: spacing.sm,
  },
  errorText: {
    marginTop: spacing.sm,
    marginHorizontal: spacing.lg,
    color: colors.deepRed,
  },
  manualSection: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  manualLabel: {
    ...type.sectionLabel,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: colors.textMuted,
  },
  manualRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  manualInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    color: colors.charcoal,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  connectButton: {
    backgroundColor: colors.deepRed,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
  },
  connectButtonText: {
    ...type.button,
    color: colors.offWhite,
  },
  disabled: {
    opacity: 0.4,
  },
});
