import * as THREE from "three";
import alpineBackdropUrl from "../assets/alpine-valley-v1.png";
import skierSpriteUrl from "../assets/skier-rear-v1.png";
import snowFirUrl from "../assets/snow-fir-v1.png";

const canvas = document.querySelector("#game");
const shell = document.querySelector(".game-shell");
const startScreen = document.querySelector("#startScreen");
const gameOverScreen = document.querySelector("#gameOverScreen");
const distanceEl = document.querySelector("#distance");
const distanceHud = document.querySelector("#distanceHud");
const bestChase = document.querySelector("#bestChase");
const speedEl = document.querySelector("#speed");
const coinsEl = document.querySelector("#coins");
const feverBar = document.querySelector("#feverBar");
const nearMissesEl = document.querySelector("#nearMisses");
const nearMissHud = document.querySelector("#nearMissHud");
const comboMultiplierEl = document.querySelector("#comboMultiplier");
const comboBar = document.querySelector("#comboBar");
const nearMissToast = document.querySelector("#nearMissToast");
const rewardToastLabel = document.querySelector("#rewardToastLabel");
const rewardToastValue = document.querySelector("#rewardToastValue");
const zoneBanner = document.querySelector("#zoneBanner");
const zoneName = document.querySelector("#zoneName");
const finalDistanceEl = document.querySelector("#finalDistance");
const bestDistanceEl = document.querySelector("#bestDistance");
const runResultMessage = document.querySelector("#runResultMessage");
const restartButton = document.querySelector("#restartButton");
const totalCoinsEl = document.querySelector("#totalCoins");
const totalRunsEl = document.querySelector("#totalRuns");
const sprayTierEl = document.querySelector("#sprayTier");
const achievement1000El = document.querySelector("#achievement1000");
const achievementComboEl = document.querySelector("#achievementCombo");
const achievementCoinsEl = document.querySelector("#achievementCoins");
const startButton = document.querySelector("#startButton");
const assetStatus = document.querySelector("#assetStatus");
// G_DIAGNOSTICS_TEMP
const gDiagnostics = new URLSearchParams(location.search).has("g-diagnostics");
let diagnosticCollisions = !gDiagnostics;

let assetsReady = false;
let assetErrors = 0;
const loadingManager = new THREE.LoadingManager();
loadingManager.onProgress = (_url, loaded, total) => {
  const percent = total ? Math.round((loaded / total) * 100) : 0;
  assetStatus.querySelector("span").textContent = `ASSETS LOADING — ${percent}%`;
};
loadingManager.onError = () => { assetErrors++; };
loadingManager.onLoad = () => {
  assetsReady = true;
  startButton.disabled = false;
  if (assetErrors) {
    assetStatus.querySelector("span").textContent = "READY — SOME ASSETS UNAVAILABLE";
    setTimeout(() => assetStatus.classList.add("loaded"), 1400);
  } else {
    assetStatus.querySelector("span").textContent = "READY";
    setTimeout(() => assetStatus.classList.add("loaded"), 260);
  }
};
const textureLoader = new THREE.TextureLoader(loadingManager);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x6b9eaa);
scene.fog = new THREE.FogExp2(0xb7d5d8, 0.012);

const camera = new THREE.PerspectiveCamera(66, innerWidth / innerHeight, 0.1, 350);
camera.position.set(0, 4.8, 11.2);

scene.add(new THREE.HemisphereLight(0xdffaff, 0x527177, 2.5));
const sun = new THREE.DirectionalLight(0xfff7de, 3.7);
sun.position.set(-18, 28, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -32;
sun.shadow.camera.right = 32;
sun.shadow.camera.top = 32;
sun.shadow.camera.bottom = -32;
scene.add(sun);
scene.add(sun.target);

// A photographic alpine plate replaces the abstract polygon skyline.
const backdropTexture = textureLoader.load(alpineBackdropUrl);
backdropTexture.colorSpace = THREE.SRGBColorSpace;
backdropTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
scene.background = backdropTexture;

let progress = 0;
function crestHeight(worldZ) {
  return Math.max(0, Math.sin(worldZ * .006 + 2.2)) ** 3 * 2.4;
}

function terrainHeight(x, worldZ) {
  // A sustained 16% fall line makes the piste visibly drop away toward the valley.
  const downhill = -worldZ * .16;
  const rolling = Math.sin(worldZ * .043) * .42 + Math.sin(worldZ * .017 + 1.4) * .72;
  const side = Math.sin(x * .15 + worldZ * .019) * .34;
  const bank = Math.sin(worldZ * .009) * x * .023;
  return downhill + rolling + side + bank + crestHeight(worldZ);
}

const groundGeo = new THREE.PlaneGeometry(74, 220, 30, 80);
groundGeo.rotateX(-Math.PI / 2);
function makeSnowTexture() {
  const size = 512;
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = textureCanvas.height = size;
  const textureCtx = textureCanvas.getContext("2d");
  const image = textureCtx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const grain = Math.random() * 20;
      const wind = Math.sin(y * .11 + Math.sin(x * .025) * 2.4) * 4;
      const sparkle = Math.random() > .997 ? 28 : 0;
      const value = Math.max(188, Math.min(255, 229 + grain + wind + sparkle));
      image.data[i] = value - 5;
      image.data[i + 1] = value;
      image.data[i + 2] = Math.min(255, value + 5);
      image.data[i + 3] = 255;
    }
  }
  textureCtx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(7, 24);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}
