export type GameMode = 'training' | 'fight';
export type GameState = 'title' | 'modeSelect' | 'countdown' | 'playing' | 'paused' | 'gameOver';
export type PunchType = 'jab' | 'cross' | 'hook' | 'uppercut';

export interface GameStats {
  punchesThrown: number;
  punchesLanded: number;
  combos: number;
  damageDealt: number;
  damageTaken: number;
}

export interface OpponentState {
  health: number;
  maxHealth: number;
  stamina: number;
  isBlocking: boolean;
  isStunned: boolean;
  stunTime: number;
}
