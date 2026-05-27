export type GameMode = 'training' | 'fight' | 'career' | 'tournament';
export type GameState = 'title' | 'modeSelect' | 'countdown' | 'playing' | 'paused' | 'gameOver';
export type PunchType = 'jab' | 'cross' | 'hook' | 'uppercut';
export type OpponentType = 'brawler' | 'speedster' | 'tank' | 'technician';

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

export interface CareerProfile {
  level: number;
  xp: number;
  wins: number;
  losses: number;
  currentOpponent: number;
  unlockedOpponents: OpponentType[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
}