const snowTexture = makeSnowTexture();
const groundMat = new THREE.MeshStandardMaterial({
  color: 0xf2f7f8,
  map: snowTexture,
  bumpMap: snowTexture,
  bumpScale: .065,
  roughness: .84,
  metalness: 0,
  flatShading: false
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.position.z = -94;
ground.receiveShadow = true;
scene.add(ground);
const groundPositions = groundGeo.attributes.position;

// Thin piste markers race past the player and make velocity visible.
const pisteMarkers = new THREE.Group();
const markerMat = new THREE.MeshBasicMaterial({ color: 0xb5d5d6, transparent: true, opacity: .62 });
for (let z = -4; z > -200; z -= 7) {
  for (const x of [-13, 13]) {
    const marker = new THREE.Mesh(new THREE.BoxGeometry(.09, .025, 3.1), markerMat);
    marker.position.set(x, .08, z);
    pisteMarkers.add(marker);
  }
}
scene.add(pisteMarkers);

function createSkier() {
  const group = new THREE.Group();
  const jacket = new THREE.MeshStandardMaterial({ color: 0xc92f20, roughness: .58 });
  const jacketDark = new THREE.MeshStandardMaterial({ color: 0x81241e, roughness: .65 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x17242c, roughness: .72 });
  const helmetMat = new THREE.MeshStandardMaterial({ color: 0x11191f, metalness: .18, roughness: .32 });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x24292c, roughness: .52 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xd89d77, roughness: .78 });
  const gogglesMat = new THREE.MeshStandardMaterial({ color: 0x91d9e3, metalness: .55, roughness: .12 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xff4d24, roughness: .42 });
  const acid = new THREE.MeshStandardMaterial({ color: 0xd8ff52, emissive: 0x263500, roughness: .4 });

  const addLimb = (a, b, radius, material, parent = group) => {
    const delta = new THREE.Vector3().subVectors(b, a);
    const limb = new THREE.Mesh(new THREE.CylinderGeometry(radius * .9, radius, delta.length(), 9), material);
    limb.position.copy(a).add(b).multiplyScalar(.5);
    limb.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize());
    parent.add(limb);
    return limb;
  };
  const addJoint = (at, radius, material) => {
    const joint = new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 7), material);
    joint.position.copy(at);
    group.add(joint);
  };

  // Tapered jacket, shoulders and collar give the rider a human silhouette.
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(.34, .28, .9, 12), jacket);
  torso.position.set(0, 1.55, -.09);
  torso.rotation.x = .19;
  group.add(torso);
  const shoulders = new THREE.Mesh(new THREE.CapsuleGeometry(.17, .58, 5, 10), jacketDark);
  shoulders.position.set(0, 1.84, -.15);
  shoulders.rotation.z = Math.PI / 2;
  group.add(shoulders);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(.2, .055, 7, 12), jacketDark);
  collar.position.set(0, 2.06, -.17);
  collar.rotation.x = Math.PI / 2;
  group.add(collar);
  const backpack = new THREE.Mesh(new THREE.CapsuleGeometry(.22, .4, 5, 9), jacketDark);
  backpack.position.set(0, 1.55, .25);
  backpack.scale.set(1, 1.08, .55);
  group.add(backpack);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.11, .13, .2, 9), skin);
  neck.position.set(0, 2.1, -.17);
  group.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.235, 16, 12), skin);
  head.position.set(0, 2.34, -.2);
  head.scale.set(.9, 1.08, .92);
  group.add(head);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(.27, 16, 10, 0, Math.PI * 2, 0, Math.PI * .68), helmetMat);
  helmet.position.set(0, 2.4, -.18);
  helmet.rotation.x = -.08;
  group.add(helmet);
  const goggles = new THREE.Mesh(new THREE.BoxGeometry(.4, .12, .08), gogglesMat);
  goggles.position.set(0, 2.36, -.405);
  goggles.rotation.x = -.08;
  group.add(goggles);
  const goggleStrap = new THREE.Mesh(new THREE.TorusGeometry(.225, .022, 6, 14), helmetMat);
  goggleStrap.position.set(0, 2.36, -.2);
  goggleStrap.rotation.x = Math.PI / 2;
  group.add(goggleStrap);

  for (const side of [-1, 1]) {
    const shoulder = new THREE.Vector3(side * .34, 1.86, -.13);
    const elbow = new THREE.Vector3(side * .51, 1.48, -.38);
    const hand = new THREE.Vector3(side * .62, 1.13, -.55);
    addLimb(shoulder, elbow, .09, jacket);
    addLimb(elbow, hand, .075, jacketDark);
    addJoint(elbow, .095, jacket);
    addJoint(hand, .085, bootMat);

    const hip = new THREE.Vector3(side * .18, 1.15, -.07);
    const knee = new THREE.Vector3(side * .26, .66, -.39);
    const ankle = new THREE.Vector3(side * .22, .25, -.1);
    addLimb(hip, knee, .12, pants);
    addLimb(knee, ankle, .1, pants);
    addJoint(knee, .13, pants);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(.22, .2, .48), bootMat);
    boot.position.set(side * .22, .19, -.22);
    boot.rotation.x = -.08;
    group.add(boot);
    const ski = new THREE.Mesh(new THREE.BoxGeometry(.115, .045, 2.45), side === -1 ? orange : acid);
    ski.position.set(side * .23, .065, -.35);
    ski.rotation.y = side * .025;
    group.add(ski);
    const skiTip = new THREE.Mesh(new THREE.BoxGeometry(.115, .09, .3), side === -1 ? orange : acid);
    skiTip.position.set(side * .23, .11, -1.55);
    skiTip.rotation.x = -.24;
    group.add(skiTip);

    const poleEnd = new THREE.Vector3(side * .79, .14, -.88);
    addLimb(hand, poleEnd, .014, helmetMat);
    const basket = new THREE.Mesh(new THREE.TorusGeometry(.08, .012, 5, 10), helmetMat);
    basket.position.copy(poleEnd);
    basket.rotation.x = Math.PI / 2;
    group.add(basket);
  }
  const hips = new THREE.Mesh(new THREE.CapsuleGeometry(.15, .25, 5, 9), pants);
  hips.position.set(0, 1.1, -.07);
  hips.rotation.z = Math.PI / 2;
  group.add(hips);
  group.traverse(m => { if (m.isMesh) m.castShadow = true; });
  group.userData.torso = torso;
  group.userData.shoulders = shoulders;
  group.userData.backpack = backpack;
  return group;
}

const skier = createSkier();
skier.traverse(child => { if (child.isMesh) child.visible = false; });
const skierPhotoTexture = textureLoader.load(skierSpriteUrl);
skierPhotoTexture.colorSpace = THREE.SRGBColorSpace;
skierPhotoTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
const skierPhoto = new THREE.Mesh(
  new THREE.PlaneGeometry(2.04, 3.08, 14, 32),
  new THREE.MeshBasicMaterial({
    map: skierPhotoTexture,
    transparent: true,
    alphaTest: .035,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false
  })
);
skierPhoto.position.set(0, 1.54, .08);
skierPhoto.renderOrder = 10;
skier.add(skierPhoto);
const skierPhotoPositions = skierPhoto.geometry.attributes.position;
const skierPhotoBase = Float32Array.from(skierPhotoPositions.array);

function deformSkier(crouch, carve) {
  const turn = THREE.MathUtils.clamp(carve, -1, 1);
  const turnStrength = Math.abs(turn);
  for (let i = 0; i < skierPhotoPositions.count; i++) {
    const baseX = skierPhotoBase[i * 3];
    const baseY = skierPhotoBase[i * 3 + 1];
    const baseZ = skierPhotoBase[i * 3 + 2];
    const normalizedY = (baseY + 1.54) / 3.08;

    // Feet stay planted. Knees move outward and the hips/torso drop as the
    // skier absorbs load, approximating real flexion from a rear chase view.
    const upperWeight = THREE.MathUtils.smoothstep(normalizedY, .2, .54);
    const kneeBand = Math.exp(-Math.pow((normalizedY - .31) / .14, 2));
    const hipBand = Math.exp(-Math.pow((normalizedY - .48) / .17, 2));
    const shoulderBand = Math.exp(-Math.pow((normalizedY - .76) / .18, 2));
    const legBand =
      THREE.MathUtils.smoothstep(normalizedY, .08, .2) *
      (1 - THREE.MathUtils.smoothstep(normalizedY, .56, .7));
    const side = Math.sign(baseX);
    const insideLeg = Math.max(0, side * turn);
    const outsideLeg = Math.max(0, -side * turn);

    // The inside leg shortens and flexes more; the outside leg remains longer
    // and loaded. Both knees move into the turn while the torso counterbalances.
    const asymmetricFlex = turnStrength * (insideLeg * .15 - outsideLeg * .035);
    const kneeOut = side * crouch * kneeBand * (.08 + insideLeg * .085);
    const kneeIntoTurn = turn * kneeBand * (.12 + insideLeg * .075);
    const hipIntoTurn = turn * hipBand * .105;
    const torsoCounter = -turn * shoulderBand * .045;
    const drop = crouch * upperWeight * .42;
    const compression = crouch * kneeBand * (.07 + insideLeg * .075);
    const insideLegShorten = asymmetricFlex * legBand;

    skierPhotoPositions.setXYZ(
      i,
      baseX + kneeOut + kneeIntoTurn + hipIntoTurn + torsoCounter,
      baseY - drop + compression - insideLegShorten,
      baseZ
    );
  }
  skierPhotoPositions.needsUpdate = true;
}
scene.add(skier);

