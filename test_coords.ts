import { parkBoundary, parkRoutes } from './src/data/parkData.ts';

const tiles = [
  { z: 15, x: 24149, y: 13754, width: 256, height: 256 },
  { z: 15, x: 24149, y: 13755, width: 256, height: 256 },
  { z: 15, x: 24150, y: 13754, width: 256, height: 256 },
  { z: 15, x: 24150, y: 13755, width: 256, height: 256 },
];

let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
tiles.forEach(t => {
  minX = Math.min(minX, t.x); maxX = Math.max(maxX, t.x);
  minY = Math.min(minY, t.y); maxY = Math.max(maxY, t.y);
});

let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
parkBoundary.forEach(([lat, lng]) => {
  minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
  minLng = Math.min(minLng, lng); maxLng = Math.max(maxLng, lng);
});

const zoom = tiles[0].z;
const n = Math.pow(2, zoom);
const refLng = (minX / n) * 360 - 180;
const nLat = Math.PI - (2 * Math.PI * minY) / n;
const refLat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(nLat) - Math.exp(-nLat)));
const local_delta_lng = (360 / n) / 256;
const nLatNext = Math.PI - (2 * Math.PI * (minY + 1)) / n;
const nextLat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(nLatNext) - Math.exp(-nLatNext)));
const local_delta_lat = (nextLat - refLat) / 256;

const getXIdx = (lng) => (lng - refLng) / local_delta_lng;
const getYIdx = (lat) => (lat - refLat) / local_delta_lat;
const startX = Math.floor(Math.max(0, getXIdx(minLng) - 40));
const endX = Math.ceil(Math.min(2 * 256 - 1, getXIdx(maxLng) + 40));
const startY = Math.floor(Math.max(0, getYIdx(maxLat) - 40));
const endY = Math.ceil(Math.min(2 * 256 - 1, getYIdx(minLat) + 40));

const gridWidth = endX - startX + 1;
const gridHeight = endY - startY + 1;
const resMeters = 4.7;
const WORLD_SCALE = 1.0;
const worldW = gridWidth * resMeters * WORLD_SCALE;
const worldH = gridHeight * resMeters * WORLD_SCALE;

console.log({ minX, maxX, minY, maxY, refLng, refLat, local_delta_lng, local_delta_lat });
console.log({ startX, endX, startY, endY, gridWidth, gridHeight, worldW, worldH });

const projectedBoundary = parkBoundary.map(([lat, lng]) => {
  const x_px = getXIdx(lng), y_px = getYIdx(lat);
  const worldX = ((x_px - startX) / (gridWidth - 1)) * worldW - worldW / 2;
  const worldZ = ((y_px - startY) / (gridHeight - 1)) * worldH - worldH / 2;
  return { worldX, worldZ };
});

console.log("Boundary points:", projectedBoundary.slice(0, 5));
