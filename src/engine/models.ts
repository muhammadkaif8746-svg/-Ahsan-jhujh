import * as THREE from 'three';
import type { MapId, MuzzleType, ScopeType, Stance, WeaponId } from '../types/game';
import type { MaterialTextureSet } from './textures';

export interface CharacterRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  helmetMesh: THREE.Mesh;
  vestMesh: THREE.Mesh;
  packMesh: THREE.Mesh;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  weaponAnchor: THREE.Group;
  muzzlePoint: THREE.Object3D;
  parachuteGroup: THREE.Group;
  setWeapon: (weaponId: WeaponId, scope?: ScopeType, muzzle?: MuzzleType) => void;
  setArmorVisuals: (armorLevel: number, helmetLevel: number, backpackLevel?: number) => void;
  animate: (
    dt: number,
    speedNorm: number,
    stance: Stance,
    leanDir: -1 | 0 | 1,
    aiming: boolean,
    recoilKick: number,
    parachuteOpen: boolean
  ) => void;
}

const sharedGunMetal = new THREE.MeshStandardMaterial({
  color: 0x26292e,
  metalness: 0.85,
  roughness: 0.28,
});

const sharedPolymer = new THREE.MeshStandardMaterial({
  color: 0x181a1d,
  metalness: 0.08,
  roughness: 0.78,
});

const sharedWood = new THREE.MeshStandardMaterial({
  color: 0x6f4324,
  metalness: 0.05,
  roughness: 0.68,
});

const sharedTan = new THREE.MeshStandardMaterial({
  color: 0xa1865e,
  metalness: 0.12,
  roughness: 0.7,
});

const sharedOpticGlass = new THREE.MeshPhysicalMaterial({
  color: 0x226688,
  metalness: 0.1,
  roughness: 0.08,
  clearcoat: 1.0,
  clearcoatRoughness: 0.1,
});

