using System;
using System.Collections;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
using VisionSimulation.Networking;
using VisionSimulation.Pairing;
using VisionSimulation.VR;

namespace VisionSimulation.UI
{
    /// <summary>
    /// Connects to the relay, shows the pairing QR code, asks the patient to
    /// confirm the doctor, then loads the garden.
    ///
    /// QR only - there is no manual code entry on either side of this build.
    ///
    /// Scene setup: one empty GameObject in Pairing.unity with this component.
    /// </summary>
    public sealed class PairingScreen : MonoBehaviour
    {
        [SerializeField] private string gardenSceneName = "Garden";

        [Tooltip("Pixels per QR module. 8 gives a comfortably scannable code " +
                 "for the ~110 byte pairing payload on a phone screen.")]
        [SerializeField, Range(4, 16)] private int qrModulePixels = 8;

        private RelaySession session;

        private Text statusText;
        private Text detailText;
        private RawImage qrImage;
        private InputField relayUrlField;
        private Button primaryButton;
        private Text primaryButtonLabel;
        private Button secondaryButton;
        private Text secondaryButtonLabel;

        private Texture2D qrTexture;
        private bool navigatedToGarden;
        private bool xrStartupFailed;

        private void Start()
        {
            BuildUi();

            session = RelaySession.Instance;
            if (session == null)
            {
                // Normally created by BootstrapScreen; making one here means the
                // Pairing scene can also be played directly from the editor.
                var go = new GameObject("RelaySession");
                session = go.AddComponent<RelaySession>();
            }

            session.SessionCreated += OnSessionCreated;
            session.PairRequested += OnPairRequested;
            session.Paired += OnPaired;
            session.SessionEnded += OnSessionEnded;
            session.Failed += OnFailed;

            relayUrlField.text = session.RelayUrl;
            session.BeginSession();
            Refresh();
        }

        private void OnDestroy()
        {
            if (session != null)
            {
                session.SessionCreated -= OnSessionCreated;
                session.PairRequested -= OnPairRequested;
                session.Paired -= OnPaired;
                session.SessionEnded -= OnSessionEnded;
                session.Failed -= OnFailed;
            }

            ReleaseQrTexture();
        }

        private void BuildUi()
        {
            Canvas canvas = SimpleUi.CreateCanvas("PairingCanvas", transform);
            SimpleUi.CreateBackground(canvas.transform, SimpleUi.Background);

            RectTransform column = SimpleUi.CreateColumn(canvas.transform, 1000f, 18f);

            SimpleUi.CreateText(column, "Scan to connect", 52, SimpleUi.TextPrimary, FontStyle.Bold);

            statusText = SimpleUi.CreateText(column, "Connecting...", 30, SimpleUi.Primary);
            qrImage = SimpleUi.CreateRawImage(column, 620f);
            qrImage.transform.parent.gameObject.SetActive(false);

            detailText = SimpleUi.CreateText(column, string.Empty, 26, SimpleUi.TextMuted);

            relayUrlField = SimpleUi.CreateInputField(column, string.Empty);
            relayUrlField.gameObject.SetActive(false);
            relayUrlField.onEndEdit.AddListener(OnRelayUrlChanged);

            primaryButton = SimpleUi.CreateButton(column, string.Empty, SimpleUi.Primary, Color.black);
            primaryButtonLabel = primaryButton.GetComponentInChildren<Text>();
            primaryButton.onClick.AddListener(OnPrimaryPressed);

            secondaryButton = SimpleUi.CreateButton(column, string.Empty, SimpleUi.Panel, SimpleUi.TextPrimary);
            secondaryButtonLabel = secondaryButton.GetComponentInChildren<Text>();
            secondaryButton.onClick.AddListener(OnSecondaryPressed);
        }

        // ---- Session events ------------------------------------------------

        private void OnSessionCreated()
        {
            ShowQrCode();
            Refresh();
        }

        private void OnPairRequested() => Refresh();

