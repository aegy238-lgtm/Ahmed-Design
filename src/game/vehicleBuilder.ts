import * as THREE from 'three';
import { VehicleType } from '../types/game';

// Helper to create ultra-crisp procedural PBR textures
function createAsphaltTireTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1e2229';
  ctx.fillRect(0, 0, 256, 256);

  // Deep rubber tread grooves
  ctx.fillStyle = '#111317';
  for (let y = 0; y < 256; y += 16) {
    ctx.fillRect(0, y, 256, 6);
    for (let x = 0; x < 256; x += 32) {
      ctx.fillRect(x + (y % 32 === 0 ? 0 : 16), y - 6, 8, 12);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 1);
  return texture;
}

function createRimTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Silver alloy rim background
  const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 128);
  grad.addColorStop(0, '#f1f5f9');
  grad.addColorStop(0.7, '#cbd5e1');
  grad.addColorStop(1, '#64748b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // 5 sporty alloy spokes
  ctx.fillStyle = '#0f172a';
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    ctx.save();
    ctx.translate(128, 128);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.arc(60, 0, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Center hub & lug nuts
  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.arc(128, 128, 22, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ALEX', 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createTaxiSideCheckers(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Vibrant Egyptian Taxi Yellow
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(0, 0, 512, 128);

  // Double black racing stripes with checker pattern
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 44, 512, 40);

  const sq = 20;
  ctx.fillStyle = '#f59e0b';
  for (let x = 0; x < 512; x += sq * 2) {
    ctx.fillRect(x, 44, sq, sq);
    ctx.fillRect(x + sq, 64, sq, sq);
  }

  // Official Alexandria Taxi Arabic Calligraphy & Badge
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 4;
  ctx.fillText('تاكسي إسكندرية ⚓ ALEXANDRIA TAXI', 256, 32);

  ctx.font = 'bold 18px Arial, sans-serif';
  ctx.fillText('أجرة بالعداد • عاصمة البحر الأبيض المتوسط', 256, 110);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createTaxiRoofSignTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 512, 128);

  // Red Taxi emblem
  ctx.fillStyle = '#dc2626';
  ctx.font = '900 64px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TAXI تاكسي', 256, 64);

  // Yellow trim
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 504, 120);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createEgyptianLicensePlate(num: string = 'س ق د ٩٢٨'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;

  // Egyptian Taxi Plate: Orange-Gold Header
  ctx.fillStyle = '#ea580c';
  ctx.fillRect(0, 0, 256, 34);

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 34, 256, 62);

  // Outer border & divider
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 252, 92);
  ctx.beginPath();
  ctx.moveTo(0, 34);
  ctx.lineTo(256, 34);
  ctx.stroke();

  // Egyptian emblem text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('مِصْر • EGYPT', 128, 24);

  // Arabic numbers & letters
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 36px Arial, sans-serif';
  ctx.fillText(num, 128, 76);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createTukTukCanopyTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Black waterproof leather canopy
  ctx.fillStyle = '#1e1b4b';
  ctx.fillRect(0, 0, 512, 512);

  // Golden decorative Alexandria trim
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 12;
  ctx.strokeRect(16, 16, 480, 480);

  // Egyptian folk calligraphy
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 42px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('عين الحسود فيها عود 🧿', 256, 230);
  ctx.fillText('إسكندرية ماريا ⚓', 256, 290);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export interface BuiltVehicle {
  group: THREE.Group;
  frontLeftWheel: THREE.Object3D;
  frontRightWheel: THREE.Object3D;
  rearLeftWheel: THREE.Object3D;
  rearRightWheel: THREE.Object3D;
  headlights: THREE.Light[];
  taillightMaterials: THREE.MeshStandardMaterial[];
  bodyMesh: THREE.Mesh;
}

/**
 * High-End Realistic Alexandria Taxi
 * Multi-part composite model with metallic clearcoat, beveled chrome bumpers,
 * detailed wheels with brake discs, glass reflections, and contact shadow.
 */