export function createWeaponMesh(
  weaponId: WeaponId,
  scope: ScopeType = 'iron',
  muzzleType: MuzzleType = 'none'
): { group: THREE.Group; muzzle: THREE.Object3D } {
  const group = new THREE.Group();
  const muzzle = new THREE.Object3D();

  const bodyMat = weaponId === 'm416' ? sharedTan : sharedGunMetal;
  const accentMat = weaponId === 'akm' || weaponId === 'kar98k' ? sharedWood : sharedPolymer;

  // Receiver
  const receiver = new THREE.Mesh(
    new THREE.BoxGeometry(0.065, 0.095, weaponId === 'kar98k' ? 0.48 : 0.34),
    bodyMat
  );
  receiver.castShadow = true;
  group.add(receiver);

  // Handguard
  const handguardLen = weaponId === 's12k' ? 0.26 : weaponId === 'ump45' ? 0.18 : 0.28;
  const handguard = new THREE.Mesh(
    new THREE.BoxGeometry(0.058, 0.07, handguardLen),
    weaponId === 'm416' ? sharedTan : accentMat
  );
  handguard.position.set(0, 0.005, -(0.22 + handguardLen * 0.4));
  handguard.castShadow = true;
  group.add(handguard);

  // Barrel
  const barrelLen = weaponId === 'kar98k' ? 0.56 : weaponId === 'ump45' ? 0.22 : 0.36;
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.017, barrelLen, 10),
    sharedGunMetal
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.018, -(0.25 + barrelLen * 0.5));
  barrel.castShadow = true;
  group.add(barrel);

  // Muzzle Attachment (Suppressor / Compensator / Standard Brake)
  let muzzleExtraZ = 0.04;
  if (muzzleType === 'suppressor') {
    const supp = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.22, 12), sharedPolymer);
    supp.rotation.x = Math.PI / 2;
    supp.position.set(0, 0.018, -(0.25 + barrelLen + 0.09));
    group.add(supp);
    muzzleExtraZ = 0.21;
  } else if (muzzleType === 'compensator') {
    const comp = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.036, 0.09), sharedGunMetal);
    comp.position.set(0, 0.018, -(0.25 + barrelLen + 0.035));
    group.add(comp);
    muzzleExtraZ = 0.09;
  } else {
    const brake = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.02, 0.065, 10), sharedPolymer);
    brake.rotation.x = Math.PI / 2;
    brake.position.set(0, 0.018, -(0.25 + barrelLen + 0.02));
    group.add(brake);
  }

  muzzle.position.set(0, 0.018, -(0.25 + barrelLen + muzzleExtraZ));
  group.add(muzzle);

  // Grip
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.12, 0.058), sharedPolymer);
  grip.position.set(0, -0.085, 0.07);
  grip.rotation.x = -0.25;
  group.add(grip);

  // Stock
  const stock = new THREE.Mesh(
    new THREE.BoxGeometry(0.048, 0.085, 0.26),
    weaponId === 'kar98k' ? sharedWood : sharedPolymer
  );
  stock.position.set(0, -0.015, 0.27);
  stock.castShadow = true;
  group.add(stock);

  // Magazine
  const magHeight = weaponId === 'kar98k' ? 0.04 : weaponId === 's12k' ? 0.19 : 0.16;
  const mag = new THREE.Mesh(
    new THREE.BoxGeometry(0.042, magHeight, weaponId === 's12k' ? 0.082 : 0.062),
    sharedPolymer
  );
  mag.position.set(0, -0.095, -0.06);
  mag.rotation.x = weaponId === 'akm' ? 0.22 : 0.08;
  group.add(mag);

  // Optic / Scope based on equipped ScopeType
  if (scope === '4x' || scope === '6x' || scope === '8x') {
    const scopeLen = scope === '8x' ? 0.34 : scope === '6x' ? 0.29 : 0.22;
    const scopeTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.024, scopeLen, 12),
      sharedGunMetal
    );
    scopeTube.rotation.x = Math.PI / 2;
    scopeTube.position.set(0, 0.085, 0.01);
    group.add(scopeTube);

    const scopeLens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.025, 0.055, 12),
      sharedOpticGlass
    );
    scopeLens.rotation.x = Math.PI / 2;
    scopeLens.position.set(0, 0.085, -scopeLen * 0.5 - 0.01);
    group.add(scopeLens);
  } else if (scope === 'reddot' || scope === '2x') {
    const holoBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.048, scope === '2x' ? 0.052 : 0.04, scope === '2x' ? 0.12 : 0.085),
      sharedPolymer
    );
    holoBase.position.set(0, 0.068, 0.02);
    group.add(holoBase);

    const holoGlass = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.028, 0.01), sharedOpticGlass);
    holoGlass.position.set(0, 0.072, -0.01);
    group.add(holoGlass);
  }

  return { group, muzzle };
}

export function createParachuteRig(): THREE.Group {
  const group = new THREE.Group();
  const canopyMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.72,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    roughness: 0.72,
    side: THREE.DoubleSide,
  });

  // Curved parachute wing
  const canopy = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 2.6, 2.2, 14, 1, true, -Math.PI * 0.38, Math.PI * 0.76),
    canopyMat
  );
  canopy.rotation.z = Math.PI / 2;
  canopy.position.set(0, 2.6, 0);
  canopy.castShadow = true;
  group.add(canopy);

  const stripe = new THREE.Mesh(
    new THREE.CylinderGeometry(2.62, 2.62, 0.6, 14, 1, true, -Math.PI * 0.38, Math.PI * 0.76),
    trimMat
  );
  stripe.rotation.z = Math.PI / 2;
  stripe.position.set(0, 2.6, 0);
  group.add(stripe);

  // Suspension risers
  const lineMat = new THREE.MeshBasicMaterial({ color: 0x27272a });
  for (const sx of [-1.2, 1.2]) {
    for (const sz of [-0.65, 0.65]) {
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.9, 4), lineMat);
      cord.position.set(sx * 0.55, 2.35, sz * 0.55);
      cord.rotation.z = -sx * 0.36;
      cord.rotation.x = sz * 0.22;
      group.add(cord);
    }
  }

  group.visible = false;
  return group;
}

