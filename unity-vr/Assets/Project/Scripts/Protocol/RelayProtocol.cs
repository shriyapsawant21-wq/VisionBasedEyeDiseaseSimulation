namespace VisionSimulation.Protocol
{
    /// <summary>
    /// C# mirror of relay/src/protocol.ts, which is the source of truth for
    /// every message on the wire. Changes there must be reflected here by hand -
    /// route protocol changes through the relay owner rather than adding fields
    /// locally, because the relay validates every frame and rejects unknown
    /// shapes with an "invalid_message" error.
    /// </summary>
    public static class RelayProtocol
    {
        /// <summary>Must match PROTOCOL_VERSION in protocol.ts.</summary>
        public const int Version = 1;

        public const string RoleSimulation = "SIMULATION";
        public const string RoleController = "CONTROLLER";

        // Sent by this device.
        public const string Hello = "HELLO";
        public const string PairAccept = "PAIR_ACCEPT";
        public const string StateUpdated = "STATE_UPDATED";
        public const string Ping = "PING";

        // Received by this device.
        public const string SessionCreated = "SESSION_CREATED";
        public const string PairRequest = "PAIR_REQUEST";
        public const string Paired = "PAIRED";
        public const string Error = "ERROR";
        public const string EndSession = "END_SESSION";

        // Controller commands relayed to this device. Consumed by the garden
        // scene rather than the pairing flow, but named here so the mirror is
        // complete and callers never invent string literals.
        public const string SetDisease = "SET_DISEASE";
        public const string SetSeverity = "SET_SEVERITY";
        public const string SetComparison = "SET_COMPARISON";
        public const string StartProgression = "START_PROGRESSION";
        public const string StartDiseaseSimulation = "START_DISEASE_SIMULATION";
        public const string PauseProgression = "PAUSE_PROGRESSION";
        public const string SetScene = "SET_SCENE";
        public const string Recenter = "RECENTER";
        public const string Reset = "RESET";

        // DiseaseEnum values, one per VisionDisease member except None.
        // RETINAL_DETACHMENT drives the BlackFloaters effect: clinically the
        // presenting symptom is a shower of black floaters.
        public const string DiseaseMetamorphopsia = "METAMORPHOPSIA";
        public const string DiseaseCentralBlur = "CENTRAL_BLUR";
        public const string DiseaseTunnelVision = "TUNNEL_VISION";
        public const string DiseaseRetinalDetachment = "RETINAL_DETACHMENT";
        public const string DiseasePvdWeissRing = "PVD_WEISS_RING";
        public const string DiseasePvdDot = "PVD_DOT";
        public const string DiseaseGhostFloaters = "GHOST_FLOATERS";
        public const string DiseaseCentralScotoma = "CENTRAL_SCOTOMA";
        public const string DiseaseRetinalDetachmentFlash = "RD_FLASH";
        public const string DiseaseCurtainSign = "CURTAIN_SIGN";
        public const string DiseaseRedFloaters = "RED_FLOATERS";
        public const string DiseaseBloodStreak = "BLOOD_STREAK";

        // DiseaseProgramEnum values, one per case in
        // VisionEffectManager.ApplyDiseaseTimeline. Distinct from the Disease*
        // constants above: these name a scripted run, not a single effect.
        public const string ProgramRetinitisPigmentosa = "RP";
        public const string ProgramRhegmatogenousDetachment = "RRD";
        public const string ProgramCentralSerous = "CSCR";
        public const string ProgramDiabeticMacularEdema = "DR_DME";
        public const string ProgramChoroidalNeovascular = "CNVM";

        public const string ComparisonNormal = "NORMAL";
        public const string ComparisonAffected = "AFFECTED";

        public const string SceneGarden = "GARDEN";

        /// <summary>Relay rejects frames larger than this (MAX_MESSAGE_BYTES).</summary>
        public const int MaxMessageBytes = 8 * 1024;
    }
}
