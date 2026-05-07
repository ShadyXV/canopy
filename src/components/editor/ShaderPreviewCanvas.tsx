import React, { useRef } from 'react'
import { Canvas, useFrame, extend } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { ConePreviewMaterial, RidgePreviewMaterial, FractalPreviewMaterial } from '../../shaders/PreviewMaterials'
import type { ShaderTweaks } from '../../store/editorStore'
import { DEFAULT_SHADER_TWEAKS, renderPreviewShaderMaterial, type ShaderType } from '../../lib/shaderVariants'

extend({ ConePreviewMaterial, RidgePreviewMaterial, FractalPreviewMaterial })

declare module '@react-three/fiber' {
  interface ThreeElements {
    conePreviewMaterial: any
    ridgePreviewMaterial: any
    fractalPreviewMaterial: any
  }
}

// Background grid plane for depth perception
function Grid() {
  return (
    <mesh position={[0, 0, -0.02]} rotation={[0, 0, 0]}>
      <planeGeometry args={[4, 4]} />
      <meshBasicMaterial color="#0f1a0f" />
    </mesh>
  )
}

function PreviewMesh({ shader, tweaks }: { shader: ShaderType; tweaks: ShaderTweaks }) {
  const matRef = useRef<any>(null)
  const tweaksRef = useRef(tweaks)
  tweaksRef.current = tweaks

  useFrame((state) => {
    const mat = matRef.current
    if (!mat) return
    mat.uTime        = state.clock.elapsedTime
    mat.uDepthFactor = 2.5
    mat.uHeightScale = tweaksRef.current.heightScale
    mat.uAmplitude   = tweaksRef.current.amplitude
    mat.uFrequency   = tweaksRef.current.frequency
  })

  const geo = <planeGeometry args={[1, 1, 48, 48]} />

  return (
    <mesh key={shader}>
      {geo}
      {renderPreviewShaderMaterial({ shader, materialRef: matRef })}
    </mesh>
  )
}

interface Props {
  shader: ShaderType
  tweaks?: ShaderTweaks
  /** Height of the canvas element — defaults to 140 */
  height?: number
  /** Show OrbitControls — defaults to true */
  interactive?: boolean
}

export function ShaderPreviewCanvas({ shader, tweaks = DEFAULT_SHADER_TWEAKS, height = 140, interactive = true }: Props) {
  return (
    <div style={{ width: '100%', height }} className="rounded-lg overflow-hidden bg-neutral-950">
      <Canvas
        orthographic
        camera={{ position: [0, 0, 5], zoom: 120 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={0.15} />
        <directionalLight position={[2, -1, 3]} intensity={1.4} />
        <directionalLight position={[-1, 2, 2]} intensity={0.4} color="#8af" />
        <Grid />
        <PreviewMesh shader={shader} tweaks={tweaks} />
        {interactive && (
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            minPolarAngle={0}
            maxPolarAngle={Math.PI / 2}
          />
        )}
      </Canvas>
    </div>
  )
}
