const ShaderSource = {
    terrainVertex: `
        attribute vec3 aPosition;
        attribute vec3 aNormal;
        attribute vec2 aTexCoord;

        uniform mat4 uProjection;
        uniform mat4 uView;
        uniform mat4 uModel;

        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying vec2 vTexCoord;
        varying float vHeight;

        void main() {
            vec4 worldPos = uModel * vec4(aPosition, 1.0);
            vWorldPos = worldPos.xyz;
            vNormal = mat3(uModel) * aNormal;
            vTexCoord = aTexCoord;
            vHeight = aPosition.y;
            gl_Position = uProjection * uView * worldPos;
        }
    `,

    terrainFragment: `
        precision highp float;

        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying vec2 vTexCoord;
        varying float vHeight;

        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform vec3 uAmbientColor;
        uniform vec3 uFogColor;
        uniform float uFogDensity;
        uniform float uTime;
        uniform vec3 uCameraPos;
        uniform float uWaterLevel;

        void main() {
            vec3 normal = normalize(vNormal);
            float ndotl = max(dot(normal, normalize(uSunDir)), 0.0);

            vec3 color;
            float h = vHeight;

            if (h < uWaterLevel + 0.5) {
                color = vec3(0.15, 0.35, 0.25);
            } else if (h < uWaterLevel + 8.0) {
                float t = (h - uWaterLevel - 0.5) / 7.5;
                color = mix(vec3(0.15, 0.35, 0.25), vec3(0.2, 0.5, 0.15), t);
            } else if (h < 60.0) {
                float t = (h - 8.0) / 52.0;
                color = mix(vec3(0.2, 0.5, 0.15), vec3(0.35, 0.45, 0.2), t);
            } else if (h < 120.0) {
                float t = (h - 60.0) / 60.0;
                color = mix(vec3(0.35, 0.45, 0.2), vec3(0.45, 0.4, 0.3), t);
            } else if (h < 200.0) {
                float t = (h - 120.0) / 80.0;
                color = mix(vec3(0.45, 0.4, 0.3), vec3(0.6, 0.55, 0.5), t);
            } else {
                float t = min((h - 200.0) / 80.0, 1.0);
                color = mix(vec3(0.6, 0.55, 0.5), vec3(0.95, 0.95, 0.98), t);
            }

            vec3 diffuse = color * uSunColor * ndotl;
            vec3 ambient = color * uAmbientColor;
            vec3 finalColor = ambient + diffuse;

            float dist = length(vWorldPos - uCameraPos);
            float fog = 1.0 - exp(-uFogDensity * dist * dist);
            fog = clamp(fog, 0.0, 1.0);
            finalColor = mix(finalColor, uFogColor, fog);

            gl_FragColor = vec4(finalColor, 1.0);
        }
    `,

    waterVertex: `
        attribute vec3 aPosition;
        attribute vec2 aTexCoord;

        uniform mat4 uProjection;
        uniform mat4 uView;
        uniform mat4 uModel;
        uniform float uTime;

        varying vec3 vWorldPos;
        varying vec2 vTexCoord;
        varying vec3 vNormal;

        void main() {
            vec3 pos = aPosition;
            pos.y += sin(pos.x * 0.05 + uTime * 1.5) * 0.8;
            pos.y += sin(pos.z * 0.03 + uTime * 0.8) * 0.5;

            vec4 worldPos = uModel * vec4(pos, 1.0);
            vWorldPos = worldPos.xyz;
            vTexCoord = aTexCoord;

            float dx = cos(pos.x * 0.05 + uTime * 1.5) * 0.05 * 0.8;
            float dz = cos(pos.z * 0.03 + uTime * 0.8) * 0.03 * 0.5;
            vNormal = normalize(vec3(-dx, 1.0, -dz));

            gl_Position = uProjection * uView * worldPos;
        }
    `,

    waterFragment: `
        precision highp float;

        varying vec3 vWorldPos;
        varying vec2 vTexCoord;
        varying vec3 vNormal;

        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform vec3 uFogColor;
        uniform float uFogDensity;
        uniform vec3 uCameraPos;
        uniform float uTime;

        void main() {
            vec3 normal = normalize(vNormal);
            vec3 viewDir = normalize(uCameraPos - vWorldPos);
            vec3 sunDir = normalize(uSunDir);

            float ndotl = max(dot(normal, sunDir), 0.0);
            vec3 halfVec = normalize(sunDir + viewDir);
            float spec = pow(max(dot(normal, halfVec), 0.0), 128.0);

            vec3 waterColor = vec3(0.05, 0.2, 0.4);
            vec3 deepColor = vec3(0.01, 0.05, 0.15);
            float depth = smoothstep(0.0, 50.0, vWorldPos.y - 0.0);
            waterColor = mix(deepColor, waterColor, depth);

            vec3 diffuse = waterColor * uSunColor * ndotl * 0.6;
            vec3 ambient = waterColor * vec3(0.1, 0.15, 0.2);
            vec3 finalColor = ambient + diffuse + uSunColor * spec * 0.5;

            float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
            finalColor = mix(finalColor, vec3(0.4, 0.6, 0.8), fresnel * 0.3);

            float dist = length(vWorldPos - uCameraPos);
            float fog = 1.0 - exp(-uFogDensity * dist * dist);
            fog = clamp(fog, 0.0, 1.0);
            finalColor = mix(finalColor, uFogColor, fog);

            gl_FragColor = vec4(finalColor, 0.85);
        }
    `,

    skyVertex: `
        attribute vec3 aPosition;
        uniform mat4 uProjection;
        uniform mat4 uView;

        varying vec3 vPosition;

        void main() {
            vPosition = aPosition;
            mat4 viewNoTranslation = uView;
            viewNoTranslation[12] = 0.0;
            viewNoTranslation[13] = 0.0;
            viewNoTranslation[14] = 0.0;
            gl_Position = (uProjection * viewNoTranslation * vec4(aPosition, 1.0)).xyww;
        }
    `,

    skyFragment: `
        precision highp float;

        varying vec3 vPosition;

        uniform vec3 uSunDir;
        uniform vec3 uSkyColor;
        uniform vec3 uSunColor;
        uniform float uTime;
        uniform float uCloudDensity;
        uniform vec3 uFogColor;

        float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            float a = hash(i);
            float b = hash(i + vec2(1.0, 0.0));
            float c = hash(i + vec2(0.0, 1.0));
            float d = hash(i + vec2(1.0, 1.0));
            return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        float fbm(vec2 p) {
            float value = 0.0;
            float amplitude = 0.5;
            for (int i = 0; i < 5; i++) {
                value += amplitude * noise(p);
                p *= 2.0;
                amplitude *= 0.5;
            }
            return value;
        }

        void main() {
            vec3 dir = normalize(vPosition);
            float y = dir.y;

            vec3 zenith = uSkyColor;
            vec3 horizon = mix(uFogColor, uSkyColor, 0.5);
            vec3 color = mix(horizon, zenith, pow(max(y, 0.0), 0.5));

            float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
            color += uSunColor * pow(sunDot, 256.0) * 2.0;
            color += uSunColor * pow(sunDot, 8.0) * 0.3;

            vec3 upDir = vec3(0.0, 1.0, 0.0);
            if (abs(y) > 0.01) {
                upDir = normalize(dir / y);
            }

            vec2 cloudUV = upDir.xz * 3.0;
            float cloudNoise = fbm(cloudUV + uTime * 0.01);
            float clouds = smoothstep(1.0 - uCloudDensity * 0.5, 1.0, cloudNoise);

            vec3 cloudColor = mix(vec3(1.0), uSunColor * 0.5 + vec3(0.5), 0.3);
            color = mix(color, cloudColor, clouds * step(0.0, y) * 0.6);

            if (y < 0.0) {
                color = mix(color, uFogColor, min(-y * 5.0, 1.0));
            }

            gl_FragColor = vec4(color, 1.0);
        }
    `,

    objectVertex: `
        attribute vec3 aPosition;
        attribute vec3 aNormal;

        uniform mat4 uProjection;
        uniform mat4 uView;
        uniform mat4 uModel;
        uniform vec3 uColor;

        varying vec3 vColor;
        varying vec3 vNormal;
        varying vec3 vWorldPos;

        void main() {
            vec4 worldPos = uModel * vec4(aPosition, 1.0);
            vWorldPos = worldPos.xyz;
            vColor = uColor;
            vNormal = mat3(uModel) * aNormal;
            gl_Position = uProjection * uView * worldPos;
        }
    `,

    objectFragment: `
        precision highp float;

        varying vec3 vColor;
        varying vec3 vNormal;
        varying vec3 vWorldPos;

        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform vec3 uAmbientColor;
        uniform vec3 uFogColor;
        uniform float uFogDensity;
        uniform vec3 uCameraPos;

        void main() {
            vec3 normal = normalize(vNormal);
            float ndotl = max(dot(normal, normalize(uSunDir)), 0.0);

            vec3 diffuse = vColor * uSunColor * ndotl;
            vec3 ambient = vColor * uAmbientColor;
            vec3 finalColor = ambient + diffuse;

            float dist = length(vWorldPos - uCameraPos);
            float fog = 1.0 - exp(-uFogDensity * dist * dist);
            fog = clamp(fog, 0.0, 1.0);
            finalColor = mix(finalColor, uFogColor, fog);

            gl_FragColor = vec4(finalColor, 1.0);
        }
    `,

    particleVertex: `
        attribute vec3 aPosition;
        attribute float aSize;
        attribute float aAlpha;

        uniform mat4 uProjection;
        uniform mat4 uView;

        varying float vAlpha;

        void main() {
            vAlpha = aAlpha;
            vec4 viewPos = uView * vec4(aPosition, 1.0);
            gl_Position = uProjection * viewPos;
            gl_PointSize = aSize * 300.0 / -viewPos.z;
        }
    `,

    particleFragment: `
        precision highp float;

        varying float vAlpha;

        void main() {
            vec2 center = gl_PointCoord - 0.5;
            float dist = length(center);
            if (dist > 0.5) discard;
            float alpha = vAlpha * (1.0 - dist * 2.0);
            gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
        }
    `
};
