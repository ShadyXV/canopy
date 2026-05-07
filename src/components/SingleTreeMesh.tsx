import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, extend } from '@react-three/fiber'
import { TreeConeMaterial } from '../shaders/TreeConeMaterial'
import { TreeRidgeMaterial } from '../shaders/TreeRidgeMaterial'
import { TreeFractalMaterial } from '../shaders/TreeFractalMaterial'
import { useTreeTexture } from '../lib/textureCache'
import type { ShaderType } from '../store/editorStore'

extend({ TreeConeMaterial, TreeRidgeMaterial, TreeFractalMaterial })



interface Props {
  id: string
  textureIndex: number
  shader: ShaderType
  position: [number, number]
  rotation: number
  scale: number
  isSelected: boolean
  windIntensity: number
  windDirection: [number, number]
  depthFactor: number
  onClick: (id: string) => void
}

export function SingleTreeMesh({
  id, textureIndex, shader, position, rotation, scale,
  isSelected, windIntensity, windDirection, depthFactor, onClick,
}: Props) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const matRef = useRef<any>(null)
  const texture = useTreeTexture(textureIndex)

  // Update instance transform matrix
  useEffect(() => {
    if (!meshRef.current) return
    const dummy = new THREE.Object3D()
    dummy.position.set(position[0], position[1], 0)
    dummy.rotation.z = rotation
    dummy.scale.setScalar(scale)
    dummy.updateMatrix()
    meshRef.current.setMatrixAt(0, dummy.matrix)
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [position, rotation, scale, shader]) // include shader so matrix resets after key-remount

  useFrame((state) => {
    if (!matRef.current) return
    matRef.current.uTime = state.clock.elapsedTime
    matRef.current.uWindIntensity = windIntensity
    matRef.current.uWindDirection = new THREE.Vector2(windDirection[0], windDirection[1])
    matRef.current.uDepthFactor = depthFactor
  })

  if (!texture) return null

  const handleClick = (e: any) => { e.stopPropagation(); onClick(id) }

  const matProps = { ref: matRef, uTexture: texture, transparent: true, depthWrite: true }

  return (
    <>
      {/* Selection ring rendered beneath the tree */}
      {isSelected && (
        <mesh position={[position[0], position[1], -0.5]}>
          <ringGeometry args={[scale * 0.48, scale * 0.58, 48]} />
          <meshBasicMaterial color="#00ffbb" transparent opacity={0.85} depthWrite={false} />
        </mesh>
      )}

      {/* key={shader} forces the instancedMesh to remount when shader changes,
          which is the cleanest way to swap a custom shaderMaterial in R3F */}
      <instancedMesh
        key={shader}
        ref={meshRef}
        args={[null as any, null as any, 1]}
        frustumCulled={false}
        onClick={handleClick}
      >
        <planeGeometry args={[1, 1, 32, 32]} />
        {shader === 'cone'    && <treeConeMaterial    {...matProps} />}
        {shader === 'ridge'   && <treeRidgeMaterial   {...matProps} />}
        {shader === 'fractal' && <treeFractalMaterial {...matProps} />}
      </instancedMesh>
    </>
  )
}
