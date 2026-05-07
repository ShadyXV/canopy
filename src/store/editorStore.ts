import { create } from 'zustand'

export type ShaderType = 'cone' | 'ridge' | 'fractal'

export interface PlacedAsset {
  id: string
  textureIndex: number
  shader: ShaderType
  position: [number, number]
  rotation: number
  scale: number
}

interface EditorState {
  mode: 'forest' | 'studio'
  showBackgroundForest: boolean
  placedAssets: PlacedAsset[]
  selectedId: string | null
  pendingAsset: { textureIndex: number; shader: ShaderType } | null

  // Scene-wide controls
  windIntensity: number
  windDirection: number
  depthFactor: number
  forestDensity: number

  // Actions
  setMode: (mode: 'forest' | 'studio') => void
  setShowBackgroundForest: (v: boolean) => void
  setPendingAsset: (asset: { textureIndex: number; shader: ShaderType } | null) => void
  placeAsset: (textureIndex: number, shader: ShaderType, position: [number, number]) => void
  selectAsset: (id: string | null) => void
  updateAsset: (id: string, updates: Partial<Pick<PlacedAsset, 'shader' | 'rotation' | 'scale' | 'position'>>) => void
  removeAsset: (id: string) => void
  setWindIntensity: (v: number) => void
  setWindDirection: (v: number) => void
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
  windIntensity: 0.5,
  windDirection: 45,
  depthFactor: 2.5,
  forestDensity: 10,

  setMode: (mode) => set({ mode }),
  setShowBackgroundForest: (v) => set({ showBackgroundForest: v }),
  setPendingAsset: (asset) => set({ pendingAsset: asset }),

  placeAsset: (textureIndex, shader, position) =>
    set((state) => {
      const id = genId()
      return {
        placedAssets: [...state.placedAssets, { id, textureIndex, shader, position, rotation: 0, scale: 8 }],
        pendingAsset: null,
        selectedId: id,
      }
    }),

  selectAsset: (id) => set({ selectedId: id }),

  updateAsset: (id, updates) =>
    set((state) => ({
      placedAssets: state.placedAssets.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),

  removeAsset: (id) =>
    set((state) => ({
      placedAssets: state.placedAssets.filter((a) => a.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    })),

  setWindIntensity: (v) => set({ windIntensity: v }),
  setWindDirection: (v) => set({ windDirection: v }),
  setDepthFactor: (v) => set({ depthFactor: v }),
  setForestDensity: (v) => set({ forestDensity: v }),
}))
