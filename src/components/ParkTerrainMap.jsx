import React, { useMemo, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { MapControls } from '@react-three/drei';
import * as THREE from 'three';
import { TreeInstanceMesh } from './TreeInstanceMesh';
import { DEFAULT_SHADER_TWEAKS } from '../lib/shaderVariants';

const WORLD_SCALE = 1.0;
const DENSE_RES = 160;
const CONTOUR_LEVEL_COUNT = 18;
const CONTOUR_SAMPLE_STEP = 2;
const METERS_PER_DEGREE_LAT = 111_320;

// --- Value noise / FBM ---
function hash2d(x, y) {
  const h = (Math.sin(x * 127.1 + y * 311.7) * 43758.5453) % 1;
  return h < 0 ? h + 1 : h;
}
function valueNoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const xt = xf * xf * (3 - 2 * xf);
  const yt = yf * yf * (3 - 2 * yf);
  return hash2d(xi, yi) * (1-xt)*(1-yt) + hash2d(xi+1, yi) * xt*(1-yt)
       + hash2d(xi, yi+1) * (1-xt)*yt   + hash2d(xi+1, yi+1) * xt*yt;
}
function fbm(x, y, octaves = 5) {
  let v = 0, a = 1, total = 0;
  for (let i = 0; i < octaves; i++) {
    v += valueNoise(x, y) * a;
    total += a;
    a *= 0.5; x *= 2; y *= 2;
  }
  return v / total;
}

function sampleElevation(matrix, x, y) {
  if (!matrix || matrix.length === 0) return 0;
  const h = matrix.length;
  const w = matrix[0].length;
  const x0 = Math.max(0, Math.min(w - 2, Math.floor(x)));
  const x1 = x0 + 1;
  const y0 = Math.max(0, Math.min(h - 2, Math.floor(y)));
  const y1 = y0 + 1;
  const dx = x - x0, dy = y - y0;
  const v00 = matrix[y0][x0] || 0, v10 = matrix[y0][x1] || 0;
  const v01 = matrix[y1][x0] || 0, v11 = matrix[y1][x1] || 0;
  return v00*(1-dx)*(1-dy) + v10*dx*(1-dy) + v01*(1-dx)*dy + v11*dx*dy;
}

function distToSegSq(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const lenSq = dx*dx + dz*dz;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px-ax)*dx + (pz-az)*dz) / lenSq));
  const ex = px - ax - t*dx, ez = pz - az - t*dz;
  return ex*ex + ez*ez;
}

function blurMatrix(matrix, radius = 1) {
  const h = matrix.length, w = matrix[0].length;
  const result = Array(h).fill(0).map(() => new Float32Array(w));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0, count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x+dx, ny = y+dy;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) { sum += matrix[ny][nx]; count++; }
        }
      }
      result[y][x] = sum / count;
    }
  }
  return result;
}

function gridToWorld(col, row, segmentsX, segmentsY, worldW, worldH) {
  return {
    x: (col / segmentsX) * worldW - worldW / 2,
    z: (row / segmentsY) * worldH - worldH / 2,
  };
}

function interpolateContourPoint(level, a, b) {
  const denom = b.h - a.h;
  const t = Math.abs(denom) < 0.00001 ? 0.5 : (level - a.h) / denom;
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
}

function buildContourSegments(displacedH, segmentsX, segmentsY, worldW, worldH, minDisp, maxDisp) {
  const range = maxDisp - minDisp;
  if (!displacedH || range <= 0) return [];
  const segments = [];
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
        const intersections = [];
        if ((p00.h < level && p10.h >= level) || (p10.h < level && p00.h >= level)) intersections.push(interpolateContourPoint(level, p00, p10));
        if ((p10.h < level && p11.h >= level) || (p11.h < level && p10.h >= level)) intersections.push(interpolateContourPoint(level, p10, p11));
        if ((p11.h < level && p01.h >= level) || (p01.h < level && p11.h >= level)) intersections.push(interpolateContourPoint(level, p11, p01));
        if ((p01.h < level && p00.h >= level) || (p00.h < level && p01.h >= level)) intersections.push(interpolateContourPoint(level, p01, p00));
        if (intersections.length === 2) {
          segments.push([intersections[0].x, level + 1.2, intersections[0].z, intersections[1].x, level + 1.2, intersections[1].z]);
        } else if (intersections.length === 4) {
          segments.push([intersections[0].x, level + 1.2, intersections[0].z, intersections[1].x, level + 1.2, intersections[1].z]);
          segments.push([intersections[2].x, level + 1.2, intersections[2].z, intersections[3].x, level + 1.2, intersections[3].z]);
        }
      }
    }
  }
  return segments;
}

