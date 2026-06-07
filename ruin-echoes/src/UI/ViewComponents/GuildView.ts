import { GameState, ClassType, Equipment, Rarity, computeMaxPartySlots } from '../../Models/GameState';
import { Adventurer } from '../../Components/Adventurer';
import { EquipmentManager } from '../../Components/EquipmentManager';
import { formatNumber } from '../../Core/format';
import { EventBus } from '../../Core/EventBus';

let _gb: EventBus | null = null;

(window as any).__hire = (ct: string) => {
  _gb?.emit('ui:action', { action: 'hire', classType: ct as ClassType });
};
(window as any).__upgrade = (key: string) => {
  _gb?.emit('ui:action', { action: 'upgrade', upgradeKey: key });
};
(window as any).__equip = (idx: number) => {
  _gb?.emit('ui:action', { action: 'equip', inventoryIndex: idx });
};
(window as any).__unequip = (heroId: string, slot: string) => {
  _gb?.emit('ui:action', { action: 'unequip', heroId, slot });
};
(window as any).__sell = (idx: number) => {
  _gb?.emit('ui:action', { action: 'sell', inventoryIndex: idx });
};
(window as any).__toggleAutoSell = (rarity: string) => {
  _gb?.emit('ui:action', { action: 'toggleAutoSell', rarity });
};

const RARITY_COLORS: Record<string, string> = {
  Common: 'text-gray-300',
  Uncommon: 'text-green-400',
  Rare: 'text-blue-400',
  Epic: 'text-purple-400',
  Legendary: 'text-yellow-400',
};

const RARITIES: Rarity[] = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];

export class GuildView {
  private container: HTMLDivElement;

  constructor(parent: HTMLElement, eventBus: EventBus) {
    _gb = eventBus;
    this.container = document.createElement('div');
    this.container.className = 'guild-view p-4 space-y-4';
    parent.appendChild(this.container);

    eventBus.on('state:changed', (state: any) => {
      this.render(state);
    });
  }

