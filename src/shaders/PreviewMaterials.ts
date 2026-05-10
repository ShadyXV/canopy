import { shaderMaterial } from '@react-three/drei'
import * as THREE from 'three'

// ── Shared normal-based fragment (no texture) ─────────────────────────────
const makeFrag = (lo: string, hi: string, rimCol: string) => `
  varying vec2 vUv;
  varying vec3 vNormal;
  uniform float uHeightScale;
  void main() {
    vec3 n    = normalize(vNormal);
    vec3 sun  = normalize(vec3(0.6, -0.3, 1.0));
    vec3 fill = normalize(vec3(-0.3, 0.5, 0.6));
    float d   = max(dot(n, sun), 0.0);
    float f   = max(dot(n, fill), 0.0) * 0.35;
    float rim = pow(1.0 - max(dot(n, vec3(0.0, 0.0, 1.0)), 0.0), 3.0);
    
    // Exaggerated shadow based on heightScale (0.05 -> 0.3)
    float hFactor = clamp((uHeightScale - 0.05) / 0.25, 0.0, 1.0);
    float ambScale = mix(1.0, 0.25, hFactor);

    vec3 col  = mix(vec3(${lo}), vec3(${hi}), vUv.y * 0.5 + d * 0.5);
    col      += vec3(${rimCol}) * rim * 0.35;
    col      *= (0.18 * ambScale) + d * 1.1 + f;
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

// ── Cone vertex (dome – no instanceMatrix) ────────────────────────────────
const coneVert = `
  varying vec2 vUv; varying vec3 vNormal;
  uniform float uTime; uniform float uDepthFactor; uniform float uHeightScale; uniform float uAmplitude;
  void main() {
    vUv = uv;
    float dist   = distance(uv, vec2(0.5));
    float height = smoothstep(0.5, 0.0, dist);
    vec3 pos     = position;
    pos.z       += height * uDepthFactor * uHeightScale;
    pos.x       += height * sin(uTime * 1.8) * 0.04;

    float t = clamp(1.0 - dist * 2.0, 0.0, 1.0);
    float dh_dt = 6.0 * t * (1.0 - t);
    float dh_dr = dh_dt * -2.0;

    float dr_dx = (dist > 0.0001) ? (uv.x - 0.5) / dist : 0.0;
    float dr_dy = (dist > 0.0001) ? (uv.y - 0.5) / dist : 0.0;

    float slope = uDepthFactor * uHeightScale;
    float nx = -dh_dr * dr_dx * slope;
    float ny = -dh_dr * dr_dy * slope;

    vNormal      = normalize(vec3(nx, ny, 1.0));
    gl_Position  = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

export const ConePreviewMaterial = shaderMaterial(
  { uTime: 0, uDepthFactor: 2.5, uHeightScale: 0.5, uAmplitude: 1.0 },
  coneVert,
  makeFrag('0.06,0.20,0.06', '0.22,0.62,0.18', '0.4,0.9,0.5')
)

// ── FBM helpers (inlined in both ridge + fractal) ─────────────────────────
const fbmGlsl = `
  float _rnd(vec2 s){return fract(sin(dot(s,vec2(12.9898,78.233)))*43758.5453);}
  float _noi(vec2 s){
    vec2 i=floor(s),f=fract(s);
    float a=_rnd(i),b=_rnd(i+vec2(1,0)),c=_rnd(i+vec2(0,1)),d=_rnd(i+vec2(1,1));
    vec2 u=f*f*(3.0-2.0*f);
    return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y;
  }
  float fbm(vec2 s){
    float v=0.0,a=0.5; vec2 sh=vec2(100); mat2 r=mat2(cos(0.5),sin(0.5),-sin(0.5),cos(0.5));
    for(int i=0;i<4;i++){v+=a*_noi(s);s=r*s*2.0+sh;a*=0.5;}
    return v;
  }
`

// ── Ridge vertex ──────────────────────────────────────────────────────────
const ridgeVert = `
  varying vec2 vUv; varying vec3 vNormal;
  uniform float uTime; uniform float uDepthFactor; uniform float uHeightScale;
  uniform float uAmplitude; uniform float uFrequency;
  ${fbmGlsl}
  void main() {
    vUv = uv;
    float ex=smoothstep(0.0,0.15,uv.x)*smoothstep(1.0,0.85,uv.x);
    float ey=smoothstep(0.0,0.15,uv.y)*smoothstep(1.0,0.85,uv.y);
    float edge=ex*ey;
    float dist=distance(uv,vec2(0.5));
    float sBase=max(0.0,cos(dist*3.14159));
    float n=fbm(uv*3.0*uFrequency);
    float height=sBase+n*uAmplitude*edge;
    vec3 pos=position; pos.z+=height*uDepthFactor*1.5*uHeightScale;
    pos.x+=height*sin(uTime*2.0)*0.05;
    float e=0.02;
    float nL=max(0.0,cos(distance(vec2(uv.x-e,uv.y),vec2(0.5))*3.14159))+fbm(vec2(uv.x-e,uv.y)*3.0*uFrequency)*uAmplitude*edge;
    float nR=max(0.0,cos(distance(vec2(uv.x+e,uv.y),vec2(0.5))*3.14159))+fbm(vec2(uv.x+e,uv.y)*3.0*uFrequency)*uAmplitude*edge;
    float nD=max(0.0,cos(distance(vec2(uv.x,uv.y-e),vec2(0.5))*3.14159))+fbm(vec2(uv.x,uv.y-e)*3.0*uFrequency)*uAmplitude*edge;
    float nU=max(0.0,cos(distance(vec2(uv.x,uv.y+e),vec2(0.5))*3.14159))+fbm(vec2(uv.x,uv.y+e)*3.0*uFrequency)*uAmplitude*edge;
    vNormal=normalize(vec3((nL-nR)*uDepthFactor*20.0,(nD-nU)*uDepthFactor*20.0,1.0));
    gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.0);
  }
`

export const RidgePreviewMaterial = shaderMaterial(
  { uTime: 0, uDepthFactor: 2.5, uHeightScale: 0.5, uAmplitude: 0.6, uFrequency: 1.0 },
  ridgeVert,
  makeFrag('0.16,0.10,0.04', '0.42,0.32,0.12', '0.7,0.6,0.35')
)

// ── Fractal vertex ────────────────────────────────────────────────────────
const fractalVert = `
  varying vec2 vUv; varying vec3 vNormal;
  uniform float uTime; uniform float uDepthFactor; uniform float uHeightScale;
  uniform float uAmplitude; uniform float uFrequency;
  ${fbmGlsl}
  void main() {
    vUv = uv;
    float ex=smoothstep(0.0,0.2,uv.x)*smoothstep(1.0,0.8,uv.x);
    float ey=smoothstep(0.0,0.2,uv.y)*smoothstep(1.0,0.8,uv.y);
    float edge=ex*ey;
    float dist=distance(uv,vec2(0.5));
    float sBase=max(0.0,cos(dist*3.14159));
    float n=fbm(uv*6.0*uFrequency); float m=fbm(uv*1.5*uFrequency);
    float height=sBase+(n*0.4+m*0.6)*uAmplitude*edge;
    vec3 pos=position; pos.z+=height*uDepthFactor*2.0*uHeightScale;
    pos.x+=height*sin(uTime*2.5)*0.04;
    float e=0.02;
    float nL=max(0.0,cos(distance(vec2(uv.x-e,uv.y),vec2(0.5))*3.14159))+(fbm(vec2(uv.x-e,uv.y)*6.0*uFrequency)*0.4+fbm(vec2(uv.x-e,uv.y)*1.5*uFrequency)*0.6)*uAmplitude*edge;
    float nR=max(0.0,cos(distance(vec2(uv.x+e,uv.y),vec2(0.5))*3.14159))+(fbm(vec2(uv.x+e,uv.y)*6.0*uFrequency)*0.4+fbm(vec2(uv.x+e,uv.y)*1.5*uFrequency)*0.6)*uAmplitude*edge;
    float nD=max(0.0,cos(distance(vec2(uv.x,uv.y-e),vec2(0.5))*3.14159))+(fbm(vec2(uv.x,uv.y-e)*6.0*uFrequency)*0.4+fbm(vec2(uv.x,uv.y-e)*1.5*uFrequency)*0.6)*uAmplitude*edge;
    float nU=max(0.0,cos(distance(vec2(uv.x,uv.y+e),vec2(0.5))*3.14159))+(fbm(vec2(uv.x,uv.y+e)*6.0*uFrequency)*0.4+fbm(vec2(uv.x,uv.y+e)*1.5*uFrequency)*0.6)*uAmplitude*edge;
    vNormal=normalize(vec3((nL-nR)*uDepthFactor*25.0,(nD-nU)*uDepthFactor*25.0,1.0));
    gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.0);
  }
`

export const FractalPreviewMaterial = shaderMaterial(
  { uTime: 0, uDepthFactor: 2.5, uHeightScale: 0.5, uAmplitude: 0.6, uFrequency: 1.0 },
  fractalVert,
  makeFrag('0.04,0.06,0.16', '0.12,0.30,0.50', '0.3,0.55,0.9')
)

// ── Waves vertex (flat-base FBM — original ridge look) ────────────────────
const wavesVert = `
  varying vec2 vUv; varying vec3 vNormal;
  uniform float uTime; uniform float uDepthFactor; uniform float uHeightScale;
  uniform float uAmplitude; uniform float uFrequency;
  ${fbmGlsl}
  void main() {
    vUv = uv;
    float ex=smoothstep(0.0,0.15,uv.x)*smoothstep(1.0,0.85,uv.x);
    float ey=smoothstep(0.0,0.15,uv.y)*smoothstep(1.0,0.85,uv.y);
    float edge=ex*ey;
    float n=fbm(uv*3.0*uFrequency); float height=n*edge*uAmplitude;
    vec3 pos=position; pos.z+=height*uDepthFactor*1.5*uHeightScale;
    pos.x+=height*sin(uTime*2.0)*0.05;
    float e=0.02;
    float nL=fbm(vec2(uv.x-e,uv.y)*3.0*uFrequency)*edge*uAmplitude;
    float nR=fbm(vec2(uv.x+e,uv.y)*3.0*uFrequency)*edge*uAmplitude;
    float nD=fbm(vec2(uv.x,uv.y-e)*3.0*uFrequency)*edge*uAmplitude;
    float nU=fbm(vec2(uv.x,uv.y+e)*3.0*uFrequency)*edge*uAmplitude;
    vNormal=normalize(vec3((nL-nR)*uDepthFactor*20.0,(nD-nU)*uDepthFactor*20.0,1.0));
    gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.0);
  }
`

export const WavesPreviewMaterial = shaderMaterial(
  { uTime: 0, uDepthFactor: 2.5, uHeightScale: 0.5, uAmplitude: 0.6, uFrequency: 1.0 },
  wavesVert,
  makeFrag('0.04,0.14,0.04', '0.20,0.55,0.12', '0.5,0.9,0.4')
)

// ── Dense vertex (flat-base dual-FBM — original fractal look) ─────────────
const denseVert = `
  varying vec2 vUv; varying vec3 vNormal;
  uniform float uTime; uniform float uDepthFactor; uniform float uHeightScale;
  uniform float uAmplitude; uniform float uFrequency;
  ${fbmGlsl}
  void main() {
    vUv = uv;
    float ex=smoothstep(0.0,0.2,uv.x)*smoothstep(1.0,0.8,uv.x);
    float ey=smoothstep(0.0,0.2,uv.y)*smoothstep(1.0,0.8,uv.y);
    float edge=ex*ey;
    float n=fbm(uv*6.0*uFrequency); float m=fbm(uv*1.5*uFrequency);
    float height=(n*0.4+m*0.6)*edge*uAmplitude;
    vec3 pos=position; pos.z+=height*uDepthFactor*2.0*uHeightScale;
    pos.x+=height*sin(uTime*2.5)*0.04;
    float e=0.02;
    float nL=(fbm(vec2(uv.x-e,uv.y)*6.0*uFrequency)*0.4+fbm(vec2(uv.x-e,uv.y)*1.5*uFrequency)*0.6)*uAmplitude;
    float nR=(fbm(vec2(uv.x+e,uv.y)*6.0*uFrequency)*0.4+fbm(vec2(uv.x+e,uv.y)*1.5*uFrequency)*0.6)*uAmplitude;
    float nD=(fbm(vec2(uv.x,uv.y-e)*6.0*uFrequency)*0.4+fbm(vec2(uv.x,uv.y-e)*1.5*uFrequency)*0.6)*uAmplitude;
    float nU=(fbm(vec2(uv.x,uv.y+e)*6.0*uFrequency)*0.4+fbm(vec2(uv.x,uv.y+e)*1.5*uFrequency)*0.6)*uAmplitude;
    vNormal=normalize(vec3((nL-nR)*uDepthFactor*25.0,(nD-nU)*uDepthFactor*25.0,1.0));
    gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.0);
  }
`

export const DensePreviewMaterial = shaderMaterial(
  { uTime: 0, uDepthFactor: 2.5, uHeightScale: 0.5, uAmplitude: 0.6, uFrequency: 1.0 },
  denseVert,
  makeFrag('0.02,0.10,0.14', '0.08,0.35,0.45', '0.2,0.7,0.8')
)