export function createCharacterRig(options: {
  isPlayer: boolean;
  colorTint: number;
  weaponId: WeaponId;
}): CharacterRig {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const clothMat = new THREE.MeshStandardMaterial({
    color: options.colorTint,
    roughness: 0.84,
    metalness: 0.04,
  });

  const vestMat = new THREE.MeshStandardMaterial({
    color: options.isPlayer ? 0x2f362b : 0x3b3834,
    roughness: 0.65,
    metalness: 0.12,
  });

  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xd3a787,
    roughness: 0.72,
    metalness: 0.02,
  });

  const bootMat = new THREE.MeshStandardMaterial({
    color: 0x1a1917,
    roughness: 0.55,
    metalness: 0.15,
  });

  const helmetMat = new THREE.MeshStandardMaterial({
    color: options.isPlayer ? 0x344132 : 0x3a3d42,
    roughness: 0.42,
    metalness: 0.35,
  });

  const makeLeg = (xOffset: number) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(xOffset, 0.88, 0);

    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.42, 0.2), clothMat);
    thigh.position.y = -0.21;
    thigh.castShadow = true;
    legPivot.add(thigh);

    const kneePad = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.11, 0.22), bootMat);
    kneePad.position.set(0, -0.43, -0.01);
    legPivot.add(kneePad);

    const shin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.35, 0.17), clothMat);
    shin.position.y = -0.62;
    shin.castShadow = true;
    legPivot.add(shin);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.27), bootMat);
    boot.position.set(0, -0.81, -0.04);
    boot.castShadow = true;
    legPivot.add(boot);

    return legPivot;
  };

  const leftLeg = makeLeg(-0.14);
  const rightLeg = makeLeg(0.14);
  bodyPivot.add(leftLeg, rightLeg);

  const torso = new THREE.Group();
  torso.position.set(0, 0.88, 0);
  bodyPivot.add(torso);

  const jacket = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.62, 0.28), clothMat);
  jacket.position.y = 0.32;
  jacket.castShadow = true;
  torso.add(jacket);

  const vestMesh = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.44, 0.33), vestMat);
  vestMesh.position.y = 0.34;
  vestMesh.castShadow = true;
  torso.add(vestMesh);

  for (const px of [-0.14, 0, 0.14]) {
    const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.08), sharedTan);
    pouch.position.set(px, 0.22, -0.19);
    torso.add(pouch);
  }

  // Tactical Backpack
  const packMesh = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.44, 0.2), sharedTan);
  packMesh.position.set(0, 0.36, 0.23);
  packMesh.castShadow = true;
  torso.add(packMesh);

  // Iconic PUBG Cast-Iron Pan on rear hip!
  const panGroup = new THREE.Group();
  panGroup.position.set(-0.22, 0.05, 0.19);
  panGroup.rotation.y = 0.25;
  const panDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.13, 0.035, 14), sharedGunMetal);
  panDisc.rotation.x = Math.PI / 2;
  panGroup.add(panDisc);
  const panHandle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.03), sharedPolymer);
  panHandle.position.y = 0.18;
  panGroup.add(panHandle);
  torso.add(panGroup);

  const head = new THREE.Group();
  head.position.set(0, 0.67, 0);
  torso.add(head);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.1, 10), skinMat);
  neck.position.y = 0.03;
  head.add(neck);

  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.25), skinMat);
  skull.position.y = 0.19;
  skull.castShadow = true;
  head.add(skull);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.06, 0.08), sharedOpticGlass);
  visor.position.set(0, 0.21, -0.11);
  head.add(visor);

  const helmetMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.165, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62),
    helmetMat
  );
  helmetMesh.position.set(0, 0.23, 0);
  helmetMesh.castShadow = true;
  head.add(helmetMesh);

  const weaponAnchor = new THREE.Group();
  weaponAnchor.position.set(0.24, 0.42, -0.22);
  torso.add(weaponAnchor);

  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.36), clothMat);
  rightArm.position.set(0.04, -0.02, 0.12);
  weaponAnchor.add(rightArm);

  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.42), clothMat);
  leftArm.position.set(-0.24, -0.03, -0.04);
  leftArm.rotation.y = -0.55;
  weaponAnchor.add(leftArm);

  let currentWeaponGroup: THREE.Group | null = null;
  const muzzlePoint = new THREE.Object3D();
  weaponAnchor.add(muzzlePoint);

  const parachuteGroup = createParachuteRig();
  root.add(parachuteGroup);

  const setWeapon = (weaponId: WeaponId, scope: ScopeType = 'iron', muzzle: MuzzleType = 'none') => {
    if (currentWeaponGroup) {
      weaponAnchor.remove(currentWeaponGroup);
    }
    const built = createWeaponMesh(weaponId, scope, muzzle);
    currentWeaponGroup = built.group;
    currentWeaponGroup.position.set(-0.04, 0.03, -0.12);
    weaponAnchor.add(currentWeaponGroup);
    muzzlePoint.position.copy(built.muzzle.position).add(currentWeaponGroup.position);
  };

  setWeapon(options.weaponId);

  const setArmorVisuals = (armorLevel: number, helmetLevel: number, backpackLevel = 1) => {
    if (armorLevel === 0) vestMat.color.setHex(0x3a3a36);
    else if (armorLevel === 1) vestMat.color.setHex(0x52574d);
    else if (armorLevel === 2) vestMat.color.setHex(0x303945);
    else vestMat.color.setHex(0x1f2226);

    helmetMesh.visible = helmetLevel > 0;
    if (helmetLevel === 1) helmetMat.color.setHex(0x5b6152);
    else if (helmetLevel === 2) helmetMat.color.setHex(0x374352);
    else if (helmetLevel >= 3) helmetMat.color.setHex(0x181b20);

    const bpScale = backpackLevel === 3 ? 1.25 : backpackLevel === 2 ? 1.05 : 0.85;
    packMesh.scale.set(bpScale, bpScale, bpScale);
  };

  let stridePhase = 0;
  let crouchBlend = 0;
  let proneBlend = 0;
  let leanBlend = 0;

  const animate = (
    dt: number,
    speedNorm: number,
    stance: Stance,
    leanDir: -1 | 0 | 1,
    aiming: boolean,
    recoilKick: number,
    parachuteOpen: boolean
  ) => {
    parachuteGroup.visible = parachuteOpen;

    crouchBlend = THREE.MathUtils.damp(crouchBlend, stance === 'crouch' ? 1 : 0, 14, dt);
    proneBlend = THREE.MathUtils.damp(proneBlend, stance === 'prone' ? 1 : 0, 12, dt);
    leanBlend = THREE.MathUtils.damp(leanBlend, leanDir, 15, dt);

    bodyPivot.rotation.x = THREE.MathUtils.lerp(0, -Math.PI * 0.46, proneBlend);
    bodyPivot.position.y = THREE.MathUtils.lerp(0, 0.24, proneBlend);
    bodyPivot.position.z = THREE.MathUtils.lerp(0, 0.65, proneBlend);

    torso.position.y = 0.88 - crouchBlend * 0.28;
    torso.rotation.x = crouchBlend * 0.16;
    torso.rotation.z = -leanBlend * 0.28;

    if (speedNorm > 0.05) {
      stridePhase += dt * (6.5 + speedNorm * 5.5);
      const swing = Math.sin(stridePhase) * 0.55 * Math.min(1, speedNorm);
      leftLeg.rotation.x = swing;
      rightLeg.rotation.x = -swing;
      torso.position.y += Math.abs(Math.cos(stridePhase)) * 0.035 * Math.min(1, speedNorm);
    } else {
      leftLeg.rotation.x = THREE.MathUtils.damp(leftLeg.rotation.x, 0, 12, dt);
      rightLeg.rotation.x = THREE.MathUtils.damp(rightLeg.rotation.x, 0, 12, dt);
    }

    const aimY = aiming ? 0.47 : 0.41;
    const aimZ = aiming ? -0.25 : -0.2;
    weaponAnchor.position.y = THREE.MathUtils.damp(weaponAnchor.position.y, aimY, 16, dt);
    weaponAnchor.position.z = THREE.MathUtils.damp(
      weaponAnchor.position.z,
      aimZ + recoilKick * 0.06,
      20,
      dt
    );
    weaponAnchor.rotation.x = recoilKick * 0.22;
  };

  return {
    root,
    bodyPivot,
    torso,
    head,
    helmetMesh,
    vestMesh,
    packMesh,
    leftLeg,
    rightLeg,
    weaponAnchor,
    muzzlePoint,
    parachuteGroup,
    setWeapon,
    setArmorVisuals,
    animate,
  };
}

