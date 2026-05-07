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

export function TreeFractalMesh({ textureIndex, count, windIntensity, windDirection, depthFactor, areaSize = 80, positionOffset = [0, 0] }: Props) {
  const instances = useMemo(
    () => createSeededTreeInstances({ textureIndex, count, areaSize, positionOffset, seedOffset: 300 }),
    [textureIndex, count, areaSize, positionOffset]
  )

  return (
    <TreeInstanceMesh
      textureIndex={textureIndex}
      shader="fractal"
      instances={instances}
      windIntensity={windIntensity}
      windDirection={windDirection}
      depthFactor={depthFactor}
    />
  )
}