export function buildAlexandriaTaxi(customColor?: string): BuiltVehicle {
  const group = new THREE.Group();
  group.name = 'RealisticAlexandriaTaxi';

  const bodyColor = customColor || '#f59e0b'; // Iconic Alexandria yellow
  const carPaintMat = new THREE.MeshPhysicalMaterial({
    color: bodyColor,
    metalness: 0.65,
    roughness: 0.22,
    clearcoat: 0.9,
    clearcoatRoughness: 0.1,
    reflectivity: 0.8,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    metalness: 0.96,
    roughness: 0.08,
  });

  const blackTrimMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.85,
    metalness: 0.1,
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    metalness: 0.1,
    roughness: 0.05,
    transmission: 0.82,
    transparent: true,
    opacity: 0.55,
    ior: 1.52,
  });

  const headlightGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    emissive: 0xfffbeb,
    emissiveIntensity: 0.9,
    metalness: 0.1,
    roughness: 0.05,
    transmission: 0.6,
  });

  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    emissive: 0x991b1b,
    emissiveIntensity: 0.7,
    roughness: 0.2,
  });

  // 1. Soft Contact Shadow Plane Grounding Car to Asphalt
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const sctx = shadowCanvas.getContext('2d')!;
  const sgrad = sctx.createRadialGradient(64, 64, 20, 64, 64, 64);
  sgrad.addColorStop(0, 'rgba(0,0,0,0.75)');
  sgrad.addColorStop(0.6, 'rgba(0,0,0,0.4)');
  sgrad.addColorStop(1, 'rgba(0,0,0,0)');
  sctx.fillStyle = sgrad;
  sctx.fillRect(0, 0, 128, 128);
  const shadowTex = new THREE.CanvasTexture(shadowCanvas);

  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 5.2),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.7, depthWrite: false })
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.03;
  group.add(contactShadow);

  // 2. Lower Chassis & Aerodynamic Body
  const lowerBodyGeo = new THREE.BoxGeometry(1.92, 0.52, 4.3);
  const lowerBodyMesh = new THREE.Mesh(lowerBodyGeo, carPaintMat);
  lowerBodyMesh.position.y = 0.52;
  lowerBodyMesh.castShadow = true;
  lowerBodyMesh.receiveShadow = true;
  group.add(lowerBodyMesh);

  // Front Hood Scoop / Sloped Bonnet
  const hoodGeo = new THREE.BoxGeometry(1.86, 0.22, 1.45);
  const hood = new THREE.Mesh(hoodGeo, carPaintMat);
  hood.position.set(0, 0.66, 1.25);
  hood.rotation.x = 0.06;
  hood.castShadow = true;
  group.add(hood);

  // Trunk / Rear Boot
  const trunkGeo = new THREE.BoxGeometry(1.86, 0.26, 1.15);
  const trunk = new THREE.Mesh(trunkGeo, carPaintMat);
  trunk.position.set(0, 0.68, -1.45);
  trunk.castShadow = true;
  group.add(trunk);

  // 3. Cabin & Slanted Windshield Pillars
  const cabinGeo = new THREE.BoxGeometry(1.68, 0.58, 2.15);
  const cabin = new THREE.Mesh(cabinGeo, carPaintMat);
  cabin.position.set(0, 1.05, -0.15);
  cabin.castShadow = true;
  group.add(cabin);

  // Windshields
  const frontWindshield = new THREE.Mesh(new THREE.PlaneGeometry(1.58, 0.58), glassMat);
  frontWindshield.position.set(0, 1.06, 0.94);
  frontWindshield.rotation.x = -0.32;
  group.add(frontWindshield);

  const rearWindshield = new THREE.Mesh(new THREE.PlaneGeometry(1.58, 0.56), glassMat);
  rearWindshield.position.set(0, 1.06, -1.24);
  rearWindshield.rotation.x = 0.32;
  rearWindshield.rotation.y = Math.PI;
  group.add(rearWindshield);

  // Side Windows
  const sideWinGeo = new THREE.PlaneGeometry(1.9, 0.42);
  const leftWin = new THREE.Mesh(sideWinGeo, glassMat);
  leftWin.position.set(0.85, 1.06, -0.15);
  leftWin.rotation.y = Math.PI / 2;
  group.add(leftWin);

  const rightWin = new THREE.Mesh(sideWinGeo, glassMat);
  rightWin.position.set(-0.85, 1.06, -0.15);
  rightWin.rotation.y = -Math.PI / 2;
  group.add(rightWin);

  // 4. Side Decals (Alexandria Iconic Yellow & Black Checkers)
  const checkerMat = new THREE.MeshStandardMaterial({
    map: createTaxiSideCheckers(),
    roughness: 0.3,
    metalness: 0.2,
  });
  const leftChecker = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.46), checkerMat);
  leftChecker.position.set(0.965, 0.52, 0);
  leftChecker.rotation.y = Math.PI / 2;
  group.add(leftChecker);

  const rightChecker = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.46), checkerMat);
  rightChecker.position.set(-0.965, 0.52, 0);
  rightChecker.rotation.y = -Math.PI / 2;
  group.add(rightChecker);

  // 5. TAXI Illuminated Roof Lightbar
  const signMat = new THREE.MeshStandardMaterial({
    map: createTaxiRoofSignTexture(),
    emissive: 0xffffff,
    emissiveIntensity: 0.4,
    roughness: 0.15,
  });
  const taxiSign = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.22, 0.3), signMat);
  taxiSign.position.set(0, 1.45, -0.15);
  taxiSign.castShadow = true;
  group.add(taxiSign);

  // Chrome sign brackets
  const bracketL = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12), chromeMat);
  bracketL.position.set(0.35, 1.37, -0.15);
  group.add(bracketL);
  const bracketR = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12), chromeMat);
  bracketR.position.set(-0.35, 1.37, -0.15);
  group.add(bracketR);

  // 6. Chrome Grille & Bumpers (Classic Peugeot / Lada Styling)
  const frontGrille = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.26, 0.08), blackTrimMat);
  frontGrille.position.set(0, 0.58, 2.16);
  group.add(frontGrille);

  const alexLogo = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.09, 16), chromeMat);
  alexLogo.rotation.x = Math.PI / 2;
  alexLogo.position.set(0, 0.58, 2.18);
  group.add(alexLogo);

  // Front & Rear Chrome Bumpers with Overriders
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.18, 0.22), chromeMat);
  frontBumper.position.set(0, 0.32, 2.2);
  frontBumper.castShadow = true;
  group.add(frontBumper);

  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.18, 0.22), chromeMat);
  rearBumper.position.set(0, 0.32, -2.18);
  rearBumper.castShadow = true;
  group.add(rearBumper);

  // 7. Egyptian License Plates
  const plateMat = new THREE.MeshBasicMaterial({ map: createEgyptianLicensePlate('س ق د ٩٢٨') });
  const frontPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.22), plateMat);
  frontPlate.position.set(0, 0.32, 2.32);
  group.add(frontPlate);

  const rearPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.22), plateMat);
  rearPlate.position.set(0, 0.32, -2.3);
  rearPlate.rotation.y = Math.PI;
  group.add(rearPlate);

  // 8. Headlights & Night Spotlights
  const hlGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.12, 20);
  hlGeo.rotateX(Math.PI / 2);

  const leftHL = new THREE.Mesh(hlGeo, headlightGlassMat);
  leftHL.position.set(0.72, 0.6, 2.15);
  group.add(leftHL);

  const rightHL = new THREE.Mesh(hlGeo, headlightGlassMat);
  rightHL.position.set(-0.72, 0.6, 2.15);
  group.add(rightHL);

  // Headlight spot cones with realistic throw
  const spotLeft = new THREE.SpotLight(0xfffaed, 3.0, 45, Math.PI / 5.5, 0.5);
  spotLeft.position.set(0.72, 0.6, 2.15);
  const targetL = new THREE.Object3D();
  targetL.position.set(0.72, 0, 20);
  group.add(targetL);
  spotLeft.target = targetL;
  group.add(spotLeft);

  const spotRight = new THREE.SpotLight(0xfffaed, 3.0, 45, Math.PI / 5.5, 0.5);
  spotRight.position.set(-0.72, 0.6, 2.15);
  const targetR = new THREE.Object3D();
  targetR.position.set(-0.72, 0, 20);
  group.add(targetR);
  spotRight.target = targetR;
  group.add(spotRight);

  // Rear Taillights
  const leftTL = new THREE.Mesh(hlGeo, taillightMat);
  leftTL.position.set(0.75, 0.6, -2.15);
  group.add(leftTL);

  const rightTL = new THREE.Mesh(hlGeo, taillightMat);
  rightTL.position.set(-0.75, 0.6, -2.15);
  group.add(rightTL);

  // 9. Side Mirrors & Exhaust Pipe
  const mirrorGeo = new THREE.BoxGeometry(0.12, 0.08, 0.16);
  const leftMirror = new THREE.Mesh(mirrorGeo, chromeMat);
  leftMirror.position.set(0.98, 0.95, 0.7);
  group.add(leftMirror);

  const rightMirror = new THREE.Mesh(mirrorGeo, chromeMat);
  rightMirror.position.set(-0.98, 0.95, 0.7);
  group.add(rightMirror);

  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.35, 12), chromeMat);
  exhaust.rotation.x = Math.PI / 2;
  exhaust.position.set(-0.65, 0.22, -2.25);
  group.add(exhaust);

  // 10. High-Detail Wheels with Disc Brakes and Alloy Rims
  const tireTex = createAsphaltTireTexture();
  const rimTex = createRimTexture();

  const wheelBuilder = () => {
    const wg = new THREE.Group();

    // Rubber Tire with deep treads
    const tireMat = new THREE.MeshStandardMaterial({
      map: tireTex,
      roughness: 0.85,
      metalness: 0.15,
    });
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.28, 24), tireMat);
    tire.geometry.rotateZ(Math.PI / 2);
    tire.castShadow = true;
    wg.add(tire);

    // Alloy Rim disc face
    const rimMat = new THREE.MeshStandardMaterial({
      map: rimTex,
      metalness: 0.92,
      roughness: 0.12,
    });
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.29, 20), rimMat);
    rim.geometry.rotateZ(Math.PI / 2);
    wg.add(rim);

    // Brake disc rotor inside
    const rotorMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
    const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.22, 16), rotorMat);
    rotor.geometry.rotateZ(Math.PI / 2);
    wg.add(rotor);

    return wg;
  };

  const frontLeftWheel = wheelBuilder();
  frontLeftWheel.position.set(0.96, 0.36, 1.32);
  group.add(frontLeftWheel);

  const frontRightWheel = wheelBuilder();
  frontRightWheel.position.set(-0.96, 0.36, 1.32);
  group.add(frontRightWheel);

  const rearLeftWheel = wheelBuilder();
  rearLeftWheel.position.set(0.96, 0.36, -1.32);
  group.add(rearLeftWheel);

  const rearRightWheel = wheelBuilder();
  rearRightWheel.position.set(-0.96, 0.36, -1.32);
  group.add(rearRightWheel);

  return {
    group,
    frontLeftWheel,
    frontRightWheel,
    rearLeftWheel,
    rearRightWheel,
    headlights: [spotLeft, spotRight],
    taillightMaterials: [taillightMat],
    bodyMesh: lowerBodyMesh,
  };
}

