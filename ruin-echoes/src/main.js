import { createGameState, saveToStorage, resetForRebirth } from './state.js';
import {
  calcTotalProduction,
  calcRebirthReward,
  calcOfflineProgress,
  checkZoneUnlocks,
  checkAdventurerUnlocks,
  getUpgradeCost,
  getRarityCost,
} from './engine.js';
import { UPGRADES, RARITIES } from './gameData.js';
import { renderApp, updateUI } from './ui.js';

const state = createGameState();
const SAVE_INTERVAL = 10000;

export function getState() {
  return state;
}

function gameTick() {
  const production = calcTotalProduction(state);
  state.gold += production;
  state.totalGoldEarned += production;
  state.fragments += production * 0.01;
  state.energy = Math.min(state.energy + 0.5, 200);

  const newZones = checkZoneUnlocks(state);
  newZones.forEach(id => {
    if (!state.unlockedZones.includes(id)) state.unlockedZones.push(id);
  });

  const newAdventurers = checkAdventurerUnlocks(state);
  newAdventurers.forEach(id => {
    const adv = state.adventurers.find(a => a.id === id);
    if (adv) adv.unlocked = true;
  });

  updateUI(state);
}

function handleClick() {
  const bonus = 1 + state.adventurers.filter(a => a.unlocked).length * 0.5;
  state.gold += bonus;
  state.energy = Math.min(state.energy + 5, 200);
  updateUI(state);
}

function handleBuyUpgrade(upgradeId) {
  const def = UPGRADES.find(u => u.id === upgradeId);
  if (!def) return;
  const currentLevel = state.upgrades[upgradeId] || 0;
  if (currentLevel >= def.maxLevel) return;

  const cost = getUpgradeCost(def, currentLevel);
  if (state.gold < cost) return;

  state.gold -= cost;
  state.upgrades[upgradeId] = currentLevel + 1;
  updateUI(state);
}

function handleLevelUp(adventurerId) {
  const adv = state.adventurers.find(a => a.id === adventurerId);
  if (!adv || !adv.unlocked) return;
  const cost = 100 * Math.pow(1.5, adv.level - 1);
  if (state.fragments < cost) return;
  state.fragments -= cost;
  adv.level++;
  updateUI(state);
}

function handleRarityUp(adventurerId) {
  const adv = state.adventurers.find(a => a.id === adventurerId);
  if (!adv || !adv.unlocked) return;
  if (adv.rarity >= RARITIES.length - 1) return;
  const cost = getRarityCost(adv.rarity);
  if (state.fragments < cost) return;
  state.fragments -= cost;
  adv.rarity++;
  updateUI(state);
}

function handleRebirth() {
  const reward = calcRebirthReward(state.totalGoldEarned);
  if (reward < 1) return;
  Object.assign(state, resetForRebirth(state));
  state.echoStones += reward;
  updateUI(state);
}

// Apply offline progress on load
const offline = calcOfflineProgress(state);
if (offline.gold > 0) {
  state.gold += offline.gold;
  state.fragments += offline.fragments;
  state.totalGoldEarned += offline.gold;
}

// Initial render
renderApp(state, {
  onClick: handleClick,
  onBuyUpgrade: handleBuyUpgrade,
  onLevelUp: handleLevelUp,
  onRarityUp: handleRarityUp,
  onRebirth: handleRebirth,
});

// Game loop
setInterval(gameTick, 1000);

// Auto-save
setInterval(() => saveToStorage(state), SAVE_INTERVAL);

// Save on page close
window.addEventListener('beforeunload', () => saveToStorage(state));
