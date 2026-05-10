import React, { useMemo } from 'react'
import { TreeInstanceMesh, createSeededTreeInstances } from './TreeInstanceMesh'
import { TREE_ASSETS, type TreeAsset } from '../lib/treeAssetCatalog'
import { toShaderEnvironment, type SceneEnvironment, type ShaderEnvironment } from '../lib/sceneEnvironment'

interface Props {
  environment: SceneEnvironment
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
  environment,
  shaderEnvironment,
  areaSize,
}: {
  asset: TreeAsset
  environment: SceneEnvironment
  shaderEnvironment: ShaderEnvironment
  areaSize: number
}) {
  const instances = useMemo(
    () => createSeededTreeInstances({
      textureIndex: asset.id,
      count: environment.forestDensity,
      areaSize,
      positionOffset: asset.forestPositionOffset,
      seedOffset: asset.forestSeedOffset,
    }),
    [asset, environment.forestDensity, areaSize]
  )

  return (
    <TreeInstanceMesh
      textureIndex={asset.id}
      shader={asset.forestShader}
      instances={instances}
      windIntensity={shaderEnvironment.windIntensity}
      windRandomness={shaderEnvironment.windRandomness}
      depthFactor={shaderEnvironment.depthFactor}
    />
  )
}

export function Forest({ environment, areaSize = 80, visible = true }: Props) {
  const shaderEnvironment = useMemo(() => toShaderEnvironment(environment), [environment])

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
          environment={environment}
          shaderEnvironment={shaderEnvironment}
          areaSize={areaSize}
        />
      ))}
    </group>
  )
}
