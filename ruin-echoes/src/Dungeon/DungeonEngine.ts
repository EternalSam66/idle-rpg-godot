import { GameState, Equipment } from '../Models/GameState';
import { GridSystem, OccupantData, GridCell } from './GridSystem';
import { MapGenerator } from './MapGenerator';
import { CombatEngine } from '../Components/CombatEngine';
import { EquipmentManager } from '../Components/EquipmentManager';
import { Adventurer } from '../Components/Adventurer';
import { EventBus } from '../Core/EventBus';

const STEP_INTERVAL = 0.40;
const ENCOUNTER_DELAY = 1.0;

export class DungeonEngine {
  private currentX: number = 0;
  private isProcessingEvent: boolean = false;
  private accumulatedTime: number = 0;
  private activeLevelMap: GridSystem | null = null;
  private running: boolean = false;
  private bossDefeated: boolean = false;
  private level: number = 0;
  private processingTimer: number = 0;
  private logs: string[] = [];
  private lootGained: Equipment[] = [];
  private coinsGained: number = 0;
  private autoRetryTimeout: ReturnType<typeof setTimeout> | null = null;
  private currentRunRevivesUsed: number = 0;

  constructor(
    private state: GameState,
    private eventBus: EventBus,
  ) {
    this.eventBus.on('LOG_MESSAGE', (payload) => {
      this.logs.push(payload.text);
    });
  }

  startRun(): void {
    this.level = this.state.currentLevel;
    this.activeLevelMap = new GridSystem(this.level);
    MapGenerator.generate(this.activeLevelMap, this.level, this.state.adventurers.length);
    this.currentX = 0;
    this.accumulatedTime = 0;
    this.isProcessingEvent = false;
    this.bossDefeated = false;
    this.running = true;
    this.processingTimer = 0;
    this.logs = [];
    this.lootGained = [];
    this.coinsGained = 0;
    this.currentRunRevivesUsed = 0;

    this.logs.push(`[Run] Starting dungeon Level ${this.level}`);
    this.logs.push(`[Run] Party: ${this.state.adventurers.length} adventurers`);

    for (const adv of this.state.adventurers) {
      const stats = Adventurer.computeStats(adv, this.state.upgrades);
      adv.currentHP = stats.hp;
    }

    this.eventBus.emit('run:start', { level: this.level });
    this.eventBus.emit('PARTY_MOVED', { newX: 0 });
  }

  tick(dt: number): void {
    const dtSec = dt / 1000;
    if (!this.running) return;

    if (this.isProcessingEvent) {
      this.processingTimer -= dtSec;
      if (this.processingTimer <= 0) {
        this.isProcessingEvent = false;
        this.processingTimer = 0;
      }
      return;
    }

    this.accumulatedTime += dtSec;
    if (this.accumulatedTime < STEP_INTERVAL) return;
    this.accumulatedTime -= STEP_INTERVAL;

    this.processMovementStep();
  }

  private processMovementStep(): void {
    if (!this.activeLevelMap) return;
    const centerY = Math.floor(this.activeLevelMap.height / 2);

    console.log(`[Engine Tick] Coordinate position verified at X: ${this.currentX} / Max Width: ${this.activeLevelMap.width}`);

    const currentCell = this.activeLevelMap.getCell(this.currentX, centerY);

    if (currentCell && (currentCell.occupant === 'Monster' || currentCell.occupant === 'Boss')) {
      this.isProcessingEvent = true;
      this.resolveCellCollision(currentCell);
      return;
    }

    if (this.currentX >= this.activeLevelMap.width - 1) {
      this.handleRunCompletion();
      return;
    }

    this.currentX += 1;
    this.eventBus.emit('PARTY_MOVED', { newX: this.currentX });

    const nextCell = this.activeLevelMap.getCell(this.currentX, centerY);
    if (nextCell) {
      this.resolveCellCollision(nextCell);
    }
  }

  private handleRunCompletion(): void {
    if (this.bossDefeated) {
      this.endRun(true);
    }
  }

  private resolveCellCollision(cell: GridCell): void {
    switch (cell.occupant) {
      case 'Chest':
        this.handleChest(cell);
        break;
      case 'Monster':
      case 'Boss':
        if (cell.occupantData) {
          this.handleEncounter(cell.occupantData);
        }
        break;
      case 'None':
        if (this.activeLevelMap && this.currentX >= this.activeLevelMap.width - 1) {
          this.handleRunCompletion();
        }
        break;
    }
  }