  render(state: GameState): void {
    this.container.innerHTML = `
      <div class="space-y-4">
        <div class="flex justify-between items-center">
          <h2 class="text-lg font-bold neon-gold">Guild</h2>
          <span class="text-xs text-gray-400">Party: ${state.adventurers.length}/${computeMaxPartySlots(state.upgrades)}</span>
        </div>

        <div class="space-y-2">
          ${state.adventurers.length === 0
            ? '<p class="text-gray-500 text-sm">Hire adventurers to form your party</p>'
            : state.adventurers.map(a => this.renderAdventurerCard(a, state)).join('')}
        </div>

        <div class="pt-2 border-t border-gray-700">
          <h3 class="text-sm font-bold mb-2 text-gray-300">Hire Adventurers</h3>
          <div class="grid grid-cols-2 gap-2">
            ${(['Warrior', 'Mage', 'Ranger', 'Priest'] as ClassType[]).map(ct => {
              const cost = Adventurer.getHireCost(ct);
              const unlockLevel = Adventurer.getUnlockLevel(ct);
              const currentFloor = state.maxClearedLevel + 1;
              const isWarrior = ct === 'Warrior';
              const base = Adventurer.getBaseStats(ct);
              const isAlreadyHired = state.adventurers.some(h => h.classType === ct);

              let btnText: string;
              let btnDisabled: boolean;
              let btnClass: string;

              if (isAlreadyHired) {
                btnText = 'HIRED';
                btnDisabled = true;
                btnClass = 'bg-slate-800 text-green-500 cursor-not-allowed w-full py-1 rounded text-xs font-bold';
              } else if (currentFloor < unlockLevel && !isWarrior) {
                btnText = `Floor ${unlockLevel} Required`;
                btnDisabled = true;
                btnClass = 'bg-slate-800 text-slate-500 cursor-not-allowed w-full py-1 rounded text-xs';
              } else if (state.adventurers.length >= computeMaxPartySlots(state.upgrades)) {
                btnText = 'PARTY FULL';
                btnDisabled = true;
                btnClass = 'bg-slate-800 text-amber-500 cursor-not-allowed w-full py-1 rounded text-xs font-bold';
              } else if (state.coins < cost) {
                btnText = `Buy: ${formatNumber(cost)}`;
                btnDisabled = true;
                btnClass = 'bg-slate-800 text-red-400 cursor-not-allowed w-full py-1 rounded text-xs';
              } else {
                btnText = cost === 0 ? 'FREE' : `Buy: ${formatNumber(cost)}`;
                btnDisabled = false;
                btnClass = 'bg-green-700 hover:bg-green-600 text-white cursor-pointer w-full py-1 rounded text-xs font-bold';
              }

              return `
                <div class="text-left p-2 rounded bg-gray-800/50 border border-gray-700">
                  <div class="font-bold text-xs text-gray-300">${ct}</div>
                  <div class="text-xs text-gray-500">HP:${base.hp} ATK:${base.atk}</div>
                  <button class="${btnClass} mt-1"
                    ${btnDisabled ? 'disabled' : `onclick="window.__hire('${ct}')"`}>
                    ${btnText}
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div class="pt-2 border-t border-gray-700">
          <h3 class="text-sm font-bold mb-2 text-gray-300">Inventory (${state.inventory.length})</h3>
          <div class="max-h-36 overflow-y-auto space-y-1">
            ${state.inventory.length === 0
              ? '<p class="text-gray-500 text-xs">No equipment yet</p>'
              : state.inventory.map((eq, idx) => this.renderEquipmentItem(eq, idx)).join('')}
          </div>
        </div>

        <div class="pt-2 border-t border-gray-700">
          <h3 class="text-sm font-bold mb-2 text-gray-300">Auto-Sell Settings</h3>
          <div class="flex flex-wrap gap-1">
            ${RARITIES.map(r => {
              const active = state.settings.autoSellRarities[r];
              return `
                <button class="px-2 py-1 rounded text-xs border cursor-pointer
                  ${active ? 'bg-gray-600 border-gray-400' : 'bg-gray-800 border-gray-700 opacity-60'}"
                  onclick="window.__toggleAutoSell('${r}')">
                  <span class="${RARITY_COLORS[r]}">${r}</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <div class="pt-2 border-t border-gray-700">
          <h3 class="text-sm font-bold mb-2 text-gray-300">Upgrades</h3>
          ${this.renderUpgrades(state)}
        </div>
      </div>
    `;
  }

  private renderAdventurerCard(adv: GameState['adventurers'][0], state: GameState): string {
    const stats = Adventurer.computeStats(adv, state.upgrades);
    const hpPct = Math.max(0, Math.floor((adv.currentHP / stats.hp) * 100));
    const xpVal = adv.xp !== undefined && !isNaN(adv.xp) ? formatNumber(adv.xp) : '0';
    const nextXpVal = adv.nextLevelXp !== undefined && !isNaN(adv.nextLevelXp) ? formatNumber(adv.nextLevelXp) : '100';
    const xpPct = adv.xp !== undefined && adv.nextLevelXp !== undefined && adv.nextLevelXp > 0
      ? Math.max(0, Math.floor((adv.xp / adv.nextLevelXp) * 100)) : 0;
    return `
      <div class="p-2 rounded bg-gray-800/50 border border-gray-700">
        <div class="flex justify-between items-center">
          <span class="text-xs font-bold">Lv.${adv.level} ${adv.classType}</span>
          <span class="text-xs text-gray-400">Spec Lv.${adv.specializationLevel}</span>
        </div>
        <div class="text-xs text-gray-400">HP: ${formatNumber(adv.currentHP)}/${formatNumber(stats.hp)}</div>
        <div class="w-full bg-gray-700 rounded h-1.5 mt-1">
          <div class="bg-green-500 rounded h-1.5 transition-all" style="width:${hpPct}%"></div>
        </div>
        <div class="text-xs text-gray-400 mt-1">ATK:${formatNumber(stats.atk)} DEF:${formatNumber(stats.def)} SPD:${stats.spd}</div>
        <div class="text-xs text-blue-400 font-mono mt-1">XP: ${xpVal} / ${nextXpVal}</div>
        <div class="w-full bg-gray-700 rounded h-1.5 mt-0.5">
          <div class="bg-blue-500 rounded h-1.5 transition-all" style="width:${xpPct}%"></div>
        </div>
        <div class="grid grid-cols-3 gap-1 mt-1.5">
          ${this.renderSlot(adv.equipment.Weapon, 'Weapon', adv.id)}
          ${this.renderSlot(adv.equipment.Armor, 'Armor', adv.id)}
          ${this.renderSlot(adv.equipment.Accessory, 'Accessory', adv.id)}
        </div>
      </div>
    `;
  }

  private renderSlot(eq: Equipment | null, slotName: string, heroId: string): string {
    if (!eq) {
      return `<div class="border-dashed border border-slate-600 text-slate-500 text-[10px] p-1 text-center">[${slotName}]</div>`;
    }
    const color = RARITY_COLORS[eq.rarity] ?? 'text-gray-300';
    return `
      <div class="border border-slate-600 text-[10px] p-1 text-center leading-tight">
        <div class="${color} truncate">${eq.name}</div>
        <button class="text-red-400 hover:text-red-300 underline" onclick="window.__unequip('${heroId}', '${slotName}')">Unequip</button>
      </div>
    `;
  }

  private renderEquipmentItem(eq: Equipment, idx: number): string {
    const value = EquipmentManager.calculateCoinYield(eq, 0);
    return `
      <div class="flex justify-between items-center text-xs p-1 rounded hover:bg-gray-700/50">
        <span class="cursor-pointer ${RARITY_COLORS[eq.rarity] ?? ''} flex-1"
              onclick="window.__equip(${idx})">
          [${eq.rarity[0]}] ${eq.name} <span class="text-gray-500">Lv.${eq.itemLevel} ${eq.slot}</span>
        </span>
        <button class="px-1.5 py-0.5 rounded bg-gray-700 hover:bg-red-800 text-xs ml-1"
                onclick="window.__sell(${idx})" title="Sell for ${formatNumber(value)}g">
          Sell ${formatNumber(value)}g
        </button>
      </div>
    `;
  }

  private renderUpgrades(state: GameState): string {
    const upgrades = [
      { key: 'barracksTraining', name: 'Weapon Drills', desc: '+5 flat ATK / lv', baseCost: 20, scaler: 1.16, maxLevel: 100 },
      { key: 'trainingGrounds', name: 'Offense Tactics', desc: '+5% ATK / lv', baseCost: 75, scaler: 1.16, maxLevel: 100 },
      { key: 'ironForging', name: 'Plate Forging', desc: '+2 flat DEF / lv', baseCost: 25, scaler: 1.16, maxLevel: 100 },
      { key: 'armorSmith', name: 'Defense Tactics', desc: '+5% DEF / lv', baseCost: 80, scaler: 1.16, maxLevel: 100 },
      { key: 'vitalSprings', name: 'Vitality Core', desc: '+25 flat HP / lv', baseCost: 20, scaler: 1.16, maxLevel: 100 },
      { key: 'guildHall', name: 'Endurance Training', desc: '+5% HP / lv', baseCost: 70, scaler: 1.16, maxLevel: 100 },
      { key: 'campfireKit', name: 'Campfire Kit', desc: 'Partial revive', baseCost: 12500, scaler: 5.0, maxLevel: 3 },
      { key: 'rations', name: 'Rations', desc: '+3% heal / lv', baseCost: 50, scaler: 1.22, maxLevel: 50 },
      { key: 'treasureVault', name: 'Midas Ledger', desc: '+12% coins / lv', baseCost: 40, scaler: 1.15, maxLevel: 100 },
      { key: 'luckyStar', name: 'Fortune Wheel', desc: '+5% rare+ / lv', baseCost: 150, scaler: 1.25, maxLevel: 50 },
      { key: 'smelter', name: 'Salvage Matrix', desc: '+15% sell / lv', baseCost: 90, scaler: 1.20, maxLevel: 50 },
      { key: 'partyExpansion', name: 'Guild Roster', desc: '+1 Max Party Slot / lv', baseCost: 500, scaler: 12.0, maxLevel: 3 },
    ];

    return upgrades.map(u => {
      const level = (state.upgrades as any)[u.key] as number;
      const isMaxed = level >= u.maxLevel;
      const cost = isMaxed ? 0 : Math.floor(u.baseCost * Math.pow(u.scaler, level));
      const canAfford = state.coins >= cost;

      return `
        <div class="flex justify-between items-center text-xs py-1 upgrade-row" data-key="${u.key}">
          <div class="flex-1 min-w-0">
            <span class="text-gray-300">${u.name}</span>
            <span class="text-gray-500 ml-1">(Lv. ${level} / ${u.maxLevel})</span>
            <div class="text-gray-500">${u.desc}</div>
          </div>
          ${isMaxed
            ? '<span class="text-green-400 font-bold content-center">MAXED</span>'
            : `<button class="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-xs
              ${!canAfford ? 'opacity-50 pointer-events-none cursor-not-allowed' : ''}"
              onclick="window.__upgrade('${u.key}')">
              ${formatNumber(cost)}g
            </button>`
          }
        </div>
      `;
    }).join('');
  }
}
