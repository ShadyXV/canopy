import type { PlacedAsset } from '../store/editorStore'
import { DEFAULT_SHADER_TWEAKS } from './shaderVariants'
import { TREE_ASSETS } from './treeAssetCatalog'

const CLUSTER_COUNT = 18   // number of same-species patches scattered across park
const CLUSTER_MEMBERS = 4  // extra trees per patch (anchor + 4 = 5 per cluster)
const CLUSTER_RADIUS = 28  // max spread from anchor, world units

let _idCounter = 10000
function genId() { return `blueprint-tree-${_idCounter++}` }

function pointInPolygon(px: number, pz: number, polygon: [number, number][]): boolean {
  let inside = false
  const n = polygon.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, zi] = polygon[i]
    const [xj, zj] = polygon[j]
    if ((zi > pz) !== (zj > pz) && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi) {
      inside = !inside
    }
  }
  return inside
}

function distToSegSq(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax, dz = bz - az
  const lenSq = dx * dx + dz * dz
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / lenSq))
  const ex = px - ax - t * dx
  const ez = pz - az - t * dz
  return ex * ex + ez * ez
}

function isValid(
  x: number,
  z: number,
  boundary: [number, number][],
  roadPaths: [number, number][][],
  routeClearSq: number,
  placed: Array<{ x: number; z: number }>,
  minSpacingSq: number,
): boolean {
  if (!pointInPolygon(x, z, boundary)) return false
  for (const path of roadPaths) {
    for (let i = 0; i < path.length - 1; i++) {
      if (distToSegSq(x, z, path[i][0], path[i][1], path[i + 1][0], path[i + 1][1]) < routeClearSq) return false
    }
  }
  for (const p of placed) {
    const dx = x - p.x, dz = z - p.z
    if (dx * dx + dz * dz < minSpacingSq) return false
  }
  return true
}

export function generateBlueprintTrees(
  boundary: [number, number][],
  roadPaths: [number, number][][],
  count = 309,
  routeClearance = 5,
  minSpacing = 13,
): PlacedAsset[] {
  if (!boundary || boundary.length < 3) return []

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
  for (const [x, z] of boundary) {
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (z < minZ) minZ = z
    if (z > maxZ) maxZ = z
  }

  const routeClearSq = routeClearance * routeClearance
  const minSpacingSq = minSpacing * minSpacing
  const placed: Array<{ x: number; z: number }> = []
  const assets: PlacedAsset[] = []

  function addTree(x: number, z: number, textureIndex: number) {
    const treeAsset = TREE_ASSETS.find((a) => a.id === textureIndex)!
    placed.push({ x, z })
    assets.push({
      id: genId(),
      textureIndex: treeAsset.id,
      shader: treeAsset.defaultShader,
      position: [x, -z],
      rotation: Math.random() * Math.PI * 2,
      scale: 20 + Math.random() * 10,
      shaderTweaks: { ...DEFAULT_SHADER_TWEAKS },
    })
  }

  function randomInBbox(): [number, number] {
    return [minX + Math.random() * (maxX - minX), minZ + Math.random() * (maxZ - minZ)]
  }

  // Phase 1: scatter cluster anchors and grow same-species neighbors around each
  let anchorsPlaced = 0
  for (let attempt = 0; attempt < CLUSTER_COUNT * 40 && anchorsPlaced < CLUSTER_COUNT; attempt++) {
    const [ax, az] = randomInBbox()
    if (!isValid(ax, az, boundary, roadPaths, routeClearSq, placed, minSpacingSq)) continue

    const textureIndex = TREE_ASSETS[Math.floor(Math.random() * TREE_ASSETS.length)].id
    addTree(ax, az, textureIndex)
    anchorsPlaced++

    // Grow cluster: try to place CLUSTER_MEMBERS more trees of the same species nearby
    let membersPlaced = 0
    for (let m = 0; m < CLUSTER_MEMBERS * 8 && membersPlaced < CLUSTER_MEMBERS; m++) {
      const angle = Math.random() * Math.PI * 2
      const radius = 8 + Math.random() * (CLUSTER_RADIUS - 8)
      const cx = ax + Math.cos(angle) * radius
      const cz = az + Math.sin(angle) * radius
      if (!isValid(cx, cz, boundary, roadPaths, routeClearSq, placed, minSpacingSq)) continue
      addTree(cx, cz, textureIndex)
      membersPlaced++
    }
  }

  // Phase 2: fill remaining quota with individually randomised trees
  for (let attempt = 0; attempt < (count - assets.length) * 60 && assets.length < count; attempt++) {
    const [x, z] = randomInBbox()
    if (!isValid(x, z, boundary, roadPaths, routeClearSq, placed, minSpacingSq)) continue
    const textureIndex = TREE_ASSETS[Math.floor(Math.random() * TREE_ASSETS.length)].id
    addTree(x, z, textureIndex)
  }

  return assets
}
