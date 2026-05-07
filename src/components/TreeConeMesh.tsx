import { useFrame } from '@react-three/fiber'
import React, { useMemo, useRef, useState, useEffect } from 'react'
import * as THREE from 'three'
import { TreeConeMaterial } from '../shaders/TreeConeMaterial'
import { extend } from '@react-three/fiber'
import { generateFallbackTexture } from '../lib/treeUtils'

extend({ TreeConeMaterial })



interface Props {
  textureIndex: number
  count: number
  windIntensity: number
  windDirection: [number, number]
  depthFactor: number
  areaSize?: number
  positionOffset?: [number, number]
}

export function TreeConeMesh({ textureIndex, count, windIntensity, windDirection, depthFactor, areaSize = 80, positionOffset = [0, 0] }: Props) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const materialRef = useRef<any>(null)
  const [texture, setTexture] = useState<THREE.Texture | null>(null)

  useEffect(() => {
    const loader = new THREE.TextureLoader()
    const path = `/tree_${textureIndex}.png`

    loader.load(
      path,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace
        setTexture(t)
      },
      undefined,
      () => {
        const fb = generateFallbackTexture(textureIndex)
        fb.colorSpace = THREE.SRGBColorSpace
        setTexture(fb)
      }
    )
  }, [textureIndex])

  useEffect(() => {
    if (!meshRef.current) return
    const dummy = new THREE.Object3D()
    
    // Seeded random for consistent placements across re-renders
    const seededRandom = (seed: number) => {
      let t = seed + 0x6D2B79F5
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }

    for (let i = 0; i < count; i++) {
      const seed = textureIndex * 10000 + i + 100
      const x = (seededRandom(seed) - 0.5) * areaSize + positionOffset[0]
      const y = (seededRandom(seed + 1) - 0.5) * areaSize + positionOffset[1]
      dummy.position.set(x, y, 0)
      dummy.rotation.z = seededRandom(seed + 2) * Math.PI * 2
      const scale = 5.0 + seededRandom(seed + 3) * 10.0
      dummy.scale.set(scale, scale, scale)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [count, areaSize, textureIndex, texture, positionOffset])

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uTime = state.clock.elapsedTime
      materialRef.current.uWindIntensity = windIntensity
      materialRef.current.uWindDirection = new THREE.Vector2(windDirection[0], windDirection[1])
      materialRef.current.uDepthFactor = depthFactor
    }
  })

  if (!texture) return null

  return (
    <instancedMesh ref={meshRef} args={[null as any, null as any, count]} frustumCulled={false}>
      <planeGeometry args={[1, 1, 32, 32]} />
      <treeConeMaterial ref={materialRef} uTexture={texture} transparent depthWrite={true} />
    </instancedMesh>
  )
}