export function createCargoPlane(): { group: THREE.Group; props: THREE.Mesh[] } {
  const group = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x4b5563,
    roughness: 0.48,
    metalness: 0.55,
  });
  const wingMat = new THREE.MeshStandardMaterial({
    color: 0x374151,
    roughness: 0.52,
    metalness: 0.5,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.4,
    metalness: 0.3,
  });

  // Fuselage (oriented facing -Z)
  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.5, 18, 12), hullMat);
  fuselage.rotation.x = Math.PI / 2;
  group.add(fuselage);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.7, 3.8, 12), hullMat);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -10.9;
  group.add(nose);

  const cockpitGlass = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 1.4), sharedOpticGlass);
  cockpitGlass.position.set(0, 0.7, -9.2);
  group.add(cockpitGlass);

  // Main wings
  const wings = new THREE.Mesh(new THREE.BoxGeometry(24, 0.35, 3.6), wingMat);
  wings.position.set(0, 1.1, -1.2);
  group.add(wings);

  // Tail fin & horizontal stabilizers
  const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.35, 4.2, 2.8), accentMat);
  tailFin.position.set(0, 2.5, 7.6);
  group.add(tailFin);

  const hStab = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.25, 1.8), wingMat);
  hStab.position.set(0, 0.9, 7.8);
  group.add(hStab);

  // 4 Engine nacelles + propellers
  const props: THREE.Mesh[] = [];
  for (const ex of [-7.5, -4.0, 4.0, 7.5]) {
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.38, 2.1, 8), hullMat);
    pod.rotation.x = Math.PI / 2;
    pod.position.set(ex, 0.85, -2.5);
    group.add(pod);

    const blade = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.14, 0.06), sharedPolymer);
    blade.position.set(ex, 0.85, -3.65);
    group.add(blade);
    props.push(blade);
  }

  return { group, props };
}

