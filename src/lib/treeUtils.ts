import * as THREE from 'three'

type Rgb = [number, number, number]

interface BackgroundRemovalOptions {
  gentleGrayRemoval?: boolean
}

export interface ProcessedTreeTexture {
  texture: THREE.Texture
  previewUrl: string
}

function makeCanvasTexture(canvas: HTMLCanvasElement): THREE.Texture {
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  return texture
}

function generateFallbackCanvas(seed: number): HTMLCanvasElement {
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

  return canvas
}

export function generateFallbackTexture(seed: number): THREE.Texture {
  return makeCanvasTexture(generateFallbackCanvas(seed))
}

export function generateFallbackProcessedTexture(seed: number): ProcessedTreeTexture {
  const canvas = generateFallbackCanvas(seed)
  return {
    texture: makeCanvasTexture(canvas),
    previewUrl: canvas.toDataURL('image/png'),
  }
}

function loadImage(path: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Unable to load texture ${path}`))
    image.src = path
  })
}

function colorDistanceSq(a: Rgb, b: Rgb): number {
  const dr = a[0] - b[0]
  const dg = a[1] - b[1]
  const db = a[2] - b[2]
  return dr * dr + dg * dg + db * db
}

function averageColor(samples: Rgb[]): Rgb {
  const total = samples.reduce<Rgb>((acc, color) => {
    acc[0] += color[0]
    acc[1] += color[1]
    acc[2] += color[2]
    return acc
  }, [0, 0, 0])

  return [
    total[0] / samples.length,
    total[1] / samples.length,
    total[2] / samples.length,
  ]
}

function sampleBackgroundColors(data: Uint8ClampedArray, width: number, height: number): Rgb[] {
  const samples: Rgb[] = []
  const step = Math.max(1, Math.floor(Math.min(width, height) / 48))

  const push = (x: number, y: number) => {
    const i = (y * width + x) * 4
    samples.push([data[i], data[i + 1], data[i + 2]])
  }

  for (let x = 0; x < width; x += step) {
    push(x, 0)
    push(x, height - 1)
  }
  for (let y = 0; y < height; y += step) {
    push(0, y)
    push(width - 1, y)
  }

  return samples
}

function splitTwoBackgroundColors(samples: Rgb[]): { colors: Rgb[]; isCheckerboard: boolean } {
  let a = samples[0]
  let b = samples.reduce((farthest, color) => (
    colorDistanceSq(a, color) > colorDistanceSq(a, farthest) ? color : farthest
  ), samples[0])

  for (let i = 0; i < 8; i += 1) {
    const groupA: Rgb[] = []
    const groupB: Rgb[] = []
    samples.forEach((sample) => {
      if (colorDistanceSq(sample, a) <= colorDistanceSq(sample, b)) {
        groupA.push(sample)
      } else {
        groupB.push(sample)
      }
    })
    if (groupA.length) a = averageColor(groupA)
    if (groupB.length) b = averageColor(groupB)
  }

  const clusterDistance = Math.sqrt(colorDistanceSq(a, b))
  const groupBalance = samples.filter((sample) => colorDistanceSq(sample, a) <= colorDistanceSq(sample, b)).length / samples.length
  const isBalanced = groupBalance > 0.18 && groupBalance < 0.82
  const isCheckerboard = clusterDistance > 20 && isBalanced

  return { colors: isCheckerboard ? [a, b] : [averageColor(samples)], isCheckerboard }
}

function removeDetectedBackground(canvas: HTMLCanvasElement, options: BackgroundRemovalOptions = {}): void {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const { data, width, height } = imageData
  const samples = sampleBackgroundColors(data, width, height)
  const { colors, isCheckerboard } = splitTwoBackgroundColors(samples)
  const hardThreshold = isCheckerboard ? 46 : options.gentleGrayRemoval ? 18 : 34
  const softThreshold = hardThreshold + (options.gentleGrayRemoval && !isCheckerboard ? 10 : 18)

  for (let i = 0; i < data.length; i += 4) {
    const color: Rgb = [data[i], data[i + 1], data[i + 2]]
    const distance = Math.sqrt(Math.min(...colors.map((bg) => colorDistanceSq(color, bg))))

    if (distance <= hardThreshold || data[i + 3] < 8) {
      data[i + 3] = 0
    } else if (distance < softThreshold) {
      const edgeAlpha = Math.round(((distance - hardThreshold) / (softThreshold - hardThreshold)) * 255)
      data[i + 3] = Math.min(data[i + 3], edgeAlpha)
    }
  }

  ctx.putImageData(imageData, 0, 0)
}

function getBackgroundRemovalOptions(path: string): BackgroundRemovalOptions {
  return {
    gentleGrayRemoval: /(?:^|\/)tree_6\.png(?:$|\?)/.test(path),
  }
}

export async function loadProcessedTreeTexture(path: string): Promise<ProcessedTreeTexture> {
  const image = await loadImage(path)
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth || image.width
  canvas.height = image.naturalHeight || image.height

  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(image, 0, 0)
  removeDetectedBackground(canvas, getBackgroundRemovalOptions(path))

  return {
    texture: makeCanvasTexture(canvas),
    previewUrl: canvas.toDataURL('image/png'),
  }
}
