import * as THREE from 'three';
import { VehicleConfig } from '../types/game';
import { soundManager } from '../audio/soundManager';

export interface VehicleControlInput {
  throttle: boolean;
  reverse: boolean;
  steerLeft: boolean;
  steerRight: boolean;
  handbrake: boolean;
}

export interface VehiclePhysicsState {
  position: THREE.Vector3;
  heading: number; // yaw angle in radians
  speed: number; // in meters/second
  speedKmh: number;
  steerAngle: number;
  pitch: number;
  roll: number;
  fuel: number; // 0 - 100%
  health: number; // 0 - 100%
  gear: 'D' | 'R' | 'N' | 'P';
  isDrifting: boolean;
  isGrounded: boolean;
}

export class VehiclePhysics {
  public state: VehiclePhysicsState;
  private config: VehicleConfig;
  private colliders: THREE.Box3[] = [];
  private lastImpactTime: number = 0;
  private vehicleBox: THREE.Box3 = new THREE.Box3();
  private halfWidth: number = 0.95;
  private halfLength: number = 2.1;

  constructor(config: VehicleConfig, initialPos: { x: number; y: number; z: number; heading: number }) {
    this.config = config;
    this.state = {
      position: new THREE.Vector3(initialPos.x, initialPos.y, initialPos.z),
      heading: initialPos.heading,
      speed: 0,
      speedKmh: 0,
      steerAngle: 0,
      pitch: 0,
      roll: 0,
      fuel: 100,
      health: 100,
      gear: 'N',
      isDrifting: false,
      isGrounded: true,
    };

    if (config.id === 'tuktuk') {
      this.halfWidth = 0.65;
      this.halfLength = 1.3;
    } else if (config.id === 'scooter') {
      this.halfWidth = 0.35;
      this.halfLength = 0.9;
    }
  }

  public setColliders(colliders: THREE.Box3[]) {
    this.colliders = colliders;
  }

  public setConfig(config: VehicleConfig) {
    this.config = config;
    if (config.id === 'tuktuk') {
      this.halfWidth = 0.65;
      this.halfLength = 1.3;
    } else if (config.id === 'scooter') {
      this.halfWidth = 0.35;
      this.halfLength = 0.9;
    } else {
      this.halfWidth = 0.95;
      this.halfLength = 2.1;
    }
  }

  public refuel(amount: number = 100) {
    this.state.fuel = Math.min(100, this.state.fuel + amount);
  }

  public repair() {
    this.state.health = 100;
  }

  public resetPosition(pos: { x: number; y: number; z: number; heading: number }) {
    this.state.position.set(pos.x, pos.y, pos.z);
    this.state.heading = pos.heading;
    this.state.speed = 0;
    this.state.speedKmh = 0;
    this.state.steerAngle = 0;
    this.state.pitch = 0;
    this.state.roll = 0;
  }