export interface ColliderBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export function createCompoundBuilding(
  type: 'warehouse' | 'watchtower' | 'container' | 'bunker',
  worldX: number,
  worldY: number,
  worldZ: number,
  yaw: number,
  textures: MaterialTextureSet,
  mapId: MapId,
  variantIndex: number
): { group: THREE.Group; colliders: ColliderBox[] } {
  const group = new THREE.Group();
  group.position.set(worldX, worldY, worldZ);
  group.rotation.y = yaw;

  const colliders: ColliderBox[] = [];
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);

  const pushLocalCollider = (cx: number, cy: number, cz: number, sx: number, sy: number, sz: number) => {
    const wx = worldX + cx * cos + cz * sin;
    const wz = worldZ - cx * sin + cz * cos;
    const rx = Math.abs(sx * 0.5 * cos) + Math.abs(sz * 0.5 * sin);
    const rz = Math.abs(sx * 0.5 * sin) + Math.abs(sz * 0.5 * cos);
    colliders.push({
      minX: wx - rx,
      maxX: wx + rx,
      minY: worldY + cy - sy * 0.5,
      maxY: worldY + cy + sy * 0.5,
      minZ: wz - rz,
      maxZ: wz + rz,
    });
  };

  const concreteMat = new THREE.MeshStandardMaterial({
    map: textures.concreteMap,
    roughness: 0.88,
    metalness: 0.05,
  });

  const containerColors = [0x8c3a2b, 0x2c4e6b, 0x455a3b, 0x9b702f];
  const metalMat = new THREE.MeshStandardMaterial({
    map: textures.metalMap,
    bumpMap: textures.metalBump,
    bumpScale: 0.04,
    color: containerColors[variantIndex % containerColors.length],
    roughness: 0.45,
    metalness: 0.65,
  });

  const roofMat = new THREE.MeshStandardMaterial({
    color: mapId === 'vikendi_ridge' ? 0x485460 : 0x3b4046,
    roughness: 0.52,
    metalness: 0.5,
  });

  if (type === 'warehouse') {
    const w = 13;
    const d = 18;
    const h = 5.2;

    const pad = new THREE.Mesh(new THREE.BoxGeometry(w + 1.2, 1.4, d + 1.2), concreteMat);
    pad.position.y = -0.45;
    pad.receiveShadow = true;
    group.add(pad);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.55, h, d), concreteMat);
    leftWall.position.set(-w * 0.5, h * 0.5, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    group.add(leftWall);
    pushLocalCollider(-w * 0.5, h * 0.5, 0, 0.7, h, d);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.55, h, d), concreteMat);
    rightWall.position.set(w * 0.5, h * 0.5, 0);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    group.add(rightWall);
    pushLocalCollider(w * 0.5, h * 0.5, 0, 0.7, h, d);

    const wingW = (w - 4.4) * 0.5;
    for (const zEnd of [-d * 0.5, d * 0.5]) {
      for (const side of [-1, 1]) {
        const cx = side * (2.2 + wingW * 0.5);
        const wing = new THREE.Mesh(new THREE.BoxGeometry(wingW, h, 0.55), concreteMat);
        wing.position.set(cx, h * 0.5, zEnd);
        wing.castShadow = true;
        wing.receiveShadow = true;
        group.add(wing);
        pushLocalCollider(cx, h * 0.5, zEnd, wingW, h, 0.7);
      }
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.5, 0.55), metalMat);
      lintel.position.set(0, h - 0.75, zEnd);
      lintel.castShadow = true;
      group.add(lintel);
    }

    const roofL = new THREE.Mesh(new THREE.BoxGeometry(w * 0.56, 0.25, d + 1.0), roofMat);
    roofL.position.set(-w * 0.25, h + 0.65, 0);
    roofL.rotation.z = 0.22;
    roofL.castShadow = true;
    group.add(roofL);

    const roofR = new THREE.Mesh(new THREE.BoxGeometry(w * 0.56, 0.25, d + 1.0), roofMat);
    roofR.position.set(w * 0.25, h + 0.65, 0);
    roofR.rotation.z = -0.22;
    roofR.castShadow = true;
    group.add(roofR);

    const crateMat = new THREE.MeshStandardMaterial({ map: textures.woodMap, roughness: 0.78, metalness: 0.05 });
    const crate1 = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.4, 1.7), crateMat);
    crate1.position.set(-2.6, 0.95, 1.8);
    crate1.castShadow = true;
    crate1.receiveShadow = true;
    group.add(crate1);
    pushLocalCollider(-2.6, 0.95, 1.8, 1.7, 1.6, 1.7);
  } else if (type === 'container') {
    const w = 2.8;
    const h = 2.9;
    const d = 6.8;

    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), metalMat);
    body.position.y = h * 0.5 - 0.1;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
    pushLocalCollider(0, h * 0.5, 0, w, h, d);

    for (const sx of [-w * 0.48, w * 0.48]) {
      for (const sz of [-d * 0.48, d * 0.48]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, h + 0.06, 0.18), roofMat);
        post.position.set(sx, h * 0.5 - 0.1, sz);
        group.add(post);
      }
    }
  } else if (type === 'watchtower') {
    const w = 3.8;
    const h = 6.2;

    const base = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 1.2, w + 0.6), concreteMat);
    base.position.y = -0.45;
    group.add(base);

    for (const px of [-1.5, 1.5]) {
      for (const pz of [-1.5, 1.5]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.28, h, 0.28), roofMat);
        leg.position.set(px, h * 0.5, pz);
        leg.castShadow = true;
        group.add(leg);
        pushLocalCollider(px, h * 0.5, pz, 0.4, h, 0.4);
      }
    }

    const deck = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.3, w + 0.4), concreteMat);
    deck.position.y = 4.0;
    deck.castShadow = true;
    group.add(deck);

    const rail = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.9, 0.18), metalMat);
    rail.position.set(0, 4.6, -w * 0.5);
    group.add(rail);

    const topRoof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.9, 0.22, w + 0.9), roofMat);
    topRoof.position.y = h + 0.2;
    topRoof.castShadow = true;
    group.add(topRoof);
  } else {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.45, 0.85), concreteMat);
    wall.position.y = 0.65;
    wall.castShadow = true;
    wall.receiveShadow = true;
    group.add(wall);
    pushLocalCollider(0, 0.7, 0, 5.6, 1.6, 0.95);

    const cap = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.22, 1.0), roofMat);
    cap.position.y = 1.45;
    group.add(cap);
  }

  return { group, colliders };
}

