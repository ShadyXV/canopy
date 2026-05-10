import React, { useEffect, useMemo, useRef } from 'react'
import { extend, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { TreeConeMaterial } from '../shaders/TreeConeMaterial'
import { TreeRidgeMaterial } from '../shaders/TreeRidgeMaterial'
import { TreeFractalMaterial } from '../shaders/TreeFractalMaterial'
import { TreeWavesMaterial } from '../shaders/TreeWavesMaterial'
import { TreeDenseMaterial } from '../shaders/TreeDenseMaterial'
import { useTreeTexture } from '../lib/textureCache'
import type { ShaderTweaks } from '../store/editorStore'
import { DEFAULT_SHADER_TWEAKS, renderTreeShaderMaterial, type ShaderType } from '../lib/shaderVariants'

extend({ TreeConeMaterial, TreeRidgeMaterial, TreeFractalMaterial, TreeWavesMaterial, TreeDenseMaterial })

export interface TreeInstance {
  position: [number, number]
  rotation: number
  scale: number
}

interface Props {
  textureIndex: number
  shader: ShaderType
  instances: TreeInstance[]
  windIntensity: number
  windRandomness: number
  depthFactor: number
  shaderTweaks?: ShaderTweaks
  selectedInstance?: TreeInstance | null
  onClick?: () => void
}

export function createSeededTreeInstances({
  textureIndex,
  count,
  areaSize,
  positionOffset = [0, 0],
  seedOffset,
}: {
  textureIndex: number
  count: number
  areaSize: number
  positionOffset?: [number, number]
  seedOffset: number
}): TreeInstance[] {
  const seededRandom = (seed: number) => {
    let t = seed + 0x6D2B79F5
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  return Array.from({ length: count }, (_, i) => {
    const seed = textureIndex * 10000 + i + seedOffset
    return {
      position: [
        (seededRandom(seed) - 0.5) * areaSize + positionOffset[0],
        (seededRandom(seed + 1) - 0.5) * areaSize + positionOffset[1],
      ],
      rotation: seededRandom(seed + 2) * Math.PI * 2,
      scale: 5.0 + seededRandom(seed + 3) * 10.0,
    }
  })
}

export function TreeInstanceMesh({
  textureIndex,
  shader,
  instances,
  windIntensity,
  windRandomness,
  depthFactor,
  shaderTweaks = DEFAULT_SHADER_TWEAKS,
  selectedInstance = null,
  onClick,
}: Props) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const matRef = useRef<any>(null)
  const texture = useTreeTexture(textureIndex)

  const tweaksRef = useRef(shaderTweaks)
  const windRef = useRef({ intensity: windIntensity, randomness: windRandomness })
  const depthRef = useRef(depthFactor)

  tweaksRef.current = shaderTweaks
  windRef.current.intensity = windIntensity
  windRef.current.randomness = windRandomness
  depthRef.current = depthFactor

  useEffect(() => {
    if (!meshRef.current) return

    const dummy = new THREE.Object3D()
    instances.forEach((instance, i) => {
      dummy.position.set(instance.position[0], instance.position[1], 0)
      dummy.rotation.z = instance.rotation
      dummy.scale.setScalar(instance.scale)
      dummy.updateMatrix()
      meshRef.current?.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [instances, shader])

  useFrame((state) => {
    const mat = matRef.current
    if (!mat) return

    mat.uTime = state.clock.elapsedTime
    mat.uWindIntensity = windRef.current.intensity
    mat.uWindRandomness = windRef.current.randomness
    mat.uDepthFactor = depthRef.current
    mat.uHeightScale = tweaksRef.current.heightScale
    mat.uAmplitude = tweaksRef.current.amplitude
    mat.uFrequency = tweaksRef.current.frequency
  })

  const matProps = useMemo(() => ({ ref: matRef, uTexture: texture, transparent: true, depthWrite: true }), [texture])

  if (!texture || instances.length === 0) return null

  const handleClick = (e: any) => {
    if (!onClick) return
    e.stopPropagation()
    onClick()
  }

  return (
    <>
      {selectedInstance && (
        <mesh position={[selectedInstance.position[0], selectedInstance.position[1], -0.5]}>
          <ringGeometry args={[selectedInstance.scale * 0.48, selectedInstance.scale * 0.58, 48]} />
          <meshBasicMaterial color="#00ffbb" transparent opacity={0.85} depthWrite={false} />
        </mesh>
      )}

      <instancedMesh
        key={shader}
        ref={meshRef}
        args={[null as any, null as any, instances.length]}
        frustumCulled={false}
        onClick={handleClick}
      >
        <planeGeometry args={[1, 1, 32, 32]} />
        {renderTreeShaderMaterial({ shader, materialProps: matProps })}
      </instancedMesh>
    </>
  )
}
