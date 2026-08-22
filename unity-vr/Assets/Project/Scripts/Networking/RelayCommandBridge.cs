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
        }

        private void OnDisable()
        {
            if (boundSession == null)
                return;

            boundSession.CommandReceived -= HandleCommand;
            boundSession.SessionEnded -= HandleSessionEnded;
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
        }

        private void HandleSessionEnded()
        {
            // Mirrors the relay tearing down a room when either side drops:
            // losing control must not strand the wearer inside an effect.
            if (effectManager != null)
                effectManager.ResetSimulation();
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
                default:
                    disease = VisionDisease.None;
                    return false;
            }
        }
    }
}