function TerrainMesh({ geometry, showContours, displayMode, contourSegments, projectedBoundary, roadPaths, onTerrainClick }) {
  const meshRef = useRef();

  if (!geometry) return null;

  const handleClick = (e) => {
    if (!onTerrainClick) return;
    e.stopPropagation();
    // e.point is world-space. The terrain group is rotated +PI/2 on X, so:
    //   world X  = terrain X    (worldX)
    //   world Y  = -terrain Z   (worldZ stored as -e.point.y)
    //   world Z  = terrain Y    (worldY/elevation stored as e.point.z)
    onTerrainClick(e.point.x, e.point.z, -e.point.y);
  };

  const isGrid = displayMode === 'grid';

  return (
    <group>
      {isGrid ? (
        <group>
          <mesh geometry={geometry} onClick={handleClick}>
            <meshStandardMaterial color="#0f172a" side={THREE.DoubleSide} roughness={0.9} />
          </mesh>
          <mesh geometry={geometry}>
            <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.4}
              polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
          </mesh>
        </group>
      ) : (
        <mesh ref={meshRef} geometry={geometry} onClick={handleClick}>
          <meshStandardMaterial
            color="#071116"
            emissive="#031f22"
            emissiveIntensity={0.18}
            side={THREE.DoubleSide}
            roughness={0.96}
            metalness={0.02}
          />
        </mesh>
      )}

      {showContours && contourSegments?.length > 0 && <ContourSegments segments={contourSegments} />}
      <CinematicOverlays projectedBoundary={projectedBoundary} roadPaths={roadPaths} />
    </group>
  );
}

function ContourSegments({ segments }) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array((segments || []).flat());
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [segments]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  if (!segments?.length) return null;

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#6ee7df" transparent opacity={0.18} depthWrite={false} />
    </lineSegments>
  );
}

function CinematicOverlays({ projectedBoundary, roadPaths }) {
  return (
    <>
      {projectedBoundary?.length > 0 && (
        <SimpleBoundaryLine points={projectedBoundary} color="#d8ffff" opacity={0.34} />
      )}
      {roadPaths?.map((path, i) => (
        <group key={i}>
          <RoadRibbon path={path} width={6.8} color="#889393" yOffset={1.8} />
          <RoadJoints path={path} radius={3.4} color="#889393" yOffset={1.84} />
        </group>
      ))}
    </>
  );
}

function SimpleBoundaryLine({ points, color, opacity }) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(points.flatMap((p) => [p.x, p.y + 1.1, p.z]));
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [points]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <line geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </line>
  );
}

function RoadRibbon({ path, width, color, yOffset = 0 }) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    if (!path || path.length < 2) return geo;
    const halfWidth = width / 2;
    const positions = [], indices = [];
    for (let index = 0; index < path.length - 1; index++) {
      const start = path[index], end = path[index + 1];
      const tangent = new THREE.Vector3(end.x - start.x, 0, end.z - start.z);
      if (tangent.lengthSq() < 0.00001) tangent.set(1, 0, 0);
      tangent.normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).multiplyScalar(halfWidth);
      const base = positions.length / 3;
      positions.push(
        start.x + normal.x, start.y + yOffset, start.z + normal.z,
        start.x - normal.x, start.y + yOffset, start.z - normal.z,
        end.x + normal.x, end.y + yOffset, end.z + normal.z,
        end.x - normal.x, end.y + yOffset, end.z - normal.z,
      );
      indices.push(base, base+1, base+2, base+1, base+3, base+2);
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [path, width, yOffset]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  if (!path || path.length < 2) return null;

  return (
    <mesh geometry={geometry} renderOrder={2}>
      <meshBasicMaterial color={color} side={THREE.DoubleSide} depthWrite={false}
        polygonOffset polygonOffsetFactor={-6} polygonOffsetUnits={-6} />
    </mesh>
  );
}

function RoadJoints({ path, radius, color, yOffset = 0 }) {
  if (!path?.length) return null;
  return (
    <>
      {path.map((point, index) => (
        <mesh key={index} position={[point.x, point.y + yOffset, point.z]} rotation-x={-Math.PI / 2} renderOrder={3}>
          <circleGeometry args={[radius, 24]} />
          <meshBasicMaterial color={color} side={THREE.DoubleSide} depthWrite={false}
            polygonOffset polygonOffsetFactor={-7} polygonOffsetUnits={-7} />
        </mesh>
      ))}
    </>
  );
}

