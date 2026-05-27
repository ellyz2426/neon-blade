export type GameMode = 'duel' | 'survival' | 'timeattack' | 'training';
export type Stance = 'high' | 'mid' | 'low';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface GameState {
  mode: GameMode;
  difficulty: Difficulty;
  running: boolean;
  paused: boolean;
  round: number;
  playerHealth: number;
  opponentHealth: number;
  playerStamina: number;
  opponentStamina: number;
  playerStance: Stance;
  opponentStance: Stance;
  combo: number;
  maxCombo: number;
  score: number;
  timeLeft: number;
  wavesCleared: number;
}

export const STANCE_ANGLES: Record<Stance, number> = {
  high: Math.PI / 4,
  mid: 0,
  low: -Math.PI / 4,
};

export const MAX_HEALTH = 100;
export const MAX_STAMINA = 100;
export const STAMINA_REGEN = 18; // per sec
export const STAMINA_SWING_COST = 12;
export const STAMINA_BLOCK_COST = 8;
export const PARRY_WINDOW_MS = 200;

export interface BladeTheme {
  id: string;
  name: string;
  color: string;
  emissive: string;
}

export const BLADE_THEMES: BladeTheme[] = [
  { id: 'cyan', name: 'Neon Cyan', color: '#00ffff', emissive: '#00aaff' },
  { id: 'magenta', name: 'Plasma Magenta', color: '#ff00ff', emissive: '#aa00aa' },
  { id: 'amber', name: 'Solar Amber', color: '#ffaa00', emissive: '#aa6600' },
  { id: 'lime', name: 'Toxic Lime', color: '#aaff00', emissive: '#66aa00' },
  { id: 'violet', name: 'Void Violet', color: '#aa00ff', emissive: '#6600aa' },
];

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  unlocked: boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_blood', name: 'First Blood', desc: 'Land your first hit', unlocked: false },
  { id: 'parry_master', name: 'Parry Master', desc: 'Parry 10 attacks', unlocked: false },
  { id: 'flawless', name: 'Flawless Duel', desc: 'Win a duel without taking damage', unlocked: false },
  { id: 'combo10', name: 'Blade Dancer', desc: 'Reach 10x combo', unlocked: false },
  { id: 'survivor5', name: 'Survivor', desc: 'Clear 5 survival waves', unlocked: false },
  { id: 'time_5000', name: 'Time Attacker', desc: 'Score 5000 in Time Attack', unlocked: false },
  { id: 'perfect_parry', name: 'Perfect Timing', desc: 'Parry 3 attacks in a row', unlocked: false },
  { id: 'stance_switcher', name: 'Stance Switcher', desc: 'Use all stances in one duel', unlocked: false },
  { id: 'no_block_win', name: 'Aggressor', desc: 'Win without blocking', unlocked: false },
  { id: 'training_complete', name: 'Initiate', desc: 'Complete training mode', unlocked: false },
  { id: 'duel_10', name: 'Duelist', desc: 'Win 10 duels', unlocked: false },
  { id: 'hard_win', name: 'Blade Master', desc: 'Win on Hard difficulty', unlocked: false },
  { id: 'theme_collector', name: 'Chromatic', desc: 'Try all blade themes', unlocked: false },
  { id: 'speed_kill', name: 'Quick Draw', desc: 'Win a duel in under 30s', unlocked: false },
  { id: 'immortal', name: 'Immortal', desc: 'Clear survival wave 10', unlocked: false },
];
