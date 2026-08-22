using UnityEngine;

namespace VisionSimulation.DiseaseEffects
{
    public enum CentralEffectMode
    {
        Blur = 0,
        Scotoma = 1
    }

    public sealed class CentralBlurEffect : MonoBehaviour, IVisionEffect
    {
        [SerializeField] private Material centralBlurMaterial;
        [SerializeField, Range(0.05f, 0.8f)] private float severeMaskRadius = 0.35f;
        [SerializeField, Range(0.01f, 0.5f)] private float featherWidth = 0.18f;
        [SerializeField, Range(0f, 20f)] private float maximumBlurPixels = 10f;
        [SerializeField] private Vector2 centerOffset;

        private static readonly int EnabledId = Shader.PropertyToID("_EffectEnabled");
        private static readonly int SeverityId = Shader.PropertyToID("_Severity");
        private static readonly int MaskRadiusId = Shader.PropertyToID("_MaskRadius");
        private static readonly int FeatherWidthId = Shader.PropertyToID("_FeatherWidth");
        private static readonly int BlurPixelsId = Shader.PropertyToID("_BlurPixels");
        private static readonly int CenterOffsetId = Shader.PropertyToID("_CenterOffset");
        private static readonly int ModeId = Shader.PropertyToID("_CentralMode");

        private bool effectEnabled;
        private float severity;
        private CentralEffectMode mode;

        public void SetMode(CentralEffectMode value)
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

        private void Awake() => ApplyMaterialProperties();
        private void OnValidate() => ApplyMaterialProperties();

        private void ApplyMaterialProperties()
        {
            if (centralBlurMaterial == null)
                return;

            float appliedSeverity = effectEnabled ? severity : 0f;
            centralBlurMaterial.SetFloat(EnabledId, effectEnabled ? 1f : 0f);
            centralBlurMaterial.SetFloat(SeverityId, appliedSeverity);
            float maskRadius = mode == CentralEffectMode.Scotoma
                ? severeMaskRadius * Mathf.Lerp(0.22f, 0.68f, appliedSeverity)
                : severeMaskRadius * Mathf.Lerp(0.65f, 1f, appliedSeverity);
            centralBlurMaterial.SetFloat(MaskRadiusId, maskRadius);
            centralBlurMaterial.SetFloat(FeatherWidthId, featherWidth);
            centralBlurMaterial.SetFloat(BlurPixelsId, maximumBlurPixels * appliedSeverity);
            centralBlurMaterial.SetVector(CenterOffsetId, centerOffset);
            centralBlurMaterial.SetFloat(ModeId, (float)mode);
        }
    }
}