// Flat canopy sprite in world XY space — visible from Z-forward orthographic camera.
// Position converts terrain local (X, Y=elev, Z=lat) to world (X, -Z, Y+offset).
function ParkTreeSprite({ worldX, worldY, worldZ, textureIndex, shader, scale, rotation, shaderTweaks, environment }) {
  const instance = useMemo(() => ({
    position: [0, 0],
    rotation: rotation || 0,
    scale: scale || 20,
  }), [rotation, scale]);

  return (
    <group position={[worldX, -worldZ, worldY + 8]}>
      <TreeInstanceMesh
        textureIndex={textureIndex}
        shader={shader}
        instances={[instance]}
        windIntensity={environment?.windIntensity ?? 0.5}
        windRandomness={environment?.windRandomness ?? 0.3}
        depthFactor={environment?.depthFactor ?? 1.0}
        shaderTweaks={shaderTweaks || DEFAULT_SHADER_TWEAKS}
      />
    </group>
  );
}

export default function ParkTerrainMap({
  tiles,
  parkBoundary,
  routes,
  parkPlacedAssets = [],
  onTerrainClick,
  showContours = true,
  displayMode = 'cinematic',
  exaggeration = 2,
  enableNoise = true,
  noiseAmplitude = 3.6,
  noiseFrequency = 8,
  enableSmoothing = false,
  blurRadius = 1,
  enableRouteSmooth = true,
  roadHalfWidth = 3.5,
  enableBoundarySmooth = true,
  boundaryHalfWidth = 5,
  environment = {},
}) {

  const data = useMemo(() => {
    if (!tiles || tiles.length === 0 || !parkBoundary) return null;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const isOT = tiles[0].isOT;
    let rawMatrix;

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
    let refLng, refLat, local_delta_lng, local_delta_lat;
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

    const getXIdx = (lng) => (lng - refLng) / local_delta_lng;
    const getYIdx = (lat) => (lat - refLat) / local_delta_lat;
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

    // Carve routes into terrain
    let carvedMatrix = denseMatrix;
    if (enableRouteSmooth && routes?.length) {
      carvedMatrix = denseMatrix.map(row => [...row]);
      routes.forEach(route => {
        if (!route.coordinates) return;
        route.coordinates.forEach(([lat1, lng1], idx) => {
          if (idx === 0) return;
          const [lat0, lng0] = route.coordinates[idx - 1];
          const x0 = ((getXIdx(lng0) - startX) / (gridWidth - 1)) * segmentsX;
          const z0 = ((getYIdx(lat0) - startY) / (gridHeight - 1)) * segmentsY;
          const x1 = ((getXIdx(lng1) - startX) / (gridWidth - 1)) * segmentsX;
          const z1 = ((getYIdx(lat1) - startY) / (gridHeight - 1)) * segmentsY;
          const carveR = roadHalfWidth;
          const carveRSq = carveR * carveR;
          const bx = Math.max(0, Math.floor(Math.min(x0, x1) - carveR));
          const ex = Math.min(segmentsX, Math.ceil(Math.max(x0, x1) + carveR));
          const bz = Math.max(0, Math.floor(Math.min(z0, z1) - carveR));
          const ez = Math.min(segmentsY, Math.ceil(Math.max(z0, z1) + carveR));
          for (let i = bz; i <= ez; i++) {
            for (let j = bx; j <= ex; j++) {
              const dSq = distToSegSq(j, i, x0, z0, x1, z1);
              if (dSq < carveRSq) {
                const neighbors = [];
                for (let di = -2; di <= 2; di++) for (let dj = -2; dj <= 2; dj++) {
                  const ni = i + di, nj = j + dj;
                  if (ni >= 0 && ni <= segmentsY && nj >= 0 && nj <= segmentsX) neighbors.push(denseMatrix[ni][nj]);
                }
                carvedMatrix[i][j] = neighbors.reduce((a, b) => a + b, 0) / neighbors.length;
              }
            }
          }
        });
      });
    }

    let finalMatrix = enableSmoothing ? blurMatrix(carvedMatrix, blurRadius) : carvedMatrix;

    let minHeight = Infinity, maxHeight = -Infinity;
    for (let i = 0; i <= segmentsY; i++) {
      for (let j = 0; j <= segmentsX; j++) {
        const h = finalMatrix[i][j];
        if (h < minHeight) minHeight = h;
        if (h > maxHeight) maxHeight = h;
      }
    }

    const displacedH = new Float32Array((segmentsY + 1) * (segmentsX + 1));
    let minDisp = Infinity, maxDisp = -Infinity;
    for (let i = 0; i <= segmentsY; i++) {
      for (let j = 0; j <= segmentsX; j++) {
        const base = (finalMatrix[i][j] - minHeight) * exaggeration;
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

    const geo = new THREE.PlaneGeometry(worldW, worldH, segmentsX, segmentsY);
    geo.rotateX(-Math.PI / 2);
    const vertices = geo.attributes.position.array;

    for (let i = 0; i <= segmentsY; i++) {
      for (let j = 0; j <= segmentsX; j++) {
        const vIdx = i * (segmentsX + 1) + j;
        vertices[vIdx * 3 + 1] = displacedH[vIdx];
      }
    }

    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();

    const getSmoothElevation = (worldX, worldZ) => {
      const u = (worldX + worldW / 2) / worldW;
      const v = (worldZ + worldH / 2) / worldH;
      const px = u * segmentsX, py = v * segmentsY;
      let h = (sampleElevation(finalMatrix, px, py) - minHeight) * exaggeration;
      if (enableNoise) {
        const nv = (fbm(u * noiseFrequency, v * noiseFrequency) - 0.5) * 2;
        h += nv * noiseAmplitude * exaggeration;
      }
      return h;
    };

    const subdivideLine = (coords, maxPxDist = 0.5) => {
      if (!coords || coords.length < 2) return coords;
      const detailed = [];
      for (let i = 0; i < coords.length - 1; i++) {
        const [lat1, lng1] = coords[i], [lat2, lng2] = coords[i+1];
        const x1 = getXIdx(lng1), y1 = getYIdx(lat1);
        const x2 = getXIdx(lng2), y2 = getYIdx(lat2);
        const dist = Math.sqrt((x2-x1)**2 + (y2-y1)**2);
        const steps = Math.ceil(dist / maxPxDist);
        for (let s = 0; s < steps; s++) {
          const t = s / steps;
          detailed.push([lat1 + (lat2-lat1)*t, lng1 + (lng2-lng1)*t]);
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
      const yOffset = 0.5 + 0.8 * exaggeration;
      return new THREE.Vector3(worldX, getSmoothElevation(worldX, worldZ) + yOffset, worldZ);
    });

    const roadPaths = (routes || []).map(r => {
      const detailedCoords = subdivideLine(r.coordinates, 0.1);
      return detailedCoords.map(([lat, lng]) => {
        const x_px = getXIdx(lng), y_px = getYIdx(lat);
        const worldX = ((x_px - startX) / (gridWidth - 1)) * worldW - worldW / 2;
        const worldZ = ((y_px - startY) / (gridHeight - 1)) * worldH - worldH / 2;
        const yOffset = 0.5 + 0.5 * exaggeration;
        return new THREE.Vector3(worldX, getSmoothElevation(worldX, worldZ) + yOffset, worldZ);
      });
    });

    return { geometry: geo, contourSegments, projectedBoundary, roadPaths, getSmoothElevation };
  }, [tiles, parkBoundary, routes, exaggeration, enableNoise, noiseAmplitude, noiseFrequency, enableSmoothing, blurRadius, enableRouteSmooth, roadHalfWidth]);

  return (
    <div className="h-full w-full bg-[#070913]">
      {/*
        Z-forward orthographic camera (same orientation as studio/forest modes).
        The terrain lives in XZ world space (Y up), so we rotate the terrain group
        +90° on X to map: terrain-X→world-X, terrain-Z→world-(-Y), terrain-Y→world-Z.
        This makes the park fill the XY screen plane as seen from +Z camera.
        Trees sit outside the group at their converted world positions [worldX, -worldZ, worldY+8].
      */}
      <Canvas orthographic camera={{ position: [0, 0, 1500], zoom: 0.7, up: [0, 1, 0] }}>
        <MapControls
          makeDefault
          enableRotate={false}
          screenSpacePanning
        />

        <ambientLight intensity={0.8} />
        <directionalLight position={[0, 0, 500]} intensity={1.0} />

        <React.Suspense fallback={null}>
          {data && (
            <>
              {/* Terrain, contours, boundary, routes — rotated into XY screen plane */}
              <group rotation={[Math.PI / 2, 0, 0]}>
                <TerrainMesh
                  geometry={data.geometry}
                  showContours={showContours}
                  displayMode={displayMode}
                  contourSegments={data.contourSegments}
                  projectedBoundary={data.projectedBoundary}
                  roadPaths={data.roadPaths}
                  onTerrainClick={onTerrainClick}
                />
              </group>

              {/* Trees in world XY space — plane faces camera, reads as canopy from above */}
              {parkPlacedAssets.map(asset => (
                <ParkTreeSprite
                  key={asset.id}
                  worldX={asset.worldX}
                  worldY={asset.worldY}
                  worldZ={asset.worldZ}
                  textureIndex={asset.textureIndex}
                  shader={asset.shader}
                  scale={asset.scale}
                  rotation={asset.rotation}
                  shaderTweaks={asset.shaderTweaks}
                  environment={environment}
                />
              ))}
            </>
          )}
        </React.Suspense>
      </Canvas>
    </div>
  );
}
