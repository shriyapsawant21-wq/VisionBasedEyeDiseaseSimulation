using Google.XR.Cardboard;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.XR.Management;
using VisionSimulation.Core;
using VisionSimulation.DiseaseEffects;
using VisionSimulation.Protocol;
using VisionSimulation.VR;

namespace VisionSimulation.Networking
{
    /// <summary>
    /// Applies controller commands arriving over the relay to the scene's
    /// VisionEffectManager. Without this, RelaySession raises CommandReceived
    /// and nothing acts on it, so a paired controller appears connected but
    /// none of its controls change what the wearer sees.
    ///
    /// Installs itself after scene load so no prefab or scene wiring is
    /// required; it is also safe to drop onto a GameObject by hand.
    /// </summary>
    public sealed class RelayCommandBridge : MonoBehaviour
    {
        [Tooltip("Leave empty to find the VisionEffectManager in the loaded scene.")]
        [SerializeField] private VisionEffectManager effectManager;

        [Tooltip("Leave empty to bind to RelaySession.Instance at runtime.")]
        [SerializeField] private RelaySession session;

        [Header("Scene names")]
        [Tooltip("Actual Unity scene name (not the wire value) SET_SCENE(\"GARDEN\") loads.")]
        [SerializeField] private string gardenSceneName = "Garden";
        [Tooltip("Actual Unity scene name (not the wire value) SET_SCENE(\"HOSPITAL\") loads.")]
        [SerializeField] private string hospitalSceneName = "Hospital";

        private RelaySession boundSession;
        private VisionEffectManager boundEffectManager;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void Install()
        {
            if (FindAnyObjectByType<RelayCommandBridge>() != null)
                return;

            var host = new GameObject(nameof(RelayCommandBridge));
            host.AddComponent<RelayCommandBridge>();
            DontDestroyOnLoad(host);
        }

        private void OnEnable() => TryBind();

        private void Update()
        {
            // Both dependencies appear at different times: RelaySession is
            // created by the pairing flow, the effect manager by whichever
            // scene is loaded. Keep looking until each one shows up.
            if (boundSession == null)
                TryBind();

            if (effectManager == null)
                effectManager = FindAnyObjectByType<VisionEffectManager>();

            if (effectManager != boundEffectManager)
            {
                if (boundEffectManager != null)
                    boundEffectManager.StateChanged -= HandleEffectStateChanged;

                boundEffectManager = effectManager;

                if (boundEffectManager != null)
                {
                    boundEffectManager.StateChanged += HandleEffectStateChanged;
                    // A rebind here means a new scene just loaded and handed
                    // us its VisionEffectManager - whether that came from a
                    // SET_SCENE command or the in-headset debug toggle, the
                    // controller has no other way to learn the scene changed.
                    SendCurrentState();
                }
            }
        }

        private void OnDisable()
        {
            if (boundEffectManager != null)
            {
                boundEffectManager.StateChanged -= HandleEffectStateChanged;
                boundEffectManager = null;
            }

            if (boundSession == null)
                return;

            boundSession.CommandReceived -= HandleCommand;
            boundSession.SessionEnded -= HandleSessionEnded;
            boundSession.Paired -= HandlePaired;
            boundSession = null;
        }

        private void TryBind()
        {
            RelaySession target = session != null ? session : RelaySession.Instance;
            if (target == null || target == boundSession)
                return;

            boundSession = target;
            boundSession.CommandReceived += HandleCommand;
            boundSession.SessionEnded += HandleSessionEnded;
            boundSession.Paired += HandlePaired;
        }

        private void HandleSessionEnded()
        {
            // Mirrors the relay tearing down a room when either side drops:
            // losing control must not strand the wearer inside an effect.
            if (effectManager != null)
                effectManager.ResetSimulation();
        }

        /// <summary>
        /// A controller that just paired - fresh or reconnecting - has no way
        /// to know what the wearer is currently seeing until Unity says so.
        /// Without this, a reconnect resets the dashboard to defaults even
        /// though the simulation itself never changed.
        /// </summary>
        private void HandlePaired() => SendCurrentState();

        /// <summary>
        /// Echoes state after any change to VisionEffectManager, regardless
        /// of whether a relay command or the in-headset debug controls
        /// caused it, so the controller never has to guess what the wearer
        /// actually sees.
        /// </summary>
        private void HandleEffectStateChanged() => SendCurrentState();

        private void SendCurrentState()
        {
            if (boundSession == null || effectManager == null)
                return;

            // TryToWireDisease always succeeds now (VisionDisease.None maps to
            // the wire's "NONE"), so this always sends. It used to bail out
            // whenever nothing was selected - which meant a scene switch with
            // no active disease (the common case right after pairing, or
            // after Reset) never reached the controller at all, leaving the
            // Background toggle showing the wrong scene indefinitely.
            TryToWireDisease(effectManager.CurrentDisease, out string disease);

            boundSession.SendStateUpdated(
                disease,
                effectManager.Severity,
                effectManager.AffectedVision ? RelayProtocol.ComparisonAffected : RelayProtocol.ComparisonNormal,
                CurrentSceneWireValue());
        }

