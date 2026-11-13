import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  MAP_CONFIGS,
  SCOPE_SPECS,
  WEAPON_SPECS,
  type EliminationBanner,
  type GamePhase,
  type GameSettings,
  type HudSnapshot,
  type KillFeedItem,
  type MagType,
  type MapId,
  type MuzzleType,
  type NearbyLootEntry,
  type PlayerMode,
  type ScopeType,
  type Stance,
  type WeaponId,
  type WeaponSlotState,
} from '../types/game';
import { tacticalAudio } from './audio';
import {
  createCargoPlane,
  createCharacterRig,
  createDeathBox,
  createWeaponMesh,
  type CharacterRig,
  type ColliderBox,
} from './models';
import { createProceduralTextures, type MaterialTextureSet } from './textures';
import {
  buildMapWorld,
  createLootPickupMesh,
  PLAYABLE_RADIUS,
  type LootItem,
  type VehicleEntity,
  type WorldData,
} from './world';

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _v4 = new THREE.Vector3();
const _camForward = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _rayOrigin = new THREE.Vector3();
const _rayDir = new THREE.Vector3();

const BOT_CALLSIGNS = [
  'Viper_07', 'Kestrel', 'ShadowM4', 'GhillieGhost', 'MiramarAce', 'VikendiWolf',
  'RecoilKing', 'SniperDoc', 'PochinkiPro', 'CobaltSix', 'ApexNomad', 'ZeroPing',
  'BunkerFox', 'DeltaNine', 'FrostBite', 'Sandstorm', 'IronSight', 'Spectre84',
  'RedZone', 'CrateHunter', 'FlareDrop', 'TangoEcho', 'HawkEye', 'Vanguard',
  'Maverick', 'Overwatch', 'Kodiak', 'Phantom', 'RangerX', 'StormCaller', 'Blitz', 'Dusk',
];

interface BotActor {
  id: number;
  name: string;
  alive: boolean;
  x: number;
  y: number;
  z: number;
  yaw: number;
  health: number;
  armorLevel: 0 | 1 | 2 | 3;
  helmetLevel: 0 | 1 | 2 | 3;
  weaponId: WeaponId;
  rig: CharacterRig;
  fireCooldown: number;
  strafeDir: number;
  strafeTimer: number;
  wanderTargetX: number;
  wanderTargetZ: number;
  recoilKick: number;
}

interface ActiveGrenade {
  kind: 'frag' | 'smoke';
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  fuse: number;
}

interface ActiveSmokeCloud {
  group: THREE.Group;
  age: number;
  life: number;
}

interface TracerBolt {
  mesh: THREE.Mesh;
  start: THREE.Vector3;
  end: THREE.Vector3;
  age: number;
  life: number;
  active: boolean;
}

interface ImpactParticle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  age: number;
  life: number;
  active: boolean;
}

