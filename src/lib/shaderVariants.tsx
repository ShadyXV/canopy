import React from 'react'
import * as THREE from 'three'
import type { ShaderTweaks } from '../store/editorStore'

export type ShaderType = 'cone' | 'ridge' | 'fractal'

export interface ShaderVariant {
  id: ShaderType
  label: string
  inspectorActiveClass: string
  outlinerClass: string
  enabledTweaks: readonly (keyof ShaderTweaks)[]
}

export const DEFAULT_SHADER_TWEAKS: ShaderTweaks = {
  heightScale: 0.5,
  amplitude: 0.6,
  frequency: 1.0,
}

export const SHADER_VARIANTS: readonly ShaderVariant[] = [
  {
    id: 'cone',
    label: 'Cone',
    inspectorActiveClass: 'bg-sky-700 border-sky-500 text-white',
    outlinerClass: 'bg-sky-900/70 text-sky-300 border-sky-700/50',
    enabledTweaks: ['heightScale', 'amplitude'],
  },
  {
    id: 'ridge',
    label: 'Ridge',
    inspectorActiveClass: 'bg-amber-700 border-amber-500 text-white',
    outlinerClass: 'bg-amber-900/70 text-amber-300 border-amber-700/50',
    enabledTweaks: ['heightScale', 'amplitude', 'frequency'],
  },
  {
    id: 'fractal',
    label: 'Fractal',
    inspectorActiveClass: 'bg-purple-700 border-purple-500 text-white',
    outlinerClass: 'bg-purple-900/70 text-purple-300 border-purple-700/50',
    enabledTweaks: ['heightScale', 'amplitude', 'frequency'],
  },
] as const

export function getShaderVariant(shader: ShaderType): ShaderVariant {
  const variant = SHADER_VARIANTS.find((candidate) => candidate.id === shader)
  if (!variant) throw new Error(`Unknown shader variant: ${shader}`)
  return variant
}

export function shaderSupportsTweak(shader: ShaderType, tweak: keyof ShaderTweaks): boolean {
  return getShaderVariant(shader).enabledTweaks.includes(tweak)
}

export function renderTreeShaderMaterial({
  shader,
  materialProps,
}: {
  shader: ShaderType
  materialProps: Record<string, unknown>
}) {
  switch (shader) {
    case 'cone':
      return <treeConeMaterial {...materialProps} />
    case 'ridge':
      return <treeRidgeMaterial {...materialProps} />
    case 'fractal':
      return <treeFractalMaterial {...materialProps} />
  }
}

export function renderPreviewShaderMaterial({
  shader,
  materialRef,
}: {
  shader: ShaderType
  materialRef: React.Ref<unknown>
}) {
  switch (shader) {
    case 'cone':
      return <conePreviewMaterial ref={materialRef} side={THREE.DoubleSide} />
    case 'ridge':
      return <ridgePreviewMaterial ref={materialRef} side={THREE.DoubleSide} />
    case 'fractal':
      return <fractalPreviewMaterial ref={materialRef} side={THREE.DoubleSide} />
  }
}
