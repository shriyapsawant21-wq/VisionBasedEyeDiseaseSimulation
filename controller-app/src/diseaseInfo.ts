import type { Disease } from "../../relay/src/protocol";

export interface DiseaseInfo {
  disease: Disease;
  /** Short clinical abbreviation used on the selector buttons - nothing else. */
  shortLabel: string;
  clinicalLabel: string;
  description: string;
}

export const DISEASE_INFO: Record<Disease, DiseaseInfo> = {
  CENTRAL_BLUR: {
    disease: "CENTRAL_BLUR",
    shortLabel: "CNVM/DME/CME",
    clinicalLabel: "CNVM / DME / CME",
    description: "Central blurring that progresses toward a central scotoma - a blind spot in the middle of vision.",
  },
  METAMORPHOPSIA: {
    disease: "METAMORPHOPSIA",
    shortLabel: "CSCR",
    clinicalLabel: "Central Serous Chorioretinopathy (CSCR)",
    description: "Metamorphopsia - straight lines appear warped or wavy.",
  },
  TUNNEL_VISION: {
    disease: "TUNNEL_VISION",
    shortLabel: "RP",
    clinicalLabel: "Retinitis Pigmentosa (RP)",
    description: "Progressive loss of peripheral vision, narrowing the field of view to a central tunnel.",
  },
  RETINAL_DETACHMENT: {
    disease: "RETINAL_DETACHMENT",
    shortLabel: "RD",
    clinicalLabel: "Retinal Detachment (RD)",
    description: "Sudden flashes of light with a group of black floaters drifting across the field of view.",
  },
};

export const DISEASE_ORDER: Disease[] = ["CENTRAL_BLUR", "METAMORPHOPSIA", "TUNNEL_VISION", "RETINAL_DETACHMENT"];

export interface FloaterInfo {
  source: string;
  description: string;
}

/** Reference-only - not tied to any protocol command, just shown for context. */
export const FLOATER_TYPES: FloaterInfo[] = [
  { source: "PVD", description: "Weiss ring / single black floater" },
  { source: "Retinal Detachment (RD)", description: "Group of black floaters" },
  { source: "Normal", description: "Ghost floaters" },
];
