import { World, Mesh, MeshStandardMaterial, CylinderGeometry, Color, Group, Vector3, Quaternion } from '@iwsdk/core';
import { AudioManager } from './audio';
import { GameState, Stance, STANCE_ANGLES, MAX_HEALTH, MAX_STAMINA, STAMINA_SWING_COST, STAMINA_BLOCK_COST, STAMINA_REGEN, PARRY_WINDOW_MS, BLADE_THEMES } from './types';

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
    // Update blade positions to controller or fallback
    const right = this.world.input.xr.gamepads.right;
    if (right) {
      const pose = right.getPose();
      if (pose) {
        this.playerBlade.position.copy(pose.position);
        this.playerBlade.quaternion.copy(pose.orientation);
      }
    } else {
      // Browser fallback: attach to camera
      const head = this.world.player.head;
      this.playerBlade.position.copy(head.position).add(new Vector3(0.3, -0.2, -0.5).applyQuaternion(head.quaternion));
      this.playerBlade.quaternion.copy(head.quaternion);
    }

    // Opponent blade follows AI position (handled externally via setOpponentPose)

    // Stamina regen
    this.state.playerStamina = Math.min(MAX_STAMINA, this.state.playerStamina + STAMINA_REGEN * dt);
    this.state.opponentStamina = Math.min(MAX_STAMINA, this.state.opponentStamina + STAMINA_REGEN * dt);

    // Block
    this.blockActive = input.block && this.state.playerStamina > 5;
    if (this.blockActive) {
      this.state.playerStamina -= STAMINA_BLOCK_COST * dt;
      this.lastBlockTime = performance.now();
    }

    // Swing
    this.swingCooldown -= dt;
    if (input.swing && this.swingCooldown <= 0 && this.state.playerStamina >= STAMINA_SWING_COST) {
      this.performSwing();
    }

    // Update stance
    this.state.playerStance = input.stance;

    // Hit flash
    if (this.hitFlashTime > 0) {
      this.hitFlashTime -= dt;
      const intensity = this.hitFlashTime > 0 ? 1 : 0;
      this.playerBladeMat.emissiveIntensity = 1 + intensity;
    }
  }

  performSwing() {
    this.swingCooldown = 0.3;
    this.state.playerStamina -= STAMINA_SWING_COST;
    this.lastSwingTime = performance.now();
    this.audio.playSwing(1);
    // Simple hit detection: distance check to opponent
    const dist = this.playerBlade.position.distanceTo(this.opponentBlade.position);
    if (dist < 1.5) {
      // Check if opponent blocking
      const oppBlocking = this.isOpponentBlocking();
      const timeSinceOppSwing = performance.now() - this.getOpponentLastSwing();
      const isParry = oppBlocking && (performance.now() - this.lastBlockTime) < PARRY_WINDOW_MS;
      if (oppBlocking && !isParry) {
        this.audio.playClash();
        this.state.combo = 0;
      } else {
        if (isParry) {
          this.audio.playParry();
          this.parrySuccessCount++;
          this.state.combo = 0;
          // Stun opponent
          this.applyStunToOpponent(0.6);
        } else {
          this.audio.playHit();
          const damage = 10 + this.state.combo * 2;
          this.state.opponentHealth = Math.max(0, this.state.opponentHealth - damage);
          this.state.combo = Math.min(20, this.state.combo + 1);
          this.state.maxCombo = Math.max(this.state.maxCombo, this.state.combo);
          this.state.score += damage * 10 * Math.max(1, this.state.combo);
          this.hitFlashTime = 0.15;
        }
      }
    }
  }

  // Opponent interface
  opponentSwing() {
    this.audio.playSwing(0.9);
    // Check player block
    const dist = this.opponentBlade.position.distanceTo(this.playerBlade.position);
    if (dist < 1.5) {
      const isParry = this.blockActive && (performance.now() - this.lastSwingTime) < PARRY_WINDOW_MS;
      if (this.blockActive && !isParry) {
        this.audio.playClash();
      } else if (isParry) {
        this.audio.playParry();
      } else {
        this.audio.playHit();
        this.state.playerHealth = Math.max(0, this.state.playerHealth - 12);
        this.state.combo = 0;
      }
    }
  }

  setOpponentPose(pos: Vector3, quat: Quaternion) {
    this.opponentBlade.position.copy(pos);
    this.opponentBlade.quaternion.copy(quat);
  }

  isOpponentBlocking(): boolean {
    // Simplified: opponent blocks when stamina high and random
    return this.state.opponentStamina > 30 && Math.random() < 0.4;
  }

  getOpponentLastSwing(): number {
    return 0;
  }

  applyStunToOpponent(sec: number) {
    // Handled by AI
  }

  dispose() {
    this.world.scene.remove(this.playerBlade);
    this.world.scene.remove(this.opponentBlade);
  }
}