/**
 * High-End Realistic Egyptian Tuk-Tuk
 * Tubular chrome roll-cage, patterned canopy cloth, single front steering fork,
 * golden tassels, authentic decals, and detailed engine box.
 */
export function buildEgyptianTukTuk(customColor?: string): BuiltVehicle {
  const group = new THREE.Group();
  group.name = 'RealisticEgyptianTukTuk';

  const bodyColor = customColor || '#dc2626'; // Iconic Egyptian red or custom
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: bodyColor,
    metalness: 0.55,
    roughness: 0.25,
    clearcoat: 0.8,
  });

  const canopyMat = new THREE.MeshStandardMaterial({
    map: createTukTukCanopyTexture(),
    roughness: 0.85,
    metalness: 0.1,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    metalness: 0.95,
    roughness: 0.1,
  });

  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.85,
    roughness: 0.2,
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x93c5fd,
    transmission: 0.85,
    transparent: true,
    opacity: 0.55,
    roughness: 0.08,
  });

  // Soft contact shadow
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const sctx = shadowCanvas.getContext('2d')!;
  const sgrad = sctx.createRadialGradient(64, 64, 15, 64, 64, 64);
  sgrad.addColorStop(0, 'rgba(0,0,0,0.7)');
  sgrad.addColorStop(1, 'rgba(0,0,0,0)');
  sctx.fillStyle = sgrad;
  sctx.fillRect(0, 0, 128, 128);
  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 3.6),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, opacity: 0.7, depthWrite: false })
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.03;
  group.add(contactShadow);

  // 1. Lower Body Shell (tapered front, passenger bench in rear)
  const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.48, 2.6), bodyMat);
  baseMesh.position.y = 0.48;
  baseMesh.castShadow = true;
  group.add(baseMesh);

  // Front apron & mudguard
  const apron = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.55, 0.7), bodyMat);
  apron.position.set(0, 0.65, 0.95);
  apron.rotation.x = -0.15;
  group.add(apron);

  // 2. Tubular Roll Cage (Polished Chrome Pipes)
  const pipeGeo = new THREE.CylinderGeometry(0.026, 0.026, 1.25, 12);
  const pipeFL = new THREE.Mesh(pipeGeo, chromeMat);
  pipeFL.position.set(0.62, 1.15, 0.5);
  group.add(pipeFL);

  const pipeFR = new THREE.Mesh(pipeGeo, chromeMat);
  pipeFR.position.set(-0.62, 1.15, 0.5);
  group.add(pipeFR);

  const pipeRL = new THREE.Mesh(pipeGeo, chromeMat);
  pipeRL.position.set(0.62, 1.15, -1.18);
  group.add(pipeRL);

  const pipeRR = new THREE.Mesh(pipeGeo, chromeMat);
  pipeRR.position.set(-0.62, 1.15, -1.18);
  group.add(pipeRR);

  // 3. Canopy Roof with Golden Decorative Tassels
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.08, 1.85), canopyMat);
  roof.position.set(0, 1.68, -0.32);
  roof.castShadow = true;
  group.add(roof);

  // Dangling fringe bar
  const fringeBar = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.06, 0.04), goldTrimMat);
  fringeBar.position.set(0, 1.63, 0.6);
  group.add(fringeBar);

  // 4. Windshield & Motorcycle Handlebar
  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.22, 0.65), glassMat);
  windshield.position.set(0, 1.18, 0.55);
  windshield.rotation.x = -0.18;
  group.add(windshield);

  // Chrome handlebars with rubber grips
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.85, 12), chromeMat);
  bar.geometry.rotateZ(Math.PI / 2);
  bar.position.set(0, 0.9, 0.45);
  group.add(bar);

  // 5. Authentic Big Front Headlight & Night Beam
  const frontHL = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.14, 0.12, 20),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfef08a, emissiveIntensity: 1.2 })
  );
  frontHL.geometry.rotateX(Math.PI / 2);
  frontHL.position.set(0, 0.72, 1.34);
  group.add(frontHL);

  const spot = new THREE.SpotLight(0xfffaed, 2.8, 38, Math.PI / 5, 0.4);
  spot.position.set(0, 0.72, 1.34);
  const target = new THREE.Object3D();
  target.position.set(0, 0, 16);
  group.add(target);
  spot.target = target;
  group.add(spot);

  // Rear Egyptian Plate & Taillights
  const rearPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.2), new THREE.MeshBasicMaterial({ map: createEgyptianLicensePlate('ت ك ت ٤١٥') }));
  rearPlate.position.set(0, 0.48, -1.32);
  rearPlate.rotation.y = Math.PI;
  group.add(rearPlate);

  const tlMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, emissive: 0xef4444, emissiveIntensity: 0.7 });
  const leftTL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.06), tlMat);
  leftTL.position.set(0.52, 0.52, -1.32);
  group.add(leftTL);

  const rightTL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.06), tlMat);
  rightTL.position.set(-0.52, 0.52, -1.32);
  group.add(rightTL);

  // 6. Wheels (1 Front Center with steering fork, 2 Rear)
  const tireTex = createAsphaltTireTexture();
  const rimTex = createRimTexture();

  const wheelBuilder = (r: number, w: number) => {
    const wg = new THREE.Group();
    const tire = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, w, 20),
      new THREE.MeshStandardMaterial({ map: tireTex, roughness: 0.85 })
    );
    tire.geometry.rotateZ(Math.PI / 2);
    tire.castShadow = true;
    wg.add(tire);

    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.65, r * 0.65, w * 1.05, 16),
      new THREE.MeshStandardMaterial({ map: rimTex, metalness: 0.9, roughness: 0.15 })
    );
    rim.geometry.rotateZ(Math.PI / 2);
    wg.add(rim);
    return wg;
  };

  const frontWheel = wheelBuilder(0.28, 0.18);
  frontWheel.position.set(0, 0.28, 1.1);
  group.add(frontWheel);

  const rearLeftWheel = wheelBuilder(0.32, 0.22);
  rearLeftWheel.position.set(0.72, 0.32, -0.82);
  group.add(rearLeftWheel);

  const rearRightWheel = wheelBuilder(0.32, 0.22);
  rearRightWheel.position.set(-0.72, 0.32, -0.82);
  group.add(rearRightWheel);

  return {
    group,
    frontLeftWheel: frontWheel,
    frontRightWheel: frontWheel,
    rearLeftWheel,
    rearRightWheel,
    headlights: [spot],
    taillightMaterials: [tlMat],
    bodyMesh: baseMesh,
  };
}

