using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.SceneManagement;
using VisionSimulation.Core;
using VisionSimulation.DiseaseEffects;

namespace VisionSimulation.UI
{
    public sealed class VisionDebugControls : MonoBehaviour
    {
        [SerializeField] private VisionEffectManager effectManager;
        [SerializeField, Range(0.01f, 0.5f)] private float severityStep = 0.1f;
        [Header("Scene toggle")]
        [SerializeField] private string gardenSceneName = "Garden";
        [SerializeField] private string hospitalSceneName = "Hospital";
        [SerializeField] private bool toggleSceneOnScreenTap = true;

        private void Awake()
        {
            // The Cardboard gaze pointer is not used by this simulation and
            // otherwise appears as a distracting white dot in the view centre.
            GameObject reticle = GameObject.Find("CardboardReticlePointer");
            if (reticle != null)
                reticle.SetActive(false);
        }

        private void Update()
        {
            if (effectManager == null)
                return;

            bool keyboardToggle = Keyboard.current != null && Keyboard.current.tabKey.wasPressedThisFrame;
            bool touchToggle = toggleSceneOnScreenTap && Touchscreen.current != null &&
                               Touchscreen.current.primaryTouch.press.wasPressedThisFrame;
            if (keyboardToggle || touchToggle)
                ToggleScene();

            if (Keyboard.current == null)
                return;

            // Automated 30-second disease simulations for quick Play Mode testing.
            if (Keyboard.current.digit1Key.wasPressedThisFrame)
                effectManager.StartDiseaseSimulation("RP", 30f);
            if (Keyboard.current.digit2Key.wasPressedThisFrame)
                effectManager.StartDiseaseSimulation("RRD", 30f);
            if (Keyboard.current.digit3Key.wasPressedThisFrame)
                effectManager.StartDiseaseSimulation("CSCR", 30f);
            if (Keyboard.current.digit4Key.wasPressedThisFrame)
                effectManager.StartDiseaseSimulation("DR_DME", 30f);
            if (Keyboard.current.digit5Key.wasPressedThisFrame)
                effectManager.StartDiseaseSimulation("CNVM", 30f);
            if (Keyboard.current.digit0Key.wasPressedThisFrame)
                effectManager.ResetSimulation();

            // Remaining individual-effect shortcuts are kept for manual checks.
            if (Keyboard.current.digit6Key.wasPressedThisFrame)
                effectManager.SetDisease(VisionDisease.PosteriorVitreousDetachmentDot);
            if (Keyboard.current.digit7Key.wasPressedThisFrame)
                effectManager.SetDisease(VisionDisease.GhostFloaters);
            if (Keyboard.current.digit8Key.wasPressedThisFrame)
                effectManager.SetDisease(VisionDisease.BlackFloaters);
            if (Keyboard.current.sKey.wasPressedThisFrame)
                effectManager.SetDisease(VisionDisease.CentralScotoma);
            if (Keyboard.current.fKey.wasPressedThisFrame)
                effectManager.SetDisease(VisionDisease.RetinalDetachmentFlash);
            if (Keyboard.current.cKey.wasPressedThisFrame)
                effectManager.SetDisease(VisionDisease.CurtainSign);
            if (Keyboard.current.bKey.wasPressedThisFrame)
                effectManager.SetDisease(VisionDisease.RedFloaters);

            if (Keyboard.current.upArrowKey.wasPressedThisFrame)
                effectManager.SetSeverity(effectManager.Severity + severityStep);
            if (Keyboard.current.downArrowKey.wasPressedThisFrame)
                effectManager.SetSeverity(effectManager.Severity - severityStep);
            if (Keyboard.current.spaceKey.wasPressedThisFrame)
                effectManager.ToggleComparison();
        }

        /// <summary>
        /// Switches only the environment scene. Both scenes keep their own
        /// identical simulation rig and disease-effect configuration.
        /// This public method can also be assigned to a Unity UI Button.
        /// </summary>
        public void ToggleScene()
        {
            string current = SceneManager.GetActiveScene().name;
            string target = current == hospitalSceneName ? gardenSceneName : hospitalSceneName;
            if (!Application.CanStreamedLevelBeLoaded(target))
            {
                Debug.LogError($"[VisionDebugControls] Scene '{target}' is not enabled in Build Settings.");
                return;
            }

            SceneManager.LoadScene(target);
        }
    }
}
