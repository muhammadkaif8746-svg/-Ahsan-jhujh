import * as THREE from 'three';
import { MAP_CONFIGS, type MapId } from '../types/game';

function seededRand(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export interface MaterialTextureSet {
  terrainMap: THREE.CanvasTexture;
  terrainBump: THREE.CanvasTexture;
  concreteMap: THREE.CanvasTexture;
  metalMap: THREE.CanvasTexture;
  metalBump: THREE.CanvasTexture;
  woodMap: THREE.CanvasTexture;
  roadMap: THREE.CanvasTexture;
  dispose: () => void;
}

export function createProceduralTextures(mapId: MapId, maxAnisotropy: number): MaterialTextureSet {
  const cfg = MAP_CONFIGS[mapId];
  const aniso = Math.max(1, Math.min(8, maxAnisotropy));

  // 1. High-Res Terrain Albedo + Bump (1024x1024 tiled seamlessly)
  const tSize = 1024;
  const tCanvas = document.createElement('canvas');
  tCanvas.width = tSize;
  tCanvas.height = tSize;
  const tCtx = tCanvas.getContext('2d')!;

  const bCanvas = document.createElement('canvas');
  bCanvas.width = tSize;
  bCanvas.height = tSize;
  const bCtx = bCanvas.getContext('2d')!;

  tCtx.fillStyle = cfg.groundBase;
  tCtx.fillRect(0, 0, tSize, tSize);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, tSize, tSize);

  const rand = seededRand(mapId === 'erangel_valley' ? 101 : mapId === 'miramar_mesa' ? 202 : 303);

  // Soft blotches for natural biome variation
  for (let i = 0; i < 640; i++) {
    const x = rand() * tSize;
    const y = rand() * tSize;
    const r = 14 + rand() * 52;
    const useAccent = rand() > 0.45;
    tCtx.globalAlpha = 0.06 + rand() * 0.1;
    tCtx.fillStyle = useAccent ? cfg.groundAccent : cfg.foliageAlt;
    // Wrap edges for seamless tiling
    for (const ox of [-tSize, 0, tSize]) {
      for (const oy of [-tSize, 0, tSize]) {
        tCtx.beginPath();
        tCtx.arc(x + ox, y + oy, r, 0, Math.PI * 2);
        tCtx.fill();
      }
    }

    bCtx.globalAlpha = 0.12;
    bCtx.fillStyle = rand() > 0.5 ? '#a5a5a5' : '#585858';
    for (const ox of [-tSize, 0, tSize]) {
      for (const oy of [-tSize, 0, tSize]) {
        bCtx.beginPath();
        bCtx.arc(x + ox, y + oy, r * 0.8, 0, Math.PI * 2);
        bCtx.fill();
      }
    }
  }

  // Micro-grain speckles (pebbles, grass blades, snow crystals)
  tCtx.globalAlpha = 0.24;
  bCtx.globalAlpha = 0.28;
  for (let i = 0; i < 18000; i++) {
    const x = rand() * tSize;
    const y = rand() * tSize;
    const w = 1 + rand() * 2.5;
    const h = mapId === 'erangel_valley' ? 2 + rand() * 5 : 1 + rand() * 2.5;
    tCtx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.24)';
    tCtx.fillRect(x, y, w, h);

    bCtx.fillStyle = rand() > 0.5 ? '#c8c8c8' : '#3a3a3a';
    bCtx.fillRect(x, y, w, h);
  }
  tCtx.globalAlpha = 1;
  bCtx.globalAlpha = 1;

  const terrainMap = new THREE.CanvasTexture(tCanvas);
  terrainMap.colorSpace = THREE.SRGBColorSpace;
  terrainMap.wrapS = THREE.RepeatWrapping;
  terrainMap.wrapT = THREE.RepeatWrapping;
  terrainMap.repeat.set(72, 72);
  terrainMap.anisotropy = aniso;

  const terrainBump = new THREE.CanvasTexture(bCanvas);
  terrainBump.wrapS = THREE.RepeatWrapping;
  terrainBump.wrapT = THREE.RepeatWrapping;
  terrainBump.repeat.set(72, 72);
  terrainBump.anisotropy = aniso;

  // 2. Concrete Slab / Building Texture
  const cCanvas = document.createElement('canvas');
  cCanvas.width = 512;
  cCanvas.height = 512;
  const cCtx = cCanvas.getContext('2d')!;
  cCtx.fillStyle = mapId === 'miramar_mesa' ? '#b8a58d' : '#8b8f91';
  cCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 3500; i++) {
    cCtx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
    cCtx.fillRect(rand() * 512, rand() * 512, 2 + rand() * 5, 2 + rand() * 5);
  }
  cCtx.strokeStyle = 'rgba(0,0,0,0.18)';
  cCtx.lineWidth = 2;
  for (let p = 128; p < 512; p += 128) {
    cCtx.beginPath();
    cCtx.moveTo(0, p);
    cCtx.lineTo(512, p);
    cCtx.stroke();
    cCtx.beginPath();
    cCtx.moveTo(p, 0);
    cCtx.lineTo(p, 512);
    cCtx.stroke();
  }
  const concreteMap = new THREE.CanvasTexture(cCanvas);
  concreteMap.colorSpace = THREE.SRGBColorSpace;
  concreteMap.wrapS = THREE.RepeatWrapping;
  concreteMap.wrapT = THREE.RepeatWrapping;
  concreteMap.anisotropy = aniso;

  // 3. Corrugated Shipping Container / Hangar Metal
  const mCanvas = document.createElement('canvas');
  mCanvas.width = 256;
  mCanvas.height = 256;
  const mCtx = mCanvas.getContext('2d')!;
  const mbCanvas = document.createElement('canvas');
  mbCanvas.width = 256;
  mbCanvas.height = 256;
  const mbCtx = mbCanvas.getContext('2d')!;

  mCtx.fillStyle = '#c8ced4';
  mCtx.fillRect(0, 0, 256, 256);
  mbCtx.fillStyle = '#808080';
  mbCtx.fillRect(0, 0, 256, 256);

  for (let x = 0; x < 256; x += 16) {
    mCtx.fillStyle = 'rgba(0,0,0,0.14)';
    mCtx.fillRect(x, 0, 5, 256);
    mCtx.fillStyle = 'rgba(255,255,255,0.12)';
    mCtx.fillRect(x + 6, 0, 4, 256);

    mbCtx.fillStyle = '#383838';
    mbCtx.fillRect(x, 0, 6, 256);
    mbCtx.fillStyle = '#d4d4d4';
    mbCtx.fillRect(x + 6, 0, 6, 256);
  }
  // Subtle weathering scratches
  for (let i = 0; i < 240; i++) {
    mCtx.fillStyle = 'rgba(60,45,35,0.1)';
    mCtx.fillRect(rand() * 256, rand() * 256, 4 + rand() * 14, 1.5);
  }

  const metalMap = new THREE.CanvasTexture(mCanvas);
  metalMap.colorSpace = THREE.SRGBColorSpace;
  metalMap.wrapS = THREE.RepeatWrapping;
  metalMap.wrapT = THREE.RepeatWrapping;
  metalMap.anisotropy = aniso;

  const metalBump = new THREE.CanvasTexture(mbCanvas);
  metalBump.wrapS = THREE.RepeatWrapping;
  metalBump.wrapT = THREE.RepeatWrapping;
  metalBump.anisotropy = aniso;

  // 4. Wood / Military Crate Texture
  const wCanvas = document.createElement('canvas');
  wCanvas.width = 256;
  wCanvas.height = 256;
  const wCtx = wCanvas.getContext('2d')!;
  wCtx.fillStyle = '#7c5d3b';
  wCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) {
    wCtx.fillStyle = 'rgba(0,0,0,0.22)';
    wCtx.fillRect(0, y, 256, 2);
    for (let g = 0; g < 14; g++) {
      wCtx.fillStyle = 'rgba(40,25,10,0.12)';
      wCtx.fillRect(0, y + 4 + rand() * 24, 256, 1.5);
    }
  }
  wCtx.strokeStyle = 'rgba(30,20,10,0.35)';
  wCtx.lineWidth = 10;
  wCtx.strokeRect(5, 5, 246, 246);
  const woodMap = new THREE.CanvasTexture(wCanvas);
  woodMap.colorSpace = THREE.SRGBColorSpace;
  woodMap.anisotropy = aniso;

  // 5. Asphalt Road Texture
  const rCanvas = document.createElement('canvas');
  rCanvas.width = 256;
  rCanvas.height = 256;
  const rCtx = rCanvas.getContext('2d')!;
  rCtx.fillStyle = '#36393e';
  rCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1800; i++) {
    rCtx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.12)';
    rCtx.fillRect(rand() * 256, rand() * 256, 2, 2);
  }
  // Yellow dashed centerline
  rCtx.fillStyle = '#d4a338';
  rCtx.fillRect(123, 20, 10, 88);
  rCtx.fillRect(123, 148, 10, 88);

  const roadMap = new THREE.CanvasTexture(rCanvas);
  roadMap.colorSpace = THREE.SRGBColorSpace;
  roadMap.wrapS = THREE.RepeatWrapping;
  roadMap.wrapT = THREE.RepeatWrapping;
  roadMap.anisotropy = aniso;

  return {
    terrainMap,
    terrainBump,
    concreteMap,
    metalMap,
    metalBump,
    woodMap,
    roadMap,
    dispose: () => {
      terrainMap.dispose();
      terrainBump.dispose();
      concreteMap.dispose();
      metalMap.dispose();
      metalBump.dispose();
      woodMap.dispose();
      roadMap.dispose();
    },
  };
}
