import React, { useState } from 'react'
import { useEditorStore, ShaderType } from '../../store/editorStore'
import { useTreeTexture } from '../../lib/textureCache'

const ASSETS = [12, 13, 14, 15, 16] as const
const DEFAULT_SHADERS: Record<number, ShaderType> = { 12: 'cone', 13: 'ridge', 14: 'ridge', 15: 'fractal', 16: 'fractal' }
const SHADER_LABELS: Record<ShaderType, string> = { cone: 'Cone', ridge: 'Ridge', fractal: 'Fractal' }

function AssetCard({ index }: { index: number }) {
  const { pendingAsset, setPendingAsset, mode } = useEditorStore()
  const [shader, setShader] = useState<ShaderType>(DEFAULT_SHADERS[index])
  const texture = useTreeTexture(index)
  const isPending = pendingAsset?.textureIndex === index && pendingAsset?.shader === shader

  const handlePlace = () => {
    if (isPending) { setPendingAsset(null); return }
    setPendingAsset({ textureIndex: index, shader })
  }

  return (
    <div
      className={`rounded-xl border transition-all duration-150 overflow-hidden ${
        isPending
          ? 'border-emerald-500 bg-emerald-950/40 shadow-[0_0_16px_rgba(16,185,129,0.25)]'
          : 'border-neutral-700/60 bg-neutral-800/50 hover:border-neutral-600'
      }`}
    >
      {/* Thumbnail */}
      <div className="relative w-full aspect-square bg-neutral-900/80 overflow-hidden">
        {texture ? (
          <img
            src={`/tree_${index}.png`}
            alt={`Tree ${index}`}
            className="w-full h-full object-contain p-1"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-600 text-xs">Loading…</div>
        )}
        {isPending && (
          <div className="absolute inset-0 flex items-center justify-center bg-emerald-900/40">
            <span className="text-emerald-300 text-[10px] font-bold tracking-widest uppercase">Click canvas</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-2 space-y-1.5">
        <p className="text-[11px] font-semibold text-neutral-300">Tree #{index}</p>

        {/* Shader picker */}
        <select
          value={shader}
          onChange={(e) => {
            const s = e.target.value as ShaderType
            setShader(s)
            if (isPending) setPendingAsset({ textureIndex: index, shader: s })
          }}
          className="w-full text-[10px] bg-neutral-900 border border-neutral-700 text-neutral-300 rounded-md px-1.5 py-1 outline-none focus:border-emerald-500"
        >
          {(Object.keys(SHADER_LABELS) as ShaderType[]).map((s) => (
            <option key={s} value={s}>{SHADER_LABELS[s]}</option>
          ))}
        </select>

        {/* Place button */}
        <button
          onClick={handlePlace}
          className={`w-full text-[10px] font-semibold py-1 rounded-md transition-colors ${
            isPending
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
          }`}
        >
          {isPending ? 'Cancel (Esc)' : 'Place'}
        </button>
      </div>
    </div>
  )
}

export function AssetBrowser() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2.5 border-b border-neutral-700/60">
        <p className="text-[10px] font-bold tracking-widest text-neutral-500 uppercase">Assets</p>
        <p className="text-[9px] text-neutral-600 mt-0.5">Click an asset then click the canvas to place</p>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin">
        {ASSETS.map((idx) => (
          <AssetCard key={idx} index={idx} />
        ))}
      </div>
    </div>
  )
}
