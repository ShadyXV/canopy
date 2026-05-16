import React, { useEffect, useRef } from 'react'
import { Plane, Vector3 } from 'three'
import { SingleTreeMesh } from './SingleTreeMesh'
import { useEditorStore } from '../store/editorStore'
import type { ShaderEnvironment } from '../lib/sceneEnvironment'
import { revealCursor } from '../lib/revealCursor'

interface Props {
  environment: ShaderEnvironment
}

const dragPlane = new Plane(new Vector3(0, 0, 1), 0)
const dragPoint = new Vector3()

export function SceneEditor({ environment }: Props) {
  const {
    placedAssets,
    pendingAsset,
    selectedId,
    studioTool,
    revealMode,
    placePendingAsset,
    deselectAsset,
    selectAsset,
    updateAsset,
  } = useEditorStore()
  const dragRef = useRef<{
    id: string
    pointerId: number
    offset: [number, number]
    didMove: boolean
  } | null>(null)
  const selectedIdRef = useRef(selectedId)
  const suppressNextPlaneClickRef = useRef(false)

  useEffect(() => {
    selectedIdRef.current = selectedId
  }, [selectedId])

  const handleAssetPointerDown = (id: string, position: [number, number], e: any) => {
    e.stopPropagation()
    selectAsset(id)

    if (studioTool !== 'move') return
    if (id !== selectedId || pendingAsset) return
    if (!e.ray.intersectPlane(dragPlane, dragPoint)) return

    e.target.setPointerCapture?.(e.pointerId)
    dragRef.current = {
      id,
      pointerId: e.pointerId,
      offset: [position[0] - dragPoint.x, position[1] - dragPoint.y],
      didMove: false,
    }
  }

  const handlePlanePointerMove = (e: any) => {
    revealCursor.x = e.point.x
    revealCursor.y = e.point.y

    const drag = dragRef.current
    if (!drag) return
    if (drag.id !== selectedIdRef.current || e.pointerId !== drag.pointerId) return
    if (!e.ray.intersectPlane(dragPlane, dragPoint)) return

    e.stopPropagation()
    drag.didMove = true
    updateAsset(drag.id, {
      position: [dragPoint.x + drag.offset[0], dragPoint.y + drag.offset[1]],
    })
  }

  const handlePlanePointerUp = (e: any) => {
    if (!dragRef.current) return
    if (e.pointerId !== dragRef.current.pointerId) return

    e.stopPropagation()
    if (e.target.hasPointerCapture?.(e.pointerId)) {
      e.target.releasePointerCapture(e.pointerId)
    }
    suppressNextPlaneClickRef.current = dragRef.current.didMove
    dragRef.current = null
  }

  const handlePlaneClick = (e: any) => {
    if (suppressNextPlaneClickRef.current) {
      e.stopPropagation()
      suppressNextPlaneClickRef.current = false
      return
    }

    if (!pendingAsset) {
      deselectAsset()
      return
    }
    e.stopPropagation()
    placePendingAsset([e.point.x, e.point.y])
  }

  return (
    <group>
      {/* Large invisible click plane to receive placement clicks */}
      <mesh
        position={[0, 0, -0.1]}
        onClick={handlePlaneClick}
        onPointerMove={handlePlanePointerMove}
        onPointerUp={handlePlanePointerUp}
        onPointerLeave={handlePlanePointerUp}
      >
        <planeGeometry args={[10000, 10000]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Render all placed assets */}
      {placedAssets.map((asset) => (
        <SingleTreeMesh
          key={asset.id}
          id={asset.id}
          textureIndex={asset.textureIndex}
          shader={asset.shader}
          position={asset.position}
          rotation={asset.rotation}
          scale={asset.scale}
          shaderTweaks={asset.shaderTweaks}
          isSelected={asset.id === selectedId}
          windIntensity={environment.windIntensity}
          windRandomness={environment.windRandomness}
          depthFactor={environment.depthFactor}
          revealMode={revealMode}
          onClick={selectAsset}
          onPointerDown={(e) => handleAssetPointerDown(asset.id, asset.position, e)}
          onPointerMove={handlePlanePointerMove}
          onPointerUp={handlePlanePointerUp}
        />
      ))}
    </group>
  )
}
