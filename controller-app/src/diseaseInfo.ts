import type { Disease } from "../../relay/src/protocol";

export interface DiseaseInfo {
  disease: Disease;
  /** Short clinical abbreviation used in the disease list - nothing else. */
  shortLabel: string;
  clinicalLabel: string;
  /** Short symptom name shown on the control screen - no long description. */
  symptomName: string;
  /**
   * What SET_SEVERITY actually drives for this condition, so the slider is
   * labelled by its effect rather than a generic "severity".
   */
  severityLabel: string;
}

export const DISEASE_INFO: Record<Disease, DiseaseInfo> = {
  CENTRAL_BLUR: {
    disease: "CENTRAL_BLUR",
    shortLabel: "CNVM/DME/CME",
    clinicalLabel: "CNVM / DME / CME",
    symptomName: "Central Blurring",
    severityLabel: "Blur Intensity",
  },
  METAMORPHOPSIA: {
    disease: "METAMORPHOPSIA",
    shortLabel: "CSCR",
    clinicalLabel: "Central Serous Chorioretinopathy (CSCR)",
    symptomName: "Metamorphopsia",
    severityLabel: "Wave Intensity",
  },
  TUNNEL_VISION: {
    disease: "TUNNEL_VISION",
    shortLabel: "RP",
    clinicalLabel: "Retinitis Pigmentosa (RP)",
    symptomName: "Tunnel Vision",
    severityLabel: "Tunnel Radius",
  },
  PVD_WEISS_RING: {
    disease: "PVD_WEISS_RING",
    shortLabel: "PVD",
    clinicalLabel: "Posterior Vitreous Detachment (PVD)",
    symptomName: "Weiss Ring",
    severityLabel: "Ring Size",
  },
  PVD_DOT: {
    disease: "PVD_DOT",
    shortLabel: "PVD",
    clinicalLabel: "Posterior Vitreous Detachment (PVD)",
    symptomName: "Black Dot",
    severityLabel: "Dot Size",
  },
  RETINAL_DETACHMENT: {
    disease: "RETINAL_DETACHMENT",
    shortLabel: "RD",
    clinicalLabel: "Retinal Detachment (RD)",
    symptomName: "Black Floaters",
    severityLabel: "Floater Count",
  },
  GHOST_FLOATERS: {
    disease: "GHOST_FLOATERS",
    shortLabel: "Ghost Floaters",
    clinicalLabel: "Ghost Floaters",
    symptomName: "Ghost Worms",
    severityLabel: "Worm Count",
  },
};

/**
 * A card on the dashboard. Most map to a single condition; PVD carries two
 * floater variants behind one card.
 */
export interface DiseaseEntry {
  /** Stable key for the card - not a wire value when variants are present. */
  key: string;
  cardLabel: string;
  variants: Disease[];
  /**
   * Symptom names listed alongside the real variants but not selectable -
   * documented as part of the condition with no effect implemented yet.
   */
  inertVariants?: string[];
}

export const DISEASE_ENTRIES: DiseaseEntry[] = [
  { key: "CNVM", cardLabel: "CNVM/DME/CME", variants: ["CENTRAL_BLUR"] },
  { key: "CSCR", cardLabel: "CSCR", variants: ["METAMORPHOPSIA"] },
  { key: "RP", cardLabel: "RP", variants: ["TUNNEL_VISION"] },
  {
    key: "RD",
    cardLabel: "RD",
    variants: ["RETINAL_DETACHMENT"],
    inertVariants: ["Flashes", "Curtains"],
  },
];

/** Reached from the Floaters symptom box, not from the disease list. */
export const FLOATER_ENTRIES: DiseaseEntry[] = [
  { key: "PVD", cardLabel: "PVD", variants: ["PVD_WEISS_RING", "PVD_DOT"] },
  { key: "GHOST", cardLabel: "Ghost Floaters", variants: ["GHOST_FLOATERS"] },
];

export const ALL_ENTRIES: DiseaseEntry[] = [...DISEASE_ENTRIES, ...FLOATER_ENTRIES];
