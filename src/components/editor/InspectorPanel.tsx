import React from 'react'
import { Trash2, X } from 'lucide-react'
import { useEditorStore, ShaderType } from '../../store/editorStore'

const SHADERS: { id: ShaderType; label: string; color: string }[] = [
  { id: 'cone',    label: 'Cone',    color: 'data-[active=true]:bg-sky-700    data-[active=true]:border-sky-500    data-[active=true]:text-white' },
  { id: 'ridge',   label: 'Ridge',   color: 'data-[active=true]:bg-amber-700  data-[active=true]:border-amber-500  data-[active=true]:text-white' },
  { id: 'fractal', label: 'Fractal', color: 'data-[active=true]:bg-purple-700 data-[active=true]:border-purple-500 data-[active=true]:text-white' },
]

export function InspectorPanel() {
  const { placedAssets, selectedId, selectAsset, updateAsset, removeAsset } = useEditorStore()
  const asset = placedAssets.find((a) => a.id === selectedId)

  if (!asset) return null

  return (
    <div className="w-64 bg-neutral-900/95 backdrop-blur-xl border border-neutral-700/60 rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-neutral-700/60">
        <div>
          <p className="text-[10px] font-bold tracking-widest text-neutral-500 uppercase">Inspector</p>
          <p className="text-[11px] text-neutral-300 mt-0.5">Tree #{asset.textureIndex}</p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => removeAsset(asset.id)}
            title="Delete asset"
            className="p-1 rounded text-neutral-500 hover:text-red-400 hover:bg-red-950/40 transition-colors"
          >
            <Trash2 size={13} />
          </button>
          <button
            onClick={() => selectAsset(null)}
            className="p-1 rounded text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      <div className="p-3 space-y-4">
        {/* Shader switcher */}
        <div>
          <label className="block text-[10px] text-neutral-500 font-semibold uppercase tracking-wider mb-1.5">Shader</label>
          <div className="flex gap-1">
            {SHADERS.map(({ id, label, color }) => (
              <button
                key={id}
                data-active={asset.shader === id}
                onClick={() => updateAsset(asset.id, { shader: id })}
                className={`flex-1 text-[10px] font-semibold py-1.5 rounded-lg border border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-all ${color}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Scale */}
        <div>
          <label className="flex justify-between text-[10px] text-neutral-500 font-semibold uppercase tracking-wider mb-1.5">
            <span>Scale</span>
            <span className="text-neutral-400 font-mono">{asset.scale.toFixed(1)}</span>
          </label>
          <input
            type="range" min={1} max={30} step={0.5}
            value={asset.scale}
            onChange={(e) => updateAsset(asset.id, { scale: parseFloat(e.target.value) })}
            className="w-full accent-emerald-500 h-1.5 rounded-full"
          />
        </div>

        {/* Rotation */}
        <div>
          <label className="flex justify-between text-[10px] text-neutral-500 font-semibold uppercase tracking-wider mb-1.5">
            <span>Rotation</span>
            <span className="text-neutral-400 font-mono">{Math.round((asset.rotation * 180) / Math.PI)}°</span>
          </label>
          <input
            type="range" min={0} max={Math.PI * 2} step={0.05}
            value={asset.rotation}
            onChange={(e) => updateAsset(asset.id, { rotation: parseFloat(e.target.value) })}
            className="w-full accent-emerald-500 h-1.5 rounded-full"
          />
        </div>

        {/* Position readout */}
        <div>
          <label className="block text-[10px] text-neutral-500 font-semibold uppercase tracking-wider mb-1.5">Position</label>
          <div className="flex gap-1.5">
            {(['x', 'y'] as const).map((axis, i) => (
              <div key={axis} className="flex-1 flex items-center gap-1 bg-neutral-800/60 border border-neutral-700/60 rounded-lg px-2 py-1">
                <span className="text-[9px] font-bold text-neutral-500 uppercase">{axis}</span>
                <input
                  type="number"
                  value={asset.position[i].toFixed(1)}
                  step={0.5}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value)
                    const newPos: [number, number] = [...asset.position] as [number, number]
                    newPos[i] = isNaN(val) ? newPos[i] : val
                    updateAsset(asset.id, { position: newPos })
                  }}
                  className="w-full bg-transparent text-[10px] text-neutral-300 font-mono outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