  private handleChest(cell: { x: number; y: number; occupant: string; occupantData: OccupantData | null }): void {
    this.isProcessingEvent = true;
    this.processingTimer = 0.20;

    const coinsFound = 5 + Math.floor(Math.random() * (10 + this.level * 2));
    this.state.coins += coinsFound;
    this.coinsGained += coinsFound;

    const loot = EquipmentManager.rollEquipment(
      this.level,
      this.level,
      this.state.upgrades.luckyStar,
    );
    EquipmentManager.processLootDrop(this.state, loot);
    this.lootGained.push(loot);

    this.logs.push(`[Chest] Found ${coinsFound}g and ${loot.rarity} ${loot.name}!`);
    this.activeLevelMap?.clearOccupant(cell.x, cell.y);
    this.eventBus.emit('CHEST_LOOTED', { loot });
  }

  private handleEncounter(occupant: OccupantData): void {
    this.isProcessingEvent = true;
    this.processingTimer = ENCOUNTER_DELAY;

    if (!occupant.monster) return;

    const isBoss = occupant.monster.isBoss;
    this.logs.push(`[Encounter] ${isBoss ? 'BOSS' : 'Monster'} at x=${this.currentX}`);

    const result = CombatEngine.resolveEncounter(
      this.state.adventurers,
      occupant.monster,
      this.state.upgrades,
      this.level,
    );

    this.logs.push(...result.battleLog);

    for (const adv of result.updatedParty) {
      const match = this.state.adventurers.find(a => a.id === adv.id);
      if (match) match.currentHP = adv.currentHP;
    }
    this.eventBus.emit('state:changed', this.state);

    if (result.outcome === 'VICTORY') {
      if (this.activeLevelMap) {
        for (let y = 0; y < this.activeLevelMap.height; y++) {
          const c = this.activeLevelMap.getCell(this.currentX, y);
          if (c && c.occupantData === occupant) {
            this.activeLevelMap.clearOccupant(c.x, c.y);
          }
        }
      }

      if (isBoss) {
        this.bossDefeated = true;
        const bossCoins = Math.floor(50 + this.level * 10);
        this.state.coins += bossCoins;
        this.coinsGained += bossCoins;
        this.logs.push(`[Boss] Boss defeated! +${bossCoins}g`);
      } else {
        const monsterCoins = 5 + this.level;
        this.state.coins += monsterCoins;
        this.coinsGained += monsterCoins;
        this.logs.push(`[Victory] Monster slain! +${monsterCoins}g`);
      }

      const loot = EquipmentManager.rollEquipment(this.level, this.level, this.state.upgrades.luckyStar);
      if (Math.random() < 0.7) {
        EquipmentManager.processLootDrop(this.state, loot);
        this.lootGained.push(loot);
      }

      this.eventBus.emit('combat:resolve', { win: true });
    } else {
      if (this.currentRunRevivesUsed < this.state.upgrades.campfireKit) {
        this.currentRunRevivesUsed++;
        this.isProcessingEvent = true;
        this.processingTimer = 1.5;
        const recoveryPercent = 0.25 + (this.state.upgrades.campfireKit * 0.15);
        for (const adv of this.state.adventurers) {
          const stats = Adventurer.computeStats(adv, this.state.upgrades);
          adv.currentHP = Math.round(stats.hp * recoveryPercent);
        }
        this.logs.push(`[Campfire Kit] The party used a campfire revive charge and restored ${Math.round(recoveryPercent * 100)}% health at coordinate X: ${this.currentX}!`);
        this.eventBus.emit('PARTY_REVIVED', { updatedParty: this.state.adventurers, currentX: this.currentX });
        this.eventBus.emit('state:changed', this.state);
      } else {
        this.logs.push('[Wipe] Party wiped — all adventurers defeated');
        this.eventBus.emit('combat:resolve', { win: false });
        this.endRun(false);
      }
    }
  }

  cancelRun(): void {
    if (!this.running) return;
    this.running = false;
    this.isProcessingEvent = true;

    if (this.autoRetryTimeout) {
      clearTimeout(this.autoRetryTimeout);
      this.autoRetryTimeout = null;
    }

    this.state.runCount++;
    this.reviveParty();
    this.logs.push('[Cancel] Run cancelled by player');
    this.activeLevelMap = null;

    this.eventBus.emit('RUN_TERMINATED_MANUAL', {
      level: this.level,
      coinsGained: this.coinsGained,
      lootCount: this.lootGained.length,
    });
    this.eventBus.emit('run:complete', { cleared: false, level: this.level, rewards: {
      coins: this.coinsGained, loot: this.lootGained.length
    }});
    this.eventBus.emit('state:changed', this.state);
  }

  private reviveParty(): void {
    for (const adv of this.state.adventurers) {
      const stats = Adventurer.computeStats(adv, this.state.upgrades);
      adv.currentHP = stats.hp;
    }
  }

