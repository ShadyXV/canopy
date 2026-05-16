import React, { useEffect, useState } from 'react'
import { parkBoundary, parkRoutes } from '../data/parkData'
import CinematicMap from './CinematicMap'

const TOOLBAR_H = 44

export function BlueprintScene() {
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

  return (
    <div className="absolute inset-0" style={{ top: TOOLBAR_H }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="flex items-center gap-3 px-4 py-2 bg-neutral-900/80 backdrop-blur rounded-xl border border-neutral-700/60">
            <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono text-neutral-400">Loading terrain...</span>
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
        <CinematicMap
          tiles={tiles}
          parkBoundary={parkBoundary}
          routes={parkRoutes}
        />
      )}
    </div>
  )
}
