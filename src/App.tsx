import React, { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { MapControls } from '@react-three/drei'
import { useControls, Leva } from 'leva'
import { motion, AnimatePresence } from 'motion/react'
import { Settings2, X } from 'lucide-react'
import { Forest } from './components/Forest'

export default function App() {
  const [showUI, setShowUI] = useState(true)

  // Leva controls
  const { windIntensity, windDirection, forestDensity, depthFactor } = useControls({
    windIntensity: { value: 0.5, min: 0.0, max: 2.0, step: 0.01 },
    windDirection: { value: 45, min: 0, max: 360, step: 1 },
    forestDensity: { value: 10, min: 1, max: 50, step: 1 },
    depthFactor: { value: 2.5, min: 0, max: 10, step: 0.1 },
  })

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans">
      {/* 3D Scene */}
      <Canvas
        orthographic
        camera={{ position: [0, 0, 200], zoom: 15, up: [0, 1, 0] }}
        className="block"
      >
        <MapControls enableRotate={false} makeDefault />
        <Forest
          forestDensity={forestDensity}
          windIntensity={windIntensity}
          windDirectionAngle={windDirection}
          depthFactor={depthFactor}
        />
      </Canvas>

      {/* UI Overlay */}
      <div className="absolute top-4 right-4 z-50 flex flex-col items-end gap-4 pointer-events-none">
        
        {/* Toggle Button */}
        <button
          onClick={() => setShowUI(!showUI)}
          className="pointer-events-auto flex items-center justify-center p-3 rounded-xl bg-neutral-900/80 backdrop-blur-md border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors shadow-xl"
        >
          {showUI ? <X size={20} /> : <Settings2 size={20} />}
        </button>

        {/* Control Panel */}
        <AnimatePresence>
          {showUI && (
            <motion.div
              initial={{ opacity: 0, x: 20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="pointer-events-auto bg-neutral-900/90 backdrop-blur-xl border border-neutral-800 rounded-2xl shadow-2xl p-4 w-80"
            >
              <div className="mb-4 text-xs font-semibold tracking-wider text-neutral-500 uppercase px-2">
                Environment Controls
              </div>
              
              {/* Container for Leva to prevent it from injecting globally floating styles if we want it inline.
                  By default, Leva renders a global panel unless we pass `fill` or specific props, or use standard Leva panel logic. */}
              <div className="relative w-full overflow-hidden rounded-xl bg-neutral-950/50">
                <Leva fill flat titleBar={false} hideCopyButton />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* HUD overlays */}
      <div className="absolute bottom-6 left-6 pointer-events-none">
        <h1 className="text-3xl font-bold tracking-tighter text-white drop-shadow-md">
          TACTICAL // <span className="text-emerald-500">FOREST</span>
        </h1>
        <p className="text-sm font-mono text-neutral-400 mt-1 drop-shadow-md">
          Instances: {5 * forestDensity} | 2.5D Volumetric Mesh
        </p>
      </div>
    </div>
  )
}

