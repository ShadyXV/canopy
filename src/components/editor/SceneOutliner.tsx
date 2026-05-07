import React from 'react'
import { Trash2 } from 'lucide-react'
import { useEditorStore } from '../../store/editorStore'

const SHADER_COLORS: Record<string, string> = {
  cone: 'bg-sky-900/70 text-sky-300 border-sky-700/50',
  ridge: 'bg-amber-900/70 text-amber-300 border-amber-700/50',
  fractal: 'bg-purple-900/70 text-purple-300 border-purple-700/50',
}

export function SceneOutliner() {
  const { placedAssets, selectedId, selectAsset, removeAsset } = useEditorStore()

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2.5 border-b border-neutral-700/60 flex items-center justify-between">
        <p className="text-[10px] font-bold tracking-widest text-neutral-500 uppercase">Scene</p>
        <span className="text-[10px] text-neutral-600">{placedAssets.length} instance{placedAssets.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {placedAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-neutral-700 text-[11px] text-center px-4">
            <p>No assets placed yet.</p>
            <p className="mt-1 text-[10px]">Use the Asset Browser to add trees.</p>
          </div>
        ) : (
          <ul className="p-1.5 space-y-0.5">
            {placedAssets.map((asset, i) => (
              <li
                key={asset.id}
                onClick={() => selectAsset(asset.id === selectedId ? null : asset.id)}
                className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                  asset.id === selectedId
                    ? 'bg-emerald-900/30 border border-emerald-700/50'
                    : 'hover:bg-neutral-800/60 border border-transparent'
                }`}
              >
                {/* Tree thumbnail thumbnail (tiny) */}
                <img
                  src={`/tree_${asset.textureIndex}.png`}
                  alt=""
                  className="w-6 h-6 object-contain rounded flex-shrink-0 bg-neutral-900"
                />

                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-neutral-300 truncate">
                    Tree #{asset.textureIndex}
                    <span className="text-neutral-600 ml-1 text-[9px]">#{i + 1}</span>
                  </p>
                  <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded border font-mono ${SHADER_COLORS[asset.shader]}`}>
                    {asset.shader}
                  </span>
                </div>

                {/* Delete */}
                <button
                  onClick={(e) => { e.stopPropagation(); removeAsset(asset.id) }}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400 transition-all p-0.5 rounded"
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
