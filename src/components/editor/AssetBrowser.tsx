import React, { useState } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { ShaderPreviewCanvas } from './ShaderPreviewCanvas'
import { TREE_ASSETS, type TreeAsset } from '../../lib/treeAssetCatalog'
import { DEFAULT_SHADER_TWEAKS, SHADER_VARIANTS, type ShaderType } from '../../lib/shaderVariants'

function AssetCard({ asset }: { asset: TreeAsset }) {
  const { pendingAsset, setPendingAsset } = useEditorStore()
  const [shader, setShader] = useState<ShaderType>(asset.defaultShader)

  const isPending = pendingAsset?.textureIndex === asset.id && pendingAsset?.shader === shader

  const handlePlace = () => {
    if (isPending) { setPendingAsset(null); return }
    setPendingAsset({ textureIndex: asset.id, shader })
  }

  return (
    <div
      className={`rounded-xl border transition-all duration-150 overflow-hidden ${
        isPending
          ? 'border-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.3)]'
          : 'border-neutral-700/60 bg-neutral-800/40 hover:border-neutral-600'
      }`}
    >
      {/* Large Texture Preview */}
      <div className="relative bg-neutral-900 border-b border-neutral-700/40 p-2 flex justify-center">
        <img
          src={asset.texturePath}
          alt={asset.label}
          className="h-32 object-contain"
        />

        {/* Overlay when pending */}
        {isPending && (
          <div className="absolute inset-0 flex items-center justify-center bg-emerald-900/50 backdrop-blur-[1px]">
            <span className="text-emerald-200 text-[10px] font-bold tracking-widest uppercase px-2 text-center">
              Click canvas to place
            </span>
          </div>
        )}
      </div>

      {/* Card footer */}
      <div className="p-2 space-y-2 bg-neutral-900/60">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-neutral-300">{asset.label}</p>
        </div>

        {/* Shader selection + Tiny 3D Preview */}
        <div className="flex gap-2 items-center">
          <div className="w-10 h-10 rounded overflow-hidden border border-neutral-700/60 bg-neutral-950 flex-shrink-0">
            <ShaderPreviewCanvas shader={shader} tweaks={DEFAULT_SHADER_TWEAKS} height={40} interactive={false} />
          </div>
          
          <select
            value={shader}
            onChange={(e) => {
              const s = e.target.value as ShaderType
              setShader(s)
              if (isPending) setPendingAsset({ textureIndex: asset.id, shader: s })
            }}
            className="flex-1 text-[10px] bg-neutral-900 border border-neutral-700 text-neutral-300 rounded-md px-1.5 py-1.5 outline-none focus:border-emerald-500"
          >
            {SHADER_VARIANTS.map((variant) => (
              <option key={variant.id} value={variant.id}>{variant.label}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handlePlace}
          className={`w-full text-[10px] font-semibold py-1.5 rounded-md transition-colors ${
            isPending
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
          }`}
        >
          {isPending ? 'Cancel (Esc)' : 'Place in Scene'}
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
        <p className="text-[9px] text-neutral-600 mt-0.5">Drag the previews to rotate · click Place to stamp</p>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {TREE_ASSETS.map((asset) => (
          <AssetCard key={asset.id} asset={asset} />
        ))}
      </div>
    </div>
  )
}