/**
 * Realistic Fast Delivery Scooter
 */
export function buildDeliveryScooter(customColor?: string): BuiltVehicle {
  const group = new THREE.Group();
  group.name = 'RealisticDeliveryScooter';

  const bikeColor = customColor || '#0284c7';
  const bodyMat = new THREE.MeshPhysicalMaterial({ color: bikeColor, metalness: 0.5, roughness: 0.25 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.95, roughness: 0.1 });
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8 });

  // Main chassis
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.32, 1.9), bodyMat);
  frame.position.y = 0.36;
  group.add(frame);

  // Seat
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.75), blackMat);
  seat.position.set(0, 0.58, -0.15);
  group.add(seat);

  // Food delivery thermo-box
  const boxCanvas = document.createElement('canvas');
  boxCanvas.width = 256;
  boxCanvas.height = 256;
  const bctx = boxCanvas.getContext('2d')!;
  bctx.fillStyle = '#ea580c';
  bctx.fillRect(0, 0, 256, 256);
  bctx.fillStyle = '#ffffff';
  bctx.font = 'bold 28px Arial, sans-serif';
  bctx.textAlign = 'center';
  bctx.fillText('كبدة إسكندراني 🥖', 128, 90);
  bctx.fillText('Alex Food Express', 128, 140);
  bctx.fillText('⚡ سريع وطازة', 128, 190);
  const boxTex = new THREE.CanvasTexture(boxCanvas);

  const deliveryBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.62, 0.62),
    new THREE.MeshStandardMaterial({ map: boxTex, roughness: 0.4 })
  );
  deliveryBox.position.set(0, 0.85, -0.72);
  deliveryBox.castShadow = true;
  group.add(deliveryBox);

  // Handlebars
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.75, 12), chromeMat);
  bar.geometry.rotateZ(Math.PI / 2);
  bar.position.set(0, 0.92, 0.6);
  group.add(bar);

  // Headlight
  const spot = new THREE.SpotLight(0xfffaed, 2.5, 30, Math.PI / 6, 0.4);
  spot.position.set(0, 0.65, 0.85);
  const target = new THREE.Object3D();
  target.position.set(0, 0, 14);
  group.add(target);
  spot.target = target;
  group.add(spot);

  // Wheels
  const tireTex = createAsphaltTireTexture();
  const wheelBuilder = () => {
    const wg = new THREE.Group();
    const tire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 0.14, 18),
      new THREE.MeshStandardMaterial({ map: tireTex, roughness: 0.85 })
    );
    tire.geometry.rotateZ(Math.PI / 2);
    wg.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.15, 16), chromeMat);
    rim.geometry.rotateZ(Math.PI / 2);
    wg.add(rim);
    return wg;
  };

  const frontWheel = wheelBuilder();
  frontWheel.position.set(0, 0.25, 0.75);
  group.add(frontWheel);

  const rearWheel = wheelBuilder();
  rearWheel.position.set(0, 0.25, -0.75);
  group.add(rearWheel);

  return {
    group,
    frontLeftWheel: frontWheel,
    frontRightWheel: frontWheel,
    rearLeftWheel: rearWheel,
    rearRightWheel: rearWheel,
    headlights: [spot],
    taillightMaterials: [],
    bodyMesh: frame,
  };
}