export function createDrivableVehicleMesh(
  variant: 'uaz' | 'buggy',
  colorHex: number
): { group: THREE.Group; frontWheels: THREE.Mesh[]; allWheels: THREE.Mesh[] } {
  const group = new THREE.Group();

  const paintMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.42,
    metalness: 0.48,
  });

  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x161719,
    roughness: 0.86,
    metalness: 0.05,
  });

  const headLightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

  if (variant === 'uaz') {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.82, 4.4), paintMat);
    hull.position.y = 0.78;
    hull.castShadow = true;
    hull.receiveShadow = true;
    group.add(hull);

    const hood = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.4, 1.35), paintMat);
    hood.position.set(0, 1.05, -1.45);
    hood.castShadow = true;
    group.add(hood);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.78, 2.15), paintMat);
    cabin.position.set(0, 1.54, 0.2);
    cabin.castShadow = true;
    group.add(cabin);

    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.56, 0.1), sharedOpticGlass);
    glass.position.set(0, 1.52, -0.88);
    glass.rotation.x = -0.22;
    group.add(glass);

    for (const hx of [-0.72, 0.72]) {
      const light = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.08), headLightMat);
      light.position.set(hx, 0.88, -2.21);
      group.add(light);
    }
  } else {
    // Open-frame Desert Buggy
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.45, 3.6), paintMat);
    frame.position.y = 0.58;
    frame.castShadow = true;
    group.add(frame);

    const cage = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.85, 1.75), sharedGunMetal);
    cage.position.set(0, 1.18, 0.15);
    cage.castShadow = true;
    group.add(cage);

    const nose = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.35, 1.1), paintMat);
    nose.position.set(0, 0.78, -1.25);
    group.add(nose);
  }

  const frontWheels: THREE.Mesh[] = [];
  const allWheels: THREE.Mesh[] = [];
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.34, 14);
  wheelGeo.rotateZ(Math.PI / 2);

  for (const wx of [-1.05, 1.05]) {
    for (const wz of [-1.35, 1.35]) {
      const wheel = new THREE.Mesh(wheelGeo, tireMat);
      wheel.position.set(wx, 0.42, wz);
      wheel.castShadow = true;
      group.add(wheel);
      allWheels.push(wheel);
      if (wz < 0) frontWheels.push(wheel);
    }
  }

  return { group, frontWheels, allWheels };
}

