import { shaderMaterial } from '@react-three/drei'
import * as THREE from 'three'

export const TreeConeMaterial = shaderMaterial(
  {
    uTime: 0,
    uWindIntensity: 0.5,
    uWindRandomness: 0.3,
    uDepthFactor: 1.0,
    uHeightScale: 0.5,
    uAmplitude: 1.0,
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
    uniform float uHeightScale;
    uniform float uAmplitude;

    void main() {
      vUv = uv;

      float dist = distance(uv, vec2(0.5));
      float height = smoothstep(0.5, 0.0, dist);

      vec3 pos = position;
      pos.z += height * uDepthFactor * uHeightScale;

      vec4 instanceWorldPos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);

      // Wind direction wanders slowly — organic, no user control needed
      float windAngle = 0.785 + sin(uTime * 0.11) * 0.35 + sin(uTime * 0.07) * 0.18;
      vec2 windDir = vec2(cos(windAngle), sin(windAngle));

      // Ripple phase: trees further along wind direction are at a later wave phase
      float windPos = dot(instanceWorldPos.xy, windDir) * 0.28;
      // Per-tree random phase seed
      float randPhase = fract(sin(dot(instanceWorldPos.xy, vec2(127.1, 311.7))) * 43758.5453) * 6.28318;
      // Blend: low randomness = coherent ripple, high = each tree independent
      float basePhase = mix(windPos, randPhase, uWindRandomness);

      // Multi-layer oscillation for organic, non-mechanical feel
      float wave1 = sin(uTime * 1.1  + basePhase);
      float wave2 = sin(uTime * 2.7  + basePhase * 1.3 + 2.1) * 0.30;
      float wave3 = sin(uTime * 0.45 + basePhase * 0.7) * 0.55;
      // Ripple passing through the canopy surface
      float uvRipple = sin(uTime * 1.9 + windPos + dot(uv - vec2(0.5), windDir) * 3.5) * 0.22;

      float swayAmount = (wave1 + wave2 + wave3 + uvRipple) * height * uWindIntensity * 0.08;
      pos.x += windDir.x * swayAmount;
      pos.y += windDir.y * swayAmount;

      // Use the 'dist' already calculated on line 29
      float t = clamp(1.0 - dist * 2.0, 0.0, 1.0); 
      float dh_dt = 6.0 * t * (1.0 - t);
      float dh_dr = dh_dt * -2.0;
      
      float dr_dx = (dist > 0.0001) ? (uv.x - 0.5) / dist : 0.0;
      float dr_dy = (dist > 0.0001) ? (uv.y - 0.5) / dist : 0.0;
      
      float slope = uDepthFactor * uHeightScale;
      float nx = -dh_dr * dr_dx * slope;
      float ny = -dh_dr * dr_dy * slope;

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
    uniform float uHeightScale;

    void main() {
      vec4 texColor = texture2D(uTexture, vUv);
      if (texColor.a < 0.1) {
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

      // Exaggerated shadow based on heightScale (0.05 -> 0.3)
      float hFactor = clamp((uHeightScale - 0.05) / 0.25, 0.0, 1.0);
      float amb = mix(0.32, 0.05, hFactor); 
      
      vec3 ambient = vec3(amb, amb + 0.02, amb + 0.04);
      vec3 calculatedLight = ambient + (vec3(1.0, 0.95, 0.9) * diff * 1.5) + (vec3(0.3, 0.4, 0.5) * fillDiff * 0.8);

      vec3 finalColor = texColor.rgb * calculatedLight;

      gl_FragColor = vec4(finalColor, texColor.a);

      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `
)