const skierShadow = new THREE.Mesh(
  new THREE.CircleGeometry(.58, 24),
  new THREE.MeshBasicMaterial({ color: 0x23383d, transparent: true, opacity: .2, depthWrite: false })
);
skierShadow.rotation.x = -Math.PI / 2;
scene.add(skierShadow);

const obstacleRoot = new THREE.Group();
scene.add(obstacleRoot);
const objects = [];
const treeTexture = textureLoader.load(snowFirUrl);
treeTexture.colorSpace = THREE.SRGBColorSpace;
treeTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
const treePhotoMat = new THREE.MeshBasicMaterial({
  map: treeTexture,
  transparent: true,
  alphaTest: .055,
  depthWrite: false,
  side: THREE.DoubleSide,
  toneMapped: false
});
const rockMat = new THREE.MeshStandardMaterial({ color: 0x526971, roughness: .9, flatShading: true });
const coinMat = new THREE.MeshStandardMaterial({ color: 0xd8ff52, emissive: 0x4b6200, emissiveIntensity: 1.2, roughness: .3 });
const goldCoinMat = new THREE.MeshStandardMaterial({
  color: 0xffa000,
  emissive: 0xff5a00,
  emissiveIntensity: 1.85,
  roughness: .2,
  metalness: .25
});
const rampMat = new THREE.MeshStandardMaterial({ color: 0xaac6c8, roughness: .75 });
const treePlaneGeo = new THREE.PlaneGeometry(3.2, 4.8);
const treeShadowGeo = new THREE.CircleGeometry(.82, 18);
const treeShadowMat = new THREE.MeshBasicMaterial({
  color: 0x203438,
  transparent: true,
  opacity: .16,
  depthWrite: false
});
const rockGeo = new THREE.IcosahedronGeometry(.72, 0);
const coinGeo = new THREE.TorusGeometry(.32, .1, 7, 16);
const rampGeo = new THREE.BoxGeometry(2.4, .18, 2.1);
const rampStripeGeo = new THREE.BoxGeometry(2.45, .04, .18);
const rampStripeMat = new THREE.MeshBasicMaterial({ color: 0xff4d24 });

function makeTree() {
  const g = new THREE.Group();
  const tree = new THREE.Mesh(treePlaneGeo, treePhotoMat);
  tree.position.y = 2.4;
  tree.renderOrder = 3;
  g.add(tree);
  const shadow = new THREE.Mesh(treeShadowGeo, treeShadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.y = .42;
  shadow.position.y = .025;
  g.add(shadow);
  return g;
}

function makeRock() {
  const mesh = new THREE.Mesh(rockGeo, rockMat);
  mesh.scale.set(1.25, .72, 1);
  mesh.castShadow = true;
  return mesh;
}

function makeCoin(gold = false) {
  const mesh = new THREE.Mesh(coinGeo, gold ? goldCoinMat : coinMat);
  mesh.rotation.y = Math.PI / 2;
  return mesh;
}

function makeRamp() {
  const g = new THREE.Group();
  const mesh = new THREE.Mesh(rampGeo, rampMat);
  mesh.rotation.x = -.22;
  mesh.position.y = .25;
  mesh.castShadow = true;
  g.add(mesh);
  const stripe = new THREE.Mesh(rampStripeGeo, rampStripeMat);
  stripe.rotation.x = -.22;
  stripe.position.set(0, .49, -.75);
  g.add(stripe);
  return g;
}

function addObject(type, worldZ, x, options = {}) {
  const gold = type === "coin" && (options.gold ?? Math.random() < .12);
  const mesh = type === "tree" ? makeTree() : type === "rock" ? makeRock() : type === "coin" ? makeCoin(gold) : makeRamp();
  const scale = type === "tree" ? .8 + Math.random() * .55 : gold ? 1.6 : 1;
  mesh.scale.setScalar(scale);
  mesh.position.set(x, terrainHeight(x, worldZ), 4 - (worldZ - progress));
  if (type === "coin") mesh.position.y += 1.25;
  obstacleRoot.add(mesh);
  objects.push({
    type,
    worldZ,
    x,
    mesh,
    hit: false,
    gold,
    feverCoin: Boolean(options.fever),
    heightOffset: options.heightOffset || 0,
    nearMissed: false,
    lastZ: mesh.position.z,
    phase: Math.random() * Math.PI * 2
  });
}

const ZONES = [
  { name: "NORMAL RUN", stepMin: 5, stepRange: 6, thresholds: [.58, .75, .92] },
  { name: "DEEP FOREST", stepMin: 3.2, stepRange: 4.2, thresholds: [.72, .8, .92] },
  { name: "ROCK GARDEN", stepMin: 4.8, stepRange: 5.5, thresholds: [.2, .62, .78] },
  { name: "COIN CORRIDOR", stepMin: 5, stepRange: 5.5, thresholds: [.14, .22, .88] }
];

function zoneAt(worldZ) {
  return Math.floor(worldZ / 400) % ZONES.length;
}

function populate(from, to) {
  for (let z = from; z < to;) {
    const zone = ZONES[zoneAt(z)];
    const safeCenter = Math.random() > .68;
    const roll = Math.random();
    const [treeEnd, rockEnd, coinEnd] = zone.thresholds;
    let type = roll < treeEnd ? "tree" : roll < rockEnd ? "rock" : roll < coinEnd ? "coin" : "ramp";
    let x = (Math.random() - .5) * 34;
    if (safeCenter && (type === "tree" || type === "rock")) x = (Math.random() > .5 ? 1 : -1) * (9 + Math.random() * 9);
    addObject(type, z, x);
    if (type === "ramp" && Math.random() < .3) {
      const count = 6;
      for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        addObject("coin", z + 5 + i * 6, x, {
          gold: false,
          heightOffset: Math.sin(t * Math.PI) * 3.35
        });
      }
    }
    if (type === "coin" && Math.random() > .45) addObject("coin", z + 3.2, x + (Math.random() - .5) * 1.2);
    z += zone.stepMin + Math.random() * zone.stepRange;
  }
}
populate(28, 230);

const snowCount = 650;
const snowPositions = new Float32Array(snowCount * 3);
for (let i = 0; i < snowCount; i++) {
  snowPositions[i * 3] = (Math.random() - .5) * 48;
  snowPositions[i * 3 + 1] = Math.random() * 18;
  snowPositions[i * 3 + 2] = -Math.random() * 95 + 8;
}
const snowGeo = new THREE.BufferGeometry();
snowGeo.setAttribute("position", new THREE.BufferAttribute(snowPositions, 3));
const snowPoints = new THREE.Points(
  snowGeo,
  new THREE.PointsMaterial({ color: 0xffffff, size: .075, transparent: true, opacity: .45, depthWrite: false })
);
scene.add(snowPoints);