export class GameEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private maxAnisotropy: number;

  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private muzzleLight: THREE.PointLight;

  private mapId: MapId;
  private settings: GameSettings;
  private phase: GamePhase = 'title';
  private textures: MaterialTextureSet | null = null;
  private world: WorldData | null = null;

  // Cargo plane for match drop
  private planeGroup: THREE.Group;
  private planeProps: THREE.Mesh[] = [];
  private planeStart = new THREE.Vector3(-420, 155, -210);
  private planeEnd = new THREE.Vector3(420, 155, 210);
  private planeProgress = 0;
  private planeActive = false;

  // Player state
  private playerMode: PlayerMode = 'combat';
  private activeVehicle: VehicleEntity | null = null;
  private playerRig: CharacterRig;
  private fppWeaponAnchor: THREE.Group;
  private fppWeaponMesh: THREE.Group | null = null;
  private fppMuzzlePoint = new THREE.Object3D();

  private playerX = 0;
  private playerY = 2;
  private playerZ = 0;
  private playerVy = 0;
  private fallSpeed = 0;
  private onGround = true;
  private yaw = 0;
  private pitch = 0;
  private freeLookYawOffset = 0;
  private freeLookPitchOffset = 0;
  private recoilPitchOffset = 0;
  private recoilYawOffset = 0;
  private cameraShake = 0;
  private hitstopTimer = 0;
  private breathLeft = 100;
  private rangefinderM = 0;

  private stance: Stance = 'stand';
  private leanDir: -1 | 0 | 1 = 0;

  private health = 100;
  private maxHealth = 100;
  private boost = 0;
  private armorLevel: 0 | 1 | 2 | 3 = 1;
  private armorDurability = 100;
  private helmetLevel: 0 | 1 | 2 | 3 = 1;
  private helmetDurability = 100;
  private backpackLevel: 1 | 2 | 3 = 1;

  // Backpack & consumables
  private bandages = 3;
  private medkits = 1;
  private energyDrinks = 2;
  private painkillers = 1;
  private fragGrenades = 2;
  private smokeGrenades = 1;
  private selectedThrowable: 'frag' | 'smoke' = 'frag';
  private spareScopes: ScopeType[] = ['2x', '4x'];
  private spareMuzzles: MuzzleType[] = [];
  private spareMags: MagType[] = [];

  private slots: [WeaponSlotState, WeaponSlotState | null] = [
    {
      weaponId: 'm416',
      magAmmo: 30,
      reserveAmmo: 120,
      scope: 'reddot',
      muzzle: 'none',
      mag: 'standard',
      fireMode: 'auto',
    },
    {
      weaponId: 'ump45',
      magAmmo: 25,
      reserveAmmo: 90,
      scope: 'iron',
      muzzle: 'none',
      mag: 'standard',
      fireMode: 'auto',
    },
  ];
  private activeSlotIndex: 0 | 1 = 0;
  private fireTimer = 0;
  private isReloading = false;
  private reloadTimer = 0;
  private isHealing = false;
  private healLabel = '';
  private healTimer = 0;
  private healTotal = 2.0;
  private healAmount = 0;
  private healBoostAmount = 0;
  private footstepTimer = 0;
  private engineSoundTimer = 0;
  private weaponRecoilKick = 0;

  // Match stats & zones
  private kills = 0;
  private damageDealt = 0;
  private shotsFired = 0;
  private shotsHit = 0;
  private headshots = 0;
  private survivalTimeSec = 0;
  private placementRank = 1;
  private bots: BotActor[] = [];
  private deathBoxes: THREE.Group[] = [];
  private activeGrenades: ActiveGrenade[] = [];
  private smokeClouds: ActiveSmokeCloud[] = [];
  private killFeed: KillFeedItem[] = [];
  private nextKillId = 1;
  private eliminationBanner: EliminationBanner | null = null;
  private eliminationBannerTimer = 0;

  private safeZoneX = 0;
  private safeZoneZ = 0;
  private safeZoneRadius = 310;
  private blueZoneX = 0;
  private blueZoneZ = 0;
  private blueZoneRadius = PLAYABLE_RADIUS;
  private zonePhase = 1;
  private zoneTimerSec = 50;
  private zoneShrinking = false;
  private zoneTickDmgTimer = 0;

  // Red zone bombardment
  private redZone = { active: false, x: 0, z: 0, radius: 65 };
  private redZoneTimer = 34;
  private redZoneShellTimer = 0;

  // Input state
  private heldKeys = new Set<string>();
  private mouseLeftDown = false;
  private mouseRightDown = false;
  private pointerLocked = false;
  private isDraggingLook = false;
  private lastDragX = 0;
  private lastDragY = 0;
  private inventoryOpen = false;

  // Camera smoothing
  private camPos = new THREE.Vector3(0, 12, 24);
  private camTarget = new THREE.Vector3();
  private currentFov = 82;
  private titleAngle = 0;

  // VFX pools & HUD feedback
  private tracers: TracerBolt[] = [];
  private particles: ImpactParticle[] = [];
  private recentShots: Array<{ x: number; z: number; age: number }> = [];
  private hitMarkerKind: 'none' | 'body' | 'head' | 'kill' = 'none';
  private hitMarkerTimer = 0;
  private damageFlashAlpha = 0;
  private damageDirectionDeg: number | null = null;
  private muzzleLightTimer = 0;

  // Loop & callbacks
  private frameId = 0;
  private lastTimeMs = performance.now();
  private hudEmitTimer = 0;
  private fpsAccum = 0;
  private fpsFrames = 0;
  private currentFps = 60;
  private disposed = false;

  private onHudUpdate: (hud: HudSnapshot) => void;
  private onPhaseChange: (phase: GamePhase) => void;
  private onMapModalToggle: () => void;
  private onInventoryToggle: () => void;

  constructor(options: {
    container: HTMLElement;
    initialMap: MapId;
    initialSettings: GameSettings;
    onHudUpdate: (hud: HudSnapshot) => void;
    onPhaseChange: (phase: GamePhase) => void;
    onMapModalToggle: () => void;
    onInventoryToggle: () => void;
  }) {
    this.container = options.container;
    this.mapId = options.initialMap;
    this.settings = { ...options.initialSettings };
    this.onHudUpdate = options.onHudUpdate;
    this.onPhaseChange = options.onPhaseChange;
    this.onMapModalToggle = options.onMapModalToggle;
    this.onInventoryToggle = options.onInventoryToggle;

    this.isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && this.settings.antialiasing,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(
      this.container.clientWidth || window.innerWidth,
      this.container.clientHeight || window.innerHeight
    );
    this.maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(
      this.settings.fov,
      (this.container.clientWidth || window.innerWidth) /
        (this.container.clientHeight || window.innerHeight),
      0.12,
      1020
    );

    this.hemiLight = new THREE.HemisphereLight(0x98c1e8, 0x3b4a2b, 0.85);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff2d6, 2.6);
    this.sunLight.position.set(95, 145, 75);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.025;
    const sd = 95;
    this.sunLight.shadow.camera.left = -sd;
    this.sunLight.shadow.camera.right = sd;
    this.sunLight.shadow.camera.top = sd;
    this.sunLight.shadow.camera.bottom = -sd;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 340;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.muzzleLight = new THREE.PointLight(0xffaa44, 0, 14, 2);
    this.scene.add(this.muzzleLight);

    // C-130 Cargo Plane
    const plane = createCargoPlane();
    this.planeGroup = plane.group;
    this.planeProps = plane.props;
    this.planeGroup.visible = false;
    this.scene.add(this.planeGroup);

    // Player 3D rig
    this.playerRig = createCharacterRig({
      isPlayer: true,
      colorTint: 0x42543a,
      weaponId: 'm416',
    });
    this.scene.add(this.playerRig.root);

    this.fppWeaponAnchor = new THREE.Group();
    this.camera.add(this.fppWeaponAnchor);
    this.scene.add(this.camera);
    this.rebuildFppWeapon('m416', 'reddot', 'none');

    this.initPools();
    this.loadMap(this.mapId);
    this.applySettings(this.settings);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.startLoop();
  }

  private initPools() {
    const tracerGeo = new THREE.BoxGeometry(0.045, 0.045, 1);
    const tracerMat = new THREE.MeshBasicMaterial({ color: 0xffd275 });
    for (let i = 0; i < 40; i++) {
      const mesh = new THREE.Mesh(tracerGeo, tracerMat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.tracers.push({
        mesh,
        start: new THREE.Vector3(),
        end: new THREE.Vector3(),
        age: 0,
        life: 0.09,
        active: false,
      });
    }

    const pGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    for (let i = 0; i < 72; i++) {
      const pMat = new THREE.MeshBasicMaterial({ color: 0xd9c29c });
      const mesh = new THREE.Mesh(pGeo, pMat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        vel: new THREE.Vector3(),
        age: 0,
        life: 0.35,
        active: false,
      });
    }
  }

  private rebuildFppWeapon(weaponId: WeaponId, scope: ScopeType, muzzle: MuzzleType) {
    if (this.fppWeaponMesh) {
      this.fppWeaponAnchor.remove(this.fppWeaponMesh);
    }
    const built = createWeaponMesh(weaponId, scope, muzzle);
    this.fppWeaponMesh = built.group;
    this.fppWeaponMesh.position.set(0.24, -0.22, -0.45);
    this.fppWeaponAnchor.add(this.fppWeaponMesh);
    this.fppMuzzlePoint.position.copy(built.muzzle.position).add(this.fppWeaponMesh.position);
    this.fppWeaponAnchor.add(this.fppMuzzlePoint);
  }

  private syncActiveWeaponModels() {
    const slot = this.getActiveSlot();
    this.playerRig.setWeapon(slot.weaponId, slot.scope, slot.muzzle);
    this.rebuildFppWeapon(slot.weaponId, slot.scope, slot.muzzle);
  }

  public loadMap(mapId: MapId) {
    this.mapId = mapId;
    const cfg = MAP_CONFIGS[mapId];

    if (this.world) {
      this.scene.remove(this.world.root);
      this.world.dispose();
    }
    if (this.textures) {
      this.textures.dispose();
    }

    this.textures = createProceduralTextures(mapId, this.maxAnisotropy);
    this.world = buildMapWorld(mapId, this.textures);
    this.scene.add(this.world.root);

    this.scene.background = new THREE.Color(cfg.skyHorizon);
    this.updateAtmosphere();

    this.hemiLight.color.set(cfg.hemiSky);
    this.hemiLight.groundColor.set(cfg.hemiGround);
    this.hemiLight.intensity = cfg.hemiIntensity;
    this.sunLight.color.set(cfg.sunColor);
    this.sunLight.intensity = cfg.sunIntensity;

    // Position operator at dramatic compound overlook for the Title Lobby
    const lobbyX = 28;
    const lobbyZ = 24;
    const lobbyY = this.world.groundHeightAt(lobbyX, lobbyZ);
    this.playerX = lobbyX;
    this.playerY = lobbyY;
    this.playerZ = lobbyZ;
    this.playerRig.root.position.set(lobbyX, lobbyY, lobbyZ);
    this.playerRig.root.rotation.y = 0.6;
    this.playerRig.setWeapon('m416', '4x', 'suppressor');
    this.playerRig.setArmorVisuals(2, 2, 2);
  }

  private updateAtmosphere() {
    const cfg = MAP_CONFIGS[this.mapId];
    const densityScale =
      this.settings.drawDistance === 'near' ? 1.5 : this.settings.drawDistance === 'balanced' ? 1.1 : 0.82;
    this.scene.fog = new THREE.FogExp2(cfg.fogColor, cfg.fogDensity * densityScale);

    const farPlane =
      this.settings.drawDistance === 'near' ? 480 : this.settings.drawDistance === 'balanced' ? 760 : 1060;
    this.camera.far = farPlane;
    this.camera.updateProjectionMatrix();
  }

  public applySettings(next: GameSettings) {
    this.settings = { ...next };
    tacticalAudio.setConfig(next.masterVolume, next.muted);

    const baseDpr = this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2);
    const scale = this.isSoftwareGl ? 1 : next.resolutionScale;
    this.renderer.setPixelRatio(Math.min(2.25, baseDpr * scale));

    const enableShadows = !this.isSoftwareGl && next.shadowQuality !== 'off';
    this.renderer.shadowMap.enabled = enableShadows;
    this.sunLight.castShadow = enableShadows;
    const shadowRes = next.shadowQuality === 'high' ? 2048 : 1024;
    if (this.sunLight.shadow.mapSize.width !== shadowRes) {
      this.sunLight.shadow.mapSize.set(shadowRes, shadowRes);
      this.sunLight.shadow.map?.dispose();
      this.sunLight.shadow.map = null;
    }

    this.updateAtmosphere();
  }

  public setInventoryOpen(open: boolean) {
    this.inventoryOpen = open;
    if (open) {
      this.releasePointerLock();
      this.mouseLeftDown = false;
      this.mouseRightDown = false;
    } else if (this.phase === 'playing') {
      this.requestPointerLock();
    }
    this.emitHud();
  }

  public startMatch() {
    tacticalAudio.unlock();
    if (!this.world) return;

    this.inventoryOpen = false;
    this.activeVehicle = null;

    // Reset loot, vehicles, deathboxes, grenades, smokes
    for (const item of this.world.lootItems) {
      item.collected = false;
      item.mesh.visible = true;
    }
    for (const v of this.world.vehicles) {
      v.x = v.spawnX;
      v.z = v.spawnZ;
      v.y = this.world.groundHeightAt(v.x, v.z);
      v.yaw = v.spawnYaw;
      v.speed = 0;
      v.health = v.maxHealth;
      v.occupied = false;
      v.group.position.set(v.x, v.y, v.z);
      v.group.rotation.set(0, v.yaw, 0);
    }
    for (const db of this.deathBoxes) this.scene.remove(db);
    this.deathBoxes = [];
    for (const gr of this.activeGrenades) this.scene.remove(gr.mesh);
    this.activeGrenades = [];
    for (const sm of this.smokeClouds) this.scene.remove(sm.group);
    this.smokeClouds = [];

    // Reset airdrop falling from sky
    this.world.airdropLooted = false;
    this.world.airdropPos = { x: 45, y: 145, z: -45, falling: true };
    this.world.airdropGroup.position.set(45, 145, -45);

    // Clear previous bots
    for (const b of this.bots) this.scene.remove(b.rig.root);
    this.bots = [];

    // Reset player loadout
    this.health = 100;
    this.boost = 20;
    this.breathLeft = 100;
    this.rangefinderM = 0;
    this.armorLevel = 1;
    this.armorDurability = 100;
    this.helmetLevel = 1;
    this.helmetDurability = 100;
    this.backpackLevel = 1;
    this.bandages = 3;
    this.medkits = 1;
    this.energyDrinks = 2;
    this.painkillers = 1;
    this.fragGrenades = 2;
    this.smokeGrenades = 1;
    this.selectedThrowable = 'frag';
    this.spareScopes = ['2x', '4x'];
    this.spareMuzzles = [];
    this.spareMags = [];

    this.stance = 'stand';
    this.leanDir = 0;
    this.isReloading = false;
    this.reloadTimer = 0;
    this.isHealing = false;
    this.healTimer = 0;

    this.slots = [
      {
        weaponId: 'm416',
        magAmmo: 30,
        reserveAmmo: 150,
        scope: 'reddot',
        muzzle: 'none',
        mag: 'standard',
        fireMode: 'auto',
      },
      {
        weaponId: 'ump45',
        magAmmo: 25,
        reserveAmmo: 120,
        scope: 'iron',
        muzzle: 'none',
        mag: 'standard',
        fireMode: 'auto',
      },
    ];
    this.activeSlotIndex = 0;
    this.syncActiveWeaponModels();
    this.playerRig.setArmorVisuals(1, 1, 1);

    this.kills = 0;
    this.damageDealt = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.headshots = 0;
    this.survivalTimeSec = 0;
    this.placementRank = this.settings.enemyCount + 1;
    this.killFeed = [];
    this.recentShots = [];
    this.eliminationBanner = null;
    this.eliminationBannerTimer = 0;

    // Setup Safe Zone & Blue Zone for 460m-radius map
    this.safeZoneX = (Math.random() - 0.5) * 160;
    this.safeZoneZ = (Math.random() - 0.5) * 160;
    this.safeZoneRadius = 310;
    this.blueZoneX = 0;
    this.blueZoneZ = 0;
    this.blueZoneRadius = PLAYABLE_RADIUS;
    this.zonePhase = 1;
    this.zoneTimerSec = 50;
    this.zoneShrinking = false;

    this.redZone = { active: false, x: 0, z: 0, radius: 65 };
    this.redZoneTimer = 36;
    this.world.redZoneMesh.visible = false;

    // Plane flight path or direct drop
    if (this.settings.skipParachute) {
      const ang = Math.random() * Math.PI * 2;
      this.playerX = Math.cos(ang) * 195;
      this.playerZ = Math.sin(ang) * 195;
      this.playerY = this.world.groundHeightAt(this.playerX, this.playerZ);
      this.playerMode = 'combat';
      this.planeActive = false;
      this.planeGroup.visible = false;
      this.yaw = ang;
      this.pitch = -0.05;
    } else {
      const flightAng = Math.random() * Math.PI * 2;
      this.planeStart.set(Math.cos(flightAng) * -420, 155, Math.sin(flightAng) * -420);
      this.planeEnd.set(Math.cos(flightAng) * 420, 155, Math.sin(flightAng) * 420);
      this.planeProgress = 0.08;
      this.planeActive = true;
      this.planeGroup.visible = true;
      this.planeGroup.position.lerpVectors(this.planeStart, this.planeEnd, this.planeProgress);
      this.planeGroup.lookAt(this.planeEnd);
      this.playerMode = 'plane';
      this.playerX = this.planeGroup.position.x;
      this.playerY = this.planeGroup.position.y;
      this.playerZ = this.planeGroup.position.z;
      this.yaw = flightAng + Math.PI * 0.5;
      this.pitch = -0.45;
    }

    this.playerVy = 0;
    this.onGround = this.playerMode === 'combat';
    this.freeLookYawOffset = 0;
    this.freeLookPitchOffset = 0;
    this.recoilPitchOffset = 0;
    this.recoilYawOffset = 0;

    // Spawn AI bots evenly across the 8 compounds & countryside with ≥95m player separation
    const botWeapons: WeaponId[] = ['m416', 'akm', 'ump45', 's12k', 'kar98k'];
    const botTints = [0x4c463d, 0x3b444b, 0x5c4a3a, 0x3f4f3c, 0x4b3d42];
    const count = this.settings.enemyCount;
    const compounds = this.world.compounds;

    for (let i = 0; i < count; i++) {
      let bx = 0;
      let bz = 0;
      for (let tries = 0; tries < 36; tries++) {
        if (tries < 14 && compounds.length > 0 && i % 2 === 0) {
          const comp = compounds[(i + tries) % compounds.length];
          const ca = Math.random() * Math.PI * 2;
          const cr = 18 + Math.random() * 48;
          bx = comp.x + Math.cos(ca) * cr;
          bz = comp.z + Math.sin(ca) * cr;
        } else {
          const ba = Math.random() * Math.PI * 2;
          const br = 65 + Math.random() * (PLAYABLE_RADIUS - 95);
          bx = Math.cos(ba) * br;
          bz = Math.sin(ba) * br;
        }
        const distFromPlayer = Math.hypot(bx - this.playerX, bz - this.playerZ);
        const minSep = this.settings.skipParachute ? 95 : 55;
        if (distFromPlayer >= minSep && !this.pointInsideCollider(bx, bz, 0.7)) break;
      }
      const by = this.world.groundHeightAt(bx, bz);
      const wid = botWeapons[i % botWeapons.length];
      const rig = createCharacterRig({
        isPlayer: false,
        colorTint: botTints[i % botTints.length],
        weaponId: wid,
      });
      const armorLv = (i % 5 === 0 ? 2 : 1) as 1 | 2;
      const helmLv = (i % 4 === 0 ? 2 : 1) as 1 | 2;
      rig.setArmorVisuals(armorLv, helmLv, 1);
      rig.root.position.set(bx, by, bz);
      this.scene.add(rig.root);

      this.bots.push({
        id: i + 1,
        name: BOT_CALLSIGNS[i % BOT_CALLSIGNS.length],
        alive: true,
        x: bx,
        y: by,
        z: bz,
        yaw: Math.random() * Math.PI * 2,
        health: 100,
        armorLevel: armorLv,
        helmetLevel: helmLv,
        weaponId: wid,
        rig,
        fireCooldown: 1.2 + Math.random() * 1.8,
        strafeDir: Math.random() > 0.5 ? 1 : -1,
        strafeTimer: 1.5,
        wanderTargetX: bx + (Math.random() - 0.5) * 65,
        wanderTargetZ: bz + (Math.random() - 0.5) * 65,
        recoilKick: 0,
      });
    }

    this.phase = 'playing';
    this.onPhaseChange('playing');
    this.requestPointerLock();
    this.emitHud();
  }

  public jumpFromPlane() {
    if (this.playerMode !== 'plane') return;
    this.playerMode = 'skydive';
    this.playerVy = -14;
    this.onGround = false;
    this.emitHud();
  }

  public deployParachute() {
    if (this.playerMode !== 'skydive') return;
    this.playerMode = 'parachute';
    this.playerVy = Math.max(this.playerVy, -9);
    tacticalAudio.playParachuteOpen();
    this.emitHud();
  }

  public returnToTitle() {
    this.releasePointerLock();
    this.phase = 'title';
    this.inventoryOpen = false;
    this.planeGroup.visible = false;
    this.loadMap(this.mapId);
    this.onPhaseChange('title');
    this.heldKeys.clear();
    this.mouseLeftDown = false;
    this.mouseRightDown = false;
  }

  public setPaused(paused: boolean) {
    if (paused && this.phase === 'playing') {
      this.phase = 'paused';
      this.onPhaseChange('paused');
      this.heldKeys.clear();
      this.mouseLeftDown = false;
      this.mouseRightDown = false;
      this.releasePointerLock();
    } else if (!paused && this.phase === 'paused') {
      this.phase = 'playing';
      this.onPhaseChange('playing');
      if (!this.inventoryOpen) this.requestPointerLock();
    }
  }

  public togglePerspective() {
    this.settings.perspective = this.settings.perspective === 'TPP' ? 'FPP' : 'TPP';
    this.emitHud();
  }

  public useConsumable(kind: 'medkit' | 'bandage' | 'drink' | 'painkiller') {
    if (this.phase !== 'playing' || this.playerMode === 'plane' || this.playerMode === 'skydive') return;
    if (this.isHealing) return;

    if (kind === 'medkit' && this.medkits > 0 && this.health < 100) {
      this.medkits--;
      this.isHealing = true;
      this.healLabel = 'Applying First Aid Kit';
      this.healTotal = 2.4;
      this.healTimer = 2.4;
      this.healAmount = 75;
      this.healBoostAmount = 0;
    } else if (kind === 'bandage' && this.bandages > 0 && this.health < 75) {
      this.bandages--;
      this.isHealing = true;
      this.healLabel = 'Wrapping Bandage';
      this.healTotal = 1.4;
      this.healTimer = 1.4;
      this.healAmount = 18;
      this.healBoostAmount = 0;
    } else if (kind === 'drink' && this.energyDrinks > 0 && this.boost < 100) {
      this.energyDrinks--;
      this.isHealing = true;
      this.healLabel = 'Drinking Energy Drink';
      this.healTotal = 1.5;
      this.healTimer = 1.5;
      this.healAmount = 0;
      this.healBoostAmount = 40;
    } else if (kind === 'painkiller' && this.painkillers > 0 && this.boost < 100) {
      this.painkillers--;
      this.isHealing = true;
      this.healLabel = 'Taking Painkillers';
      this.healTotal = 1.8;
      this.healTimer = 1.8;
      this.healAmount = 0;
      this.healBoostAmount = 60;
    }
    this.emitHud();
  }

  public lootNearbyById(id: string) {
    if (!this.world) return;
    if (id === 'airdrop') {
      this.collectAirdrop();
      this.emitHud();
      return;
    }
    const item = this.world.lootItems.find((l) => l.id === id && !l.collected);
    if (item) {
      this.collectLoot(item);
      this.emitHud();
    }
  }

  public equipAttachment(
    slotIndex: 0 | 1,
    kind: 'scope' | 'muzzle' | 'mag',
    value: ScopeType | MuzzleType | MagType
  ) {
    const slot = this.slots[slotIndex];
    if (!slot) return;

    if (kind === 'scope') {
      const nextScope = value as ScopeType;
      if (slot.scope === nextScope) return;
      if (slot.scope !== 'iron') this.spareScopes.push(slot.scope);
      const idx = this.spareScopes.indexOf(nextScope);
      if (idx !== -1) this.spareScopes.splice(idx, 1);
      slot.scope = nextScope;
    } else if (kind === 'muzzle') {
      const nextMuzzle = value as MuzzleType;
      if (slot.muzzle === nextMuzzle) return;
      if (slot.muzzle !== 'none') this.spareMuzzles.push(slot.muzzle);
      const idx = this.spareMuzzles.indexOf(nextMuzzle);
      if (idx !== -1) this.spareMuzzles.splice(idx, 1);
      slot.muzzle = nextMuzzle;
    } else if (kind === 'mag') {
      const nextMag = value as MagType;
      if (slot.mag === nextMag) return;
      if (slot.mag !== 'standard') this.spareMags.push(slot.mag);
      const idx = this.spareMags.indexOf(nextMag);
      if (idx !== -1) this.spareMags.splice(idx, 1);
      slot.mag = nextMag;
    }

    tacticalAudio.playPickup();
    this.syncActiveWeaponModels();
    this.emitHud();
  }

  public throwGrenade(kind: 'frag' | 'smoke') {
    if (this.phase !== 'playing' || this.playerMode !== 'combat') return;
    if (kind === 'frag' && this.fragGrenades <= 0) return;
    if (kind === 'smoke' && this.smokeGrenades <= 0) return;

    if (kind === 'frag') this.fragGrenades--;
    else this.smokeGrenades--;

    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
    const startPos = new THREE.Vector3(this.playerX, this.playerY + 1.55, this.playerZ).addScaledVector(dir, 0.7);
    const vel = dir.multiplyScalar(22);
    vel.y += 5.5;

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 10, 10),
      new THREE.MeshStandardMaterial({
        color: kind === 'frag' ? 0x3f6212 : 0x9ca3af,
        roughness: 0.45,
        metalness: 0.4,
      })
    );
    mesh.position.copy(startPos);
    this.scene.add(mesh);

    this.activeGrenades.push({
      kind,
      mesh,
      pos: startPos,
      vel,
      fuse: kind === 'frag' ? 2.4 : 1.35,
    });
    tacticalAudio.playFireModeClick();
    this.emitHud();
  }

  public requestPointerLock() {
    if (this.phase !== 'playing' || this.inventoryOpen) return;
    const canvas = this.renderer.domElement;
    if (document.pointerLockElement !== canvas) {
      canvas.requestPointerLock?.();
    }
  }

  public releasePointerLock() {
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
  }

  private bindEvents() {
    const onResize = () => {
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (this.phase !== 'playing') return;
      const code = e.code;

      if (code === 'Tab') {
        e.preventDefault();
        this.onInventoryToggle();
        return;
      }

      if (this.inventoryOpen) return;

      const firstPress = !this.heldKeys.has(code);
      this.heldKeys.add(code);
      if (!firstPress) return;

      if (code === 'KeyF') {
        if (this.playerMode === 'plane') {
          this.jumpFromPlane();
        } else if (this.playerMode === 'skydive') {
          this.deployParachute();
        } else if (this.playerMode === 'driving') {
          this.exitVehicle();
        } else {
          this.tryInteract();
        }
        return;
      }

      if (code === 'KeyV') {
        this.togglePerspective();
        return;
      }
      if (code === 'KeyM') {
        this.onMapModalToggle();
        return;
      }
      if (code === 'KeyP') {
        this.setPaused(true);
        return;
      }

      if (this.playerMode !== 'combat') return;

      if (code === 'Space') {
        if (this.onGround) {
          this.playerVy = 6.9;
          this.onGround = false;
          if (this.stance === 'prone') this.stance = 'crouch';
          else this.stance = 'stand';
        }
      } else if (code === 'KeyC') {
        this.stance = this.stance === 'crouch' ? 'stand' : 'crouch';
      } else if (code === 'KeyZ') {
        this.stance = this.stance === 'prone' ? 'stand' : 'prone';
      } else if (code === 'KeyQ') {
        this.leanDir = this.leanDir === -1 ? 0 : -1;
      } else if (code === 'KeyE') {
        this.leanDir = this.leanDir === 1 ? 0 : 1;
      } else if (code === 'KeyB') {
        this.toggleFireMode();
      } else if (code === 'KeyT') {
        this.cycleActiveScope();
      } else if (code === 'KeyR') {
        this.beginReload();
      } else if (code === 'Digit1') {
        this.switchWeaponSlot(0);
      } else if (code === 'Digit2') {
        this.switchWeaponSlot(1);
      } else if (code === 'Digit4') {
        this.selectedThrowable = 'frag';
        this.emitHud();
      } else if (code === 'Digit5') {
        this.selectedThrowable = 'smoke';
        this.emitHud();
      } else if (code === 'KeyG') {
        this.throwGrenade(this.selectedThrowable);
      } else if (code === 'Digit7') {
        this.useConsumable('medkit');
      } else if (code === 'Digit8') {
        this.useConsumable('bandage');
      } else if (code === 'Digit9') {
        if (this.energyDrinks > 0) this.useConsumable('drink');
        else this.useConsumable('painkiller');
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      this.heldKeys.delete(e.code);
      if (e.code === 'AltLeft' || e.code === 'AltRight') {
        this.freeLookYawOffset = 0;
        this.freeLookPitchOffset = 0;
      }
    };

    const onBlur = () => {
      this.heldKeys.clear();
      this.mouseLeftDown = false;
      this.mouseRightDown = false;
      this.freeLookYawOffset = 0;
      this.freeLookPitchOffset = 0;
    };

    const onPointerLockChange = () => {
      this.pointerLocked = document.pointerLockElement === this.renderer.domElement;
      this.emitHud();
    };

    const onMouseMove = (e: MouseEvent) => {
      if (this.phase !== 'playing' || this.inventoryOpen) return;
      let dx = 0;
      let dy = 0;
      if (this.pointerLocked) {
        dx = e.movementX;
        dy = e.movementY;
      } else if (this.isDraggingLook) {
        dx = e.clientX - this.lastDragX;
        dy = e.clientY - this.lastDragY;
        this.lastDragX = e.clientX;
        this.lastDragY = e.clientY;
      } else {
        return;
      }

      const activeSlot = this.getActiveSlot();
      const scopeMult = this.mouseRightDown ? SCOPE_SPECS[activeSlot.scope].sensMult : 1.0;
      const adsMult = this.mouseRightDown ? this.settings.adsSensitivity : 1.0;
      const sens = 0.0022 * this.settings.mouseSensitivity * adsMult * scopeMult;
      const ySign = this.settings.invertY ? 1 : -1;

      if (this.heldKeys.has('AltLeft') || this.heldKeys.has('AltRight')) {
        this.freeLookYawOffset = THREE.MathUtils.clamp(this.freeLookYawOffset - dx * sens, -2.1, 2.1);
        this.freeLookPitchOffset = THREE.MathUtils.clamp(
          this.freeLookPitchOffset + dy * sens * ySign,
          -0.9,
          0.9
        );
      } else {
        this.yaw -= dx * sens;
        this.pitch = THREE.MathUtils.clamp(this.pitch + dy * sens * ySign, -1.28, 1.15);
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (this.phase !== 'playing' || this.inventoryOpen) return;
      if (e.target !== this.renderer.domElement) return;
      tacticalAudio.unlock();

      if (!this.pointerLocked) {
        this.requestPointerLock();
        this.isDraggingLook = true;
        this.lastDragX = e.clientX;
        this.lastDragY = e.clientY;
      }

      if (this.playerMode !== 'combat') return;

      if (e.button === 0) {
        this.mouseLeftDown = true;
        this.tryFirePlayer(true);
      } else if (e.button === 2) {
        this.mouseRightDown = true;
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      this.isDraggingLook = false;
      if (e.button === 0) this.mouseLeftDown = false;
      if (e.button === 2) this.mouseRightDown = false;
    };

    const onWheel = () => {
      if (this.phase !== 'playing' || this.inventoryOpen || this.playerMode !== 'combat') return;
      if (this.slots[1]) {
        this.switchWeaponSlot(this.activeSlotIndex === 0 ? 1 : 0);
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      if (e.target === this.renderer.domElement) e.preventDefault();
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('contextmenu', onContextMenu);

    this.cleanupListeners = () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('contextmenu', onContextMenu);
    };
  }

  private cleanupListeners: () => void = () => {};

  private getActiveSlot(): WeaponSlotState {
    return this.slots[this.activeSlotIndex] ?? this.slots[0];
  }

  private getSlotMagCapacity(slot: WeaponSlotState): number {
    const spec = WEAPON_SPECS[slot.weaponId];
    return slot.mag === 'extended' ? spec.extendedMagSize : spec.magSize;
  }

  private toggleFireMode() {
    const slot = this.getActiveSlot();
    const spec = WEAPON_SPECS[slot.weaponId];
    if (!spec.supportsAuto) return;
    slot.fireMode = slot.fireMode === 'auto' ? 'single' : 'auto';
    tacticalAudio.playFireModeClick();
    this.emitHud();
  }

  private cycleActiveScope() {
    const slot = this.getActiveSlot();
    const order: ScopeType[] = ['iron', 'reddot', '2x', '4x', '6x', '8x'];
    const available = order.filter((s) => s === 'iron' || s === slot.scope || this.spareScopes.includes(s));
    if (available.length <= 1) return;
    const idx = available.indexOf(slot.scope);
    const nextScope = available[(idx + 1) % available.length];
    this.equipAttachment(this.activeSlotIndex, 'scope', nextScope);
  }

  private switchWeaponSlot(idx: 0 | 1) {
    if (!this.slots[idx] || idx === this.activeSlotIndex) return;
    this.activeSlotIndex = idx;
    this.isReloading = false;
    this.reloadTimer = 0;
    this.syncActiveWeaponModels();
    tacticalAudio.playPickup();
    this.emitHud();
  }

  private beginReload() {
    const slot = this.getActiveSlot();
    const spec = WEAPON_SPECS[slot.weaponId];
    const cap = this.getSlotMagCapacity(slot);
    if (this.isReloading || slot.magAmmo >= cap || slot.reserveAmmo <= 0) return;
    this.isReloading = true;
    this.reloadTimer = slot.mag === 'extended' ? spec.reloadSec * 0.72 : spec.reloadSec;
    tacticalAudio.playReload();
  }

  private enterVehicle(veh: VehicleEntity) {
    this.activeVehicle = veh;
    veh.occupied = true;
    this.playerMode = 'driving';
    this.mouseRightDown = false;
    this.isReloading = false;
    this.isHealing = false;
    this.stance = 'stand';
    this.leanDir = 0;
    tacticalAudio.playPickup();
  }

  private exitVehicle() {
    if (!this.activeVehicle || !this.world) return;
    const veh = this.activeVehicle;
    veh.occupied = false;
    veh.speed *= 0.4;
    const exitX = veh.x - Math.cos(veh.yaw) * 2.2;
    const exitZ = veh.z + Math.sin(veh.yaw) * 2.2;
    this.playerX = exitX;
    this.playerZ = exitZ;
    this.playerY = this.world.groundHeightAt(exitX, exitZ);
    this.activeVehicle = null;
    this.playerMode = 'combat';
    this.onGround = true;
  }

  private collectAirdrop() {
    if (!this.world || this.world.airdropLooted || this.world.airdropPos.falling) return;
    this.world.airdropLooted = true;
    this.armorLevel = 3;
    this.armorDurability = 100;
    this.helmetLevel = 3;
    this.helmetDurability = 100;
    this.backpackLevel = 3;
    this.playerRig.setArmorVisuals(3, 3, 3);
    this.medkits += 2;
    this.painkillers += 2;
    this.fragGrenades += 2;
    this.slots[0] = {
      weaponId: 'kar98k',
      magAmmo: 8,
      reserveAmmo: 40,
      scope: '8x',
      muzzle: 'suppressor',
      mag: 'extended',
      fireMode: 'single',
    };
    this.activeSlotIndex = 0;
    this.syncActiveWeaponModels();
    tacticalAudio.playPickup();
  }

  private tryInteract() {
    if (!this.world) return;

    // 1. Nearby vehicle?
    const nearVeh = this.findNearestVehicle();
    if (nearVeh) {
      this.enterVehicle(nearVeh);
      return;
    }

    // 2. Airdrop?
    if (
      !this.world.airdropLooted &&
      !this.world.airdropPos.falling &&
      Math.hypot(this.playerX - this.world.airdropPos.x, this.playerZ - this.world.airdropPos.z) < 3.5
    ) {
      this.collectAirdrop();
      return;
    }

    // 3. Nearest loot
    const nearest = this.findNearestLoot();
    if (nearest) {
      this.collectLoot(nearest);
    }
  }

  private findNearestVehicle(): VehicleEntity | null {
    if (!this.world) return null;
    let best: VehicleEntity | null = null;
    let bestD = 3.8;
    for (const v of this.world.vehicles) {
      if (v.health <= 0) continue;
      const d = Math.hypot(this.playerX - v.x, this.playerZ - v.z);
      if (d < bestD) {
        bestD = d;
        best = v;
      }
    }
    return best;
  }

  private findNearestLoot(): LootItem | null {
    if (!this.world) return null;
    let best: LootItem | null = null;
    let bestD = 3.0;
    for (const item of this.world.lootItems) {
      if (item.collected) continue;
      const d = Math.hypot(this.playerX - item.x, this.playerZ - item.z);
      if (d < bestD) {
        bestD = d;
        best = item;
      }
    }
    return best;
  }

  private collectLoot(item: LootItem) {
    item.collected = true;
    item.mesh.visible = false;
    tacticalAudio.playPickup();

    if (item.kind === 'medkit') this.medkits += 1;
    else if (item.kind === 'bandage') this.bandages += 2;
    else if (item.kind === 'drink') this.energyDrinks += 1;
    else if (item.kind === 'painkiller') this.painkillers += 1;
    else if (item.kind === 'frag') this.fragGrenades += 1;
    else if (item.kind === 'smoke') this.smokeGrenades += 1;
    else if (item.kind === 'ammo') {
      const slot = this.getActiveSlot();
      const spec = WEAPON_SPECS[slot.weaponId];
      slot.reserveAmmo = Math.min(spec.reserveMax, slot.reserveAmmo + (item.amount ?? 45));
    } else if (item.kind === 'armor' && item.level && item.level >= this.armorLevel) {
      this.armorLevel = item.level;
      this.armorDurability = 100;
      this.playerRig.setArmorVisuals(this.armorLevel, this.helmetLevel, this.backpackLevel);
    } else if (item.kind === 'helmet' && item.level && item.level >= this.helmetLevel) {
      this.helmetLevel = item.level;
      this.helmetDurability = 100;
      this.playerRig.setArmorVisuals(this.armorLevel, this.helmetLevel, this.backpackLevel);
    } else if (item.kind === 'backpack' && item.level && item.level > this.backpackLevel) {
      this.backpackLevel = item.level;
      this.playerRig.setArmorVisuals(this.armorLevel, this.helmetLevel, this.backpackLevel);
    } else if (item.kind === 'scope' && item.scopeType) {
      const slot = this.getActiveSlot();
      if (slot.scope === 'iron') {
        slot.scope = item.scopeType;
        this.syncActiveWeaponModels();
      } else {
        this.spareScopes.push(item.scopeType);
      }
    } else if (item.kind === 'muzzle' && item.muzzleType) {
      const slot = this.getActiveSlot();
      if (slot.muzzle === 'none') {
        slot.muzzle = item.muzzleType;
        this.syncActiveWeaponModels();
      } else {
        this.spareMuzzles.push(item.muzzleType);
      }
    } else if (item.kind === 'mag' && item.magType) {
      const slot = this.getActiveSlot();
      if (slot.mag === 'standard') {
        slot.mag = item.magType;
      } else {
        this.spareMags.push(item.magType);
      }
    } else if (item.kind === 'weapon' && item.weaponId) {
      const spec = WEAPON_SPECS[item.weaponId];
      const prev = this.slots[this.activeSlotIndex];
      this.slots[this.activeSlotIndex] = {
        weaponId: item.weaponId,
        magAmmo: spec.magSize,
        reserveAmmo: Math.floor(spec.magSize * 3),
        scope: prev && prev.scope !== 'iron' ? prev.scope : spec.defaultScope,
        muzzle: prev ? prev.muzzle : 'none',
        mag: prev ? prev.mag : 'standard',
        fireMode: spec.supportsAuto ? 'auto' : 'single',
      };
      this.isReloading = false;
      this.syncActiveWeaponModels();
    }
  }

  private pointInsideCollider(x: number, z: number, radius: number): boolean {
    if (!this.world) return false;
    const footY = this.playerY + 0.3;
    const headY = this.playerY + 1.65;
    for (const c of this.world.colliders) {
      if (headY < c.minY || footY > c.maxY) continue;
      if (x + radius > c.minX && x - radius < c.maxX && z + radius > c.minZ && z - radius < c.maxZ) {
        return true;
      }
    }
    return false;
  }

  private moveWithCollision(x: number, z: number, dx: number, dz: number, radius: number): { x: number; z: number } {
    let nx = x + dx;
    let nz = z;
    if (this.pointInsideCollider(nx, nz, radius)) nx = x;
    nz = z + dz;
    if (this.pointInsideCollider(nx, nz, radius)) nz = z;
    const r = Math.hypot(nx, nz);
    if (r > PLAYABLE_RADIUS + 26) {
      const s = (PLAYABLE_RADIUS + 26) / r;
      nx *= s;
      nz *= s;
    }
    return { x: nx, z: nz };
  }

  private raycastWorldDistance(origin: THREE.Vector3, dir: THREE.Vector3, maxDist: number): { dist: number; point: THREE.Vector3 } {
    let closestDist = maxDist;
    if (this.world) {
      for (const box of this.world.colliders) {
        const d = this.intersectRayAabb(origin, dir, box, closestDist);
        if (d !== null && d < closestDist) closestDist = d;
      }
      const step = 3.5;
      for (let t = step; t < closestDist; t += step) {
        const px = origin.x + dir.x * t;
        const py = origin.y + dir.y * t;
        const pz = origin.z + dir.z * t;
        if (py <= this.world.groundHeightAt(px, pz)) {
          closestDist = Math.max(0.5, t - step * 0.5);
          break;
        }
      }
    }
    return { dist: closestDist, point: _v4.copy(origin).addScaledVector(dir, closestDist).clone() };
  }

  private intersectRayAabb(origin: THREE.Vector3, dir: THREE.Vector3, box: ColliderBox, maxDist: number): number | null {
    let tmin = 0;
    let tmax = maxDist;
    const invX = Math.abs(dir.x) > 1e-6 ? 1 / dir.x : 1e9;
    let t1 = (box.minX - origin.x) * invX;
    let t2 = (box.maxX - origin.x) * invX;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;

    const invY = Math.abs(dir.y) > 1e-6 ? 1 / dir.y : 1e9;
    t1 = (box.minY - origin.y) * invY;
    t2 = (box.maxY - origin.y) * invY;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;

    const invZ = Math.abs(dir.z) > 1e-6 ? 1 / dir.z : 1e9;
    t1 = (box.minZ - origin.z) * invZ;
    t2 = (box.maxZ - origin.z) * invZ;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;

    return tmin > 0 ? tmin : tmax > 0 ? tmax : null;
  }

  private tryFirePlayer(fromClick: boolean) {
    if (this.phase !== 'playing' || this.playerMode !== 'combat' || this.isReloading) return;
    const slot = this.getActiveSlot();
    const spec = WEAPON_SPECS[slot.weaponId];
    if (!fromClick && slot.fireMode !== 'auto') return;
    if (this.fireTimer > 0) return;

    if (slot.magAmmo <= 0) {
      this.beginReload();
      return;
    }

    if (this.isHealing) this.isHealing = false;

    slot.magAmmo -= 1;
    this.fireTimer = spec.fireRateMs / 1000;
    this.shotsFired += 1;
    this.weaponRecoilKick = 1.0;

    const suppressed = slot.muzzle === 'suppressor';
    tacticalAudio.playGunshot(spec.id, 0, suppressed);

    const muzzleWorld = _v1;
    if (this.settings.perspective === 'FPP') {
      this.fppMuzzlePoint.getWorldPosition(muzzleWorld);
    } else {
      this.playerRig.muzzlePoint.getWorldPosition(muzzleWorld);
    }

    if (!suppressed) {
      this.muzzleLight.position.copy(muzzleWorld);
      this.muzzleLight.intensity = 5.5;
      this.muzzleLightTimer = 0.045;
    }
    this.cameraShake = Math.min(
      0.4,
      this.cameraShake + (spec.id === 'kar98k' || spec.id === 's12k' ? 0.22 : 0.055)
    );

    const aimOrigin = _rayOrigin.copy(this.camera.position);
    const baseDir = _rayDir.set(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();

    const speed = Math.hypot(
      (this.heldKeys.has('KeyD') ? 1 : 0) - (this.heldKeys.has('KeyA') ? 1 : 0),
      (this.heldKeys.has('KeyS') ? 1 : 0) - (this.heldKeys.has('KeyW') ? 1 : 0)
    );
    const stanceSpreadMult = this.stance === 'prone' ? 0.5 : this.stance === 'crouch' ? 0.72 : 1.0;
    const scopeInfo = SCOPE_SPECS[slot.scope];
    const holdingBreath =
      this.mouseRightDown &&
      (this.heldKeys.has('ShiftLeft') || this.heldKeys.has('ShiftRight')) &&
      this.breathLeft > 2;
    const breathSpreadMult = holdingBreath ? 0.55 : 1.0;
    const spread =
      (this.mouseRightDown ? spec.adsSpread * scopeInfo.adsSpreadMult * breathSpreadMult : spec.baseSpread) *
        stanceSpreadMult +
      (speed > 0.1 ? spec.moveSpreadBonus * stanceSpreadMult : 0);

    let bestHitKind: 'none' | 'body' | 'head' | 'kill' = 'none';

    for (let p = 0; p < spec.pellets; p++) {
      const dir = _v2.copy(baseDir);
      dir.x += (Math.random() - 0.5) * 2 * spread;
      dir.y += (Math.random() - 0.5) * 2 * spread;
      dir.z += (Math.random() - 0.5) * 2 * spread;
      dir.normalize();

      const worldHit = this.raycastWorldDistance(aimOrigin, dir, spec.range);
      let hitDist = worldHit.dist;
      let hitBot: BotActor | null = null;
      let isHeadshot = false;
      let hitPoint = worldHit.point;

      for (const bot of this.bots) {
        if (!bot.alive) continue;
        const headCenter = _v3.set(bot.x, bot.y + 1.62, bot.z);
        const hd = this.intersectRaySphere(aimOrigin, dir, headCenter, 0.24);
        if (hd !== null && hd < hitDist && hd > 0.6) {
          hitDist = hd;
          hitBot = bot;
          isHeadshot = true;
          hitPoint = aimOrigin.clone().addScaledVector(dir, hd);
        } else {
          for (const cy of [1.18, 0.72]) {
            const bodyCenter = _v3.set(bot.x, bot.y + cy, bot.z);
            const bd = this.intersectRaySphere(aimOrigin, dir, bodyCenter, 0.39);
            if (bd !== null && bd < hitDist && bd > 0.6) {
              hitDist = bd;
              hitBot = bot;
              isHeadshot = false;
              hitPoint = aimOrigin.clone().addScaledVector(dir, bd);
              break;
            }
          }
        }
      }

      this.spawnTracer(muzzleWorld, hitPoint);

      if (hitBot) {
        this.shotsHit += 1;
        let dmg = spec.damage * (isHeadshot ? spec.headshotMult : 1.0);
        if (isHeadshot && hitBot.helmetLevel > 0) {
          dmg *= hitBot.helmetLevel === 3 ? 0.55 : hitBot.helmetLevel === 2 ? 0.68 : 0.8;
        } else if (!isHeadshot && hitBot.armorLevel > 0) {
          dmg *= hitBot.armorLevel === 3 ? 0.58 : hitBot.armorLevel === 2 ? 0.72 : 0.84;
        }
        dmg = Math.round(dmg);
        this.damageDealt += dmg;
        hitBot.health -= dmg;
        this.spawnImpactBurst(hitPoint, 0xdc2626, 6);
        if (isHeadshot) this.headshots += 1;

        if (hitBot.health <= 0 && hitBot.alive) {
          const distM = Math.round(Math.hypot(hitBot.x - this.playerX, hitBot.z - this.playerZ));
          this.eliminateBot(hitBot, 'YOU', spec.name, isHeadshot, true, distM);
          bestHitKind = 'kill';
          this.hitstopTimer = 0.038;
        } else if (bestHitKind !== 'kill') {
          bestHitKind = isHeadshot ? 'head' : 'body';
        }
      } else if (hitDist < spec.range - 1) {
        this.spawnImpactBurst(hitPoint, 0xd6c39f, 4);
      }
    }

    if (bestHitKind !== 'none') {
      this.hitMarkerKind = bestHitKind;
      this.hitMarkerTimer = bestHitKind === 'kill' ? 0.35 : 0.16;
      tacticalAudio.playHitmarker(bestHitKind);
    }

    const stanceRec = this.stance === 'prone' ? 0.55 : this.stance === 'crouch' ? 0.75 : 1.0;
    const muzzleRec = slot.muzzle === 'compensator' ? 0.72 : slot.muzzle === 'suppressor' ? 0.88 : 1.0;
    const adsRec = this.mouseRightDown ? 0.8 * scopeInfo.recoilMult * (holdingBreath ? 0.65 : 1.0) : 1.0;
    this.recoilPitchOffset += spec.recoilPitch * stanceRec * muzzleRec * adsRec;
    this.recoilYawOffset += (Math.random() - 0.5) * 2 * spec.recoilYaw * stanceRec * muzzleRec;

    if (slot.magAmmo === 0 && slot.reserveAmmo > 0) {
      this.beginReload();
    }
  }

  private intersectRaySphere(origin: THREE.Vector3, dir: THREE.Vector3, center: THREE.Vector3, radius: number): number | null {
    const ocX = origin.x - center.x;
    const ocY = origin.y - center.y;
    const ocZ = origin.z - center.z;
    const b = ocX * dir.x + ocY * dir.y + ocZ * dir.z;
    const c = ocX * ocX + ocY * ocY + ocZ * ocZ - radius * radius;
    const disc = b * b - c;
    if (disc < 0) return null;
    const t = -b - Math.sqrt(disc);
    return t > 0 ? t : null;
  }

  private spawnTracer(start: THREE.Vector3, end: THREE.Vector3) {
    const bolt = this.tracers.find((t) => !t.active);
    if (!bolt) return;
    bolt.active = true;
    bolt.age = 0;
    bolt.life = 0.085;
    bolt.start.copy(start);
    bolt.end.copy(end);
    const dist = start.distanceTo(end);
    const segLen = Math.min(18, Math.max(1.5, dist * 0.35));
    bolt.mesh.scale.set(1, 1, segLen);
    bolt.mesh.position.copy(start).lerp(end, 0.35);
    bolt.mesh.lookAt(end);
    bolt.mesh.visible = true;
  }

  private spawnImpactBurst(pos: THREE.Vector3, colorHex: number, count: number) {
    let spawned = 0;
    for (const p of this.particles) {
      if (p.active) continue;
      p.active = true;
      p.age = 0;
      p.life = 0.25 + Math.random() * 0.18;
      p.mesh.position.copy(pos);
      (p.mesh.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
      p.vel.set((Math.random() - 0.5) * 6, 1.5 + Math.random() * 4.5, (Math.random() - 0.5) * 6);
      p.mesh.scale.setScalar(1);
      p.mesh.visible = true;
      spawned++;
      if (spawned >= count) break;
    }
  }

  private eliminateBot(
    bot: BotActor,
    killerName: string,
    weaponName: string,
    headshot: boolean,
    byPlayer: boolean,
    distanceM = 0
  ) {
    bot.alive = false;
    bot.rig.root.visible = false;
    if (byPlayer) {
      this.kills += 1;
      this.eliminationBanner = {
        id: this.nextKillId,
        victim: bot.name,
        weapon: weaponName,
        distanceM,
        headshot,
        totalKills: this.kills,
      };
      this.eliminationBannerTimer = 3.2;
    }

    this.killFeed.unshift({
      id: this.nextKillId++,
      killer: killerName,
      victim: bot.name,
      weapon: weaponName,
      headshot,
      isPlayerInvolved: byPlayer,
      timestamp: performance.now(),
    });
    if (this.killFeed.length > 5) this.killFeed.pop();

    // Spawn classic PUBG Wooden Death Box + rich loot item
    if (this.world && this.textures) {
      const boxMesh = createDeathBox(this.textures);
      boxMesh.position.set(bot.x, bot.y, bot.z);
      this.scene.add(boxMesh);
      this.deathBoxes.push(boxMesh);

      const scopeDrops: ScopeType[] = ['4x', '2x', '6x', 'reddot'];
      const chosenScope = scopeDrops[bot.id % scopeDrops.length];
      const dropMesh = createLootPickupMesh('scope');
      dropMesh.position.set(bot.x + 0.6, bot.y, bot.z);
      this.world.root.add(dropMesh);
      this.world.lootItems.push({
        id: `deathbox_loot_${bot.id}_${Date.now()}`,
        kind: bot.id % 2 === 0 ? 'scope' : 'medkit',
        scopeType: bot.id % 2 === 0 ? chosenScope : undefined,
        label: bot.id % 2 === 0 ? `${chosenScope.toUpperCase()} Scope (Box)` : 'First Aid Kit (Box)',
        sublabel: `Looted from ${bot.name}`,
        x: bot.x + 0.6,
        y: bot.y,
        z: bot.z,
        collected: false,
        mesh: dropMesh,
      });
    }

    const aliveBots = this.bots.filter((b) => b.alive).length;
    if (aliveBots === 0 && this.phase === 'playing') {
      this.placementRank = 1;
      this.phase = 'victory';
      this.releasePointerLock();
      tacticalAudio.playVictory();
      this.onPhaseChange('victory');
      this.emitHud();
    }
  }

  private damagePlayer(rawDmg: number, attackerX: number, attackerZ: number, weaponName: string, killerName: string) {
    if (this.phase !== 'playing') return;
    let dmg = rawDmg;
    if (this.armorLevel > 0 && this.armorDurability > 0) {
      const mult = this.armorLevel === 3 ? 0.55 : this.armorLevel === 2 ? 0.7 : 0.82;
      this.armorDurability = Math.max(0, this.armorDurability - dmg * 0.45);
      dmg *= mult;
    }
    this.health = Math.max(0, this.health - dmg);
    this.damageFlashAlpha = 0.78;
    this.cameraShake = Math.min(0.48, this.cameraShake + 0.16);
    tacticalAudio.playPlayerHit();

    const angleToAttacker = Math.atan2(attackerX - this.playerX, -(attackerZ - this.playerZ));
    const relAngle = THREE.MathUtils.radToDeg(angleToAttacker + this.yaw);
    this.damageDirectionDeg = ((relAngle % 360) + 360) % 360;

    if (this.health <= 0) {
      const aliveBots = this.bots.filter((b) => b.alive).length;
      this.placementRank = aliveBots + 1;
      this.killFeed.unshift({
        id: this.nextKillId++,
        killer: killerName,
        victim: 'YOU',
        weapon: weaponName,
        headshot: false,
        isPlayerInvolved: true,
        timestamp: performance.now(),
      });
      this.phase = 'gameover';
      this.releasePointerLock();
      this.onPhaseChange('gameover');
      this.emitHud();
    }
  }

  private startLoop() {
    const tick = () => {
      if (this.disposed) return;

      const now = performance.now();
      const rawDt = (now - this.lastTimeMs) / 1000;
      this.lastTimeMs = now;
      const dt = Math.min(rawDt, 0.05);

      this.fpsAccum += rawDt;
      this.fpsFrames++;
      if (this.fpsAccum >= 0.5) {
        this.currentFps = Math.round(this.fpsFrames / this.fpsAccum);
        this.fpsAccum = 0;
        this.fpsFrames = 0;
      }

      if (this.hitstopTimer > 0) {
        this.hitstopTimer -= dt;
      } else {
        this.stepSimulation(dt);
      }

      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) this.afterDraw(tick);
      else this.frameId = requestAnimationFrame(tick);
    };

    if (this.isSoftwareGl) this.afterDraw(tick);
    else this.frameId = requestAnimationFrame(tick);
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private stepSimulation(dt: number) {
    if (!this.world) return;

    // Title Lobby: Cinematic hero showcase around armed operator & UAZ Jeep
    if (this.phase === 'title') {
      this.titleAngle += dt * 0.14;
      this.playerRig.root.visible = true;
      this.fppWeaponAnchor.visible = false;
      this.playerRig.animate(dt, 0, 'stand', 0, false, 0, false);

      const focusX = this.playerX - 1.5;
      const focusY = this.playerY + 1.35;
      const focusZ = this.playerZ;
      const orbitR = 7.5;
      const cx = focusX + Math.cos(this.titleAngle) * orbitR;
      const cz = focusZ + Math.sin(this.titleAngle) * orbitR;
      const cy = Math.max(this.world.groundHeightAt(cx, cz) + 1.2, focusY + 1.45);
      this.camera.position.set(cx, cy, cz);
      this.camera.lookAt(focusX, focusY, focusZ);
      this.updatePools(dt);
      return;
    }

    if (this.phase === 'paused' || this.phase === 'victory' || this.phase === 'gameover') {
      this.updatePools(dt);
      return;
    }

    this.survivalTimeSec += dt;

    // Arrow-key camera look fallback for smooth control without pointer lock
    const arrowYaw = (this.heldKeys.has('ArrowLeft') ? 1 : 0) - (this.heldKeys.has('ArrowRight') ? 1 : 0);
    const arrowPitch = (this.heldKeys.has('ArrowUp') ? 1 : 0) - (this.heldKeys.has('ArrowDown') ? 1 : 0);
    if (arrowYaw !== 0 || arrowPitch !== 0) {
      const scopeTurnMult = this.mouseRightDown ? SCOPE_SPECS[this.getActiveSlot().scope].sensMult : 1.0;
      const turnRate = 1.95 * this.settings.mouseSensitivity * scopeTurnMult;
      this.yaw += arrowYaw * turnRate * dt;
      this.pitch = THREE.MathUtils.clamp(
        this.pitch + arrowPitch * turnRate * 0.75 * dt * (this.settings.invertY ? -1 : 1),
        -1.28,
        1.15
      );
    }

    // Hold Breath stamina while ADS
    const wantsHoldBreath =
      this.playerMode === 'combat' &&
      this.mouseRightDown &&
      (this.heldKeys.has('ShiftLeft') || this.heldKeys.has('ShiftRight')) &&
      this.breathLeft > 1.5;
    if (wantsHoldBreath) {
      this.breathLeft = Math.max(0, this.breathLeft - 24 * dt);
    } else {
      this.breathLeft = Math.min(100, this.breathLeft + 22 * dt);
    }

    // Step C-130 Cargo Plane
    if (this.planeActive) {
      this.planeProgress += dt * 0.024;
      for (const prop of this.planeProps) prop.rotation.z += dt * 28;
      this.planeGroup.position.lerpVectors(this.planeStart, this.planeEnd, this.planeProgress);
      this.planeGroup.lookAt(this.planeEnd);

      if (this.playerMode === 'plane') {
        this.playerX = this.planeGroup.position.x;
        this.playerY = this.planeGroup.position.y;
        this.playerZ = this.planeGroup.position.z;
        if (this.planeProgress >= 0.88) {
          this.jumpFromPlane();
        }
      }
      if (this.planeProgress >= 1.05) {
        this.planeActive = false;
        this.planeGroup.visible = false;
      }
    }

    // Step Airdrop descent
    if (this.world.airdropPos.falling) {
      const groundAtDrop = this.world.groundHeightAt(this.world.airdropPos.x, this.world.airdropPos.z);
      this.world.airdropPos.y = Math.max(groundAtDrop, this.world.airdropPos.y - dt * 6.5);
      this.world.airdropGroup.position.y = this.world.airdropPos.y;
      if (this.world.airdropPos.y <= groundAtDrop + 0.05) {
        this.world.airdropPos.falling = false;
      }
    }

    // Boost passive health regen
    if (this.boost > 0) {
      this.boost = Math.max(0, this.boost - dt * 1.15);
      if (this.health < 100) {
        this.health = Math.min(100, this.health + dt * (this.boost > 60 ? 3.2 : 2.0));
      }
    }

    // Healing channel timer
    if (this.isHealing) {
      this.healTimer -= dt;
      if (this.healTimer <= 0) {
        this.isHealing = false;
        if (this.healAmount > 0) this.health = Math.min(100, this.health + this.healAmount);
        if (this.healBoostAmount > 0) this.boost = Math.min(100, this.boost + this.healBoostAmount);
        tacticalAudio.playPickup();
      }
    }

    // Reload timer
    if (this.isReloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        const slot = this.getActiveSlot();
        const cap = this.getSlotMagCapacity(slot);
        const needed = cap - slot.magAmmo;
        const load = Math.min(needed, slot.reserveAmmo);
        slot.magAmmo += load;
        slot.reserveAmmo -= load;
        this.isReloading = false;
      }
    }

    // Subtle sniper scope breathing sway when ADS without holding breath
    const activeScope = this.getActiveSlot().scope;
    const isScopedSway =
      this.playerMode === 'combat' &&
      this.mouseRightDown &&
      !wantsHoldBreath &&
      (activeScope === '4x' || activeScope === '6x' || activeScope === '8x');
    const swayAmp = activeScope === '8x' ? 0.0055 : activeScope === '6x' ? 0.004 : 0.0025;
    const swayYaw = isScopedSway ? Math.sin(this.survivalTimeSec * 1.7) * swayAmp : 0;
    const swayPitch = isScopedSway ? Math.cos(this.survivalTimeSec * 2.3) * swayAmp * 0.85 : 0;

    // Mode-specific movement & camera
    const effectiveYaw = this.yaw + this.freeLookYawOffset + this.recoilYawOffset + swayYaw;
    const effectivePitch = THREE.MathUtils.clamp(
      this.pitch + this.freeLookPitchOffset + this.recoilPitchOffset + swayPitch,
      -1.3,
      1.2
    );

    if (this.playerMode === 'plane') {
      this.playerRig.root.visible = false;
      this.fppWeaponAnchor.visible = false;
      const lookDirX = -Math.sin(effectiveYaw) * Math.cos(effectivePitch);
      const lookDirY = Math.sin(effectivePitch);
      const lookDirZ = -Math.cos(effectiveYaw) * Math.cos(effectivePitch);
      this.camera.position.set(
        this.playerX - lookDirX * 26,
        this.playerY - lookDirY * 26 + 5,
        this.playerZ - lookDirZ * 26
      );
      this.camera.lookAt(this.playerX, this.playerY, this.playerZ);
    } else if (this.playerMode === 'skydive' || this.playerMode === 'parachute') {
      const groundY = this.world.groundHeightAt(this.playerX, this.playerZ);
      const isChute = this.playerMode === 'parachute';

      const fIn = (this.heldKeys.has('KeyW') ? 1 : 0) - (this.heldKeys.has('KeyS') ? 1 : 0);
      const sIn = (this.heldKeys.has('KeyD') ? 1 : 0) - (this.heldKeys.has('KeyA') ? 1 : 0);
      const horizSpeed = isChute ? 15.5 : 18.0;

      _camForward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      _camRight.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
      const mx = (_camForward.x * fIn + _camRight.x * sIn) * horizSpeed * dt;
      const mz = (_camForward.z * fIn + _camRight.z * sIn) * horizSpeed * dt;
      this.playerX = THREE.MathUtils.clamp(this.playerX + mx, -PLAYABLE_RADIUS, PLAYABLE_RADIUS);
      this.playerZ = THREE.MathUtils.clamp(this.playerZ + mz, -PLAYABLE_RADIUS, PLAYABLE_RADIUS);

      const targetFall = isChute ? -8.2 : fIn > 0 && this.pitch < -0.5 ? -36 : -24;
      this.playerVy = THREE.MathUtils.damp(this.playerVy, targetFall, isChute ? 5 : 2.5, dt);
      this.playerY += this.playerVy * dt;
      this.fallSpeed = Math.abs(this.playerVy) * 3.6;

      if (!isChute && this.playerY - groundY <= 30) {
        this.deployParachute();
      }
      if (this.playerY <= groundY) {
        this.playerY = groundY;
        this.playerVy = 0;
        this.playerMode = 'combat';
        this.onGround = true;
      }

      this.playerRig.root.visible = true;
      this.fppWeaponAnchor.visible = false;
      this.playerRig.root.position.set(this.playerX, this.playerY, this.playerZ);
      this.playerRig.root.rotation.y = this.yaw;
      this.playerRig.animate(dt, 0.3, 'stand', 0, false, 0, isChute);

      const lookDirX = -Math.sin(effectiveYaw) * Math.cos(effectivePitch);
      const lookDirY = Math.sin(effectivePitch);
      const lookDirZ = -Math.cos(effectiveYaw) * Math.cos(effectivePitch);
      const camBack = isChute ? 7.5 : 5.2;
      this.camera.position.set(
        this.playerX - lookDirX * camBack,
        this.playerY + 2.2 - lookDirY * camBack,
        this.playerZ - lookDirZ * camBack
      );
      this.camera.lookAt(this.playerX, this.playerY + 1.4, this.playerZ);
    } else if (this.playerMode === 'driving' && this.activeVehicle) {
      const veh = this.activeVehicle;
      const throttle = (this.heldKeys.has('KeyW') ? 1 : 0) - (this.heldKeys.has('KeyS') ? 1 : 0);
      const steer = (this.heldKeys.has('KeyA') ? 1 : 0) - (this.heldKeys.has('KeyD') ? 1 : 0);
      const boostOn = this.heldKeys.has('ShiftLeft') || this.heldKeys.has('ShiftRight');
      const brake = this.heldKeys.has('Space');

      const maxSpeed = (veh.variant === 'buggy' ? 28 : 24) * (boostOn ? 1.25 : 1.0);
      if (brake) {
        veh.speed = THREE.MathUtils.damp(veh.speed, 0, 7, dt);
      } else if (throttle !== 0) {
        veh.speed = THREE.MathUtils.clamp(
          veh.speed + throttle * (boostOn ? 24 : 17) * dt,
          -10,
          maxSpeed
        );
      } else {
        veh.speed = THREE.MathUtils.damp(veh.speed, 0, 2.2, dt);
      }

      if (Math.abs(veh.speed) > 0.4) {
        const steerRate = (veh.variant === 'buggy' ? 2.2 : 1.8) * Math.sign(veh.speed);
        veh.yaw += steer * steerRate * dt;
      }

      const vx = -Math.sin(veh.yaw) * veh.speed * dt;
      const vz = -Math.cos(veh.yaw) * veh.speed * dt;
      const moved = this.moveWithCollision(veh.x, veh.z, vx, vz, 1.35);
      if (Math.hypot(moved.x - veh.x, moved.z - veh.z) < Math.hypot(vx, vz) * 0.25) {
        veh.speed *= 0.35;
      }
      veh.x = moved.x;
      veh.z = moved.z;
      veh.y = this.world.groundHeightAt(veh.x, veh.z);

      // Terrain pitch alignment
      const frontH = this.world.groundHeightAt(veh.x - Math.sin(veh.yaw) * 1.5, veh.z - Math.cos(veh.yaw) * 1.5);
      const rearH = this.world.groundHeightAt(veh.x + Math.sin(veh.yaw) * 1.5, veh.z + Math.cos(veh.yaw) * 1.5);
      const pitchSlope = Math.atan2(frontH - rearH, 3.0);

      veh.group.position.set(veh.x, veh.y, veh.z);
      veh.group.rotation.set(pitchSlope, veh.yaw, 0);
      for (const fw of veh.frontWheels) fw.rotation.y = steer * 0.4;
      for (const aw of veh.allWheels) aw.rotation.x -= veh.speed * dt * 1.6;

      this.playerX = veh.x;
      this.playerY = veh.y;
      this.playerZ = veh.z;

      // Vehicle engine audio pulse
      this.engineSoundTimer -= dt;
      if (this.engineSoundTimer <= 0 && Math.abs(veh.speed) > 0.8) {
        this.engineSoundTimer = 0.11;
        tacticalAudio.playEnginePulse(Math.abs(veh.speed) / 26);
      }

      // Roadkill collision check against bots
      if (Math.abs(veh.speed) > 8) {
        for (const bot of this.bots) {
          if (!bot.alive) continue;
          if (Math.hypot(bot.x - veh.x, bot.z - veh.z) < 2.2) {
            this.eliminateBot(bot, 'YOU', veh.name, false, true, 1);
            this.hitMarkerKind = 'kill';
            this.hitMarkerTimer = 0.35;
            tacticalAudio.playHitmarker('kill');
          }
        }
      }

      this.playerRig.root.visible = false;
      this.fppWeaponAnchor.visible = false;

      const lookDirX = -Math.sin(effectiveYaw) * Math.cos(effectivePitch);
      const lookDirY = Math.sin(effectivePitch);
      const lookDirZ = -Math.cos(effectiveYaw) * Math.cos(effectivePitch);
      const back = 7.4;
      const desiredX = veh.x - lookDirX * back;
      const desiredY = Math.max(
        this.world.groundHeightAt(desiredX, veh.z - lookDirZ * back) + 0.8,
        veh.y + 2.6 - lookDirY * back
      );
      const desiredZ = veh.z - lookDirZ * back;
      this.camPos.x = THREE.MathUtils.damp(this.camPos.x, desiredX, 16, dt);
      this.camPos.y = THREE.MathUtils.damp(this.camPos.y, desiredY, 16, dt);
      this.camPos.z = THREE.MathUtils.damp(this.camPos.z, desiredZ, 16, dt);
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(veh.x, veh.y + 1.35, veh.z);
    } else {
      // Combat On-Foot Movement
      if (this.fireTimer > 0) this.fireTimer -= dt;
      if (this.mouseLeftDown) this.tryFirePlayer(false);

      const forwardInput = (this.heldKeys.has('KeyW') ? 1 : 0) - (this.heldKeys.has('KeyS') ? 1 : 0);
      const strafeInput = (this.heldKeys.has('KeyD') ? 1 : 0) - (this.heldKeys.has('KeyA') ? 1 : 0);
      const isMoving = forwardInput !== 0 || strafeInput !== 0;
      const isSprinting =
        isMoving &&
        forwardInput > 0 &&
        (this.heldKeys.has('ShiftLeft') || this.heldKeys.has('ShiftRight')) &&
        !this.mouseRightDown &&
        this.stance === 'stand';

      if (isSprinting && this.isHealing) this.isHealing = false;

      const baseSpeed = isSprinting
        ? 8.8
        : this.stance === 'prone'
        ? 2.1
        : this.stance === 'crouch'
        ? 3.7
        : this.mouseRightDown
        ? 4.2
        : 6.2;
      const moveSpeed = baseSpeed * (this.boost > 40 ? 1.08 : 1.0);

      _camForward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      _camRight.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

      let moveX = _camForward.x * forwardInput + _camRight.x * strafeInput;
      let moveZ = _camForward.z * forwardInput + _camRight.z * strafeInput;
      const len = Math.hypot(moveX, moveZ);
      if (len > 0.001) {
        moveX = (moveX / len) * moveSpeed * dt;
        moveZ = (moveZ / len) * moveSpeed * dt;
        const moved = this.moveWithCollision(this.playerX, this.playerZ, moveX, moveZ, 0.45);
        this.playerX = moved.x;
        this.playerZ = moved.z;
      }

      const groundY = this.world.groundHeightAt(this.playerX, this.playerZ);
      this.playerVy -= 20.5 * dt;
      this.playerY += this.playerVy * dt;
      if (this.playerY <= groundY) {
        this.playerY = groundY;
        this.playerVy = 0;
        this.onGround = true;
      }

      if (isMoving && this.onGround && this.stance !== 'prone') {
        this.footstepTimer -= dt;
        if (this.footstepTimer <= 0) {
          tacticalAudio.playFootstep(isSprinting);
          this.footstepTimer = isSprinting ? 0.29 : 0.44;
        }
      }

      // Auto-loot supplies
      if (this.settings.autoLoot) {
        for (const item of this.world.lootItems) {
          if (item.collected || item.kind === 'weapon' || item.kind === 'scope' || item.kind === 'muzzle') continue;
          const d = Math.hypot(this.playerX - item.x, this.playerZ - item.z);
          if (d < 1.85) {
            if (item.kind === 'armor' && item.level && item.level <= this.armorLevel) continue;
            if (item.kind === 'helmet' && item.level && item.level <= this.helmetLevel) continue;
            if (item.kind === 'backpack' && item.level && item.level <= this.backpackLevel) continue;
            this.collectLoot(item);
          }
        }
      }

      this.playerRig.root.position.set(this.playerX, this.playerY, this.playerZ);
      this.playerRig.root.rotation.y = this.yaw;
      this.playerRig.animate(
        dt,
        isMoving ? (isSprinting ? 1.0 : 0.65) : 0,
        this.stance,
        this.leanDir,
        this.mouseRightDown,
        this.weaponRecoilKick,
        false
      );

      // Camera positioning (TPP / FPP / Scoped)
      const slot = this.getActiveSlot();
      const scopeSpec = SCOPE_SPECS[slot.scope];
      const isMagnifiedScope = this.mouseRightDown && (slot.scope === '4x' || slot.scope === '6x' || slot.scope === '8x');
      const isRedDot = this.mouseRightDown && (slot.scope === 'reddot' || slot.scope === '2x');

      const eyeHeight = this.stance === 'prone' ? 0.52 : this.stance === 'crouch' ? 1.15 : 1.58;
      const leanOffset = this.leanDir * 0.42;
      const rightX = Math.cos(this.yaw);
      const rightZ = -Math.sin(this.yaw);

      const targetFov = this.mouseRightDown
        ? scopeSpec.fov
        : isSprinting
        ? this.settings.fov + 5
        : this.settings.fov;
      this.currentFov = THREE.MathUtils.damp(this.currentFov, targetFov, 15, dt);
      if (Math.abs(this.camera.fov - this.currentFov) > 0.05) {
        this.camera.fov = this.currentFov;
        this.camera.updateProjectionMatrix();
      }

      const shakeX = (Math.random() - 0.5) * this.cameraShake * 0.16;
      const shakeY = (Math.random() - 0.5) * this.cameraShake * 0.16;

      if (this.settings.perspective === 'FPP' || isMagnifiedScope || isRedDot) {
        this.playerRig.root.visible = false;
        this.fppWeaponAnchor.visible = !isMagnifiedScope;
        this.camera.position.set(
          this.playerX + rightX * leanOffset + shakeX,
          this.playerY + eyeHeight + shakeY,
          this.playerZ + rightZ * leanOffset
        );
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = effectiveYaw;
        this.camera.rotation.x = effectivePitch;
        this.camera.rotation.z = -this.leanDir * 0.08;

        if (this.fppWeaponMesh) {
          const adsX = this.mouseRightDown ? 0.0 : 0.24;
          const adsY = this.mouseRightDown ? -0.14 : -0.22;
          const adsZ = this.mouseRightDown ? -0.34 : -0.45;
          const bob = isMoving ? Math.sin(this.survivalTimeSec * (isSprinting ? 13 : 9)) * 0.012 : 0;
          this.fppWeaponMesh.position.x = THREE.MathUtils.damp(this.fppWeaponMesh.position.x, adsX, 16, dt);
          this.fppWeaponMesh.position.y = THREE.MathUtils.damp(this.fppWeaponMesh.position.y, adsY + bob, 16, dt);
          this.fppWeaponMesh.position.z = THREE.MathUtils.damp(
            this.fppWeaponMesh.position.z,
            adsZ + this.weaponRecoilKick * 0.07,
            20,
            dt
          );
          this.fppWeaponMesh.rotation.x = this.weaponRecoilKick * 0.14;
        }
      } else {
        this.playerRig.root.visible = true;
        this.fppWeaponAnchor.visible = false;

        const shoulderDist = (this.mouseRightDown ? 0.52 : 0.65) + leanOffset;
        const backDist = this.mouseRightDown ? 1.85 : 3.55;
        const lookDirX = -Math.sin(effectiveYaw) * Math.cos(effectivePitch);
        const lookDirY = Math.sin(effectivePitch);
        const lookDirZ = -Math.cos(effectiveYaw) * Math.cos(effectivePitch);

        const anchorX = this.playerX + rightX * shoulderDist;
        const anchorY = this.playerY + eyeHeight + 0.14;
        const anchorZ = this.playerZ + rightZ * shoulderDist;

        _v1.set(anchorX, anchorY, anchorZ);
        _v2.set(-lookDirX, -lookDirY, -lookDirZ).normalize();
        const camCheck = this.raycastWorldDistance(_v1, _v2, backDist);
        const safeDist = Math.max(0.75, camCheck.dist - 0.35);

        const desiredX = anchorX - lookDirX * safeDist + shakeX;
        const desiredY = Math.max(
          this.world.groundHeightAt(anchorX - lookDirX * safeDist, anchorZ - lookDirZ * safeDist) + 0.45,
          anchorY - lookDirY * safeDist + shakeY
        );
        const desiredZ = anchorZ - lookDirZ * safeDist;

        this.camPos.x = THREE.MathUtils.damp(this.camPos.x, desiredX, 24, dt);
        this.camPos.y = THREE.MathUtils.damp(this.camPos.y, desiredY, 24, dt);
        this.camPos.z = THREE.MathUtils.damp(this.camPos.z, desiredZ, 24, dt);

        this.camera.position.copy(this.camPos);
        this.camTarget.set(anchorX + lookDirX * 28, anchorY + lookDirY * 28, anchorZ + lookDirZ * 28);
        this.camera.lookAt(this.camTarget);
      }
    }

    // Recoil & feedback decay
    this.recoilPitchOffset = THREE.MathUtils.damp(this.recoilPitchOffset, 0, 10, dt);
    this.recoilYawOffset = THREE.MathUtils.damp(this.recoilYawOffset, 0, 10, dt);
    this.weaponRecoilKick = THREE.MathUtils.damp(this.weaponRecoilKick, 0, 18, dt);
    this.cameraShake = THREE.MathUtils.damp(this.cameraShake, 0, 14, dt);
    this.damageFlashAlpha = THREE.MathUtils.damp(this.damageFlashAlpha, 0, 6, dt);
    if (this.hitMarkerTimer > 0) {
      this.hitMarkerTimer -= dt;
      if (this.hitMarkerTimer <= 0) this.hitMarkerKind = 'none';
    }
    if (this.eliminationBannerTimer > 0) {
      this.eliminationBannerTimer -= dt;
      if (this.eliminationBannerTimer <= 0) this.eliminationBanner = null;
    }
    if (this.muzzleLightTimer > 0) {
      this.muzzleLightTimer -= dt;
      if (this.muzzleLightTimer <= 0) this.muzzleLight.intensity = 0;
    }

    this.sunLight.position.set(this.playerX + 70, this.playerY + 110, this.playerZ + 55);
    this.sunLight.target.position.set(this.playerX, this.playerY, this.playerZ);

    this.stepBlueZone(dt);
    this.stepRedZone(dt);
    this.stepGrenadesAndSmokes(dt);
    this.stepBots(dt);
    this.updatePools(dt);

    for (const item of this.world.lootItems) {
      if (!item.collected) item.mesh.rotation.y += dt * 1.4;
    }

    this.hudEmitTimer += dt;
    if (this.hudEmitTimer >= 0.05) {
      this.hudEmitTimer = 0;
      this.emitHud();
    }
  }

  private stepGrenadesAndSmokes(dt: number) {
    if (!this.world) return;
    for (let i = this.activeGrenades.length - 1; i >= 0; i--) {
      const g = this.activeGrenades[i];
      g.fuse -= dt;
      g.vel.y -= 18 * dt;
      g.pos.addScaledVector(g.vel, dt);

      const gy = this.world.groundHeightAt(g.pos.x, g.pos.z) + 0.14;
      if (g.pos.y <= gy) {
        g.pos.y = gy;
        g.vel.y = Math.abs(g.vel.y) * 0.42;
        g.vel.x *= 0.65;
        g.vel.z *= 0.65;
      }
      g.mesh.position.copy(g.pos);

      if (g.fuse <= 0) {
        this.scene.remove(g.mesh);
        this.activeGrenades.splice(i, 1);

        if (g.kind === 'frag') {
          this.triggerExplosion(g.pos.x, g.pos.y, g.pos.z, 10.5, 115, 'Frag Grenade');
        } else {
          tacticalAudio.playSmokeHiss();
          const smGroup = new THREE.Group();
          smGroup.position.copy(g.pos);
          const smMat = new THREE.MeshStandardMaterial({
            color: 0xd4d4d8,
            transparent: true,
            opacity: 0.72,
            roughness: 1.0,
            depthWrite: false,
          });
          for (let s = 0; s < 7; s++) {
            const puff = new THREE.Mesh(new THREE.SphereGeometry(2.2 + Math.random() * 1.4, 10, 10), smMat);
            puff.position.set((Math.random() - 0.5) * 4.2, 1.2 + Math.random() * 1.8, (Math.random() - 0.5) * 4.2);
            smGroup.add(puff);
          }
          this.scene.add(smGroup);
          this.smokeClouds.push({ group: smGroup, age: 0, life: 13 });
        }
      }
    }

    for (let i = this.smokeClouds.length - 1; i >= 0; i--) {
      const sm = this.smokeClouds[i];
      sm.age += dt;
      const scale = Math.min(1.3, 0.5 + sm.age * 0.45);
      sm.group.scale.setScalar(scale);
      sm.group.rotation.y += dt * 0.25;
      if (sm.age >= sm.life) {
        this.scene.remove(sm.group);
        this.smokeClouds.splice(i, 1);
      }
    }
  }

  private triggerExplosion(x: number, y: number, z: number, radius: number, maxDmg: number, weaponLabel: string) {
    const distToPlayer = Math.hypot(x - this.playerX, z - this.playerZ);
    tacticalAudio.playExplosion(distToPlayer);
    this.spawnImpactBurst(new THREE.Vector3(x, y + 0.5, z), 0xf97316, 18);
    if (distToPlayer < 45) {
      this.cameraShake = Math.min(0.65, this.cameraShake + (1 - distToPlayer / 45) * 0.45);
    }

    if (distToPlayer < radius && this.playerMode !== 'plane' && this.playerMode !== 'skydive') {
      const dmg = maxDmg * (1 - distToPlayer / radius);
      this.damagePlayer(dmg, x, z, weaponLabel, weaponLabel);
    }

    let killedAny = false;
    for (const bot of this.bots) {
      if (!bot.alive) continue;
      const bd = Math.hypot(bot.x - x, bot.z - z);
      if (bd < radius) {
        const dmg = Math.round(maxDmg * (1 - bd / radius));
        bot.health -= dmg;
        this.damageDealt += dmg;
        if (bot.health <= 0) {
          this.eliminateBot(bot, 'YOU', weaponLabel, false, true, Math.round(distToPlayer));
          killedAny = true;
        }
      }
    }
    if (killedAny) {
      this.hitMarkerKind = 'kill';
      this.hitMarkerTimer = 0.35;
      tacticalAudio.playHitmarker('kill');
    }
  }

  private stepRedZone(dt: number) {
    if (!this.world) return;
    this.redZoneTimer -= dt;
    if (!this.redZone.active && this.redZoneTimer <= 0) {
      this.redZone.active = true;
      this.redZone.x = (Math.random() - 0.5) * 280;
      this.redZone.z = (Math.random() - 0.5) * 280;
      this.redZone.radius = 65;
      this.redZoneTimer = 18;
      this.redZoneShellTimer = 1.6;
      this.world.redZoneMesh.visible = true;
      this.world.redZoneMesh.position.set(this.redZone.x, 42, this.redZone.z);
      this.world.redZoneMesh.scale.set(this.redZone.radius, 1, this.redZone.radius);
    } else if (this.redZone.active) {
      this.redZoneShellTimer -= dt;
      if (this.redZoneShellTimer <= 0) {
        this.redZoneShellTimer = 1.2 + Math.random() * 1.1;
        const ang = Math.random() * Math.PI * 2;
        const r = Math.random() * this.redZone.radius;
        const sx = this.redZone.x + Math.cos(ang) * r;
        const sz = this.redZone.z + Math.sin(ang) * r;
        const sy = this.world.groundHeightAt(sx, sz);
        this.triggerExplosion(sx, sy, sz, 11, 85, 'Red Zone Artillery');
      }
      if (this.redZoneTimer <= 0) {
        this.redZone.active = false;
        this.redZoneTimer = 40;
        this.world.redZoneMesh.visible = false;
      }
    }
  }

  private stepBlueZone(dt: number) {
    if (!this.world) return;
    this.zoneTimerSec -= dt;
    if (!this.zoneShrinking && this.zoneTimerSec <= 0) {
      this.zoneShrinking = true;
      this.zoneTimerSec = 32;
    } else if (this.zoneShrinking) {
      const shrinkSpeed = Math.max(
        3.2,
        (this.blueZoneRadius - this.safeZoneRadius) / Math.max(1, this.zoneTimerSec)
      );
      this.blueZoneRadius = Math.max(this.safeZoneRadius, this.blueZoneRadius - shrinkSpeed * dt);
      this.blueZoneX = THREE.MathUtils.lerp(this.blueZoneX, this.safeZoneX, dt * 0.15);
      this.blueZoneZ = THREE.MathUtils.lerp(this.blueZoneZ, this.safeZoneZ, dt * 0.15);

      if (this.zoneTimerSec <= 0 || Math.abs(this.blueZoneRadius - this.safeZoneRadius) < 0.5) {
        this.zoneShrinking = false;
        this.zonePhase = Math.min(6, this.zonePhase + 1);
        this.zoneTimerSec = 36;
        this.safeZoneRadius = Math.max(20, this.safeZoneRadius * 0.56);
        this.safeZoneX += (Math.random() - 0.5) * this.safeZoneRadius * 0.35;
        this.safeZoneZ += (Math.random() - 0.5) * this.safeZoneRadius * 0.35;
      }
    }

    this.world.blueZoneMesh.position.set(this.blueZoneX, 75, this.blueZoneZ);
    this.world.blueZoneMesh.scale.set(this.blueZoneRadius, 1, this.blueZoneRadius);

    if (this.playerMode === 'combat' || this.playerMode === 'driving') {
      const playerDist = Math.hypot(this.playerX - this.blueZoneX, this.playerZ - this.blueZoneZ);
      if (playerDist > this.blueZoneRadius) {
        this.zoneTickDmgTimer += dt;
        if (this.zoneTickDmgTimer >= 1.0) {
          this.zoneTickDmgTimer = 0;
          const zoneDmg = 2 + this.zonePhase * 1.8;
          this.health = Math.max(0, this.health - zoneDmg);
          this.damageFlashAlpha = 0.32;
          if (this.health <= 0) {
            const aliveBots = this.bots.filter((b) => b.alive).length;
            this.placementRank = aliveBots + 1;
            this.phase = 'gameover';
            this.releasePointerLock();
            this.onPhaseChange('gameover');
            this.emitHud();
          }
        }
      }
    }
  }

  private stepBots(dt: number) {
    if (!this.world) return;
    const diffAccuracy =
      this.settings.botDifficulty === 'recruit' ? 0.15 : this.settings.botDifficulty === 'tactical' ? 0.085 : 0.048;
    const diffCooldownMult =
      this.settings.botDifficulty === 'recruit' ? 1.5 : this.settings.botDifficulty === 'tactical' ? 1.05 : 0.75;

    for (const bot of this.bots) {
      if (!bot.alive) continue;

      bot.recoilKick = THREE.MathUtils.damp(bot.recoilKick, 0, 14, dt);
      if (bot.fireCooldown > 0) bot.fireCooldown -= dt;

      const bZoneDist = Math.hypot(bot.x - this.blueZoneX, bot.z - this.blueZoneZ);
      if (bZoneDist > this.blueZoneRadius + 2) {
        bot.health -= dt * (2.5 + this.zonePhase * 1.5);
        if (bot.health <= 0) {
          this.eliminateBot(bot, 'Blue Zone', 'Playzone', false, false);
          continue;
        }
      }

      const playerEngageable = this.playerMode === 'combat' || this.playerMode === 'driving';
      let targetX = this.playerX;
      let targetY = this.playerY + (this.stance === 'prone' ? 0.45 : 1.25);
      let targetZ = this.playerZ;
      let targetIsPlayer = playerEngageable;
      let targetBot: BotActor | null = null;
      let bestDist = playerEngageable ? Math.hypot(this.playerX - bot.x, this.playerZ - bot.z) : 999;

      for (const other of this.bots) {
        if (!other.alive || other.id === bot.id) continue;
        const od = Math.hypot(other.x - bot.x, other.z - bot.z);
        if (od < bestDist * 0.85 && od < 95) {
          bestDist = od;
          targetX = other.x;
          targetY = other.y + 1.25;
          targetZ = other.z;
          targetIsPlayer = false;
          targetBot = other;
        }
      }

      let hasLineOfSight = false;
      if (bestDist < 120 && (targetIsPlayer || targetBot)) {
        _v1.set(bot.x, bot.y + 1.45, bot.z);
        _v2.set(targetX - bot.x, targetY - (bot.y + 1.45), targetZ - bot.z).normalize();
        const occ = this.raycastWorldDistance(_v1, _v2, bestDist);
        if (occ.dist >= bestDist - 1.2) hasLineOfSight = true;
      }

      const moveSpeed = 3.8;
      let desiredYaw = bot.yaw;

      if (hasLineOfSight) {
        desiredYaw = Math.atan2(-(targetX - bot.x), -(targetZ - bot.z));
        bot.strafeTimer -= dt;
        if (bot.strafeTimer <= 0) {
          bot.strafeTimer = 1.0 + Math.random() * 1.5;
          bot.strafeDir = Math.random() > 0.5 ? 1 : -1;
        }

        const strafeAngle = desiredYaw + (Math.PI / 2) * bot.strafeDir;
        const approachFactor = bestDist > 38 ? 0.55 : bestDist < 12 ? -0.45 : 0;
        const mx = (-Math.sin(strafeAngle) * 0.85 - Math.sin(desiredYaw) * approachFactor) * 4.2 * dt;
        const mz = (-Math.cos(strafeAngle) * 0.85 - Math.cos(desiredYaw) * approachFactor) * 4.2 * dt;
        const moved = this.moveWithCollision(bot.x, bot.z, mx, mz, 0.45);
        bot.x = moved.x;
        bot.z = moved.z;

        if (bot.fireCooldown <= 0) {
          const spec = WEAPON_SPECS[bot.weaponId];
          bot.fireCooldown = ((spec.fireRateMs / 1000) * 2.2 + Math.random() * 0.3) * diffCooldownMult;
          bot.recoilKick = 1.0;

          const distToPlayer = Math.hypot(bot.x - this.playerX, bot.z - this.playerZ);
          tacticalAudio.playGunshot(bot.weaponId, distToPlayer, false);
          this.recentShots.push({ x: bot.x, z: bot.z, age: 0 });
          if (this.recentShots.length > 16) this.recentShots.shift();

          const muzzle = _v1;
          bot.rig.muzzlePoint.getWorldPosition(muzzle);

          const shotDir = _v2
            .set(
              targetX - muzzle.x + (Math.random() - 0.5) * bestDist * diffAccuracy,
              targetY - muzzle.y + (Math.random() - 0.5) * bestDist * diffAccuracy,
              targetZ - muzzle.z + (Math.random() - 0.5) * bestDist * diffAccuracy
            )
            .normalize();

          const hitCheck = this.raycastWorldDistance(muzzle, shotDir, Math.min(spec.range, bestDist + 4));
          this.spawnTracer(muzzle, hitCheck.point);

          const pronePenalty = targetIsPlayer && this.stance === 'prone' ? 0.14 : 0;
          const hitProbability = Math.max(0.1, 0.62 - bestDist * 0.0045 - diffAccuracy * 2.2 - pronePenalty);
          if (hitCheck.dist >= bestDist - 1.5 && Math.random() < hitProbability) {
            const dealt = spec.damage * 0.55;
            if (targetIsPlayer) {
              this.damagePlayer(dealt, bot.x, bot.z, spec.name, bot.name);
            } else if (targetBot && targetBot.alive) {
              targetBot.health -= dealt;
              if (targetBot.health <= 0) {
                this.eliminateBot(targetBot, bot.name, spec.name, Math.random() < 0.25, false);
              }
            }
          }
        }
      } else {
        if (bZoneDist > this.safeZoneRadius * 0.85) {
          bot.wanderTargetX = this.safeZoneX + (Math.random() - 0.5) * this.safeZoneRadius * 0.6;
          bot.wanderTargetZ = this.safeZoneZ + (Math.random() - 0.5) * this.safeZoneRadius * 0.6;
        } else if (Math.hypot(bot.wanderTargetX - bot.x, bot.wanderTargetZ - bot.z) < 4) {
          bot.wanderTargetX = bot.x + (Math.random() - 0.5) * 48;
          bot.wanderTargetZ = bot.z + (Math.random() - 0.5) * 48;
        }
        desiredYaw = Math.atan2(-(bot.wanderTargetX - bot.x), -(bot.wanderTargetZ - bot.z));
        const mx = -Math.sin(desiredYaw) * moveSpeed * dt;
        const mz = -Math.cos(desiredYaw) * moveSpeed * dt;
        const prevX = bot.x;
        const prevZ = bot.z;
        const moved = this.moveWithCollision(bot.x, bot.z, mx, mz, 0.45);
        bot.x = moved.x;
        bot.z = moved.z;
        if (Math.hypot(bot.x - prevX, bot.z - prevZ) < 0.01) {
          bot.wanderTargetX = bot.x + (Math.random() - 0.5) * 35;
          bot.wanderTargetZ = bot.z + (Math.random() - 0.5) * 35;
        }
      }

      let yawDiff = desiredYaw - bot.yaw;
      while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
      while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
      bot.yaw += yawDiff * Math.min(1, dt * 8);

      bot.y = this.world.groundHeightAt(bot.x, bot.z);
      bot.rig.root.position.set(bot.x, bot.y, bot.z);
      bot.rig.root.rotation.y = bot.yaw;
      bot.rig.animate(dt, 0.7, 'stand', 0, hasLineOfSight, bot.recoilKick, false);
    }
  }

  private updatePools(dt: number) {
    for (const t of this.tracers) {
      if (!t.active) continue;
      t.age += dt;
      if (t.age >= t.life) {
        t.active = false;
        t.mesh.visible = false;
      } else {
        const alpha = t.age / t.life;
        t.mesh.position.lerpVectors(t.start, t.end, Math.min(1, alpha * 1.15));
      }
    }

    for (const p of this.particles) {
      if (!p.active) continue;
      p.age += dt;
      if (p.age >= p.life) {
        p.active = false;
        p.mesh.visible = false;
      } else {
        p.vel.y -= 12 * dt;
        p.mesh.position.addScaledVector(p.vel, dt);
        p.mesh.scale.setScalar(1 - p.age / p.life);
      }
    }

    for (let i = this.recentShots.length - 1; i >= 0; i--) {
      this.recentShots[i].age += dt;
      if (this.recentShots[i].age > 3.5) this.recentShots.splice(i, 1);
    }
  }

  private emitHud() {
    if (!this.world) return;
    const slot = this.getActiveSlot();
    const spec = WEAPON_SPECS[slot.weaponId];
    const isMoving =
      this.heldKeys.has('KeyW') ||
      this.heldKeys.has('KeyS') ||
      this.heldKeys.has('KeyA') ||
      this.heldKeys.has('KeyD');
    const spreadRad =
      (this.mouseRightDown ? spec.adsSpread * SCOPE_SPECS[slot.scope].adsSpreadMult : spec.baseSpread) +
      (isMoving ? spec.moveSpreadBonus : 0);
    const crosshairSpreadPx = Math.round(spreadRad * 620 + this.weaponRecoilKick * 12);

    const holdingBreath =
      this.playerMode === 'combat' &&
      this.mouseRightDown &&
      (this.heldKeys.has('ShiftLeft') || this.heldKeys.has('ShiftRight')) &&
      this.breathLeft > 2;

    if (this.playerMode === 'combat' && this.mouseRightDown) {
      const origin = _rayOrigin.copy(this.camera.position);
      const dir = _rayDir.set(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
      const hit = this.raycastWorldDistance(origin, dir, 480);
      let closest = hit.dist;
      for (const bot of this.bots) {
        if (!bot.alive) continue;
        const bc = _v3.set(bot.x, bot.y + 1.15, bot.z);
        const bd = this.intersectRaySphere(origin, dir, bc, 0.55);
        if (bd !== null && bd < closest && bd > 0.6) closest = bd;
      }
      this.rangefinderM = Math.round(closest);
    } else {
      this.rangefinderM = 0;
    }

    const headingDeg = (((-THREE.MathUtils.radToDeg(this.yaw + this.freeLookYawOffset)) % 360) + 360) % 360;
    const bearingToSafeRad = Math.atan2(this.safeZoneX - this.playerX, -(this.safeZoneZ - this.playerZ));
    const safeZoneBearingDeg = ((THREE.MathUtils.radToDeg(bearingToSafeRad) % 360) + 360) % 360;

    let lootPrompt: HudSnapshot['lootPrompt'] = null;
    const nearbyLoot: NearbyLootEntry[] = [];

    if (this.playerMode === 'combat') {
      const nearVeh = this.findNearestVehicle();
      if (nearVeh) {
        lootPrompt = {
          id: nearVeh.id,
          label: `Drive ${nearVeh.name}`,
          sublabel: `HP ${Math.round(nearVeh.health)}`,
          kind: 'vehicle',
        };
      } else if (
        !this.world.airdropLooted &&
        !this.world.airdropPos.falling &&
        Math.hypot(this.playerX - this.world.airdropPos.x, this.playerZ - this.world.airdropPos.z) < 3.5
      ) {
        lootPrompt = {
          id: 'airdrop',
          label: 'Airdrop Supply Crate',
          sublabel: 'Kar98k + 8x Scope + Suppressor + Lv.3 Gear',
          kind: 'airdrop',
        };
        nearbyLoot.push({
          id: 'airdrop',
          kind: 'airdrop',
          label: 'Airdrop Supply Crate',
          sublabel: 'Lv.3 Gear + Kar98k 8x',
        });
      } else {
        const near = this.findNearestLoot();
        if (near) {
          lootPrompt = { id: near.id, label: near.label, sublabel: near.sublabel, kind: 'loot' };
        }
      }

      for (const item of this.world.lootItems) {
        if (item.collected) continue;
        if (Math.hypot(this.playerX - item.x, this.playerZ - item.z) < 4.5) {
          nearbyLoot.push({
            id: item.id,
            kind: item.kind,
            label: item.label,
            sublabel: item.sublabel,
            weaponId: item.weaponId,
            scopeType: item.scopeType,
            muzzleType: item.muzzleType,
            magType: item.magType,
            level: item.level,
          });
        }
      }
    }

    const aliveCount = this.bots.filter((b) => b.alive).length + (this.health > 0 ? 1 : 0);
    const groundY = this.world.groundHeightAt(this.playerX, this.playerZ);

    this.onHudUpdate({
      playerMode: this.playerMode,
      altitudeM: Math.max(0, Math.round(this.playerY - groundY)),
      fallSpeedKmh: Math.round(this.fallSpeed),
      vehicleSpeedKmh: this.activeVehicle ? Math.round(Math.abs(this.activeVehicle.speed) * 3.6) : 0,
      vehicleHealth: this.activeVehicle ? Math.round((this.activeVehicle.health / this.activeVehicle.maxHealth) * 100) : 100,
      vehicleName: this.activeVehicle ? this.activeVehicle.name : '',
      health: Math.ceil(this.health),
      maxHealth: this.maxHealth,
      boost: Math.round(this.boost),
      armorLevel: this.armorLevel,
      armorDurability: Math.round(this.armorDurability),
      helmetLevel: this.helmetLevel,
      helmetDurability: Math.round(this.helmetDurability),
      backpackLevel: this.backpackLevel,
      inventory: {
        bandages: this.bandages,
        medkits: this.medkits,
        energyDrinks: this.energyDrinks,
        painkillers: this.painkillers,
        fragGrenades: this.fragGrenades,
        smokeGrenades: this.smokeGrenades,
        backpackLevel: this.backpackLevel,
        spareScopes: [...this.spareScopes],
        spareMuzzles: [...this.spareMuzzles],
        spareMags: [...this.spareMags],
        nearbyLoot,
      },
      selectedThrowable: this.selectedThrowable,
      aliveCount,
      totalCount: this.settings.enemyCount + 1,
      kills: this.kills,
      damageDealt: this.damageDealt,
      shotsFired: this.shotsFired,
      shotsHit: this.shotsHit,
      headshots: this.headshots,
      survivalTimeSec: Math.floor(this.survivalTimeSec),
      placementRank: this.placementRank,
      activeSlotIndex: this.activeSlotIndex,
      slots: [{ ...this.slots[0] }, this.slots[1] ? { ...this.slots[1] } : null],
      isReloading: this.isReloading,
      reloadProgress: this.isReloading
        ? 1 - Math.max(0, this.reloadTimer / (slot.mag === 'extended' ? spec.reloadSec * 0.72 : spec.reloadSec))
        : 0,
      isHealing: this.isHealing,
      healLabel: this.healLabel,
      healProgress: this.isHealing ? 1 - Math.max(0, this.healTimer / this.healTotal) : 0,
      isAds: this.mouseRightDown,
      rangefinderM: this.rangefinderM,
      holdingBreath,
      breathPercent: Math.round(this.breathLeft),
      isSprinting:
        isMoving &&
        (this.heldKeys.has('ShiftLeft') || this.heldKeys.has('ShiftRight')) &&
        !this.mouseRightDown &&
        this.stance === 'stand',
      stance: this.stance,
      leanDir: this.leanDir,
      perspective: this.settings.perspective,
      headingDeg,
      safeZoneBearingDeg,
      outsideZone:
        (this.playerMode === 'combat' || this.playerMode === 'driving') &&
        Math.hypot(this.playerX - this.blueZoneX, this.playerZ - this.blueZoneZ) > this.blueZoneRadius,
      zonePhase: this.zonePhase,
      zoneTimerSec: Math.max(0, Math.ceil(this.zoneTimerSec)),
      zoneShrinking: this.zoneShrinking,
      redZone: { ...this.redZone },
      crosshairSpreadPx,
      hitMarkerKind: this.hitMarkerKind,
      eliminationBanner: this.eliminationBanner ? { ...this.eliminationBanner } : null,
      damageFlashAlpha: this.damageFlashAlpha,
      damageDirectionDeg: this.damageDirectionDeg,
      pointerLocked: this.pointerLocked,
      lootPrompt,
      killFeed: [...this.killFeed],
      fps: this.currentFps,
      playerX: this.playerX,
      playerZ: this.playerZ,
      safeZoneX: this.safeZoneX,
      safeZoneZ: this.safeZoneZ,
      safeZoneRadius: this.safeZoneRadius,
      blueZoneX: this.blueZoneX,
      blueZoneZ: this.blueZoneZ,
      blueZoneRadius: this.blueZoneRadius,
      airdropPos: this.world.airdropLooted ? null : { x: this.world.airdropPos.x, z: this.world.airdropPos.z, falling: this.world.airdropPos.falling },
      planePos: this.planeActive ? { x: this.planeGroup.position.x, z: this.planeGroup.position.z, active: true } : null,
      recentShots: this.recentShots.map((s) => ({ ...s })),
      compounds: this.world.compounds.map((c) => ({ name: c.name, x: c.x, z: c.z })),
      vehicles: this.world.vehicles.map((v) => ({ x: v.x, z: v.z, occupied: v.occupied })),
      worldRadius: PLAYABLE_RADIUS,
    });
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.cleanupListeners();
    this.releasePointerLock();
    if (this.world) this.world.dispose();
    if (this.textures) this.textures.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
