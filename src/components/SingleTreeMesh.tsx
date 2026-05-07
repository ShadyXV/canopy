import React, { useMemo } from 'react'
import { TreeInstanceMesh } from './TreeInstanceMesh'
import type { ShaderType, ShaderTweaks } from '../store/editorStore'

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
  shaderTweaks: ShaderTweaks
  onClick: (id: string) => void
}

export function SingleTreeMesh({
  id, textureIndex, shader, position, rotation, scale,
  isSelected, windIntensity, windDirection, depthFactor, shaderTweaks, onClick,
}: Props) {
  const instance = useMemo(() => ({ position, rotation, scale }), [position, rotation, scale])

  return (
    <TreeInstanceMesh
      textureIndex={textureIndex}
      shader={shader}
      instances={[instance]}
      selectedInstance={isSelected ? instance : null}
      windIntensity={windIntensity}
      windDirection={windDirection}
      depthFactor={depthFactor}
      shaderTweaks={shaderTweaks}
      onClick={() => onClick(id)}
    />
  )
}
