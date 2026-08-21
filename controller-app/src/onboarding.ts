import AsyncStorage from "@react-native-async-storage/async-storage";

const DISCLAIMER_KEY = "visionbridge.disclaimerAccepted";
const ROLE_KEY = "visionbridge.role";

export type Role = "DOCTOR_CONTROLLER" | "SIMULATION_DEVICE";

export async function hasAcceptedDisclaimer(): Promise<boolean> {
  return (await AsyncStorage.getItem(DISCLAIMER_KEY)) === "true";
}

export async function setDisclaimerAccepted(): Promise<void> {
  await AsyncStorage.setItem(DISCLAIMER_KEY, "true");
}

export async function getStoredRole(): Promise<Role | null> {
  return (await AsyncStorage.getItem(ROLE_KEY)) as Role | null;
}

export async function setStoredRole(role: Role): Promise<void> {
  await AsyncStorage.setItem(ROLE_KEY, role);
}
