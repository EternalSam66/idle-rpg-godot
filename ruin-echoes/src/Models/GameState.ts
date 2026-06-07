export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
export type Slot = 'Weapon' | 'Armor' | 'Accessory';
export type AffixType = 'ATK%' | 'DEF%' | 'Crit%' | 'GoldFind%' | 'Lifesteal%';
export type ClassType = 'Warrior' | 'Mage' | 'Ranger' | 'Priest';
export type Biome = 'grass' | 'dirt' | 'water' | 'stone' | 'crypt';

export interface Affix {
  type: AffixType;
  modifier: number;
}

export interface Equipment {
  id: string;
  slot: Slot;
  name: string;
  rarity: Rarity;
  itemLevel: number;
  statValue: number;
  affix?: Affix;
}

export interface AdventurerState {
  id: string;
  classType: ClassType;
  level: number;
  xp: number;
  nextLevelXp: number;
  currentHP: number;
  equipment: {
    Weapon: Equipment | null;
    Armor: Equipment | null;
    Accessory: Equipment | null;
  };
  specializationLevel: number;
}

export interface Upgrades {
  barracksTraining: number;
  trainingGrounds: number;
  ironForging: number;
  armorSmith: number;
  vitalSprings: number;
  guildHall: number;
  campfireKit: number;
  rations: number;
  treasureVault: number;
  luckyStar: number;
  smelter: number;
  partyExpansion: number;
}

export function computeMaxPartySlots(upgrades: Upgrades): number {
  const expansionLevel = upgrades.partyExpansion || 0;
  return Math.min(4, 1 + expansionLevel);
}

export interface Meta {
  version: string;
  lastTimestamp: number;
}

export interface GameState {
  coins: number;
  currentLevel: number;
  maxClearedLevel: number;
  runCount: number;
  maxPartySlots: number;
  adventurers: AdventurerState[];
  inventory: Equipment[];
  upgrades: Upgrades;
    settings: {
    autoRetry: boolean;
    autoAdvance: boolean;
    autoSellRarities: {
      Common: boolean;
      Uncommon: boolean;
      Rare: boolean;
      Epic: boolean;
      Legendary: boolean;
    };
  };
  meta: Meta;
}

export function createDefaultState(): GameState {
  return {
    coins: 0,
    currentLevel: 1,
    maxClearedLevel: 0,
    runCount: 0,
    maxPartySlots: 1,
    adventurers: [],
    inventory: [],
    upgrades: {
      barracksTraining: 0,
      trainingGrounds: 0,
      ironForging: 0,
      armorSmith: 0,
      vitalSprings: 0,
      guildHall: 0,
      campfireKit: 0,
      rations: 0,
      treasureVault: 0,
      luckyStar: 0,
      smelter: 0,
      partyExpansion: 0,
    },
    settings: {
      autoRetry: false,
      autoAdvance: false,
      autoSellRarities: {
        Common: true,
        Uncommon: false,
        Rare: false,
        Epic: false,
        Legendary: false,
      },
    },
    meta: {
      version: '1.0.0',
      lastTimestamp: Date.now(),
    },
  };
}