        private void OnPaired()
        {
            // The code is spent and the token is already cleared; make sure it
            // is not left on screen behind the transition.
            HideQrCode();
            xrStartupFailed = false;
            Refresh();
            StartCoroutine(StartVrAndLoadGarden());
        }

        private void OnSessionEnded()
        {
            HideQrCode();
            Refresh();
        }

        private void OnFailed(string code, string message)
        {
            HideQrCode();
            Refresh();
        }

        // ---- QR ------------------------------------------------------------

        private void ShowQrCode()
        {
            if (string.IsNullOrEmpty(session.SessionId) || string.IsNullOrEmpty(session.PairingToken))
                return;

            string payload = PairingPayload.ToJson(
                session.SessionId,
                session.PairingToken,
                session.ExpiresAt,
                session.RelayUrl);

            try
            {
                ReleaseQrTexture();
                qrTexture = QrTexture.FromText(payload, qrModulePixels);
            }
            catch (Exception e)
            {
                // Never log the payload itself - it carries the pairing token.
                Debug.LogError($"[PairingScreen] could not build the pairing QR code: {e.Message}");
                return;
            }

            qrImage.texture = qrTexture;
            qrImage.transform.parent.gameObject.SetActive(true);
        }

        private void HideQrCode()
        {
            qrImage.transform.parent.gameObject.SetActive(false);
            qrImage.texture = null;
            ReleaseQrTexture();
        }

        private void ReleaseQrTexture()
        {
            if (qrTexture == null)
                return;

            Destroy(qrTexture);
            qrTexture = null;
        }

        // ---- Buttons -------------------------------------------------------

        private void OnRelayUrlChanged(string value)
        {
            session.SetRelayUrl(value);
        }

        private void OnPrimaryPressed()
        {
            switch (session.State)
            {
                case RelaySessionState.Paired when xrStartupFailed:
                    StartCoroutine(StartVrAndLoadGarden());
                    return;

                case RelaySessionState.PairPending:
                    session.RespondToPairRequest(accepted: true);
                    Refresh();
                    return;

                case RelaySessionState.Ended:
                case RelaySessionState.Failed:
                case RelaySessionState.Idle:
                    // Rejecting or losing a session destroys the room, so this
                    // always starts a fresh one with a new code.
                    session.BeginSession();
                    Refresh();
                    return;
            }
        }

        private void OnSecondaryPressed()
        {
            switch (session.State)
            {
                case RelaySessionState.PairPending:
                    session.RespondToPairRequest(accepted: false);
                    Refresh();
                    return;

                case RelaySessionState.WaitingForController:
                case RelaySessionState.Connecting:
                    // Same path as a retry: the current room is abandoned and a
                    // new code is requested.
                    session.EndSession();
                    session.BeginSession();
                    Refresh();
                    return;
            }
        }

        // ---- View ------------------------------------------------------------

        private void Refresh()
        {
            bool editingAllowed = session.State != RelaySessionState.Paired;
            relayUrlField.interactable = editingAllowed;
            // Discovery normally supplies this automatically. Keep the field
            // hidden during normal operation; failure details still show the
            // discovered/fallback address for troubleshooting.
            relayUrlField.gameObject.SetActive(false);

            switch (session.State)
            {
                case RelaySessionState.Idle:
                case RelaySessionState.Connecting:
                    statusText.text = "Finding relay...";
                    statusText.color = SimpleUi.Primary;
                    detailText.text = session.RelayUrl;
                    SetButtons(null, "Cancel");
                    return;

                case RelaySessionState.WaitingForController:
                    statusText.text = "Ready to pair";
                    statusText.color = SimpleUi.Primary;
                    detailText.text = "Ask the doctor to scan this code." + ExpirySuffix();
                    SetButtons(null, "New code");
                    return;

                case RelaySessionState.PairPending:
                    statusText.text = "A controller wants to connect";
                    statusText.color = SimpleUi.TextPrimary;
                    detailText.text = "Only accept this if the doctor just scanned the code.";
                    SetButtons("Accept", "Reject");
                    return;

                case RelaySessionState.Paired:
                    if (xrStartupFailed)
                    {
                        statusText.text = "Could not start VR";
                        statusText.color = SimpleUi.Danger;
                        detailText.text = "Cardboard VR could not initialize. Check the headset setup, then try again.";
                        SetButtons("Try VR again", null);
                        return;
                    }

                    statusText.text = "Paired";
                    statusText.color = SimpleUi.Primary;
                    detailText.text = "Starting the simulation...";
                    SetButtons(null, null);
                    return;

                case RelaySessionState.Ended:
                    statusText.text = "Session ended";
                    statusText.color = SimpleUi.TextMuted;
                    detailText.text = "The session was closed. Start a new one to pair again.";
                    SetButtons("Start new session", null);
                    return;

                case RelaySessionState.Failed:
                    statusText.text = "Could not connect";
                    statusText.color = SimpleUi.Danger;
                    detailText.text = DescribeFailure();
                    SetButtons("Try again", null);
                    return;
            }
        }