// Peripheral streaks make high speed readable without moving or rolling the camera.
const speedLineCount = 72;
const speedLinePositions = new Float32Array(speedLineCount * 6);
const speedLineX = new Float32Array(speedLineCount);
const speedLineY = new Float32Array(speedLineCount);
const speedLineZ = new Float32Array(speedLineCount);
const speedLineLength = new Float32Array(speedLineCount);
for (let i = 0; i < speedLineCount; i++) {
  const side = Math.random() < .5 ? -1 : 1;
  speedLineX[i] = side * (3.8 + Math.random() * 16);
  speedLineY[i] = -1.5 + Math.random() * 12;
  speedLineZ[i] = -62 + Math.random() * 68;
  speedLineLength[i] = .8 + Math.random() * 2.4;
}
const speedLineGeo = new THREE.BufferGeometry();
speedLineGeo.setAttribute("position", new THREE.BufferAttribute(speedLinePositions, 3));
const speedLineMat = new THREE.LineBasicMaterial({
  color: 0xe8fbff,
  transparent: true,
  opacity: 0,
  depthWrite: false,
  blending: THREE.AdditiveBlending
});
const speedLines = new THREE.LineSegments(speedLineGeo, speedLineMat);
speedLines.frustumCulled = false;
scene.add(speedLines);

// Carving throws a short-lived fan of snow from the downhill ski.
const sprayCount = 180;
const sprayPositions = new Float32Array(sprayCount * 3).fill(999);
const sprayVelocity = Array.from({ length: sprayCount }, () => new THREE.Vector3());
const sprayLife = new Float32Array(sprayCount);
let sprayCursor = 0;
const sprayGeo = new THREE.BufferGeometry();
sprayGeo.setAttribute("position", new THREE.BufferAttribute(sprayPositions, 3));
const sprayPoints = new THREE.Points(
  sprayGeo,
  new THREE.PointsMaterial({ color: 0xffffff, size: .17, transparent: true, opacity: .82, depthWrite: false })
);
scene.add(sprayPoints);

const clock = new THREE.Clock();
const keys = { left: false, right: false, tuck: false };
let state = "intro";
let timeScale = 1;
let crashTimer = 0;
let speed = 27;
let boost = 0;
let edgeLoadTimer = 0;
let pumpArmed = false;
let distance = 0;
let coins = 0;
let feverGauge = 0;
let feverTimer = 0;
let runBest = 0;
let bestBeaten = false;
let currentZoneIndex = 0;
let zoneBannerTimer = 0;
let nextMilestone = 500;
let lifetimeCoins = Number(localStorage.getItem("snowline-total-coins") || 0);
let lifetimeRuns = Number(localStorage.getItem("snowline-total-runs") || 0);
const achievements = {
  distance1000: localStorage.getItem("snowline-achievement-1000m") === "1",
  combo5: localStorage.getItem("snowline-achievement-combo5") === "1",
  coins30: localStorage.getItem("snowline-achievement-coins30") === "1"
};
let nearMisses = 0;
let nearMissCombo = 0;
let comboTimer = 0;
let steerVelocity = 0;
let heading = 0;
let edgeAngle = 0;
let leanAngle = 0;
let crouchAmount = .12;
let landingCompression = 0;
let playerX = 0;
let jumpHeight = 0;
let jumpVelocity = 0;
let airTime = 0;
let previousGroundY = terrainHeight(0, 0);
let previousCrestY = crestHeight(0);
let crestCooldown = 0;
let crestJumpCount = 0;
let spawnEnd = 230;
let shake = 0;
let carveTimer = 0;
let muted = false;
let audio, masterGain, windGain, windFilter, howlGain, howlFilter;

function addBoost(amount) {
  boost = Math.min(12, Math.max(0, boost + amount));
}

function vibrate(duration) {
  navigator.vibrate?.(duration);
}

function emitCarveSpray(turn, amount = 5) {
  if (!turn || jumpHeight > .08) return;
  for (let n = 0; n < amount; n++) {
    const i = sprayCursor++ % sprayCount;
    sprayPositions[i * 3] = playerX - turn * (.18 + Math.random() * .22);
    sprayPositions[i * 3 + 1] = skier.position.y + .13;
    sprayPositions[i * 3 + 2] = 4.35 + Math.random() * .3;
    sprayVelocity[i].set(
      -turn * (2.2 + Math.random() * 4.8),
      1.2 + Math.random() * 2.9,
      4 + Math.random() * 7
    );
    sprayLife[i] = .32 + Math.random() * .42;
  }
}

function initAudio() {
  if (audio) { if (audio.state === "suspended") audio.resume(); return; }
  audio = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audio.createGain();
  masterGain.gain.value = muted ? 0 : .8;
  masterGain.connect(audio.destination);
  const buffer = audio.createBuffer(1, audio.sampleRate * 2, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const source = audio.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  windFilter = audio.createBiquadFilter();
  windFilter.type = "lowpass";
  windGain = audio.createGain();
  windGain.gain.value = .0001;
  source.connect(windFilter).connect(windGain).connect(masterGain);
  howlFilter = audio.createBiquadFilter();
  howlFilter.type = "bandpass";
  howlFilter.frequency.value = 1800;
  howlFilter.Q.value = 3.2;
  howlGain = audio.createGain();
  howlGain.gain.value = .0001;
  source.connect(howlFilter).connect(howlGain).connect(masterGain);
  source.start();
}

function tone(freq, duration = .1, type = "sine", gain = .05, endFreq = freq, delay = 0) {
  if (muted) return;
  initAudio();
  const osc = audio.createOscillator();
  const vol = audio.createGain();
  osc.type = type;
  const startAt = audio.currentTime + delay;
  osc.frequency.setValueAtTime(freq, startAt);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), startAt + duration);
  vol.gain.setValueAtTime(gain, startAt);
  vol.gain.exponentialRampToValueAtTime(.001, startAt + duration);
  osc.connect(vol).connect(masterGain);
  osc.start(startAt);
  osc.stop(startAt + duration);
}

