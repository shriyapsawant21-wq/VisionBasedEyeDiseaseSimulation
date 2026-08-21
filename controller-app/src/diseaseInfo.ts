import type { Disease } from "../../relay/src/protocol";

export interface DiseaseInfo {
  disease: Disease;
  /** Short clinical abbreviation used in the disease list - nothing else. */
  shortLabel: string;
  clinicalLabel: string;
  /** Short symptom name shown when the list item is expanded - no long description. */
  symptomName: string;
}

export const DISEASE_INFO: Record<Disease, DiseaseInfo> = {
  CENTRAL_BLUR: {
    disease: "CENTRAL_BLUR",
    shortLabel: "CNVM/DME/CME",
    clinicalLabel: "CNVM / DME / CME",
    symptomName: "Central blurring → Central scotoma",
  },
  METAMORPHOPSIA: {
    disease: "METAMORPHOPSIA",
    shortLabel: "CSCR",
    clinicalLabel: "Central Serous Chorioretinopathy (CSCR)",
    symptomName: "Metamorphopsia",
  },
  TUNNEL_VISION: {
    disease: "TUNNEL_VISION",
    shortLabel: "RP",
    clinicalLabel: "Retinitis Pigmentosa (RP)",
    symptomName: "Tunnel Vision",
  },
  RETINAL_DETACHMENT: {
    disease: "RETINAL_DETACHMENT",
    shortLabel: "RD",
    clinicalLabel: "Retinal Detachment (RD)",
    symptomName: "Group of black floaters, flash of light",
  },
};

export const DISEASE_ORDER: Disease[] = ["CENTRAL_BLUR", "METAMORPHOPSIA", "TUNNEL_VISION", "RETINAL_DETACHMENT"];

export interface FloaterInfo {
  source: string;
  description: string;
}

/**
 * Clinical reference data. Not rendered anywhere right now - the Floaters
 * section was removed from the UI - but kept for the Education tab.
 */
export const FLOATER_TYPES: FloaterInfo[] = [
  { source: "PVD", description: "Weiss ring / single black floater" },
  { source: "Retinal Detachment (RD)", description: "Group of black floaters" },
  { source: "Normal", description: "Ghost floaters" },
];