/**
 * Realistic Civilian Traffic Vehicles (Microbuses & Sedans)
 */
export function buildCivilianCar(type: 'sedan' | 'microbus' = 'sedan', colorHex: number = 0x3b82f6): THREE.Group {
  const group = new THREE.Group();
  const paintMat = new THREE.MeshPhysicalMaterial({ color: colorHex, metalness: 0.6, roughness: 0.25, clearcoat: 0.8 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x475569, transmission: 0.75, transparent: true, opacity: 0.6 });
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.95, roughness: 0.1 });

  if (type === 'microbus') {
    // Iconic Egyptian White Toyota HiAce Microbus with Alexandria Blue Stripe
    const busBody = new THREE.Mesh(new THREE.BoxGeometry(2.15, 1.45, 4.9), paintMat);
    busBody.position.y = 1.05;
    busBody.castShadow = true;
    group.add(busBody);

    const blueStripe = new THREE.Mesh(
      new THREE.BoxGeometry(2.17, 0.24, 4.92),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 })
    );
    blueStripe.position.y = 0.95;
    group.add(blueStripe);

    const win = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.55, 3.9), glassMat);
    win.position.set(0, 1.35, -0.2);
    group.add(win);
  } else {
    // Modern Sedan
    const lower = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.52, 4.1), paintMat);
    lower.position.y = 0.52;
    lower.castShadow = true;
    group.add(lower);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.56, 2.25), glassMat);
    cabin.position.set(0, 0.98, -0.2);
    group.add(cabin);
  }

  // Wheels
  const wheelPositions = [
    [0.96, 0.36, 1.32],
    [-0.96, 0.36, 1.32],
    [0.96, 0.36, -1.32],
    [-0.96, 0.36, -1.32],
  ];

  wheelPositions.forEach(([x, y, z]) => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 20), blackMat);
    wheel.geometry.rotateZ(Math.PI / 2);
    wheel.position.set(x, y, z);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.28, 16), chromeMat);
    rim.geometry.rotateZ(Math.PI / 2);
    wheel.add(rim);
    group.add(wheel);
  });

  return group;
}
