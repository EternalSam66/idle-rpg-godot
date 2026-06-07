import { Equipment, Rarity, Slot, Affix, AffixType, GameState, AdventurerState } from '../Models/GameState';
import { EventBus } from '../Core/EventBus';
import { Adventurer } from './Adventurer';

const WEAPON_NAMES = ['Iron Blade', 'Oak Staff', 'Short Bow', 'Crystal Wand', 'Shadow Dagger'];
const ARMOR_NAMES = ['Leather Vest', 'Chain Mail', 'Plate Armor', 'Mystic Robe', 'Bone Armor'];
const ACCESSORY_NAMES = ['Silver Ring', 'Amber Pendant', 'Onyx Bracelet', 'Sapphire Amulet', 'Emerald Brooch'];

const AFFIX_TYPES: AffixType[] = ['ATK%', 'DEF%', 'Crit%', 'GoldFind%', 'Lifesteal%'];

const RARITY_MULTS: Record<Rarity, number> = {
  Common: 1.0, Uncommon: 1.3, Rare: 1.6, Epic: 2.0, Legendary: 2.5,
};

let idCounter = 0;

function rollRarity(dungeonLevel: number, luckyStarLevel: number = 0): Rarity {
  const rates = EquipmentManager.getDropRates(dungeonLevel, luckyStarLevel);
  const roll = Math.random() * 100;
  let cumulative = 0;
  const order: Rarity[] = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
  for (const rarity of order) {
    cumulative += rates[rarity];
    if (roll < cumulative) return rarity;
  }
  return 'Common';
}

export class EquipmentManager {
  private static _eventBus: EventBus | null = null;
  private static rarityMults: Record<string, number> = {
    Common: 1.0,
    Uncommon: 1.3,
    Rare: 1.6,
    Epic: 2.0,
    Legendary: 2.5,
  };

  static init(eventBus: EventBus): void {
    EquipmentManager._eventBus = eventBus;
  }

  static rollEquipment(level: number, dungeonLevel: number, luckyStarLevel: number = 0): Equipment {
    const slot = EquipmentManager.rollSlot();
    const rarity = rollRarity(dungeonLevel, luckyStarLevel);
    const mult = RARITY_MULTS[rarity];

    const base: Equipment = {
      id: `eq_${++idCounter}_${Date.now()}`,
      slot,
      name: EquipmentManager.rollName(slot),
      rarity,
      itemLevel: Math.max(1, level + Math.floor(Math.random() * 3) - 1),
      statValue: 0,
    };

    if (slot === 'Weapon') {
      base.statValue = Math.round((2 + base.itemLevel * 1.5) * mult);
    } else if (slot === 'Armor') {
      base.statValue = Math.round((1 + base.itemLevel * 0.5) * mult);
    } else {
      base.affix = EquipmentManager.rollAffix();
    }

    return base;
  }

  static rollSlot(): Slot {
    const roll = Math.random();
    if (roll < 0.40) return 'Weapon';
    if (roll < 0.70) return 'Armor';
    return 'Accessory';
  }

  static rollName(slot: Slot): string {
    const list = slot === 'Weapon' ? WEAPON_NAMES
      : slot === 'Armor' ? ARMOR_NAMES
      : ACCESSORY_NAMES;
    return list[Math.floor(Math.random() * list.length)];
  }

  static rollAffix(): Affix {
    const type = AFFIX_TYPES[Math.floor(Math.random() * AFFIX_TYPES.length)];
    const modifier = Math.round((0.05 + Math.random() * 0.15) * 100) / 100;
    return { type, modifier };
  }

  static getRarityMult(rarity: Rarity): number {
    return RARITY_MULTS[rarity] ?? 1.0;
  }

  static sellItem(state: GameState, itemId: string): number {
    const itemIndex = state.inventory.findIndex(item => item.id === itemId);
    if (itemIndex === -1) return 0;

    const item = state.inventory[itemIndex];
    const coinYield = EquipmentManager.calculateCoinYield(item, state.upgrades.smelter);
    state.coins += coinYield;
    state.inventory.splice(itemIndex, 1);
    return coinYield;
  }

