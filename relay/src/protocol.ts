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
  "CENTRAL_SCOTOMA",
  "TUNNEL_VISION",
  "RETINAL_DETACHMENT",
  "PVD_WEISS_RING",
  "PVD_DOT",
  "GHOST_FLOATERS",
  "RED_FLOATERS",
  "BLOOD_STREAK",
  "RD_FLASH",
  "CURTAIN",
]);

export const ComparisonEnum = z.enum(["NORMAL", "AFFECTED"]);

export const SceneEnum = z.enum(["GARDEN"]);

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

export const PauseProgressionSchema = z.object({
  ...base,
  type: z.literal("PAUSE_PROGRESSION"),
  payload: z.object({}).optional(),
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

export const StateUpdatedSchema = z.object({
  ...base,
  type: z.literal("STATE_UPDATED"),
  payload: z.object({
    disease: DiseaseEnum,
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
export type Comparison = z.infer<typeof ComparisonEnum>;

/** Commands only a CONTROLLER is allowed to originate. */
export const CONTROLLER_ONLY_TYPES = new Set([
  "PAIR_REQUEST",
  "SET_DISEASE",
  "SET_SEVERITY",
  "SET_COMPARISON",
  "START_PROGRESSION",
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
