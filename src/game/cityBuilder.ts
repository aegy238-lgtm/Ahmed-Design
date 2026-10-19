import * as THREE from 'three';
import { Landmark } from '../types/game';

export interface AlexandriaWorld {
  rootGroup: THREE.Group;
  colliders: THREE.Box3[];
  roadNetwork: {
    mainCorniche: { startZ: number; endZ: number; width: number; x: number };
    bahariAlleys: Array<{ x1: number; z1: number; x2: number; z2: number; width: number; name: string }>;
  };
  waterMesh: THREE.Mesh;
  landmarks: Landmark[];
  gasStationLocation: { x: number; z: number };
  workshopLocation: { x: number; z: number };
  spawnPoints: {
    corniche: { x: number; y: number; z: number; heading: number };
    stanley: { x: number; y: number; z: number; heading: number };
    bahari: { x: number; y: number; z: number; heading: number };
  };
}

// Procedural high-resolution realistic asphalt road texture
function createRealisticRoadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Deep asphalt with micro-aggregate grain
  ctx.fillStyle = '#262930';
  ctx.fillRect(0, 0, 1024, 1024);

  // Noise & gravel grain
  const imgData = ctx.getImageData(0, 0, 1024, 1024);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 22;
    data[i] = Math.max(25, Math.min(55, data[i] + noise));
    data[i + 1] = Math.max(25, Math.min(55, data[i + 1] + noise));
    data[i + 2] = Math.max(28, Math.min(58, data[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);

  // Tar patch repair cracks (authentic Egyptian road realism)
  ctx.strokeStyle = '#181a1f';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(320, 100);
  ctx.bezierCurveTo(360, 240, 300, 380, 340, 520);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(700, 600);
  ctx.bezierCurveTo(740, 720, 680, 840, 710, 950);
  ctx.stroke();

  // Oil spots near lane centers
  const oilGrad = ctx.createRadialGradient(256, 300, 10, 256, 300, 60);
  oilGrad.addColorStop(0, 'rgba(18, 20, 24, 0.45)');
  oilGrad.addColorStop(1, 'rgba(18, 20, 24, 0)');
  ctx.fillStyle = oilGrad;
  ctx.beginPath();
  ctx.arc(256, 300, 60, 0, Math.PI * 2);
  ctx.fill();

  // Double Solid Yellow Center Line
  ctx.fillStyle = '#eab308';
  ctx.fillRect(506, 0, 5, 1024);
  ctx.fillRect(515, 0, 5, 1024);

  // Dashed White Lane Dividers
  ctx.fillStyle = '#f8fafc';
  for (let y = 0; y < 1024; y += 128) {
    ctx.fillRect(256, y, 6, 64);
    ctx.fillRect(768, y, 6, 64);
  }

  // Outer Edge White Lines
  ctx.fillRect(32, 0, 8, 1024);
  ctx.fillRect(984, 0, 8, 1024);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 35);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Egyptian Yellow-and-Black Curb Stones (بردورة الرصيف المصرية الشهيرة)
function createEgyptianCurbTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  // Alternating black and bright yellow curb segments
  const segW = 64;
  for (let x = 0; x < 256; x += segW * 2) {
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(x, 0, segW, 64);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x + segW, 0, segW, 64);
  }

  // Weathering and wear
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 256, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(40, 1);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Ornate Alexandrian Belle Époque Architecture Façade with famous Egyptian storefronts
function createAlexandriaBuildingTexture(brandName: string, baseColor: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Elegant limestone stucco base
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 1024);

  // Architectural Stringcourses / Moldings
  ctx.fillStyle = '#78350f';
  ctx.fillRect(0, 800, 512, 14);
  ctx.fillRect(0, 560, 512, 10);
  ctx.fillRect(0, 320, 512, 10);
  ctx.fillRect(0, 80, 512, 18); // Ornate Cornice

  // Ground Floor Famous Alexandrian Storefront
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(20, 840, 472, 170);

  // Shop Signboard
  const signGrad = ctx.createLinearGradient(30, 850, 480, 850);
  signGrad.addColorStop(0, '#b91c1c');
  signGrad.addColorStop(1, '#991b1b');
  ctx.fillStyle = signGrad;
  ctx.fillRect(30, 850, 452, 60);

  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 4;
  ctx.strokeRect(30, 850, 452, 60);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 4;
  ctx.fillText(brandName, 256, 890);

  // Store Glass & Interior Glow
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(45, 920, 190, 80);
  ctx.fillRect(275, 920, 190, 80);

  // Upper Floor Windows with Ornate Wrought Iron Balconies
  for (let row = 0; row < 3; row++) {
    const yBase = 120 + row * 240;
    for (let col = 0; col < 3; col++) {
      const xBase = 50 + col * 150;

      // Arched Window Frame
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(xBase + 45, yBase + 35, 45, Math.PI, 0);
      ctx.rect(xBase, yBase + 35, 90, 120);
      ctx.fill();

      // Glass Pane with coastal sky reflection
      const winGrad = ctx.createLinearGradient(xBase, yBase, xBase + 90, yBase + 155);
      winGrad.addColorStop(0, '#38bdf8');
      winGrad.addColorStop(1, '#0284c7');
      ctx.fillStyle = winGrad;
      ctx.beginPath();
      ctx.arc(xBase + 45, yBase + 35, 40, Math.PI, 0);
      ctx.rect(xBase + 5, yBase + 35, 80, 115);
      ctx.fill();

      // Wooden Mediterranean Shutters (شيش خشب)
      ctx.fillStyle = '#15803d'; // Alexandrian coastal green shutters
      ctx.fillRect(xBase - 15, yBase + 20, 18, 135);
      ctx.fillRect(xBase + 87, yBase + 20, 18, 135);

      // Wrought Iron Balcony Railing (حديد فورفورجيه إسكندراني)
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      ctx.strokeRect(xBase - 5, yBase + 105, 100, 50);
      for (let bx = xBase; bx <= xBase + 90; bx += 10) {
        ctx.beginPath();
        ctx.moveTo(bx, yBase + 105);
        ctx.lineTo(bx, yBase + 155);
        ctx.stroke();
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Stanley Bridge Florentine Stonework Texture
function createStanleyStoneTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Warm Mediterranean limestone
  ctx.fillStyle = '#e8dec8';
  ctx.fillRect(0, 0, 512, 512);

  // Stone block mortar lines
  ctx.strokeStyle = '#b8a98f';
  ctx.lineWidth = 4;

  const rowHeight = 42;
  for (let y = 0; y < 512; y += rowHeight) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();

    const offset = (y / rowHeight) % 2 === 0 ? 0 : 45;
    for (let x = offset; x < 512; x += 90) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + rowHeight);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 6);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function buildAlexandriaCity(): AlexandriaWorld {
  const root = new THREE.Group();
  root.name = 'RealisticAlexandriaCity';
  const colliders: THREE.Box3[] = [];

  // 1. Terrain & The Mediterranean Sea
  // Sea Floor Sand
  const sandMat = new THREE.MeshStandardMaterial({
    color: 0xdfcbaf,
    roughness: 0.92,
    metalness: 0.05,
  });
  const beach = new THREE.Mesh(new THREE.PlaneGeometry(240, 900), sandMat);
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(-80, -2.2, 0);
  beach.receiveShadow = true;
  root.add(beach);

  // Realistic Mediterranean Sea with depth and shimmer
  const seaGeo = new THREE.PlaneGeometry(800, 1100, 80, 80);
  const seaMat = new THREE.MeshPhysicalMaterial({
    color: 0x0284c7, // Alexandria turquoise blue
    roughness: 0.12,
    metalness: 0.75,
    transmission: 0.45,
    transparent: true,
    opacity: 0.9,
    reflectivity: 0.9,
    ior: 1.333,
  });
  const waterMesh = new THREE.Mesh(seaGeo, seaMat);
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.position.set(-320, -1.6, 0);
  waterMesh.receiveShadow = true;
  root.add(waterMesh);

  // City ground base (paved pedestrian concourse)
  const cityGroundMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 });
  const cityGround = new THREE.Mesh(new THREE.PlaneGeometry(350, 900), cityGroundMat);
  cityGround.rotation.x = -Math.PI / 2;
  cityGround.position.set(150, 0, 0);
  cityGround.receiveShadow = true;
  root.add(cityGround);

  // 2. The Great Corniche (طريق الكورنيش الساحلي 4 حارات)
  const roadTex = createRealisticRoadTexture();
  const roadMat = new THREE.MeshStandardMaterial({
    map: roadTex,
    roughness: 0.55,
    metalness: 0.15,
  });
  const roadGeo = new THREE.PlaneGeometry(22, 760);
  const cornicheRoad = new THREE.Mesh(roadGeo, roadMat);
  cornicheRoad.rotation.x = -Math.PI / 2;
  cornicheRoad.position.set(0, 0.06, 0);
  cornicheRoad.receiveShadow = true;
  root.add(cornicheRoad);

  // Egyptian Yellow/Black Curb Stones
  const curbMat = new THREE.MeshStandardMaterial({
    map: createEgyptianCurbTexture(),
    roughness: 0.7,
  });

  const seaCurb = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.28, 760), curbMat);
  seaCurb.position.set(-11.18, 0.14, 0);
  seaCurb.castShadow = true;
  root.add(seaCurb);

  const cityCurb = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.28, 760), curbMat);
  cityCurb.position.set(11.18, 0.14, 0);
  cityCurb.castShadow = true;
  root.add(cityCurb);

  // Seaside Promenade with Stone Balustrade (سور الكورنيش)
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xe2d7c5,
    roughness: 0.8,
  });

  const promenade = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.35, 760), stoneMat);
  promenade.position.set(-14.6, 0.18, 0);
  promenade.receiveShadow = true;
  root.add(promenade);

  // Solid Alexandria Sea Wall Coping (سور البحر الحامي)
  const seaWall = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.25, 760), stoneMat);
  seaWall.position.set(-17.6, 0.65, 0);
  seaWall.castShadow = true;
  root.add(seaWall);
  colliders.push(new THREE.Box3().setFromObject(seaWall));

  // City-side Sidewalk
  const citySidewalk = new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 760), stoneMat);
  citySidewalk.position.set(14.3, 0.15, 0);
  citySidewalk.receiveShadow = true;
  root.add(citySidewalk);

  // 3. Iconic Stanley Bridge (كوبري ستانلي المعماري الرائع)
  const stanleyGroup = new THREE.Group();
  stanleyGroup.name = 'RealisticStanleyBridge';

  const stanleyDeckMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.55 });
  const bridgeDeck = new THREE.Mesh(new THREE.BoxGeometry(22, 0.5, 100), stanleyDeckMat);
  bridgeDeck.position.set(0, 0.6, 90);
  bridgeDeck.receiveShadow = true;
  stanleyGroup.add(bridgeDeck);

  // Smooth incline ramps to bridge deck
  const southRamp = new THREE.Mesh(new THREE.BoxGeometry(22, 0.45, 22), stanleyDeckMat);
  southRamp.position.set(0, 0.32, 30);
  southRamp.rotation.x = 0.035;
  southRamp.receiveShadow = true;
  stanleyGroup.add(southRamp);

  const northRamp = new THREE.Mesh(new THREE.BoxGeometry(22, 0.45, 22), stanleyDeckMat);
  northRamp.position.set(0, 0.32, 150);
  northRamp.rotation.x = -0.035;
  northRamp.receiveShadow = true;
  stanleyGroup.add(northRamp);

  // Water Channel beneath Stanley Bridge
  const stanleyWater = new THREE.Mesh(new THREE.PlaneGeometry(90, 160), seaMat);
  stanleyWater.rotation.x = -Math.PI / 2;
  stanleyWater.position.set(12, -1.6, 90);
  root.add(stanleyWater);

  // Stanley Towers (Florentine Architecture with Arched Towers & Terracotta Roofs)
  const towerStoneMat = new THREE.MeshStandardMaterial({
    map: createStanleyStoneTexture(),
    roughness: 0.65,
    metalness: 0.1,
  });

  const roofTileMat = new THREE.MeshStandardMaterial({
    color: 0xb91c1c, // Mediterranean red terracotta
    roughness: 0.6,
  });

  const buildFlorentineTower = (xPos: number, zPos: number) => {
    const tg = new THREE.Group();

    // Massive Stone Base in water
    const basePillar = new THREE.Mesh(new THREE.BoxGeometry(6.5, 14, 6.5), towerStoneMat);
    basePillar.position.y = 5;
    tg.add(basePillar);

    // Archway Main Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(5.2, 20, 5.2), towerStoneMat);
    body.position.y = 16;
    body.castShadow = true;
    tg.add(body);

    // Tower Arch Balcony
    const archBalcony = new THREE.Mesh(new THREE.BoxGeometry(2.4, 4.5, 5.4), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
    archBalcony.position.y = 18;
    tg.add(archBalcony);

    // Pyramidal Terracotta Roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(4.2, 7.5, 4), roofTileMat);
    roof.position.y = 29.5;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    tg.add(roof);

    // Warm Lantern Light on the tower
    const towerLight = new THREE.PointLight(0xf59e0b, 1.8, 25);
    towerLight.position.set(0, 12, 0);
    tg.add(towerLight);

    tg.position.set(xPos, 0, zPos);
    return tg;
  };

  const towerPositions = [
    [-12.2, 60],
    [12.2, 60],
    [-12.2, 120],
    [12.2, 120],
  ];

  towerPositions.forEach(([tx, tz]) => {
    const t = buildFlorentineTower(tx, tz);
    stanleyGroup.add(t);

    const tBox = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(tx, 6, tz),
      new THREE.Vector3(5.5, 14, 5.5)
    );
    colliders.push(tBox);
  });

  // Suspension Steel Cables
  const cableMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.9, roughness: 0.1 });
  const cableL = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 64, 8), cableMat);
  cableL.position.set(-12.2, 18, 90);
  cableL.rotation.x = Math.PI / 2;
  stanleyGroup.add(cableL);

  const cableR = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 64, 8), cableMat);
  cableR.position.set(12.2, 18, 90);
  cableR.rotation.x = Math.PI / 2;
  stanleyGroup.add(cableR);

  root.add(stanleyGroup);

  // 4. Alexandria Corniche Historic High-Rises & Famous Stores
  // Store names inspired by authentic famous Alexandrian icons
  const stores = [
    { brand: 'كبدة الفلاح - بحري', color: '#fef3c7' },
    { brand: 'أسماك قدورة - الكورنيش', color: '#e0f2fe' },
    { brand: 'جيلاتي عزة - بحري', color: '#fbcfe8' },
    { brand: 'حلويات صابر والأرز باللبن', color: '#fed7aa' },
    { brand: 'قهوة فاروق التراثية ☕', color: '#fef08a' },
    { brand: 'مطعم بلبع للمشويات 🥩', color: '#dcfce7' },
  ];

  const buildingBlocks = [
    // Front Promenade Row
    { x: 32, z: -260, w: 22, d: 45, h: 36, storeIdx: 0 },
    { x: 32, z: -140, w: 22, d: 52, h: 42, storeIdx: 1 },
    { x: 32, z: -50, w: 22, d: 46, h: 38, storeIdx: 2 },
    { x: 32, z: 210, w: 22, d: 48, h: 35, storeIdx: 3 },
    { x: 32, z: 310, w: 22, d: 56, h: 40, storeIdx: 4 },

    // Middle Row (Bahari Alleys)
    { x: 68, z: -240, w: 26, d: 40, h: 26, storeIdx: 5 },
    { x: 68, z: -150, w: 26, d: 44, h: 28, storeIdx: 0 },
    { x: 68, z: -40, w: 26, d: 40, h: 24, storeIdx: 1 },
    { x: 68, z: 220, w: 26, d: 42, h: 28, storeIdx: 2 },
    { x: 68, z: 310, w: 26, d: 48, h: 25, storeIdx: 3 },

    // Deep City Row
    { x: 140, z: -210, w: 38, d: 85, h: 32, storeIdx: 4 },
    { x: 140, z: -80, w: 38, d: 95, h: 36, storeIdx: 5 },
    { x: 140, z: 60, w: 38, d: 75, h: 34, storeIdx: 0 },
    { x: 140, z: 210, w: 38, d: 85, h: 38, storeIdx: 1 },
  ];

  buildingBlocks.forEach(b => {
    const s = stores[b.storeIdx % stores.length];
    const tex = createAlexandriaBuildingTexture(s.brand, s.color);
    const bMat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.65,
      metalness: 0.1,
    });
    const bMesh = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), bMat);
    bMesh.position.set(b.x, b.h / 2, b.z);
    bMesh.castShadow = true;
    bMesh.receiveShadow = true;
    root.add(bMesh);

    // Decorative roof balustrade
    const roofCoping = new THREE.Mesh(
      new THREE.BoxGeometry(b.w + 0.6, 0.8, b.d + 0.6),
      new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 })
    );
    roofCoping.position.set(b.x, b.h + 0.4, b.z);
    root.add(roofCoping);

    colliders.push(new THREE.Box3().setFromObject(bMesh));
  });

  // 5. Citadel of Qaitbay (قلعة قايتباي التراثية على البحر) at z = -320
  const qaitbayGroup = new THREE.Group();
  qaitbayGroup.name = 'QaitbayCitadel';
  const fortStoneMat = new THREE.MeshStandardMaterial({
    map: createStanleyStoneTexture(),
    roughness: 0.75,
  });

  const outerFort = new THREE.Mesh(new THREE.BoxGeometry(50, 9, 50), fortStoneMat);
  outerFort.position.set(-35, 4.5, -320);
  outerFort.castShadow = true;
  qaitbayGroup.add(outerFort);

  const mainKeep = new THREE.Mesh(new THREE.BoxGeometry(24, 20, 24), fortStoneMat);
  mainKeep.position.set(-35, 14.5, -320);
  mainKeep.castShadow = true;
  qaitbayGroup.add(mainKeep);

  // Egyptian Flag atop Citadel
  const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 12, 8), new THREE.MeshStandardMaterial({ color: 0xffffff }));
  flagPole.position.set(-35, 28, -320);
  qaitbayGroup.add(flagPole);

  const flagCanvas = document.createElement('canvas');
  flagCanvas.width = 128;
  flagCanvas.height = 64;
  const fctx = flagCanvas.getContext('2d')!;
  fctx.fillStyle = '#dc2626'; fctx.fillRect(0, 0, 128, 21);
  fctx.fillStyle = '#ffffff'; fctx.fillRect(0, 21, 128, 22);
  fctx.fillStyle = '#0f172a'; fctx.fillRect(0, 43, 128, 21);
  fctx.fillStyle = '#f59e0b'; fctx.fillRect(58, 27, 12, 10);
  const egyptFlag = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 2.4),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(flagCanvas), side: THREE.DoubleSide })
  );
  egyptFlag.position.set(-33, 31, -320);
  qaitbayGroup.add(egyptFlag);

  root.add(qaitbayGroup);
  colliders.push(new THREE.Box3().setFromObject(outerFort));

  // 6. Alexandria Library (مكتبة الإسكندرية الدائرية) at z = -105
  const libGroup = new THREE.Group();
  libGroup.name = 'AlexandriaLibrary';
  const libDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(20, 20, 14, 36),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.65, roughness: 0.25 })
  );
  libDisc.position.set(40, 6, -105);
  libDisc.rotation.z = 0.28;
  libDisc.castShadow = true;
  libGroup.add(libDisc);
  root.add(libGroup);
  colliders.push(new THREE.Box3().setFromObject(libDisc));

  // 7. Gas Station & Mechanic Workshop
  const gasStationGroup = new THREE.Group();
  gasStationGroup.name = 'GasStation';
  const gasCanopy = new THREE.Mesh(
    new THREE.BoxGeometry(18, 1.2, 26),
    new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.6, roughness: 0.25 })
  );
  gasCanopy.position.set(36, 6, -20);
  gasCanopy.castShadow = true;
  gasStationGroup.add(gasCanopy);

  // Pillars & Pumps
  [-6, 6].forEach(px => {
    [-9, 9].forEach(pz => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 6, 12), new THREE.MeshStandardMaterial({ color: 0xffffff }));
      p.position.set(36 + px, 3, -20 + pz);
      gasStationGroup.add(p);
    });
  });

  const gasSignCanvas = document.createElement('canvas');
  gasSignCanvas.width = 512;
  gasSignCanvas.height = 128;
  const gsctx = gasSignCanvas.getContext('2d')!;
  gsctx.fillStyle = '#0284c7';
  gsctx.fillRect(0, 0, 512, 128);
  gsctx.fillStyle = '#ffffff';
  gsctx.font = 'bold 44px Arial, sans-serif';
  gsctx.textAlign = 'center';
  gsctx.fillText('⛽ محطة وقود مصر للبترول', 256, 75);
  const gasSign = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 2.5),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(gasSignCanvas) })
  );
  gasSign.position.set(36, 7.2, -6.8);
  gasStationGroup.add(gasSign);
  root.add(gasStationGroup);

  // Mechanic Workshop
  const wsMesh = new THREE.Mesh(
    new THREE.BoxGeometry(20, 6.5, 24),
    new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.65 })
  );
  wsMesh.position.set(36, 3.25, 190);
  wsMesh.castShadow = true;
  root.add(wsMesh);
  colliders.push(new THREE.Box3().setFromObject(wsMesh));

  // 8. Mediterranean Palm Trees & Realistic Sodium Street Lamps
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3111, roughness: 0.95 });
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.55, side: THREE.DoubleSide });
  const lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.2 });

  const buildRealisticPalm = (x: number, z: number) => {
    const pg = new THREE.Group();
    // Segmented realistic palm trunk with natural tilt
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.48, 8.5, 10), trunkMat);
    trunk.position.y = 4.25;
    trunk.rotation.z = (Math.random() - 0.5) * 0.12;
    trunk.castShadow = true;
    pg.add(trunk);

    // Arching coconut fronds
    for (let i = 0; i < 11; i++) {
      const angle = (i / 11) * Math.PI * 2;
      const frond = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.08, 4.4), frondMat);
      frond.position.set(Math.sin(angle) * 1.8, 8.1, Math.cos(angle) * 1.8);
      frond.rotation.y = angle;
      frond.rotation.x = -0.42;
      frond.castShadow = true;
      pg.add(frond);
    }
    pg.position.set(x, 0, z);
    return pg;
  };

  const buildModernStreetLamp = (x: number, z: number, isRight: boolean) => {
    const lg = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 7.5, 8), lampPoleMat);
    pole.position.y = 3.75;
    lg.add(pole);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, 0.1), lampPoleMat);
    arm.position.set(isRight ? -0.9 : 0.9, 7.5, 0);
    lg.add(arm);

    const lantern = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfef08a, emissiveIntensity: 1.2 })
    );
    lantern.position.set(isRight ? -1.8 : 1.8, 7.3, 0);
    lg.add(lantern);

    const pointLight = new THREE.PointLight(0xfff7ed, 1.4, 22, 1.4);
    pointLight.position.set(isRight ? -1.8 : 1.8, 7.2, 0);
    lg.add(pointLight);

    lg.position.set(x, 0, z);
    return lg;
  };

  for (let z = -330; z <= 340; z += 38) {
    // Palms on seaside promenade
    root.add(buildRealisticPalm(-14.2, z + (Math.random() * 4 - 2)));
    // Street lamps along road
    root.add(buildModernStreetLamp(11.8, z, true));
    // Additional lamps on Stanley bridge
    if (z >= 35 && z <= 145) {
      root.add(buildModernStreetLamp(-10.8, z, false));
    }
  }

  // Defined Landmarks
  const landmarks: Landmark[] = [
    { id: 'stanley', nameAr: 'كوبري ستانلي', x: 0, z: 90, color: '#38bdf8', icon: 'bridge' },
    { id: 'qaitbay', nameAr: 'قلعة قايتباي والأنفوشي', x: -10, z: -310, color: '#f59e0b', icon: 'fort' },
    { id: 'library', nameAr: 'مكتبة الإسكندرية والشاطبي', x: 26, z: -105, color: '#10b981', icon: 'book' },
    { id: 'gas_station', nameAr: 'محطة بنزين مصر للبترول', x: 30, z: -20, color: '#ef4444', icon: 'fuel' },
    { id: 'workshop', nameAr: 'ورشة الأسطى حسن', x: 30, z: 190, color: '#d97706', icon: 'wrench' },
    { id: 'bahari_market', nameAr: 'سوق بحري والأنفوشي', x: 68, z: -180, color: '#8b5cf6', icon: 'store' },
    { id: 'sidi_bisher', nameAr: 'محطة سيدي بشر وميامي', x: 16, z: 290, color: '#06b6d4', icon: 'map-pin' },
  ];

  return {
    rootGroup: root,
    colliders,
    roadNetwork: {
      mainCorniche: { startZ: -360, endZ: 360, width: 22, x: 0 },
      bahariAlleys: [
        { x1: 0, z1: -180, x2: 120, z2: -180, width: 14, name: 'شارع رأس التين والأنفوشي' },
        { x1: 0, z1: -80, x2: 120, z2: -80, width: 14, name: 'شارع محطة الرمل' },
        { x1: 0, z1: 0, x2: 120, z2: 0, width: 14, name: 'شارع الأزاريطة' },
        { x1: 0, z1: 180, x2: 120, z2: 180, width: 14, name: 'شارع جليم' },
        { x1: 0, z1: 280, x2: 120, z2: 280, width: 14, name: 'شارع سيدي بشر' },
      ],
    },
    waterMesh,
    landmarks,
    gasStationLocation: { x: 36, z: -20 },
    workshopLocation: { x: 36, z: 190 },
    spawnPoints: {
      corniche: { x: 4.5, y: 0.1, z: 0, heading: 0 },
      stanley: { x: 4.5, y: 0.6, z: 45, heading: 0 },
      bahari: { x: 68, y: 0.1, z: -180, heading: Math.PI / 2 },
    },
  };
}