export function createDeathBox(textures: MaterialTextureSet): THREE.Group {
  const g = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({
    map: textures.woodMap,
    roughness: 0.76,
    metalness: 0.08,
  });
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.52, 0.62), woodMat);
  box.position.y = 0.26;
  box.castShadow = true;
  g.add(box);

  const glowRing = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.68, 20),
    new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide, transparent: true, opacity: 0.65 })
  );
  glowRing.rotation.x = -Math.PI / 2;
  glowRing.position.y = 0.04;
  g.add(glowRing);
  return g;
}

export function createAirdropCrate(textures: MaterialTextureSet): THREE.Group {
  const group = new THREE.Group();

  const blueTarp = new THREE.MeshStandardMaterial({
    color: 0x1d4e89,
    roughness: 0.7,
    metalness: 0.15,
  });
  const redCap = new THREE.MeshStandardMaterial({
    color: 0xb82925,
    roughness: 0.42,
    metalness: 0.35,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    map: textures.woodMap,
    roughness: 0.78,
    metalness: 0.05,
  });

  const base = new THREE.Mesh(new THREE.BoxGeometry(1.75, 1.3, 1.75), blueTarp);
  base.position.y = 0.65;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.32, 1.88), redCap);
  lid.position.y = 1.42;
  lid.castShadow = true;
  group.add(lid);

  const trim = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.2, 1.8), woodMat);
  trim.position.y = 0.12;
  group.add(trim);

  const flareMat = new THREE.MeshBasicMaterial({
    color: 0xff4433,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
  });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.45, 22, 12, 1, true), flareMat);
  beacon.position.y = 12.5;
  group.add(beacon);

  return group;
}
