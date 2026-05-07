import { shaderMaterial } from '@react-three/drei'
import * as THREE from 'three'

export const TreeRidgeMaterial = shaderMaterial(
  {
    uTime: 0,
    uWindIntensity: 0.5,
    uWindDirection: new THREE.Vector2(1.0, 0.5),
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
    uniform vec2 uWindDirection;
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

      // Evaluate height using purely noise (no base dome)
      float n = fbm(uv * 3.0 * uFrequency + instanceWorldPos.xy * 0.1);
      float height = n * edgeFade * uAmplitude;

      vec3 pos = position;
      // Exaggerate depth for the terrain to make it peaky
      pos.z += height * uDepthFactor * 1.5 * uHeightScale;

      float temporalPhase = uTime * 2.0;
      float spatialPhase = instanceWorldPos.x * 0.1 + instanceWorldPos.y * 0.1;
      float swayNoise = sin(spatialPhase + temporalPhase) + cos(spatialPhase * 0.5 + temporalPhase * 1.3);

      vec2 windDir = normalize(uWindDirection);
      float sway = height * uWindIntensity * (swayNoise * 0.5 + 0.5) * 0.5;

      pos.x += windDir.x * sway;
      pos.y += windDir.y * sway;

      // Estimate normal from the fbm terrain to get realistic lighting, completely abandoning the cone shape.
      float eps = 0.02;
      float nL = fbm(vec2(uv.x - eps, uv.y) * 3.0 * uFrequency + instanceWorldPos.xy * 0.1) * edgeFade * uAmplitude;
      float nR = fbm(vec2(uv.x + eps, uv.y) * 3.0 * uFrequency + instanceWorldPos.xy * 0.1) * edgeFade * uAmplitude;
      float nD = fbm(vec2(uv.x, uv.y - eps) * 3.0 * uFrequency + instanceWorldPos.xy * 0.1) * edgeFade * uAmplitude;
      float nU = fbm(vec2(uv.x, uv.y + eps) * 3.0 * uFrequency + instanceWorldPos.xy * 0.1) * edgeFade * uAmplitude;

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

    void main() {
      vec4 texColor = texture2D(uTexture, vUv);
      vec4 bgColor = texture2D(uTexture, vec2(0.02, 0.02)); 

      float distToBg = distance(texColor.rgb, bgColor.rgb);

      if (distToBg < 0.08 || texColor.a < 0.1) {
        discard;
      }

      float brightness = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));

      float dx = dFdx(brightness);
      float dy = dFdy(brightness);
      vec3 bumpNormal = normalize(vec3(-dx * 5.0, -dy * 5.0, 1.0));

      vec3 finalNormal = normalize(vNormal + bumpNormal * 0.3);

      vec3 lightDir = normalize(vec3(0.5, -0.2, 1.0)); 
      vec3 fillLight = normalize(vec3(-0.5, 0.2, 0.5));

      float diff = max(dot(finalNormal, lightDir), 0.0);
      float fillDiff = max(dot(finalNormal, fillLight), 0.0);

      vec3 ambient = vec3(0.2, 0.25, 0.3); 
      vec3 calculatedLight = ambient + (vec3(1.0, 0.95, 0.9) * diff * 1.5) + (vec3(0.3, 0.4, 0.5) * fillDiff * 0.8);

      vec3 finalColor = texColor.rgb * calculatedLight;

      gl_FragColor = vec4(finalColor, texColor.a);

      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `
)
