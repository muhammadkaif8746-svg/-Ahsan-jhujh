import * as THREE from 'three';
import {
  MAP_CONFIGS,
  type MagType,
  type MapId,
  type MuzzleType,
  type ScopeType,
  type WeaponId,
} from '../types/game';
import {
  createAirdropCrate,
  createCompoundBuilding,
  createDrivableVehicleMesh,
  type ColliderBox,
} from './models';
import type { MaterialTextureSet } from './textures';

export const PLAYABLE_RADIUS = 460;
export const TERRAIN_SIZE = 1320;

export type LootKind =
  | 'weapon'
  | 'scope'
  | 'muzzle'
  | 'mag'
  | 'armor'
  | 'helmet'
  | 'backpack'
  | 'medkit'
  | 'bandage'
  | 'drink'
  | 'painkiller'
  | 'frag'
  | 'smoke'
  | 'ammo';

export interface LootItem {
  id: string;
  kind: LootKind;
  weaponId?: WeaponId;
  scopeType?: ScopeType;
  muzzleType?: MuzzleType;
  magType?: MagType;
  level?: 1 | 2 | 3;
  amount?: number;
  label: string;
  sublabel: string;
  x: number;
  y: number;
  z: number;
  collected: boolean;
  mesh: THREE.Group;
}

export interface VehicleEntity {
  id: string;
  name: string;
  variant: 'uaz' | 'buggy';
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
  health: number;
  maxHealth: number;
  occupied: boolean;
  group: THREE.Group;
  frontWheels: THREE.Mesh[];
  allWheels: THREE.Mesh[];
  spawnX: number;
  spawnZ: number;
  spawnYaw: number;
}

export interface CompoundSite {
  name: string;
  x: number;
  z: number;
  radius: number;
}

export interface WorldData {
  root: THREE.Group;
  colliders: ColliderBox[];
  lootItems: LootItem[];
  vehicles: VehicleEntity[];
  compounds: CompoundSite[];
  blueZoneMesh: THREE.Mesh;
  redZoneMesh: THREE.Mesh;
  airdropGroup: THREE.Group;
  airdropPos: { x: number; y: number; z: number; falling: boolean };
  airdropLooted: boolean;
  groundHeightAt: (x: number, z: number) => number;
  dispose: () => void;
}

function getCompoundSites(mapId: MapId): CompoundSite[] {
  const names = MAP_CONFIGS[mapId].compoundNames;
  if (mapId === 'erangel_valley') {
    return [
      { name: names[0], x: -18, z: -14, radius: 30 },
      { name: names[1], x: 185, z: 165, radius: 30 },
      { name: names[2], x: -205, z: 175, radius: 30 },
      { name: names[3], x: 175, z: -190, radius: 29 },
      { name: names[4], x: -165, z: -185, radius: 28 },
      { name: names[5], x: 310, z: -28, radius: 28 },
      { name: names[6], x: -315, z: -15, radius: 28 },
      { name: names[7], x: 12, z: -310, radius: 28 },
    ];
  }
  if (mapId === 'miramar_mesa') {
    return [
      { name: names[0], x: 12, z: 10, radius: 30 },
      { name: names[1], x: -210, z: -155, radius: 30 },
      { name: names[2], x: 215, z: -135, radius: 30 },
      { name: names[3], x: -175, z: 205, radius: 29 },
      { name: names[4], x: 195, z: 195, radius: 28 },
      { name: names[5], x: -325, z: 25, radius: 28 },
      { name: names[6], x: 325, z: 32, radius: 28 },
      { name: names[7], x: -18, z: -320, radius: 28 },
    ];
  }
  return [
    { name: names[0], x: 0, z: -24, radius: 30 },
    { name: names[1], x: -195, z: -185, radius: 30 },
    { name: names[2], x: 205, z: 180, radius: 30 },
    { name: names[3], x: 195, z: -180, radius: 29 },
    { name: names[4], x: -185, z: 195, radius: 28 },
    { name: names[5], x: 315, z: -18, radius: 28 },
    { name: names[6], x: -318, z: -14, radius: 28 },
    { name: names[7], x: 10, z: 315, radius: 28 },
  ];
}

