using UnityEngine;

namespace VisionSimulation.DiseaseEffects
{
    public sealed class MetamorphopsiaEffect : MonoBehaviour, IVisionEffect
    {
        [SerializeField] private Material metamorphopsiaMaterial;
        [SerializeField, Range(0f, 0.08f)] private float maximumWarpStrength = 0.035f;
        [SerializeField, Range(0.1f, 1.5f)] private float effectRadius = 0.7f;
        [SerializeField, Range(1f, 40f)] private float waveFrequency = 16f;
        [SerializeField] private Vector2 centerOffset;

        private static readonly int EnabledId = Shader.PropertyToID("_EffectEnabled");
        private static readonly int SeverityId = Shader.PropertyToID("_Severity");
        private static readonly int WarpStrengthId = Shader.PropertyToID("_WarpStrength");
        private static readonly int EffectRadiusId = Shader.PropertyToID("_EffectRadius");
        private static readonly int WaveFrequencyId = Shader.PropertyToID("_WaveFrequency");
        private static readonly int CenterOffsetId = Shader.PropertyToID("_CenterOffset");

        private bool effectEnabled;
        private float severity;

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
            metamorphopsiaMaterial.SetFloat(WarpStrengthId, maximumWarpStrength * appliedSeverity);
            metamorphopsiaMaterial.SetFloat(EffectRadiusId, effectRadius);
            metamorphopsiaMaterial.SetFloat(WaveFrequencyId, waveFrequency);
            metamorphopsiaMaterial.SetVector(CenterOffsetId, centerOffset);
        }
    }
}