        /// <summary>
        /// The active Unity scene's wire value. Falls back to GARDEN for any
        /// scene this bridge doesn't recognise (e.g. an editor test scene)
        /// rather than sending an unparseable value - STATE_UPDATED's scene
        /// field is only ever GARDEN or HOSPITAL on the wire.
        /// </summary>
        private string CurrentSceneWireValue()
        {
            string active = SceneManager.GetActiveScene().name;
            if (active == hospitalSceneName)
                return RelayProtocol.SceneHospital;
            return RelayProtocol.SceneGarden;
        }

        private void HandleCommand(string type, string json)
        {
            // Scene switching and recentring both happen before the
            // VisionEffectManager gate below: neither touches a disease
            // effect, so neither should be dropped just because one isn't
            // bound yet. Scene switching also loads a whole new scene (with
            // its own effect manager, found again next Update).
            if (type == RelayProtocol.SetScene)
            {
                HandleSetScene(json);
                return;
            }

            if (type == RelayProtocol.Recenter)
            {
                HandleRecenter();
                return;
            }

            if (effectManager == null)
                effectManager = FindAnyObjectByType<VisionEffectManager>();

            if (effectManager == null)
            {
                Debug.LogWarning($"[RelayCommandBridge] no VisionEffectManager in scene; dropped {type}.");
                return;
            }

            switch (type)
            {
                case RelayProtocol.SetDisease:
                {
                    var message = JsonUtility.FromJson<SetDiseaseMessage>(json);
                    string disease = message?.payload?.disease;
                    if (string.IsNullOrEmpty(disease))
                        return;

                    if (!TryParseDisease(disease, out VisionDisease parsed))
                    {
                        Debug.LogWarning($"[RelayCommandBridge] unknown disease '{disease}'.");
                        return;
                    }

                    effectManager.SetDisease(parsed);
                    // Choosing a condition means the controller wants to see
                    // it; otherwise nothing changes until the comparison
                    // toggle is touched separately.
                    effectManager.SetAffectedVision(true);
                    return;
                }

                case RelayProtocol.SetSeverity:
                {
                    var message = JsonUtility.FromJson<SetSeverityMessage>(json);
                    if (message?.payload == null)
                        return;

                    effectManager.SetSeverity(message.payload.severity);
                    return;
                }

                case RelayProtocol.SetComparison:
                {
                    var message = JsonUtility.FromJson<SetComparisonMessage>(json);
                    string comparison = message?.payload?.comparison;
                    if (string.IsNullOrEmpty(comparison))
                        return;

                    effectManager.SetAffectedVision(comparison == RelayProtocol.ComparisonAffected);
                    return;
                }

                case RelayProtocol.StartDiseaseSimulation:
                {
                    var message = JsonUtility.FromJson<StartDiseaseSimulationMessage>(json);
                    if (message?.payload == null || string.IsNullOrEmpty(message.payload.program))
                        return;

                    // The controller mirrors this run on its own clock, so the
                    // duration has to come from the payload - hardcoding it
                    // here would drift the two apart on any non-default length.
                    effectManager.StartDiseaseSimulation(
                        message.payload.program,
                        message.payload.durationSeconds);
                    return;
                }

                case RelayProtocol.PauseProgression:
                {
                    var message = JsonUtility.FromJson<PauseProgressionMessage>(json);
                    if (message?.payload == null)
                        return;

                    effectManager.SetDiseaseSimulationPaused(message.payload.paused);
                    return;
                }

                case RelayProtocol.Reset:
                {
                    effectManager.ResetSimulation();
                    return;
                }
            }
        }

        /// <summary>
        /// Swaps the loaded scene. The disease effect itself isn't touched -
        /// effectManager becomes stale the instant LoadScene runs, and
        /// Update() re-finds the new scene's copy and echoes STATE_UPDATED
        /// once it rebinds, so no explicit re-application is needed here.
        /// </summary>
        private void HandleSetScene(string json)
        {
            var message = JsonUtility.FromJson<SetSceneMessage>(json);
            string scene = message?.payload?.scene;
            if (string.IsNullOrEmpty(scene))
                return;

            if (!TryParseScene(scene, out string target))
            {
                Debug.LogWarning($"[RelayCommandBridge] unknown scene '{scene}'.");
                return;
            }

            if (SceneManager.GetActiveScene().name == target)
                return;

            if (!Application.CanStreamedLevelBeLoaded(target))
            {
                Debug.LogError($"[RelayCommandBridge] scene '{target}' is not enabled in Build Settings.");
                return;
            }

            SceneManager.LoadScene(target);
        }

        /// <summary>
        /// Resets "forward" to wherever the wearer is currently facing - the
        /// adjust button on the controller's Background section, for when the
        /// headset was put on crooked or the scene otherwise doesn't line up
        /// with which way the wearer is actually looking.
        ///
        /// Both recentre paths run unconditionally rather than picking one:
        /// on-device only the Cardboard call does anything (no
        /// DesktopMouseLook there), and in the Editor only the mouse-look
        /// call does (Cardboard is inert without a real XR session), so
        /// there's no wrong build to run this against.
        /// </summary>
        private void HandleRecenter()
        {
            var manager = XRGeneralSettings.Instance?.Manager;
            if (manager != null && manager.isInitializationComplete)
                Api.Recenter();

            FindAnyObjectByType<DesktopMouseLook>()?.Recenter();
        }

