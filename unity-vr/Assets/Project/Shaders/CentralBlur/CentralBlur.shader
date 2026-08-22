Shader "VisionSimulation/CentralBlur"
{
    Properties
    {
        _EffectEnabled("Effect Enabled", Float) = 0
        _Severity("Severity", Range(0, 1)) = 0
        _MaskRadius("Mask Radius", Range(0.01, 1)) = 0.35
        _FeatherWidth("Feather Width", Range(0.001, 0.5)) = 0.18
        _BlurPixels("Blur Pixels", Range(0, 20)) = 0
        _CenterOffset("Center Offset", Vector) = (0, 0, 0, 0)
        _CentralMode("Central Mode", Float) = 0
    }

    SubShader
    {
        Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" }
        ZWrite Off
        ZTest Always
        Cull Off

        Pass
        {
            Name "CentralBlur"

            HLSLPROGRAM
            #pragma vertex Vert
            #pragma fragment Frag

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.core/Runtime/Utilities/Blit.hlsl"

            float _EffectEnabled;
            float _Severity;
            float _MaskRadius;
            float _FeatherWidth;
            float _BlurPixels;
            float2 _CenterOffset;
            float _CentralMode;

            half4 SampleSource(float2 uv)
            {
                return SAMPLE_TEXTURE2D_X(_BlitTexture, sampler_LinearClamp, saturate(uv));
            }

            half4 Frag(Varyings input) : SV_Target
            {
                UNITY_SETUP_STEREO_EYE_INDEX_POST_VERTEX(input);
                float2 uv = input.texcoord;
                half4 source = SampleSource(uv);

                if (_EffectEnabled < 0.5 || _Severity <= 0.0001)
                    return source;

                float2 center = float2(0.5, 0.5) + _CenterOffset;
                float2 centered = uv - center;
                centered.x *= _ScreenParams.x / _ScreenParams.y;
                float radialDistance = length(centered) * 2.0;
                float angle = atan2(centered.y, centered.x);
                float irregularity = 1.0 + 0.10 * sin(angle * 3.0 + 0.8)
                                          + 0.07 * sin(angle * 5.0 - 1.3)
                                          + 0.04 * cos(angle * 7.0 + 0.2);
                float blurMask = 1.0 - smoothstep(_MaskRadius, _MaskRadius + _FeatherWidth, radialDistance);
                float scotomaRadius = _MaskRadius * irregularity;
                float scotomaMask = 1.0 - smoothstep(scotomaRadius, scotomaRadius + _FeatherWidth, radialDistance);

                if (_BlurPixels <= 0.001)
                    return source;

                float2 texel = 1.0 / _ScreenParams.xy;
                float2 radius = texel * _BlurPixels;

                // Dense, overlapping bilinear samples keep high intensities
                // smoothly blurred instead of exposing a sparse pixel grid.
                half4 blurred = 0;
                const half weights[5] = { 0.0625h, 0.25h, 0.375h, 0.25h, 0.0625h };
                [unroll] for (int y = -2; y <= 2; y++)
                {
                    [unroll] for (int x = -2; x <= 2; x++)
                    {
                        float2 offset = float2(x * radius.x * 0.5, y * radius.y * 0.5);
                        blurred += SampleSource(uv + offset) * weights[x + 2] * weights[y + 2];
                    }
                }

                // Crossfade the two rendered results so automated blur-to-scotoma
                // transitions never switch modes in a single frame.
                half4 blurResult = lerp(source, blurred, blurMask);
                const half grey = 0.014444h;
                half4 scotomaResult = lerp(source, half4(grey, grey, grey, source.a), scotomaMask);
                return lerp(blurResult, scotomaResult, saturate(_CentralMode));
            }
            ENDHLSL
        }
    }
}
