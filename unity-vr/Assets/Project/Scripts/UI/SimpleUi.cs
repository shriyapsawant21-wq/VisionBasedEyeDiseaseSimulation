using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace VisionSimulation.UI
{
    /// <summary>
    /// Builds the pairing and disclaimer UI in code.
    ///
    /// These screens are deliberately not authored as prefabs or scene objects:
    /// each scene then needs exactly one empty GameObject with one component,
    /// which removes the Inspector wiring that tends to break when scenes are
    /// merged across branches. Uses legacy uGUI Text rather than TextMeshPro so
    /// nothing depends on TMP Essentials having been imported.
    /// </summary>
    public static class SimpleUi
    {
        public static readonly Color Background = new Color(0.06f, 0.09f, 0.11f);
        public static readonly Color Panel = new Color(0.11f, 0.15f, 0.18f);
        public static readonly Color Primary = new Color(0.16f, 0.71f, 0.66f);
        public static readonly Color Danger = new Color(0.90f, 0.38f, 0.34f);
        public static readonly Color TextPrimary = new Color(0.94f, 0.96f, 0.97f);
        public static readonly Color TextMuted = new Color(0.62f, 0.69f, 0.73f);

        private static Font cachedFont;

        /// <summary>
        /// Arial was renamed to LegacyRuntime.ttf in Unity 2022+; falling back
        /// keeps this working if the project is ever opened in an older editor.
        /// </summary>
        public static Font DefaultFont
        {
            get
            {
                if (cachedFont != null)
                    return cachedFont;

                cachedFont = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
                if (cachedFont == null)
                    cachedFont = Resources.GetBuiltinResource<Font>("Arial.ttf");

                return cachedFont;
            }
        }

        /// <summary>
        /// Creates a screen-space canvas plus the EventSystem that uGUI needs
        /// for buttons to receive input, if one is not already present.
        /// </summary>
        public static Canvas CreateCanvas(string name, Transform parent)
        {
            var go = new GameObject(name, typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            go.transform.SetParent(parent, worldPositionStays: false);

            var canvas = go.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;

            var scaler = go.GetComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920f, 1080f);
            scaler.screenMatchMode = CanvasScaler.ScreenMatchMode.MatchWidthOrHeight;
            scaler.matchWidthOrHeight = 0.5f;

            if (Object.FindAnyObjectByType<EventSystem>() == null)
            {
                var events = new GameObject("EventSystem", typeof(EventSystem), typeof(StandaloneInputModule));
                events.transform.SetParent(parent, worldPositionStays: false);
            }

            return canvas;
        }

        /// <summary>Full-screen solid background image.</summary>
        public static Image CreateBackground(Transform parent, Color color)
        {
            var go = new GameObject("Background", typeof(Image));
            go.transform.SetParent(parent, worldPositionStays: false);

            var rect = go.GetComponent<RectTransform>();
            Stretch(rect);

            var image = go.GetComponent<Image>();
            image.color = color;
            return image;
        }

        /// <summary>Centred vertical stack that everything else is parented to.</summary>
        public static RectTransform CreateColumn(Transform parent, float width, float spacing = 24f)
        {
            var go = new GameObject("Column", typeof(RectTransform), typeof(VerticalLayoutGroup));
            go.transform.SetParent(parent, worldPositionStays: false);

            var rect = go.GetComponent<RectTransform>();
            rect.anchorMin = new Vector2(0.5f, 0.5f);
            rect.anchorMax = new Vector2(0.5f, 0.5f);
            rect.pivot = new Vector2(0.5f, 0.5f);
            rect.sizeDelta = new Vector2(width, 0f);

            var layout = go.GetComponent<VerticalLayoutGroup>();
            layout.spacing = spacing;
            layout.childAlignment = TextAnchor.MiddleCenter;
            layout.childControlWidth = true;
            layout.childControlHeight = true;
            layout.childForceExpandWidth = true;
            layout.childForceExpandHeight = false;

            var fitter = go.AddComponent<ContentSizeFitter>();
            fitter.verticalFit = ContentSizeFitter.FitMode.PreferredSize;

            return rect;
        }

        public static Text CreateText(Transform parent, string content, int fontSize, Color color,
            FontStyle style = FontStyle.Normal, TextAnchor alignment = TextAnchor.MiddleCenter)
        {
            var go = new GameObject("Text", typeof(Text));
            go.transform.SetParent(parent, worldPositionStays: false);

            var text = go.GetComponent<Text>();
            text.font = DefaultFont;
            text.text = content;
            text.fontSize = fontSize;
            text.fontStyle = style;
            text.color = color;
            text.alignment = alignment;
            text.horizontalOverflow = HorizontalWrapMode.Wrap;
            text.verticalOverflow = VerticalWrapMode.Overflow;
            text.supportRichText = false;

            var fitter = go.AddComponent<ContentSizeFitter>();
            fitter.verticalFit = ContentSizeFitter.FitMode.PreferredSize;

            return text;
        }

        public static Button CreateButton(Transform parent, string label, Color background, Color labelColor,
            float height = 96f)
        {
            var go = new GameObject("Button", typeof(Image), typeof(Button), typeof(LayoutElement));
            go.transform.SetParent(parent, worldPositionStays: false);

            go.GetComponent<Image>().color = background;
            go.GetComponent<LayoutElement>().minHeight = height;

            var text = CreateText(go.transform, label, 34, labelColor, FontStyle.Bold);
            Stretch(text.rectTransform);
            // The label must not swallow clicks meant for the button underneath.
            text.raycastTarget = false;
            Object.Destroy(text.GetComponent<ContentSizeFitter>());

            return go.GetComponent<Button>();
        }

        public static InputField CreateInputField(Transform parent, string value, float height = 84f)
        {
            var go = new GameObject("InputField", typeof(Image), typeof(InputField), typeof(LayoutElement));
            go.transform.SetParent(parent, worldPositionStays: false);

            go.GetComponent<Image>().color = Panel;
            go.GetComponent<LayoutElement>().minHeight = height;

            var text = CreateText(go.transform, value, 30, TextPrimary, FontStyle.Normal, TextAnchor.MiddleLeft);
            var textRect = text.rectTransform;
            Stretch(textRect);
            textRect.offsetMin = new Vector2(20f, 0f);
            textRect.offsetMax = new Vector2(-20f, 0f);
            text.horizontalOverflow = HorizontalWrapMode.Overflow;
            Object.Destroy(text.GetComponent<ContentSizeFitter>());

            var input = go.GetComponent<InputField>();
            input.textComponent = text;
            input.text = value;
            input.lineType = InputField.LineType.SingleLine;
            input.keyboardType = TouchScreenKeyboardType.URL;
            input.characterLimit = 200;

            return input;
        }

        public static RawImage CreateRawImage(Transform parent, float size)
        {
            // VerticalLayoutGroup expands its direct children to the column
            // width. Put the QR inside a fixed-height wrapper, then fit a square
            // inside that wrapper so wide phone screens cannot stretch it.
            var wrapper = new GameObject("RawImageContainer", typeof(RectTransform), typeof(LayoutElement));
            wrapper.transform.SetParent(parent, worldPositionStays: false);

            var layout = wrapper.GetComponent<LayoutElement>();
            layout.minHeight = size;
            layout.preferredHeight = size;
            layout.flexibleHeight = 0f;

            var go = new GameObject("RawImage", typeof(RawImage), typeof(AspectRatioFitter));
            go.transform.SetParent(wrapper.transform, worldPositionStays: false);

            var rect = go.GetComponent<RectTransform>();
            Stretch(rect);

            var aspect = go.GetComponent<AspectRatioFitter>();
            aspect.aspectMode = AspectRatioFitter.AspectMode.FitInParent;
            aspect.aspectRatio = 1f;

            return go.GetComponent<RawImage>();
        }

        public static void Stretch(RectTransform rect)
        {
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;
        }

        /// <summary>Fixed vertical gap between stacked elements.</summary>
        public static void CreateSpacer(Transform parent, float height)
        {
            var go = new GameObject("Spacer", typeof(RectTransform), typeof(LayoutElement));
            go.transform.SetParent(parent, worldPositionStays: false);
            go.GetComponent<LayoutElement>().minHeight = height;
        }
    }
}