  private endRun(cleared: boolean): void {
    this.running = false;
    this.state.runCount++;

    this.reviveParty();

    if (cleared) {
      const treasureBonus = this.state.upgrades.treasureVault * 0.12;
      const coinsEarned = Math.floor((15 * Math.pow(1.42, this.level - 1)) * (1 + treasureBonus));
      this.state.coins += coinsEarned;
      this.coinsGained += coinsEarned;

      if (this.level > this.state.maxClearedLevel) {
        this.state.maxClearedLevel = this.level;
        if (this.level < 100) {
          this.state.currentLevel = this.level + 1;
        }
      }

      for (const adv of this.state.adventurers) {
        adv.level++;
      }
      for (const adv of this.state.adventurers) {
        if (this.level % 5 === 0) {
          adv.specializationLevel++;
        }
      }

      this.logs.push(`[Victory] Dungeon Level ${this.level} cleared!`);
      this.logs.push(`[Reward] +${coinsEarned}g, +1 level to all adventurers`);

      this.eventBus.emit('RUN_TERMINATED_VICTORY', {
        level: this.level,
        coinsGained: this.coinsGained,
        lootCount: this.lootGained.length,
      });
      this.eventBus.emit('run:complete', {
        cleared: true,
        level: this.level,
        rewards: { coins: coinsEarned, loot: this.lootGained.length },
      });

      if (this.state.settings.autoAdvance) {
        const nextFloor = this.level + 1;
        if (nextFloor <= 100) {
          this.eventBus.emit('LOG_MESSAGE', {
            text: `[System] Auto-advancing to Dungeon Floor ${nextFloor}...`,
          });
          setTimeout(() => {
            this.startRun();
          }, 1500);
        }
      }
    } else {
      this.state.adventurers.forEach(adv => {
        const baseHP = Adventurer.getBaseStats(adv.classType).hp;
        const maxHP = baseHP * Math.pow(1.12, adv.level - 1);
        adv.currentHP = Math.round(maxHP);
      });

      this.logs.push('[Defeat] Run terminated — party revived');

      this.eventBus.emit('RUN_TERMINATED_DEFEAT', {
        level: this.level,
        coinsGained: this.coinsGained,
        lootCount: this.lootGained.length,
        survivedLevels: this.currentX,
      });
      this.eventBus.emit('run:complete', {
        cleared: false,
        level: this.level,
        rewards: { coins: this.coinsGained, loot: this.lootGained.length },
      });

      if (this.state.settings.autoRetry) {
        this.autoRetryTimeout = setTimeout(() => {
          this.autoRetryTimeout = null;
          this.startRun();
        }, 1500);
      }
    }

    this.activeLevelMap = null;
    this.eventBus.emit('state:changed', this.state);
  }

  isRunning(): boolean { return this.running; }
  getGrid(): GridSystem | null { return this.activeLevelMap; }
  getPartyX(): number { return this.currentX; }
  getLogs(): string[] { return this.logs; }
  isProcessing(): boolean { return this.isProcessingEvent; }

  static simulateOffline(
    state: GameState,
    secondsElapsed: number,
  ): { runsCompleted: number; levelsCleared: number; coinsGained: number; lootFound: number; wipes: number } {
    const estimatedRunTime = 25;
    const runsPossible = Math.max(0, Math.floor(secondsElapsed / estimatedRunTime));

    let runsCompleted = 0;
    let coinsGained = 0;
    let lootFound = 0;
    let wipes = 0;
    let tempLevel = state.currentLevel;

    for (let i = 0; i < Math.min(runsPossible, 50); i++) {
      const partyATK = state.adventurers.reduce((sum, a) => {
        const stats = Adventurer.computeStats(a, state.upgrades);
        return sum + stats.atk;
      }, 0);
      const partyHP = state.adventurers.reduce((sum, a) => {
        const stats = Adventurer.computeStats(a, state.upgrades);
        return sum + stats.hp;
      }, 0);
      const partySize = state.adventurers.length;
      const monster = MapGenerator.getEnemyStats(tempLevel, false, partySize);
      const monsterEHP = monster.hp + monster.def * 0.3;
      const rounds = Math.ceil(monsterEHP / Math.max(1, partyATK));
      const roundsAttacking = rounds;
      const damage = monster.atk * roundsAttacking;

      if (damage < partyHP) {
        tempLevel++;
        runsCompleted++;
        const coinReward = Math.floor((15 * Math.pow(1.42, tempLevel - 1)) * (1 + state.upgrades.treasureVault * 0.12));
        coinsGained += coinReward;
        lootFound += 1 + Math.floor(Math.random() * 3);
      } else {
        wipes++;
        lootFound += 1;
      }
    }

    return { runsCompleted, levelsCleared: runsCompleted, coinsGained, lootFound, wipes };
  }
}
