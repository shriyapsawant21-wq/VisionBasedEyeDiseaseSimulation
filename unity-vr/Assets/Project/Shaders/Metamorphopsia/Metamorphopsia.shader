Shader "VisionSimulation/Metamorphopsia"
{
    Properties
    {
        _EffectEnabled("Effect Enabled", Float) = 0
        _Severity("Severity", Range(0, 1)) = 0
        _WarpStrength("Warp Strength", Range(0, 0.08)) = 0
        _EffectRadius("Effect Radius", Range(0.1, 1.5)) = 0.7
        _WaveFrequency("Wave Frequency", Range(1, 40)) = 16
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
            Name "Metamorphopsia"

            HLSLPROGRAM
            #pragma vertex Vert
            #pragma fragment Frag

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.core/Runtime/Utilities/Blit.hlsl"

            float _EffectEnabled;
            float _Severity;
            float _WarpStrength;
            float _EffectRadius;
            float _WaveFrequency;
            float2 _CenterOffset;

            half4 Frag(Varyings input) : SV_Target
            {
                UNITY_SETUP_STEREO_EYE_INDEX_POST_VERTEX(input);
                float2 uv = input.texcoord;

                if (_EffectEnabled < 0.5 || _Severity <= 0.0001)
                    return SAMPLE_TEXTURE2D_X(_BlitTexture, sampler_LinearClamp, uv);

                float2 center = float2(0.5, 0.5) + _CenterOffset;
                float2 centered = uv - center;
                centered.x *= _ScreenParams.x / _ScreenParams.y;
                float radialDistance = length(centered) * 2.0;
                float centralMask = 1.0 - smoothstep(_EffectRadius * 0.2, _EffectRadius, radialDistance);

                // Two perpendicular low-frequency waves bend straight lines locally.
                float horizontalWave = sin((uv.y + uv.x * 0.35) * _WaveFrequency * 6.2831853);
                float verticalWave = sin((uv.x - uv.y * 0.25) * (_WaveFrequency * 0.83) * 6.2831853 + 1.7);
                float2 displacement = float2(horizontalWave, verticalWave) * _WarpStrength * centralMask;

                // A subtle radial compression prevents the effect looking like simple water ripples.
                displacement += normalize(centered + 0.00001) * sin(radialDistance * 24.0) * _WarpStrength * 0.22 * centralMask;
                float2 warpedUv = saturate(uv + displacement);
                return SAMPLE_TEXTURE2D_X(_BlitTexture, sampler_LinearClamp, warpedUv);
            }
            ENDHLSL
        }
    }
}
