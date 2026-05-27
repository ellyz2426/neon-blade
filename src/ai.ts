import { World, Vector3, Quaternion } from '@iwsdk/core';
import { GameState, Difficulty, Stance, MAX_STAMINA } from './types';
import { CombatSystem } from './combat';

export class AIController {
  world: World;
  combat: CombatSystem;
  state: GameState;
  difficulty: Difficulty;
  targetPos = new Vector3(0, 1, -1.5);
  moveSpeed = 1.2;
  reactionTimer = 0;
  stanceTimer = 0;
  attackCooldown = 0;
  stunnedTime = 0;

  constructor(world: World, combat: CombatSystem, state: GameState) {
    this.world = world;
    this.combat = combat;
    this.state = state;
    this.difficulty = state.difficulty;
  }

  update(dt: number) {
    if (this.stunnedTime > 0) {
      this.stunnedTime -= dt;
      return;
    }

    this.reactionTimer -= dt;
    this.stanceTimer -= dt;
    this.attackCooldown -= dt;

    const playerPos = this.world.player.head.position;
    // Orbit around player
    const angle = performance.now() * 0.0003;
    const radius = 1.8;
    this.targetPos.set(Math.sin(angle) * radius, 1.0, Math.cos(angle) * radius * 0.7 - 0.5);
    const current = this.combat.opponentBlade.position;
    current.lerp(this.targetPos, Math.min(1, dt * this.moveSpeed));
    this.combat.setOpponentPose(current, new Quaternion());

    // Stance switching
    if (this.stanceTimer <= 0) {
      const stances: Stance[] = ['high', 'mid', 'low'];
      this.state.opponentStance = stances[Math.floor(Math.random() * 3)];
      this.stanceTimer = 1.5 + Math.random() * 1.5;
    }

    // Attack decision
    const dist = current.distanceTo(playerPos);
    const aggression = this.difficulty === 'easy' ? 0.3 : this.difficulty === 'medium' ? 0.5 : 0.7;
    if (this.attackCooldown <= 0 && dist < 2.0 && Math.random() < aggression * dt * 2) {
      this.combat.opponentSwing();
      this.attackCooldown = this.difficulty === 'easy' ? 1.2 : this.difficulty === 'medium' ? 0.9 : 0.6;
      this.state.opponentStamina -= 12;
    }

    // Block stamina regen handled in combat
    if (this.state.opponentStamina < 20) {
      // Defensive
      this.attackCooldown = Math.max(this.attackCooldown, 0.5);
    }
  }

  stun(sec: number) {
    this.stunnedTime = sec;
  }

  setDifficulty(d: Difficulty) {
    this.difficulty = d;
    this.state.difficulty = d;
  }
}
