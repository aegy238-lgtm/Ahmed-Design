import * as THREE from 'three';
import { buildCivilianCar } from './vehicleBuilder';

export interface TrafficCar {
  mesh: THREE.Group;
  speed: number;
  laneX: number;
  direction: 1 | -1; // 1 = south (+z), -1 = north (-z)
  box: THREE.Box3;
}

export interface Pedestrian {
  mesh: THREE.Group;
  speed: number;
  zPos: number;
  direction: 1 | -1;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
}

export class TrafficSystem {
  public trafficCars: TrafficCar[] = [];
  public pedestrians: Pedestrian[] = [];
  public rootGroup: THREE.Group = new THREE.Group();

  constructor() {
    this.rootGroup.name = 'AlexandriaTrafficAndPedestrians';
    this.spawnTraffic();
    this.spawnPedestrians();
  }

  private spawnTraffic() {
    // Lanes on the Corniche:
    // Southbound: x = 4.5, x = 8.5
    // Northbound: x = -4.5, x = -8.5
    const trafficConfigs = [
      { laneX: 4.5, dir: 1, z: -200, type: 'sedan' as const, color: 0x2563eb },
      { laneX: 8.5, dir: 1, z: -80, type: 'microbus' as const, color: 0xf8fafc },
      { laneX: 4.5, dir: 1, z: 120, type: 'sedan' as const, color: 0xd97706 },
      { laneX: 8.5, dir: 1, z: 240, type: 'sedan' as const, color: 0x16a34a },

      { laneX: -4.5, dir: -1, z: 220, type: 'microbus' as const, color: 0xf8fafc },
      { laneX: -8.5, dir: -1, z: 80, type: 'sedan' as const, color: 0xdc2626 },
      { laneX: -4.5, dir: -1, z: -120, type: 'sedan' as const, color: 0x475569 },
      { laneX: -8.5, dir: -1, z: -260, type: 'microbus' as const, color: 0xf8fafc },
    ];

    trafficConfigs.forEach(cfg => {
      const carMesh = buildCivilianCar(cfg.type, cfg.color);
      carMesh.position.set(cfg.laneX, 0.1, cfg.z);
      if (cfg.dir === -1) {
        carMesh.rotation.y = Math.PI;
      }
      this.rootGroup.add(carMesh);

      this.trafficCars.push({
        mesh: carMesh,
        speed: 8 + Math.random() * 4, // 30 - 45 km/h
        laneX: cfg.laneX,
        direction: cfg.dir as 1 | -1,
        box: new THREE.Box3(),
      });
    });
  }

  private spawnPedestrians() {
    // Alexandria citizens walking on the Corniche promenade (x = -13.5)
    const pedColors = [0x0284c7, 0x16a34a, 0xe11d48, 0xd97706, 0x4f46e5];

    for (let i = 0; i < 14; i++) {
      const ped = new THREE.Group();
      const color = pedColors[i % pedColors.length];
      const shirtMat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
      const skinMat = new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.5 });
      const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });

      // Torso
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.25), shirtMat);
      torso.position.y = 1.0;
      torso.castShadow = true;
      ped.add(torso);

      // Head
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), skinMat);
      head.position.y = 1.45;
      ped.add(head);

      // Legs
      const legGeo = new THREE.BoxGeometry(0.14, 0.65, 0.16);
      const leftLeg = new THREE.Mesh(legGeo, pantsMat);
      leftLeg.position.set(0.1, 0.35, 0);
      ped.add(leftLeg);

      const rightLeg = new THREE.Mesh(legGeo, pantsMat);
      rightLeg.position.set(-0.1, 0.35, 0);
      ped.add(rightLeg);

      const zStart = -300 + (i * 45) + (Math.random() * 10);
      const dir = i % 2 === 0 ? 1 : -1;
      ped.position.set(-13.5 + (Math.random() * 1.5 - 0.75), 0.35, zStart);
      this.rootGroup.add(ped);

      this.pedestrians.push({
        mesh: ped,
        speed: 1.2 + Math.random() * 0.4,
        zPos: zStart,
        direction: dir,
        leftLeg,
        rightLeg,
      });
    }
  }

  public update(dt: number, playerPos: THREE.Vector3, playerSpeed: number): { hitCar: boolean; hitPedestrian: boolean } {
    let hitCar = false;
    let hitPedestrian = false;

    // 1. Update Traffic Cars
    for (let i = 0; i < this.trafficCars.length; i++) {
      const car = this.trafficCars[i];
      let currentSpeed = car.speed;

      // Distance to player
      const distToPlayer = car.mesh.position.distanceTo(playerPos);
      const isPlayerInFront =
        car.direction === 1
          ? playerPos.z > car.mesh.position.z && playerPos.z < car.mesh.position.z + 18
          : playerPos.z < car.mesh.position.z && playerPos.z > car.mesh.position.z - 18;

      if (isPlayerInFront && Math.abs(playerPos.x - car.laneX) < 3.2) {
        // Slow down or stop for player!
        currentSpeed = Math.max(0, currentSpeed - 15 * dt);
      }

      // Move car along z axis
      car.mesh.position.z += car.direction * currentSpeed * dt;

      // Wrap around Corniche ends
      if (car.mesh.position.z > 350 && car.direction === 1) {
        car.mesh.position.z = -340;
      } else if (car.mesh.position.z < -350 && car.direction === -1) {
        car.mesh.position.z = 340;
      }

      // Stanley bridge elevation for traffic
      if (car.mesh.position.z >= 30 && car.mesh.position.z <= 150) {
        car.mesh.position.y = 0.65;
      } else {
        car.mesh.position.y = 0.1;
      }

      // Update collision bounding box
      car.box.setFromCenterAndSize(car.mesh.position, new THREE.Vector3(2.2, 1.5, 4.5));

      // Player collision check
      if (distToPlayer < 3.2) {
        hitCar = true;
      }
    }

    // 2. Update Pedestrians
    const walkTime = Date.now() * 0.006;
    for (let i = 0; i < this.pedestrians.length; i++) {
      const ped = this.pedestrians[i];
      ped.mesh.position.z += ped.direction * ped.speed * dt;

      // Leg swinging animation
      const legAngle = Math.sin(walkTime * ped.speed * 4) * 0.45;
      ped.leftLeg.rotation.x = legAngle;
      ped.rightLeg.rotation.x = -legAngle;

      if (ped.mesh.position.z > 330) {
        ped.direction = -1;
        ped.mesh.rotation.y = Math.PI;
      } else if (ped.mesh.position.z < -330) {
        ped.direction = 1;
        ped.mesh.rotation.y = 0;
      }

      if (ped.mesh.position.distanceTo(playerPos) < 1.8) {
        hitPedestrian = true;
      }
    }

    return { hitCar, hitPedestrian };
  }
}
