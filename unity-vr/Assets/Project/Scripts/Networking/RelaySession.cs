using System;
using UnityEngine;
using VisionSimulation.Protocol;

namespace VisionSimulation.Networking
{
    public enum RelaySessionState
    {
        /// <summary>No socket open.</summary>
        Idle,

        /// <summary>Socket opening, or HELLO not yet answered.</summary>
        Connecting,

        /// <summary>SESSION_CREATED received; the QR code is scannable.</summary>
        WaitingForController,

        /// <summary>A controller sent PAIR_REQUEST and is awaiting confirmation.</summary>
        PairPending,

        /// <summary>Paired; controller commands now flow.</summary>
        Paired,

        /// <summary>Session finished or was torn down. Terminal.</summary>
        Ended,

        /// <summary>Connection or protocol failure. Terminal.</summary>
        Failed
    }

    /// <summary>
    /// Owns the relay connection for the whole app and survives scene loads, so
    /// the pairing scene can hand a live session to the garden scene.
    ///
    /// Drains <see cref="RelayClient"/>'s queues in Update, which is what makes
    /// every event below main-thread safe for UI and effect code to subscribe to.
    /// </summary>
    public sealed class RelaySession : MonoBehaviour
    {
        [Header("Relay endpoint")]
        [Tooltip("ws://<host>:<port>. The laptop's LAN address is DHCP-assigned " +
                 "and changes between sessions, so the pairing screen lets this " +
                 "be edited at runtime and remembers the last working value.")]
        [SerializeField] private string relayUrl = "ws://192.168.1.100:8787";

        [Tooltip("Seconds between PING frames once paired. The relay treats PING " +
                 "as activity and sweeps rooms that go idle.")]
        [SerializeField, Min(1f)] private float heartbeatSeconds = 20f;

        private const string RelayUrlPrefKey = "visionsim.relayUrl";

        private RelayClient client;
        private long seq;
        private float nextHeartbeat;
        private bool helloSent;
        private System.Threading.Tasks.Task<string> discoveryTask;

        public static RelaySession Instance { get; private set; }

        public RelaySessionState State { get; private set; } = RelaySessionState.Idle;

        public string SessionId { get; private set; }

        /// <summary>
        /// Held only long enough to build the QR payload. Never logged, and
        /// cleared as soon as the session pairs or ends.
        /// </summary>
        public string PairingToken { get; private set; }

        /// <summary>Unix seconds at which an unpaired room is swept by the relay.</summary>
        public long ExpiresAt { get; private set; }

        /// <summary>Code and message from the most recent ERROR or failure.</summary>
        public string LastErrorCode { get; private set; }

        public string LastErrorMessage { get; private set; }

        /// <summary>Raised when SESSION_CREATED lands and the QR can be drawn.</summary>
        public event Action SessionCreated;

        /// <summary>Raised when a controller requests pairing and needs confirming.</summary>
        public event Action PairRequested;

        /// <summary>Raised once the relay confirms both sides are paired.</summary>
        public event Action Paired;

        /// <summary>Raised when the session ends normally (peer left, or END_SESSION).</summary>
        public event Action SessionEnded;

        /// <summary>Raised on transport failure or a relay ERROR frame.</summary>
        public event Action<string, string> Failed;

        /// <summary>
        /// Raised for every controller command frame, with the raw JSON so the
        /// garden scene can deserialize the payload it cares about. Pairing
        /// lifecycle messages are handled here and never surface through this.
        /// </summary>
        public event Action<string, string> CommandReceived;

        public string RelayUrl
        {
            get => relayUrl;
            set => relayUrl = value;
        }

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }

            Instance = this;
            DontDestroyOnLoad(gameObject);

