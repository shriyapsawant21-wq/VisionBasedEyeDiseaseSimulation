namespace VisionSimulation.DiseaseEffects
{
    public interface IVisionEffect
    {
        void SetEnabled(bool isEnabled);
        void SetSeverity(float severity);
        void ResetEffect();
    }
}
