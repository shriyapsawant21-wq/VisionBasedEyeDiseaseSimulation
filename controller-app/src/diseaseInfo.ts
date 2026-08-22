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
  CENTRAL_SCOTOMA: {
    disease: "CENTRAL_SCOTOMA",
    shortLabel: "Central Scotoma",
    clinicalLabel: "Central Scotoma",
    symptomName: "Central Scotoma",
    severityLabel: "Scotoma Size",
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
  RED_FLOATERS: {
    disease: "RED_FLOATERS",
    shortLabel: "Red Floaters",
    clinicalLabel: "Vitreous Haemorrhage",
    symptomName: "Red Floaters / Blood Streaks",
    severityLabel: "Streak Density",
  },
  RD_FLASH: {
    disease: "RD_FLASH",
    shortLabel: "Flashes",
    clinicalLabel: "Photopsia (RD Flashes)",
    symptomName: "Flashes",
    severityLabel: "Flash Intensity",
  },
  CURTAIN: {
    disease: "CURTAIN",
    shortLabel: "Curtain",
    clinicalLabel: "Curtain / Shadow (RD)",
    symptomName: "Curtain",
    severityLabel: "Curtain Coverage",
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

/**
 * The Symptoms tab: each symptom on its own, driven manually. Floaters is the
 * only one with sub-types, so it opens a second list; the rest go straight to
 * the control screen.
 */
export const SYMPTOM_ENTRIES: DiseaseEntry[] = [
  { key: "CENTRAL_BLUR", cardLabel: "Central Blurring", variants: ["CENTRAL_BLUR"] },
  { key: "CENTRAL_SCOTOMA", cardLabel: "Central Scotoma", variants: ["CENTRAL_SCOTOMA"] },
  { key: "METAMORPHOPSIA", cardLabel: "Metamorphopsia", variants: ["METAMORPHOPSIA"] },
  { key: "TUNNEL_VISION", cardLabel: "Tunnel Vision", variants: ["TUNNEL_VISION"] },
  { key: "RD_FLASH", cardLabel: "RD Flash", variants: ["RD_FLASH"] },
  { key: "CURTAIN", cardLabel: "Curtain", variants: ["CURTAIN"] },
];

/** The floater types, reached from the Floaters entry. */
export const FLOATER_ENTRIES: DiseaseEntry[] = [
  { key: "WEISS_RING", cardLabel: "Weiss Ring", variants: ["PVD_WEISS_RING"] },
  { key: "BLACK_DOT", cardLabel: "Black Dot", variants: ["PVD_DOT"] },
  { key: "GHOST_WORMS", cardLabel: "Ghost Worms", variants: ["GHOST_FLOATERS"] },
  { key: "BLACK_FLOATERS", cardLabel: "Black Floaters", variants: ["RETINAL_DETACHMENT"] },
  { key: "RED_FLOATERS", cardLabel: "Red Floater / Blood Streak", variants: ["RED_FLOATERS"] },
];

export const ALL_ENTRIES: DiseaseEntry[] = [
  ...DISEASE_ENTRIES,
  ...SYMPTOM_ENTRIES,
  ...FLOATER_ENTRIES,
];

// ---- Diseases tab ------------------------------------------------------

/**
 * One step of a disease run. `adds` names only what this step introduces:
 * everything an earlier step turned on stays on for the rest of the run, so
 * the accumulated picture is derived rather than repeated at every step.
 */
export interface ProgressionStage {
  /** Seconds into the run at which this stage begins. */
  at: number;
  label: string;
  adds: Disease[];
  /** Where this stage settles on the 0-1 severity scale. */
  severity: number;
  /**
   * Terminal stage - vision is gone, so nothing is layered on top and the
   * accumulated symptom list stops being meaningful.
   */
  blackout?: boolean;
}

/**
 * A disease is a timed run, not a slider: the point is that symptoms stack up
 * in a particular order, which a single intensity control cannot show.
 */
export interface DiseaseProgram {
  key: string;
  cardLabel: string;
  clinicalLabel: string;
  durationSeconds: number;
  stages: ProgressionStage[];
}

export const DISEASE_PROGRAMS: DiseaseProgram[] = [
  {
    key: "RP",
    cardLabel: "RP",
    clinicalLabel: "Retinitis Pigmentosa",
    durationSeconds: 30,
    stages: [
      { at: 0, label: "Peripheral dimming", adds: ["TUNNEL_VISION"], severity: 0.25 },
      { at: 8, label: "Ring scotoma tightens", adds: [], severity: 0.5 },
      { at: 16, label: "Narrow tunnel", adds: [], severity: 0.75 },
      { at: 24, label: "Pinhole vision", adds: [], severity: 0.95 },
    ],
  },
  {
    key: "RRD",
    cardLabel: "RRD",
    clinicalLabel: "Rhegmatogenous Retinal Detachment",
    durationSeconds: 30,
    stages: [
      { at: 0, label: "Black floaters appear", adds: ["RETINAL_DETACHMENT"], severity: 0.3 },
      { at: 6, label: "Weiss ring detaches", adds: ["PVD_WEISS_RING"], severity: 0.4 },
      { at: 12, label: "Floater shower with flashes", adds: ["RD_FLASH"], severity: 0.6 },
      { at: 19, label: "Curtain advances", adds: ["CURTAIN"], severity: 0.8 },
      { at: 26, label: "Permanent blindness", adds: [], severity: 1, blackout: true },
    ],
  },
  {
    key: "CSCR",
    cardLabel: "CSCR",
    clinicalLabel: "Central Serous Chorioretinopathy",
    durationSeconds: 30,
    stages: [
      { at: 0, label: "Faint distortion", adds: ["METAMORPHOPSIA"], severity: 0.25 },
      { at: 10, label: "Central warping", adds: [], severity: 0.55 },
      { at: 20, label: "Marked metamorphopsia", adds: [], severity: 0.85 },
    ],
  },
  {
    key: "DR",
    cardLabel: "DR (DME)",
    clinicalLabel: "Diabetic Retinopathy / Diabetic Macular Edema",
    durationSeconds: 30,
    stages: [
      { at: 0, label: "Central blurring", adds: ["CENTRAL_BLUR"], severity: 0.3 },
      { at: 6, label: "Ring PVD forms", adds: ["PVD_WEISS_RING"], severity: 0.4 },
      { at: 13, label: "Red floaters / blood streaks", adds: ["RED_FLOATERS"], severity: 0.6 },
      { at: 20, label: "Flashes begin", adds: ["RD_FLASH"], severity: 0.8 },
      { at: 26, label: "Blackout", adds: [], severity: 1, blackout: true },
    ],
  },
  {
    key: "CNVM",
    cardLabel: "CNVM",
    clinicalLabel: "Choroidal Neovascular Membrane",
    durationSeconds: 30,
    stages: [
      { at: 0, label: "Central blurring", adds: ["CENTRAL_BLUR"], severity: 0.3 },
      { at: 7, label: "Blur deepens", adds: [], severity: 0.6 },
      { at: 14, label: "Blur converts to scotoma", adds: ["CENTRAL_SCOTOMA"], severity: 0.5 },
      { at: 21, label: "Scotoma enlarges", adds: [], severity: 0.8 },
      { at: 26, label: "Metamorphopsia at scotoma border", adds: ["METAMORPHOPSIA"], severity: 0.6 },
    ],
  },
];

export function findProgram(key: string): DiseaseProgram | undefined {
  return DISEASE_PROGRAMS.find((program) => program.key === key);
}

/**
 * Everything switched on by the time `elapsed` is reached, in the order it
 * arrived. Returns nothing past a blackout stage: there is no vision left to
 * layer symptoms onto.
 */
export function activeSymptomsAt(program: DiseaseProgram, elapsed: number): Disease[] {
  const seen: Disease[] = [];
  for (const stage of program.stages) {
    if (elapsed < stage.at) break;
    if (stage.blackout) return [];
    for (const disease of stage.adds) {
      if (!seen.includes(disease)) seen.push(disease);
    }
  }
  return seen;
}
