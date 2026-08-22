import AsyncStorage from "@react-native-async-storage/async-storage";

const DISCLAIMER_KEY = "visionbridge.disclaimerAccepted";

export async function hasAcceptedDisclaimer(): Promise<boolean> {
  return (await AsyncStorage.getItem(DISCLAIMER_KEY)) === "true";
}

export async function setDisclaimerAccepted(): Promise<void> {
  await AsyncStorage.setItem(DISCLAIMER_KEY, "true");
}
