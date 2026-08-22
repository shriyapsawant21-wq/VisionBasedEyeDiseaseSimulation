using UnityEngine;

namespace VisionSimulation.DiseaseEffects
{
    public sealed class MetamorphopsiaEffect : MonoBehaviour, IVisionEffect
    {
        [SerializeField] private Material metamorphopsiaMaterial;
        [SerializeField, Range(0f, 0.03f)] private float maximumWarpStrength = 0.015f;
        [SerializeField, Range(0.1f, 1.5f)] private float effectRadius = 0.7f;
        [SerializeField, Range(1f, 16f)] private float waveFrequency = 6f;
        [SerializeField] private Vector2 centerOffset;

        private static readonly int EnabledId = Shader.PropertyToID("_EffectEnabled");
        private static readonly int SeverityId = Shader.PropertyToID("_Severity");
        private static readonly int WarpStrengthId = Shader.PropertyToID("_WarpStrength");
        private static readonly int EffectRadiusId = Shader.PropertyToID("_EffectRadius");
        private static readonly int WaveFrequencyId = Shader.PropertyToID("_WaveFrequency");
        private static readonly int CenterOffsetId = Shader.PropertyToID("_CenterOffset");
        private static readonly int BorderOnlyId = Shader.PropertyToID("_BorderOnly");

        private bool effectEnabled;
        private float severity;
        private bool borderOnly;

        public void SetBorderOnly(bool value)
        {
            borderOnly = value;
            ApplyMaterialProperties();
        }

        public void SetEnabled(bool isEnabled)
        {
            effectEnabled = isEnabled;
            ApplyMaterialProperties();
        }

        public void SetSeverity(float value)
        {
            severity = Mathf.Clamp01(value);
            ApplyMaterialProperties();
        }

        public void ResetEffect()
        {
            effectEnabled = false;
            severity = 0f;
            ApplyMaterialProperties();
        }

        private void Awake() => ApplyMaterialProperties();
        private void OnValidate() => ApplyMaterialProperties();

        private void ApplyMaterialProperties()
        {
            if (metamorphopsiaMaterial == null)
                return;

            float appliedSeverity = effectEnabled ? severity : 0f;
            metamorphopsiaMaterial.SetFloat(EnabledId, effectEnabled ? 1f : 0f);
            metamorphopsiaMaterial.SetFloat(SeverityId, appliedSeverity);
            // A strongly eased curve makes the first stages extremely subtle and
            // introduces additional distortion gradually toward severe intensity.
            float warpProgress = Mathf.Pow(appliedSeverity, 2.4f);
            float safeMaximum = Mathf.Min(maximumWarpStrength, 0.015f);
            metamorphopsiaMaterial.SetFloat(WarpStrengthId, safeMaximum * warpProgress);
            metamorphopsiaMaterial.SetFloat(EffectRadiusId, effectRadius);
            // Existing scenes may still contain the earlier value of 16. Scaling
            // here gives those scenes a visibly longer wavelength without
            // requiring their serialized Inspector value to be reset manually.
            float longWaveFrequency = Mathf.Clamp(waveFrequency * 0.375f, 2f, 6f);
            metamorphopsiaMaterial.SetFloat(WaveFrequencyId, longWaveFrequency);
            metamorphopsiaMaterial.SetVector(CenterOffsetId, centerOffset);
            metamorphopsiaMaterial.SetFloat(BorderOnlyId, borderOnly ? 1f : 0f);
        }
    }
}
