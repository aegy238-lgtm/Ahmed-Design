import * as THREE from 'three';
import { Mission, MissionType, VehicleType } from '../types/game';
import { soundManager } from '../audio/soundManager';

export const ALEXANDRIA_MISSIONS: Mission[] = [
  {
    id: 'm1_stanley_to_library',
    titleAr: 'مشوار سياحي: من ستانلي إلى مكتبة الإسكندرية',
    descAr: 'سائح وزوجته يريدان زيارة مكتبة الإسكندرية بعد التقاط صور على كوبري ستانلي.',
    type: 'taxi_passenger',
    passengerName: 'د. سمير وزوجته',
    passengerDialogue: 'يا أسطى عايزين نروح المكتبة على مهلك شوية عشان نتفرج ع البحر!',
    reward: 240,
    xpReward: 160,
    timeLimitSeconds: 120,
    startLocation: { x: 4.5, z: 80, nameAr: 'كوبري ستانلي' },
    targetLocation: { x: 18, z: -105, nameAr: 'مكتبة الإسكندرية' },
    allowedVehicle: 'taxi',
  },
  {
    id: 'm2_bahari_to_qaitbay',
    titleAr: 'رحلة الصيادين: من بحري إلى قلعة قايتباي',
    descAr: 'عم إبراهيم الصياد يحتاج نقل سريع بمعداته إلى مرسى القلعة قبل خروج الفلوكة.',
    type: 'taxi_passenger',
    passengerName: 'عم إبراهيم الصياد',
    passengerDialogue: 'شِد حيلك يا كابتن الفلوكة هتسرح كمان ربع ساعة!',
    reward: 190,
    xpReward: 130,
    timeLimitSeconds: 95,
    startLocation: { x: 68, z: -180, nameAr: 'سوق سمك بحري والأنفوشي' },
    targetLocation: { x: -8, z: -300, nameAr: 'مرسى قلعة قايتباي' },
  },
  {
    id: 'm3_tuktuk_market_rush',
    titleAr: 'توصيلة حواري الأنفوشي السريعة',
    descAr: 'توصيل سيدة وأكياس المشتريات من سوق الأنفوشي عبر الشوارع الضيقة إلى منزلها.',
    type: 'tuktuk_rush',
    passengerName: 'أم أحمد',
    passengerDialogue: 'خُش من الحارة دي يا بني عشان الزحمة على الكورنيش!',
    reward: 130,
    xpReward: 95,
    timeLimitSeconds: 75,
    startLocation: { x: 72, z: -160, nameAr: 'سوق الأنفوشي الشعبي' },
    targetLocation: { x: 88, z: 40, nameAr: 'حارة الموازي بحري' },
    allowedVehicle: 'tuktuk',
  },
  {
    id: 'm4_kebdah_delivery',
    titleAr: 'توصيل وجبة كبدة إسكندراني ساخنة 🥖',
    descAr: 'طلب عاجل من محل كبدة وحواوشي بحري إلى أحد شاليهات ستانلي قبل أن تبرد.',
    type: 'food_delivery',
    passengerName: 'مطعم كبدة الفلاح السكندري',
    passengerDialogue: 'الأكل سخن مولع يا كابتن.. أمانة توصل بسرعة وتاخد بقشيش تمام!',
    reward: 170,
    xpReward: 120,
    timeLimitSeconds: 90,
    startLocation: { x: 50, z: -180, nameAr: 'مطعم كبدة الفلاح' },
    targetLocation: { x: 12, z: 90, nameAr: 'شاليهات كوبري ستانلي' },
    allowedVehicle: 'scooter',
  },
  {
    id: 'm5_sidi_bisher_express',
    titleAr: 'رحلة الكورنيش الطويلة: إلى سيدي بشر وميامي',
    descAr: 'توصيل موظف بنك من محطة الرمل إلى منزله في سيدي بشر في ساعة الذروة.',
    type: 'taxi_passenger',
    passengerName: 'أ. محمود عبد العال',
    passengerDialogue: 'يا ريت تسلك طريق البحر الهوا يرد الروح بعد يوم شغل طويل!',
    reward: 340,
    xpReward: 230,
    timeLimitSeconds: 150,
    startLocation: { x: 14, z: -80, nameAr: 'محطة الرمل' },
    targetLocation: { x: 14, z: 290, nameAr: 'سيدي بشر وميامي' },
    allowedVehicle: 'taxi',
  },
];

