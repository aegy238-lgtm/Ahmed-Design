import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { AlexandriaWorld, buildAlexandriaCity } from './cityBuilder';
import { BuiltVehicle, buildAlexandriaTaxi, buildEgyptianTukTuk, buildDeliveryScooter } from './vehicleBuilder';
import { VehiclePhysics, VehicleControlInput } from './physics';
import { TrafficSystem } from './trafficSystem';
import { MissionManager } from './missionSystem';
import { TimeOfDay, VehicleConfig, WeatherType } from '../types/game';
import { soundManager } from '../audio/soundManager';

export type CameraMode = 'chase' | 'hood' | 'cinematic';

export class AlexGameEngine {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public city: AlexandriaWorld;
  public physics: VehiclePhysics;
  public traffic: TrafficSystem;
  public missions: MissionManager;
  public currentVehicleMesh: BuiltVehicle | null = null;
  public cameraMode: CameraMode = 'chase';

  private container: HTMLElement;
  private animFrameId: number | null = null;
  private dirLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private sunTimeOfDay: TimeOfDay = 'day';
  private weather: WeatherType = 'clear';

  // Smooth camera vectors
  private cameraTarget: THREE.Vector3 = new THREE.Vector3();
  private cameraPos: THREE.Vector3 = new THREE.Vector3();

  constructor(container: HTMLElement, vehicleConfig: VehicleConfig) {
    this.container = container;

    // 1. Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1500
    );

