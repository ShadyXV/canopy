import * as THREE from 'three'
import { useState, useEffect } from 'react'
import { generateFallbackTexture } from './treeUtils'

const _cache = new Map<number, THREE.Texture>()
const _pending = new Map<number, Promise<THREE.Texture>>()

export function preloadTexture(index: number): Promise<THREE.Texture> {
  if (_cache.has(index)) return Promise.resolve(_cache.get(index)!)
  if (_pending.has(index)) return _pending.get(index)!

  const p = new Promise<THREE.Texture>((resolve) => {
    new THREE.TextureLoader().load(
      `/tree_${index}.png`,
      (t) => { t.colorSpace = THREE.SRGBColorSpace; _cache.set(index, t); _pending.delete(index); resolve(t) },
      undefined,
      () => {
        const fb = generateFallbackTexture(index)
        fb.colorSpace = THREE.SRGBColorSpace
        _cache.set(index, fb)
        _pending.delete(index)
        resolve(fb)
      }
    )
  })
  _pending.set(index, p)
  return p
}

export function useTreeTexture(index: number): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(() => _cache.get(index) ?? null)
  useEffect(() => {
    let alive = true
    preloadTexture(index).then((t) => { if (alive) setTex(t) })
    return () => { alive = false }
  }, [index])
  return tex
}

export function preloadAllTextures() {
  for (let i = 12; i <= 16; i++) preloadTexture(i)
}
