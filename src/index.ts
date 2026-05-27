import { World, InputComponent, Vector3 } from '@iwsdk/core';
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
let achievements = ACHIEVEMENTS.map(a => ({ ...a }));
let usedStances = new Set<string>();
let blocksUsed = 0;
let parryStreak = 0;
let duelWins = 0;
let startTime = 0;
let tutorialStep = 0;
let tutorialActive = false;

function loadProgress() {
  try {
    const saved = localStorage.getItem('neon-blade-progress');
    if (saved) {
      const p = JSON.parse(saved);
      themeIndex = p.themeIndex ?? 0;
      duelWins = p.duelWins ?? 0;
      achievements = p.achievements ?? achievements;
    }
  } catch {}
}

function saveProgress() {
  try {
    localStorage.setItem('neon-blade-progress', JSON.stringify({ themeIndex, duelWins, achievements }));
  } catch {}
}

function loadLeaderboard(): Array<{name:string,score:number}> {
  try {
    const s = localStorage.getItem('neon-blade-lb');
    if (s) return JSON.parse(s);
  } catch {}
  return [];
}

function saveLeaderboard(lb: Array<{name:string,score:number}>) {
  try { localStorage.setItem('neon-blade-lb', JSON.stringify(lb.slice(0,10))); } catch {}
}

async function init() {
  loadProgress();
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
  combat.setBladeTheme(BLADE_THEMES[themeIndex].id);
  bindUI();
  showTitle();
  requestAnimationFrame(loop);
}

function bindUI() {
  setInterval(() => {
    // Title
    const titleDoc = ui.getDoc('title');
    const startBtn = titleDoc?.getElementById('start-btn');
    if (startBtn && !(startBtn as any)._bound) {
      (startBtn as any)._bound = true;
      startBtn.addEventListener('click', () => { ui.hide('title'); ui.show('modeselect'); });
    }
    // Mode select
    const modeDoc = ui.getDoc('modeselect');
    const bindMode = (id:string, mode:GameMode) => {
      const b = modeDoc?.getElementById(id);
      if (b && !(b as any)._bound) { (b as any)._bound = true; b.addEventListener('click', () => startGame(mode)); }
    };
    bindMode('mode-duel','duel'); bindMode('mode-survival','survival'); bindMode('mode-timeattack','timeattack'); bindMode('mode-training','training');
    // Pause
    const pauseDoc = ui.getDoc('pause');
    const resumeBtn = pauseDoc?.getElementById('btn-resume');
    if (resumeBtn && !(resumeBtn as any)._bound) { (resumeBtn as any)._bound = true; resumeBtn.addEventListener('click', ()=>{ state.paused=false; ui.hide('pause'); ui.show('hud'); }); }
    const quitBtn = pauseDoc?.getElementById('btn-quit');
    if (quitBtn && !(quitBtn as any)._bound) { (quitBtn as any)._bound = true; quitBtn.addEventListener('click', ()=>{ state.running=false; state.paused=false; showTitle(); }); }
    // Gameover
    const goDoc = ui.getDoc('gameover');
    const rematchBtn = goDoc?.getElementById('btn-rematch');
    if (rematchBtn && !(rematchBtn as any)._bound) { (rematchBtn as any)._bound = true; rematchBtn.addEventListener('click', ()=> startGame(state.mode)); }
    const titleBtn = goDoc?.getElementById('btn-title');
    if (titleBtn && !(titleBtn as any)._bound) { (titleBtn as any)._bound = true; titleBtn.addEventListener('click', ()=> showTitle()); }
    // Help back
    const helpDoc = ui.getDoc('help');
    const helpBack = helpDoc?.getElementById('btn-help-back');
    if (helpBack && !(helpBack as any)._bound) { (helpBack as any)._bound = true; helpBack.addEventListener('click', ()=> { ui.hide('help'); ui.show('title'); }); }
    // Settings back + theme cycle
    const setDoc = ui.getDoc('settings');
    const setBack = setDoc?.getElementById('btn-back');
    if (setBack && !(setBack as any)._bound) { (setBack as any)._bound = true; setBack.addEventListener('click', ()=> { ui.hide('settings'); ui.show('title'); }); }
    // Leaderboard back
    const lbDoc = ui.getDoc('leaderboard');
    const lbBack = lbDoc?.getElementById('back-btn');
    if (lbBack && !(lbBack as any)._bound) { (lbBack as any)._bound = true; lbBack.addEventListener('click', ()=> { ui.hide('leaderboard'); ui.show('title'); }); }
  }, 500);
}

function showTitle() {
  ui.hideAll();
  ui.show('title');
  state.running = false;
  state.paused = false;
}

function startGame(mode: GameMode) {
  state.mode = mode;
  state.difficulty = 'medium';
  ai.setDifficulty(state.difficulty);
  state.running = true;
  state.paused = false;
  state.playerHealth = MAX_HEALTH;
  state.opponentHealth = MAX_HEALTH;
  state.playerStamina = MAX_STAMINA;
  state.opponentStamina = MAX_STAMINA;
  state.combo = 0;
  state.maxCombo = 0;
  state.score = 0;
  state.timeLeft = mode === 'timeattack' ? 60 : 999;
  state.wavesCleared = 0;
  usedStances.clear();
  blocksUsed = 0;
  parryStreak = 0;
  startTime = performance.now();
  tutorialStep = 0;
  tutorialActive = mode === 'training';
  ui.hideAll();
  ui.show('hud');
  // Countdown
  ui.show('countdown');
  let c = 3;
  const iv = setInterval(() => {
    ui.setText('countdown', 'count', c > 0 ? `${c}` : 'FIGHT!');
    if (tutorialActive && c === 3) ui.showToast('Welcome to Training! Follow prompts.');
    c--;
    if (c < -1) { clearInterval(iv); ui.hide('countdown'); if (tutorialActive) runTutorial(); }
  }, 700);
}

