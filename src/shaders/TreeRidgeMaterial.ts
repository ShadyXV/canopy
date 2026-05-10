import { shaderMaterial } from '@react-three/drei'
import * as THREE from 'three'

export const TreeRidgeMaterial = shaderMaterial(
  {
    uTime: 0,
    uWindIntensity: 0.5,
    uWindRandomness: 0.3,
    uDepthFactor: 1.0,
    uAmplitude: 0.6,
    uFrequency: 1.0,
    uHeightScale: 0.5,
    uTexture: new THREE.Texture(),
  },
  `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPos;

    uniform float uTime;
    uniform float uWindIntensity;
    uniform float uWindRandomness;
    uniform float uDepthFactor;
    uniform float uAmplitude;
    uniform float uFrequency;
    uniform float uHeightScale;

    float random(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123); }
    float noise(vec2 st) {
        vec2 i = floor(st); vec2 f = fract(st); float a = random(i); float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0)); float d = random(i + vec2(1.0, 1.0)); vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }
    float fbm(vec2 st) {
        float v = 0.0; float a = 0.5; vec2 shift = vec2(100.0); mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
        for (int i = 0; i < 4; ++i) { v += a * noise(st); st = rot * st * 2.0 + shift; a *= 0.5; }
        return v;
    }

    void main() {
      vUv = uv;

      // To prevent floating edges, taper the very edges of the quad, 
      // but otherwise let it be a full square terrain.
      float edgeX = smoothstep(0.0, 0.15, uv.x) * smoothstep(1.0, 0.85, uv.x);
      float edgeY = smoothstep(0.0, 0.15, uv.y) * smoothstep(1.0, 0.85, uv.y);
      float edgeFade = edgeX * edgeY;

      vec4 instanceWorldPos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);

      // Cosine dome: flat top, rounds down to zero at radius 0.5 — clearly different from cone
      float dist = distance(uv, vec2(0.5));
      float sphereBase = max(0.0, cos(dist * 3.14159));
      float n = fbm(uv * 3.0 * uFrequency + instanceWorldPos.xy * 0.1);
      // Sphere base drives silhouette; noise sits on top (edge-faded separately)
      float height = sphereBase + n * uAmplitude * edgeFade;

      vec3 pos = position;
      pos.z += height * uDepthFactor * 1.5 * uHeightScale;

      float windAngle = 0.785 + sin(uTime * 0.11) * 0.35 + sin(uTime * 0.07) * 0.18;
      vec2 windDir = vec2(cos(windAngle), sin(windAngle));
      float windPos = dot(instanceWorldPos.xy, windDir) * 0.28;
      float randPhase = fract(sin(dot(instanceWorldPos.xy, vec2(127.1, 311.7))) * 43758.5453) * 6.28318;
      float basePhase = mix(windPos, randPhase, uWindRandomness);
      float wave1 = sin(uTime * 1.1  + basePhase);
      float wave2 = sin(uTime * 2.7  + basePhase * 1.3 + 2.1) * 0.30;
      float wave3 = sin(uTime * 0.45 + basePhase * 0.7) * 0.55;
      float uvRipple = sin(uTime * 1.9 + windPos + dot(uv - vec2(0.5), windDir) * 3.5) * 0.22;
      float swayAmount = (wave1 + wave2 + wave3 + uvRipple) * height * uWindIntensity * 0.08;
      pos.x += windDir.x * swayAmount;
      pos.y += windDir.y * swayAmount;

      // Normals: evaluate full height function at each offset (cosine sphere + noise)
      float eps = 0.02;
      float nL = max(0.0, cos(distance(vec2(uv.x - eps, uv.y), vec2(0.5)) * 3.14159)) + fbm(vec2(uv.x - eps, uv.y) * 3.0 * uFrequency + instanceWorldPos.xy * 0.1) * uAmplitude * edgeFade;
      float nR = max(0.0, cos(distance(vec2(uv.x + eps, uv.y), vec2(0.5)) * 3.14159)) + fbm(vec2(uv.x + eps, uv.y) * 3.0 * uFrequency + instanceWorldPos.xy * 0.1) * uAmplitude * edgeFade;
      float nD = max(0.0, cos(distance(vec2(uv.x, uv.y - eps), vec2(0.5)) * 3.14159)) + fbm(vec2(uv.x, uv.y - eps) * 3.0 * uFrequency + instanceWorldPos.xy * 0.1) * uAmplitude * edgeFade;
      float nU = max(0.0, cos(distance(vec2(uv.x, uv.y + eps), vec2(0.5)) * 3.14159)) + fbm(vec2(uv.x, uv.y + eps) * 3.0 * uFrequency + instanceWorldPos.xy * 0.1) * uAmplitude * edgeFade;

      float nx = (nL - nR) * uDepthFactor * 20.0;
      float ny = (nD - nU) * uDepthFactor * 20.0;
      
      vec3 localNormal = normalize(vec3(nx, ny, 1.0));
      vNormal = normalize(mat3(instanceMatrix) * localNormal);

      vec4 mvPosition = viewMatrix * modelMatrix * instanceMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      vWorldPos = (modelMatrix * instanceMatrix * vec4(pos, 1.0)).xyz;
    }
  `,
  `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPos;

    uniform sampler2D uTexture;
    uniform float uAmplitude;

    void main() {
      vec4 texColor = texture2D(uTexture, vUv);
      if (texColor.a < 0.1) {
        discard;
      }

      float brightness = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));

      float dx = dFdx(brightness);
      float dy = dFdy(brightness);
      vec3 bumpNormal = normalize(vec3(-dx * 5.0, -dy * 5.0, 1.0));

      // At low amplitude the geometry is flat — let texture bump carry local detail.
      // At high amplitude the fbm normals are strong — let them drive shading,
      // and pull ambient down so ridges cast visible shadows.
      float bumpWeight = mix(0.6, 0.05, clamp(uAmplitude / 1.5, 0.0, 1.0));
      vec3 finalNormal = normalize(vNormal + bumpNormal * bumpWeight);

      vec3 lightDir  = normalize(vec3(0.5, -0.2, 1.0));
      vec3 fillLight = normalize(vec3(-0.5, 0.2, 0.5));

      float diff     = max(dot(finalNormal, lightDir),  0.0);
      float fillDiff = max(dot(finalNormal, fillLight), 0.0);

      // Higher amplitude → lower ambient → more contrast between lit peaks and dark valleys
      float amb = mix(0.28, 0.08, clamp(uAmplitude / 1.5, 0.0, 1.0));
      vec3 ambient = vec3(amb, amb + 0.03, amb + 0.06);
      float sunStr = mix(1.2, 2.0, clamp(uAmplitude / 1.5, 0.0, 1.0));
      vec3 calculatedLight = ambient
        + vec3(1.0, 0.95, 0.9) * diff * sunStr
        + vec3(0.3, 0.4, 0.5) * fillDiff * 0.7;

      vec3 finalColor = texColor.rgb * calculatedLight;

      gl_FragColor = vec4(finalColor, texColor.a);

      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `
)
