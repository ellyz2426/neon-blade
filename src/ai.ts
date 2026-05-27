import { World, Vector3, Quaternion } from '@iwsdk/core';
import { GameState, Difficulty, Stance } from './types';
import { CombatSystem } from './combat';

export class AIController {
  world: World;
  combat: CombatSystem;
  state: GameState;
  difficulty: Difficulty;
  targetPos = new Vector3(0, 1, -1.5);
  moveSpeed = 1.2;
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
    if (this.stunnedTime > 0) { this.stunnedTime -= dt; return; }
    this.stanceTimer -= dt;
    this.attackCooldown -= dt;

    const playerPos = this.world.player.head.position;
    const angle = performance.now() * 0.0003;
    const radius = 1.8;
    this.targetPos.set(Math.sin(angle) * radius, 1.0, Math.cos(angle) * radius * 0.7 - 0.5);
    const current = this.combat.opponentBlade.position;
    current.lerp(this.targetPos, Math.min(1, dt * this.moveSpeed));
    this.combat.setOpponentPose(current, new Quaternion());

    if (this.stanceTimer <= 0) {
      // Counter player stance 60% of time on hard
      const counter: Record<Stance, Stance> = { high: 'mid', mid: 'low', low: 'high' };
      const playerStance = this.state.playerStance;
      const useCounter = Math.random() < (this.difficulty === 'hard' ? 0.6 : this.difficulty === 'medium' ? 0.4 : 0.2);
      this.state.opponentStance = useCounter ? counter[playerStance] : (['high','mid','low'][Math.floor(Math.random()*3)] as Stance);
      this.stanceTimer = 1.2 + Math.random() * 1.2;
    }

    const dist = current.distanceTo(playerPos);
    const aggression = this.difficulty === 'easy' ? 0.3 : this.difficulty === 'medium' ? 0.5 : 0.7;
    if (this.attackCooldown <= 0 && dist < 2.0 && Math.random() < aggression * dt * 2) {
      this.combat.opponentSwing();
      this.attackCooldown = this.difficulty === 'easy' ? 1.2 : this.difficulty === 'medium' ? 0.9 : 0.6;
      this.state.opponentStamina -= 12;
    }
    if (this.state.opponentStamina < 20) this.attackCooldown = Math.max(this.attackCooldown, 0.5);
  }

  stun(sec: number) { this.stunnedTime = sec; }
  setDifficulty(d: Difficulty) { this.difficulty = d; this.state.difficulty = d; }
}
