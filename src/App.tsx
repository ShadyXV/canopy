import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { MapControls } from '@react-three/drei'
import { MOUSE, Vector3 } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { motion, AnimatePresence } from 'motion/react'
import { MousePointer2, Move } from 'lucide-react'
import { useEditorStore } from './store/editorStore'
import { preloadAllTextures } from './lib/textureCache'
import { Forest } from './components/Forest'
import { SceneEditor } from './components/SceneEditor'
import { ParkScene } from './components/ParkScene'
import { BlueprintScene } from './components/BlueprintScene'
import { Toolbar } from './components/editor/Toolbar'
import { AssetBrowser } from './components/editor/AssetBrowser'
import { SceneOutliner } from './components/editor/SceneOutliner'
import { InspectorPanel } from './components/editor/InspectorPanel'
import { countForestInstances, toShaderEnvironment } from './lib/sceneEnvironment'

// const TOOLBAR_H = 44 // px, matches toolbar py-2 + content
const TOOLBAR_H = 44
const STUDIO_PAN_LIMITS = {
  minX: -65,
  maxX: 65,
  minY: -45,
  maxY: 45,
}
const STUDIO_MAX_TILT = Math.PI / 14
const STUDIO_MIN_CAMERA_HEIGHT = 40
const cameraOffset = new Vector3()

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export default function App() {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const [isSpaceHeld, setIsSpaceHeld] = React.useState(false)
  const {
    mode,
    studioTool,
    setStudioTool,
    showBackgroundForest,
    windIntensity,
    windRandomness,
    depthFactor,
    forestDensity,
    pendingAsset,
    cancelPlacement,
    selectedId,
    parkPlacedAssets,
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
  const isPark = mode === 'park'
  const isBlueprint = mode === 'blueprint'
  const isMoveToolActive = (isStudio || isBlueprint) && studioTool === 'move'
  const isStudioRotateMode = isStudio && isSpaceHeld && !pendingAsset && !isMoveToolActive
  const cursorClass = pendingAsset ? 'cursor-crosshair' : isStudioRotateMode ? 'cursor-grab' : 'cursor-default'
  const studioMouseButtons = useMemo(
    () => ({
      LEFT: isStudioRotateMode ? MOUSE.ROTATE : MOUSE.PAN,
      MIDDLE: MOUSE.DOLLY,
      RIGHT: MOUSE.PAN,
    }),
    [isStudioRotateMode]
  )

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false
      return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || isEditableTarget(e.target)) return
      e.preventDefault()
      setIsSpaceHeld(true)
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      e.preventDefault()
      setIsSpaceHeld(false)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  const clampStudioPan = useCallback(() => {
    if (!isStudio) return

    const controls = controlsRef.current
    if (!controls) return

    const { target, object } = controls

    cameraOffset.copy(object.position).sub(target)
    const minCameraZ = target.z + STUDIO_MIN_CAMERA_HEIGHT
    if (object.position.z < minCameraZ) {
      object.position.z = minCameraZ
      cameraOffset.copy(object.position).sub(target)
    }

    const maxLateralOffset = Math.max(cameraOffset.z, STUDIO_MIN_CAMERA_HEIGHT) * Math.tan(STUDIO_MAX_TILT)
    const lateralOffset = Math.hypot(cameraOffset.x, cameraOffset.y)

    if (lateralOffset > maxLateralOffset) {
      const scale = maxLateralOffset / lateralOffset
      object.position.x = target.x + cameraOffset.x * scale
      object.position.y = target.y + cameraOffset.y * scale
      cameraOffset.copy(object.position).sub(target)
    }

    const nextX = clamp(target.x, STUDIO_PAN_LIMITS.minX, STUDIO_PAN_LIMITS.maxX)
    const nextY = clamp(target.y, STUDIO_PAN_LIMITS.minY, STUDIO_PAN_LIMITS.maxY)
    const deltaX = nextX - target.x
    const deltaY = nextY - target.y

    if (deltaX === 0 && deltaY === 0) return

    target.set(nextX, nextY, target.z)
    object.position.x += deltaX
    object.position.y += deltaY
    object.updateMatrixWorld()
  }, [isStudio])

  return (
    <div className={`relative w-full h-screen bg-neutral-950 overflow-hidden font-sans ${cursorClass}`}>

      {/* ── Toolbar ── */}
      <Toolbar />

      {/* ── Park mode: full 3D terrain canvas ── */}
      {isPark && <ParkScene />}

      {/* ── Blueprint mode: 2D Cinematic Top-Down ── */}
      {mode === 'blueprint' && <BlueprintScene />}

      {/* ── Forest / Studio canvas (inset below toolbar) ── */}
      {(!isPark && mode !== 'blueprint') && (
        <div className="absolute inset-0" style={{ top: TOOLBAR_H }}>
          <Canvas
            orthographic
            camera={{ position: [0, 0, 200], zoom: 15, up: [0, 1, 0] }}
            className="block w-full h-full"
          >
            <MapControls
              ref={controlsRef}
              enableRotate={isStudioRotateMode}
              enablePan={!isStudioRotateMode}
              makeDefault
              // Disable camera drag while placing assets or moving selected assets.
              enabled={!pendingAsset && !isMoveToolActive}
              mouseButtons={studioMouseButtons}
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
      )}

      {/* ── Studio / Park UI Panels ── */}
      <AnimatePresence>
        {(isStudio || isPark || isBlueprint) && (
          <>
            {/* Studio tools left rail — studio only */}
            {(isStudio || isBlueprint) && (
              <motion.div
                key="studio-tools"
                initial={{ x: -12, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -12, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute left-3 bg-neutral-900/95 backdrop-blur-xl border border-neutral-700/60 rounded-xl shadow-2xl overflow-hidden p-1.5 flex flex-col gap-1"
                style={{ top: TOOLBAR_H + 12, width: 44 }}
              >
                {[
                  { id: 'select' as const, label: 'Select', icon: MousePointer2 },
                  { id: 'move' as const, label: 'Move', icon: Move },
                ].map((tool) => {
                  const Icon = tool.icon
                  const active = studioTool === tool.id
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      title={tool.label}
                      aria-label={tool.label}
                      aria-pressed={active}
                      onClick={() => setStudioTool(tool.id)}
                      className={`h-8 w-8 grid place-items-center rounded-lg border transition-colors ${
                        active
                          ? 'bg-emerald-500/20 border-emerald-400/70 text-emerald-200'
                          : 'bg-neutral-950/60 border-neutral-700/60 text-neutral-400 hover:text-neutral-100 hover:border-neutral-500'
                      }`}
                    >
                      <Icon size={16} strokeWidth={2.2} />
                    </button>
                  )
                })}
              </motion.div>
            )}

            {/* Asset Browser — left (both studio and park) */}
            <motion.div
              key="asset-browser"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute bg-neutral-900/95 backdrop-blur-xl border border-neutral-700/60 rounded-2xl shadow-2xl overflow-hidden"
              style={{ top: TOOLBAR_H + 12, bottom: 12, left: (isStudio || isBlueprint) ? 64 : 12, width: 200 }}
            >
              <AssetBrowser />
            </motion.div>

            {/* Scene Outliner — right (studio only) */}
            {(isStudio || isBlueprint) && (
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
            )}

            {/* Inspector — below outliner when asset selected (studio only) */}
            {(isStudio || isBlueprint) && (
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
            )}
          </>
        )}
      </AnimatePresence>

      {/* ── HUD — bottom left ── */}
      <div className="absolute bottom-4 pointer-events-none" style={{ left: (isStudio || isPark || isBlueprint) ? 280 : 16 }}>
        <h1 className="text-2xl font-bold tracking-tighter text-white drop-shadow-md">
          CANOPY // <span className="text-emerald-500">{isPark ? 'PARK' : isBlueprint ? 'BLUEPRINT' : isStudio ? 'STUDIO' : 'FOREST'}</span>
        </h1>
        <p className="text-xs font-mono text-neutral-500 mt-0.5">
          {isPark
            ? `${parkPlacedAssets.length} instances · 3D Terrain`
            : isBlueprint
            ? `${useEditorStore.getState().placedAssets.length} instances · 2D Cinematic Map`
            : isStudio
            ? `${useEditorStore.getState().placedAssets.length} instances · 2.5D GLSL`
            : `${countForestInstances(environment)} instances · 2.5D Volumetric Mesh`}
        </p>
      </div>
    </div>
  )
}
