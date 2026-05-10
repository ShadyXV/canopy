import React from 'react'
import { SingleTreeMesh } from './SingleTreeMesh'
import { useEditorStore } from '../store/editorStore'
import type { ShaderEnvironment } from '../lib/sceneEnvironment'

interface Props {
  environment: ShaderEnvironment
}

export function SceneEditor({ environment }: Props) {
  const { placedAssets, pendingAsset, selectedId, placePendingAsset, deselectAsset, selectAsset } = useEditorStore()

  const handlePlaneClick = (e: any) => {
    if (!pendingAsset) {
      deselectAsset()
      return
    }
    e.stopPropagation()
    placePendingAsset([e.point.x, e.point.y])
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
          windIntensity={environment.windIntensity}
          windRandomness={environment.windRandomness}
          depthFactor={environment.depthFactor}
          onClick={selectAsset}
        />
      ))}
    </group>
  )
}
