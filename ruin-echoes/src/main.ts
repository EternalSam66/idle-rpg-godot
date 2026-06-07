import { GameState, AdventurerState, computeMaxPartySlots } from './Models/GameState';
import { EventBus } from './Core/EventBus';
import { GameLoop } from './Core/GameLoop';
import { SaveSystem } from './Core/SaveSystem';
import { DungeonEngine } from './Dungeon/DungeonEngine';
import { UIManager } from './UI/UIManager';
import { Adventurer } from './Components/Adventurer';
import { EquipmentManager } from './Components/EquipmentManager';
import { formatNumber } from './Core/format';

const UPGRADE_CONFIG: Record<string, { baseCost: number; scaler: number; maxLevel: number }> = {
  barracksTraining: { baseCost: 20, scaler: 1.16, maxLevel: 100 },
  trainingGrounds: { baseCost: 75, scaler: 1.16, maxLevel: 100 },
  ironForging: { baseCost: 25, scaler: 1.16, maxLevel: 100 },
  armorSmith: { baseCost: 80, scaler: 1.16, maxLevel: 100 },
  vitalSprings: { baseCost: 20, scaler: 1.16, maxLevel: 100 },
  guildHall: { baseCost: 70, scaler: 1.16, maxLevel: 100 },
  campfireKit: { baseCost: 12500, scaler: 5.0, maxLevel: 3 },
  rations: { baseCost: 50, scaler: 1.22, maxLevel: 50 },
  treasureVault: { baseCost: 40, scaler: 1.15, maxLevel: 100 },
  luckyStar: { baseCost: 150, scaler: 1.25, maxLevel: 50 },
  smelter: { baseCost: 90, scaler: 1.20, maxLevel: 50 },
  partyExpansion: { baseCost: 500, scaler: 12.0, maxLevel: 3 },
};

class GameManager {
  private state: GameState;
  private eventBus: EventBus;
  private gameLoop: GameLoop;
  private saveSystem: SaveSystem;
  private dungeonEngine: DungeonEngine;
  private ui: UIManager;

  constructor() {
    this.eventBus = new EventBus();
    this.saveSystem = new SaveSystem();
    this.state = this.saveSystem.load();
    this.dungeonEngine = new DungeonEngine(this.state, this.eventBus);
    this.ui = new UIManager(this.eventBus);
    EquipmentManager.init(this.eventBus);
    this.gameLoop = new GameLoop((dt) => this.fixedUpdate(dt));

    this.registerEvents();
  }

  private registerEvents(): void {
    this.eventBus.on('ui:action', (payload) => {
      const p = payload as any;
      try {
        switch (p.action) {
          case 'hire':
            this.hireAdventurer(p.classType);
            break;
          case 'upgrade':
            this.purchaseUpgrade(p.upgradeKey);
            break;
          case 'equip':
            this.equipItem(p.inventoryIndex);
            break;
          case 'unequip':
            this.unequipItem(p.heroId, p.slot);
            break;
          case 'startRun':
            if (!this.dungeonEngine.isRunning()) {
              this.dungeonEngine.startRun();
            }
            break;
          case 'cancelRun':
            this.dungeonEngine.cancelRun();
            break;
          case 'sell':
            this.sellItem(p.inventoryIndex);
            break;
          case 'toggleAutoSell':
            this.toggleAutoSell(p.rarity);
            break;
          case 'toggleAutoRetry':
            this.toggleAutoRetry();
            break;
          case 'toggleAutoAdvance':
            this.toggleAutoAdvance();
            break;
          case 'levelChange': {
            const maxAllowedFloor = Math.max(1, this.state.maxClearedLevel + 1);
            if (p.setMax) {
              this.state.currentLevel = Math.min(100, maxAllowedFloor);
            } else {
              const next = this.state.currentLevel + p.delta;
              const clamped = Math.max(1, Math.min(maxAllowedFloor, next));
              if (clamped >= 1 && clamped <= maxAllowedFloor) {
                this.state.currentLevel = clamped;
              }
            }
            this.eventBus.emit('LEVEL_CHANGED', { level: this.state.currentLevel });
            this.eventBus.emit('state:changed', this.state);
            break;
          }
        }
      } catch (e) {
        console.error('[Echoes] Action error:', p?.action, e);
      }
    });

    this.eventBus.on('run:complete', () => {
      this.saveSystem.forceSave(this.state);
    });

    this.eventBus.on('state:changed', () => {
      // Triggered after state mutations to ensure UI refresh
    });
  }

