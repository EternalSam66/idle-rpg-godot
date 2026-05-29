import { createGameState, saveToStorage, resetForRebirth } from './state.js';
import {
  calcTickProduction,
  calcRebirthReward,
  calcOfflineProgress,
  checkZoneUnlocks,
  checkAdventurerUnlocks,
  getUpgradeCost,
} from './engine.js';
import { UPGRADES, ADVENTURERS } from './gameData.js';
import { renderApp, updateUI } from './ui.js';

const state = createGameState();
const SAVE_INTERVAL = 10000;

export function getState() {
  return state;
}

function gameTick() {
  const result = calcTickProduction(state);
  state.gold += result.gold;
  state.fragments += result.fragments;
  state.totalGoldEarned += result.gold;
  state.totalFragmentsEarned += result.fragments;

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
  const bonus = 1 + state.adventurers.filter(a => a.unlocked).length;
  state.gold += bonus;
  state.fragments += bonus * 0.05;
  state.totalGoldEarned += bonus;
  state.totalFragmentsEarned += bonus * 0.05;
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

function handleHireAdventurer(adventurerId) {
  const def = ADVENTURERS.find(a => a.id === adventurerId);
  if (!def || def.unlockCost === 0) return;
  const adv = state.adventurers.find(a => a.id === adventurerId);
  if (!adv || adv.unlocked) return;
  if (state.gold < def.unlockCost) return;
  state.gold -= def.unlockCost;
  adv.unlocked = true;
  updateUI(state);
}

function handleRebirth() {
  const reward = calcRebirthReward(state.totalGoldEarned);
  if (reward < 1) return;
  Object.assign(state, resetForRebirth(state));
  state.echoStones += reward;
  updateUI(state);
}

const offline = calcOfflineProgress(state);
if (offline.gold > 0 || offline.fragments > 0) {
  state.gold += offline.gold;
  state.fragments += offline.fragments;
  state.totalGoldEarned += offline.gold;
  state.totalFragmentsEarned += offline.fragments;
}

renderApp(state, {
  onClick: handleClick,
  onBuyUpgrade: handleBuyUpgrade,
  onHireAdventurer: handleHireAdventurer,
  onRebirth: handleRebirth,
});

setInterval(gameTick, 1000);
setInterval(() => saveToStorage(state), SAVE_INTERVAL);
window.addEventListener('beforeunload', () => saveToStorage(state));
