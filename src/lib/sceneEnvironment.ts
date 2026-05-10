export interface SceneEnvironment {
  windIntensity: number
  windRandomness: number
  depthFactor: number
  forestDensity: number
}

export interface ShaderEnvironment {
  windIntensity: number
  windRandomness: number
  depthFactor: number
}

export interface EnvironmentControl {
  key: keyof SceneEnvironment
  label: string
  min: number
  max: number
  step: number
  format: (value: number) => string
  visibleInMode?: 'forest' | 'studio'
}

export const DEFAULT_SCENE_ENVIRONMENT: SceneEnvironment = {
  windIntensity: 0.5,
  windRandomness: 0.3,
  depthFactor: 2.5,
  forestDensity: 10,
}

export const SCENE_ENVIRONMENT_CONTROLS: readonly EnvironmentControl[] = [
  {
    key: 'windIntensity',
    label: 'Wind',
    min: 0,
    max: 2,
    step: 0.01,
    format: (value) => value.toFixed(1),
  },
  {
    key: 'windRandomness',
    label: 'Turbulence',
    min: 0,
    max: 1,
    step: 0.01,
    format: (value) => value.toFixed(2),
  },
  {
    key: 'depthFactor',
    label: 'Depth',
    min: 0,
    max: 10,
    step: 0.1,
    format: (value) => value.toFixed(1),
  },
  {
    key: 'forestDensity',
    label: 'Density',
    min: 1,
    max: 50,
    step: 1,
    format: (value) => value.toFixed(1),
    visibleInMode: 'forest',
  },
] as const

export function toShaderEnvironment(environment: SceneEnvironment): ShaderEnvironment {
  return {
    windIntensity: environment.windIntensity,
    windRandomness: environment.windRandomness,
    depthFactor: environment.depthFactor,
  }
}

export function countForestInstances(environment: Pick<SceneEnvironment, 'forestDensity'>): number {
  return 5 * environment.forestDensity
}
