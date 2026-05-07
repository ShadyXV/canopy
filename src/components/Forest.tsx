import React, { useMemo } from 'react'
import { TreeInstanceMesh, createSeededTreeInstances } from './TreeInstanceMesh'
import { TREE_ASSETS, type TreeAsset } from '../lib/treeAssetCatalog'

interface Props {
  forestDensity: number
  windIntensity: number
  windDirectionAngle: number
  depthFactor: number
  areaSize?: number
  visible?: boolean
}

// Terrain generic ground
function Ground({ areaSize }: { areaSize: number }) {
  // Simple procedural noise via shader or just a dark green color
  return (
    <mesh position={[0, 0, -1]}>
      <planeGeometry args={[areaSize, areaSize]} />
      <meshStandardMaterial color="#2d422a" />
    </mesh>
  )
}

function ForestAsset({
  asset,
  forestDensity,
  windIntensity,
  windDirection,
  depthFactor,
  areaSize,
}: {
  asset: TreeAsset
  forestDensity: number
  windIntensity: number
  windDirection: [number, number]
  depthFactor: number
  areaSize: number
}) {
  const instances = useMemo(
    () => createSeededTreeInstances({
      textureIndex: asset.id,
      count: forestDensity,
      areaSize,
      positionOffset: asset.forestPositionOffset,
      seedOffset: asset.forestSeedOffset,
    }),
    [asset, forestDensity, areaSize]
  )

  return (
    <TreeInstanceMesh
      textureIndex={asset.id}
      shader={asset.forestShader}
      instances={instances}
      windIntensity={windIntensity}
      windDirection={windDirection}
      depthFactor={depthFactor}
    />
  )
}

export function Forest({ forestDensity, windIntensity, windDirectionAngle, depthFactor, areaSize = 80, visible = true }: Props) {
  // Convert angle (degrees) to direction vector
  const windDirection = useMemo<[number, number]>(() => {
    const rad = (windDirectionAngle * Math.PI) / 180
    return [Math.cos(rad), Math.sin(rad)]
  }, [windDirectionAngle])

  return (
    <group visible={visible}>
      <Ground areaSize={areaSize} />
      
      {/* Lights tailored for the 2.5D top-down scene */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[100, -50, 100]} intensity={1.5} />
      <directionalLight position={[-100, 50, 50]} intensity={0.5} />

      {TREE_ASSETS.map((asset) => (
        <ForestAsset
          key={asset.id}
          asset={asset}
          forestDensity={forestDensity}
          windIntensity={windIntensity}
          windDirection={windDirection}
          depthFactor={depthFactor}
          areaSize={areaSize}
        />
      ))}
    </group>
  )
}
