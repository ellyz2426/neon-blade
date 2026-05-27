import { World, PanelUI, Follower, FollowBehavior, ScreenSpace, PanelDocument, UIKitDocument } from '@iwsdk/core';
import { GameState, BLADE_THEMES } from './types';

export class UIManager {
  world: World;
  panels = new Map<string, any>();
  docs = new Map<string, UIKitDocument>();

  constructor(world: World) {
    this.world = world;
  }

  async init() {
    await this.createPanel('title', '/ui/title.json', [0, 1.6, -2.5], false);
    await this.createPanel('modeselect', '/ui/modeselect.json', [0, 1.6, -2.5], false);
    await this.createPanel('pause', '/ui/pause.json', [0, 1.6, -2], false);
    await this.createPanel('gameover', '/ui/gameover.json', [0, 1.6, -2], false);
    await this.createPanel('settings', '/ui/settings.json', [0, 1.6, -2], false);
    await this.createPanel('help', '/ui/help.json', [0, 1.6, -2], false);
    await this.createPanel('countdown', '/ui/countdown.json', [0, 1.8, -2], false);
    await this.createPanel('leaderboard', '/ui/leaderboard.json', [0, 1.6, -2], false);
    await this.createPanel('achievements', '/ui/achievements.json', [0, 1.6, -2], false);
    await this.createHUD();
    await this.createToast();
    this.hideAll();
  }

  async createPanel(id: string, config: string, pos: [number, number, number], visible: boolean) {
    const e = this.world.createTransformEntity(undefined, { persistent: true });
    e.object3D.position.set(...pos);
    e.addComponent(PanelUI, { config, maxWidth: 0.8, maxHeight: 1.0 });
    e.object3D.visible = visible;
    this.panels.set(id, e);
  }

  async createHUD() {
    const e = this.world.createTransformEntity(undefined, { persistent: true });
    e.addComponent(PanelUI, { config: '/ui/hud.json', maxWidth: 0.45, maxHeight: 0.2 });
    e.addComponent(Follower, { target: this.world.player.head, offsetPosition: [0.35, -0.2, -0.6], behavior: FollowBehavior.PivotY, speed: 5 });
    e.object3D.visible = false;
    this.panels.set('hud', e);
  }

  async createToast() {
    const e = this.world.createTransformEntity(undefined, { persistent: true });
    e.addComponent(PanelUI, { config: '/ui/toast.json', maxWidth: 0.5, maxHeight: 0.15 });
    e.addComponent(Follower, { target: this.world.player.head, offsetPosition: [0, 0.3, -0.8], behavior: FollowBehavior.PivotY, speed: 6 });
    e.object3D.visible = false;
    this.panels.set('toast', e);
  }

  show(id: string) {
    const e = this.panels.get(id);
    if (e) e.object3D.visible = true;
  }
  hide(id: string) {
    const e = this.panels.get(id);
    if (e) e.object3D.visible = false;
  }
  hideAll() {
    for (const e of this.panels.values()) e.object3D.visible = false;
  }

  getDoc(id: string): UIKitDocument | undefined {
    const e = this.panels.get(id);
    if (!e) return;
    const doc = e.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
    return doc;
  }

  setText(panelId: string, elementId: string, text: string) {
    const doc = this.getDoc(panelId);
    const el = doc?.getElementById(elementId);
    if (el && 'text' in el) (el as any).text.value = text;
  }

  setVisible(panelId: string, visible: boolean) {
    const e = this.panels.get(panelId);
    if (e) e.object3D.visible = visible;
  }

  updateHUD(state: GameState) {
    this.setText('hud', 'health-player', `${Math.max(0, Math.round(state.playerHealth))}`);
    this.setText('hud', 'health-opp', `${Math.max(0, Math.round(state.opponentHealth))}`);
    this.setText('hud', 'stamina-player', `${Math.max(0, Math.round(state.playerStamina))}`);
    this.setText('hud', 'combo', `x${state.combo}`);
    this.setText('hud', 'score', `${state.score}`);
    if (state.mode === 'timeattack') {
      this.setText('hud', 'time', `${Math.max(0, Math.ceil(state.timeLeft))}s`);
    }
  }

  showToast(msg: string, ms = 1500) {
    const icon = msg.includes('Achievement') ? '🏆 ' : msg.includes('Wave') ? '⚔️ ' : '✨ ';
    this.setText('toast', 'toast-text', icon + msg);
    this.show('toast');
    setTimeout(() => this.hide('toast'), ms);
  }

  populateLeaderboard(entries: Array<{name:string,score:number}>) {
    for (let i = 0; i < 5; i++) {
      const name = entries[i]?.name ?? '---';
      const score = entries[i]?.score != null ? `${entries[i].score}` : '-----';
      this.setText('leaderboard', `lb-name-${i+1}`, name);
      this.setText('leaderboard', `lb-score-${i+1}`, score);
    }
  }

  populateAchievements(achs: Array<{name:string, unlocked:boolean, desc:string}>) {
    for (let i = 0; i < 8; i++) {
      const a = achs[i];
      if (!a) continue;
      this.setText('achievements', `ach-name-${i}`, `${a.unlocked ? '✓ ' : '✗ '}${a.name}`);
      this.setText('achievements', `ach-stat-${i}`, a.unlocked ? 'Unlocked' : a.desc);
    }
  }

  updateSettingsDisplay(vals: {master:number,sfx:number,music:number,diff:string}) {
    this.setText('settings', 'val-master', `${Math.round(vals.master*100)}%`);
    this.setText('settings', 'val-sfx', `${Math.round(vals.sfx*100)}%`);
    this.setText('settings', 'val-music', `${Math.round(vals.music*100)}%`);
    this.setText('settings', 'val-diff', vals.diff.toUpperCase());
  }
}
