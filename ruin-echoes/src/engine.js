import { ADVENTURERS, ZONES, UPGRADES, BONDS, RARITIES, XP_PER_LEVEL, LEVELS_FOR_RARITY } from './gameData.js';

export function getUpgradeCost(upgradeDef, currentLevel) {
  return Math.floor(upgradeDef.baseCost * Math.pow(upgradeDef.costMultiplier, currentLevel));
}

export function getLevel(xp) {
  return 1 + Math.floor(xp / XP_PER_LEVEL);
}

export function getRarityIndex(level) {
  let r = 0;
  for (let i = LEVELS_FOR_RARITY.length - 1; i >= 0; i--) {
    if (level >= LEVELS_FOR_RARITY[i]) { r = i; break; }
  }
  return r;
}

export function getXpForNextLevel(xp) {
  const current = getLevel(xp);
  return current * XP_PER_LEVEL;
}

export function calcTickProduction(state, elapsed = 1) {
  const { adventurers, upgrades, unlockedZones, echoStones } = state;

  const baseMult = UPGRADES
    .filter(u => u.category === 'base')
    .reduce((m, u) => m * (1 + (u.effect * (upgrades[u.id] || 0))), 1);

  const lensLevel = upgrades['lens'] || 0;
  const lensMult = 1 + 0.25 * lensLevel;

  const bondMult = getActiveBonds(state).reduce((m, b) => m * b.effect, 1);
  const zoneMult = 1 + (unlockedZones.length - 1) * 0.15;
  const echoMult = 1 + echoStones * 0.1;

  let totalGold = 0;
  let totalFrag = 0;

  for (const adv of adventurers) {
    if (!adv.unlocked) continue;
    const def = ADVENTURERS.find(a => a.id === adv.id);
    const level = getLevel(adv.xp);
    const rarityIndex = getRarityIndex(level);
    const rarityMult = RARITIES[rarityIndex].multiplier;
    const levelMult = 1 + (level - 1) * 0.3;

    const prod = def.baseProduction * levelMult * rarityMult * baseMult * bondMult * zoneMult * echoMult;

    adv.xp += elapsed * 0.5;

    totalGold += prod * lensMult;
    totalFrag += prod * 0.08;
  }

  return { gold: totalGold * elapsed, fragments: totalFrag * elapsed };
}

export function getActiveBonds(state) {
  const unlockedIds = state.adventurers.filter(a => a.unlocked).map(a => a.id);
  return BONDS.filter(bond =>
    bond.members.every(id => unlockedIds.includes(id))
  );
}

export function checkZoneUnlocks(state) {
  const newlyUnlocked = [];
  for (const zone of ZONES) {
    if (state.unlockedZones.includes(zone.id)) continue;
    if (state.totalFragmentsEarned >= zone.fragmentCost) {
      newlyUnlocked.push(zone.id);
    }
  }
  return newlyUnlocked;
}

export function checkAdventurerUnlocks(state) {
  const newlyUnlocked = [];
  for (const def of ADVENTURERS) {
    if (def.unlockCost === 0) continue;
    const adv = state.adventurers.find(a => a.id === def.id);
    if (adv.unlocked) continue;
    if (state.gold >= def.unlockCost) {
      newlyUnlocked.push(def.id);
    }
  }
  return newlyUnlocked;
}

export function calcRebirthReward(totalGoldEarned) {
  return Math.floor(Math.sqrt(totalGoldEarned) / 10);
}

export function calcOfflineProgress(state) {
  const now = Date.now();
  const elapsed = Math.min((now - state.lastTimestamp) / 1000, 86400);
  if (elapsed < 1) return { gold: 0, fragments: 0, elapsed: 0 };

  const offlineMult = 0.6;
  const result = calcTickProduction(state, elapsed * offlineMult);
  return {
    gold: result.gold,
    fragments: result.fragments,
    elapsed: Math.floor(elapsed),
  };
}
