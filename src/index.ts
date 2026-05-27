import { World, InputComponent } from '@iwsdk/core';
import { AudioManager } from './audio';
import { Arena } from './arena';
import { UIManager } from './ui';
import { CombatSystem } from './combat';
import { AIController } from './ai';
import { GameState, GameMode, Difficulty, MAX_HEALTH, MAX_STAMINA, BLADE_THEMES, ACHIEVEMENTS } from './types';

const state: GameState = {
  mode: 'duel',
  difficulty: 'medium',
  running: false,
  paused: false,
  round: 1,
  playerHealth: MAX_HEALTH,
  opponentHealth: MAX_HEALTH,
  playerStamina: MAX_STAMINA,
  opponentStamina: MAX_STAMINA,
  playerStance: 'mid',
  opponentStance: 'mid',
  combo: 0,
  maxCombo: 0,
  score: 0,
  timeLeft: 60,
  wavesCleared: 0,
};

let world: World;
let audio: AudioManager;
let arena: Arena;
let ui: UIManager;
let combat: CombatSystem;
let ai: AIController;
let themeIndex = 0;
let lastTime = performance.now();

async function init() {
  const container = document.getElementById('app') as HTMLDivElement;
  world = await World.create(container, {
    xr: { offer: 'once' },
    input: { canvasPointerEvents: true },
    features: { grabbing: true, locomotion: { browserControls: true }, physics: true, spatialUI: true },
  });
  audio = new AudioManager();
  audio.init();
  arena = new Arena(world);
  ui = new UIManager(world);
  await ui.init();
  combat = new CombatSystem(world, audio, state);
  ai = new AIController(world, combat, state);
  bindUI();
  showTitle();
  requestAnimationFrame(loop);
}

function bindUI() {
  // Title buttons via panel doc event listeners (simplified polling)
  setInterval(() => {
    const titleDoc = ui.getDoc('title');
    const startBtn = titleDoc?.getElementById('start-btn');
    if (startBtn && !(startBtn as any)._bound) {
      (startBtn as any)._bound = true;
      startBtn.addEventListener('click', () => {
        ui.hide('title');
        ui.show('modeselect');
      });
    }
    const modeDoc = ui.getDoc('modeselect');
    const duelBtn = modeDoc?.getElementById('mode-duel');
    if (duelBtn && !(duelBtn as any)._bound) {
      (duelBtn as any)._bound = true;
      duelBtn.addEventListener('click', () => startGame('duel'));
      modeDoc?.getElementById('mode-survival')?.addEventListener('click', () => startGame('survival'));
      modeDoc?.getElementById('mode-timeattack')?.addEventListener('click', () => startGame('timeattack'));
      modeDoc?.getElementById('mode-training')?.addEventListener('click', () => startGame('training'));
    }
  }, 500);
}

function showTitle() {
  ui.hideAll();
  ui.show('title');
}

function startGame(mode: GameMode) {
  state.mode = mode;
  state.running = true;
  state.paused = false;
  state.playerHealth = MAX_HEALTH;
  state.opponentHealth = MAX_HEALTH;
  state.playerStamina = MAX_STAMINA;
  state.opponentStamina = MAX_STAMINA;
  state.combo = 0;
  state.score = 0;
  state.timeLeft = mode === 'timeattack' ? 60 : 999;
  state.wavesCleared = 0;
  ui.hideAll();
  ui.show('hud');
  ui.setVisible('hud', true);
  // Countdown
  ui.show('countdown');
  let c = 3;
  const iv = setInterval(() => {
    ui.setText('countdown', 'count', c > 0 ? `${c}` : 'FIGHT!');
    c--;
    if (c < -1) {
      clearInterval(iv);
      ui.hide('countdown');
    }
  }, 700);
}

function endGame(win: boolean) {
  state.running = false;
  ui.hide('hud');
  ui.show('gameover');
  ui.setText('gameover', 'result', win ? 'VICTORY' : 'DEFEAT');
  ui.setText('gameover', 'final-score', `Score: ${state.score}`);
  ui.setText('gameover', 'max-combo', `Max Combo: x${state.maxCombo}`);
  if (win) audio.playWin(); else audio.playLose();
}

function loop() {
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  if (world && state.running && !state.paused) {
    // Input
    const right = world.input.xr.gamepads.right;
    const trigger = right?.getButtonDown(InputComponent.Trigger) ?? false;
    const grip = right?.getButtonPressed(InputComponent.Squeeze) ?? false;
    const thumb = right?.getAxesValues(InputComponent.Thumbstick) ?? { x: 0, y: 0 };
    let stance: 'high' | 'mid' | 'low' = 'mid';
    if (thumb.y > 0.5) stance = 'high';
    else if (thumb.y < -0.5) stance = 'low';
    // Browser fallback
    const kb = world.input.keyboard;
    const swingKey = kb.getKeyDown('Space') || (world.input.browserGamepads[0]?.buttons[0]?.pressed ?? false);
    const blockKey = kb.getKeyPressed('ShiftLeft');
    const swing = trigger || swingKey;
    const block = grip || blockKey;
    // Stance via keys
    if (kb.getKeyPressed('KeyQ')) stance = 'high';
    if (kb.getKeyPressed('KeyE')) stance = 'low';
    combat.update(dt, { swing, block, stance, move: new (world as any).THREE.Vector3() });
    ai.update(dt);
    ui.updateHUD(state);

    // Mode logic
    if (state.mode === 'timeattack') {
      state.timeLeft -= dt;
      if (state.timeLeft <= 0) endGame(state.score > 0);
    }
    if (state.playerHealth <= 0) endGame(false);
    if (state.opponentHealth <= 0) {
      if (state.mode === 'survival') {
        state.wavesCleared++;
        state.opponentHealth = MAX_HEALTH;
        state.playerHealth = Math.min(MAX_HEALTH, state.playerHealth + 20);
        ui.showToast(`Wave ${state.wavesCleared} cleared!`);
      } else {
        endGame(true);
      }
    }
  }
  requestAnimationFrame(loop);
}

// Pause toggle
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && state.running) {
    state.paused = !state.paused;
    ui.setVisible('pause', state.paused);
    ui.setVisible('hud', !state.paused);
  }
});

init();
