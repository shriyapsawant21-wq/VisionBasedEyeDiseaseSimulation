using UnityEngine;

namespace VisionSimulation.Pairing
{
    /// <summary>
    /// Renders a <see cref="QrEncoder"/> matrix into a texture for display.
    /// </summary>
    public static class QrTexture
    {
        /// <summary>
        /// The spec's minimum quiet zone. Scanners rely on this margin to find
        /// the symbol, so drawing a QR edge-to-edge is a common reason a code
        /// looks fine but will not scan.
        /// </summary>
        public const int QuietZoneModules = 4;

        /// <summary>
        /// Builds a point-filtered texture with one module per
        /// <paramref name="modulePixels"/> square, plus a quiet zone.
        ///
        /// Point filtering and integer scaling matter: a bilinear-filtered or
        /// non-integer-scaled QR code blurs module edges and scans poorly.
        /// </summary>
        public static Texture2D Create(bool[,] modules, int modulePixels = 8)
        {
            if (modules == null)
                throw new System.ArgumentNullException(nameof(modules));
            if (modulePixels < 1)
                throw new System.ArgumentOutOfRangeException(nameof(modulePixels));

            int size = modules.GetLength(0);
            int totalModules = size + QuietZoneModules * 2;
            int dimension = totalModules * modulePixelsClamped(modulePixels, totalModules);
            int scale = modulePixelsClamped(modulePixels, totalModules);

            var texture = new Texture2D(dimension, dimension, TextureFormat.RGB24, mipChain: false)
            {
                filterMode = FilterMode.Point,
                wrapMode = TextureWrapMode.Clamp
            };

            var pixels = new Color32[dimension * dimension];
            var light = new Color32(255, 255, 255, 255);
            var dark = new Color32(0, 0, 0, 255);

            for (int i = 0; i < pixels.Length; i++)
                pixels[i] = light;

            for (int y = 0; y < size; y++)
            {
                for (int x = 0; x < size; x++)
                {
                    if (!modules[x, y])
                        continue;

                    // Texture space is bottom-up while the matrix is top-down, so
                    // the row is flipped here rather than in the encoder.
                    int originX = (x + QuietZoneModules) * scale;
                    int originY = (totalModules - 1 - (y + QuietZoneModules)) * scale;

                    for (int dy = 0; dy < scale; dy++)
                    {
                        int rowStart = (originY + dy) * dimension + originX;
                        for (int dx = 0; dx < scale; dx++)
                            pixels[rowStart + dx] = dark;
                    }
                }
            }

            texture.SetPixels32(pixels);
            texture.Apply(updateMipmaps: false);
            return texture;
        }

        /// <summary>
        /// Keeps the generated texture within a sane size for a phone screen,
        /// since a version-10 symbol at 16px per module is already over 1000px.
        /// </summary>
        private static int modulePixelsClamped(int requested, int totalModules)
        {
            const int MaxDimension = 2048;
            int maxScale = Mathf.Max(1, MaxDimension / totalModules);
            return Mathf.Clamp(requested, 1, maxScale);
        }

        /// <summary>Convenience wrapper: encode text and render it in one step.</summary>
        public static Texture2D FromText(string text, int modulePixels = 8,
            QrEncoder.Ecc ecc = QrEncoder.Ecc.Medium)
        {
            return Create(QrEncoder.Encode(text, ecc), modulePixels);
        }
    }
}
