import { create } from 'zustand'
import { DEFAULT_SHADER_TWEAKS, type ShaderType } from '../lib/shaderVariants'
import { DEFAULT_SCENE_ENVIRONMENT, type SceneEnvironment } from '../lib/sceneEnvironment'
export type { ShaderType } from '../lib/shaderVariants'

export interface ShaderTweaks {
  heightScale: number  // 0.1–3.0  — Z extrusion multiplier
  amplitude:   number  // 0.0–2.0  — fbm waviness (ridge/fractal)
  frequency:   number  // 0.5–4.0  — spatial frequency of noise (ridge/fractal)
}

export interface PlacedAsset {
  id: string
  textureIndex: number
  shader: ShaderType
  position: [number, number]
  rotation: number
  scale: number
  shaderTweaks: ShaderTweaks
}

type PendingAsset = Pick<PlacedAsset, 'textureIndex' | 'shader'>
type AssetUpdates = Partial<Pick<PlacedAsset, 'shader' | 'rotation' | 'scale' | 'position' | 'shaderTweaks'>>

interface EditorState extends SceneEnvironment {
  mode: 'forest' | 'studio'
  showBackgroundForest: boolean
  placedAssets: PlacedAsset[]
  selectedId: string | null
  pendingAsset: PendingAsset | null

  // Actions
  setMode: (mode: 'forest' | 'studio') => void
  setShowBackgroundForest: (v: boolean) => void
  startPlacement: (asset: PendingAsset) => void
  cancelPlacement: () => void
  togglePlacement: (asset: PendingAsset) => void
  placePendingAsset: (position: [number, number]) => void
  selectAsset: (id: string | null) => void
  toggleAssetSelection: (id: string) => void
  deselectAsset: () => void
  updateAsset: (id: string, updates: AssetUpdates) => void
  updateSelectedAsset: (updates: AssetUpdates) => void
  updateSelectedShaderTweak: (key: keyof ShaderTweaks, value: number) => void
  removeAsset: (id: string) => void
  removeSelectedAsset: () => void
  setWindIntensity: (v: number) => void
  setWindRandomness: (v: number) => void
  setDepthFactor: (v: number) => void
  setForestDensity: (v: number) => void
}

let _nextId = 1
function genId() { return `asset-${_nextId++}` }

export const useEditorStore = create<EditorState>((set) => ({
  mode: 'studio',
  showBackgroundForest: false,
  placedAssets: [],
  selectedId: null,
  pendingAsset: null,
  ...DEFAULT_SCENE_ENVIRONMENT,

  setMode: (mode) => set({ mode }),
  setShowBackgroundForest: (v) => set({ showBackgroundForest: v }),

  startPlacement: (asset) => set({ pendingAsset: asset }),
  cancelPlacement: () => set({ pendingAsset: null }),
  togglePlacement: (asset) =>
    set((state) => ({
      pendingAsset:
        state.pendingAsset?.textureIndex === asset.textureIndex && state.pendingAsset.shader === asset.shader
          ? null
          : asset,
    })),

  placePendingAsset: (position) =>
    set((state) => {
      if (!state.pendingAsset) return state
      const id = genId()
      return {
        placedAssets: [
          ...state.placedAssets,
          {
            id,
            textureIndex: state.pendingAsset.textureIndex,
            shader: state.pendingAsset.shader,
            position,
            rotation: 0,
            scale: 8,
            shaderTweaks: { ...DEFAULT_SHADER_TWEAKS },
          },
        ],
        pendingAsset: null,
        selectedId: id,
      }
    }),

  selectAsset: (id) => set({ selectedId: id }),
  toggleAssetSelection: (id) => set((state) => ({ selectedId: state.selectedId === id ? null : id })),
  deselectAsset: () => set({ selectedId: null }),

  updateAsset: (id, updates) =>
    set((state) => ({
      placedAssets: state.placedAssets.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),
  updateSelectedAsset: (updates) =>
    set((state) => {
      if (!state.selectedId) return state
      return {
        placedAssets: state.placedAssets.map((a) => (a.id === state.selectedId ? { ...a, ...updates } : a)),
      }
    }),
  updateSelectedShaderTweak: (key, value) =>
    set((state) => {
      if (!state.selectedId) return state
      return {
        placedAssets: state.placedAssets.map((asset) =>
          asset.id === state.selectedId
            ? { ...asset, shaderTweaks: { ...asset.shaderTweaks, [key]: value } }
            : asset
        ),
      }
    }),

  removeAsset: (id) =>
    set((state) => ({
      placedAssets: state.placedAssets.filter((a) => a.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    })),
  removeSelectedAsset: () =>
    set((state) => {
      if (!state.selectedId) return state
      return {
        placedAssets: state.placedAssets.filter((a) => a.id !== state.selectedId),
        selectedId: null,
      }
    }),

  setWindIntensity: (v) => set({ windIntensity: v }),
  setWindRandomness: (v) => set({ windRandomness: v }),
  setDepthFactor: (v) => set({ depthFactor: v }),
  setForestDensity: (v) => set({ forestDensity: v }),
}))
