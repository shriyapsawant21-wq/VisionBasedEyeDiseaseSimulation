using UnityEngine;
using UnityEngine.InputSystem;
using VisionSimulation.Core;
using VisionSimulation.DiseaseEffects;

namespace VisionSimulation.UI
{
    public sealed class VisionDebugControls : MonoBehaviour
    {
        [SerializeField] private VisionEffectManager effectManager;
        [SerializeField, Range(0.01f, 0.5f)] private float severityStep = 0.1f;

        private void Update()
        {
            if (effectManager == null || Keyboard.current == null)
                return;

            if (Keyboard.current.digit1Key.wasPressedThisFrame)
                effectManager.SetDisease(VisionDisease.None);
            if (Keyboard.current.digit2Key.wasPressedThisFrame)
                effectManager.SetDisease(VisionDisease.Metamorphopsia);
            if (Keyboard.current.digit3Key.wasPressedThisFrame)
                effectManager.SetDisease(VisionDisease.CentralBlur);
            if (Keyboard.current.digit4Key.wasPressedThisFrame)
                effectManager.SetDisease(VisionDisease.TunnelVision);
            if (Keyboard.current.digit5Key.wasPressedThisFrame)
                effectManager.SetDisease(VisionDisease.PosteriorVitreousDetachmentRing);
            if (Keyboard.current.digit6Key.wasPressedThisFrame)
                effectManager.SetDisease(VisionDisease.PosteriorVitreousDetachmentDot);
            if (Keyboard.current.digit7Key.wasPressedThisFrame)
                effectManager.SetDisease(VisionDisease.GhostFloaters);
            if (Keyboard.current.digit8Key.wasPressedThisFrame)
                effectManager.SetDisease(VisionDisease.BlackFloaters);

            if (Keyboard.current.upArrowKey.wasPressedThisFrame)
                effectManager.SetSeverity(effectManager.Severity + severityStep);
            if (Keyboard.current.downArrowKey.wasPressedThisFrame)
                effectManager.SetSeverity(effectManager.Severity - severityStep);
            if (Keyboard.current.spaceKey.wasPressedThisFrame)
                effectManager.ToggleComparison();
        }
    }
}
