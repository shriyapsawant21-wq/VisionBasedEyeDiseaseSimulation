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
        _WebTexture("Spider Web Texture", 2D) = "black" {}
        _OverlayRing("Automated Ring Overlay", Range(0, 1)) = 0
        _OverlayDots("Automated Dot Overlay", Range(0, 1)) = 0
        _OverlayRed("Automated Blood Overlay", Range(0, 1)) = 0
        _CurtainOverlay("Automated Curtain Overlay", Range(0, 1)) = 0
        _BlackoutOverlay("Automated Blackout Overlay", Range(0, 1)) = 0
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
            float _OverlayRing, _OverlayDots, _OverlayRed;
            float _CurtainOverlay, _BlackoutOverlay;
            TEXTURE2D(_WebTexture);
            SAMPLER(sampler_WebTexture);

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

            float2 bottomDriftingPosition(float seed, float time)
            {
                float2 randomPosition = hash21(seed);
                float2 basePos = float2(
                    lerp(0.08, 0.92, randomPosition.x),
                    0.05 + pow(randomPosition.y, 1.8) * 0.57);
                return basePos + float2(
                    sin(time * (0.58 + hash11(seed)) + seed) * 0.055,
                    cos(time * (0.42 + hash11(seed + 3.0)) + seed * 1.7) * 0.035);
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
                float darkMask = 0.0, lightMask = 0.0, whiteGlowMask = 0.0, redMask = 0.0;
                float additiveFlashMask = 0.0;

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
                    // Slow synchronized flicker: a translucent white glow and a
                    // fine vitreous web cropped into the top-left corner.
                    float flickerWave = 0.5 + 0.5 * sin(_Time.y * 3.35);
                    float flicker = smoothstep(0.12, 0.76, flickerWave);

                    // Keep the authored jagged silhouette, but render it as a
                    // diffuse retinal flash instead of a solid lightning bolt.
                    float2 boltStart = float2(0.985, 0.985);
                    float2 boltEnd = float2(0.48, 0.48);
                    boltStart.x = (boltStart.x - 0.5) * aspect + 0.5;
                    boltEnd.x = (boltEnd.x - 0.5) * aspect + 0.5;
                    float2 boltDirection = normalize(boltEnd - boltStart);
                    float2 boltNormal = float2(-boltDirection.y, boltDirection.x);
                    float boltLength = length(boltEnd - boltStart);
                    float2 boltDelta = shapeUV - boltStart;
                    float distanceAlongBolt = dot(boltDelta, boltDirection);
                    float distanceAcrossBolt = dot(boltDelta, boltNormal);
                    float jaggedCenter = sin(distanceAlongBolt * 29.0 + 0.8) * 0.014
                                       + sin(distanceAlongBolt * 73.0 - 0.4) * 0.006;
                    float mainEnds = smoothstep(0.0, 0.035, distanceAlongBolt)
                                   * (1.0 - smoothstep(boltLength - 0.055, boltLength, distanceAlongBolt));
                    float mainDistance = abs(distanceAcrossBolt - jaggedCenter);

                    float branchOneAlong = distanceAlongBolt - boltLength * 0.28;
                    float branchOneCenter = jaggedCenter + branchOneAlong * 1.35
                                          + sin(branchOneAlong * 59.0) * 0.006;
                    float branchOneEnds = step(0.0, branchOneAlong)
                                        * (1.0 - smoothstep(0.13, 0.23, branchOneAlong));
                    float branchOneDistance = abs(distanceAcrossBolt - branchOneCenter) / 1.68;

                    float branchTwoAlong = distanceAlongBolt - boltLength * 0.48;
                    float branchTwoCenter = jaggedCenter - branchTwoAlong * 1.55
                                          + sin(branchTwoAlong * 67.0 + 0.5) * 0.006;
                    float branchTwoEnds = step(0.0, branchTwoAlong)
                                        * (1.0 - smoothstep(0.12, 0.22, branchTwoAlong));
                    float branchTwoDistance = abs(distanceAcrossBolt - branchTwoCenter) / 1.84;

                    float branchThreeAlong = distanceAlongBolt - boltLength * 0.64;
                    float branchThreeCenter = jaggedCenter + branchThreeAlong * 1.10
                                            + sin(branchThreeAlong * 71.0 - 0.3) * 0.005;
                    float branchThreeEnds = step(0.0, branchThreeAlong)
                                          * (1.0 - smoothstep(0.08, 0.16, branchThreeAlong));
                    float branchThreeDistance = abs(distanceAcrossBolt - branchThreeCenter) / 1.49;

                    float boltWidth = lerp(0.0045, 0.0075, _Severity);
                    float narrowBolt = (1.0 - smoothstep(0.0, boltWidth * 1.8, mainDistance)) * mainEnds;
                    float broadBolt = (1.0 - smoothstep(boltWidth * 0.5, boltWidth * 10.5, mainDistance)) * mainEnds;
                    narrowBolt = max(narrowBolt,
                        (1.0 - smoothstep(0.0, boltWidth * 1.35, branchOneDistance)) * branchOneEnds);
                    narrowBolt = max(narrowBolt,
                        (1.0 - smoothstep(0.0, boltWidth * 1.25, branchTwoDistance)) * branchTwoEnds);
                    narrowBolt = max(narrowBolt,
                        (1.0 - smoothstep(0.0, boltWidth * 1.15, branchThreeDistance)) * branchThreeEnds);
                    broadBolt = max(broadBolt,
                        (1.0 - smoothstep(boltWidth * 0.5, boltWidth * 7.5, branchOneDistance)) * branchOneEnds);
                    broadBolt = max(broadBolt,
                        (1.0 - smoothstep(boltWidth * 0.5, boltWidth * 7.0, branchTwoDistance)) * branchTwoEnds);
                    broadBolt = max(broadBolt,
                        (1.0 - smoothstep(boltWidth * 0.5, boltWidth * 6.5, branchThreeDistance)) * branchThreeEnds);
                    float glow = saturate(broadBolt * 0.48 + narrowBolt * 0.045);

                    // Apply the additive light treatment directly to the
                    // original flash silhouette rather than drawing another
                    // flare on top of the scene.
                    additiveFlashMask = saturate(
                        glow * flicker * lerp(0.55, 1.0, _Severity));

                    // Use the authored strand geometry as a luminance mask. The
                    // dark preview checker is discarded, leaving only the silk.
                    // Keep the web's hub near the upper-left and confine the
                    // visible strands to that corner.
                    float2 webUV = float2((uv.x + 0.10) / 0.45, (uv.y - 0.66) / 0.42);
                    float webBounds = step(0.0, webUV.x) * step(webUV.x, 1.0)
                                    * step(0.0, webUV.y) * step(webUV.y, 1.0);
                    float2 warpedWebUV = webUV;
                    warpedWebUV.x += sin(webUV.y * 8.0 + 0.7) * 0.018;
                    warpedWebUV.y += sin(webUV.x * 7.0 - 0.4) * 0.014;
                    half3 webSample = SAMPLE_TEXTURE2D(_WebTexture, sampler_WebTexture, saturate(warpedWebUV)).rgb;
                    float webLuminance = dot(webSample, half3(0.2126, 0.7152, 0.0722));
                    float web = smoothstep(0.085, 0.48, webLuminance) * webBounds;

                    whiteGlowMask = saturate(
                        web * lerp(0.28, 0.52, _Severity) * flicker);
                }
                else
                {
                    // A mobile shower of small blood floaters. This follows the
                    // black-dot motion but uses smaller spots and a separate seed.
                    [unroll] for (int i = 0; i < 72; i++)
                    {
                        float visible = step(i, lerp(28.0, 71.0, _Severity));
                        float2 c = bottomDriftingPosition(i + 83.0, time * 1.12);
                        c.x = (c.x - 0.5) * aspect + 0.5;
                        float radius = lerp(0.0014, 0.0042, hash11(i + 107.0));
                        redMask = max(redMask, softDot(shapeUV, c, radius, 0.0013) * visible);
                    }
                }

                // Automated disease timelines retain earlier symptoms while a
                // later floater/flash type is active in this single render pass.
                if (_OverlayRing > 0.001)
                {
                    float2 c = driftingPosition(2.3, time);
                    c.x = (c.x - 0.5) * aspect + 0.5;
                    float2 delta = shapeUV - c;
                    float angle = atan2(delta.y, delta.x);
                    float radius = 0.037;
                    float amoebaRadius = radius * (1.0 + 0.13 * sin(angle * 3.0 + time * 0.7)
                        + 0.09 * sin(angle * 5.0 - 1.2) + 0.05 * cos(angle * 2.0 + 0.8));
                    lightMask = max(lightMask,
                        (1.0 - smoothstep(0.0015, 0.006, abs(length(delta) - amoebaRadius)))
                        * _RingOpacity * _OverlayRing);
                }

                if (_OverlayDots > 0.001)
                {
                    [unroll] for (int i = 0; i < 18; i++)
                    {
                        float2 c = centralDriftingPosition(i + 30.0, time);
                        c.x = (c.x - 0.5) * aspect + 0.5;
                        float radius = lerp(0.0025, 0.007, hash11(i + 19.0));
                        // Overlay strength controls when the dots appear, not
                        // their opacity: retained black dots stay fully opaque.
                        darkMask = max(darkMask, softDot(shapeUV, c, radius, 0.002));
                    }
                }

                if (_OverlayRed > 0.001)
                {
                    [unroll] for (int i = 0; i < 72; i++)
                    {
                        // Progressively add fully coloured spots instead of
                        // fading translucent streaks over the disease timeline.
                        float visible = step(hash11(i + 151.0), _OverlayRed);
                        float2 c = bottomDriftingPosition(i + 83.0, time * 1.12);
                        c.x = (c.x - 0.5) * aspect + 0.5;
                        float radius = lerp(0.0014, 0.0042, hash11(i + 107.0));
                        redMask = max(redMask, softDot(shapeUV, c, radius, 0.0013) * visible);
                    }
                }

                source.rgb = lerp(source.rgb, half3(0,0,0), saturate(darkMask));
                half3 flashColour = half3(1.0h, 0.97h, 0.78h);
                source.rgb = lerp(source.rgb, flashColour, saturate(lightMask));
                source.rgb = lerp(source.rgb, half3(1.0h, 1.0h, 1.0h), saturate(whiteGlowMask));
                source.rgb = saturate(source.rgb
                    + half3(1.0h, 0.84h, 0.56h) * saturate(additiveFlashMask));
                float luminance = dot(source.rgb, half3(0.2126, 0.7152, 0.0722));
                source.rgb = saturate(lerp(luminance.xxx, source.rgb, 1.08) * 1.07);
                // Vivid blood red (#D11212 in the project's linear colour space).
                source.rgb = lerp(source.rgb, half3(0.637597h, 0.006049h, 0.006049h), saturate(redMask));
                if (_CurtainOverlay > 0.001)
                {
                    float advancingEdge = lerp(0.015, 1.04, _CurtainOverlay);
                    float unevenEdge = advancingEdge
                        + sin(uv.y * 17.0 + 0.7) * 0.018
                        + sin(uv.y * 31.0 - 1.1) * 0.009;
                    float curtain = 1.0 - smoothstep(unevenEdge - 0.018, unevenEdge + 0.018, uv.x);
                    source.rgb = lerp(source.rgb, half3(0, 0, 0), curtain);
                }
                source.rgb = lerp(source.rgb, half3(0, 0, 0), _BlackoutOverlay);
                return source;
            }
            ENDHLSL
        }
    }
}