    // 2. High-Performance Photorealistic Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25; // Bright, vibrant realistic colors
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // 3. Studio Environment Map (PMREM) for metallic reflections
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 4. Lighting Rig
    this.hemiLight = new THREE.HemisphereLight(0xbae6fd, 0xd4c7b0, 0.9);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfff7ed, 2.0);
    this.dirLight.position.set(70, 120, 90);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 400;
    const d = 80;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);

    // 5. Build Alexandria Open World
    this.city = buildAlexandriaCity();
    this.scene.add(this.city.rootGroup);

    // 6. Physics
    this.physics = new VehiclePhysics(vehicleConfig, this.city.spawnPoints.corniche);
    this.physics.setColliders(this.city.colliders);

    // 7. Traffic & Pedestrians
    this.traffic = new TrafficSystem();
    this.scene.add(this.traffic.rootGroup);

    // 8. Missions System
    this.missions = new MissionManager();
    this.scene.add(this.missions.markerMesh);
    this.scene.add(this.missions.passengerMesh);

    // 9. Spawn Player Vehicle
    this.setPlayerVehicle(vehicleConfig);

    // 10. Set Atmosphere (Zero Fog for 100% Crystal-Clear view)
    this.setTimeOfDay('day');

    // Resize Handler
    window.addEventListener('resize', this.onWindowResize);

    // Start Sound
    soundManager.startEngine(vehicleConfig.id);
  }

  public setPlayerVehicle(config: VehicleConfig) {
    if (this.currentVehicleMesh) {
      this.scene.remove(this.currentVehicleMesh.group);
      this.currentVehicleMesh = null;
    }

    if (config.id === 'tuktuk') {
      this.currentVehicleMesh = buildEgyptianTukTuk(config.primaryColor);
    } else if (config.id === 'scooter') {
      this.currentVehicleMesh = buildDeliveryScooter(config.primaryColor);
    } else {
      this.currentVehicleMesh = buildAlexandriaTaxi(config.primaryColor);
    }

    this.scene.add(this.currentVehicleMesh.group);
    this.physics.setConfig(config);

    // Update engine sound profile
    soundManager.stopEngine();
    soundManager.startEngine(config.id);
  }

  public setTimeOfDay(time: TimeOfDay) {
    this.sunTimeOfDay = time;
    this.scene.fog = null; // 100% Crystal-clear view with ZERO cloudy fog haze!

    if (time === 'day') {
      this.scene.background = new THREE.Color(0x38bdf8); // Vibrant Mediterranean sky blue
      this.hemiLight.color.setHex(0xe0f2fe);
      this.hemiLight.groundColor.setHex(0xd4c7b0);
      this.hemiLight.intensity = 1.0;
      this.dirLight.color.setHex(0xfffbeb);
      this.dirLight.intensity = 2.2;
      this.dirLight.position.set(70, 120, 90);
      this.toggleHeadlights(false);
    } else if (time === 'sunset') {
      // Golden Alexandria Sunset
      this.scene.background = new THREE.Color(0xf97316);
      this.hemiLight.color.setHex(0xfed7aa);
      this.hemiLight.groundColor.setHex(0x78350f);
      this.hemiLight.intensity = 0.85;
      this.dirLight.color.setHex(0xf97316);
      this.dirLight.intensity = 1.6;
      this.dirLight.position.set(-100, 35, 20); // Sunset over Mediterranean sea
      this.toggleHeadlights(true);
    } else {
      // Night over Alexandria Corniche
      this.scene.background = new THREE.Color(0x090d16);
      this.hemiLight.color.setHex(0x1e293b);
      this.hemiLight.groundColor.setHex(0x090d16);
      this.hemiLight.intensity = 0.45;
      this.dirLight.color.setHex(0x38bdf8);
      this.dirLight.intensity = 0.6;
      this.dirLight.position.set(40, 80, 50);
      this.toggleHeadlights(true);
    }
  }

  public setWeather(w: WeatherType) {
    this.weather = w;
  }

  public toggleHeadlights(on?: boolean) {
    if (!this.currentVehicleMesh) return;
    this.currentVehicleMesh.headlights.forEach(hl => {
      hl.visible = on !== undefined ? on : !hl.visible;
    });
  }

  public switchCameraMode(): CameraMode {
    if (this.cameraMode === 'chase') this.cameraMode = 'hood';
    else if (this.cameraMode === 'hood') this.cameraMode = 'cinematic';
    else this.cameraMode = 'chase';
    return this.cameraMode;
  }

  private onWindowResize = () => {
    if (!this.container) return;
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  };

  public update(dt: number, input: VehicleControlInput) {
    // 1. Update Vehicle Physics
    this.physics.update(dt, input);
    const pState = this.physics.state;

    // 2. Update 3D Vehicle Transform
    if (this.currentVehicleMesh) {
      const vGroup = this.currentVehicleMesh.group;
      vGroup.position.copy(pState.position);
      vGroup.rotation.y = pState.heading;
      vGroup.rotation.x = pState.pitch;
      vGroup.rotation.z = pState.roll;

      // Wheel rotations
      const wheelRoll = (pState.speed * dt) / 0.35;
      this.currentVehicleMesh.frontLeftWheel.rotation.x += wheelRoll;
      this.currentVehicleMesh.frontRightWheel.rotation.x += wheelRoll;
      this.currentVehicleMesh.rearLeftWheel.rotation.x += wheelRoll;
      this.currentVehicleMesh.rearRightWheel.rotation.x += wheelRoll;

      // Steering angle on front wheels
      this.currentVehicleMesh.frontLeftWheel.rotation.y = pState.steerAngle;
      this.currentVehicleMesh.frontRightWheel.rotation.y = pState.steerAngle;

      // Taillights brake glow
      const isBraking = input.reverse || input.handbrake;
      this.currentVehicleMesh.taillightMaterials.forEach(m => {
        m.emissiveIntensity = isBraking ? 1.8 : 0.4;
      });
    }

    // 3. Update Traffic & Collision checks
    const trafficResult = this.traffic.update(dt, pState.position, pState.speedKmh);
    if (trafficResult.hitCar) {
      if (Math.abs(pState.speedKmh) > 10) {
        this.physics.state.health = Math.max(0, this.physics.state.health - 6);
        this.physics.state.speed *= -0.3;
        soundManager.playCrash(0.6);
        this.missions.registerCrash();
      }
    }

    // 4. Update Missions Checkpoints
    this.missions.update(dt, pState.position);

    // 5. Animated Sea Waves (vertex oscillation)
    const seaPos = this.city.waterMesh.geometry.attributes.position;
    const waveTime = Date.now() * 0.002;
    for (let i = 0; i < seaPos.count; i += 4) {
      const u = seaPos.getX(i);
      const v = seaPos.getY(i);
      const waveZ = Math.sin(u * 0.05 + waveTime) * 0.4 + Math.cos(v * 0.04 + waveTime * 1.3) * 0.35;
      seaPos.setZ(i, waveZ);
    }
    seaPos.needsUpdate = true;

    // 6. Camera Follow System
    this.updateCamera(dt);

    // 7. Photorealistic Render
    this.renderer.render(this.scene, this.camera);
  }

  private updateCamera(dt: number) {
    const pState = this.physics.state;
    const forwardX = Math.sin(pState.heading);
    const forwardZ = Math.cos(pState.heading);

    if (this.cameraMode === 'hood') {
      // Bumper / Hood Cam
      const hoodPos = new THREE.Vector3(
        pState.position.x + forwardX * 1.4,
        pState.position.y + 1.1,
        pState.position.z + forwardZ * 1.4
      );
      this.camera.position.copy(hoodPos);
      const lookTarget = new THREE.Vector3(
        pState.position.x + forwardX * 25,
        pState.position.y + 1.0,
        pState.position.z + forwardZ * 25
      );
      this.camera.lookAt(lookTarget);
    } else if (this.cameraMode === 'cinematic') {
      // Orbit / High Angle View
      const targetCamPos = new THREE.Vector3(
        pState.position.x - forwardX * 14,
        pState.position.y + 10,
        pState.position.z - forwardZ * 14
      );
      this.camera.position.lerp(targetCamPos, dt * 4);
      this.camera.lookAt(pState.position.x, pState.position.y + 1.5, pState.position.z);
    } else {
      // Classic Chase Camera
      const speedFactor = Math.min(Math.abs(pState.speedKmh) / 100, 1.0);
      const distance = 6.5 + speedFactor * 1.5;
      const height = 2.8 + speedFactor * 0.5;

      const idealCamX = pState.position.x - forwardX * distance;
      const idealCamY = pState.position.y + height;
      const idealCamZ = pState.position.z - forwardZ * distance;

      const smoothSpeed = 7.0;
      this.cameraPos.x = THREE.MathUtils.damp(this.cameraPos.x, idealCamX, smoothSpeed, dt);
      this.cameraPos.y = THREE.MathUtils.damp(this.cameraPos.y, idealCamY, smoothSpeed, dt);
      this.cameraPos.z = THREE.MathUtils.damp(this.cameraPos.z, idealCamZ, smoothSpeed, dt);

      this.camera.position.copy(this.cameraPos);

      // Look slightly ahead of the car
      const targetX = pState.position.x + forwardX * 4.5;
      const targetY = pState.position.y + 1.2;
      const targetZ = pState.position.z + forwardZ * 4.5;

      this.cameraTarget.x = THREE.MathUtils.damp(this.cameraTarget.x, targetX, smoothSpeed * 1.5, dt);
      this.cameraTarget.y = THREE.MathUtils.damp(this.cameraTarget.y, targetY, smoothSpeed * 1.5, dt);
      this.cameraTarget.z = THREE.MathUtils.damp(this.cameraTarget.z, targetZ, smoothSpeed * 1.5, dt);

      this.camera.lookAt(this.cameraTarget);
    }
  }

  public dispose() {
    window.removeEventListener('resize', this.onWindowResize);
    soundManager.stopEngine();
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.renderer.dispose();
  }
}
