import { GameState, createDefaultState, ClassType } from '../Models/GameState';

const SAVE_KEY = 'ruin-echoes-save';
const MANUAL_SAVE_THROTTLE = 20000;

function isObject(v: any): v is Record<string, any> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function deepMerge(target: any, source: any): any {
  const output = { ...target };
  for (const key of Object.keys(source)) {
    if (isObject(source[key]) && isObject(target[key])) {
      output[key] = deepMerge(target[key], source[key]);
    } else if (source[key] !== undefined) {
      output[key] = source[key];
    }
  }
  return output;
}

export class SaveSystem {
  private lastManualSave: number = 0;

  save(state: GameState): void {
    const now = Date.now();
    if (now - this.lastManualSave < MANUAL_SAVE_THROTTLE) return;
    this.lastManualSave = now;
    this.forceSave(state);
  }

  forceSave(state: GameState): void {
    try {
      state.meta.lastTimestamp = Date.now();
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('[SaveSystem] Could not save:', e);
    }
  }

  load(): GameState {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return createDefaultState();
    try {
      const parsed = JSON.parse(raw);
      const defaults = createDefaultState();
      const merged = deepMerge(defaults, parsed);
      merged.adventurers = parsed.adventurers ?? defaults.adventurers;
      merged.inventory = parsed.inventory ?? defaults.inventory;
      const validClasses = ['Warrior', 'Mage', 'Ranger', 'Priest'];
      merged.adventurers = merged.adventurers.filter(
        (a: any) => a && typeof a === 'object' && validClasses.includes(a.classType)
      );
      if (Array.isArray(merged.adventurers)) {
        merged.adventurers.forEach((adv: any) => {
          if (adv.xp === undefined || Number.isNaN(adv.xp)) {
            adv.xp = 0;
          }
          if (adv.nextLevelXp === undefined || Number.isNaN(adv.nextLevelXp)) {
            adv.nextLevelXp = Math.floor(100 * Math.pow(1.25, adv.level - 1));
          }
          if (adv.currentHP === undefined) {
            const baseHPMap: Record<string, number> = { Warrior: 120, Mage: 60, Ranger: 80, Priest: 75 };
            const baseHP = baseHPMap[adv.classType] ?? 100;
            adv.currentHP = Math.round(baseHP * Math.pow(1.12, adv.level - 1));
          }
        });
      }
      return merged as GameState;
    } catch {
      return createDefaultState();
    }
  }

  getOfflineDelta(state: GameState): number {
    return Math.floor((Date.now() - state.meta.lastTimestamp) / 1000);
  }

  static hasOfflineTime(delta: number): boolean {
    return delta > 10;
  }
}