function noiseBurst(duration = .15, gain = .08, frequency = 1100) {
  if (muted) return;
  initAudio();
  const buffer = audio.createBuffer(1, Math.floor(audio.sampleRate * duration), audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const source = audio.createBufferSource();
  const filter = audio.createBiquadFilter();
  const vol = audio.createGain();
  source.buffer = buffer;
  filter.type = "bandpass";
  filter.frequency.value = frequency;
  vol.gain.setValueAtTime(gain, audio.currentTime);
  vol.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
  source.connect(filter).connect(vol).connect(masterGain);
  source.start();
}

function announce(text, pitch = 1) {
  if (muted || !("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const voice = new SpeechSynthesisUtterance(text);
  voice.lang = "ja-JP";
  voice.rate = 1.08;
  voice.pitch = pitch;
  voice.volume = .7;
  speechSynthesis.speak(voice);
}

function burstSound(kind, level = 1) {
  if (kind === "coin") {
    tone(880, .1, "sine", .05, 1320);
  } else if (kind === "gold") {
    tone(880, .12, "sine", .055, 980, 0);
    tone(1100, .12, "sine", .055, 1210, .06);
    tone(1320, .16, "sine", .065, 1540, .12);
  } else if (kind === "jump") {
    noiseBurst(.1, .035, 1600);
    tone(260, .15, "triangle", .04, 480);
  } else if (kind === "land") {
    noiseBurst(.18, .07, 620);
    tone(90, .09, "triangle", .04, 55);
  } else if (kind === "crash") {
    noiseBurst(.55, .18, 220);
    tone(140, .48, "sawtooth", .08, 38);
  } else if (kind === "near") {
    noiseBurst(.09, .055, 2850);
    const comboPitch = 760 * Math.pow(2, Math.min(level, 5) * 2 / 12);
    tone(comboPitch, .1, "triangle", .028, comboPitch * 1.5);
  }
}

function spawnFeverLine() {
  for (let i = 0; i < 40; i++) {
    const worldZ = progress + 18 + i * 5.7;
    const x = THREE.MathUtils.clamp(playerX + Math.sin(i * .62) * 5.4, -18, 18);
    addObject("coin", worldZ, x, { gold: false, fever: true });
  }
}

function startFever() {
  if (feverTimer > 0) return;
  feverGauge = 0;
  feverTimer = 8;
  feverBar.style.transform = "scaleX(0)";
  shell.classList.add("fever");
  shell.classList.remove("fever-ending");
  spawnFeverLine();
  tone(440, .18, "sawtooth", .045, 660);
  tone(660, .2, "triangle", .05, 990, .1);
  announce("コイン フィーバー", 1.15);
}

function collectCoin(o) {
  const feverMultiplier = feverTimer > 0 ? 2 : 1;
  const coinUnits = (o.gold ? 5 : 1) * feverMultiplier;
  const meterBonus = (o.gold ? 60 : 12) * feverMultiplier;
  coins += coinUnits;
  lifetimeCoins += coinUnits;
  localStorage.setItem("snowline-total-coins", String(lifetimeCoins));
  distance += meterBonus;
  if (feverTimer <= 0) {
    feverGauge = Math.min(10, feverGauge + (o.gold ? 5 : 1));
    feverBar.style.transform = `scaleX(${feverGauge / 10})`;
  }
  burstSound(o.gold ? "gold" : "coin");
  if (coins >= 30) unlockAchievement("coins30");
  updateMetaUI();
  if (feverTimer <= 0 && feverGauge >= 10) startFever();
}

function registerNearMiss() {
  nearMisses++;
  nearMissCombo++;
  comboTimer = 4;
  const multiplier = Math.min(nearMissCombo, 5);
  const bonus = 25 * multiplier;
  distance += bonus;
  nearMissesEl.textContent = String(nearMisses).padStart(2, "0");
  comboMultiplierEl.textContent = `×${multiplier}`;
  nearMissHud.classList.toggle("hot", multiplier >= 3);
  comboBar.style.transform = "scaleX(1)";
  shake = Math.max(shake, .075);
  addBoost(1.2);
  burstSound("near", multiplier);
  vibrate(30);
  if (multiplier >= 5) unlockAchievement("combo5");
  showRewardToast(`CLOSE CALL ×${multiplier}`, `+${bonus}m`, "near");
}

function showRewardToast(label, value, kind = "near") {
  rewardToastLabel.textContent = label;
  rewardToastValue.textContent = value;
  nearMissToast.classList.toggle("air", kind === "air");
  nearMissToast.classList.remove("active");
  void nearMissToast.offsetWidth;
  nearMissToast.classList.add("active");
}

function showZone(index) {
  currentZoneIndex = index;
  zoneBannerTimer = 2;
  zoneName.textContent = ZONES[index].name;
  zoneBanner.classList.remove("active");
  void zoneBanner.offsetWidth;
  zoneBanner.classList.add("active");
  tone(520, .12, "triangle", .035, 620);
  tone(780, .16, "triangle", .04, 920, .09);
}

function triggerMilestone(value) {
  tone(620, .13, "triangle", .04, 760);
  tone(930, .17, "triangle", .045, 1120, .1);
  distanceEl.classList.remove("milestone-pulse");
  void distanceEl.offsetWidth;
  distanceEl.classList.add("milestone-pulse");
  if (value % 1000 === 0) {
    announce(`${value}メートル`, 1.05);
    unlockAchievement("distance1000");
  }
}

function unlockAchievement(key) {
  if (achievements[key]) return;
  achievements[key] = true;
  const storageKeys = {
    distance1000: "snowline-achievement-1000m",
    combo5: "snowline-achievement-combo5",
    coins30: "snowline-achievement-coins30"
  };
  localStorage.setItem(storageKeys[key], "1");
  updateMetaUI();
  tone(720, .16, "triangle", .04, 980);
  tone(1080, .2, "sine", .045, 1380, .11);
}

function updateMetaUI() {
  totalCoinsEl.textContent = String(lifetimeCoins).padStart(4, "0");
  totalRunsEl.textContent = String(lifetimeRuns).padStart(3, "0");
  const tier = lifetimeCoins >= 200 ? "GOLD" : lifetimeCoins >= 50 ? "ACID" : "WHITE";
  const sprayColor = lifetimeCoins >= 200 ? 0xffc13b : lifetimeCoins >= 50 ? 0xd8ff52 : 0xffffff;
  sprayTierEl.textContent = tier;
  sprayTierEl.style.color = `#${sprayColor.toString(16).padStart(6, "0")}`;
  sprayPoints.material.color.setHex(sprayColor);
  achievement1000El.classList.toggle("unlocked", achievements.distance1000);
  achievementComboEl.classList.toggle("unlocked", achievements.combo5);
  achievementCoinsEl.classList.toggle("unlocked", achievements.coins30);
}

updateMetaUI();

function reset() {
  if (!assetsReady) return;
  lifetimeRuns++;
  localStorage.setItem("snowline-total-runs", String(lifetimeRuns));
  updateMetaUI();
  state = "playing";
  timeScale = 1;
  crashTimer = 0;
  distance = 0;
  progress = 0;
  speed = 27;
  boost = 0;
  edgeLoadTimer = 0;
  pumpArmed = false;
  coins = 0;
  feverGauge = 0;
  feverTimer = 0;
  runBest = Number(localStorage.getItem("snowline-best-3d") || 0);
  bestBeaten = false;
  currentZoneIndex = 0;
  zoneBannerTimer = 0;
  nextMilestone = 500;
  nearMisses = 0;
  nearMissCombo = 0;
  comboTimer = 0;
  playerX = 0;
  steerVelocity = 0;
  heading = 0;
  edgeAngle = 0;
  leanAngle = 0;
  crouchAmount = .12;
  landingCompression = 0;
  jumpHeight = 0;
  jumpVelocity = 0;
  airTime = 0;
  previousGroundY = terrainHeight(0, 0);
  previousCrestY = crestHeight(0);
  crestCooldown = 0;
  crestJumpCount = 0;
  shake = 0;
  keys.left = false;
  keys.right = false;
  keys.tuck = false;
  sprayPositions.fill(999);
  sprayLife.fill(0);
  sprayGeo.attributes.position.needsUpdate = true;
  objects.forEach(o => obstacleRoot.remove(o.mesh));
  objects.length = 0;
  spawnEnd = 230;
  populate(25, spawnEnd);
  shell.classList.add("playing");
  shell.classList.remove("fever", "fever-ending", "record-flash", "crashing");
  startScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");
  nearMissesEl.textContent = "00";
  comboMultiplierEl.textContent = "×0";
  comboBar.style.transform = "scaleX(0)";
  nearMissHud.classList.remove("hot");
  nearMissToast.classList.remove("active");
  feverBar.style.transform = "scaleX(0)";
  bestChase.textContent = "";
  distanceHud.classList.remove("live-record");
  runResultMessage.textContent = "";
  runResultMessage.className = "run-result-message";
  restartButton.classList.remove("retry-pulse");
  zoneBanner.classList.remove("active");
  distanceEl.classList.remove("milestone-pulse");
  initAudio();
  tone(220, .12, "sawtooth", .04, 440);
  setTimeout(() => announce("スタート"), 260);
}

function jump(boost = 10.5) {
  if (state !== "playing" || jumpHeight > .08) return;
  airTime = 0;
  jumpVelocity = boost;
  burstSound("jump");
}

function gameOver() {
  if (state !== "playing") return;
  state = "crashing";
  timeScale = .25;
  crashTimer = .9;
  keys.left = false;
  keys.right = false;
  keys.tuck = false;
  feverTimer = 0;
  shell.classList.remove("fever", "fever-ending");
  nearMissCombo = 0;
  comboTimer = 0;
  comboBar.style.transform = "scaleX(0)";
  comboMultiplierEl.textContent = "×0";
  nearMissHud.classList.remove("hot");
  shell.classList.add("crashing");
  shake = .65;
  burstSound("crash");
  vibrate(80);
}

function finishGameOver() {
  if (state !== "crashing") return;
  state = "over";
  timeScale = 1;
  crashTimer = 0;
  shell.classList.remove("playing", "crashing");
  const meters = Math.floor(distance);
  const oldBest = runBest;
  const best = Math.max(meters, oldBest);
  localStorage.setItem("snowline-best-3d", best);
  finalDistanceEl.textContent = `${meters}m`;
  bestDistanceEl.textContent = `${best}m`;
  const difference = oldBest - meters;
  if (meters > oldBest) {
    const gain = meters - oldBest;
    runResultMessage.textContent = oldBest > 0 ? `NEW RECORD +${gain}m` : `NEW RECORD ${meters}m`;
    runResultMessage.classList.add("new-record");
  } else if (difference > 0 && difference <= 100) {
    runResultMessage.textContent = `あと ${difference}m でベスト更新！`;
    runResultMessage.classList.add("near-loss");
    restartButton.classList.add("retry-pulse");
  } else {
    runResultMessage.textContent = "";
  }
  gameOverScreen.classList.remove("hidden");
  if (!bestBeaten) {
    announce(meters > oldBest ? "ニュー レコード" : "ワイプアウト", meters > oldBest ? 1.15 : .84);
  }
}

function updatePlaying(dt) {
  const activeZone = zoneAt(progress);
  if (activeZone !== currentZoneIndex) showZone(activeZone);
  if (zoneBannerTimer > 0) {
    zoneBannerTimer = Math.max(0, zoneBannerTimer - dt);
    if (zoneBannerTimer === 0) zoneBanner.classList.remove("active");
  }
  if (comboTimer > 0) {
    comboTimer = Math.max(0, comboTimer - dt);
    comboBar.style.transform = `scaleX(${comboTimer / 4})`;
    if (comboTimer === 0) {
      nearMissCombo = 0;
      comboMultiplierEl.textContent = "×0";
      nearMissHud.classList.remove("hot");
    }
  }
  if (feverTimer > 0) {
    feverTimer = Math.max(0, feverTimer - dt);
    shell.classList.toggle("fever-ending", feverTimer > 0 && feverTimer <= 2);
    if (feverTimer === 0) {
      shell.classList.remove("fever", "fever-ending");
    }
  }
  const steer = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  const onSnow = jumpHeight < .08;
  const isTucking = keys.tuck && onSnow;
  const baseSpeed = Math.min(55, 27 + distance * .012);

  // Carving model: input first rolls the skis onto an edge, which changes their
  // heading; lateral motion then follows the ski direction instead of strafing.
  const steeringAuthority = isTucking ? .5 : 1;
  const edgeTarget = steer * (onSnow ? .82 : .08);
  const changingEdge = steer !== 0 && Math.sign(steer) !== Math.sign(edgeAngle);
  const baseEdgeResponse = changingEdge ? .0008 : .0032;
  const edgeResponse = onSnow
    ? Math.pow(baseEdgeResponse, steeringAuthority)
    : .16;
  edgeAngle = THREE.MathUtils.lerp(edgeAngle, edgeTarget, 1 - Math.pow(edgeResponse, dt));

  // Hold a deep, loaded edge and release through neutral to pump out of a turn.
  const edgeMagnitude = Math.abs(edgeAngle);
  if (onSnow && edgeMagnitude > .5) {
    edgeLoadTimer += dt;
    if (edgeLoadTimer >= .4) pumpArmed = true;
  }
  if (onSnow && pumpArmed && edgeMagnitude < .15) {
    addBoost(2.5);
    pumpArmed = false;
    edgeLoadTimer = 0;
    noiseBurst(.075, .075, 3300);
    emitCarveSpray(Math.sign(heading) || 1, 28);
  } else if (onSnow && !pumpArmed && edgeMagnitude < .15) {
    edgeLoadTimer = 0;
  }

  boost *= Math.pow(.6, dt);
  const feverFactor = feverTimer > 0 ? 1.08 : 1;
  const skillSpeed = Math.min(67, (baseSpeed + boost) * (isTucking ? 1.18 : 1));
  speed = skillSpeed *
    (1 - edgeMagnitude * .045) *
    feverFactor;
  progress += speed * dt;
  distance += speed * dt;

  const previousHeading = heading;
  const headingTarget = edgeAngle * .72;
  heading = THREE.MathUtils.lerp(heading, headingTarget, 1 - Math.pow(onSnow ? .028 : .72, dt));
  const turnRate = (heading - previousHeading) / Math.max(dt, .001);
  const lateralTarget = Math.sin(heading) * speed * .94;
  steerVelocity = THREE.MathUtils.lerp(steerVelocity, lateralTarget, 1 - Math.pow(.012, dt));
  playerX += steerVelocity * dt;
  if (playerX < -26 || playerX > 26) {
    playerX = THREE.MathUtils.clamp(playerX, -26, 26);
    steerVelocity *= .35;
    heading *= .62;
    edgeAngle *= .55;
  }
  carveTimer -= dt;
  if (Math.abs(edgeAngle) > .12 && onSnow && carveTimer <= 0) {
    noiseBurst(.11, .018 + speed * .0008, 1250 + Math.abs(edgeAngle) * 800);
    carveTimer = .1;
  }
  if (Math.abs(edgeAngle) > .11 && onSnow) {
    emitCarveSpray(Math.sign(edgeAngle), Math.min(9, 2 + Math.floor(Math.abs(edgeAngle) * 10)));
  }

  const groundY = terrainHeight(playerX, progress);
  const currentCrestY = crestHeight(progress);
  const groundDropRate = (groundY - previousGroundY) / Math.max(dt, .001);
  const crestDropRate = (currentCrestY - previousCrestY) / Math.max(dt, .001);
  crestCooldown = Math.max(0, crestCooldown - dt);
  if (
    state === "playing" &&
    onSnow &&
    jumpHeight === 0 &&
    jumpVelocity === 0 &&
    speed > 38 &&
    groundDropRate < -6 &&
    crestDropRate < -.18 &&
    crestCooldown === 0
  ) {
    airTime = 0;
    jumpVelocity = Math.min(12, 7.2 + Math.abs(crestDropRate) * 3.2);
    crestCooldown = 6;
    crestJumpCount++;
    burstSound("jump");
    showRewardToast("CREST LAUNCH", `${Math.floor(speed * 3.6)} km/h`, "air");
  }
  previousGroundY = groundY;
  previousCrestY = currentCrestY;
  if (jumpHeight > 0 || jumpVelocity > 0) {
    airTime += dt;
    jumpVelocity -= 24 * dt;
    jumpHeight += jumpVelocity * dt;
    if (jumpHeight <= 0) {
      jumpHeight = 0;
      jumpVelocity = 0;
      const completedAirTime = airTime;
      airTime = 0;
      landingCompression = 1;
      shake = Math.max(shake, .15);
      burstSound("land");
      vibrate(20);
      if (completedAirTime >= 1.4) {
        distance += 40;
        showRewardToast("HUGE AIR", "+40m", "air");
        tone(620, .16, "triangle", .045, 1040);
      } else if (completedAirTime >= .8) {
        distance += 15;
        showRewardToast("BIG AIR", "+15m", "air");
        tone(480, .14, "triangle", .04, 760);
      }
      if (Math.abs(edgeAngle) < .15) {
        addBoost(3);
        showRewardToast("PERFECT LANDING", "BOOST +3", "air");
        tone(740, .12, "triangle", .045, 1120);
      } else {
        speed *= .85;
        boost = 0;
        shake = Math.max(shake, .38);
      }
    }
  }

  skier.position.set(playerX, groundY + jumpHeight, 4);
  // Lean is derived from lateral acceleration (v × yaw rate), capped at a
  // plausible high-performance carve angle rather than tied directly to keys.
  const physicalLean = onSnow ? -Math.atan((speed * turnRate) / 9.81) : leanAngle * .97;
  const leanTarget = THREE.MathUtils.clamp(physicalLean, -.72, .72);
  leanAngle = THREE.MathUtils.lerp(leanAngle, leanTarget, 1 - Math.pow(.004, dt));
  landingCompression *= Math.pow(.035, dt);
  const carveLoad = Math.min(1, Math.abs(edgeAngle) * .82 + Math.abs(turnRate) * .16);
  const speedTuck = THREE.MathUtils.clamp((speed - 27) / 70, 0, .26);
  const crouchTarget = onSnow
    ? Math.max(isTucking ? .7 : 0, .12 + speedTuck + carveLoad * .42 + landingCompression * .46)
    : .06;
  crouchAmount = THREE.MathUtils.lerp(crouchAmount, Math.min(.78, crouchTarget), 1 - Math.pow(.006, dt));
  skier.rotation.z = leanAngle;
  skier.rotation.y = THREE.MathUtils.lerp(skier.rotation.y, -heading * .72, 1 - Math.pow(.012, dt));
  skier.userData.torso.rotation.x = .19 + Math.min(.13, speed * .0023);
  skier.userData.shoulders.rotation.y = heading * .22;
  skier.userData.backpack.rotation.z = -leanAngle * .08;
  skierPhoto.scale.y = 1;
  deformSkier(crouchAmount, edgeAngle);
  skierShadow.position.set(playerX, groundY + .025, 4);
  const shadowScale = Math.max(.42, 1 - jumpHeight * .16);
  skierShadow.scale.setScalar(shadowScale);
  skierShadow.material.opacity = .2 * shadowScale;

  while (spawnEnd < progress + 240) {
    populate(spawnEnd, spawnEnd + 80);
    spawnEnd += 80;
  }

  for (let i = objects.length - 1; i >= 0; i--) {
    const o = objects[i];
    const z = 4 - (o.worldZ - progress);
    const previousZ = o.lastZ;
    o.mesh.position.set(o.x, terrainHeight(o.x, o.worldZ), z);
    if (o.type === "tree") o.mesh.lookAt(camera.position.x, o.mesh.position.y, camera.position.z);
    if (o.type === "coin") {
      o.mesh.position.y += 1.25 + o.heightOffset + Math.sin(performance.now() * .004 + o.phase) * .18;
      o.mesh.rotation.y += dt * 4.5;
    }
    const dz = Math.abs(z - 4);
    const dx = Math.abs(o.x - playerX);
    const collisionRadius = o.type === "tree" ? .8 : o.type === "ramp" ? 1.25 : .7;
    const verticalHit = o.type !== "coin" || Math.abs(o.mesh.position.y - (skier.position.y + 1.2)) < 1.15;
    if (diagnosticCollisions && !o.hit && dz < 1.05 && dx < collisionRadius && verticalHit && state === "playing") {
      if (o.type === "coin") {
        o.hit = true;
        collectCoin(o);
        o.mesh.visible = false;
      } else if (o.type === "ramp") {
        o.hit = true;
        jump(17.2);
      } else if (jumpHeight < 1.05) {
        gameOver();
      }
    }
    // Confirm only after passing the collision plane: approaching an obstacle is
    // not enough, and a true collision can never receive the bonus.
    const avoidable = o.type === "tree" || o.type === "rock";
    const crossedPlayer = previousZ < 4.35 && z >= 4.35;
    const nearRadius = o.type === "tree" ? 1.75 : 1.55;
    if (
      avoidable &&
      !o.hit &&
      !o.nearMissed &&
      crossedPlayer &&
      dx >= collisionRadius &&
      dx < nearRadius &&
      jumpHeight < .72 &&
      state === "playing"
    ) {
      o.nearMissed = true;
      registerNearMiss();
    }
    o.lastZ = z;
    if (z > 18) {
      obstacleRoot.remove(o.mesh);
      objects.splice(i, 1);
    }
  }

  distanceEl.innerHTML = `${String(Math.floor(distance)).padStart(4, "0")}<small>m</small>`;
  while (distance >= nextMilestone) {
    triggerMilestone(nextMilestone);
    nextMilestone += 500;
  }
  if (runBest > 0 && !bestBeaten && distance > runBest * .7) {
    const remaining = Math.max(0, Math.ceil(runBest - distance));
    bestChase.textContent = `BEST −${remaining}m`;
  }
  if (runBest > 0 && !bestBeaten && distance >= runBest) {
    bestBeaten = true;
    bestChase.textContent = "NEW RECORD — LIVE";
    distanceHud.classList.add("live-record");
    shell.classList.add("record-flash");
    announce("ベスト更新", 1.15);
  }
  speedEl.innerHTML = `${Math.floor(speed * 3.6)}<small>km/h</small>`;
  coinsEl.textContent = String(coins).padStart(2, "0");

  if (audio && windGain) {
    const tuckWind = isTucking ? 1.35 : 1;
    windGain.gain.setTargetAtTime(muted ? .0001 : (.022 + speed * .00125) * tuckWind, audio.currentTime, .16);
    windFilter.frequency.setTargetAtTime(650 + speed * 30 + (feverTimer > 0 ? 800 : 0) + (isTucking ? 500 : 0), audio.currentTime, .2);
    const howlAmount = THREE.MathUtils.clamp((speed - 45) / 18, 0, 1);
    howlGain.gain.setTargetAtTime(muted ? .0001 : .052 * howlAmount, audio.currentTime, .18);
    howlFilter.frequency.setTargetAtTime(1800 + Math.sin(clock.elapsedTime * .72) * 360, audio.currentTime, .24);
  }
  if (state === "crashing") {
    skier.rotation.z += dt * 2.8;
    skier.rotation.y += dt * 1.25;
  }
}

function updateWorld(dt, elapsed) {
  if (state === "playing" || state === "crashing") updatePlaying(dt);
  else {
    skier.position.y = terrainHeight(skier.position.x, progress) + Math.sin(elapsed * 1.4) * .025;
    if (audio && windGain) windGain.gain.setTargetAtTime(.0001, audio.currentTime, .2);
    if (audio && howlGain) howlGain.gain.setTargetAtTime(.0001, audio.currentTime, .2);
  }

  // Re-shape the piste under the current world position.
  for (let i = 0; i < groundPositions.count; i++) {
    const x = groundPositions.getX(i);
    const localZ = groundPositions.getZ(i) + ground.position.z;
    groundPositions.setY(i, terrainHeight(x, progress + 4 - localZ));
  }
  groundPositions.needsUpdate = true;
  if (Math.floor(elapsed * 12) % 3 === 0) groundGeo.computeVertexNormals();
  snowTexture.offset.y = (progress * .018) % 1;

  pisteMarkers.position.z = (progress % 7);
  pisteMarkers.children.forEach(marker => {
    const localZ = marker.position.z + pisteMarkers.position.z;
    marker.position.y = terrainHeight(marker.position.x, progress + 4 - localZ) + .07;
  });

  const snowArray = snowGeo.attributes.position.array;
  for (let i = 0; i < snowCount; i++) {
    snowArray[i * 3 + 2] += dt * (state === "playing" ? speed * .68 : 1.4);
    snowArray[i * 3] += steerVelocity * dt * -.08;
    if (snowArray[i * 3 + 2] > 12) {
      snowArray[i * 3 + 2] = -92 - Math.random() * 10;
      snowArray[i * 3] = playerX + (Math.random() - .5) * 48;
      snowArray[i * 3 + 1] = Math.random() * 16;
    }
  }
  snowGeo.attributes.position.needsUpdate = true;

  const lineOpacity = state === "playing"
    ? THREE.MathUtils.clamp((speed - 40) / 18, 0, .62)
    : 0;
  speedLineMat.opacity = THREE.MathUtils.lerp(
    speedLineMat.opacity,
    lineOpacity,
    1 - Math.pow(.06, dt)
  );
  speedLines.visible = speedLineMat.opacity > .004;
  for (let i = 0; i < speedLineCount; i++) {
    speedLineZ[i] += dt * speed * 2.5;
    if (speedLineZ[i] > 9) speedLineZ[i] = -58 - Math.random() * 18;
    const x = playerX + speedLineX[i];
    const y = skier.position.y + speedLineY[i];
    const z = speedLineZ[i];
    const lineLength = speedLineLength[i] * (1 + Math.max(0, speed - 40) * .045);
    speedLinePositions[i * 6] = x;
    speedLinePositions[i * 6 + 1] = y;
    speedLinePositions[i * 6 + 2] = z - lineLength;
    speedLinePositions[i * 6 + 3] = x;
    speedLinePositions[i * 6 + 4] = y;
    speedLinePositions[i * 6 + 5] = z;
  }
  speedLineGeo.attributes.position.needsUpdate = true;

  for (let i = 0; i < sprayCount; i++) {
    if (sprayLife[i] <= 0) continue;
    sprayLife[i] -= dt;
    const v = sprayVelocity[i];
    sprayPositions[i * 3] += v.x * dt;
    sprayPositions[i * 3 + 1] += v.y * dt;
    sprayPositions[i * 3 + 2] += v.z * dt;
    v.y -= 7.5 * dt;
    v.multiplyScalar(Math.pow(.22, dt));
    if (sprayLife[i] <= 0) {
      sprayPositions[i * 3] = 999;
      sprayPositions[i * 3 + 1] = 999;
      sprayPositions[i * 3 + 2] = 999;
    }
  }
  sprayGeo.attributes.position.needsUpdate = true;

  shake *= Math.pow(.03, dt);
  // Comfort camera: stable horizon and distance, with only a slow monotonic
  // speed-linked FOV widening. There is no roll, shake, or zoom pulse.
  const targetFov = 66 + THREE.MathUtils.clamp((speed - 27) / 40, 0, 1) * 9;
  const nextFov = THREE.MathUtils.lerp(camera.fov, targetFov, 1 - Math.pow(.5, dt));
  if (Math.abs(nextFov - camera.fov) > .01) {
    camera.fov = nextFov;
    camera.updateProjectionMatrix();
  }
  const targetCamX = playerX;
  const targetCamY = skier.position.y + 4.25;
  camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetCamX, 1 - Math.pow(.0008, dt));
  camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetCamY, 1 - Math.pow(.006, dt));
  camera.position.z = 11.2;
  camera.up.set(0, 1, 0);
  const stableLookX = THREE.MathUtils.lerp(camera.position.x, playerX, .55);
  camera.lookAt(
    stableLookX,
    camera.position.y - 7.15,
    -26
  );
  sun.position.y = skier.position.y + 28;
  sun.target.position.set(skier.position.x, skier.position.y, -8);
}

function animate() {
  requestAnimationFrame(animate);
  const elapsedDt = clock.getDelta();
  const rawDt = Math.min(elapsedDt, .033);
  if (state === "crashing") {
    crashTimer = Math.max(0, crashTimer - elapsedDt);
    if (crashTimer === 0) finishGameOver();
  }
  updateWorld(rawDt * timeScale, clock.elapsedTime);
  renderer.render(scene, camera);
}
animate();

function setKey(code, down) {
  if (code === "ArrowLeft" || code === "KeyA") keys.left = down;
  if (code === "ArrowRight" || code === "KeyD") keys.right = down;
  if (code === "ArrowDown" || code === "KeyS") keys.tuck = down;
}
addEventListener("keydown", e => {
  setKey(e.code, true);
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(e.code)) e.preventDefault();
  if (e.code === "Space" || e.code === "ArrowUp") jump();
  if ((e.code === "Enter" || e.code === "KeyR") && state !== "playing" && state !== "crashing") reset();
});
addEventListener("keyup", e => setKey(e.code, false));
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
});

