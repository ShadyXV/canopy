import React, { useMemo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { MapControls } from '@react-three/drei';
import * as THREE from 'three';
import { SceneEditor } from './SceneEditor';
import type { ShaderEnvironment } from '../lib/sceneEnvironment';
import { useEditorStore } from '../store/editorStore';

const WORLD_SCALE = 1.0;
const DENSE_RES = 160;
const CONTOUR_LEVEL_COUNT = 18;
const CONTOUR_SAMPLE_STEP = 2;

// --- Value noise / FBM for vertex displacement ---
function hash2d(x: number, y: number) {
  const h = (Math.sin(x * 127.1 + y * 311.7) * 43758.5453) % 1;
  return h < 0 ? h + 1 : h;
}

function valueNoise(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const xt = xf * xf * (3 - 2 * xf);
  const yt = yf * yf * (3 - 2 * yf);
  return hash2d(xi, yi) * (1 - xt) * (1 - yt) + hash2d(xi + 1, yi) * xt * (1 - yt)
    + hash2d(xi, yi + 1) * (1 - xt) * yt + hash2d(xi + 1, yi + 1) * xt * yt;
}

function fbm(x: number, y: number, octaves = 5) {
  let v = 0, a = 1, total = 0;
  for (let i = 0; i < octaves; i++) {
    v += valueNoise(x, y) * a;
    total += a;
    a *= 0.5; x *= 2; y *= 2;
  }
  return v / total; // 0..1
}

function sampleElevation(matrix: Float32Array[], x: number, y: number) {
  if (!matrix || matrix.length === 0) return 0;
  const h = matrix.length;
  const w = matrix[0].length;
  const x0 = Math.max(0, Math.min(w - 2, Math.floor(x)));
  const x1 = x0 + 1;
  const y0 = Math.max(0, Math.min(h - 2, Math.floor(y)));
  const y1 = y0 + 1;
  const dx = x - x0;
  const dy = y - y0;
  const v00 = matrix[y0][x0] || 0;
  const v10 = matrix[y0][x1] || 0;
  const v01 = matrix[y1][x0] || 0;
  const v11 = matrix[y1][x1] || 0;
  return v00 * (1 - dx) * (1 - dy) + v10 * dx * (1 - dy) + v01 * (1 - dx) * dy + v11 * dx * dy;
}

function gridToWorld(col: number, row: number, segmentsX: number, segmentsY: number, worldW: number, worldH: number) {
  return {
    x: (col / segmentsX) * worldW - worldW / 2,
    z: (row / segmentsY) * worldH - worldH / 2,
  };
}

function interpolateContourPoint(level: number, a: { x: number, z: number, h: number }, b: { x: number, z: number, h: number }) {
  const denom = b.h - a.h;
  const t = Math.abs(denom) < 0.00001 ? 0.5 : (level - a.h) / denom;
  return {
    x: a.x + (b.x - a.x) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

function buildContourSegments(displacedH: Float32Array, segmentsX: number, segmentsY: number, worldW: number, worldH: number, minDisp: number, maxDisp: number) {
  const range = maxDisp - minDisp;
  if (!displacedH || range <= 0) return [];

  const segments: number[][] = [];
  const firstLevel = minDisp + range * 0.08;
  const levelStep = (range * 0.84) / CONTOUR_LEVEL_COUNT;

  for (let levelIndex = 1; levelIndex <= CONTOUR_LEVEL_COUNT; levelIndex++) {
    const level = firstLevel + levelStep * levelIndex;

    for (let row = 0; row < segmentsY; row += CONTOUR_SAMPLE_STEP) {
      const nextRow = Math.min(row + CONTOUR_SAMPLE_STEP, segmentsY);
      for (let col = 0; col < segmentsX; col += CONTOUR_SAMPLE_STEP) {
        const nextCol = Math.min(col + CONTOUR_SAMPLE_STEP, segmentsX);
        const p00w = gridToWorld(col, row, segmentsX, segmentsY, worldW, worldH);
        const p10w = gridToWorld(nextCol, row, segmentsX, segmentsY, worldW, worldH);
        const p11w = gridToWorld(nextCol, nextRow, segmentsX, segmentsY, worldW, worldH);
        const p01w = gridToWorld(col, nextRow, segmentsX, segmentsY, worldW, worldH);
        
        const p00 = { ...p00w, h: displacedH[row * (segmentsX + 1) + col] };
        const p10 = { ...p10w, h: displacedH[row * (segmentsX + 1) + nextCol] };
        const p11 = { ...p11w, h: displacedH[nextRow * (segmentsX + 1) + nextCol] };
        const p01 = { ...p01w, h: displacedH[nextRow * (segmentsX + 1) + col] };
        
        const intersections: { x: number, z: number }[] = [];

        if ((p00.h < level && p10.h >= level) || (p10.h < level && p00.h >= level)) intersections.push(interpolateContourPoint(level, p00, p10));
        if ((p10.h < level && p11.h >= level) || (p11.h < level && p10.h >= level)) intersections.push(interpolateContourPoint(level, p10, p11));
        if ((p11.h < level && p01.h >= level) || (p01.h < level && p11.h >= level)) intersections.push(interpolateContourPoint(level, p11, p01));
        if ((p01.h < level && p00.h >= level) || (p00.h < level && p01.h >= level)) intersections.push(interpolateContourPoint(level, p01, p00));

        if (intersections.length === 2) {
          segments.push([intersections[0].x, 0.5, intersections[0].z, intersections[1].x, 0.5, intersections[1].z]);
        } else if (intersections.length === 4) {
          segments.push([intersections[0].x, 0.5, intersections[0].z, intersections[1].x, 0.5, intersections[1].z]);
          segments.push([intersections[2].x, 0.5, intersections[2].z, intersections[3].x, 0.5, intersections[3].z]);
        }
      }
    }
  }

  return segments;
}

function ContourSegments({ segments }: { segments: number[][] }) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array((segments || []).flat());
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.computeBoundingSphere();
    geo.computeBoundingBox();
    return geo;
  }, [segments]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  if (!segments?.length) return null;

  return (
    <lineSegments geometry={geometry} renderOrder={1} frustumCulled={false}>
      <lineBasicMaterial color="#6ee7df" transparent opacity={0.18} depthWrite={false} />
    </lineSegments>
  );
}

function SimpleBoundaryLine({ points, color, opacity }: { points: THREE.Vector3[], color: string, opacity: number }) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(points.flatMap((point) => [point.x, 1.1, point.z]));
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.computeBoundingSphere();
    geo.computeBoundingBox();
    return geo;
  }, [points]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <line geometry={geometry} renderOrder={2} frustumCulled={false}>
      <lineBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </line>
  );
}

