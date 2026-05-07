import React, { useEffect, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { MapControls } from '@react-three/drei'
import { motion, AnimatePresence } from 'motion/react'
import { useEditorStore } from './store/editorStore'
import { preloadAllTextures } from './lib/textureCache'
import { Forest } from './components/Forest'
import { SceneEditor } from './components/SceneEditor'
import { Toolbar } from './components/editor/Toolbar'
import { AssetBrowser } from './components/editor/AssetBrowser'
import { SceneOutliner } from './components/editor/SceneOutliner'
import { InspectorPanel } from './components/editor/InspectorPanel'

// Kick off texture preloading immediately
preloadAllTextures()

const TOOLBAR_H = 44 // px, matches toolbar py-2 + content

export default function App() {
  const {
    mode,
    showBackgroundForest,
    windIntensity,
    windDirection,
    depthFactor,
    forestDensity,
    pendingAsset,
    cancelPlacement,
    selectedId,
  } = useEditorStore()

  const windDirectionVec = useMemo<[number, number]>(() => {
    const rad = (windDirection * Math.PI) / 180
    return [Math.cos(rad), Math.sin(rad)]
  }, [windDirection])

  // Escape key cancels pending placement
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && pendingAsset) cancelPlacement()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pendingAsset, cancelPlacement])

  const isStudio = mode === 'studio'
  const cursorClass = pendingAsset ? 'cursor-crosshair' : 'cursor-default'

  return (
    <div className={`relative w-full h-screen bg-neutral-950 overflow-hidden font-sans ${cursorClass}`}>

      {/* ── Toolbar ── */}
      <Toolbar />

      {/* ── 3D Canvas (inset below toolbar) ── */}
      <div className="absolute inset-0" style={{ top: TOOLBAR_H }}>
        <Canvas
          orthographic
          camera={{ position: [0, 0, 200], zoom: 15, up: [0, 1, 0] }}
          className="block w-full h-full"
        >
          <MapControls
            enableRotate={false}
            makeDefault
            // Disable pan/zoom when user is placing an asset
            enabled={!pendingAsset}
          />

          {/* Background forest (always rendered in forest mode, toggleable in studio) */}
          <Forest
            forestDensity={forestDensity}
            windIntensity={windIntensity}
            windDirectionAngle={windDirection}
            depthFactor={depthFactor}
            visible={mode === 'forest' || showBackgroundForest}
          />

          {/* Studio editor: placed assets + click plane */}
          {isStudio && (
            <SceneEditor
              windIntensity={windIntensity}
              windDirection={windDirectionVec}
              depthFactor={depthFactor}
            />
          )}

          {/* Ambient + directional lights for studio mode (Forest provides its own) */}
          {isStudio && !showBackgroundForest && (
            <>
              <ambientLight intensity={0.4} />
              <directionalLight position={[100, -50, 100]} intensity={1.5} />
              <directionalLight position={[-100, 50, 50]} intensity={0.5} />
            </>
          )}
        </Canvas>
      </div>

      {/* ── Studio UI Panels ── */}
      <AnimatePresence>
        {isStudio && (
          <>
            {/* Asset Browser — left */}
            <motion.div
              key="asset-browser"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute left-3 bg-neutral-900/95 backdrop-blur-xl border border-neutral-700/60 rounded-2xl shadow-2xl overflow-hidden"
              style={{ top: TOOLBAR_H + 12, bottom: 12, width: 200 }}
            >
              <AssetBrowser />
            </motion.div>

            {/* Scene Outliner — right */}
            <motion.div
              key="scene-outliner"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute right-3 bg-neutral-900/95 backdrop-blur-xl border border-neutral-700/60 rounded-2xl shadow-2xl overflow-hidden"
              style={{ top: TOOLBAR_H + 12, height: 320, width: 200 }}
            >
              <SceneOutliner />
            </motion.div>

            {/* Inspector — below outliner when asset selected */}
            <AnimatePresence>
              {selectedId && (
                <motion.div
                  key="inspector"
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 10, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-3"
                  style={{ top: TOOLBAR_H + 12 + 320 + 8 }}
                >
                  <InspectorPanel />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </AnimatePresence>

      {/* ── HUD — bottom left ── */}
      <div className="absolute bottom-4 left-4 pointer-events-none" style={{ left: isStudio ? 216 : 16 }}>
        <h1 className="text-2xl font-bold tracking-tighter text-white drop-shadow-md">
          CANOPY // <span className="text-emerald-500">{isStudio ? 'STUDIO' : 'FOREST'}</span>
        </h1>
        <p className="text-xs font-mono text-neutral-500 mt-0.5">
          {isStudio
            ? `${useEditorStore.getState().placedAssets.length} instances · 2.5D GLSL`
            : `${5 * forestDensity} instances · 2.5D Volumetric Mesh`}
        </p>
      </div>
    </div>
  )
}
