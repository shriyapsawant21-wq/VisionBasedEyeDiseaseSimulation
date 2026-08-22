using System;
using System.Collections;
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
        [Tooltip("Assign the FloatersEffect component.")]
        [SerializeField] private MonoBehaviour floatersEffect;

        private float targetSeverity;
        private float displayedSeverity;
        private Coroutine diseaseSimulation;
        private bool automatedSimulationActive;

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
            if (automatedSimulationActive)
                return;
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
            StopDiseaseSimulation();
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
            StopDiseaseSimulation();
            currentDisease = VisionDisease.None;
            severity = 0f;
            affectedVision = false;
            targetSeverity = 0f;
            displayedSeverity = 0f;
            ApplyState(0f);
            StateChanged?.Invoke();
        }

        public void StartDiseaseSimulation(string disease, float durationSeconds = 30f)
        {
            StopDiseaseSimulation();
            diseaseSimulation = StartCoroutine(RunDiseaseSimulation(disease, Mathf.Max(0.1f, durationSeconds)));
        }

        private void StopDiseaseSimulation()
        {
            if (diseaseSimulation != null)
                StopCoroutine(diseaseSimulation);
            diseaseSimulation = null;
            automatedSimulationActive = false;
        }

        private IEnumerator RunDiseaseSimulation(string disease, float duration)
        {
            automatedSimulationActive = true;
            affectedVision = true;
            severity = 0.5f;
            float elapsed = 0f;

            while (elapsed < duration)
            {
                elapsed += Time.unscaledDeltaTime;
                ApplyDiseaseTimeline(disease, Mathf.Clamp01(elapsed / duration));
                yield return null;
            }

            ApplyDiseaseTimeline(disease, 1f);
            // Keep the final untreated phase visible. ResetSimulation (debug
            // key 0) or selecting another simulation is what clears it.
            diseaseSimulation = null;
            StateChanged?.Invoke();
        }

        private void ApplyDiseaseTimeline(string disease, float progress)
        {
            DisableAllEffects();
            switch (disease)
            {
                case "RP":
                    SetTunnel(TunnelEffectMode.TunnelVision, Mathf.Lerp(0.08f, 1f, progress));
                    break;
                case "RRD":
                    SetFloater(progress < 0.28f ? FloaterType.BlackDots :
                        progress < 0.52f ? FloaterType.WeissRing : FloaterType.RetinalFlash,
                        progress < 0.28f ? 0.5f :
                        progress < 0.52f ? Mathf.Lerp(0.05f, 0.5f, Mathf.InverseLerp(0.28f, 0.52f, progress)) :
                        Mathf.Lerp(0.18f, 1f, Mathf.InverseLerp(0.52f, 0.82f, progress)));
                    if (floatersEffect is FloatersEffect rrdFloaters)
                    {
                        rrdFloaters.SetAutomatedOverlays(
                            progress >= 0.52f ? Mathf.InverseLerp(0.52f, 0.62f, progress) : 0f,
                            progress >= 0.28f ? 0.5f : 0f,
                            0f);
                        rrdFloaters.SetEndingOverlays(
                            progress >= 0.72f ? Mathf.SmoothStep(0f, 1f, Mathf.InverseLerp(0.72f, 1f, progress)) : 0f,
                            0f);
                    }
                    break;
                case "CSCR":
                    float metamorphRise = Mathf.SmoothStep(0f, 1f, Mathf.InverseLerp(0f, 0.45f, progress));
                    float metamorphFade = 1f - Mathf.SmoothStep(0f, 1f, Mathf.InverseLerp(0.45f, 0.86f, progress));
                    if (metamorphFade > 0.001f)
                        SetMetamorph(Mathf.Lerp(0.05f, 1f, metamorphRise) * metamorphFade);
                    if (progress >= 0.42f)
                        SetCentral(CentralEffectMode.Scotoma,
                            Mathf.SmoothStep(0.02f, 1f, Mathf.InverseLerp(0.42f, 0.92f, progress)));
                    break;
                case "DR_DME":
                    SetCentral(CentralEffectMode.Blur, Mathf.Lerp(0.5f, 0.85f, Mathf.Min(progress * 1.8f, 1f)));
                    if (progress >= 0.2f)
                        SetFloater(progress < 0.45f ? FloaterType.WeissRing :
                            progress < 0.68f ? FloaterType.RedStreaks : FloaterType.RetinalFlash,
                            progress < 0.45f ? Mathf.Lerp(0.05f, 0.5f, Mathf.InverseLerp(0.2f, 0.45f, progress)) :
                            Mathf.Lerp(0.5f, 1f, Mathf.InverseLerp(0.45f, 0.82f, progress)));
                    if (floatersEffect is FloatersEffect drFloaters && progress >= 0.45f)
                    {
                        drFloaters.SetAutomatedOverlays(
                            0.5f,
                            0f,
                            progress >= 0.68f ? 1f : 0f);
                        drFloaters.SetEndingOverlays(
                            0f,
                            progress >= 0.84f ? Mathf.SmoothStep(0f, 1f, Mathf.InverseLerp(0.84f, 1f, progress)) : 0f);
                    }
                    break;
                case "CNVM":
                    if (progress < 0.38f)
                        SetCentral(CentralEffectMode.Blur, Mathf.Lerp(0.5f, 1f, Mathf.SmoothStep(0f, 1f, progress / 0.38f)));
                    else
                    {
                        float centralBlend = Mathf.SmoothStep(0f, 1f, Mathf.InverseLerp(0.38f, 0.74f, progress));
                        SetCentralBlend(centralBlend, Mathf.Lerp(1f, 0.72f, centralBlend));
                        if (progress >= 0.68f)
                        {
                            if (metamorphopsiaEffect is MetamorphopsiaEffect cnvmMetamorph)
                                cnvmMetamorph.SetBorderOnly(true);
                            SetMetamorph(Mathf.Lerp(0.15f, 0.5f, Mathf.InverseLerp(0.68f, 1f, progress)));
                        }
                    }
                    break;
            }
        }

        private void DisableAllEffects()
        {
            if (metamorphopsiaEffect is MetamorphopsiaEffect metamorph)
                metamorph.SetBorderOnly(false);
            if (floatersEffect is FloatersEffect floaters)
            {
                floaters.SetAutomatedOverlays(0f, 0f, 0f);
                floaters.SetEndingOverlays(0f, 0f);
            }
            ApplyEffect(metamorphopsiaEffect, false, 0f);
            ApplyEffect(centralBlurEffect, false, 0f);
            ApplyEffect(tunnelVisionEffect, false, 0f);
            ApplyEffect(floatersEffect, false, 0f);
        }

        private void SetMetamorph(float value) => ApplyEffect(metamorphopsiaEffect, true, value);

        private void SetCentral(CentralEffectMode mode, float value)
        {
            if (centralBlurEffect is CentralBlurEffect central)
                central.SetMode(mode);
            ApplyEffect(centralBlurEffect, true, value);
        }

        private void SetCentralBlend(float modeBlend, float value)
        {
            if (centralBlurEffect is CentralBlurEffect central)
                central.SetModeBlend(modeBlend);
            ApplyEffect(centralBlurEffect, true, value);
        }

        private void SetTunnel(TunnelEffectMode mode, float value)
        {
            if (tunnelVisionEffect is TunnelVisionEffect tunnel)
                tunnel.SetMode(mode);
            ApplyEffect(tunnelVisionEffect, true, value);
        }

        private void SetFloater(FloaterType type, float value)
        {
            if (floatersEffect is FloatersEffect floaters)
                floaters.SetFloaterType(type);
            ApplyEffect(floatersEffect, true, value);
        }

        private void ApplyState(float effectiveSeverity)
        {
            if (metamorphopsiaEffect is MetamorphopsiaEffect metamorph)
                metamorph.SetBorderOnly(false);
            if (floatersEffect is FloatersEffect automatedFloaters)
            {
                automatedFloaters.SetAutomatedOverlays(0f, 0f, 0f);
                automatedFloaters.SetEndingOverlays(0f, 0f);
            }
            ApplyEffect(metamorphopsiaEffect, currentDisease == VisionDisease.Metamorphopsia, effectiveSeverity);

            if (centralBlurEffect is CentralBlurEffect central)
                central.SetMode(currentDisease == VisionDisease.CentralScotoma
                    ? CentralEffectMode.Scotoma
                    : CentralEffectMode.Blur);
            bool centralSelected = currentDisease == VisionDisease.CentralBlur ||
                                   currentDisease == VisionDisease.CentralScotoma;
            ApplyEffect(centralBlurEffect, centralSelected, effectiveSeverity);

            if (tunnelVisionEffect is TunnelVisionEffect tunnel)
                tunnel.SetMode(currentDisease == VisionDisease.CurtainSign
                    ? TunnelEffectMode.CurtainSign
                    : TunnelEffectMode.TunnelVision);
            bool tunnelSelected = currentDisease == VisionDisease.TunnelVision ||
                                  currentDisease == VisionDisease.CurtainSign;
            ApplyEffect(tunnelVisionEffect, tunnelSelected, effectiveSeverity);

            bool floatersSelected = currentDisease == VisionDisease.PosteriorVitreousDetachmentRing ||
                                    currentDisease == VisionDisease.PosteriorVitreousDetachmentDot ||
                                    currentDisease == VisionDisease.GhostFloaters ||
                                    currentDisease == VisionDisease.BlackFloaters ||
                                    currentDisease == VisionDisease.RetinalDetachmentFlash ||
                                    currentDisease == VisionDisease.RedFloaters;
            if (floatersEffect is FloatersEffect floaters)
                floaters.SetFloaterType(ToFloaterType(currentDisease));
            ApplyEffect(floatersEffect, floatersSelected, effectiveSeverity);
        }

        private static FloaterType ToFloaterType(VisionDisease disease)
        {
            return disease switch
            {
                VisionDisease.PosteriorVitreousDetachmentDot => FloaterType.PvdDot,
                VisionDisease.GhostFloaters => FloaterType.GhostWorms,
                VisionDisease.BlackFloaters => FloaterType.BlackDots,
                VisionDisease.RetinalDetachmentFlash => FloaterType.RetinalFlash,
                VisionDisease.RedFloaters => FloaterType.RedStreaks,
                _ => FloaterType.WeissRing
            };
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
