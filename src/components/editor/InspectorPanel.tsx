import React from 'react'
import { Trash2, X } from 'lucide-react'
import { useEditorStore, ShaderTweaks } from '../../store/editorStore'
import { ShaderPreviewCanvas } from './ShaderPreviewCanvas'
import { getTreeAsset } from '../../lib/treeAssetCatalog'
import { SHADER_VARIANTS, getShaderVariant } from '../../lib/shaderVariants'

function Row({
  label, hint, value, min, max, step, format = (v: number) => v.toFixed(2),
  onChange,
}: {
  label: string; hint?: string; value: number; min: number; max: number; step: number
  format?: (v: number) => string
  onChange: (v: number) => void
}) {
  return (
    <div title={hint}>
      <label className="flex justify-between text-[10px] text-neutral-500 font-semibold uppercase tracking-wider mb-1">
        <span>{label}</span>
        <span className="text-neutral-400 font-mono">{format(value)}</span>
      </label>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-emerald-500 h-1.5 rounded-full"
      />
    </div>
  )
}

export function InspectorPanel() {
  const {
    placedAssets,
    selectedId,
    deselectAsset,
    updateSelectedAsset,
    updateSelectedShaderTweak,
    removeSelectedAsset,
  } = useEditorStore()
  const asset = placedAssets.find((a) => a.id === selectedId)
  if (!asset) return null
  const treeAsset = getTreeAsset(asset.textureIndex)

  const tw = asset.shaderTweaks
  const upd = (key: keyof ShaderTweaks, val: number) => updateSelectedShaderTweak(key, val)
  const variant = getShaderVariant(asset.shader)

  return (
    <div className="w-64 h-full flex flex-col bg-neutral-900/95 backdrop-blur-xl border border-neutral-700/60 rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-neutral-700/60">
        <div>
          <p className="text-[10px] font-bold tracking-widest text-neutral-500 uppercase">Inspector</p>
          <p className="text-[11px] text-neutral-300 mt-0.5">{treeAsset.label}</p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={removeSelectedAsset}
            title="Delete asset"
            className="p-1 rounded text-neutral-500 hover:text-red-400 hover:bg-red-950/40 transition-colors"
          >
            <Trash2 size={13} />
          </button>
          <button
            onClick={deselectAsset}
            className="p-1 rounded text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Shader switcher */}
        <div>
          <label className="block text-[10px] text-neutral-500 font-semibold uppercase tracking-wider mb-1.5">Shader</label>
          <div className="grid grid-cols-3 gap-1">
            {SHADER_VARIANTS.map((variant) => (
              <button
                key={variant.id}
                onClick={() => updateSelectedAsset({ shader: variant.id })}
                className={`text-[10px] font-semibold py-1.5 rounded-lg border transition-all ${
                  asset.shader === variant.id
                    ? variant.inspectorActiveClass
                    : 'border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                }`}
              >
                {variant.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Live 3D Preview ──────────────────────────── */}
        <div className="rounded-xl overflow-hidden border border-neutral-700/40">
          <ShaderPreviewCanvas
            shader={asset.shader}
            tweaks={asset.shaderTweaks}
            height={120}
          />
          <p className="text-[9px] text-neutral-600 text-center py-1 bg-neutral-950/60">
            Drag to rotate · updates live
          </p>
        </div>

        {/* ── Shader Tweaks ─────────────────────────────── */}
        <div className="space-y-3 rounded-xl bg-neutral-800/40 border border-neutral-700/40 p-2.5">
          <p className="text-[9px] font-bold tracking-widest text-neutral-600 uppercase">Shader Tweaks</p>

          {variant.tweakConfig.map(({ key, label, hint, min, max, step }) => (
            <Row
              key={key}
              label={label}
              hint={hint}
              value={tw[key]}
              min={min} max={max} step={step}
              onChange={(v) => upd(key, v)}
            />
          ))}
        </div>

        {/* ── Transform ─────────────────────────────────── */}
        <div className="space-y-3 rounded-xl bg-neutral-800/40 border border-neutral-700/40 p-2.5">
          <p className="text-[9px] font-bold tracking-widest text-neutral-600 uppercase">Transform</p>

          <Row
            label="Scale"
            value={asset.scale}
            min={1} max={30} step={0.5}
            format={(v) => v.toFixed(1)}
            onChange={(v) => updateSelectedAsset({ scale: v })}
          />

          <Row
            label="Rotation"
            value={asset.rotation}
            min={0} max={Math.PI * 2} step={0.05}
            format={(v) => `${Math.round((v * 180) / Math.PI)}°`}
            onChange={(v) => updateSelectedAsset({ rotation: v })}
          />

          {/* XY position */}
          <div>
            <label className="block text-[10px] text-neutral-500 font-semibold uppercase tracking-wider mb-1">Position</label>
            <div className="flex gap-1.5">
              {(['x', 'y'] as const).map((axis, i) => (
                <div key={axis} className="flex-1 flex items-center gap-1 bg-neutral-900/60 border border-neutral-700/60 rounded-lg px-2 py-1">
                  <span className="text-[9px] font-bold text-neutral-500 uppercase">{axis}</span>
                  <input
                    type="number"
                    value={asset.position[i].toFixed(1)}
                    step={0.5}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value)
                      const p: [number, number] = [...asset.position] as [number, number]
                      p[i] = isNaN(val) ? p[i] : val
                      updateSelectedAsset({ position: p })
                    }}
                    className="w-full bg-transparent text-[10px] text-neutral-300 font-mono outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
