export type MapId = 'erangel_valley' | 'miramar_mesa' | 'vikendi_ridge';

export type WeaponId = 'm416' | 'akm' | 'kar98k' | 'ump45' | 's12k';

export type ScopeType = 'iron' | 'reddot' | '2x' | '4x' | '6x' | '8x';
export type MuzzleType = 'none' | 'compensator' | 'suppressor';
export type MagType = 'standard' | 'extended';
export type FireMode = 'auto' | 'single';
export type Stance = 'stand' | 'crouch' | 'prone';
export type PlayerMode = 'plane' | 'skydive' | 'parachute' | 'combat' | 'driving';

export type PerspectiveMode = 'TPP' | 'FPP';
export type GraphicsPreset = 'low' | 'medium' | 'high' | 'ultra';
export type ShadowQuality = 'off' | 'medium' | 'high';
export type BotDifficulty = 'recruit' | 'tactical' | 'veteran';
export type GamePhase = 'title' | 'playing' | 'paused' | 'victory' | 'gameover';

export interface WeaponSpec {
  id: WeaponId;
  name: string;
  caliber: string;
  category: 'AR' | 'SR' | 'SMG' | 'SG';
  slot: 1 | 2;
  damage: number;
  headshotMult: number;
  fireRateMs: number;
  reloadSec: number;
  magSize: number;
  extendedMagSize: number;
  reserveMax: number;
  pellets: number;
  baseSpread: number;
  adsSpread: number;
  moveSpreadBonus: number;
  recoilPitch: number;
  recoilYaw: number;
  range: number;
  bulletSpeed: number;
  supportsAuto: boolean;
  defaultScope: ScopeType;
  color: string;
}

export const SCOPE_SPECS: Record<
  ScopeType,
  { label: string; fov: number; recoilMult: number; adsSpreadMult: number; sensMult: number }
> = {
  iron: { label: 'Iron Sight', fov: 64, recoilMult: 1.0, adsSpreadMult: 1.0, sensMult: 0.9 },
  reddot: { label: 'Red Dot', fov: 56, recoilMult: 0.92, adsSpreadMult: 0.8, sensMult: 0.82 },
  '2x': { label: '2x Scope', fov: 44, recoilMult: 0.9, adsSpreadMult: 0.65, sensMult: 0.7 },
  '4x': { label: '4x ACOG', fov: 28, recoilMult: 0.88, adsSpreadMult: 0.45, sensMult: 0.52 },
  '6x': { label: '6x Scope', fov: 20, recoilMult: 0.86, adsSpreadMult: 0.3, sensMult: 0.38 },
  '8x': { label: '8x CQBSS', fov: 14, recoilMult: 0.85, adsSpreadMult: 0.22, sensMult: 0.28 },
};

export const WEAPON_SPECS: Record<WeaponId, WeaponSpec> = {
  m416: {
    id: 'm416',
    name: 'M416',
    caliber: '5.56mm',
    category: 'AR',
    slot: 1,
    damage: 27,
    headshotMult: 1.9,
    fireRateMs: 86,
    reloadSec: 1.85,
    magSize: 30,
    extendedMagSize: 40,
    reserveMax: 240,
    pellets: 1,
    baseSpread: 0.022,
    adsSpread: 0.0042,
    moveSpreadBonus: 0.014,
    recoilPitch: 0.02,
    recoilYaw: 0.0085,
    range: 340,
    bulletSpeed: 310,
    supportsAuto: true,
    defaultScope: 'reddot',
    color: '#d4a359',
  },
  akm: {
    id: 'akm',
    name: 'AKM',
    caliber: '7.62mm',
    category: 'AR',
    slot: 1,
    damage: 35,
    headshotMult: 1.95,
    fireRateMs: 105,
    reloadSec: 2.05,
    magSize: 30,
    extendedMagSize: 40,
    reserveMax: 200,
    pellets: 1,
    baseSpread: 0.03,
    adsSpread: 0.006,
    moveSpreadBonus: 0.017,
    recoilPitch: 0.03,
    recoilYaw: 0.014,
    range: 320,
    bulletSpeed: 290,
    supportsAuto: true,
    defaultScope: 'iron',
    color: '#c27038',
  },
  kar98k: {
    id: 'kar98k',
    name: 'Kar98k',
    caliber: '7.62mm',
    category: 'SR',
    slot: 1,
    damage: 94,
    headshotMult: 2.4,
    fireRateMs: 1100,
    reloadSec: 2.5,
    magSize: 5,
    extendedMagSize: 8,
    reserveMax: 60,
    pellets: 1,
    baseSpread: 0.045,
    adsSpread: 0.0005,
    moveSpreadBonus: 0.026,
    recoilPitch: 0.06,
    recoilYaw: 0.011,
    range: 520,
    bulletSpeed: 440,
    supportsAuto: false,
    defaultScope: '6x',
    color: '#e5b842',
  },
  ump45: {
    id: 'ump45',
    name: 'UMP45',
    caliber: '.45 ACP',
    category: 'SMG',
    slot: 2,
    damage: 23,
    headshotMult: 1.75,
    fireRateMs: 76,
    reloadSec: 1.5,
    magSize: 25,
    extendedMagSize: 35,
    reserveMax: 180,
    pellets: 1,
    baseSpread: 0.018,
    adsSpread: 0.0055,
    moveSpreadBonus: 0.008,
    recoilPitch: 0.015,
    recoilYaw: 0.0075,
    range: 220,
    bulletSpeed: 250,
    supportsAuto: true,
    defaultScope: 'reddot',
    color: '#9ca3af',
  },
  s12k: {
    id: 's12k',
    name: 'S12K',
    caliber: '12 Gauge',
    category: 'SG',
    slot: 2,
    damage: 18,
    headshotMult: 1.5,
    fireRateMs: 340,
    reloadSec: 2.1,
    magSize: 5,
    extendedMagSize: 8,
    reserveMax: 56,
    pellets: 8,
    baseSpread: 0.072,
    adsSpread: 0.042,
    moveSpreadBonus: 0.013,
    recoilPitch: 0.045,
    recoilYaw: 0.02,
    range: 95,
    bulletSpeed: 220,
    supportsAuto: false,
    defaultScope: 'iron',
    color: '#ef4444',
  },
};