  static processLootDrop(state: GameState, droppedItem: Equipment): void {
    const filterSetting = state.settings.autoSellRarities[droppedItem.rarity];
    const isAutoSellEnabled = filterSetting === true || (filterSetting as unknown as string) === "true";

    console.debug(`[EquipmentManager] processLootDrop — rarity: ${droppedItem.rarity}, filterSetting: ${filterSetting} (${typeof filterSetting}), isAutoSellEnabled: ${isAutoSellEnabled}`);

    if (isAutoSellEnabled) {
      const baseValue = droppedItem.itemLevel * 5 * EquipmentManager.rarityMults[droppedItem.rarity];
      const finalCoinYield = Math.floor(baseValue * (1 + (state.upgrades.smelter * 0.15)));

      state.coins += finalCoinYield;

      EquipmentManager._eventBus?.emit('LOG_MESSAGE', {
        text: `[Auto-Sell] Liquidated ${droppedItem.name} (${droppedItem.rarity}) for ${finalCoinYield} coins.`,
      });
    } else {
      state.inventory.push(droppedItem);

      EquipmentManager._eventBus?.emit('LOG_MESSAGE', {
        text: `[Loot] Added ${droppedItem.name} (${droppedItem.rarity}) to inventory.`,
      });
    }

    EquipmentManager._eventBus?.emit('state:changed', state);
  }

  static calculateCoinYield(item: Equipment, smelterLevel: number): number {
    const base = item.itemLevel * 5 * RARITY_MULTS[item.rarity];
    return Math.floor(base * (1 + (smelterLevel * 0.15)));
  }

  static getDropRates(dungeonLevel: number, luckyStarLevel: number = 0): Record<Rarity, number> {
    let rareBase: number;
    let epicBase: number;
    let legendaryBase: number;

    if (dungeonLevel < 20) {
      legendaryBase = 0;
      epicBase = 0;
      rareBase = Math.min(15, 1 + (dungeonLevel * 0.5));
    } else {
      legendaryBase = Math.min(1.5, 0.1 + ((dungeonLevel - 20) * 0.02));
      epicBase = Math.min(5.0, 0.5 + ((dungeonLevel - 20) * 0.05));
      rareBase = Math.min(25.0, 10 + ((dungeonLevel - 20) * 0.2));
    }

    const luckyMod = 1 + (luckyStarLevel * 0.05);
    const finalLegendary = legendaryBase * luckyMod;
    const finalEpic = epicBase * luckyMod;
    const finalRare = rareBase * luckyMod;

    const remaining = 100 - finalLegendary - finalEpic - finalRare;
    const finalCommon = remaining * 0.625;
    const finalUncommon = remaining * 0.375;

    return {
      Common: finalCommon,
      Uncommon: finalUncommon,
      Rare: finalRare,
      Epic: finalEpic,
      Legendary: finalLegendary,
    };
  }

  static salvageValue(equipment: Equipment): number {
    return EquipmentManager.calculateCoinYield(equipment, 0);
  }

  static salvageValueWithBonus(equipment: Equipment, smelterLevel: number): number {
    return EquipmentManager.calculateCoinYield(equipment, smelterLevel);
  }

  static initiateEquipWorkflow(state: GameState, item: Equipment): void {
    if (state.adventurers.length === 0) return;

    if (state.adventurers.length === 1) {
      this.equipToTarget(state, state.adventurers[0], item);
      return;
    }

    this.showPartySelectionModal(state, item);
  }

  static equipToTarget(state: GameState, target: AdventurerState, item: Equipment): void {
    const current = target.equipment[item.slot];
    if (current) state.inventory.push(current);

    target.equipment[item.slot] = item;
    const idx = state.inventory.indexOf(item);
    if (idx !== -1) state.inventory.splice(idx, 1);

    if (item.slot === 'Armor') {
      const stats = Adventurer.computeStats(target, state.upgrades);
      target.currentHP = Math.min(target.currentHP, stats.hp);
      if (target.currentHP <= 0) target.currentHP = stats.hp;
    }

    this._eventBus?.emit('state:changed', state);
  }

  static showPartySelectionModal(state: GameState, item: Equipment): void {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/70 flex items-center justify-center z-50';

    let buttonsHtml = '';
    state.adventurers.forEach((hero, index) => {
      buttonsHtml += `
        <button class="bg-slate-700 hover:bg-blue-600 text-white font-bold p-2 my-1 w-full rounded text-sm transition-colors" data-hero-index="${index}">
          Equip to ${hero.classType} (Lv.${hero.level})
        </button>
      `;
    });

    modal.innerHTML = `
      <div class="bg-slate-800 p-4 rounded-lg border border-slate-700 max-w-xs w-full text-center">
        <h3 class="text-white font-bold text-sm mb-3">Select Target for ${item.name}</h3>
        ${buttonsHtml}
        <button id="cancel-equip-modal" class="text-slate-400 hover:text-white text-xs mt-2 underline block mx-auto">Cancel</button>
      </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const heroIndexAttr = target.getAttribute('data-hero-index');

      if (heroIndexAttr !== null) {
        const heroIndex = parseInt(heroIndexAttr, 10);
        this.equipToTarget(state, state.adventurers[heroIndex], item);
        modal.remove();
      } else if (target.id === 'cancel-equip-modal') {
        modal.remove();
      }
    });
  }
}
