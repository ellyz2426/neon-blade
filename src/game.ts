import { World, PanelUI, Follower, FollowBehavior, UIKitDocument, PanelDocument, createSystem } from '@iwsdk/core';
import { GameState, GameMode, GameStats, PunchType } from './types';
import { AudioManager } from './audio';
import { Opponent } from './opponent';
import { PunchDetector } from './punch';

export class BoxingGame {
  world: World;
  audio = new AudioManager();
  opponent = new Opponent();
  punchDetector = new PunchDetector();
  
  state: GameState = 'title';
  mode: GameMode = 'fight';
  stats: GameStats = { punchesThrown: 0, punchesLanded: 0, combos: 0, damageDealt: 0, damageTaken: 0 };
  
  playerHealth = 100;
  playerStamina = 100;
  playerBlocking = false;
  combo = 0;
  comboTimer = 0;
  round = 1;
  roundTime = 60;
  score = 0;

  private hudEntity: any;
  private lastPunchTime = 0;

  constructor(world: World) {
    this.world = world;
  }

  async init() {
    this.audio.init();
    this.world.scene.add(this.opponent.group);
    await this.setupUI();
    this.setupSystems();
  }

  private async setupUI() {
    // Title
    const titleEnt = this.world.createTransformEntity(undefined, { persistent: true });
    titleEnt.object3D.position.set(0, 1.6, -2);
    titleEnt.addComponent(PanelUI, { config: '/ui/title.json', maxWidth: 0.9, maxHeight: 0.6 });

    // HUD
    this.hudEntity = this.world.createTransformEntity(undefined, { persistent: true });
    this.hudEntity.addComponent(PanelUI, { config: '/ui/hud.json', maxWidth: 0.5, maxHeight: 0.25 });
    this.hudEntity.addComponent(Follower, {
      target: this.world.player.head,
      offsetPosition: [0, -0.2, -0.6],
      behavior: FollowBehavior.PivotY,
      speed: 8,
    });

    setTimeout(() => this.bindUI(), 500);
  }

  private bindUI() {
    const bind = (id: string, fn: () => void) => {
      const ents = this.world.ecs.queryEntities({ has: [PanelUI, PanelDocument] });
      for (const e of ents) {
        const doc = this.world.ecs.getComponent(e, PanelDocument)?.document as UIKitDocument;
        const el = doc?.getElementById(id);
        if (el) el.addEventListener('click', fn);
      }
    };
    bind('btn-start', () => this.startGame());
    bind('btn-training', () => { this.mode = 'training'; this.startGame(); });
    bind('btn-fight', () => { this.mode = 'fight'; this.startGame(); });
    bind('btn-pause', () => this.pause());
    bind('btn-resume', () => this.resume());
    bind('btn-quit', () => this.quitToTitle());
  }

  private setupSystems() {
    const sys = createSystem((world) => {
      const dt = world.time.delta;
      this.update(dt);
    });
    this.world.registerSystem(sys);
  }

  startGame() {
    this.state = 'countdown';
    this.playerHealth = 100;
    this.playerStamina = 100;
    this.combo = 0;
    this.round = 1;
    this.roundTime = 60;
    this.score = 0;
    this.stats = { punchesThrown: 0, punchesLanded: 0, combos: 0, damageDealt: 0, damageTaken: 0 };
    this.opponent.reset();
    this.audio.playBell();
    setTimeout(() => { this.state = 'playing'; }, 3000);
  }

  update(dt: number) {
    if (this.state !== 'playing') return;

    // Round timer
    this.roundTime -= dt;
    if (this.roundTime <= 0) {
      this.nextRound();
    }

    // Combo decay
    this.comboTimer -= dt;
    if (this.comboTimer <= 0 && this.combo > 0) {
      this.combo = 0;
    }

    // Stamina regen
    if (!this.playerBlocking) {
      this.playerStamina = Math.min(100, this.playerStamina + dt * 12);
    }

    // Input
    const rightPad = this.world.input.xr.gamepads.right;
    const headPos = this.world.player.head.position;
    const ctrlPos = rightPad?.pose?.position ? new Vector3().fromArray(rightPad.pose.position) : new Vector3(0.3, 1.2, -0.3);
    
    const trigger = rightPad?.getButtonPressed(0) ?? this.world.input.keyboard.getKeyPressed('Space');
    const grip = rightPad?.getButtonPressed(1) ?? this.world.input.keyboard.getKeyPressed('ShiftLeft');
    
    this.playerBlocking = grip && this.playerStamina > 10;
    if (this.playerBlocking) this.playerStamina -= dt * 20;

    const punch = this.punchDetector.detect(ctrlPos, trigger, grip, headPos);
    let playerPunching = false;

    if (punch && punch.punching && this.playerStamina > 15) {
      playerPunching = true;
      this.playerStamina -= 15;
      this.stats.punchesThrown++;
      this.lastPunchTime = performance.now();
      
      const dist = ctrlPos.distanceTo(this.opponent.group.position);
      if (dist < 1.1) {
        const dmg = 8 + punch.power * 12 + this.combo * 2;
        const heavy = punch.type === 'hook' || punch.type === 'uppercut';
        this.opponent.takeDamage(dmg, heavy);
        this.stats.punchesLanded++;
        this.stats.damageDealt += dmg;
        this.score += Math.floor(dmg * (1 + this.combo * 0.2));
        this.combo++;
        this.comboTimer = 2.0;
        if (this.combo > 2) this.stats.combos++;
        this.audio.playHit(heavy);
        this.audio.playPunch(punch.type);
      } else {
        this.audio.playPunch(punch.type);
      }
    }

    // Opponent update
    this.opponent.update(dt, this.world.player.head.position, playerPunching);

    // Opponent punch hits player
    if (Math.random() < 0.008 && !this.playerBlocking) {
      const dmg = 6 + Math.random() * 8;
      this.playerHealth = Math.max(0, this.playerHealth - dmg);
      this.stats.damageTaken += dmg;
      this.combo = 0;
      this.audio.playHit();
    }

    // Check KO
    if (this.playerHealth <= 0 || this.opponent.state.health <= 0) {
      this.endGame();
    }

    this.updateHUD();
  }

  private updateHUD() {
    const doc = this.hudEntity?.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
    if (!doc) return;
    const set = (id: string, text: string) => {
      const el = doc.getElementById(id);
      if (el) (el as any).text.value = text;
    };
    set('player-hp', `${Math.floor(this.playerHealth)}`);
    set('opp-hp', `${Math.floor(this.opponent.state.health)}`);
    set('stamina', `${Math.floor(this.playerStamina)}`);
    set('combo', this.combo > 1 ? `x${this.combo}` : '');
    set('round', `${this.round}`);
    set('time', `${Math.ceil(this.roundTime)}`);
    set('score', `${this.score}`);
  }

  private nextRound() {
    this.round++;
    if (this.round > 3) {
      this.endGame();
    } else {
      this.roundTime = 60;
      this.playerHealth = Math.min(100, this.playerHealth + 20);
      this.opponent.state.health = 100;
      this.audio.playBell();
    }
  }

  private endGame() {
    this.state = 'gameOver';
    this.audio.playWhistle();
  }

  pause() {
    if (this.state === 'playing') this.state = 'paused';
  }
  resume() {
    if (this.state === 'paused') this.state = 'playing';
  }
  quitToTitle() {
    this.state = 'title';
  }
}