            // A remembered URL beats the inspector default, since the demo
            // laptop's address changes with the hotspot lease.
            if (PlayerPrefs.HasKey(RelayUrlPrefKey))
            {
                string stored = PlayerPrefs.GetString(RelayUrlPrefKey);
                if (!string.IsNullOrWhiteSpace(stored))
                    relayUrl = stored;
            }
        }

        /// <summary>
        /// Opens a socket and announces this device as the simulation. The relay
        /// answers HELLO with SESSION_CREATED, which carries the pairing code.
        /// </summary>
        public void BeginSession()
        {
            if (State == RelaySessionState.Connecting ||
                State == RelaySessionState.WaitingForController ||
                State == RelaySessionState.PairPending ||
                State == RelaySessionState.Paired)
            {
                return;
            }

            // The relay allows exactly one HELLO per socket and ties the room to
            // it, so a retry always needs a brand new client.
            DisposeClient();

            SessionId = null;
            PairingToken = null;
            ExpiresAt = 0;
            LastErrorCode = null;
            LastErrorMessage = null;
            seq = 0;
            helloSent = false;

            State = RelaySessionState.Connecting;
            // Discovery may update the port, but it must never replace the
            // configured relay host with an unauthenticated UDP sender.
            discoveryTask = RelayDiscovery.FindAsync(relayUrl);
        }

        /// <summary>Persists the endpoint so the next launch reuses it.</summary>
        public void SetRelayUrl(string url)
        {
            relayUrl = url == null ? string.Empty : url.Trim();
            PlayerPrefs.SetString(RelayUrlPrefKey, relayUrl);
            PlayerPrefs.Save();
        }

        /// <summary>
        /// Confirms the pending controller. Rejecting destroys the room relay
        /// side, so the caller must start a fresh session afterwards rather than
        /// reusing the code already on screen.
        /// </summary>
        public void RespondToPairRequest(bool accepted)
        {
            if (State != RelaySessionState.PairPending)
                return;

            var message = new PairAcceptMessage { type = RelayProtocol.PairAccept };
            message.payload.accepted = accepted;
            SendEnvelope(message);

            if (accepted)
                return;

            // The room is gone the moment the relay reads this, so do not sit in
            // PairPending waiting for a PAIRED that will never arrive.
            PairingToken = null;
            SessionId = null;
            State = RelaySessionState.Ended;
            SessionEnded?.Invoke();
        }

        /// <summary>
        /// Reports authoritative state back to the controller. Unity owns the
        /// real simulation state; the controller only requests changes.
        /// </summary>
        public void SendStateUpdated(string disease, float severity, string comparison, string scene)
        {
            if (State != RelaySessionState.Paired)
                return;

            var message = new StateUpdatedMessage { type = RelayProtocol.StateUpdated };
            message.payload.disease = disease;
            message.payload.severity = Mathf.Clamp01(severity);
            message.payload.comparison = comparison;
            message.payload.scene = scene;
            SendEnvelope(message);
        }

        /// <summary>Closes the socket, which the relay treats as ending the room.</summary>
        public void EndSession()
        {
            DisposeClient();

            PairingToken = null;
            SessionId = null;

            if (State == RelaySessionState.Ended || State == RelaySessionState.Failed)
                return;

            State = RelaySessionState.Ended;
            SessionEnded?.Invoke();
        }

        private void Update()
        {
            if (State == RelaySessionState.Connecting && client == null && discoveryTask != null && discoveryTask.IsCompleted)
            {
                if (discoveryTask.Status == System.Threading.Tasks.TaskStatus.RanToCompletion &&
                    !string.IsNullOrWhiteSpace(discoveryTask.Result))
                {
                    SetRelayUrl(discoveryTask.Result);
                }

                discoveryTask = null;
                client = new RelayClient();
                client.Connect(relayUrl);
            }

            if (client == null)
                return;

            while (client.TryDequeueError(out string transportError))
                Fail("connection_failed", transportError);

            while (client.TryDequeue(out string json))
                HandleFrame(json);

            // The socket can die without producing a frame, e.g. the relay
            // process being stopped, so state is polled as well as pushed.
            if (client.State == RelayConnectionState.Closed &&
                State != RelaySessionState.Ended &&
                State != RelaySessionState.Failed)
            {
                EndSession();
                return;
            }

            // ClientWebSocket reports Connected as soon as the handshake
            // finishes, but nothing announces this device to the relay on its
            // own - without this the relay never sees HELLO, so it never
            // answers with SESSION_CREATED and eventually drops the idle
            // socket. helloSent guards against sending it twice if Update runs
            // again before the state below moves past Connecting.
            if (client.State == RelayConnectionState.Connected &&
                State == RelaySessionState.Connecting &&
                !helloSent)
            {
                helloSent = true;
                var hello = new HelloMessage { type = RelayProtocol.Hello };
                hello.payload.role = RelayProtocol.RoleSimulation;
                SendEnvelope(hello);
            }

            if (State != RelaySessionState.Paired)
                return;

            // PING is only legal once paired - the relay answers an early one
            // with a not_paired error - so the heartbeat starts here.
            if (Time.unscaledTime < nextHeartbeat)
                return;

            nextHeartbeat = Time.unscaledTime + heartbeatSeconds;
            SendEnvelope(new PingMessage { type = RelayProtocol.Ping });
        }

        private void HandleFrame(string json)
        {
            RelayEnvelopeHeader header;
            try
            {
                header = JsonUtility.FromJson<RelayEnvelopeHeader>(json);
            }
            catch (Exception e)
            {
                Fail("invalid_message", $"could not parse a relay frame: {e.Message}");
                return;
            }

            if (header == null || string.IsNullOrEmpty(header.type))
            {
                Fail("invalid_message", "relay frame had no type");
                return;
            }

            switch (header.type)
            {
                case RelayProtocol.SessionCreated:
                {
                    var message = JsonUtility.FromJson<SessionCreatedMessage>(json);
                    if (message?.payload == null)
                    {
                        Fail("invalid_message", "SESSION_CREATED had no payload");
                        return;
                    }

                    SessionId = message.payload.sessionId;
                    PairingToken = message.payload.pairingToken;
                    ExpiresAt = message.payload.expiresAt;
                    State = RelaySessionState.WaitingForController;
                    SessionCreated?.Invoke();
                    return;
                }

                case RelayProtocol.PairRequest:
                {
                    // The relay has already checked the token; this is purely
                    // the human confirmation step, so the payload is not read.
                    if (State != RelaySessionState.WaitingForController)
                        return;

                    State = RelaySessionState.PairPending;
                    PairRequested?.Invoke();
                    return;
                }

                case RelayProtocol.Paired:
                {
                    var message = JsonUtility.FromJson<PairedMessage>(json);
                    if (message?.payload != null && !string.IsNullOrEmpty(message.payload.sessionId))
                        SessionId = message.payload.sessionId;

                    // The code is spent; keeping it around only risks leaking it.
                    PairingToken = null;
                    nextHeartbeat = Time.unscaledTime + heartbeatSeconds;
                    State = RelaySessionState.Paired;
                    Paired?.Invoke();
                    return;
                }

                case RelayProtocol.EndSession:
                {
                    EndSession();
                    return;
                }

                case RelayProtocol.Error:
                {
                    var message = JsonUtility.FromJson<ErrorMessage>(json);
                    string code = message?.payload?.code ?? "unknown";
                    string text = message?.payload?.message ?? "relay reported an error";

                    // A rejected command is not fatal to the session: the
                    // controller can simply send a valid one next.
                    if (State == RelaySessionState.Paired)
                    {
                        LastErrorCode = code;
                        LastErrorMessage = text;
                        Debug.LogWarning($"[RelaySession] relay rejected a command: {code} - {text}");
                        return;
                    }

                    Fail(code, text);
                    return;
                }

                default:
                {
                    CommandReceived?.Invoke(header.type, json);
                    return;
                }
            }
        }

        private void SendEnvelope(RelayEnvelope message)
        {
            if (client == null)
                return;

            message.v = RelayProtocol.Version;
            message.seq = seq++;
            message.timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

            string json = JsonUtility.ToJson(message);
            if (!client.Send(json))
                Debug.LogWarning($"[RelaySession] dropped {message.type}: socket not open.");
        }

        private void Fail(string code, string message)
        {
            if (State == RelaySessionState.Failed)
                return;

            LastErrorCode = code;
            LastErrorMessage = message;
            PairingToken = null;
            State = RelaySessionState.Failed;
            Debug.LogError($"[RelaySession] {code}: {message}");
            Failed?.Invoke(code, message);
        }

        private void DisposeClient()
        {
            discoveryTask = null;
            if (client == null)
                return;

            client.Close();
            client.Dispose();
            client = null;
        }

        private void OnDestroy()
        {
            DisposeClient();

            if (Instance == this)
                Instance = null;
        }

        private void OnApplicationQuit()
        {
            DisposeClient();
        }
    }
}
