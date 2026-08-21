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
        public const string PauseProgression = "PAUSE_PROGRESSION";
        public const string SetScene = "SET_SCENE";
        public const string Recenter = "RECENTER";
        public const string Reset = "RESET";

        // DiseaseEnum values. This is a four-value enum on the wire while
        // Unity's VisionDisease has eight members: the floater variants have no
        // wire counterpart and RETINAL_DETACHMENT has no effect implemented.
        // Reconciling the two taxonomies is an open team decision and is
        // deliberately not resolved here, because it changes the shared schema.
        public const string DiseaseMetamorphopsia = "METAMORPHOPSIA";
        public const string DiseaseCentralBlur = "CENTRAL_BLUR";
        public const string DiseaseTunnelVision = "TUNNEL_VISION";
        public const string DiseaseRetinalDetachment = "RETINAL_DETACHMENT";

        public const string ComparisonNormal = "NORMAL";
        public const string ComparisonAffected = "AFFECTED";

        public const string SceneGarden = "GARDEN";

        /// <summary>Relay rejects frames larger than this (MAX_MESSAGE_BYTES).</summary>
        public const int MaxMessageBytes = 8 * 1024;
    }
}