export interface MapConfig {
  id: MapId;
  name: string;
  subtitle: string;
  climate: string;
  skyTop: string;
  skyHorizon: string;
  fogColor: string;
  fogDensity: number;
  sunColor: string;
  sunIntensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  groundBase: string;
  groundAccent: string;
  rockColor: string;
  foliageColor: string;
  foliageAlt: string;
  compoundNames: [string, string, string, string, string, string, string, string];
}

export const MAP_CONFIGS: Record<MapId, MapConfig> = {
  erangel_valley: {
    id: 'erangel_valley',
    name: 'Erangel',
    subtitle: 'Expansive Woodland, 8 Compounds & Military Base',
    climate: 'Large-Scale Tactical Daylight · Long Sightlines & Timber Cover',
    skyTop: '#4a7cb5',
    skyHorizon: '#b9cfe0',
    fogColor: '#b7ccdc',
    fogDensity: 0.0011,
    sunColor: '#fff2d6',
    sunIntensity: 2.65,
    hemiSky: '#98c1e8',
    hemiGround: '#3b4a2b',
    hemiIntensity: 0.88,
    groundBase: '#4c5f34',
    groundAccent: '#6b5a42',
    rockColor: '#666b6e',
    foliageColor: '#365627',
    foliageAlt: '#486b32',
    compoundNames: [
      'Pochinki',
      'Sosnovka Base',
      'Georgopol',
      'Mylta Power',
      'Rozhok',
      'Yasnaya',
      'School',
      'Prison',
    ],
  },
  miramar_mesa: {
    id: 'miramar_mesa',
    name: 'Miramar',
    subtitle: 'Vast Arid Canyons, Hacienda & Desert Strongholds',
    climate: 'High-Contrast Desert Sun · Ultra-Long Sniper Lanes',
    skyTop: '#326da8',
    skyHorizon: '#e6c59a',
    fogColor: '#dec097',
    fogDensity: 0.00105,
    sunColor: '#ffe7b3',
    sunIntensity: 3.1,
    hemiSky: '#a8cbe8',
    hemiGround: '#87643e',
    hemiIntensity: 0.92,
    groundBase: '#b89463',
    groundAccent: '#8e6843',
    rockColor: '#9c7856',
    foliageColor: '#6e733b',
    foliageAlt: '#827b45',
    compoundNames: [
      'Pecado',
      'Hacienda',
      'Los Leones',
      'El Pozo',
      'San Martin',
      'Chumacera',
      'Water Plant',
      'Monte Nuevo',
    ],
  },
  vikendi_ridge: {
    id: 'vikendi_ridge',
    name: 'Vikendi',
    subtitle: 'Alpine Snowfields, Castle & Pine Strongholds',
    climate: 'Crisp Nordic Daylight · Long-Range Snow Visibility',
    skyTop: '#466487',
    skyHorizon: '#cbd8e4',
    fogColor: '#c5d4e2',
    fogDensity: 0.00125,
    sunColor: '#e8f1ff',
    sunIntensity: 2.45,
    hemiSky: '#b7d0e8',
    hemiGround: '#546473',
    hemiIntensity: 0.95,
    groundBase: '#d7e2ea',
    groundAccent: '#73828f',
    rockColor: '#56616b',
    foliageColor: '#254236',
    foliageAlt: '#315446',
    compoundNames: [
      'Cosmodrome',
      'Castle',
      'Goroka',
      'Dobro Mesto',
      'Dino Park',
      'Volnova',
      'Villa',
      'Cement Works',
    ],
  },
};

