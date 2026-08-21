Shader "VisionSimulation/TunnelVision"
{
    Properties
    {
        _EffectEnabled("Effect Enabled", Float) = 0
        _Severity("Severity", Range(0, 1)) = 0
        _ClearRadius("Clear Radius", Range(0, 1)) = 1
        _FeatherWidth("Feather Width", Range(0.001, 0.5)) = 0.12
        _PeripheralDarkness("Peripheral Darkness", Range(0, 1)) = 0
        _PeripheralSaturation("Peripheral Saturation", Range(0, 1)) = 1
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
            Name "TunnelVision"

            HLSLPROGRAM
            #pragma vertex Vert
            #pragma fragment Frag

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.core/Runtime/Utilities/Blit.hlsl"

            float _EffectEnabled;
            float _Severity;
            float _ClearRadius;
            float _FeatherWidth;
            float _PeripheralDarkness;
            float _PeripheralSaturation;
            float2 _CenterOffset;

            half4 Frag(Varyings input) : SV_Target
            {
                UNITY_SETUP_STEREO_EYE_INDEX_POST_VERTEX(input);
                float2 uv = input.texcoord;
                half4 source = SAMPLE_TEXTURE2D_X(_BlitTexture, sampler_LinearClamp, uv);

                if (_EffectEnabled < 0.5 || _Severity <= 0.0001)
                    return source;

                float2 centered = uv - (float2(0.5, 0.5) + _CenterOffset);
                centered.x *= _ScreenParams.x / _ScreenParams.y;
                float radialDistance = length(centered) * 2.0;
                float peripheralMask = smoothstep(_ClearRadius, _ClearRadius + _FeatherWidth, radialDistance);

                half luminance = dot(source.rgb, half3(0.2126h, 0.7152h, 0.0722h));
                half3 desaturated = lerp(luminance.xxx, source.rgb, _PeripheralSaturation);
                half3 peripheral = desaturated * (1.0h - _PeripheralDarkness);
                source.rgb = lerp(source.rgb, peripheral, peripheralMask);
                return source;
            }
            ENDHLSL
        }
    }
}
