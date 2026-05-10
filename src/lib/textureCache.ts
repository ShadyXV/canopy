import * as THREE from 'three'
import { useState, useEffect } from 'react'
import {
  generateFallbackProcessedTexture,
  loadProcessedTreeTexture,
  type ProcessedTreeTexture,
} from './treeUtils'
import { getTreeAsset, TREE_ASSETS } from './treeAssetCatalog'

const _cache = new Map<number, ProcessedTreeTexture>()
const _pending = new Map<number, Promise<ProcessedTreeTexture>>()

export function preloadProcessedTexture(index: number): Promise<ProcessedTreeTexture> {
  if (_cache.has(index)) return Promise.resolve(_cache.get(index)!)
  if (_pending.has(index)) return _pending.get(index)!

  const p = loadProcessedTreeTexture(getTreeAsset(index).texturePath)
    .catch(() => generateFallbackProcessedTexture(index))
    .then((processed) => {
      _cache.set(index, processed)
      _pending.delete(index)
      return processed
    })

  _pending.set(index, p)
  return p
}

export function preloadTexture(index: number): Promise<THREE.Texture> {
  return preloadProcessedTexture(index).then((processed) => processed.texture)
}

export function useTreeTexture(index: number): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(() => _cache.get(index)?.texture ?? null)
  useEffect(() => {
    let alive = true
    preloadTexture(index).then((t) => { if (alive) setTex(t) })
    return () => { alive = false }
  }, [index])
  return tex
}

export function useTreePreviewUrl(index: number): string | null {
  const [previewUrl, setPreviewUrl] = useState<string | null>(() => _cache.get(index)?.previewUrl ?? null)
  useEffect(() => {
    let alive = true
    preloadProcessedTexture(index).then((processed) => {
      if (alive) setPreviewUrl(processed.previewUrl)
    })
    return () => { alive = false }
  }, [index])
  return previewUrl
}

export function preloadAllTextures() {
  TREE_ASSETS.forEach((asset) => preloadProcessedTexture(asset.id))
}
