Shader "VisionSimulation/Floaters"
{
    Properties
    {
        _EffectEnabled("Effect Enabled", Float) = 0
        _Severity("Severity", Range(0, 1)) = 0.5
        _FloaterType("Floater Type", Float) = 0
        _MovementSpeed("Movement Speed", Range(0.05, 1)) = 0.22
        _GhostOpacity("Ghost Opacity", Range(0, 1)) = 0.42
        _RingOpacity("Ring Opacity", Range(0, 1)) = 0.48
        _FlashProgress("Flash Progress", Range(0, 1)) = 0
        _FlashOrigin("Flash Origin", Vector) = (0.75, 0.5, 0, 0)
        _FlashDirection("Flash Direction", Vector) = (-1, 0, 0, 0)
        _FlashDistance("Flash Distance", Range(0, 1)) = 0.4
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" }
        ZWrite Off ZTest Always Cull Off
        Pass
        {
            Name "Floaters"
            HLSLPROGRAM
            #pragma vertex Vert
            #pragma fragment Frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.core/Runtime/Utilities/Blit.hlsl"

            float _EffectEnabled, _Severity, _FloaterType, _MovementSpeed;
            float _GhostOpacity, _RingOpacity;
            float _FlashProgress;
            float2 _FlashOrigin, _FlashDirection;
            float _FlashDistance;

            float hash11(float p) { return frac(sin(p * 127.1) * 43758.5453); }
            float2 hash21(float p) { return frac(sin(float2(p * 127.1, p * 311.7)) * 43758.5453); }

            float2 driftingPosition(float seed, float time)
            {
                float2 basePos = lerp(float2(0.18, 0.2), float2(0.82, 0.8), hash21(seed));
                return basePos + float2(sin(time * (0.61 + hash11(seed)) + seed),
                                        cos(time * (0.47 + hash11(seed + 3.0)) + seed * 1.7)) * 0.075;
            }

            float2 topHalfPosition(float seed, float time)
            {
                float2 basePos = lerp(float2(0.18, 0.58), float2(0.82, 0.88), hash21(seed));
                return basePos + float2(sin(time * 1.03 + seed),
                                        cos(time * 0.79 + seed * 1.7)) * float2(0.075, 0.045);
            }

            float2 centralDriftingPosition(float seed, float time)
            {
                float2 basePos = lerp(float2(0.22, 0.22), float2(0.78, 0.78), hash21(seed));
                return basePos + float2(sin(time * (0.61 + hash11(seed)) + seed),
                                        cos(time * (0.47 + hash11(seed + 3.0)) + seed * 1.7)) * 0.065;
            }

            float softDot(float2 uv, float2 center, float radius, float feather)
            {
                return 1.0 - smoothstep(radius - feather, radius + feather, length(uv - center));
            }

            float ghostWorm(float2 uv, float2 center, float scale, float phase, float angle)
            {
                float sineAngle = sin(angle), cosineAngle = cos(angle);
                float2x2 inverseRotation = float2x2(cosineAngle, sineAngle, -sineAngle, cosineAngle);
                float2 local = mul(inverseRotation, uv - center) / scale;
                float waveY = sin((local.x / 0.018 + 3.0) * 1.35 + phase) * 0.014;
                float body = 1.0 - smoothstep(0.0025, 0.0075, abs(local.y - waveY));
                float ends = 1.0 - smoothstep(0.047, 0.059, abs(local.x));
                return body * ends;
            }

            half4 Frag(Varyings input) : SV_Target
            {
                UNITY_SETUP_STEREO_EYE_INDEX_POST_VERTEX(input);
                float2 uv = input.texcoord;
                half4 source = SAMPLE_TEXTURE2D_X(_BlitTexture, sampler_LinearClamp, uv);
                if (_EffectEnabled < 0.5 || _Severity < 0.001) return source;

                float aspect = _ScreenParams.x / _ScreenParams.y;
                float2 shapeUV = float2((uv.x - 0.5) * aspect + 0.5, uv.y);
                float time = _Time.y * _MovementSpeed;
                float darkMask = 0.0, lightMask = 0.0, lightCoreMask = 0.0, redMask = 0.0;

                if (_FloaterType < 0.5)
                {
                    float2 c = driftingPosition(2.3, time);
                    c.x = (c.x - 0.5) * aspect + 0.5;
                    float2 delta = shapeUV - c;
                    float angle = atan2(delta.y, delta.x);
                    float radius = lerp(0.030, 0.043, _Severity);
                    float amoebaRadius = radius * (1.0
                        + 0.13 * sin(angle * 3.0 + time * 0.7)
                        + 0.09 * sin(angle * 5.0 - 1.2)
                        + 0.05 * cos(angle * 2.0 + 0.8));
                    float ring = 1.0 - smoothstep(0.0015, 0.006, abs(length(delta) - amoebaRadius));
                    lightMask = ring * _RingOpacity;
                }
                else if (_FloaterType < 1.5)
                {
                    float2 c = topHalfPosition(5.7, time * 1.08);
                    c.x = (c.x - 0.5) * aspect + 0.5;
                    darkMask = softDot(shapeUV, c, lerp(0.0055, 0.0095, _Severity), 0.003);
                }
                else if (_FloaterType < 2.5)
                {
                    [unroll] for (int i = 0; i < 12; i++)
                    {
                        float visible = step(i, lerp(5.0, 11.0, _Severity));
                        float2 c = driftingPosition(i + 10.0, time);
                        c.x = (c.x - 0.5) * aspect + 0.5;
                        float angle = lerp(-1.35, 1.35, hash11(i + 41.0));
                        angle += sin(_Time.y * lerp(0.12, 0.20, hash11(i + 67.0)) + i * 1.7) * 0.12;
                        lightMask = max(lightMask, ghostWorm(shapeUV, c, lerp(0.42, 0.72, hash11(i + 8.0)), i, angle) * visible);
                    }
                    lightMask *= _GhostOpacity * 0.72;
                }
                else if (_FloaterType < 3.5)
                {
                    [unroll] for (int i = 0; i < 28; i++)
                    {
                        float visible = step(i, lerp(10.0, 27.0, _Severity));
                        float2 c = centralDriftingPosition(i + 30.0, time);
                        c.x = (c.x - 0.5) * aspect + 0.5;
                        float radius = lerp(0.0025, 0.007, hash11(i + 19.0));
                        darkMask = max(darkMask, softDot(shapeUV, c, radius, 0.002) * visible);
                    }
                }
                else if (_FloaterType < 4.5)
                {
                    if (_FlashProgress <= 0.0)
                        return source;

                    // A straight peripheral light ray travels along its own axis.
                    float2 flashCenter = clamp(
                        _FlashOrigin + _FlashDirection * (_FlashProgress * _FlashDistance),
                        float2(0.10, 0.12), float2(0.90, 0.88));
                    flashCenter.x = (flashCenter.x - 0.5) * aspect + 0.5;
                    float2 flash = shapeUV - flashCenter;
                    float2 rayDirection = normalize(float2(_FlashDirection.x * aspect, _FlashDirection.y));
                    float2 rayNormal = float2(-rayDirection.y, rayDirection.x);
                    float distanceAlongRay = dot(flash, rayDirection);
                    float distanceAcrossRay = abs(dot(flash, rayNormal));
                    float rayEnds = 1.0 - smoothstep(0.30, 0.44, abs(distanceAlongRay));
                    float width = lerp(0.032, 0.052, _Severity);
                    float halo = (1.0 - smoothstep(0.0, width * 3.2, distanceAcrossRay)) * rayEnds;
                    float flashEnvelope = sin(saturate(_FlashProgress) * 3.14159265);
                    lightMask = saturate(halo * lerp(0.62, 0.88, _Severity) * flashEnvelope);
                }
                else
                {
                    // Two softly feathered retinal blood streaks. Their curved
                    // center lines are procedural so no texture stretches in XR.
                    float2 first = shapeUV - float2(0.34, 0.60);
                    float firstCurve = sin(first.y * 18.0 + 0.4) * 0.020 + first.y * 0.16;
                    float firstBody = 1.0 - smoothstep(0.0030, 0.0105, abs(first.x - firstCurve));
                    float firstEnds = 1.0 - smoothstep(0.13, 0.21, abs(first.y));

                    float2 second = shapeUV - float2(0.70, 0.42);
                    float secondCurve = second.y * second.y * 0.55 - second.y * 0.09
                                      + sin(second.y * 11.0 - 0.8) * 0.008;
                    float secondBody = 1.0 - smoothstep(0.0028, 0.0095, abs(second.x - secondCurve));
                    float secondEnds = 1.0 - smoothstep(0.11, 0.19, abs(second.y));
                    float secondVisibility = smoothstep(0.38, 0.72, _Severity);
                    redMask = saturate(firstBody * firstEnds + secondBody * secondEnds * secondVisibility);
                    redMask *= lerp(0.78, 0.98, _Severity);
                }

                source.rgb = lerp(source.rgb, half3(0,0,0), saturate(darkMask));
                half3 flashColour = half3(1.0h, 0.97h, 0.78h);
                source.rgb = lerp(source.rgb, flashColour, saturate(lightMask));
                source.rgb = lerp(source.rgb, half3(1.0h, 1.0h, 0.96h), saturate(lightCoreMask));
                float luminance = dot(source.rgb, half3(0.2126, 0.7152, 0.0722));
                source.rgb = saturate(lerp(luminance.xxx, source.rgb, 1.08) * 1.07);
                // Vivid blood red (#D11212 in the project's linear colour space).
                source.rgb = lerp(source.rgb, half3(0.637597h, 0.006049h, 0.006049h), saturate(redMask));
                return source;
            }
            ENDHLSL
        }
    }
}
