import React, { useMemo } from 'react'
import { createSeededTreeInstances, TreeInstanceMesh } from './TreeInstanceMesh'

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
  const instances = useMemo(
    () => createSeededTreeInstances({ textureIndex, count, areaSize, positionOffset, seedOffset: 100 }),
    [textureIndex, count, areaSize, positionOffset]
  )

  return (
    <TreeInstanceMesh
      textureIndex={textureIndex}
      shader="cone"
      instances={instances}
      windIntensity={windIntensity}
      windDirection={windDirection}
      depthFactor={depthFactor}
    />
  )
}
