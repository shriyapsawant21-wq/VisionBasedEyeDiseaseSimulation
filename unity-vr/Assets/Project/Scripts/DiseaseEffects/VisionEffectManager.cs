using System;
using UnityEngine;
using VisionSimulation.Core;

namespace VisionSimulation.DiseaseEffects
{
    public sealed class VisionEffectManager : MonoBehaviour
    {
        [Header("Current simulation state")]
        [SerializeField] private VisionDisease currentDisease = VisionDisease.None;
        [SerializeField, Range(0f, 1f)] private float severity;
        [SerializeField] private bool affectedVision = true;
        [SerializeField, Min(0f)] private float transitionDuration = 0.5f;

        [Header("Effect components")]
        [Tooltip("Assign a component that implements IVisionEffect.")]
        [SerializeField] private MonoBehaviour metamorphopsiaEffect;
        [Tooltip("Assign a component that implements IVisionEffect.")]
        [SerializeField] private MonoBehaviour centralBlurEffect;
        [Tooltip("Assign the TunnelVisionEffect component.")]
        [SerializeField] private MonoBehaviour tunnelVisionEffect;

        private float targetSeverity;
        private float displayedSeverity;

        public VisionDisease CurrentDisease => currentDisease;
        public float Severity => severity;
        public bool AffectedVision => affectedVision;

        public event Action StateChanged;

        private void Awake()
        {
            targetSeverity = affectedVision ? severity : 0f;
            displayedSeverity = targetSeverity;
            ApplyState(displayedSeverity);
        }

        private void Update()
        {
            targetSeverity = affectedVision ? severity : 0f;
            float speed = transitionDuration <= 0f ? float.PositiveInfinity : 1f / transitionDuration;
            float next = Mathf.MoveTowards(displayedSeverity, targetSeverity, speed * Time.unscaledDeltaTime);

            if (Mathf.Approximately(next, displayedSeverity))
                return;

            displayedSeverity = next;
            ApplyState(displayedSeverity);
        }

        public void SetDisease(VisionDisease disease)
        {
            if (currentDisease == disease)
                return;

            currentDisease = disease;
            ApplyState(displayedSeverity);
            StateChanged?.Invoke();
        }

        public void SetDisease(int diseaseIndex)
        {
            if (!Enum.IsDefined(typeof(VisionDisease), diseaseIndex))
                diseaseIndex = 0;

            SetDisease((VisionDisease)diseaseIndex);
        }

        public void SetSeverity(float value)
        {
            severity = Mathf.Clamp01(value);
            StateChanged?.Invoke();
        }

        public void SetAffectedVision(bool isAffected)
        {
            affectedVision = isAffected;
            StateChanged?.Invoke();
        }

        public void ToggleComparison()
        {
            SetAffectedVision(!affectedVision);
        }

        public void ResetSimulation()
        {
            currentDisease = VisionDisease.None;
            severity = 0f;
            affectedVision = false;
            targetSeverity = 0f;
            displayedSeverity = 0f;
            ApplyState(0f);
            StateChanged?.Invoke();
        }

        private void ApplyState(float effectiveSeverity)
        {
            ApplyEffect(metamorphopsiaEffect, currentDisease == VisionDisease.Metamorphopsia, effectiveSeverity);
            ApplyEffect(centralBlurEffect, currentDisease == VisionDisease.CentralBlur, effectiveSeverity);
            ApplyEffect(tunnelVisionEffect, currentDisease == VisionDisease.TunnelVision, effectiveSeverity);
        }

        private static void ApplyEffect(MonoBehaviour component, bool selected, float effectiveSeverity)
        {
            if (component == null)
                return;

            if (component is not IVisionEffect effect)
            {
                Debug.LogError($"{component.name} does not implement IVisionEffect.", component);
                return;
            }

            effect.SetEnabled(selected && effectiveSeverity > 0.0001f);
            effect.SetSeverity(effectiveSeverity);
        }

#if UNITY_EDITOR
        private void OnValidate()
        {
            severity = Mathf.Clamp01(severity);
            transitionDuration = Mathf.Max(0f, transitionDuration);
        }
#endif
    }
}
