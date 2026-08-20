using TMPro;
using UnityEngine;

namespace VisionSimulation.UI
{
    public sealed class FpsDisplay : MonoBehaviour
    {
        [SerializeField] private TMP_Text label;
        [SerializeField, Min(0.1f)] private float refreshInterval = 0.5f;

        private float elapsed;
        private int frames;

        private void Update()
        {
            elapsed += Time.unscaledDeltaTime;
            frames++;

            if (elapsed < refreshInterval)
                return;

            if (label != null)
                label.text = $"FPS: {frames / elapsed:0}";

            elapsed = 0f;
            frames = 0;
        }
    }
}
