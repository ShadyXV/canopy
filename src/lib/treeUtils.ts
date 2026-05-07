import * as THREE from 'three'

export function generateFallbackTexture(seed: number): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')!

  const center = 128
  const baseRadius = 80 + (seed % 30)

  ctx.clearRect(0, 0, 256, 256)

  const hue = 100 + (seed % 30)
  ctx.fillStyle = `hsl(${hue}, 50%, 30%)`
  ctx.beginPath()
  ctx.arc(center, center, baseRadius, 0, Math.PI * 2)
  ctx.fill()

  for (let i = 0; i < 60; i++) {
    const angle = Math.random() * Math.PI * 2
    const dist = Math.random() * (baseRadius * 0.85)
    const cx = center + Math.cos(angle) * dist
    const cy = center + Math.sin(angle) * dist
    const r = 15 + Math.random() * 25
    ctx.fillStyle = `hsl(${hue + (Math.random() * 20 - 10)}, ${35 + Math.random() * 25}%, ${20 + Math.random() * 25}%)`
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fill()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  return texture
}
