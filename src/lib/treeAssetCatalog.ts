import type { ShaderType } from './shaderVariants'

export type TreeAssetId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19

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
    id: 1,
    label: 'Tree #1',
    texturePath: '/tree_1.png',
    defaultShader: 'cone',
    forestShader: 'cone',
    forestSeedOffset: 100,
    forestPositionOffset: [-5, 5],
  },
  {
    id: 2,
    label: 'Tree #2',
    texturePath: '/tree_2.png',
    defaultShader: 'ridge',
    forestShader: 'ridge',
    forestSeedOffset: 200,
    forestPositionOffset: [10, -10],
  },
  {
    id: 3,
    label: 'Tree #3',
    texturePath: '/tree_3.png',
    defaultShader: 'fractal',
    forestShader: 'fractal',
    forestSeedOffset: 300,
    forestPositionOffset: [-10, 0],
  },
  {
    id: 4,
    label: 'Tree #4',
    texturePath: '/tree_4.png',
    defaultShader: 'waves',
    forestShader: 'waves',
    forestSeedOffset: 400,
    forestPositionOffset: [5, 10],
  },
  {
    id: 5,
    label: 'Tree #5',
    texturePath: '/tree_5.png',
    defaultShader: 'dense',
    forestShader: 'dense',
    forestSeedOffset: 500,
    forestPositionOffset: [0, -5],
  },
  {
    id: 6,
    label: 'Tree #6',
    texturePath: '/tree_6.png',
    defaultShader: 'cone',
    forestShader: 'ridge',
    forestSeedOffset: 150,
    forestPositionOffset: [8, 8],
  },
  {
    id: 7,
    label: 'Tree #7',
    texturePath: '/tree_7.png',
    defaultShader: 'ridge',
    forestShader: 'waves',
    forestSeedOffset: 250,
    forestPositionOffset: [-8, -8],
  },
  {
    id: 8,
    label: 'Tree #8',
    texturePath: '/tree_8.png',
    defaultShader: 'fractal',
    forestShader: 'dense',
    forestSeedOffset: 350,
    forestPositionOffset: [12, 4],
  },
  {
    id: 9,
    label: 'Tree #9',
    texturePath: '/tree_9.png',
    defaultShader: 'waves',
    forestShader: 'cone',
    forestSeedOffset: 450,
    forestPositionOffset: [-4, 12],
  },
  {
    id: 10,
    label: 'Tree #10',
    texturePath: '/tree_10.png',
    defaultShader: 'dense',
    forestShader: 'ridge',
    forestSeedOffset: 550,
    forestPositionOffset: [6, -12],
  },
  {
    id: 11,
    label: 'Tree #11',
    texturePath: '/tree_11.png',
    defaultShader: 'cone',
    forestShader: 'fractal',
    forestSeedOffset: 110,
    forestPositionOffset: [-12, 6],
  },
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
  {
    id: 17,
    label: 'Tree #17',
    texturePath: '/tree_17.png',
    defaultShader: 'waves',
    forestShader: 'waves',
    forestSeedOffset: 470,
    forestPositionOffset: [9, -9],
  },
  {
    id: 18,
    label: 'Tree #18',
    texturePath: '/tree_18.png',
    defaultShader: 'dense',
    forestShader: 'dense',
    forestSeedOffset: 580,
    forestPositionOffset: [-9, 9],
  },
  {
    id: 19,
    label: 'Tree #19',
    texturePath: '/tree_19.png',
    defaultShader: 'ridge',
    forestShader: 'ridge',
    forestSeedOffset: 290,
    forestPositionOffset: [7, 7],
  },
] as const

export function getTreeAsset(id: number): TreeAsset {
  const asset = TREE_ASSETS.find((a) => a.id === id)
  if (!asset) throw new Error(`Unknown tree asset: ${id}`)
  return asset
}
