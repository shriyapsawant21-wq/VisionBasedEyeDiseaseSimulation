Shader "VisionSimulation/CentralBlur"
{
    Properties
    {
        _EffectEnabled("Effect Enabled", Float) = 0
        _Severity("Severity", Range(0, 1)) = 0
        _MaskRadius("Mask Radius", Range(0.01, 1)) = 0.35
        _FeatherWidth("Feather Width", Range(0.001, 0.5)) = 0.18
        _BlurPixels("Blur Pixels", Range(0, 20)) = 0
        _CentralContrast("Central Contrast", Range(0, 1)) = 1
        _CenterOffset("Center Offset", Vector) = (0, 0, 0, 0)
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
            float _CentralContrast;
            float2 _CenterOffset;

            half4 SampleSource(float2 uv)
            {
                return SAMPLE_TEXTURE2D_X(_BlitTexture, sampler_LinearClamp, saturate(uv));
            }

            half4 Frag(Varyings input) : SV_Target
            {
                UNITY_SETUP_STEREO_EYE_INDEX_POST_VERTEX(input);
                float2 uv = input.texcoord;
                half4 source = SampleSource(uv);

                if (_EffectEnabled < 0.5 || _Severity <= 0.0001 || _BlurPixels <= 0.001)
                    return source;

                float2 center = float2(0.5, 0.5) + _CenterOffset;
                float2 centered = uv - center;
                centered.x *= _ScreenParams.x / _ScreenParams.y;
                float radialDistance = length(centered) * 2.0;
                float centralMask = 1.0 - smoothstep(_MaskRadius, _MaskRadius + _FeatherWidth, radialDistance);

                float2 texel = 1.0 / _ScreenParams.xy;
                float2 radius = texel * _BlurPixels;

                half4 blurred = source * 0.20h;
                blurred += SampleSource(uv + float2( radius.x, 0)) * 0.10h;
                blurred += SampleSource(uv + float2(-radius.x, 0)) * 0.10h;
                blurred += SampleSource(uv + float2(0,  radius.y)) * 0.10h;
                blurred += SampleSource(uv + float2(0, -radius.y)) * 0.10h;
                blurred += SampleSource(uv + float2( radius.x,  radius.y)) * 0.10h;
                blurred += SampleSource(uv + float2(-radius.x,  radius.y)) * 0.10h;
                blurred += SampleSource(uv + float2( radius.x, -radius.y)) * 0.10h;
                blurred += SampleSource(uv + float2(-radius.x, -radius.y)) * 0.10h;

                blurred.rgb = (blurred.rgb - 0.5h) * _CentralContrast + 0.5h;
                return lerp(source, blurred, centralMask);
            }
            ENDHLSL
        }
    }
}