function runTutorial() {
  const steps = [
    'Swing: Press Trigger or Space',
    'Block: Hold Grip or Shift',
    'Parry: Block just before hit',
    'Stance: Thumbstick Up/Down or Q/E',
    'High beats Low, Low beats Mid, Mid beats High',
    'Complete!'
  ];
  const next = () => {
    if (tutorialStep < steps.length) {
      ui.showToast(steps[tutorialStep], 2500);
      tutorialStep++;
      setTimeout(next, 3000);
    } else {
      unlock('training_complete');
      tutorialActive = false;
    }
  };
  next();
}

function unlock(id:string) {
  const a = achievements.find(x=>x.id===id);
  if (a && !a.unlocked) { a.unlocked = true; ui.showToast(`Achievement: ${a.name}`); saveProgress(); }
}

function endGame(win: boolean) {
  state.running = false;
  ui.hide('hud');
  ui.show('gameover');
  ui.setText('gameover', 'result', win ? 'VICTORY' : 'DEFEAT');
  ui.setText('gameover', 'final-score', `Score: ${state.score}`);
  ui.setText('gameover', 'max-combo', `Max Combo: x${state.maxCombo}`);
  if (win) audio.playWin(); else audio.playLose();
  // Achievements
  if (state.combo >= 10) unlock('combo10');
  if (win && state.playerHealth === MAX_HEALTH) unlock('flawless');
  if (parryStreak >= 3) unlock('perfect_parry');
  if (usedStances.size >= 3) unlock('stance_switcher');
  if (blocksUsed === 0 && win) unlock('no_block_win');
  if (state.mode === 'survival' && state.wavesCleared >= 5) unlock('survivor5');
  if (state.mode === 'timeattack' && state.score >= 5000) unlock('time_5000');
  if (win && state.difficulty === 'hard') unlock('hard_win');
  const duration = (performance.now() - startTime)/1000;
  if (win && duration < 30) unlock('speed_kill');
  if (win) { duelWins++; if (duelWins >= 10) unlock('duel_10'); saveProgress(); }
  // Leaderboard
  if (state.score > 0) {
    const lb = loadLeaderboard();
    lb.push({ name: 'YOU', score: state.score });
    lb.sort((a,b)=>b.score-a.score);
    saveLeaderboard(lb);
  }
}

function loop() {
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastTime)/1000);
  lastTime = now;
  if (world && state.running && !state.paused) {
    const right = world.input.xr.gamepads.right;
    const trigger = right?.getButtonDown(InputComponent.Trigger) ?? false;
    const grip = right?.getButtonPressed(InputComponent.Squeeze) ?? false;
    const thumb = right?.getAxesValues(InputComponent.Thumbstick) ?? {x:0,y:0};
    let stance: 'high'|'mid'|'low' = 'mid';
    if (thumb.y > 0.5) stance = 'high';
    else if (thumb.y < -0.5) stance = 'low';
    const kb = world.input.keyboard;
    const swingKey = kb.getKeyDown('Space') || (world.input.browserGamepads[0]?.buttons[0]?.pressed ?? false);
    const blockKey = kb.getKeyPressed('ShiftLeft');
    const swing = trigger || swingKey;
    const block = grip || blockKey;
    if (kb.getKeyPressed('KeyQ')) stance = 'high';
    if (kb.getKeyPressed('KeyE')) stance = 'low';
    if (block) blocksUsed++;
    usedStances.add(stance);
    combat.update(dt, { swing, block, stance, move: new Vector3() });
    ai.update(dt);
    ui.updateHUD(state);
    // Parry streak tracking
    if (combat.parrySuccessCount > parryStreak) parryStreak = combat.parrySuccessCount;
    // Tutorial hints
    if (tutorialActive) {
      if (tutorialStep === 1 && swing) ui.showToast('Good swing!');
      if (tutorialStep === 2 && block) ui.showToast('Blocking!');
    }
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
        if (state.wavesCleared >= 10) unlock('immortal');
      } else {
        endGame(true);
        if (state.combo > 0 && !achievements.find(a=>a.id==='first_blood')?.unlocked) unlock('first_blood');
      }
    }
  }
  // Theme cycle key
  if (world?.input.keyboard.getKeyDown('KeyT')) {
    themeIndex = (themeIndex + 1) % BLADE_THEMES.length;
    combat.setBladeTheme(BLADE_THEMES[themeIndex].id);
    ui.showToast(`Theme: ${BLADE_THEMES[themeIndex].name}`);
    saveProgress();
  }
  // A button menu confirm
  const aPress = world?.input.xr.gamepads.right?.getButtonDown(InputComponent.A_Button);
  if (aPress && !state.running) {
    ui.hideAll();
    ui.show('modeselect');
  }
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (e)=>{
  if (e.code === 'Escape' && state.running) {
    state.paused = !state.paused;
    ui.setVisible('pause', state.paused);
    ui.setVisible('hud', !state.paused);
  }
  if (e.code === 'KeyH' && !state.running) { ui.hideAll(); ui.show('help'); }
  if (e.code === 'KeyS' && !state.running) { ui.hideAll(); ui.show('settings'); }
  if (e.code === 'KeyL' && !state.running) { ui.hideAll(); ui.show('leaderboard'); }
});

init();
