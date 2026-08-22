import { z } from "zod";

/**
 * Single source of truth for every message the relay accepts or emits.
 * Mirror this shape in controller-app (TS import) and unity-vr (C# by hand).
 */

export const PROTOCOL_VERSION = 1 as const;

/**
 * One value per simulated condition, mirroring unity-vr's VisionDisease enum
 * 1:1 (minus its None member). The floater conditions are distinct values
 * rather than one value plus a variant field because Unity's FloatersEffect
 * renders exactly one FloaterType at a time.
 *
 * severity (SET_SEVERITY) means whatever that condition's effect maps it to:
 * blur amount, warp strength, clear radius, floater size, or floater count.
 */
export const DiseaseEnum = z.enum([
  "METAMORPHOPSIA",
  "CENTRAL_BLUR",
  "TUNNEL_VISION",
  "RETINAL_DETACHMENT",
  "PVD_WEISS_RING",
  "PVD_DOT",
  "GHOST_FLOATERS",
  "CENTRAL_SCOTOMA",
  "RD_FLASH",
  "CURTAIN_SIGN",
  "RED_FLOATERS",
  "BLOOD_STREAK",
]);

/**
 * A scripted disease *program*, distinct from DiseaseEnum: a DiseaseEnum value
 * is a single effect held at whatever SET_SEVERITY says, whereas a program is a
 * timed run in which several effects appear and intensify in a clinically
 * meaningful order. These values are the cases Unity's
 * VisionEffectManager.ApplyDiseaseTimeline switches on, so they must stay 1:1
 * with it - they are not interchangeable with DiseaseEnum.
 */
export const DiseaseProgramEnum = z.enum([
  "RP",
  "RRD",
  "CSCR",
  "DR_DME",
  "CNVM",
]);

export const ComparisonEnum = z.enum(["NORMAL", "AFFECTED"]);

export const SceneEnum = z.enum(["GARDEN", "HOSPITAL"]);

const base = {
  v: z.literal(PROTOCOL_VERSION),
  seq: z.number().int().nonnegative(),
  timestamp: z.number().int().nonnegative(),
};

// ---- Client -> Relay -> Client commands -------------------------------

export const HelloSchema = z.object({
  ...base,
  type: z.literal("HELLO"),
  payload: z.object({
    role: z.enum(["SIMULATION", "CONTROLLER"]),
  }),
});

export const PairRequestSchema = z.object({
  ...base,
  type: z.literal("PAIR_REQUEST"),
  payload: z.object({
    sessionId: z.string().length(6),
    pairingToken: z.string().min(16).max(128),
  }),
});

export const PairAcceptSchema = z.object({
  ...base,
  type: z.literal("PAIR_ACCEPT"),
  payload: z.object({
    accepted: z.boolean(),
  }),
});

export const SetDiseaseSchema = z.object({
  ...base,
  type: z.literal("SET_DISEASE"),
  payload: z.object({
    disease: DiseaseEnum,
  }),
});

export const SetSeveritySchema = z.object({
  ...base,
  type: z.literal("SET_SEVERITY"),
  payload: z.object({
    severity: z.number().min(0).max(1),
  }),
});

export const SetComparisonSchema = z.object({
  ...base,
  type: z.literal("SET_COMPARISON"),
  payload: z.object({
    comparison: ComparisonEnum,
  }),
});

export const StartProgressionSchema = z.object({
  ...base,
  type: z.literal("START_PROGRESSION"),
  payload: z.object({
    durationSeconds: z.number().positive().max(600),
  }),
});

/**
 * Plays a scripted program on the headset from t=0. Re-sending it restarts the
 * run, which is what the controller's Reset does - there is no separate
 * "rewind" command because a program has no meaningful state to rewind to.
 */
export const StartDiseaseSimulationSchema = z.object({
  ...base,
  type: z.literal("START_DISEASE_SIMULATION"),
  payload: z.object({
    program: DiseaseProgramEnum,
    durationSeconds: z.number().positive().max(600),
  }),
});

/**
 * Halts an in-flight run in place, or resumes it from where it stopped.
 * `paused` is required rather than defaulted: Unity parses payloads with
 * JsonUtility, which cannot tell an absent bool from an explicit `false`, so
 * an optional field here would silently read as "resume" on the headset.
 */
