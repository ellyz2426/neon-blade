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
  feintTimer = 0;
  spacing = 1.8;

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
    this.feintTimer -= dt;

    const playerPos = this.world.player.head.position;
    const playerStance = this.state.playerStance;

    // Dynamic spacing based on player aggression
    const playerHealthy = this.state.playerHealth > 60;
    this.spacing = playerHealthy ? 1.9 : 1.6;

    // Orbit with occasional feint step-in
    const baseAngle = performance.now() * 0.00025;
    const feint = this.feintTimer > 0;
    const radius = feint ? this.spacing - 0.5 : this.spacing;
    const ang = baseAngle + Math.sin(performance.now() * 0.001) * 0.3;
    this.targetPos.set(Math.sin(ang) * radius, 1.0 + Math.sin(performance.now()*0.002)*0.1, Math.cos(ang) * radius * 0.7 - 0.5);
    const current = this.combat.opponentBlade.position;
    current.lerp(this.targetPos, Math.min(1, dt * this.moveSpeed * (feint ? 2.5 : 1)));

    // Stance counter with prediction
    if (this.stanceTimer <= 0) {
      const counter: Record<Stance, Stance> = { high: 'mid', mid: 'low', low: 'high' };
      const useCounter = Math.random() < (this.difficulty === 'hard' ? 0.7 : this.difficulty === 'medium' ? 0.5 : 0.3);
      // Sometimes fake a stance then switch
      if (this.difficulty === 'hard' && Math.random() < 0.2) {
        this.state.opponentStance = counter[playerStance];
        setTimeout(() => { this.state.opponentStance = (['high','mid','low'][Math.floor(Math.random()*3)] as Stance); }, 250);
      } else {
        this.state.opponentStance = useCounter ? counter[playerStance] : (['high','mid','low'][Math.floor(Math.random()*3)] as Stance);
      }
      this.stanceTimer = 0.9 + Math.random() * 1.0;
    }

    const dist = current.distanceTo(playerPos);
    const aggression = this.difficulty === 'easy' ? 0.35 : this.difficulty === 'medium' ? 0.6 : 0.85;

    // Feint logic: step in without attacking
    if (this.difficulty !== 'easy' && this.feintTimer <= 0 && Math.random() < 0.02) {
      this.feintTimer = 0.4;
    }

    if (this.attackCooldown <= 0 && dist < 2.1 && !feint && Math.random() < aggression * dt * 2.2) {
      this.combat.opponentSwing();
      this.attackCooldown = this.difficulty === 'easy' ? 1.1 : this.difficulty === 'medium' ? 0.8 : 0.55;
      this.state.opponentStamina -= 12;
      // After attack, back off slightly
      this.spacing += 0.2;
    }
    if (this.state.opponentStamina < 25) {
      this.attackCooldown = Math.max(this.attackCooldown, 0.6);
      this.spacing = Math.min(2.2, this.spacing + dt * 0.3);
    }
  }

  stun(sec: number) { this.stunnedTime = sec; }
  setDifficulty(d: Difficulty) { this.difficulty = d; this.state.difficulty = d; this.moveSpeed = d === 'hard' ? 1.5 : d === 'medium' ? 1.2 : 0.9; }
}
