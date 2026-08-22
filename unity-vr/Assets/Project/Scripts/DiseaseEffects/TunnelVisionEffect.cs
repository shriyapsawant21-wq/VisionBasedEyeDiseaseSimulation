using UnityEngine;

namespace VisionSimulation.DiseaseEffects
{
    public enum TunnelEffectMode
    {
        TunnelVision = 0,
        CurtainSign = 1
    }

    public sealed class TunnelVisionEffect : MonoBehaviour, IVisionEffect
    {
        [SerializeField] private Material tunnelVisionMaterial;
        [SerializeField, Range(0.5f, 1.25f)] private float mildClearRadius = 0.82f;
        [SerializeField, Range(0.1f, 0.5f)] private float severeClearRadius = 0.18f;
        [SerializeField, Range(0.01f, 0.25f)] private float featherWidth = 0.08f;
        [SerializeField, Range(0.85f, 0.98f)] private float peripheralDarkness = 0.95f;
        [SerializeField, Range(0f, 1f)] private float severePeripheralSaturation = 0.1f;
        [SerializeField] private Vector2 centerOffset;

        private static readonly int EnabledId = Shader.PropertyToID("_EffectEnabled");
        private static readonly int SeverityId = Shader.PropertyToID("_Severity");
        private static readonly int ClearRadiusId = Shader.PropertyToID("_ClearRadius");
        private static readonly int FeatherWidthId = Shader.PropertyToID("_FeatherWidth");
        private static readonly int PeripheralDarknessId = Shader.PropertyToID("_PeripheralDarkness");
        private static readonly int PeripheralSaturationId = Shader.PropertyToID("_PeripheralSaturation");
        private static readonly int CenterOffsetId = Shader.PropertyToID("_CenterOffset");
        private static readonly int ModeId = Shader.PropertyToID("_TunnelMode");

        private bool effectEnabled;
        private float severity;
        private TunnelEffectMode mode;

        public void SetMode(TunnelEffectMode value)
        {
            mode = value;
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
            // Severity changes the remaining field of view, not the opacity of
            // the peripheral mask. The nonlinear curve keeps early stages broad.
            float radiusProgress = Mathf.Pow(appliedSeverity, 1.25f);
            tunnelVisionMaterial.SetFloat(ClearRadiusId, Mathf.Lerp(mildClearRadius, severeClearRadius, radiusProgress));
            tunnelVisionMaterial.SetFloat(FeatherWidthId, featherWidth);
            tunnelVisionMaterial.SetFloat(PeripheralDarknessId, effectEnabled ? peripheralDarkness : 0f);
            tunnelVisionMaterial.SetFloat(PeripheralSaturationId, Mathf.Lerp(1f, severePeripheralSaturation, appliedSeverity));
            tunnelVisionMaterial.SetVector(CenterOffsetId, centerOffset);
            tunnelVisionMaterial.SetFloat(ModeId, (float)mode);
        }
    }
}
