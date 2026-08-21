using UnityEngine;

namespace VisionSimulation.DiseaseEffects
{
    public sealed class TunnelVisionEffect : MonoBehaviour, IVisionEffect
    {
        [SerializeField] private Material tunnelVisionMaterial;
        [SerializeField, Range(0.1f, 1f)] private float severeClearRadius = 0.2f;
        [SerializeField, Range(0.01f, 0.5f)] private float featherWidth = 0.12f;
        [SerializeField, Range(0f, 1f)] private float maximumPeripheralDarkness = 1f;
        [SerializeField, Range(0f, 1f)] private float severePeripheralSaturation = 0.1f;
        [SerializeField] private Vector2 centerOffset;

        private static readonly int EnabledId = Shader.PropertyToID("_EffectEnabled");
        private static readonly int SeverityId = Shader.PropertyToID("_Severity");
        private static readonly int ClearRadiusId = Shader.PropertyToID("_ClearRadius");
        private static readonly int FeatherWidthId = Shader.PropertyToID("_FeatherWidth");
        private static readonly int PeripheralDarknessId = Shader.PropertyToID("_PeripheralDarkness");
        private static readonly int PeripheralSaturationId = Shader.PropertyToID("_PeripheralSaturation");
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

        private void Awake()
        {
            ApplyMaterialProperties();
        }

        private void OnValidate()
        {
            ApplyMaterialProperties();
        }

        private void ApplyMaterialProperties()
        {
            if (tunnelVisionMaterial == null)
                return;

            float appliedSeverity = effectEnabled ? severity : 0f;
            tunnelVisionMaterial.SetFloat(EnabledId, effectEnabled ? 1f : 0f);
            tunnelVisionMaterial.SetFloat(SeverityId, appliedSeverity);
            tunnelVisionMaterial.SetFloat(ClearRadiusId, Mathf.Lerp(1f, severeClearRadius, appliedSeverity));
            tunnelVisionMaterial.SetFloat(FeatherWidthId, featherWidth);
            tunnelVisionMaterial.SetFloat(PeripheralDarknessId, maximumPeripheralDarkness * appliedSeverity);
            tunnelVisionMaterial.SetFloat(PeripheralSaturationId, Mathf.Lerp(1f, severePeripheralSaturation, appliedSeverity));
            tunnelVisionMaterial.SetVector(CenterOffsetId, centerOffset);
        }
    }
}
