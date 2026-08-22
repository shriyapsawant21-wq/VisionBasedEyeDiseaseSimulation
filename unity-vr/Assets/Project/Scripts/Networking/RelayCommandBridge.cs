using UnityEngine;
using VisionSimulation.Core;
using VisionSimulation.DiseaseEffects;
using VisionSimulation.Protocol;

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
                    boundEffectManager.StateChanged += HandleEffectStateChanged;
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

            // Nothing has been chosen yet; the wire protocol's DiseaseEnum
            // has no "none" value, so there is nothing valid to report.
            if (!TryToWireDisease(effectManager.CurrentDisease, out string disease))
                return;

            boundSession.SendStateUpdated(
                disease,
                effectManager.Severity,
                effectManager.AffectedVision ? RelayProtocol.ComparisonAffected : RelayProtocol.ComparisonNormal,
                RelayProtocol.SceneGarden);
        }

        private void HandleCommand(string type, string json)
        {
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
                    if (message?.payload == null)
                        return;

                    effectManager.StartDiseaseSimulation(message.payload.disease, 30f);
                    return;
                }

                case RelayProtocol.Reset:
                {
                    effectManager.ResetSimulation();
                    return;
                }
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
                default:
                    disease = VisionDisease.None;
                    return false;
            }
        }

        /// <summary>Inverse of <see cref="TryParseDisease"/>, for STATE_UPDATED.</summary>
        private static bool TryToWireDisease(VisionDisease disease, out string wireValue)
        {
            switch (disease)
            {
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
                default:
                    wireValue = null;
                    return false;
            }
        }
    }
}
