using UnityEngine;

namespace VisionSimulation.DiseaseEffects
{
    public enum FloaterType
    {
        WeissRing = 0,
        PvdDot = 1,
        GhostWorms = 2,
        BlackDots = 3,
        RetinalFlash = 4,
        RedStreaks = 5
    }

    public sealed class FloatersEffect : MonoBehaviour, IVisionEffect
    {
        [SerializeField] private Material floatersMaterial;
        [SerializeField] private FloaterType floaterType = FloaterType.WeissRing;
        [SerializeField, Range(0.05f, 1f)] private float movementSpeed = 0.22f;
        [SerializeField, Range(0.1f, 1f)] private float ghostOpacity = 0.42f;
        [SerializeField, Range(0.1f, 1f)] private float ringOpacity = 0.48f;

        private static readonly int EnabledId = Shader.PropertyToID("_EffectEnabled");
        private static readonly int SeverityId = Shader.PropertyToID("_Severity");
        private static readonly int TypeId = Shader.PropertyToID("_FloaterType");
        private static readonly int SpeedId = Shader.PropertyToID("_MovementSpeed");
        private static readonly int GhostOpacityId = Shader.PropertyToID("_GhostOpacity");
        private static readonly int RingOpacityId = Shader.PropertyToID("_RingOpacity");
        private static readonly int OverlayRingId = Shader.PropertyToID("_OverlayRing");
        private static readonly int OverlayDotsId = Shader.PropertyToID("_OverlayDots");
        private static readonly int OverlayRedId = Shader.PropertyToID("_OverlayRed");
        private static readonly int CurtainOverlayId = Shader.PropertyToID("_CurtainOverlay");
        private static readonly int BlackoutOverlayId = Shader.PropertyToID("_BlackoutOverlay");

        private bool effectEnabled;
        private float severity;
        private Vector3 overlays;
        private Vector2 endingOverlays;

        public void SetAutomatedOverlays(float ring, float dots, float red)
        {
            overlays = new Vector3(Mathf.Clamp01(ring), Mathf.Clamp01(dots), Mathf.Clamp01(red));
            ApplyMaterialProperties();
        }

        public void SetEndingOverlays(float curtain, float blackout)
        {
            endingOverlays = new Vector2(Mathf.Clamp01(curtain), Mathf.Clamp01(blackout));
            ApplyMaterialProperties();
        }

        public void SetFloaterType(FloaterType value)
        {
            floaterType = value;
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
            overlays = Vector3.zero;
            endingOverlays = Vector2.zero;
            ApplyMaterialProperties();
        }

        private void Awake() => ApplyMaterialProperties();
        private void OnValidate() => ApplyMaterialProperties();

        private void ApplyMaterialProperties()
        {
            if (floatersMaterial == null)
                return;

            floatersMaterial.SetFloat(EnabledId, effectEnabled ? 1f : 0f);
            floatersMaterial.SetFloat(SeverityId, effectEnabled ? severity : 0f);
            floatersMaterial.SetFloat(TypeId, (float)floaterType);
            floatersMaterial.SetFloat(SpeedId, movementSpeed);
            floatersMaterial.SetFloat(GhostOpacityId, ghostOpacity);
            floatersMaterial.SetFloat(RingOpacityId, ringOpacity);
            floatersMaterial.SetFloat(OverlayRingId, overlays.x);
            floatersMaterial.SetFloat(OverlayDotsId, overlays.y);
            floatersMaterial.SetFloat(OverlayRedId, overlays.z);
            floatersMaterial.SetFloat(CurtainOverlayId, endingOverlays.x);
            floatersMaterial.SetFloat(BlackoutOverlayId, endingOverlays.y);
        }
    }
}