  public update(dt: number, input: VehicleControlInput) {
    // Clamp delta time to avoid large physics steps
    const delta = Math.min(dt, 0.05);

    // Performance multiplier from upgrades
    const speedMult = 1 + (this.config.engineLevel - 1) * 0.12;
    const handlingMult = 1 + (this.config.handlingLevel - 1) * 0.15;
    const armorMult = 1 + (this.config.armorLevel - 1) * 0.25;

    const maxForwardSpeed = (this.config.maxSpeed * speedMult) / 3.6; // m/s
    const maxReverseSpeed = -maxForwardSpeed * 0.35;
    const accelRate = this.config.acceleration * speedMult * 3.8;
    const brakeRate = this.config.braking * 7.5;
    const naturalFriction = 2.2; // coasting drag

    // Fuel depletion
    if (this.state.fuel > 0 && (input.throttle || Math.abs(this.state.speed) > 1)) {
      this.state.fuel = Math.max(0, this.state.fuel - (delta * 0.08 * (input.throttle ? 1.5 : 0.5)));
    }
    const hasFuel = this.state.fuel > 0;

    // Throttle & Braking
    if (input.throttle && hasFuel) {
      if (this.state.speed < -0.5) {
        // Braking while going in reverse
        this.state.speed += brakeRate * delta;
      } else {
        // Accelerating forward
        const powerCurve = Math.max(0.2, 1 - (this.state.speed / maxForwardSpeed));
        this.state.speed += accelRate * powerCurve * delta;
        if (this.state.speed > maxForwardSpeed) this.state.speed = maxForwardSpeed;
      }
      this.state.gear = 'D';
    } else if (input.reverse && hasFuel) {
      if (this.state.speed > 0.5) {
        // Braking while going forward
        this.state.speed -= brakeRate * delta;
      } else {
        // Reversing
        this.state.speed -= (accelRate * 0.6) * delta;
        if (this.state.speed < maxReverseSpeed) this.state.speed = maxReverseSpeed;
      }
      this.state.gear = 'R';
    } else {
      // Coasting with rolling resistance
      if (this.state.speed > 0) {
        this.state.speed = Math.max(0, this.state.speed - naturalFriction * delta);
      } else if (this.state.speed < 0) {
        this.state.speed = Math.min(0, this.state.speed + naturalFriction * delta);
      }
      this.state.gear = Math.abs(this.state.speed) < 0.2 ? 'P' : 'N';
    }

    // Handbrake
    this.state.isDrifting = false;
    if (input.handbrake) {
      this.state.speed *= (1 - 4.5 * delta);
      if (Math.abs(this.state.speed) > 4) {
        this.state.isDrifting = true;
        soundManager.playTireSkid();
      }
    }

    // Steering logic
    const targetSteer = (input.steerLeft ? 1 : 0) - (input.steerRight ? 1 : 0);
    const steerSpeed = 6.0 * handlingMult;
    this.state.steerAngle = THREE.MathUtils.damp(this.state.steerAngle, targetSteer * 0.45, steerSpeed, delta);

    // Turning based on speed (Bicycle / Ackermann simplified model)
    const turnSensitivity = (this.state.isDrifting ? 2.2 : 1.0) * handlingMult;
    const speedRatio = Math.min(Math.abs(this.state.speed) / 12, 1.0);
    const angularVelocity = this.state.steerAngle * this.state.speed * 0.28 * turnSensitivity * (0.4 + 0.6 * speedRatio);
    this.state.heading += angularVelocity * delta;

    // Move forward in direction of heading
    const prevX = this.state.position.x;
    const prevZ = this.state.position.z;

    const moveX = Math.sin(this.state.heading) * this.state.speed * delta;
    const moveZ = Math.cos(this.state.heading) * this.state.speed * delta;

    this.state.position.x += moveX;
    this.state.position.z += moveZ;

    // Ground elevation (Stanley Bridge elevated area z = 30 to 150)
    let groundY = 0.1;
    if (this.state.position.z >= 30 && this.state.position.z <= 150 && Math.abs(this.state.position.x) < 11) {
      groundY = 0.65; // Elevated road surface on Stanley bridge
    }
    this.state.position.y = THREE.MathUtils.damp(this.state.position.y, groundY, 10, delta);

    // Suspension Body Pitch & Roll kinematics
    const targetPitch = (input.throttle ? -0.04 : 0) + (input.reverse ? 0.05 : 0) + (input.handbrake ? 0.03 : 0);
    const targetRoll = -this.state.steerAngle * (this.state.speed / 15) * 0.15;
    this.state.pitch = THREE.MathUtils.damp(this.state.pitch, targetPitch, 8, delta);
    this.state.roll = THREE.MathUtils.damp(this.state.roll, targetRoll, 8, delta);

    // Speed in km/h
    this.state.speedKmh = Math.round(this.state.speed * 3.6);

    // Collision Detection with Buildings and Barriers
    this.vehicleBox.setFromCenterAndSize(
      this.state.position,
      new THREE.Vector3(this.halfWidth * 2, 1.5, this.halfLength * 2)
    );

    for (let i = 0; i < this.colliders.length; i++) {
      const col = this.colliders[i];
      if (this.vehicleBox.intersectsBox(col)) {
        // Revert position with bounce back
        this.state.position.x = prevX - moveX * 0.4;
        this.state.position.z = prevZ - moveZ * 0.4;

        const impactSpeed = Math.abs(this.state.speedKmh);
        if (impactSpeed > 10 && Date.now() - this.lastImpactTime > 300) {
          const dmg = (impactSpeed * 0.45) / armorMult;
          this.state.health = Math.max(0, this.state.health - dmg);
          soundManager.playCrash(Math.min(impactSpeed / 70, 1.0));
          this.lastImpactTime = Date.now();
        }

        this.state.speed = -this.state.speed * 0.35; // bounce bounce
        break;
      }
    }

    // World Boundary constraint (Alexandria City Bounds)
    if (this.state.position.x < -16.5) {
      // Corniche Sea Wall boundary
      this.state.position.x = -16.5;
      this.state.speed *= -0.2;
    } else if (this.state.position.x > 180) {
      this.state.position.x = 180;
      this.state.speed *= -0.2;
    }

    if (this.state.position.z < -350) {
      this.state.position.z = -350;
      this.state.speed *= -0.2;
    } else if (this.state.position.z > 350) {
      this.state.position.z = 350;
      this.state.speed *= -0.2;
    }

    // Engine Audio synchronization
    soundManager.updateEngine(this.state.speedKmh, input.throttle, this.config.id);
  }
}
