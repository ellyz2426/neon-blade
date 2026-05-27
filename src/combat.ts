import { World, Mesh, MeshStandardMaterial, CylinderGeometry, Color, Group, Vector3, Quaternion, SphereGeometry, MeshBasicMaterial, AdditiveBlending } from '@iwsdk/core';
import { AudioManager } from './audio';
import { GameState, Stance, MAX_STAMINA, STAMINA_SWING_COST, STAMINA_BLOCK_COST, STAMINA_REGEN, PARRY_WINDOW_MS, BLADE_THEMES } from './types';

export class CombatSystem {
  world: World;
  audio: AudioManager;
  state: GameState;
  playerBlade: Group;
  opponentBlade: Group;
  playerBladeMat: MeshStandardMaterial;
  opponentBladeMat: MeshStandardMaterial;
  lastSwingTime = 0;
  lastBlockTime = 0;
  parrySuccessCount = 0;
  blockActive = false;
  swingCooldown = 0;
  hitFlashTime = 0;
  trailMesh: Mesh | null = null;
  trailTime = 0;
  sparks: Array<{mesh: Mesh, vel: Vector3, life: number}> = [];

  constructor(world: World, audio: AudioManager, state: GameState) {
    this.world = world;
    this.audio = audio;
    this.state = state;
    const bladeGeo = new CylinderGeometry(0.02, 0.01, 1.0, 12);
    this.playerBladeMat = new MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00aaaa, metalness: 0.9, roughness: 0.2 });
    const playerMesh = new Mesh(bladeGeo, this.playerBladeMat);
    playerMesh.position.y = 0.5;
    this.playerBlade = new Group();
    this.playerBlade.add(playerMesh);
    const oppMat = new MeshStandardMaterial({ color: 0xff00ff, emissive: 0xaa00aa, metalness: 0.9, roughness: 0.2 });
    this.opponentBladeMat = oppMat;
    const oppMesh = new Mesh(bladeGeo, oppMat);
    oppMesh.position.y = 0.5;
    this.opponentBlade = new Group();
    this.opponentBlade.add(oppMesh);
    this.world.scene.add(this.playerBlade);
    this.world.scene.add(this.opponentBlade);
  }

  setBladeTheme(id: string) {
    const theme = BLADE_THEMES.find(t => t.id === id) || BLADE_THEMES[0];
    this.playerBladeMat.color = new Color(theme.color);
    this.playerBladeMat.emissive = new Color(theme.emissive);
  }

  update(dt: number, input: { swing: boolean, block: boolean, stance: Stance, move: Vector3 }) {
    const right = this.world.input.xr.gamepads.right;
    if (right) {
      const pose = right.getPose();
      if (pose) {
        this.playerBlade.position.copy(pose.position);
        this.playerBlade.quaternion.copy(pose.orientation);
      }
    } else {
      const head = this.world.player.head;
      this.playerBlade.position.copy(head.position).add(new Vector3(0.3, -0.2, -0.5).applyQuaternion(head.quaternion));
      this.playerBlade.quaternion.copy(head.quaternion);
    }

    this.state.playerStamina = Math.min(MAX_STAMINA, this.state.playerStamina + STAMINA_REGEN * dt);
    this.state.opponentStamina = Math.min(MAX_STAMINA, this.state.opponentStamina + STAMINA_REGEN * dt);

    this.blockActive = input.block && this.state.playerStamina > 5;
    if (this.blockActive) {
      this.state.playerStamina -= STAMINA_BLOCK_COST * dt;
      this.lastBlockTime = performance.now();
    }

    this.swingCooldown -= dt;
    if (input.swing && this.swingCooldown <= 0 && this.state.playerStamina >= STAMINA_SWING_COST) {
      this.performSwing();
    }

    this.state.playerStance = input.stance;

    if (this.hitFlashTime > 0) {
      this.hitFlashTime -= dt;
      this.playerBladeMat.emissiveIntensity = 1 + (this.hitFlashTime > 0 ? 1 : 0);
    }

    // Update trail
    if (this.trailMesh) {
      this.trailTime -= dt;
      const mat = this.trailMesh.material as MeshBasicMaterial;
      mat.opacity = Math.max(0, this.trailTime / 0.2);
      if (this.trailTime <= 0) {
        this.world.scene.remove(this.trailMesh);
        this.trailMesh = null;
      }
    }

    // Update sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= dt;
      s.mesh.position.addScaledVector(s.vel, dt);
      s.vel.y -= 9.8 * dt;
      const mat = s.mesh.material as MeshBasicMaterial;
      mat.opacity = Math.max(0, s.life / 0.5);
      if (s.life <= 0) {
        this.world.scene.remove(s.mesh);
        this.sparks.splice(i, 1);
      }
    }
  }

  performSwing() {
    this.swingCooldown = 0.3;
    this.state.playerStamina -= STAMINA_SWING_COST;
    this.lastSwingTime = performance.now();
    this.audio.playSwing(1);
    this.spawnTrail();
    const dist = this.playerBlade.position.distanceTo(this.opponentBlade.position);
    if (dist < 1.5) {
      const oppBlocking = this.isOpponentBlocking();
      const isParry = oppBlocking && (performance.now() - this.lastBlockTime) < PARRY_WINDOW_MS;
      if (oppBlocking && !isParry) {
        this.audio.playClash();
        this.state.combo = 0;
        this.spawnSparks(this.playerBlade.position, 8, 0xffaa00);
      } else {
        if (isParry) {
          this.audio.playParry();
          this.parrySuccessCount++;
          this.state.combo = 0;
          this.applyStunToOpponent(0.6);
          this.spawnSparks(this.playerBlade.position, 12, 0x00ffff);
        } else {
          this.audio.playHit();
          const damage = 10 + this.state.combo * 2;
          this.state.opponentHealth = Math.max(0, this.state.opponentHealth - damage);
          this.state.combo = Math.min(20, this.state.combo + 1);
          this.state.maxCombo = Math.max(this.state.maxCombo, this.state.combo);
          this.state.score += damage * 10 * Math.max(1, this.state.combo);
          this.hitFlashTime = 0.15;
          this.spawnSparks(this.opponentBlade.position, 10, 0xff00ff);
        }
      }
    }
  }

  spawnTrail() {
    if (this.trailMesh) this.world.scene.remove(this.trailMesh);
    const geo = new CylinderGeometry(0.03, 0.01, 1.2, 8);
    const mat = new MeshBasicMaterial({ color: this.playerBladeMat.color, transparent: true, opacity: 0.6, blending: AdditiveBlending });
    const m = new Mesh(geo, mat);
    m.position.copy(this.playerBlade.position);
    m.quaternion.copy(this.playerBlade.quaternion);
    this.world.scene.add(m);
    this.trailMesh = m;
    this.trailTime = 0.2;
  }

  spawnSparks(pos: Vector3, count: number, color: number) {
    for (let i = 0; i < count; i++) {
      const mesh = new Mesh(new SphereGeometry(0.02, 6, 6), new MeshBasicMaterial({ color, transparent: true, opacity: 1, blending: AdditiveBlending }));
      mesh.position.copy(pos);
      const vel = new Vector3((Math.random()-0.5)*4, Math.random()*3, (Math.random()-0.5)*4);
      this.world.scene.add(mesh);
      this.sparks.push({ mesh, vel, life: 0.5 });
    }
  }

  opponentSwing() {
    this.audio.playSwing(0.9);
    const dist = this.opponentBlade.position.distanceTo(this.playerBlade.position);
    if (dist < 1.5) {
      const isParry = this.blockActive && (performance.now() - this.lastSwingTime) < PARRY_WINDOW_MS;
      if (this.blockActive && !isParry) {
        this.audio.playClash();
        this.spawnSparks(this.playerBlade.position, 8, 0xffaa00);
      } else if (isParry) {
        this.audio.playParry();
        this.spawnSparks(this.playerBlade.position, 12, 0x00ffff);
      } else {
        this.audio.playHit();
        this.state.playerHealth = Math.max(0, this.state.playerHealth - 12);
        this.state.combo = 0;
        this.spawnSparks(this.playerBlade.position, 10, 0xff0000);
      }
    }
  }

  setOpponentPose(pos: Vector3, quat: Quaternion) {
    this.opponentBlade.position.copy(pos);
    this.opponentBlade.quaternion.copy(quat);
  }

  isOpponentBlocking(): boolean {
    return this.state.opponentStamina > 30 && Math.random() < 0.4;
  }

  applyStunToOpponent(sec: number) {}

  dispose() {
    this.world.scene.remove(this.playerBlade);
    this.world.scene.remove(this.opponentBlade);
  }
}
