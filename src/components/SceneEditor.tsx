import React from 'react'
import { useThree } from '@react-three/fiber'
import { SingleTreeMesh } from './SingleTreeMesh'
import { useEditorStore } from '../store/editorStore'

interface Props {
  windIntensity: number
  windDirection: [number, number]
  depthFactor: number
}

export function SceneEditor({ windIntensity, windDirection, depthFactor }: Props) {
  const { placedAssets, pendingAsset, selectedId, placeAsset, selectAsset } = useEditorStore()

  const handlePlaneClick = (e: any) => {
    if (!pendingAsset) {
      // Deselect if clicking empty space
      selectAsset(null)
      return
    }
    e.stopPropagation()
    placeAsset(pendingAsset.textureIndex, pendingAsset.shader, [e.point.x, e.point.y])
  }

  return (
    <group>
      {/* Large invisible click plane to receive placement clicks */}
      <mesh position={[0, 0, -0.1]} onClick={handlePlaneClick}>
        <planeGeometry args={[10000, 10000]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Render all placed assets */}
      {placedAssets.map((asset) => (
        <SingleTreeMesh
          key={asset.id}
          id={asset.id}
          textureIndex={asset.textureIndex}
          shader={asset.shader}
          position={asset.position}
          rotation={asset.rotation}
          scale={asset.scale}
          shaderTweaks={asset.shaderTweaks}
          isSelected={asset.id === selectedId}
          windIntensity={windIntensity}
          windDirection={windDirection}
          depthFactor={depthFactor}
          onClick={selectAsset}
        />
      ))}
    </group>
  )
}
