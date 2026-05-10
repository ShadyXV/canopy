import React from 'react'
import { Layers, Eye, EyeOff } from 'lucide-react'
import { useEditorStore } from '../../store/editorStore'
import { SCENE_ENVIRONMENT_CONTROLS, type EnvironmentControl } from '../../lib/sceneEnvironment'

function Slider({
  control, value, onChange,
}: {
  control: EnvironmentControl
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-neutral-500 w-20 shrink-0">{control.label}</span>
      <input
        type="range" min={control.min} max={control.max} step={control.step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 accent-emerald-500 h-1 rounded-full"
      />
      <span className="text-[10px] font-mono text-neutral-400 w-10 text-right">{control.format(value)}</span>
    </div>
  )
}

export function Toolbar() {
  const {
    mode, setMode,
    showBackgroundForest, setShowBackgroundForest,
    windIntensity, setWindIntensity,
    windRandomness, setWindRandomness,
    depthFactor, setDepthFactor,
    forestDensity, setForestDensity,
    placedAssets, pendingAsset,
  } = useEditorStore()
  const environment = { windIntensity, windRandomness, depthFactor, forestDensity }
  const setEnvironmentValue = {
    windIntensity: setWindIntensity,
    windRandomness: setWindRandomness,
    depthFactor: setDepthFactor,
    forestDensity: setForestDensity,
  }

  return (
    <div className="absolute top-0 left-0 right-0 z-40 flex items-center gap-4 px-4 py-2 bg-neutral-950/90 backdrop-blur-xl border-b border-neutral-800/80">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-2 shrink-0">
        <Layers size={16} className="text-emerald-500" />
        <span className="text-sm font-bold tracking-tight text-white">CANOPY</span>
      </div>

      {/* Mode tabs */}
      <div className="flex bg-neutral-900 border border-neutral-800 rounded-lg p-0.5 shrink-0">
        {(['forest', 'studio'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 py-1 text-[11px] font-semibold rounded-md capitalize transition-colors ${
              mode === m
                ? 'bg-neutral-700 text-white'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Background forest toggle (studio mode) */}
      {mode === 'studio' && (
        <button
          onClick={() => setShowBackgroundForest(!showBackgroundForest)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold rounded-lg border transition-colors shrink-0 ${
            showBackgroundForest
              ? 'border-emerald-700 bg-emerald-950/40 text-emerald-400'
              : 'border-neutral-700 bg-neutral-900/60 text-neutral-500 hover:text-neutral-300'
          }`}
        >
          {showBackgroundForest ? <Eye size={11} /> : <EyeOff size={11} />}
          BG Forest
        </button>
      )}

      {/* Divider */}
      <div className="w-px h-5 bg-neutral-800 shrink-0" />

      {/* Scene controls */}
      <div className="flex-1 flex items-center gap-4 min-w-0">
        {SCENE_ENVIRONMENT_CONTROLS.filter((control) => !control.visibleInMode || control.visibleInMode === mode).map((control) => (
          <Slider
            key={control.key}
            control={control}
            value={environment[control.key]}
            onChange={setEnvironmentValue[control.key]}
          />
        ))}
      </div>

      {/* Status badge */}
      <div className="shrink-0 text-[10px] font-mono text-neutral-600">
        {mode === 'studio' ? (
          pendingAsset
            ? <span className="text-emerald-400 animate-pulse">● Click to place</span>
            : <span>{placedAssets.length} placed</span>
        ) : null}
      </div>
    </div>
  )
}
