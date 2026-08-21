using TMPro;
using UnityEngine;
using UnityEngine.UI;
using VisionSimulation.DiseaseEffects;

namespace VisionSimulation.UI
{
    public sealed class VisionDebugPanel : MonoBehaviour
    {
        [SerializeField] private VisionEffectManager effectManager;
        [SerializeField] private TMP_Dropdown diseaseDropdown;
        [SerializeField] private Slider severitySlider;
        [SerializeField] private Toggle affectedToggle;
        [SerializeField] private TMP_Text stateLabel;

        private void OnEnable()
        {
            if (effectManager != null)
                effectManager.StateChanged += Refresh;

            Refresh();
        }

        private void OnDisable()
        {
            if (effectManager != null)
                effectManager.StateChanged -= Refresh;
        }

        public void OnDiseaseChanged(int index) => effectManager?.SetDisease(index);
        public void OnSeverityChanged(float value) => effectManager?.SetSeverity(value);
        public void OnAffectedChanged(bool value) => effectManager?.SetAffectedVision(value);
        public void OnResetPressed() => effectManager?.ResetSimulation();

        private void Refresh()
        {
            if (effectManager == null)
                return;

            diseaseDropdown?.SetValueWithoutNotify((int)effectManager.CurrentDisease);
            severitySlider?.SetValueWithoutNotify(effectManager.Severity);
            affectedToggle?.SetIsOnWithoutNotify(effectManager.AffectedVision);

            if (stateLabel != null)
            {
                string mode = effectManager.AffectedVision ? "Affected" : "Normal";
                stateLabel.text = $"{effectManager.CurrentDisease} | {effectManager.Severity:P0} | {mode}";
            }
        }
    }
}