export const PauseProgressionSchema = z.object({
  ...base,
  type: z.literal("PAUSE_PROGRESSION"),
  payload: z.object({
    paused: z.boolean(),
  }),
});

export const SetSceneSchema = z.object({
  ...base,
  type: z.literal("SET_SCENE"),
  payload: z.object({
    scene: SceneEnum,
  }),
});

export const RecenterSchema = z.object({
  ...base,
  type: z.literal("RECENTER"),
  payload: z.object({}).optional(),
});

export const ResetSchema = z.object({
  ...base,
  type: z.literal("RESET"),
  payload: z.object({}).optional(),
});

export const PingSchema = z.object({
  ...base,
  type: z.literal("PING"),
  payload: z.object({}).optional(),
});

export const EndSessionSchema = z.object({
  ...base,
  type: z.literal("END_SESSION"),
  payload: z.object({}).optional(),
});

/**
 * DiseaseEnum plus "NONE", used only for reporting current state back - never
 * accepted as a SET_DISEASE payload, where "pick nothing" is meaningless. Kept
 * distinct from DiseaseEnum instead of adding NONE there directly, so the two
 * message directions can't be confused with each other.
 */
export const StateDiseaseEnum = z.enum([...DiseaseEnum.options, "NONE"]);

export const StateUpdatedSchema = z.object({
  ...base,
  type: z.literal("STATE_UPDATED"),
  payload: z.object({
    disease: StateDiseaseEnum,
    severity: z.number().min(0).max(1),
    comparison: ComparisonEnum,
    scene: SceneEnum,
  }),
});

// ---- Messages the RELAY itself originates (not forwarded, generated) ---

export const SessionCreatedSchema = z.object({
  ...base,
  type: z.literal("SESSION_CREATED"),
  payload: z.object({
    sessionId: z.string().length(6),
    pairingToken: z.string(),
    expiresAt: z.number().int().nonnegative(),
  }),
});

export const PairedSchema = z.object({
  ...base,
  type: z.literal("PAIRED"),
  payload: z.object({
    sessionId: z.string().length(6),
  }),
});

export const ErrorSchema = z.object({
  ...base,
  type: z.literal("ERROR"),
  payload: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

// ---- Unions --------------------------------------------------------------

/** Every message type a client (Unity or controller) may send to the relay. */
export const ClientMessageSchema = z.discriminatedUnion("type", [
  HelloSchema,
  PairRequestSchema,
  PairAcceptSchema,
  SetDiseaseSchema,
  SetSeveritySchema,
  SetComparisonSchema,
  StartProgressionSchema,
  StartDiseaseSimulationSchema,
  PauseProgressionSchema,
  SetSceneSchema,
  RecenterSchema,
  ResetSchema,
  PingSchema,
  EndSessionSchema,
  StateUpdatedSchema,
]);

export type ClientMessage = z.infer<typeof ClientMessageSchema>;
export type Disease = z.infer<typeof DiseaseEnum>;
export type StateDisease = z.infer<typeof StateDiseaseEnum>;
export type DiseaseProgram = z.infer<typeof DiseaseProgramEnum>;
export type Scene = z.infer<typeof SceneEnum>;
export type Comparison = z.infer<typeof ComparisonEnum>;

/** Commands only a CONTROLLER is allowed to originate. */
export const CONTROLLER_ONLY_TYPES = new Set([
  "PAIR_REQUEST",
  "SET_DISEASE",
  "SET_SEVERITY",
  "SET_COMPARISON",
  "START_PROGRESSION",
  "START_DISEASE_SIMULATION",
  "PAUSE_PROGRESSION",
  "SET_SCENE",
  "RECENTER",
  "RESET",
  "END_SESSION",
]);

/** Commands only the SIMULATION (Unity) device is allowed to originate. */
export const SIMULATION_ONLY_TYPES = new Set([
  "PAIR_ACCEPT",
  "STATE_UPDATED",
]);

/** Heartbeat: allowed from either paired role, never forwarded to the peer. */
export const EITHER_ROLE_TYPES = new Set(["PING"]);

export const MAX_MESSAGE_BYTES = 8 * 1024;