function RoadRibbon({ path, width, color, yOffset = 0 }: { path: THREE.Vector3[], width: number, color: string, yOffset?: number }) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    if (!path || path.length < 2) return geo;

    const halfWidth = width / 2;
    const positions = [];
    const indices = [];

    for (let index = 0; index < path.length - 1; index++) {
      const start = path[index];
      const end = path[index + 1];
      const tangent = new THREE.Vector3(end.x - start.x, 0, end.z - start.z);
      if (tangent.lengthSq() < 0.00001) tangent.set(1, 0, 0);
      tangent.normalize();

      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).multiplyScalar(halfWidth);
      const base = positions.length / 3;
      positions.push(
        start.x + normal.x, yOffset, start.z + normal.z,
        start.x - normal.x, yOffset, start.z - normal.z,
        end.x + normal.x, yOffset, end.z + normal.z,
        end.x - normal.x, yOffset, end.z - normal.z,
      );
      indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    geo.computeBoundingBox();
    return geo;
  }, [path, width, yOffset]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  if (!path || path.length < 2) return null;

  return (
    <mesh geometry={geometry} renderOrder={3} frustumCulled={false}>
      <meshBasicMaterial
        color={color}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

function RoadJoints({ path, radius, color, yOffset = 0 }: { path: THREE.Vector3[], radius: number, color: string, yOffset?: number }) {
  if (!path?.length) return null;

  return (
    <group renderOrder={4}>
      {path.map((point, index) => (
        <mesh key={index} position={[point.x, yOffset, point.z]} rotation-x={-Math.PI / 2} frustumCulled={false}>
          <circleGeometry args={[radius, 24]} />
          <meshBasicMaterial
            color={color}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

interface Props {
  tiles: any[];
  parkBoundary: [number, number][];
  routes: { coordinates: [number, number][] }[];
  environment: ShaderEnvironment;
}

export default function CinematicMap({ tiles, parkBoundary, routes, environment }: Props) {
  const setBlueprintMapData = useEditorStore((s) => s.setBlueprintMapData)
  const exaggeration = 2;
  const enableNoise = true;
  const noiseAmplitude = 3.6;
  const noiseFrequency = 8;
  const roadColor = '#ffffff';

  const data = useMemo(() => {
    if (!tiles || tiles.length === 0 || !parkBoundary) return null;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const isOT = tiles[0].isOT;
    let rawMatrix: Float32Array[];

    if (isOT) {
      const meta = tiles[0].meta;
      minX = meta.xllcorner; minY = meta.yllcorner;
      rawMatrix = tiles[0].elevations;
    } else {
      tiles.forEach(t => {
        minX = Math.min(minX, t.x); maxX = Math.max(maxX, t.x);
        minY = Math.min(minY, t.y); maxY = Math.max(maxY, t.y);
      });
      const gridW = (maxX - minX + 1) * 256;
      const gridH = (maxY - minY + 1) * 256;
      rawMatrix = Array(gridH).fill(0).map(() => new Float32Array(gridW));
      tiles.forEach(tile => {
        const startX = (tile.x - minX) * 256, startY = (tile.y - minY) * 256;
        for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) rawMatrix[startY + y][startX + x] = tile.elevations[y][x];
      });
    }

    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    parkBoundary.forEach(([lat, lng]) => {
      minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng); maxLng = Math.max(maxLng, lng);
    });

    const { zoom, cellsize } = tiles[0].meta || { zoom: tiles[0].z };
    let refLng: number, refLat: number, local_delta_lng: number, local_delta_lat: number;
    
    if (isOT) {
      refLng = minX; refLat = minY + (rawMatrix.length * cellsize);
      local_delta_lng = cellsize; local_delta_lat = -cellsize;
    } else {
      const n = Math.pow(2, zoom);
      refLng = (minX / n) * 360 - 180;
      const nLat = Math.PI - (2 * Math.PI * minY) / n;
      refLat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(nLat) - Math.exp(-nLat)));
      local_delta_lng = (360 / n) / 256;
      const nLatNext = Math.PI - (2 * Math.PI * (minY + 1)) / n;
      const nextLat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(nLatNext) - Math.exp(-nLatNext)));
      local_delta_lat = (nextLat - refLat) / 256;
    }

    const getXIdx = (lng: number) => (lng - refLng) / local_delta_lng;
    const getYIdx = (lat: number) => (lat - refLat) / local_delta_lat;
    const startX = Math.floor(Math.max(0, getXIdx(minLng) - (isOT ? 10 : 40)));
    const endX = Math.ceil(Math.min(rawMatrix[0].length - 1, getXIdx(maxLng) + (isOT ? 10 : 40)));
    const startY = Math.floor(Math.max(0, getYIdx(maxLat) - (isOT ? 10 : 40)));
    const endY = Math.ceil(Math.min(rawMatrix.length - 1, getYIdx(minLat) + (isOT ? 10 : 40)));

    const gridWidth = endX - startX + 1, gridHeight = endY - startY + 1;
    const resMeters = isOT ? (cellsize * 111320) : 4.7;
    const worldW = gridWidth * resMeters * WORLD_SCALE;
    const worldH = gridHeight * resMeters * WORLD_SCALE;

    const segmentsX = Math.min(DENSE_RES, gridWidth * 4), segmentsY = Math.min(DENSE_RES, gridHeight * 4);
    const denseMatrix = Array(segmentsY + 1).fill(0).map(() => new Float32Array(segmentsX + 1));
    
    for (let i = 0; i <= segmentsY; i++) {
      for (let j = 0; j <= segmentsX; j++) {
        const sx = startX + (j / segmentsX) * (gridWidth - 1);
        const sy = startY + (i / segmentsY) * (gridHeight - 1);
        denseMatrix[i][j] = sampleElevation(rawMatrix, sx, sy);
      }
    }

    let minHeight = Infinity;
    for (let i = 0; i <= segmentsY; i++) {
      for (let j = 0; j <= segmentsX; j++) {
        const h = denseMatrix[i][j];
        if (h < minHeight) minHeight = h;
      }
    }

    const displacedH = new Float32Array((segmentsY + 1) * (segmentsX + 1));
    let minDisp = Infinity, maxDisp = -Infinity;
    for (let i = 0; i <= segmentsY; i++) {
      for (let j = 0; j <= segmentsX; j++) {
        const base = (denseMatrix[i][j] - minHeight) * exaggeration;
        let h = base;
        if (enableNoise) {
          const nv = (fbm(j * noiseFrequency / segmentsX, i * noiseFrequency / segmentsY) - 0.5) * 2;
          h += nv * noiseAmplitude * exaggeration;
        }
        displacedH[i * (segmentsX + 1) + j] = h;
        if (h < minDisp) minDisp = h;
        if (h > maxDisp) maxDisp = h;
      }
    }

    const contourSegments = buildContourSegments(displacedH, segmentsX, segmentsY, worldW, worldH, minDisp, maxDisp);

    const subdivideLine = (coords: [number, number][], maxPxDist = 0.5) => {
      if (!coords || coords.length < 2) return coords;
      const detailed: [number, number][] = [];
      for (let i = 0; i < coords.length - 1; i++) {
        const [lat1, lng1] = coords[i], [lat2, lng2] = coords[i + 1];
        const x1 = getXIdx(lng1), y1 = getYIdx(lat1);
        const x2 = getXIdx(lng2), y2 = getYIdx(lat2);
        const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        const steps = Math.ceil(dist / maxPxDist);
        for (let s = 0; s < steps; s++) {
          const t = s / steps;
          detailed.push([lat1 + (lat2 - lat1) * t, lng1 + (lng2 - lng1) * t]);
        }
      }
      detailed.push(coords[coords.length - 1]);
      return detailed;
    };

    const closedBoundary = [...parkBoundary];
    if (closedBoundary.length > 0) {
      const first = closedBoundary[0], last = closedBoundary[closedBoundary.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) closedBoundary.push(first);
    }

    const projectedBoundary = subdivideLine(closedBoundary, 0.1).map(([lat, lng]) => {
      const x_px = getXIdx(lng), y_px = getYIdx(lat);
      const worldX = ((x_px - startX) / (gridWidth - 1)) * worldW - worldW / 2;
      const worldZ = ((y_px - startY) / (gridHeight - 1)) * worldH - worldH / 2;
      return new THREE.Vector3(worldX, 0, worldZ);
    });

    const roadPaths = (routes || []).map(r => {
      const detailedCoords = subdivideLine(r.coordinates, 0.1);
      return detailedCoords.map(([lat, lng]) => {
        const x_px = getXIdx(lng), y_px = getYIdx(lat);
        const worldX = ((x_px - startX) / (gridWidth - 1)) * worldW - worldW / 2;
        const worldZ = ((y_px - startY) / (gridHeight - 1)) * worldH - worldH / 2;
        return new THREE.Vector3(worldX, 0, worldZ);
      });
    });

    const result = { contourSegments, projectedBoundary, roadPaths };
    console.log("CinematicMap Data Generated:", {
      contours: contourSegments.length,
      boundary: projectedBoundary.length,
      roads: roadPaths.length,
      worldW, worldH
    });
    return result;
  }, [tiles, parkBoundary, routes]);

  useEffect(() => {
    if (!data) return
    const boundary = data.projectedBoundary.map((v) => [v.x, v.z] as [number, number])
    const roadPaths = data.roadPaths.map((path) => path.map((v) => [v.x, v.z] as [number, number]))
    setBlueprintMapData(boundary, roadPaths)
  }, [data, setBlueprintMapData]);

  return (
    <div className="h-full w-full" style={{ background: '#000000' }}>
      <Canvas
        orthographic
        camera={{ position: [0, 0, 1500], zoom: 0.7, up: [0, 1, 0], near: -5000, far: 5000 }}
        gl={{ alpha: false }}
      >
        <color attach="background" args={['#000000']} />
        
        {/* Orthographic map controls restricting rotation (2D panning only) */}
        <MapControls makeDefault enableRotate={false} screenSpacePanning />

        <React.Suspense fallback={null}>
          {data && (
            <>
              <group rotation={[Math.PI / 2, 0, 0]}>
                <ContourSegments segments={data.contourSegments} />
                
                {data.projectedBoundary.length > 0 && (
                  <SimpleBoundaryLine points={data.projectedBoundary} color="#ffffff" opacity={0.6} />
                )}

                {data.roadPaths.map((path, i) => (
                  <group key={i}>
                    <RoadRibbon path={path} width={5.0} color={roadColor} yOffset={2.0} />
                    <RoadJoints path={path} radius={2.5} color={roadColor} yOffset={2.04} />
                  </group>
                ))}
              </group>

              {/* Render studio tools over the map */}
              <group position={[0, 0, 5]}>
                <SceneEditor environment={environment} />
              </group>
            </>
          )}
        </React.Suspense>
      </Canvas>
    </div>
  );
}
