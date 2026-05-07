import type { ShaderType } from './shaderVariants'

export type TreeAssetId = 12 | 13 | 14 | 15 | 16

export interface TreeAsset {
  id: TreeAssetId
  label: string
  texturePath: string
  defaultShader: ShaderType
  forestShader: ShaderType
  forestSeedOffset: number
  forestPositionOffset: [number, number]
}

export const TREE_ASSETS: readonly TreeAsset[] = [
  {
    id: 12,
    label: 'Tree #12',
    texturePath: '/tree_12.png',
    defaultShader: 'cone',
    forestShader: 'cone',
    forestSeedOffset: 100,
    forestPositionOffset: [-5, 5],
  },
  {
    id: 13,
    label: 'Tree #13',
    texturePath: '/tree_13.png',
    defaultShader: 'ridge',
    forestShader: 'ridge',
    forestSeedOffset: 200,
    forestPositionOffset: [10, -10],
  },
  {
    id: 14,
    label: 'Tree #14',
    texturePath: '/tree_14.png',
    defaultShader: 'ridge',
    forestShader: 'fractal',
    forestSeedOffset: 300,
    forestPositionOffset: [-10, 0],
  },
  {
    id: 15,
    label: 'Tree #15',
    texturePath: '/tree_15.png',
    defaultShader: 'fractal',
    forestShader: 'ridge',
    forestSeedOffset: 200,
    forestPositionOffset: [10, -10],
  },
  {
    id: 16,
    label: 'Tree #16',
    texturePath: '/tree_16.png',
    defaultShader: 'fractal',
    forestShader: 'fractal',
    forestSeedOffset: 300,
    forestPositionOffset: [-10, 0],
  },
] as const

export function getTreeAsset(id: number): TreeAsset {
  const asset = TREE_ASSETS.find((a) => a.id === id)
  if (!asset) throw new Error(`Unknown tree asset: ${id}`)
  return asset
}