        /// <summary>
        /// SceneEnum value -> the actual Unity scene name to load. An instance
        /// method, unlike <see cref="TryParseDisease"/>, because the target
        /// names are the serialized gardenSceneName/hospitalSceneName fields
        /// above, not fixed constants.
        /// </summary>
        private bool TryParseScene(string wireValue, out string sceneName)
        {
            switch (wireValue)
            {
                case RelayProtocol.SceneGarden:
                    sceneName = gardenSceneName;
                    return true;
                case RelayProtocol.SceneHospital:
                    sceneName = hospitalSceneName;
                    return true;
                default:
                    sceneName = null;
                    return false;
            }
        }

        private static bool TryParseDisease(string wireValue, out VisionDisease disease)
        {
            switch (wireValue)
            {
                case RelayProtocol.DiseaseMetamorphopsia:
                    disease = VisionDisease.Metamorphopsia;
                    return true;
                case RelayProtocol.DiseaseCentralBlur:
                    disease = VisionDisease.CentralBlur;
                    return true;
                case RelayProtocol.DiseaseTunnelVision:
                    disease = VisionDisease.TunnelVision;
                    return true;
                case RelayProtocol.DiseasePvdWeissRing:
                    disease = VisionDisease.PosteriorVitreousDetachmentRing;
                    return true;
                case RelayProtocol.DiseasePvdDot:
                    disease = VisionDisease.PosteriorVitreousDetachmentDot;
                    return true;
                case RelayProtocol.DiseaseGhostFloaters:
                    disease = VisionDisease.GhostFloaters;
                    return true;
                case RelayProtocol.DiseaseRetinalDetachment:
                    disease = VisionDisease.BlackFloaters;
                    return true;
                case RelayProtocol.DiseaseCentralScotoma:
                    disease = VisionDisease.CentralScotoma;
                    return true;
                case RelayProtocol.DiseaseRetinalDetachmentFlash:
                    disease = VisionDisease.RetinalDetachmentFlash;
                    return true;
                case RelayProtocol.DiseaseCurtainSign:
                    disease = VisionDisease.CurtainSign;
                    return true;
                case RelayProtocol.DiseaseRedFloaters:
                    disease = VisionDisease.RedFloaters;
                    return true;
                case RelayProtocol.DiseaseBloodStreak:
                    disease = VisionDisease.BloodStreak;
                    return true;
                default:
                    disease = VisionDisease.None;
                    return false;
            }
        }

        /// <summary>
        /// Inverse of <see cref="TryParseDisease"/>, for STATE_UPDATED. Unlike
        /// TryParseDisease, this one is total: VisionDisease.None maps to the
        /// wire's "NONE" rather than failing, since STATE_UPDATED's
        /// StateDiseaseEnum (unlike SET_DISEASE's DiseaseEnum) has a value
        /// for "nothing selected".
        /// </summary>
        private static bool TryToWireDisease(VisionDisease disease, out string wireValue)
        {
            switch (disease)
            {
                case VisionDisease.None:
                    wireValue = RelayProtocol.DiseaseNone;
                    return true;
                case VisionDisease.Metamorphopsia:
                    wireValue = RelayProtocol.DiseaseMetamorphopsia;
                    return true;
                case VisionDisease.CentralBlur:
                    wireValue = RelayProtocol.DiseaseCentralBlur;
                    return true;
                case VisionDisease.TunnelVision:
                    wireValue = RelayProtocol.DiseaseTunnelVision;
                    return true;
                case VisionDisease.PosteriorVitreousDetachmentRing:
                    wireValue = RelayProtocol.DiseasePvdWeissRing;
                    return true;
                case VisionDisease.PosteriorVitreousDetachmentDot:
                    wireValue = RelayProtocol.DiseasePvdDot;
                    return true;
                case VisionDisease.GhostFloaters:
                    wireValue = RelayProtocol.DiseaseGhostFloaters;
                    return true;
                case VisionDisease.BlackFloaters:
                    wireValue = RelayProtocol.DiseaseRetinalDetachment;
                    return true;
                case VisionDisease.CentralScotoma:
                    wireValue = RelayProtocol.DiseaseCentralScotoma;
                    return true;
                case VisionDisease.RetinalDetachmentFlash:
                    wireValue = RelayProtocol.DiseaseRetinalDetachmentFlash;
                    return true;
                case VisionDisease.CurtainSign:
                    wireValue = RelayProtocol.DiseaseCurtainSign;
                    return true;
                case VisionDisease.RedFloaters:
                    wireValue = RelayProtocol.DiseaseRedFloaters;
                    return true;
                case VisionDisease.BloodStreak:
                    wireValue = RelayProtocol.DiseaseBloodStreak;
                    return true;
                default:
                    wireValue = null;
                    return false;
            }
        }
    }
}