  private hireAdventurer(classType: string): void {
    const alreadyHired = this.state.adventurers.some(h => h.classType === classType);
    if (alreadyHired) return;
    if (this.state.adventurers.length >= computeMaxPartySlots(this.state.upgrades)) return;
    const unlockLevel = Adventurer.getUnlockLevel(classType as any);
    const currentAccessibleLevel = this.state.maxClearedLevel + 1;
    const isWarrior = classType === 'Warrior';
    if (!isWarrior && currentAccessibleLevel < unlockLevel) return;
    const cost = Adventurer.getHireCost(classType as any);
    if (this.state.coins < cost) {
      console.warn(`[Guild] Cannot recruit ${classType}: Requires ${cost} coins.`);
      return;
    }

    this.state.coins -= cost;
    const base = Adventurer.getBaseStats(classType as any);
    const adv: AdventurerState = {
      id: `adv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      classType: classType as any,
      level: 1,
      xp: 0,
      nextLevelXp: 100,
      currentHP: base.hp,
      equipment: { Weapon: null, Armor: null, Accessory: null },
      specializationLevel: 0,
    };
    this.state.adventurers.push(adv);
    this.saveSystem.save(this.state);
    this.eventBus.emit('state:changed', this.state);
  }

  private purchaseUpgrade(key: string): void {
    const upg = this.state.upgrades as any;
    const currentLevel = upg[key] as number;
    const config = UPGRADE_CONFIG[key];
    if (!config || currentLevel >= config.maxLevel) return;

    const cost = Math.floor(config.baseCost * Math.pow(config.scaler, currentLevel));
    if (this.state.coins < cost) return;

    this.state.coins -= cost;
    upg[key] = currentLevel + 1;
    this.saveSystem.save(this.state);
    this.eventBus.emit('UPGRADE_PURCHASED', { upgradeKey: key, newLevel: currentLevel + 1 });
    this.eventBus.emit('state:changed', this.state);
  }

  private equipItem(inventoryIndex: number): void {
    const eq = this.state.inventory[inventoryIndex];
    if (!eq) return;
    EquipmentManager.initiateEquipWorkflow(this.state, eq);
    this.saveSystem.save(this.state);
    this.eventBus.emit('state:changed', this.state);
  }

  private unequipItem(heroId: string, slot: string): void {
    const hero = this.state.adventurers.find(a => a.id === heroId);
    if (!hero) return;
    const equipped = hero.equipment[slot as keyof typeof hero.equipment];
    if (!equipped) return;
    hero.equipment[slot as keyof typeof hero.equipment] = null;
    this.state.inventory.push(equipped);
    if (slot === 'Armor') {
      const stats = Adventurer.computeStats(hero, this.state.upgrades);
      hero.currentHP = Math.min(hero.currentHP, stats.hp);
      if (hero.currentHP <= 0) hero.currentHP = stats.hp;
    }
    this.saveSystem.save(this.state);
    this.eventBus.emit('state:changed', this.state);
  }

  private sellItem(index: number): void {
    const eq = this.state.inventory[index];
    if (!eq) return;
    const coinYield = EquipmentManager.calculateCoinYield(eq, this.state.upgrades.smelter);
    this.state.coins += coinYield;
    this.state.inventory.splice(index, 1);
    this.saveSystem.save(this.state);
    this.eventBus.emit('state:changed', this.state);
  }

  private toggleAutoRetry(): void {
    this.state.settings.autoRetry = !this.state.settings.autoRetry;
    this.saveSystem.save(this.state);
    this.eventBus.emit('state:changed', this.state);
  }

  private toggleAutoAdvance(): void {
    this.state.settings.autoAdvance = !this.state.settings.autoAdvance;
    this.saveSystem.save(this.state);
    this.eventBus.emit('state:changed', this.state);
  }

  private toggleAutoSell(rarity: string): void {
    this.state.settings.autoSellRarities[rarity as keyof typeof this.state.settings.autoSellRarities]
      = !this.state.settings.autoSellRarities[rarity as keyof typeof this.state.settings.autoSellRarities];
    this.saveSystem.save(this.state);
    this.eventBus.emit('state:changed', this.state);
  }

  private fixedUpdate(dt: number): void {
    try {
      this.dungeonEngine.tick(dt);

      const grid = this.dungeonEngine.getGrid();
      const partyX = this.dungeonEngine.getPartyX();
      const logs = this.dungeonEngine.getLogs();
      this.ui.render(this.state, grid, partyX, logs);
    } catch (e) {
      console.error('[Echoes] Update error:', e);
    }
  }

  start(): void {
    this.eventBus.emit('state:changed', this.state);
    this.gameLoop.start();
  }

  private showOfflineReport(result: { runsCompleted: number; levelsCleared: number; coinsGained: number; lootFound: number; wipes: number }): void {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/70 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-gray-900 border border-gray-700 rounded p-6 max-w-md text-sm space-y-2">
        <h2 class="text-lg font-bold neon-gold">Offline Activity Report</h2>
        <p>Runs completed: ${result.runsCompleted}</p>
        <p>Wipes: ${result.wipes}</p>
        <p>Coins earned: ${formatNumber(result.coinsGained)}</p>
        <p>Loot found: ${result.lootFound}</p>
        <button class="mt-4 px-4 py-2 bg-accent rounded text-white font-bold close-modal">OK</button>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('.close-modal')!.addEventListener('click', () => modal.remove());
  }
}

try {
  const game = new GameManager();
  game.start();
  console.log('[Echoes] Booted successfully');
} catch (e) {
  console.error('[Echoes] Fatal boot error:', e);
  document.getElementById('app')!.innerHTML = `
    <div class="flex items-center justify-center h-screen text-accent">
      Failed to start: ${e instanceof Error ? e.message : String(e)}
    </div>
  `;
}
