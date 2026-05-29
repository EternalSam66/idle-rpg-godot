import { ADVENTURERS, ZONES, UPGRADES, BONDS, ADVENTURER_UNLOCKS, RARITIES } from './gameData.js';

export function getUpgradeCost(upgradeDef, currentLevel) {
  return Math.floor(upgradeDef.baseCost * Math.pow(upgradeDef.costMultiplier, currentLevel));
}

export function getBaseProduction(adventurerId, rarityIndex) {
  const def = ADVENTURERS.find(a => a.id === adventurerId);
  const rarityMult = (RARITIES[rarityIndex] || RARITIES[0]).multiplier;
  return def.baseProduction * rarityMult;
}

export function calcTotalProduction(state) {
  const { adventurers, upgrades, unlockedZones, echoStones } = state;
  let total = 0;

  for (const adv of adventurers) {
    if (!adv.unlocked) continue;
    const base = getBaseProduction(adv.id, adv.rarity);
    const levelMult = 1 + (adv.level - 1) * 0.5;
    total += base * levelMult;
  }

  if (total === 0) return 0;

  const upgradeMult = UPGRADES
    .filter(u => u.category === 'base')
    .reduce((mult, u) => {
      const level = upgrades[u.id] || 0;
      return mult * (1 + u.effect * level);
    }, 1);

  total *= upgradeMult;

  const lensLevel = upgrades['lens'] || 0;
  total *= (1 + 0.25 * lensLevel);

  const activeBonds = getActiveBonds(state);
  for (const bond of activeBonds) {
    total *= bond.effect;
  }

  const zoneCount = unlockedZones.length;
  total *= (1 + (zoneCount - 1) * 0.15);

  total *= (1 + echoStones * 0.1);

  return total;
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
    if (state.totalGoldEarned >= zone.cost) {
      newlyUnlocked.push(zone.id);
    }
  }
  return newlyUnlocked;
}

export function checkAdventurerUnlocks(state) {
  const newlyUnlocked = [];
  for (const [id, req] of Object.entries(ADVENTURER_UNLOCKS)) {
    const adv = state.adventurers.find(a => a.id === id);
    if (adv.unlocked) continue;
    if (state.unlockedZones.includes(req.zone)) {
      newlyUnlocked.push(id);
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

  const production = calcTotalProduction(state);
  const offlineMult = 0.6;
  return {
    gold: production * elapsed * offlineMult,
    fragments: (production * elapsed * 0.01) * offlineMult,
    elapsed: Math.floor(elapsed),
  };
}

export function getRarityCost(currentRarity) {
  return [0, 500, 2000, 10000][currentRarity] || Infinity;
}