function bindHold(selector, key) {
  const el = document.querySelector(selector);
  el.addEventListener("pointerdown", e => { e.preventDefault(); keys[key] = true; });
  ["pointerup", "pointercancel", "pointerleave"].forEach(event =>
    el.addEventListener(event, e => { e.preventDefault(); keys[key] = false; })
  );
}
bindHold("#leftButton", "left");
bindHold("#tuckButton", "tuck");
bindHold("#rightButton", "right");
document.querySelector("#jumpButton").addEventListener("pointerdown", e => { e.preventDefault(); jump(); });
startButton.addEventListener("click", reset);
restartButton.addEventListener("click", reset);
document.querySelector("#soundButton").addEventListener("click", e => {
  muted = !muted;
  e.currentTarget.classList.toggle("muted", muted);
  e.currentTarget.textContent = muted ? "×" : "♪";
  e.currentTarget.setAttribute("aria-label", muted ? "サウンドをオン" : "サウンドをオフ");
  if ("speechSynthesis" in window && muted) speechSynthesis.cancel();
  if (audio && masterGain) masterGain.gain.setTargetAtTime(muted ? 0 : .8, audio.currentTime, .03);
  if (!muted) { initAudio(); tone(440); announce("サウンド オン"); }
});

if (gDiagnostics) {
  window.__snowlineG = {
    snapshot: () => ({ state, speed, distance, progress, jumpHeight, jumpVelocity, airTime, crestJumpCount }),
    setRunPosition: value => {
      distance = value;
      progress = value;
      previousGroundY = terrainHeight(playerX, progress);
      previousCrestY = crestHeight(progress);
    },
    setKeys: (left, right, tuck) => {
      keys.left = left;
      keys.right = right;
      keys.tuck = tuck;
    },
    setCollisions: enabled => { diagnosticCollisions = enabled; },
    step: frames => {
      for (let i = 0; i < frames; i++) updatePlaying(1 / 60);
    }
  };
}
