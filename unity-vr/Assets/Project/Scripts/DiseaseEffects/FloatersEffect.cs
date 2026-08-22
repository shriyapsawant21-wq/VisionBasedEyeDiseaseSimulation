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
        [Header("Retinal flash")]
        [SerializeField, Min(0.01f)] private float flashDuration = 0.75f;
        [SerializeField, Min(0f)] private float minimumFlashInterval = 1.4f;
        [SerializeField, Min(0f)] private float maximumFlashInterval = 3.2f;

        private static readonly int EnabledId = Shader.PropertyToID("_EffectEnabled");
        private static readonly int SeverityId = Shader.PropertyToID("_Severity");
        private static readonly int TypeId = Shader.PropertyToID("_FloaterType");
        private static readonly int SpeedId = Shader.PropertyToID("_MovementSpeed");
        private static readonly int GhostOpacityId = Shader.PropertyToID("_GhostOpacity");
        private static readonly int RingOpacityId = Shader.PropertyToID("_RingOpacity");
        private static readonly int FlashProgressId = Shader.PropertyToID("_FlashProgress");
        private static readonly int FlashOriginId = Shader.PropertyToID("_FlashOrigin");
        private static readonly int FlashDirectionId = Shader.PropertyToID("_FlashDirection");
        private static readonly int FlashDistanceId = Shader.PropertyToID("_FlashDistance");

        private bool effectEnabled;
        private float severity;
        private float flashElapsed = -1f;
        private float currentFlashDuration;
        private float nextFlashDelay = -1f;

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
            ApplyMaterialProperties();
        }

        private void Awake() => ApplyMaterialProperties();
        private void OnValidate() => ApplyMaterialProperties();

        private void Update()
        {
            if (floatersMaterial == null || !effectEnabled || floaterType != FloaterType.RetinalFlash)
            {
                flashElapsed = -1f;
                nextFlashDelay = -1f;
                if (floatersMaterial != null)
                    floatersMaterial.SetFloat(FlashProgressId, 0f);
                return;
            }

            float deltaTime = Mathf.Max(Time.unscaledDeltaTime, 0.0001f);

            if (flashElapsed >= 0f)
            {
                flashElapsed += deltaTime;
                if (flashElapsed < currentFlashDuration)
                {
                    floatersMaterial.SetFloat(FlashProgressId,
                        Mathf.Clamp01(flashElapsed / Mathf.Max(currentFlashDuration, 0.01f)));
                    return;
                }

                flashElapsed = -1f;
                floatersMaterial.SetFloat(FlashProgressId, 0f);
                ScheduleNextFlash();
                return;
            }

            if (nextFlashDelay < 0f)
                ScheduleNextFlash();

            nextFlashDelay -= deltaTime;
            if (nextFlashDelay <= 0f)
            {
                // Each isolated flash starts at the fixed peripheral point and
                // heads toward the bottom-left, fading at a varied middle point.
                Vector2 flashOrigin = new Vector2(0.84f, 0.82f);
                Vector2 flashDirection = new Vector2(-1f, Random.Range(-1.10f, -0.78f)).normalized;
                float flashDistance = Random.Range(0.30f, 0.48f);
                currentFlashDuration = flashDuration * (flashDistance / 0.40f);

                floatersMaterial.SetVector(FlashOriginId,
                    new Vector4(flashOrigin.x, flashOrigin.y, 0f, 0f));
                floatersMaterial.SetVector(FlashDirectionId,
                    new Vector4(flashDirection.x, flashDirection.y, 0f, 0f));
                floatersMaterial.SetFloat(FlashDistanceId, flashDistance);
                flashElapsed = 0f;
                floatersMaterial.SetFloat(FlashProgressId, 0.001f);
            }
        }

        private void ScheduleNextFlash()
        {
            float minimum = Mathf.Max(0f, minimumFlashInterval);
            float maximum = Mathf.Max(minimum, maximumFlashInterval);
            nextFlashDelay = Random.Range(minimum, maximum);
        }

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
            if (!effectEnabled || floaterType != FloaterType.RetinalFlash)
                floatersMaterial.SetFloat(FlashProgressId, 0f);
        }
    }
}
