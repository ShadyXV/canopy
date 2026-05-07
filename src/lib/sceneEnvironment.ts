export interface SceneEnvironment {
  windIntensity: number
  windDirection: number
  depthFactor: number
  forestDensity: number
}

export interface ShaderEnvironment {
  windIntensity: number
  windDirection: [number, number]
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
  windDirection: 45,
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
    key: 'windDirection',
    label: 'Direction',
    min: 0,
    max: 360,
    step: 1,
    format: (value) => `${value.toFixed(1)}°`,
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

export function windDirectionToVector(directionDegrees: number): [number, number] {
  const radians = (directionDegrees * Math.PI) / 180
  return [Math.cos(radians), Math.sin(radians)]
}

export function toShaderEnvironment(environment: SceneEnvironment): ShaderEnvironment {
  return {
    windIntensity: environment.windIntensity,
    windDirection: windDirectionToVector(environment.windDirection),
    depthFactor: environment.depthFactor,
  }
}

export function countForestInstances(environment: Pick<SceneEnvironment, 'forestDensity'>): number {
  return 5 * environment.forestDensity
}