export function computeGroundHeight(mapId: MapId, x: number, z: number): number {
  const compounds = getCompoundSites(mapId);

  let h = 0;
  if (mapId === 'erangel_valley') {
    h =
      Math.sin(x * 0.011) * Math.cos(z * 0.01) * 7.8 +
      Math.sin(x * 0.029 + 1.2) * Math.sin(z * 0.027) * 2.8 +
      Math.cos((x + z) * 0.0075) * 4.2;
  } else if (mapId === 'miramar_mesa') {
    const raw =
      Math.sin(x * 0.0095 + 0.7) * Math.cos(z * 0.011) * 10.5 +
      Math.cos(x * 0.024) * Math.sin(z * 0.022 + 0.5) * 3.2;
    h = raw + Math.tanh(raw * 0.3) * 3.5;
  } else {
    h =
      Math.cos(x * 0.01) * Math.sin(z * 0.0095) * 9.2 +
      Math.sin(x * 0.03) * Math.cos(z * 0.028) * 2.7 +
      (x * x + z * z) * 0.000035;
  }

  const dist = Math.hypot(x, z);
  if (dist > PLAYABLE_RADIUS - 15) {
    const t = Math.min(2.0, (dist - (PLAYABLE_RADIUS - 15)) / 135);
    h += t * t * 38 + Math.sin(Math.atan2(z, x) * 10) * t * 6.5;
  }

  for (const c of compounds) {
    const d = Math.hypot(x - c.x, z - c.z);
    if (d < c.radius + 16) {
      const blend = THREE.MathUtils.smoothstep(d, c.radius * 0.72, c.radius + 16);
      const padTarget = 1.4;
      h = THREE.MathUtils.lerp(padTarget, h, blend);
    }
  }

  return h;
}

function createSeededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function createLootPickupMesh(
  kind: LootKind,
  weaponId?: WeaponId,
  level?: 1 | 2 | 3
): THREE.Group {
  const g = new THREE.Group();

  const colorMap: Record<LootKind, number> = {
    weapon: 0xf59e0b,
    scope: 0xa855f7,
    muzzle: 0xc084fc,
    mag: 0xec4899,
    armor: 0x38bdf8,
    helmet: 0x60a5fa,
    backpack: 0x818cf8,
    medkit: 0x22c55e,
    bandage: 0x86efac,
    drink: 0x06b6d4,
    painkiller: 0x22d3ee,
    frag: 0xef4444,
    smoke: 0x9ca3af,
    ammo: 0xeab308,
  };
  const accent = colorMap[kind];

  const ringGeo = new THREE.RingGeometry(0.42, 0.54, 24);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: accent,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = 0.04;
  g.add(ring);

  const itemMat = new THREE.MeshStandardMaterial({
    color:
      kind === 'medkit' || kind === 'bandage'
        ? 0xe5e7eb
        : kind === 'drink' || kind === 'painkiller'
        ? 0x0284c7
        : kind === 'frag'
        ? 0x3f6212
        : level === 3
        ? 0x1e293b
        : 0x475569,
    roughness: 0.35,
    metalness: kind === 'weapon' || kind === 'scope' || kind === 'muzzle' ? 0.78 : 0.25,
    emissive: accent,
    emissiveIntensity: 0.18,
  });

  if (kind === 'weapon') {
    const len = weaponId === 'kar98k' ? 1.15 : weaponId === 'ump45' ? 0.65 : 0.9;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, len), itemMat);
    body.position.y = 0.35;
    body.rotation.y = 0.4;
    g.add(body);
  } else if (kind === 'scope' || kind === 'muzzle') {
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.32, 12), itemMat);
    cyl.rotation.z = Math.PI / 2;
    cyl.position.y = 0.32;
    g.add(cyl);
  } else if (kind === 'frag' || kind === 'smoke') {
    const gren = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.24, 10), itemMat);
    gren.position.y = 0.3;
    g.add(gren);
  } else if (kind === 'medkit' || kind === 'bandage') {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.22, 0.34), itemMat);
    box.position.y = 0.28;
    g.add(box);
    const cross = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.24, 0.08),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    cross.position.y = 0.29;
    g.add(cross);
  } else if (kind === 'drink' || kind === 'painkiller') {
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.34, 12), itemMat);
    can.position.y = 0.3;
    g.add(can);
  } else {
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.38), itemMat);
    pack.position.y = 0.28;
    g.add(pack);
  }

  return g;
}

