import React from 'react'
import * as THREE from 'three'
import type { ShaderTweaks } from '../store/editorStore'

export type ShaderType = 'cone' | 'ridge' | 'fractal' | 'waves' | 'dense'

export interface TweakConfig {
  key: keyof ShaderTweaks
  label: string
  hint: string
  min: number
  max: number
  step: number
}

export interface ShaderVariant {
  id: ShaderType
  label: string
  inspectorActiveClass: string
  outlinerClass: string
  tweakConfig: TweakConfig[]
}

export const DEFAULT_SHADER_TWEAKS: ShaderTweaks = {
  heightScale: 0.5,
  amplitude: 0.5,
  frequency: 1.0,
}

export const SHADER_VARIANTS: readonly ShaderVariant[] = [
  {
    id: 'cone',
    label: 'Cone',
    inspectorActiveClass: 'bg-sky-700 border-sky-500 text-white',
    outlinerClass: 'bg-sky-900/70 text-sky-300 border-sky-700/50',
    tweakConfig: [
      {
        key: 'heightScale',
        label: 'Height',
        hint: 'Peak height of the dome — 0 = flat disc, 3 = tall spike',
        min: 0.05, max: 0.3, step: 0.05,
      },
      {
        key: 'amplitude',
        label: 'Shadow Depth',
        hint: 'Ambient shadow contrast — higher values create darker shadows under the canopy',
        min: 0, max: 2, step: 0.05,
      },
    ],
  },
  {
    id: 'ridge',
    label: 'Ridge',
    inspectorActiveClass: 'bg-amber-700 border-amber-500 text-white',
    outlinerClass: 'bg-amber-900/70 text-amber-300 border-amber-700/50',
    tweakConfig: [
      {
        key: 'heightScale',
        label: 'Height',
        hint: 'How far the canopy rises — scales the entire sphere+ridge surface',
        min: 0.05, max: 0.3, step: 0.05,
      },
      {
        key: 'amplitude',
        label: 'Roughness',
        hint: 'Ridge depth on the sphere — 0 = smooth dome, high = rugged ridged canopy',
        min: 0, max: 2, step: 0.05,
      },
      {
        key: 'frequency',
        label: 'Detail Scale',
        hint: 'Ridge size — low = broad waves, high = tight fine ridges',
        min: 0.25, max: 4, step: 0.05,
      },
    ],
  },
  {
    id: 'fractal',
    label: 'Fractal',
    inspectorActiveClass: 'bg-purple-700 border-purple-500 text-white',
    outlinerClass: 'bg-purple-900/70 text-purple-300 border-purple-700/50',
    tweakConfig: [
      {
        key: 'heightScale',
        label: 'Height',
        hint: 'How far the canopy rises — scales the entire sphere+fractal surface',
        min: 0.05, max: 0.3, step: 0.05,
      },
      {
        key: 'amplitude',
        label: 'Roughness',
        hint: 'Fractal surface depth — 0 = smooth dome, high = highly textured layered canopy',
        min: 0, max: 2, step: 0.05,
      },
      {
        key: 'frequency',
        label: 'Complexity',
        hint: 'Detail density — low = sparse broad forms, high = dense fine multi-scale detail',
        min: 0.25, max: 4, step: 0.05,
      },
    ],
  },
  {
    id: 'waves',
    label: 'Waves',
    inspectorActiveClass: 'bg-emerald-700 border-emerald-500 text-white',
    outlinerClass: 'bg-emerald-900/70 text-emerald-300 border-emerald-700/50',
    tweakConfig: [
      {
        key: 'heightScale',
        label: 'Height',
        hint: 'Peak height of the tallest waves — higher values create taller, more dramatic crests',
        min: 0.05, max: 0.3, step: 0.05,
      },
      {
        key: 'amplitude',
        label: 'Wave Depth',
        hint: 'How much the waves rise and fall — 0 = flat, high = deep valleys between crests',
        min: 0, max: 2, step: 0.05,
      },
      {
        key: 'frequency',
        label: 'Wave Scale',
        hint: 'Wave size — low = broad rolling hills, high = tight choppy waves',
        min: 0.25, max: 4, step: 0.05,
      },
    ],
  },
  {
    id: 'dense',
    label: 'Dense',
    inspectorActiveClass: 'bg-teal-700 border-teal-500 text-white',
    outlinerClass: 'bg-teal-900/70 text-teal-300 border-teal-700/50',
    tweakConfig: [
      {
        key: 'heightScale',
        label: 'Height',
        hint: 'Overall extrusion depth — scales the entire multi-scale texture surface',
        min: 0.05, max: 0.3, step: 0.05,
      },
      {
        key: 'amplitude',
        label: 'Depth',
        hint: 'Surface depth — 0 = flat, high = deeply layered multi-scale texture',
        min: 0, max: 2, step: 0.05,
      },
      {
        key: 'frequency',
        label: 'Density',
        hint: 'Detail density — low = coarse clusters, high = fine densely-packed texture',
        min: 0.25, max: 4, step: 0.05,
      },
    ],
  },
] as const

export function getShaderVariant(shader: ShaderType): ShaderVariant {
  const variant = SHADER_VARIANTS.find((candidate) => candidate.id === shader)
  if (!variant) throw new Error(`Unknown shader variant: ${shader}`)
  return variant
}

export function shaderSupportsTweak(shader: ShaderType, tweak: keyof ShaderTweaks): boolean {
  return getShaderVariant(shader).tweakConfig.some((t) => t.key === tweak)
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
    case 'waves':
      return <treeWavesMaterial {...materialProps} />
    case 'dense':
      return <treeDenseMaterial {...materialProps} />
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
    case 'waves':
      return <wavesPreviewMaterial ref={materialRef} side={THREE.DoubleSide} />
    case 'dense':
      return <densePreviewMaterial ref={materialRef} side={THREE.DoubleSide} />
  }
}
