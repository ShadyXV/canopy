// Extend React Three Fiber's JSX namespace with our custom shader materials
// This file is picked up automatically by TypeScript via tsconfig.json "include"

import type { Object3DNode } from '@react-three/fiber'
import type { TreeConeMaterial } from './shaders/TreeConeMaterial'
import type { TreeRidgeMaterial } from './shaders/TreeRidgeMaterial'
import type { TreeFractalMaterial } from './shaders/TreeFractalMaterial'

declare module '@react-three/fiber' {
  interface ThreeElements {
    treeConeMaterial: Object3DNode<InstanceType<typeof TreeConeMaterial>, typeof TreeConeMaterial>
    treeRidgeMaterial: Object3DNode<InstanceType<typeof TreeRidgeMaterial>, typeof TreeRidgeMaterial>
    treeFractalMaterial: Object3DNode<InstanceType<typeof TreeFractalMaterial>, typeof TreeFractalMaterial>
  }
}