export interface GameSettings {
  graphicsPreset: GraphicsPreset;
  resolutionScale: number;
  shadowQuality: ShadowQuality;
  drawDistance: 'near' | 'balanced' | 'far';
  antialiasing: boolean;
  targetFps: 60 | 120 | 0;
  perspective: PerspectiveMode;
  fov: number;
  mouseSensitivity: number;
  adsSensitivity: number;
  invertY: boolean;
  botDifficulty: BotDifficulty;
  enemyCount: 16 | 24 | 32;
  autoLoot: boolean;
  skipParachute: boolean;
  masterVolume: number;
  muted: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  graphicsPreset: 'high',
  resolutionScale: 1.0,
  shadowQuality: 'high',
  drawDistance: 'far',
  antialiasing: true,
  targetFps: 0,
  perspective: 'TPP',
  fov: 82,
  mouseSensitivity: 1.0,
  adsSensitivity: 0.65,
  invertY: false,
  botDifficulty: 'tactical',
  enemyCount: 24,
  autoLoot: true,
  skipParachute: false,
  masterVolume: 0.75,
  muted: false,
};

export interface WeaponSlotState {
  weaponId: WeaponId;
  magAmmo: number;
  reserveAmmo: number;
  scope: ScopeType;
  muzzle: MuzzleType;
  mag: MagType;
  fireMode: FireMode;
}

export interface KillFeedItem {
  id: number;
  killer: string;
  victim: string;
  weapon: string;
  headshot: boolean;
  isPlayerInvolved: boolean;
  timestamp: number;
}

export interface EliminationBanner {
  id: number;
  victim: string;
  weapon: string;
  distanceM: number;
  headshot: boolean;
  totalKills: number;
}

export interface LootPrompt {
  id: string;
  label: string;
  sublabel: string;
  kind: 'loot' | 'vehicle' | 'airdrop' | 'deathbox';
}

export interface NearbyLootEntry {
  id: string;
  kind: string;
  label: string;
  sublabel: string;
  weaponId?: WeaponId;
  scopeType?: ScopeType;
  muzzleType?: MuzzleType;
  magType?: MagType;
  level?: 1 | 2 | 3;
}

export interface InventoryState {
  bandages: number;
  medkits: number;
  energyDrinks: number;
  painkillers: number;
  fragGrenades: number;
  smokeGrenades: number;
  backpackLevel: 1 | 2 | 3;
  spareScopes: ScopeType[];
  spareMuzzles: MuzzleType[];
  spareMags: MagType[];
  nearbyLoot: NearbyLootEntry[];
}

export interface HudSnapshot {
  playerMode: PlayerMode;
  altitudeM: number;
  fallSpeedKmh: number;
  vehicleSpeedKmh: number;
  vehicleHealth: number;
  vehicleName: string;
  health: number;
  maxHealth: number;
  boost: number;
  armorLevel: 0 | 1 | 2 | 3;
  armorDurability: number;
  helmetLevel: 0 | 1 | 2 | 3;
  helmetDurability: number;
  backpackLevel: 1 | 2 | 3;
  inventory: InventoryState;
  selectedThrowable: 'frag' | 'smoke';
  aliveCount: number;
  totalCount: number;
  kills: number;
  damageDealt: number;
  shotsFired: number;
  shotsHit: number;
  headshots: number;
  survivalTimeSec: number;
  placementRank: number;
  activeSlotIndex: 0 | 1;
  slots: [WeaponSlotState, WeaponSlotState | null];
  isReloading: boolean;
  reloadProgress: number;
  isHealing: boolean;
  healLabel: string;
  healProgress: number;
  isAds: boolean;
  rangefinderM: number;
  holdingBreath: boolean;
  breathPercent: number;
  isSprinting: boolean;
  stance: Stance;
  leanDir: -1 | 0 | 1;
  perspective: PerspectiveMode;
  headingDeg: number;
  safeZoneBearingDeg: number;
  outsideZone: boolean;
  zonePhase: number;
  zoneTimerSec: number;
  zoneShrinking: boolean;
  redZone: { active: boolean; x: number; z: number; radius: number };
  crosshairSpreadPx: number;
  hitMarkerKind: 'none' | 'body' | 'head' | 'kill';
  eliminationBanner: EliminationBanner | null;
  damageFlashAlpha: number;
  damageDirectionDeg: number | null;
  pointerLocked: boolean;
  lootPrompt: LootPrompt | null;
  killFeed: KillFeedItem[];
  fps: number;
  playerX: number;
  playerZ: number;
  safeZoneX: number;
  safeZoneZ: number;
  safeZoneRadius: number;
  blueZoneX: number;
  blueZoneZ: number;
  blueZoneRadius: number;
  airdropPos: { x: number; z: number; falling: boolean } | null;
  planePos: { x: number; z: number; active: boolean } | null;
  recentShots: Array<{ x: number; z: number; age: number }>;
  compounds: Array<{ name: string; x: number; z: number }>;
  vehicles: Array<{ x: number; z: number; occupied: boolean }>;
  worldRadius: number;
}
