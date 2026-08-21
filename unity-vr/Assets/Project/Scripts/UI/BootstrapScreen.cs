using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
using VisionSimulation.Networking;
using VisionSimulation.VR;

namespace VisionSimulation.UI
{
    /// <summary>
    /// Entry point of the simulation build: shows the safety disclaimer, then
    /// moves to pairing.
    ///
    /// There is no role picker here. This build is always the VR simulation
    /// device; the doctor's controller is a separate React Native app. The
    /// disclaimer is shown on every launch rather than being remembered,
    /// because it carries a motion-sickness warning that a new patient - not
    /// the person who installed the app - needs to have seen.
    ///
    /// Scene setup: one empty GameObject in Bootstrap.unity with this component.
    /// </summary>
    public sealed class BootstrapScreen : MonoBehaviour
    {
        [SerializeField] private string pairingSceneName = "Pairing";

        [Tooltip("Created on first launch and carried into every later scene.")]
        [SerializeField] private bool createRelaySession = true;

        private const string DisclaimerBody =
            "This is an educational demonstration, not a diagnostic tool.\n\n" +
            "The visual effects are approximations of how some eye conditions " +
            "may appear. They vary between individuals and do not represent a " +
            "clinical diagnosis or a measure of disease stage.\n\n" +
            "Stay seated throughout. Remove the headset immediately if you feel " +
            "dizzy, nauseous or uncomfortable.";

        private void Start()
        {
            // Pairing must be a normal full-screen phone UI so its QR is
            // scannable. Cardboard starts only after pairing succeeds.
            VrModeLifecycle.StopForSetup();
            EnsureRelaySession();
            BuildUi();
        }

        /// <summary>
        /// Creates the session object once, here, so it exists before pairing
        /// and survives into the garden scene.
        /// </summary>
        private void EnsureRelaySession()
        {
            if (!createRelaySession || RelaySession.Instance != null)
                return;

            var go = new GameObject("RelaySession");
            go.AddComponent<RelaySession>();
        }

        private void BuildUi()
        {
            Canvas canvas = SimpleUi.CreateCanvas("BootstrapCanvas", transform);
            SimpleUi.CreateBackground(canvas.transform, SimpleUi.Background);

            RectTransform column = SimpleUi.CreateColumn(canvas.transform, 1100f);

            SimpleUi.CreateText(column, "VisionBridge VR", 64, SimpleUi.TextPrimary, FontStyle.Bold);
            SimpleUi.CreateText(column, "Simulation device", 32, SimpleUi.Primary);
            SimpleUi.CreateSpacer(column, 16f);
            SimpleUi.CreateText(column, DisclaimerBody, 30, SimpleUi.TextMuted);
            SimpleUi.CreateSpacer(column, 16f);

            Button agree = SimpleUi.CreateButton(column, "I Understand - Continue",
                SimpleUi.Primary, Color.black);
            agree.onClick.AddListener(Continue);
        }

        private void Continue()
        {
            if (Application.CanStreamedLevelBeLoaded(pairingSceneName))
            {
                SceneManager.LoadScene(pairingSceneName);
                return;
            }

            // Loading an unlisted scene throws at runtime, which on a phone is a
            // silent freeze; a clear log line is far easier to diagnose.
            Debug.LogError(
                $"[BootstrapScreen] Scene '{pairingSceneName}' is not in Build Settings. " +
                "Add Bootstrap, Pairing and Garden under File > Build Profiles > Scene List.");
        }
    }
}
