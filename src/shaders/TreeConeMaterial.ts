import { shaderMaterial } from '@react-three/drei'
import * as THREE from 'three'

export const TreeConeMaterial = shaderMaterial(
  {
    uTime: 0,
    uWindIntensity: 0.5,
    uWindDirection: new THREE.Vector2(1.0, 0.5),
    uDepthFactor: 1.0,
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
    uniform float uHeightScale;

    void main() {
      vUv = uv;

      float dist = distance(uv, vec2(0.5));
      float height = smoothstep(0.5, 0.0, dist);

      vec3 pos = position;
      pos.z += height * uDepthFactor * uHeightScale;

      vec4 instanceWorldPos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);

      float temporalPhase = uTime * 2.0;
      float spatialPhase = instanceWorldPos.x * 0.1 + instanceWorldPos.y * 0.1;
      float swayNoise = sin(spatialPhase + temporalPhase) + cos(spatialPhase * 0.5 + temporalPhase * 1.3);

      vec2 windDir = normalize(uWindDirection);
      float sway = height * uWindIntensity * (swayNoise * 0.5 + 0.5) * 0.5;

      pos.x += windDir.x * sway;
      pos.y += windDir.y * sway;

      float nx = (0.5 - uv.x) * uDepthFactor * 4.0;
      float ny = (0.5 - uv.y) * uDepthFactor * 4.0;
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
