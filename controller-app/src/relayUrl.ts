import { Platform } from "react-native";

/**
 * Best-guess starting point for the relay URL field on the Pairing screen.
 * Always user-editable because the correct value depends on where the app
 * is actually running relative to the relay:
 *  - Android emulator: the AVD's alias for the host machine's loopback,
 *    10.0.2.2, NOT localhost (which would mean the emulator itself).
 *  - iOS simulator / web: localhost works directly.
 *  - A real device on the same network: needs the host machine's LAN IP.
 *  - A deployed build: needs the production relay's wss:// URL.
 */
export function defaultRelayUrl(): string {
  if (Platform.OS === "android") return "ws://10.0.2.2:8787";
  return "ws://localhost:8787";
}
