using System;

namespace VisionSimulation.Protocol
{
    /// <summary>
    /// Serializable message shapes for JsonUtility. A concrete envelope type is
    /// declared per message because JsonUtility cannot deserialize generic
    /// types; the shared envelope fields are inherited rather than repeated.
    /// </summary>
    [Serializable]
    public abstract class RelayEnvelope
    {
        public int v = RelayProtocol.Version;
        public string type;
        public long seq;
        public long timestamp;
    }

    /// <summary>
    /// Envelope with the payload left unparsed, used to read the discriminator
    /// before deserializing into the concrete type. JsonUtility ignores fields
    /// it does not know about, so this parses every inbound frame.
    /// </summary>
    [Serializable]
    public sealed class RelayEnvelopeHeader : RelayEnvelope
    {
    }

    /// <summary>Stands in for the schema's optional/empty payload objects.</summary>
    [Serializable]
    public sealed class EmptyPayload
    {
    }

    // ---- Outbound ---------------------------------------------------------

    [Serializable]
    public sealed class HelloPayload
    {
        public string role;
    }

    [Serializable]
    public sealed class HelloMessage : RelayEnvelope
    {
        public HelloPayload payload = new HelloPayload();
    }

    [Serializable]
    public sealed class PairAcceptPayload
    {
        public bool accepted;
    }

    [Serializable]
    public sealed class PairAcceptMessage : RelayEnvelope
    {
        public PairAcceptPayload payload = new PairAcceptPayload();
    }

    [Serializable]
    public sealed class StateUpdatedPayload
    {
        public string disease;
        public float severity;
        public string comparison;
        public string scene;
    }

    [Serializable]
    public sealed class StateUpdatedMessage : RelayEnvelope
    {
        public StateUpdatedPayload payload = new StateUpdatedPayload();
    }

    [Serializable]
    public sealed class PingMessage : RelayEnvelope
    {
        public EmptyPayload payload = new EmptyPayload();
    }

    // ---- Inbound ----------------------------------------------------------

    [Serializable]
    public sealed class SessionCreatedPayload
    {
        public string sessionId;
        public string pairingToken;

        /// <summary>Unix seconds after which an unpaired room is swept.</summary>
        public long expiresAt;
    }

    [Serializable]
    public sealed class SessionCreatedMessage : RelayEnvelope
    {
        public SessionCreatedPayload payload;
    }

    /// <summary>
    /// Forwarded verbatim from the controller, so it still carries the token the
    /// controller scanned. Never display or log these fields.
    /// </summary>
    [Serializable]
    public sealed class PairRequestPayload
    {
        public string sessionId;
        public string pairingToken;
    }

    [Serializable]
    public sealed class PairRequestMessage : RelayEnvelope
    {
        public PairRequestPayload payload;
    }

    [Serializable]
    public sealed class PairedPayload
    {
        public string sessionId;
    }

    [Serializable]
    public sealed class PairedMessage : RelayEnvelope
    {
        public PairedPayload payload;
    }

    [Serializable]
    public sealed class ErrorPayload
    {
        public string code;
        public string message;
    }

    [Serializable]
    public sealed class ErrorMessage : RelayEnvelope
    {
        public ErrorPayload payload;
    }

    // ---- Controller commands, consumed by the garden scene ----------------

    [Serializable]
    public sealed class SetDiseasePayload
    {
        public string disease;
    }

    [Serializable]
    public sealed class SetDiseaseMessage : RelayEnvelope
    {
        public SetDiseasePayload payload;
    }

    [Serializable]
    public sealed class SetSeverityPayload
    {
        public float severity;
    }

    [Serializable]
    public sealed class SetSeverityMessage : RelayEnvelope
    {
        public SetSeverityPayload payload;
    }

    [Serializable]
    public sealed class SetComparisonPayload
    {
        public string comparison;
    }

    [Serializable]
    public sealed class SetComparisonMessage : RelayEnvelope
    {
        public SetComparisonPayload payload;
    }

    [Serializable]
    public sealed class StartProgressionPayload
    {
        public float durationSeconds;
    }

    [Serializable]
    public sealed class StartProgressionMessage : RelayEnvelope
    {
        public StartProgressionPayload payload;
    }

    [Serializable]
    public sealed class SetScenePayload
    {
        public string scene;
    }

    [Serializable]
    public sealed class SetSceneMessage : RelayEnvelope
    {
        public SetScenePayload payload;
    }
}