        /// <summary>
        /// Turns the relay's error code into something a person holding the
        /// phone can act on, falling back to the raw message.
        /// </summary>
        private string DescribeFailure()
        {
            switch (session.LastErrorCode)
            {
                case "connection_failed":
                    return "No relay at " + session.RelayUrl +
                           ".\nCheck the address, and that both devices are on the same network.";
                case "session_already_paired":
                    return "That session already has a controller connected.";
                case "rate_limited":
                    return "Too many messages were sent too quickly. Try again in a moment.";
                default:
                    return string.IsNullOrEmpty(session.LastErrorMessage)
                        ? "The relay refused the connection."
                        : session.LastErrorMessage;
            }
        }

        private string ExpirySuffix()
        {
            if (session.ExpiresAt <= 0)
                return string.Empty;

            long secondsLeft = session.ExpiresAt - DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            if (secondsLeft <= 0)
                return "\nThis code has expired - tap New code.";

            return $"\nThis code expires in about {Mathf.CeilToInt(secondsLeft / 60f)} min.";
        }

        private void Update()
        {
            // The relay sweeps unpaired rooms silently, so the countdown is the
            // only signal the patient gets that the code on screen went stale.
            if (session != null && session.State == RelaySessionState.WaitingForController)
                detailText.text = "Ask the doctor to scan this code." + ExpirySuffix();
        }

        private void SetButtons(string primary, string secondary)
        {
            primaryButton.gameObject.SetActive(primary != null);
            if (primary != null)
                primaryButtonLabel.text = primary;

            secondaryButton.gameObject.SetActive(secondary != null);
            if (secondary != null)
                secondaryButtonLabel.text = secondary;
        }

        private void LoadGarden()
        {
            if (navigatedToGarden)
                return;

            if (!Application.CanStreamedLevelBeLoaded(gardenSceneName))
            {
                Debug.LogError(
                    $"[PairingScreen] Scene '{gardenSceneName}' is not in Build Settings. " +
                    "Add Bootstrap, Pairing and Garden under File > Build Profiles > Scene List.");
                return;
            }

            navigatedToGarden = true;
            SceneManager.LoadScene(gardenSceneName);
        }

        private IEnumerator StartVrAndLoadGarden()
        {
            xrStartupFailed = false;
            statusText.text = "Starting VR...";
            bool started = false;
            yield return VrModeLifecycle.StartForSimulation(success => started = success);

            // XR initialization yields across frames. The controller can
            // disconnect (or the relay can fail) while it is in progress, so
            // only enter the simulation if the session is still authoritative.
            if (session == null || session.State != RelaySessionState.Paired)
            {
                if (started)
                    VrModeLifecycle.StopForSetup();
                yield break;
            }

            if (!started)
            {
                xrStartupFailed = true;
                Refresh();
                yield break;
            }

            LoadGarden();
        }
    }
}
