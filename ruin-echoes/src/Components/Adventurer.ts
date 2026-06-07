import { ClassType, AdventurerState, Upgrades } from '../Models/GameState';

interface BaseStats {
  hp: number;
  atk: number;
  def: number;
  spd: number;
}

const BASE_STATS: Record<ClassType, BaseStats> = {
  Warrior: { hp: 120, atk: 8, def: 12, spd: 3 },
  Mage: { hp: 60, atk: 16, def: 4, spd: 2 },
  Ranger: { hp: 80, atk: 10, def: 6, spd: 6 },
  Priest: { hp: 75, atk: 6, def: 5, spd: 4 },
};

const HIRE_COST: Record<ClassType, number> = {
  Warrior: 0,
  Mage: 75000,
  Ranger: 2500000,
  Priest: 100000000,
};

const UNLOCK_LEVEL: Record<ClassType, number> = {
  Warrior: 1,
  Mage: 20,
  Ranger: 40,
  Priest: 60,
};

export class Adventurer {
  static getBaseStats(classType: ClassType): BaseStats {
    return { ...BASE_STATS[classType] };
  }

  static getHireCost(classType: ClassType): number {
    return HIRE_COST[classType];
  }

  static getHireCostWithDiscount(classType: ClassType, merchantLevel: number): number {
    const base = HIRE_COST[classType];
    const discount = merchantLevel * 0.05;
    return Math.max(0, Math.floor(base * (1 - discount)));
  }

  static getUnlockLevel(classType: ClassType): number {
    return UNLOCK_LEVEL[classType];
  }

  static computeStats(adv: AdventurerState, upgrades: Upgrades): {
    hp: number; atk: number; def: number; spd: number;
  } {
    const base = BASE_STATS[adv.classType];
    if (!base) return { hp: 10, atk: 1, def: 1, spd: 1 };

    let flatHP = base.hp + upgrades.vitalSprings * 25;
    let flatATK = base.atk + upgrades.barracksTraining * 5;
    let flatDEF = base.def + upgrades.ironForging * 2;

    if (adv.equipment.Weapon) {
      flatATK += adv.equipment.Weapon.statValue;
    }
    if (adv.equipment.Armor) {
      flatDEF += adv.equipment.Armor.statValue;
      flatHP += (10 + adv.equipment.Armor.itemLevel * 3) * Adventurer.getRarityMult(adv.equipment.Armor.rarity);
    }

    let hp = flatHP * (1 + upgrades.guildHall * 0.05);
    let atk = flatATK * (1 + upgrades.trainingGrounds * 0.05);
    let def = flatDEF * (1 + upgrades.armorSmith * 0.05);

    if (adv.equipment.Accessory?.affix) {
      const aff = adv.equipment.Accessory.affix;
      if (aff.type === 'ATK%') atk *= (1 + aff.modifier);
      if (aff.type === 'DEF%') def *= (1 + aff.modifier);
    }

    const specBonuses = Adventurer.getSpecBonuses(adv.specializationLevel);
    hp *= specBonuses.hpMult;
    atk *= specBonuses.atkMult;

    hp = Math.floor(hp);
    atk = Math.floor(atk);
    def = Math.floor(def);

    const spd = base.spd;

    return { hp, atk, def, spd };
  }

  static getRarityMult(rarity: string): number {
    const mults: Record<string, number> = {
      Common: 1.0, Uncommon: 1.3, Rare: 1.6, Epic: 2.0, Legendary: 2.5,
    };
    return mults[rarity] ?? 1.0;
  }

  static getSpecBonuses(specLevel: number): {
    hpMult: number; atkMult: number; defIgnore: number;
    tauntPct: number; dodgePct: number; healMult: number;
    doubleAtk: boolean; cleanse: boolean;
  } {
    let hpMult = 1;
    let atkMult = 1;
    let defIgnore = 0;
    let tauntPct = 0;
    let dodgePct = 0;
    let healMult = 1;
    let doubleAtk = false;
    let cleanse = false;

    for (let i = 0; i < specLevel; i++) {
      const cycleIndex = i % 4;
      if (cycleIndex === 0) { hpMult *= 1.30; tauntPct = 0.5; }
      if (cycleIndex === 1) { atkMult *= 1.30; defIgnore = Math.min(defIgnore + 0.20, 1); }
      if (cycleIndex === 2) { doubleAtk = true; dodgePct = Math.min(dodgePct + 0.20, 1); }
      if (cycleIndex === 3) { healMult *= 1.50; cleanse = true; }
    }

    return { hpMult, atkMult, defIgnore, tauntPct, dodgePct, healMult, doubleAtk, cleanse };
  }
}