export class MissionManager {
  public currentMission: Mission | null = null;
  public missionStage: 'inactive' | 'pickup' | 'in_transit' | 'completed' = 'inactive';
  public timeRemaining: number = 0;
  public markerMesh: THREE.Group = new THREE.Group();
  public passengerMesh: THREE.Group = new THREE.Group();
  public passengerArm: THREE.Mesh | null = null;
  public crashesDuringMission: number = 0;

  // Real-time Taxi Meter (عداد التاكسي)
  public taxiMeterFare: number = 0;
  public tripDistanceMeters: number = 0;
  private lastPosition: THREE.Vector3 = new THREE.Vector3();
  private lastMeterTickDist: number = 0;

  constructor() {
    this.createCheckpointMarker();
    this.create3DPassenger();
  }

  private createCheckpointMarker() {
    this.markerMesh.name = 'MissionCheckpointMarker';

    // Glowing vertical laser beacon
    const beamGeo = new THREE.CylinderGeometry(1.8, 1.8, 10, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 5;
    this.markerMesh.add(beam);

    // Concentric glowing target rings
    const ring1 = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 2.8, 32),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    ring1.rotation.x = -Math.PI / 2;
    ring1.position.y = 0.16;
    this.markerMesh.add(ring1);

    const ring2 = new THREE.Mesh(
      new THREE.RingGeometry(3.0, 3.4, 32),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.6 })
    );
    ring2.rotation.x = -Math.PI / 2;
    ring2.position.y = 0.16;
    this.markerMesh.add(ring2);

    // Floating destination pin
    const pin = new THREE.Mesh(
      new THREE.ConeGeometry(0.8, 1.6, 6),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.7 })
    );
    pin.rotation.x = Math.PI;
    pin.position.y = 7.5;
    this.markerMesh.add(pin);

    this.markerMesh.visible = false;
  }

  private create3DPassenger() {
    this.passengerMesh.name = 'WaitingPassenger3D';

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.4 });
    const clothesMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.7 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });

    // Torso & Head
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.65, 0.28), clothesMat);
    torso.position.y = 1.05;
    torso.castShadow = true;
    this.passengerMesh.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), skinMat);
    head.position.y = 1.55;
    this.passengerMesh.add(head);

    // Hair
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2), pantsMat);
    hair.position.y = 1.58;
    this.passengerMesh.add(hair);

    // Legs
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 0.18), pantsMat);
    legL.position.set(0.11, 0.35, 0);
    this.passengerMesh.add(legL);

    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 0.18), pantsMat);
    legR.position.set(-0.11, 0.35, 0);
    this.passengerMesh.add(legR);

    // Waving Arm hailing the cab ("تاكسي يا أسطى!")
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.12), clothesMat);
    arm.position.set(0.3, 1.25, 0);
    this.passengerMesh.add(arm);
    this.passengerArm = arm;

    this.passengerMesh.visible = false;
  }

  public startMission(mission: Mission, currentVehicleType: VehicleType): { success: boolean; message: string } {
    if (mission.allowedVehicle && mission.allowedVehicle !== currentVehicleType) {
      const vName = mission.allowedVehicle === 'taxi' ? 'التاكسي' : mission.allowedVehicle === 'tuktuk' ? 'التوك توك' : 'السكوتر';
      return { success: false, message: `هذه المهمة مخصصة لمركبة ${vName}! توجه إلى الجراج لتبديلها.` };
    }

    this.currentMission = mission;
    this.missionStage = 'pickup';
    this.timeRemaining = mission.timeLimitSeconds;
    this.crashesDuringMission = 0;
    this.tripDistanceMeters = 0;
    this.lastMeterTickDist = 0;
    this.taxiMeterFare = 15; // فتح العداد الأساسي 15 ج.م

    // Place marker & passenger at pickup location
    this.markerMesh.position.set(mission.startLocation.x, 0.2, mission.startLocation.z);
    this.markerMesh.visible = true;

    this.passengerMesh.position.set(mission.startLocation.x + 2.5, 0.2, mission.startLocation.z);
    this.passengerMesh.visible = true;

    soundManager.playMeterTick();

    return { success: true, message: `تم قبول المشوار! توجه لموقع الراكب في ${mission.startLocation.nameAr}` };
  }

  public cancelMission() {
    this.currentMission = null;
    this.missionStage = 'inactive';
    this.markerMesh.visible = false;
    this.passengerMesh.visible = false;
  }

  public update(dt: number, playerPos: THREE.Vector3): {
    stateChanged: boolean;
    stage: 'inactive' | 'pickup' | 'in_transit' | 'completed';
    rewardResult?: { cash: number; tip: number; xp: number; rating: number };
  } {
    if (!this.currentMission || this.missionStage === 'inactive' || this.missionStage === 'completed') {
      return { stateChanged: false, stage: this.missionStage };
    }

    const time = Date.now() * 0.003;

    // Animate pickup marker
    if (this.markerMesh.visible) {
      this.markerMesh.rotation.y = time * 0.7;
      const pin = this.markerMesh.children[3];
      if (pin) {
        pin.position.y = 7.5 + Math.sin(time * 3.5) * 0.45;
      }
    }

    // Animate passenger arm waving
    if (this.passengerMesh.visible && this.passengerArm) {
      this.passengerArm.rotation.z = 0.8 + Math.sin(time * 6) * 0.4;
    }

    // Distance calculation & Taxi Meter Ticking
    if (this.missionStage === 'in_transit') {
      const stepDist = this.lastPosition.distanceTo(playerPos);
      if (stepDist > 0.05 && stepDist < 10) {
        this.tripDistanceMeters += stepDist;
        if (this.tripDistanceMeters - this.lastMeterTickDist > 120) {
          this.taxiMeterFare += 1.5;
          this.lastMeterTickDist = this.tripDistanceMeters;
          soundManager.playMeterTick();
        }
      }
    }
    this.lastPosition.copy(playerPos);

    // Time countdown
    this.timeRemaining = Math.max(0, this.timeRemaining - dt);

    const targetPos = this.missionStage === 'pickup'
      ? this.currentMission.startLocation
      : this.currentMission.targetLocation;

    const dist = Math.hypot(playerPos.x - targetPos.x, playerPos.z - targetPos.z);

    // Arrival at target
    if (dist < 4.8) {
      if (this.missionStage === 'pickup') {
        // Passenger enters vehicle!
        this.missionStage = 'in_transit';
        this.passengerMesh.visible = false;
        soundManager.playPassengerBoard();

        // Move target beacon to destination
        this.markerMesh.position.set(
          this.currentMission.targetLocation.x,
          0.2,
          this.currentMission.targetLocation.z
        );

        return { stateChanged: true, stage: 'in_transit' };
      } else if (this.missionStage === 'in_transit') {
        // Mission finished!
        this.missionStage = 'completed';
        this.markerMesh.visible = false;

        const timeRatio = this.timeRemaining / this.currentMission.timeLimitSeconds;
        let rating = 5;
        if (this.crashesDuringMission > 3) rating = 3;
        else if (this.crashesDuringMission > 1) rating = 4;

        const baseReward = Math.max(this.currentMission.reward, Math.round(this.taxiMeterFare * 1.2));
        const tip = Math.round(baseReward * (timeRatio > 0.35 ? 0.35 : 0.15) * (rating / 5));
        const cashTotal = baseReward + tip;
        const xp = this.currentMission.xpReward;

        soundManager.playCashEarned();

        return {
          stateChanged: true,
          stage: 'completed',
          rewardResult: {
            cash: cashTotal,
            tip,
            xp,
            rating,
          },
        };
      }
    }

    return { stateChanged: false, stage: this.missionStage };
  }

  public registerCrash() {
    if (this.missionStage === 'in_transit') {
      this.crashesDuringMission++;
    }
  }
}