export function buildMapWorld(mapId: MapId, textures: MaterialTextureSet): WorldData {
  const cfg = MAP_CONFIGS[mapId];
  const root = new THREE.Group();
  const colliders: ColliderBox[] = [];
  const lootItems: LootItem[] = [];
  const vehicles: VehicleEntity[] = [];
  const compounds = getCompoundSites(mapId);
  const rand = createSeededRandom(
    mapId === 'erangel_valley' ? 777 : mapId === 'miramar_mesa' ? 888 : 999
  );

  const groundHeightAt = (x: number, z: number) => computeGroundHeight(mapId, x, z);

  // 1. High-resolution terrain mesh
  const segs = 210;
  const terrainGeo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, segs, segs);
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position;
  const colors = new Float32Array(posAttr.count * 3);
  const baseCol = new THREE.Color(cfg.groundBase);
  const accentCol = new THREE.Color(cfg.groundAccent);
  const rockCol = new THREE.Color(cfg.rockColor);
  const tmpCol = new THREE.Color();

  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    const vy = groundHeightAt(vx, vz);
    posAttr.setY(i, vy);

    const hdx = groundHeightAt(vx + 2.5, vz) - vy;
    const hdz = groundHeightAt(vx, vz + 2.5) - vy;
    const slope = Math.hypot(hdx, hdz) / 2.5;

    tmpCol.copy(baseCol);
    const noiseBlend = (Math.sin(vx * 0.05) * Math.cos(vz * 0.05) + 1) * 0.25;
    tmpCol.lerp(accentCol, noiseBlend);
    if (slope > 0.32) {
      tmpCol.lerp(rockCol, Math.min(1, (slope - 0.32) * 2.2));
    }

    colors[i * 3] = tmpCol.r;
    colors[i * 3 + 1] = tmpCol.g;
    colors[i * 3 + 2] = tmpCol.b;
  }

  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    map: textures.terrainMap,
    bumpMap: textures.terrainBump,
    bumpScale: 0.18,
    vertexColors: true,
    roughness: mapId === 'vikendi_ridge' ? 0.74 : 0.92,
    metalness: 0.02,
  });

  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  root.add(terrainMesh);

  // 2. Tactical Asphalt Cross-Roads
  const roadMat = new THREE.MeshStandardMaterial({
    map: textures.roadMap,
    roughness: 0.85,
    metalness: 0.05,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const buildRoadStrip = (x1: number, z1: number, x2: number, z2: number) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const steps = Math.max(28, Math.round(len / 11));
    const yaw = Math.atan2(dx, dz);
    const stepLen = len / steps;
    for (let s = 0; s < steps; s++) {
      const t0 = (s + 0.5) / steps;
      const cx = x1 + dx * t0;
      const cz = z1 + dz * t0;
      const cy = groundHeightAt(cx, cz) + 0.07;
      const seg = new THREE.Mesh(new THREE.PlaneGeometry(7.6, stepLen + 0.45), roadMat);
      seg.rotation.x = -Math.PI / 2;
      seg.rotation.z = -yaw;
      seg.position.set(cx, cy, cz);
      seg.receiveShadow = true;
      root.add(seg);
    }
  };

  buildRoadStrip(-450, 0, 450, 0);
  buildRoadStrip(0, -450, 0, 450);

  // 3. Compounds + Drivable Vehicles + Rich PUBG Loot
  let variantIdx = 0;
  const vehicleColors = [0x4c583e, 0x8b6f47, 0x3b4856, 0x9b5a2f];

  compounds.forEach((site, sIdx) => {
    const padY = groundHeightAt(site.x, site.z);

    const whYaw = sIdx % 2 === 0 ? 0 : Math.PI * 0.5;
    const wh = createCompoundBuilding('warehouse', site.x, padY, site.z, whYaw, textures, mapId, variantIdx++);
    root.add(wh.group);
    colliders.push(...wh.colliders);

    const contOffsets = [
      { ox: 13.5, oz: -6.5, r: 0.12 },
      { ox: -13.5, oz: 7.5, r: Math.PI * 0.5 - 0.1 },
    ];
    contOffsets.forEach((co) => {
      const cx = site.x + co.ox;
      const cz = site.z + co.oz;
      const cont = createCompoundBuilding('container', cx, groundHeightAt(cx, cz), cz, co.r, textures, mapId, variantIdx++);
      root.add(cont.group);
      colliders.push(...cont.colliders);
    });

    const wtX = site.x + (sIdx % 2 === 0 ? -15 : 15);
    const wtZ = site.z + (sIdx % 2 === 0 ? -14 : 14);
    const wt = createCompoundBuilding('watchtower', wtX, groundHeightAt(wtX, wtZ), wtZ, 0, textures, mapId, variantIdx++);
    root.add(wt.group);
    colliders.push(...wt.colliders);

    const bkX = site.x + (sIdx % 2 === 0 ? 11 : -11);
    const bkZ = site.z + (sIdx % 2 === 0 ? 14 : -14);
    const bk = createCompoundBuilding('bunker', bkX, groundHeightAt(bkX, bkZ), bkZ, sIdx * 0.8, textures, mapId, variantIdx++);
    root.add(bk.group);
    colliders.push(...bk.colliders);

    // Spawn Drivable UAZ or Buggy near every compound
    const vx = site.x + (sIdx % 2 === 0 ? 20 : -20);
    const vz = site.z + 2;
    const vy = groundHeightAt(vx, vz);
    const vYaw = sIdx * 1.1 + 0.4;
    const vType: 'uaz' | 'buggy' = sIdx % 2 === 0 ? 'uaz' : 'buggy';
    const vMesh = createDrivableVehicleMesh(vType, vehicleColors[sIdx % vehicleColors.length]);
    vMesh.group.position.set(vx, vy, vz);
    vMesh.group.rotation.y = vYaw;
    root.add(vMesh.group);

    vehicles.push({
      id: `veh_${sIdx}`,
      name: vType === 'uaz' ? 'UAZ 4x4' : 'Desert Buggy',
      variant: vType,
      x: vx,
      y: vy,
      z: vz,
      yaw: vYaw,
      speed: 0,
      health: vType === 'uaz' ? 220 : 160,
      maxHealth: vType === 'uaz' ? 220 : 160,
      occupied: false,
      group: vMesh.group,
      frontWheels: vMesh.frontWheels,
      allWheels: vMesh.allWheels,
      spawnX: vx,
      spawnZ: vz,
      spawnYaw: vYaw,
    });

    // Rich Compound Loot
    const scopeChoices: ScopeType[] = ['4x', '2x', '6x', '8x', 'reddot', '4x', '6x', '2x'];
    const scopePicked = scopeChoices[sIdx % scopeChoices.length];
    const muzzlePicked: MuzzleType = sIdx % 2 === 0 ? 'suppressor' : 'compensator';
    const weaponCycle: WeaponId[] = ['m416', 'akm', 'kar98k', 's12k', 'm416', 'kar98k', 'akm', 'ump45'];
    const pickedWid = weaponCycle[sIdx % weaponCycle.length];

    const compoundLootTemplates: Array<{
      ox: number;
      oz: number;
      kind: LootKind;
      weaponId?: WeaponId;
      scopeType?: ScopeType;
      muzzleType?: MuzzleType;
      magType?: MagType;
      level?: 1 | 2 | 3;
      amount?: number;
      label: string;
      sublabel: string;
    }> = [
      {
        ox: 2.2,
        oz: -2.0,
        kind: 'weapon',
        weaponId: pickedWid,
        label:
          pickedWid === 'm416'
            ? 'M416 Rifle'
            : pickedWid === 'akm'
            ? 'AKM Rifle'
            : pickedWid === 'kar98k'
            ? 'Kar98k Sniper'
            : pickedWid === 's12k'
            ? 'S12K Shotgun'
            : 'UMP45 SMG',
        sublabel: 'Primary Weapon',
      },
      {
        ox: -1.8,
        oz: 0.8,
        kind: 'scope',
        scopeType: scopePicked,
        label:
          scopePicked === '8x'
            ? '8x CQBSS Scope'
            : scopePicked === '6x'
            ? '6x Sniper Scope'
            : scopePicked === '4x'
            ? '4x ACOG Scope'
            : scopePicked === '2x'
            ? '2x Aimpoint'
            : 'Red Dot Sight',
        sublabel: 'Optic Attachment',
      },
      {
        ox: 3.6,
        oz: 1.5,
        kind: 'muzzle',
        muzzleType: muzzlePicked,
        label: muzzlePicked === 'suppressor' ? 'AR/SR Suppressor' : 'Compensator',
        sublabel: muzzlePicked === 'suppressor' ? 'Silences Shots' : '-25% Recoil',
      },
      {
        ox: -4.2,
        oz: -1.5,
        kind: 'mag',
        magType: 'extended',
        label: 'Extended QuickDraw Mag',
        sublabel: '+10 Mag · Fast Reload',
      },
      {
        ox: -2.5,
        oz: -3.8,
        kind: 'armor',
        level: sIdx === 2 ? 3 : 2,
        label: sIdx === 2 ? 'Lv.3 Military Vest' : 'Lv.2 Police Vest',
        sublabel: 'Body Armor',
      },
      {
        ox: 2.5,
        oz: 4.0,
        kind: 'helmet',
        level: sIdx === 1 ? 3 : 2,
        label: sIdx === 1 ? 'Lv.3 Spetsnaz Helmet' : 'Lv.2 Tactical Helmet',
        sublabel: 'Head Protection',
      },
      {
        ox: -1.0,
        oz: -5.5,
        kind: 'backpack',
        level: sIdx % 2 === 0 ? 3 : 2,
        label: sIdx % 2 === 0 ? 'Lv.3 Tactical Backpack' : 'Lv.2 Field Backpack',
        sublabel: 'Gear Tier Upgrade',
      },
      { ox: 0, oz: 6.2, kind: 'medkit', label: 'First Aid Kit', sublabel: '+75 Health' },
      { ox: 1.8, oz: -6.2, kind: 'frag', label: 'Frag Grenade', sublabel: 'Explosive Throwable' },
      { ox: -3.5, oz: 5.5, kind: 'smoke', label: 'Smoke Grenade', sublabel: 'Tactical Cover' },
      { ox: -9.5, oz: -6.5, kind: 'drink', label: 'Energy Drink', sublabel: '+45 Boost' },
      { ox: 9.5, oz: 6.5, kind: 'ammo', amount: 60, label: 'Ammo Crate', sublabel: '+60 Rounds' },
    ];

    compoundLootTemplates.forEach((tpl, lIdx) => {
      const lx = site.x + tpl.ox;
      const lz = site.z + tpl.oz;
      const ly = groundHeightAt(lx, lz);
      const mesh = createLootPickupMesh(tpl.kind, tpl.weaponId, tpl.level);
      mesh.position.set(lx, ly, lz);
      root.add(mesh);
      lootItems.push({
        id: `loot_${sIdx}_${lIdx}`,
        kind: tpl.kind,
        weaponId: tpl.weaponId,
        scopeType: tpl.scopeType,
        muzzleType: tpl.muzzleType,
        magType: tpl.magType,
        level: tpl.level,
        amount: tpl.amount,
        label: tpl.label,
        sublabel: tpl.sublabel,
        x: lx,
        y: ly,
        z: lz,
        collected: false,
        mesh,
      });
    });
  });

  // Extra scattered field loot & roadside vehicles for huge map traversal
  const roadSpawns = [
    { x: 110, z: 5, yaw: Math.PI * 0.5, variant: 'uaz' as const, color: 0x3b4d36 },
    { x: -115, z: -5, yaw: -Math.PI * 0.5, variant: 'buggy' as const, color: 0x9b5a2f },
    { x: 5, z: 125, yaw: 0, variant: 'uaz' as const, color: 0x4b5563 },
  ];
  roadSpawns.forEach((rs, idx) => {
    const rjy = groundHeightAt(rs.x, rs.z);
    const rVeh = createDrivableVehicleMesh(rs.variant, rs.color);
    rVeh.group.position.set(rs.x, rjy, rs.z);
    rVeh.group.rotation.y = rs.yaw;
    root.add(rVeh.group);
    vehicles.push({
      id: `veh_road_${idx}`,
      name: rs.variant === 'uaz' ? 'UAZ 4x4' : 'Desert Buggy',
      variant: rs.variant,
      x: rs.x,
      y: rjy,
      z: rs.z,
      yaw: rs.yaw,
      speed: 0,
      health: rs.variant === 'uaz' ? 240 : 180,
      maxHealth: rs.variant === 'uaz' ? 240 : 180,
      occupied: false,
      group: rVeh.group,
      frontWheels: rVeh.frontWheels,
      allWheels: rVeh.allWheels,
      spawnX: rs.x,
      spawnZ: rs.z,
      spawnYaw: rs.yaw,
    });
  });

  const fieldWeapons: WeaponId[] = ['m416', 'akm', 'kar98k', 'ump45', 's12k'];
  const fieldScopes: ScopeType[] = ['reddot', '2x', '4x', '6x', '8x'];
  for (let i = 0; i < 48; i++) {
    const ang = (i / 48) * Math.PI * 2 + 0.25;
    const rad = 55 + rand() * (PLAYABLE_RADIUS - 95);
    const fx = Math.cos(ang) * rad;
    const fz = Math.sin(ang) * rad;
    const fy = groundHeightAt(fx, fz);

    if (i % 3 === 0) {
      const bk = createCompoundBuilding('bunker', fx, fy, fz, ang + Math.PI * 0.5, textures, mapId, i);
      root.add(bk.group);
      colliders.push(...bk.colliders);
    }

    const kindCycle: LootKind[] = ['weapon', 'medkit', 'ammo', 'drink', 'scope', 'frag', 'bandage', 'painkiller'];
    const kind = kindCycle[i % kindCycle.length];
    const wid = fieldWeapons[i % fieldWeapons.length];
    const sc = fieldScopes[i % fieldScopes.length];
    const mesh = createLootPickupMesh(kind, kind === 'weapon' ? wid : undefined);
    const lx = fx + 2;
    const ly = groundHeightAt(lx, fz);
    mesh.position.set(lx, ly, fz);
    root.add(mesh);

    lootItems.push({
      id: `field_loot_${i}`,
      kind,
      weaponId: kind === 'weapon' ? wid : undefined,
      scopeType: kind === 'scope' ? sc : undefined,
      amount: kind === 'ammo' ? 60 : undefined,
      label:
        kind === 'weapon'
          ? `${wid.toUpperCase()}`
          : kind === 'scope'
          ? `${sc.toUpperCase()} Scope`
          : kind === 'medkit'
          ? 'First Aid Kit'
          : kind === 'bandage'
          ? 'Bandages (x2)'
          : kind === 'painkiller'
          ? 'Painkillers'
          : kind === 'frag'
          ? 'Frag Grenade'
          : kind === 'ammo'
          ? 'Ammo Pack'
          : 'Energy Drink',
      sublabel: kind === 'weapon' ? 'Field Drop' : kind === 'scope' ? 'Optic' : 'Supply',
      x: lx,
      y: ly,
      z: fz,
      collected: false,
      mesh,
    });
  }

  // 4. Instanced Trees & Rocks across expanded terrain
  const treeCount = mapId === 'miramar_mesa' ? 260 : 480;
  const trunkGeo = new THREE.CylinderGeometry(0.26, 0.42, 4.2, 7);
  trunkGeo.translate(0, 2.1, 0);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4b382a, roughness: 0.92, metalness: 0.02 });
  const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
  trunkInst.castShadow = true;
  trunkInst.receiveShadow = true;

  const crownGeo =
    mapId === 'miramar_mesa' ? new THREE.DodecahedronGeometry(1.5, 0) : new THREE.ConeGeometry(2.1, 5.4, 7);
  crownGeo.translate(0, mapId === 'miramar_mesa' ? 4.4 : 5.4, 0);
  const crownMat = new THREE.MeshStandardMaterial({ color: cfg.foliageColor, roughness: 0.85, metalness: 0.02 });
  const crownInst = new THREE.InstancedMesh(crownGeo, crownMat, treeCount);
  crownInst.castShadow = true;
  crownInst.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const baseFoliage = new THREE.Color(cfg.foliageColor);
  const altFoliage = new THREE.Color(cfg.foliageAlt);
  const tint = new THREE.Color();

  let placedTrees = 0;
  let attempts = 0;
  while (placedTrees < treeCount && attempts < 3600) {
    attempts++;
    const angle = rand() * Math.PI * 2;
    const dist = 22 + rand() * (PLAYABLE_RADIUS + 95);
    const tx = Math.cos(angle) * dist;
    const tz = Math.sin(angle) * dist;
    if (Math.abs(tx) < 8.5 || Math.abs(tz) < 8.5) continue;
    if (compounds.some((c) => Math.hypot(tx - c.x, tz - c.z) < c.radius + 4.5)) continue;

    const ty = groundHeightAt(tx, tz);
    const scale = 0.88 + rand() * 0.42;

    dummy.position.set(tx, ty - 0.15, tz);
    dummy.rotation.set(0, rand() * Math.PI * 2, 0);
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();

    trunkInst.setMatrixAt(placedTrees, dummy.matrix);
    crownInst.setMatrixAt(placedTrees, dummy.matrix);

    tint.copy(baseFoliage).lerp(altFoliage, rand());
    crownInst.setColorAt(placedTrees, tint);

    if (dist < PLAYABLE_RADIUS) {
      colliders.push({
        minX: tx - 0.45 * scale,
        maxX: tx + 0.45 * scale,
        minY: ty,
        maxY: ty + 4.5 * scale,
        minZ: tz - 0.45 * scale,
        maxZ: tz + 0.45 * scale,
      });
    }
    placedTrees++;
  }
  trunkInst.count = placedTrees;
  crownInst.count = placedTrees;
  trunkInst.instanceMatrix.needsUpdate = true;
  crownInst.instanceMatrix.needsUpdate = true;
  if (crownInst.instanceColor) crownInst.instanceColor.needsUpdate = true;
  trunkInst.computeBoundingSphere();
  crownInst.computeBoundingSphere();
  root.add(trunkInst, crownInst);

  // Rocks
  const rockCount = 180;
  const rockGeo = new THREE.DodecahedronGeometry(1.4, 1);
  const rockMat = new THREE.MeshStandardMaterial({ color: cfg.rockColor, roughness: 0.9, metalness: 0.06 });
  const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
  rockInst.castShadow = true;
  rockInst.receiveShadow = true;

  let placedRocks = 0;
  attempts = 0;
  while (placedRocks < rockCount && attempts < 1800) {
    attempts++;
    const angle = rand() * Math.PI * 2;
    const dist = 24 + rand() * (PLAYABLE_RADIUS + 50);
    const rx = Math.cos(angle) * dist;
    const rz = Math.sin(angle) * dist;
    if (Math.abs(rx) < 9 || Math.abs(rz) < 9) continue;
    if (compounds.some((c) => Math.hypot(rx - c.x, rz - c.z) < c.radius + 4)) continue;

    const ry = groundHeightAt(rx, rz);
    const sx = 0.95 + rand() * 1.4;
    const sy = 0.75 + rand() * 1.1;
    const sz = 0.95 + rand() * 1.4;

    dummy.position.set(rx, ry + sy * 0.45, rz);
    dummy.rotation.set(rand() * 0.5, rand() * Math.PI * 2, rand() * 0.5);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    rockInst.setMatrixAt(placedRocks, dummy.matrix);

    if (dist < PLAYABLE_RADIUS) {
      colliders.push({
        minX: rx - sx * 1.05,
        maxX: rx + sx * 1.05,
        minY: ry,
        maxY: ry + sy * 1.6,
        minZ: rz - sz * 1.05,
        maxZ: rz + sz * 1.05,
      });
    }
    placedRocks++;
  }
  rockInst.count = placedRocks;
  rockInst.instanceMatrix.needsUpdate = true;
  rockInst.computeBoundingSphere();
  root.add(rockInst);

  // 5. Airdrop Crate (starts descending from sky!)
  const dropPos = { x: 45, y: 145, z: -45, falling: true };
  const airdropGroup = createAirdropCrate(textures);
  airdropGroup.position.set(dropPos.x, dropPos.y, dropPos.z);
  root.add(airdropGroup);

  // 6. Shrinking Blue Zone Barrier
  const blueZoneGeo = new THREE.CylinderGeometry(1, 1, 260, 72, 1, true);
  const blueZoneMat = new THREE.MeshBasicMaterial({
    color: 0x2589ff,
    transparent: true,
    opacity: 0.24,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const blueZoneMesh = new THREE.Mesh(blueZoneGeo, blueZoneMat);
  blueZoneMesh.position.y = 75;
  blueZoneMesh.scale.set(PLAYABLE_RADIUS, 1, PLAYABLE_RADIUS);
  root.add(blueZoneMesh);

  // 7. Red Zone Bombardment Ring
  const redZoneGeo = new THREE.CylinderGeometry(1, 1, 130, 48, 1, true);
  const redZoneMat = new THREE.MeshBasicMaterial({
    color: 0xef4444,
    transparent: true,
    opacity: 0.16,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const redZoneMesh = new THREE.Mesh(redZoneGeo, redZoneMat);
  redZoneMesh.visible = false;
  root.add(redZoneMesh);

  return {
    root,
    colliders,
    lootItems,
    vehicles,
    compounds,
    blueZoneMesh,
    redZoneMesh,
    airdropGroup,
    airdropPos: dropPos,
    airdropLooted: false,
    groundHeightAt,
    dispose: () => {
      terrainGeo.dispose();
      terrainMat.dispose();
      roadMat.dispose();
      trunkGeo.dispose();
      trunkMat.dispose();
      crownGeo.dispose();
      crownMat.dispose();
      rockGeo.dispose();
      rockMat.dispose();
      blueZoneGeo.dispose();
      blueZoneMat.dispose();
      redZoneGeo.dispose();
      redZoneMat.dispose();
    },
  };
}
