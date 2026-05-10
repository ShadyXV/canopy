import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { MapControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { motion, AnimatePresence } from 'motion/react'
import { useEditorStore } from './store/editorStore'
import { preloadAllTextures } from './lib/textureCache'
import { Forest } from './components/Forest'
import { SceneEditor } from './components/SceneEditor'
import { Toolbar } from './components/editor/Toolbar'
import { AssetBrowser } from './components/editor/AssetBrowser'
import { SceneOutliner } from './components/editor/SceneOutliner'
import { InspectorPanel } from './components/editor/InspectorPanel'
import { countForestInstances, toShaderEnvironment } from './lib/sceneEnvironment'

// Kick off texture preloading immediately
preloadAllTextures()

const TOOLBAR_H = 44 // px, matches toolbar py-2 + content
const STUDIO_PAN_LIMITS = {
  minX: -65,
  maxX: 65,
  minY: -45,
  maxY: 45,
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export default function App() {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const {
    mode,
    showBackgroundForest,
    windIntensity,
    windRandomness,
    depthFactor,
    forestDensity,
    pendingAsset,
    cancelPlacement,
    selectedId,
  } = useEditorStore()

  const environment = useMemo(
    () => ({ windIntensity, windRandomness, depthFactor, forestDensity }),
    [windIntensity, windRandomness, depthFactor, forestDensity]
  )
  const shaderEnvironment = useMemo(() => toShaderEnvironment(environment), [environment])

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
  const clampStudioPan = useCallback(() => {
    if (!isStudio) return

    const controls = controlsRef.current
    if (!controls) return

    const { target, object } = controls
    const nextX = clamp(target.x, STUDIO_PAN_LIMITS.minX, STUDIO_PAN_LIMITS.maxX)
    const nextY = clamp(target.y, STUDIO_PAN_LIMITS.minY, STUDIO_PAN_LIMITS.maxY)
    const deltaX = nextX - target.x
    const deltaY = nextY - target.y

    if (deltaX === 0 && deltaY === 0) return

    target.set(nextX, nextY, target.z)
    object.position.x += deltaX
    object.position.y += deltaY
    object.updateMatrixWorld()
    controls.update()
  }, [isStudio])

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
            ref={controlsRef}
            enableRotate={false}
            makeDefault
            // Disable pan/zoom when user is placing an asset
            enabled={!pendingAsset}
            screenSpacePanning={isStudio}
            onChange={clampStudioPan}
          />

          {/* Background forest (always rendered in forest mode, toggleable in studio) */}
          <Forest
            environment={environment}
            visible={mode === 'forest' || showBackgroundForest}
          />

          {/* Studio editor: placed assets + click plane */}
          {isStudio && (
            <SceneEditor
              environment={shaderEnvironment}
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
                  className="absolute right-3 bottom-3"
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
            : `${countForestInstances(environment)} instances · 2.5D Volumetric Mesh`}
        </p>
      </div>
    </div>
  )
}
