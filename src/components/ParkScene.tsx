import React, { useCallback, useEffect, useState } from 'react'
import { useEditorStore } from '../store/editorStore'
import { parkBoundary, parkRoutes } from '../data/parkData'
import ParkTerrainMap from './ParkTerrainMap'

const TOOLBAR_H = 44

const PARK_CONFIG = {
  exaggeration: 2,
  enableNoise: true,
  noiseAmplitude: 3.6,
  noiseFrequency: 8,
  enableSmoothing: false,
  blurRadius: 1,
  enableRouteSmooth: true,
  roadHalfWidth: 3.5,
  enableBoundarySmooth: true,
  boundaryHalfWidth: 5,
}

export function ParkScene() {
  const {
    parkPlacedAssets,
    pendingAsset,
    placeParkAsset,
    terrainRender,
    windIntensity,
    windRandomness,
    depthFactor,
  } = useEditorStore()

  const [tiles, setTiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)

    async function load() {
      try {
        const path = '/terrain_data/hybrid_decoded'
        const mRes = await fetch(`${path}/index.json`)
        if (!mRes.ok) throw new Error('Terrain data not found.')
        const manifest = await mRes.json()
        const loaded = await Promise.all(
          manifest.tiles.map(async (t: any) => {
            const r = await fetch(`${path}/${t.file}`)
            if (!r.ok) throw new Error(`Failed to load tile ${t.file}`)
            return { ...t, ...await r.json() }
          })
        )
        if (alive) setTiles(loaded)
      } catch (e: any) {
        if (alive) setError(e.message)
      } finally {
        if (alive) setLoading(false)
      }
    }

    load()
    return () => { alive = false }
  }, [])

  const handleTerrainClick = useCallback((worldX: number, worldY: number, worldZ: number) => {
    if (pendingAsset) placeParkAsset({ worldX, worldY, worldZ })
  }, [pendingAsset, placeParkAsset])

  const environment = { windIntensity, windRandomness, depthFactor }

  return (
    <div className="absolute inset-0" style={{ top: TOOLBAR_H }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="flex items-center gap-3 px-4 py-2 bg-neutral-900/80 backdrop-blur rounded-xl border border-neutral-700/60">
            <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono text-neutral-400">Loading terrain…</span>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="px-4 py-2 bg-red-900/80 rounded-xl border border-red-700/60">
            <span className="text-xs font-mono text-red-300">{error}</span>
          </div>
        </div>
      )}
      {!loading && !error && (
        <ParkTerrainMap
          tiles={tiles}
          parkBoundary={parkBoundary}
          routes={parkRoutes}
          parkPlacedAssets={parkPlacedAssets}
          onTerrainClick={handleTerrainClick}
          showContours={terrainRender === 'contours'}
          displayMode={terrainRender === 'grid' ? 'grid' : 'cinematic'}
          environment={environment}
          {...PARK_CONFIG}
        />
      )}
    </div>
  )
}
