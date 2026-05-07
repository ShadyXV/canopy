import { shaderMaterial } from '@react-three/drei'
import * as THREE from 'three'

// ── Shared normal-based fragment (no texture) ─────────────────────────────
const makeFrag = (lo: string, hi: string, rimCol: string) => `
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vec3 n    = normalize(vNormal);
    vec3 sun  = normalize(vec3(0.6, -0.3, 1.0));
    vec3 fill = normalize(vec3(-0.3, 0.5, 0.6));
    float d   = max(dot(n, sun), 0.0);
    float f   = max(dot(n, fill), 0.0) * 0.35;
    float rim = pow(1.0 - max(dot(n, vec3(0.0, 0.0, 1.0)), 0.0), 3.0);
    vec3 col  = mix(vec3(${lo}), vec3(${hi}), vUv.y * 0.5 + d * 0.5);
    col      += vec3(${rimCol}) * rim * 0.35;
    col      *= 0.18 + d * 1.1 + f;
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

// ── Cone vertex (dome – no instanceMatrix) ────────────────────────────────
const coneVert = `
  varying vec2 vUv; varying vec3 vNormal;
  uniform float uTime; uniform float uDepthFactor; uniform float uHeightScale;
  void main() {
    vUv = uv;
    float dist   = distance(uv, vec2(0.5));
    float height = smoothstep(0.5, 0.0, dist);
    vec3 pos     = position;
    pos.z       += height * uDepthFactor * uHeightScale;
    pos.x       += height * sin(uTime * 1.8) * 0.04;
    float nx     = (0.5 - uv.x) * uDepthFactor * 4.0;
    float ny     = (0.5 - uv.y) * uDepthFactor * 4.0;
    vNormal      = normalize(vec3(nx, ny, 1.0));
    gl_Position  = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

export const ConePreviewMaterial = shaderMaterial(
  { uTime: 0, uDepthFactor: 2.5, uHeightScale: 0.5 },
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

export const FractalPreviewMaterial = shaderMaterial(
  { uTime: 0, uDepthFactor: 2.5, uHeightScale: 0.5, uAmplitude: 0.6, uFrequency: 1.0 },
  fractalVert,
  makeFrag('0.04,0.06,0.16', '0.12,0.30,0.50', '0.3,0.55,0.9')
)
