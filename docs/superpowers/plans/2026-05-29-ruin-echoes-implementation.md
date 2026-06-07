# 遺跡迴響（Echoes of the Ruin）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable v1 of the idle clicker game "Echoes of the Ruin" (遺跡迴響)

**Architecture:** Vanilla JS single-page app with Vite. Game state managed through a central GameState object serialized to localStorage every tick. All game definitions (adventurers, zones, upgrades) are static data arrays. UI is pure DOM manipulation in one module. Game loop runs on `setInterval(1000ms)` with `requestAnimationFrame` for smooth click animations.

**Tech Stack:** Vite, Vanilla JS (ES modules), CSS, localStorage

## File Structure

```
ruin-echoes/
├── index.html              # Single HTML page, loads src/main.js as module
├── package.json            # Vite dev dependency
├── vite.config.js          # Minimal Vite config
└── src/
    ├── main.js             # Entry: window.Game singleton, setInterval loop
    ├── state.js            # GameState class: fields, save(), load(), reset()
    ├── gameData.js         # Static data: adventurer defs, zone defs, upgrade defs, bond table
    ├── engine.js           # Pure functions: calcProduction, calcRebirthReward, checkUnlocks, calcOffline
    ├── ui.js               # All DOM rendering + event binding
    └── style.css           # All visual styling
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `ruin-echoes/package.json`
- Create: `ruin-echoes/vite.config.js`
- Create: `ruin-echoes/index.html`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "ruin-echoes",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "vite": "^6.0.0"
  }
}
```

- [ ] **Step 2: Create vite.config.js**

```js
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  build: {
    outDir: 'dist',
  },
});
```

- [ ] **Step 3: Create index.html**

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>遺跡迴響 Echoes of the Ruin</title>
  <link rel="stylesheet" href="/src/style.css" />
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **Step 4: Install dependencies + verify**

Run: `cd ruin-echoes && npm install`
Expected: `node_modules/` created, `package-lock.json` created.
Run: `npx vite --version`
Expected: version string printed (no error).

---

### Task 2: Game Data Definitions

**Files:**
- Create: `ruin-echoes/src/gameData.js`

This file contains ALL static game data — no logic, just arrays and objects.

- [ ] **Step 1: Write `gameData.js`**

```js
// Adventurer definitions
export const ADVENTURERS = [
  { id: 'warrior', name: '戰士', icon: '⚔️', baseProduction: 1, color: '#e74c3c' },
  { id: 'mage', name: '法師', icon: '🔮', baseProduction: 0.8, color: '#9b59b6' },
  { id: 'ranger', name: '遊俠', icon: '🏹', baseProduction: 0.6, color: '#2ecc71' },
  { id: 'priest', name: '牧師', icon: '✨', baseProduction: 0.4, color: '#f1c40f' },
];

// Rarity tiers
export const RARITIES = [
  { key: 'bronze', label: '銅', multiplier: 1 },
  { key: 'silver', label: '銀', multiplier: 2.5 },
  { key: 'gold', label: '金', multiplier: 6 },
  { key: 'legendary', label: '傳奇', multiplier: 15 },
];

// Bond combinations
export const BONDS = [
  { id: 'vanguard', name: '先鋒', members: ['warrior', 'priest'], effect: 1.3, desc: '戰士 + 牧師：全隊產出 +30%' },
  { id: 'scout', name: '偵察', members: ['mage', 'ranger'], effect: 1.5, desc: '法師 + 遊俠：能量恢復 +50%' },
  { id: 'legacy', name: '傳承', members: ['warrior', 'mage', 'ranger', 'priest'], effect: 2, desc: '全員到齊：全隊產出 +100%' },
];

// Zone definitions
export const ZONES = [
  { id: 'entrance', name: '遺跡入口', cost: 0, description: '遠古遺跡的起點', unlockText: '已解鎖' },
  { id: 'corridor', name: '荊棘走廊', cost: 1000, description: '佈滿荊棘的狹長通道', unlockText: '達到 1K 金幣解鎖' },
  { id: 'hall', name: '石像鬼大廳', cost: 10000, description: '石像鬼守衛的大殿', unlockText: '達到 10K 金幣解鎖' },
  { id: 'abyss', name: '迴響深淵', cost: 100000, description: '深不見底的黑暗裂口', unlockText: '達到 100K 金幣解鎖' },
  { id: 'chapel', name: '聖光禮拜堂', cost: 1000000, description: '聖光籠罩的 ancient 遺跡', unlockText: '達到 1M 金幣解鎖' },
  { id: 'throne', name: '遠古王座', cost: 10000000, description: '遺跡最深處的王座之廳', unlockText: '達到 10M 金幣解鎖' },
];

// Upgrade definitions
export const UPGRADES = [
  { id: 'training', name: '訓練場', category: 'base', baseCost: 50, costMultiplier: 1.15, maxLevel: 25, effect: 0.25, desc: '冒險者產出 +25%/級' },
  { id: 'forge', name: '裝備工坊', category: 'base', baseCost: 200, costMultiplier: 1.2, maxLevel: 20, effect: 0.5, desc: '冒險者產出 +50%/級' },
  { id: 'camp', name: '補給營地', category: 'base', baseCost: 500, costMultiplier: 1.25, maxLevel: 15, effect: 1, desc: '冒險者產出 +100%/級' },
  { id: 'shrine', name: '迴響祭壇', category: 'special', baseCost: 5000, costMultiplier: 1.3, maxLevel: 10, effect: 0.1, desc: '轉生獲得迴響石 +10%/級' },
  { id: 'lens', name: '探險望遠鏡', category: 'special', baseCost: 100000, costMultiplier: 1.4, maxLevel: 5, effect: 0.25, desc: '所有金幣產出 +25%/級（獨立乘區）' },
];

// Adventurer unlock thresholds
export const ADVENTURER_UNLOCKS = {
  warrior: { zone: 'hall' },
  mage: { zone: 'abyss' },
  ranger: { zone: 'corridor' },
  priest: { zone: 'chapel' },
};
```

- [ ] **Step 2: Verify file loads**

This is a data-only file, verified when `main.js` imports it in Task 5.

---

### Task 3: Game State (save/load/reset)

**Files:**
- Create: `ruin-echoes/src/state.js`

- [ ] **Step 1: Write `state.js`**

```js
const SAVE_KEY = 'ruin-echoes-save';

const defaultState = () => ({
  gold: 0,
  fragments: 0,
  energy: 100,
  echoStones: 0,
  totalGoldEarned: 0,
  adventurers: [
    { id: 'warrior', unlocked: false, level: 1, rarity: 0 },
    { id: 'mage', unlocked: false, level: 1, rarity: 0 },
    { id: 'ranger', unlocked: false, level: 1, rarity: 0 },
    { id: 'priest', unlocked: false, level: 1, rarity: 0 },
  ],
  unlockedZones: ['entrance'],
  upgrades: {},
  lastTimestamp: Date.now(),
  rebirthCount: 0,
});

export function createGameState() {
  const saved = loadFromStorage();
  if (saved) return saved;
  return defaultState();
}

export function saveToStorage(state) {
  try {
    state.lastTimestamp = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Save failed:', e);
  }
}

export function loadFromStorage() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function resetForRebirth(state) {
  return {
    ...defaultState(),
    echoStones: state.echoStones,
    totalGoldEarned: state.totalGoldEarned,
    rebirthCount: state.rebirthCount + 1,
  };
}
```

- [ ] **Step 2: Verify imports correctly**

Checked when `main.js` imports this module.

---

### Task 4: Game Engine (core logic)

**Files:**
- Create: `ruin-echoes/src/engine.js`

- [ ] **Step 1: Write `engine.js`**

```js
import { ADVENTURERS, ZONES, UPGRADES, BONDS, ADVENTURER_UNLOCKS } from './gameData.js';

export function getUpgradeCost(upgradeDef, currentLevel) {
  return Math.floor(upgradeDef.baseCost * Math.pow(upgradeDef.costMultiplier, currentLevel));
}

export function getBaseProduction(adventurerId, rarityIndex) {
  const def = ADVENTURERS.find(a => a.id === adventurerId);
  const rarityMult = [1, 2.5, 6, 15][rarityIndex] || 1;
  return def.baseProduction * rarityMult;
}

export function calcTotalProduction(state) {
  const { adventurers, upgrades } = state;
  let total = 0;

  // Sum each adventurer's production
  for (const adv of adventurers) {
    if (!adv.unlocked) continue;
    const def = ADVENTURERS.find(a => a.id === adv.id);
    const base = getBaseProduction(adv.id, adv.rarity);
    const levelMult = 1 + (adv.level - 1) * 0.5;
    total += base * levelMult;
  }

  // Multiplicative upgrades (training, forge, camp)
  const upgradeMult = UPGRADES
    .filter(u => u.category === 'base')
    .reduce((mult, u) => {
      const level = upgrades[u.id] || 0;
      return mult * (1 + u.effect * level);
    }, 1);

  total *= upgradeMult;

  // Independent multiplier (lens)
  const lensLevel = upgrades['lens'] || 0;
  total *= (1 + 0.25 * lensLevel);

  // Bond bonuses
  const activeBonds = getActiveBonds(state);
  for (const bond of activeBonds) {
    total *= bond.effect;
  }

  // Zone unlock multiplier
  const zoneCount = state.unlockedZones.length;
  total *= (1 + (zoneCount - 1) * 0.15);

  // Echo stones permanent multiplier
  total *= (1 + state.echoStones * 0.1);

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
  const elapsed = Math.min((now - state.lastTimestamp) / 1000, 86400); // max 24h
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
```

---

### Task 5: Main Entry + Game Loop

**Files:**
- Create: `ruin-echoes/src/main.js`

- [ ] **Step 1: Write `main.js`**

```js
import { createGameState, saveToStorage, resetForRebirth } from './state.js';
import {
  calcTotalProduction,
  calcRebirthReward,
  calcOfflineProgress,
  checkZoneUnlocks,
  checkAdventurerUnlocks,
  getUpgradeCost,
  getActiveBonds,
  getRarityCost,
} from './engine.js';
import { ZONES, UPGRADES, ADVENTURERS, RARITIES } from './gameData.js';
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
  state.energy = Math.min(state.energy + 0.5, 200); // slow regen

  // Check unlocks
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
```

---

### Task 6: UI Rendering

**Files:**
- Create: `ruin-echoes/src/ui.js`

This is the largest file. It renders the entire single-page UI and binds event handlers.

- [ ] **Step 1: Write `ui.js`**

```js
import { ZONES, UPGRADES, ADVENTURERS, RARITIES, BONDS } from './gameData.js';
import { getUpgradeCost, getActiveBonds, getRarityCost, calcRebirthReward, calcTotalProduction } from './engine.js';

let handlers = {};

export function renderApp(state, h) {
  handlers = h;
  const app = document.getElementById('app');
  app.innerHTML = `
    <div id="game">
      <header id="top-bar"></header>
      <main id="main-area">
        <section id="zone-panel"></section>
        <section id="right-panel">
          <div id="adventurer-list"></div>
          <div id="log-panel"></div>
          <div id="shop-panel"></div>
        </section>
      </main>
      <footer id="click-area"></footer>
    </div>
  `;
  updateUI(state);
}

export function updateUI(state) {
  updateTopBar(state);
  updateZonePanel(state);
  updateAdventurers(state);
  updateLog(state);
  updateShop(state);
  updateClickArea(state);
}

function formatNumber(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return Math.floor(n).toString();
}

function updateTopBar(state) {
  const el = document.getElementById('top-bar');
  if (!el) return;
  el.innerHTML = `
    <div class="title">遺跡迴響</div>
    <div class="resources">
      <span class="res gold">🪙 ${formatNumber(state.gold)}</span>
      <span class="res fragment">💎 ${formatNumber(state.fragments)}</span>
      <span class="res energy">⚡ ${formatNumber(state.energy)}</span>
      <span class="res echo">🔶 ${state.echoStones}</span>
    </div>
  `;
}

function updateZonePanel(state) {
  const el = document.getElementById('zone-panel');
  if (!el) return;
  el.innerHTML = `
    <h3>遺跡區域</h3>
    <div class="zone-list">
      ${ZONES.map(zone => {
        const unlocked = state.unlockedZones.includes(zone.id);
        return `
          <div class="zone ${unlocked ? 'unlocked' : 'locked'}" title="${zone.description}">
            <span class="zone-icon">${unlocked ? '🔓' : '🔒'}</span>
            <span class="zone-name">${zone.name}</span>
            ${!unlocked ? `<span class="zone-cost">${formatNumber(zone.cost)}</span>` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function updateAdventurers(state) {
  const el = document.getElementById('adventurer-list');
  if (!el) return;
  el.innerHTML = `
    <h3>冒險者小隊</h3>
    <div class="adventurer-grid">
      ${ADVENTURERS.map(def => {
        const adv = state.adventurers.find(a => a.id === def.id);
        if (!adv || !adv.unlocked) return `
          <div class="adventurer-card locked" style="border-color: ${def.color}44;">
            <div class="adv-icon">${def.icon}</div>
            <div class="adv-name">???</div>
            <div class="adv-status">未解鎖</div>
          </div>
        `;
        const rarity = RARITIES[adv.rarity];
        return `
          <div class="adventurer-card rarity-${rarity.key}" style="border-color: ${def.color};">
            <div class="adv-icon">${def.icon}</div>
            <div class="adv-name">${def.name}</div>
            <div class="adv-rarity">${rarity.label}</div>
            <div class="adv-level">Lv.${adv.level}</div>
            <div class="adv-buttons">
              <button class="btn-small btn-level" data-adv="${def.id}">⬆ Lv</button>
              <button class="btn-small btn-rarity" data-adv="${def.id}">⬆ ${rarity.key === 'legendary' ? 'MAX' : RARITIES[adv.rarity + 1]?.label || 'MAX'}</button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
    <div class="bonds-section">
      <h4>羈絆</h4>
      <div class="bond-list">
        ${(() => {
          const active = getActiveBonds(state);
          return BONDS.map(bond => {
            const isActive = active.some(b => b.id === bond.id);
            return `<div class="bond ${isActive ? 'active' : 'inactive'}">${isActive ? '✅' : '⏳'} ${bond.desc}</div>`;
          }).join('');
        })()}
      </div>
    </div>
  `;

  // Bind adventurer buttons
  el.querySelectorAll('.btn-level').forEach(btn => {
    btn.addEventListener('click', () => handlers.onLevelUp(btn.dataset.adv));
  });
  el.querySelectorAll('.btn-rarity').forEach(btn => {
    btn.addEventListener('click', () => handlers.onRarityUp(btn.dataset.adv));
  });
}

function updateLog(state) {
  const el = document.getElementById('log-panel');
  if (!el) return;
  const activeBonds = getActiveBonds(state);
  el.innerHTML = `
    <h4>探險日誌</h4>
    <div class="log-entries">
      ${state.unlockedZones.length > 1 ? `<div class="log-entry">🏛️ 已探索 ${state.unlockedZones.length}/${ZONES.length} 個區域</div>` : ''}
      <div class="log-entry">⏱️ 每秒產出：${formatNumber(calcTotalProduction(state))} 金幣</div>
      ${activeBonds.length > 0 ? `<div class="log-entry">🔗 羈絆啟動：${activeBonds.map(b => b.name).join('、')}</div>` : ''}
    </div>
  `;
}

function updateShop(state) {
  const el = document.getElementById('shop-panel');
  if (!el) return;
  el.innerHTML = `
    <h4>升級商店</h4>
    <div class="upgrade-list">
      ${UPGRADES.map(def => {
        const level = state.upgrades[def.id] || 0;
        const maxed = level >= def.maxLevel;
        const cost = getUpgradeCost(def, level);
        const canBuy = state.gold >= cost && !maxed;
        return `
          <div class="upgrade ${canBuy ? 'can-buy' : ''} ${maxed ? 'maxed' : ''}">
            <div class="upgrade-info">
              <div class="upgrade-name">${def.name} <span class="upgrade-level">Lv.${level}/${def.maxLevel}</span></div>
              <div class="upgrade-desc">${def.desc}</div>
            </div>
            <button class="btn-buy" data-upgrade="${def.id}" ${!canBuy ? 'disabled' : ''}>
              ${maxed ? 'MAX' : `${formatNumber(cost)} 🪙`}
            </button>
          </div>
        `;
      }).join('')}
    </div>
    <div class="rebirth-section">
      ${(() => {
        const reward = calcRebirthReward(state.totalGoldEarned);
        return `
          <button class="btn-rebirth" ${reward < 1 ? 'disabled' : ''} id="rebirth-btn">
            🔄 遺跡重組 ${reward >= 1 ? `（可獲得 ${reward} 迴響石）` : '（金幣不足）'}
          </button>
        `;
      })()}
    </div>
  `;

  el.querySelectorAll('.btn-buy').forEach(btn => {
    btn.addEventListener('click', () => handlers.onBuyUpgrade(btn.dataset.upgrade));
  });
  const rebirthBtn = document.getElementById('rebirth-btn');
  if (rebirthBtn) rebirthBtn.addEventListener('click', handlers.onRebirth);
}

function updateClickArea(state) {
  const el = document.getElementById('click-area');
  if (!el) return;
  el.innerHTML = `
    <button id="click-button" class="click-btn">
      <span class="click-icon">🏛️</span>
      <span class="click-text">點擊遺跡</span>
      <span class="click-hint">+${formatNumber(1 + state.adventurers.filter(a => a.unlocked).length * 0.5)} 🪙</span>
    </button>
  `;
  document.getElementById('click-button').addEventListener('click', handlers.onClick);
}


```

---

### Task 7: CSS Styling

**Files:**
- Create: `ruin-echoes/src/style.css`

- [ ] **Step 1: Write `style.css`**

```css
:root {
  --bg: #1a1a2e;
  --surface: #16213e;
  --card: #0f3460;
  --accent: #e94560;
  --gold: #f0c040;
  --text: #eee;
  --text-dim: #888;
  --rarity-bronze: #cd7f32;
  --rarity-silver: #c0c0c0;
  --rarity-gold: #ffd700;
  --rarity-legendary: #ff6b6b;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  min-height: 100vh;
  overflow-x: hidden;
}

#game {
  max-width: 1000px;
  margin: 0 auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 100vh;
}

/* Top Bar */
#top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--surface);
  padding: 12px 20px;
  border-radius: 12px;
  border: 1px solid #ffffff15;
}

.title {
  font-size: 1.3rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--gold), var(--accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.resources {
  display: flex;
  gap: 16px;
  font-size: 0.95rem;
}

.res { white-space: nowrap; }
.res.gold { color: var(--gold); }
.res.fragment { color: #a8e6cf; }
.res.energy { color: #74b9ff; }
.res.echo { color: #ff9ff3; }

/* Main Area */
#main-area {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 12px;
  flex: 1;
}

/* Zone Panel */
#zone-panel {
  background: var(--surface);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #ffffff10;
}

#zone-panel h3 {
  font-size: 0.95rem;
  margin-bottom: 12px;
  color: var(--gold);
}

.zone-list { display: flex; flex-direction: column; gap: 6px; }

.zone {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 0.85rem;
  background: var(--card);
  transition: all 0.2s;
}

.zone.unlocked { border-left: 3px solid #00b894; }
.zone.locked { border-left: 3px solid #636e72; opacity: 0.6; }
.zone-icon { font-size: 1rem; }
.zone-name { flex: 1; }
.zone-cost { color: var(--gold); font-size: 0.75rem; }

/* Right Panel */
#right-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Adventurers */
#adventurer-list {
  background: var(--surface);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #ffffff10;
}

#adventurer-list h3 {
  font-size: 0.95rem;
  margin-bottom: 10px;
  color: var(--gold);
}

.adventurer-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.adventurer-card {
  padding: 10px;
  border-radius: 10px;
  border: 2px solid;
  background: var(--card);
  text-align: center;
  transition: transform 0.15s;
}

.adventurer-card:hover { transform: translateY(-2px); }
.adventurer-card.locked { opacity: 0.4; }
.adv-icon { font-size: 1.6rem; margin-bottom: 4px; }
.adv-name { font-size: 0.9rem; font-weight: 600; }
.adv-rarity { font-size: 0.75rem; color: var(--text-dim); }
.adv-level { font-size: 0.75rem; color: var(--text-dim); margin-bottom: 6px; }

.rarity-bronze { border-color: var(--rarity-bronze) !important; }
.rarity-silver { border-color: var(--rarity-silver) !important; }
.rarity-gold { border-color: var(--rarity-gold) !important; box-shadow: 0 0 8px #ffd70033; }
.rarity-legendary { border-color: var(--rarity-legendary) !important; box-shadow: 0 0 12px #ff6b6b44; }

.adv-buttons { display: flex; gap: 4px; justify-content: center; }

.btn-small {
  padding: 3px 8px;
  font-size: 0.7rem;
  border: 1px solid #ffffff30;
  border-radius: 5px;
  background: #ffffff10;
  color: var(--text);
  cursor: pointer;
  transition: background 0.15s;
}

.btn-small:hover { background: #ffffff25; }

/* Bonds */
.bonds-section { margin-top: 12px; }
.bonds-section h4 { font-size: 0.8rem; color: var(--text-dim); margin-bottom: 6px; }
.bond-list { display: flex; flex-direction: column; gap: 3px; }
.bond { font-size: 0.75rem; padding: 4px 8px; border-radius: 5px; }
.bond.active { color: #00b894; }
.bond.inactive { color: var(--text-dim); opacity: 0.5; }

/* Log */
#log-panel {
  background: var(--surface);
  border-radius: 12px;
  padding: 12px 16px;
  border: 1px solid #ffffff10;
}

#log-panel h4 { font-size: 0.8rem; color: var(--text-dim); margin-bottom: 6px; }
.log-entries { display: flex; flex-direction: column; gap: 3px; }
.log-entry { font-size: 0.8rem; color: var(--text-dim); }

/* Shop */
#shop-panel {
  background: var(--surface);
  border-radius: 12px;
  padding: 12px 16px;
  border: 1px solid #ffffff10;
}

#shop-panel h4 { font-size: 0.8rem; color: var(--text-dim); margin-bottom: 8px; }
.upgrade-list { display: flex; flex-direction: column; gap: 6px; }

.upgrade {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--card);
  border: 1px solid #ffffff08;
}

.upgrade.can-buy { border-color: var(--gold); }
.upgrade.maxed { opacity: 0.5; }
.upgrade-name { font-size: 0.8rem; font-weight: 600; }
.upgrade-level { color: var(--text-dim); font-size: 0.7rem; }
.upgrade-desc { font-size: 0.7rem; color: var(--text-dim); }

.btn-buy {
  padding: 5px 12px;
  border: none;
  border-radius: 6px;
  background: var(--gold);
  color: #1a1a2e;
  font-weight: 700;
  font-size: 0.75rem;
  cursor: pointer;
  white-space: nowrap;
  transition: transform 0.1s;
}

.btn-buy:hover:not(:disabled) { transform: scale(1.05); }
.btn-buy:disabled { background: #333; color: #666; cursor: not-allowed; }

.rebirth-section { margin-top: 12px; text-align: center; }

.btn-rebirth {
  width: 100%;
  padding: 10px;
  border: 2px solid var(--accent);
  border-radius: 10px;
  background: transparent;
  color: var(--accent);
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-rebirth:hover:not(:disabled) { background: var(--accent); color: white; }
.btn-rebirth:disabled { border-color: #444; color: #444; cursor: not-allowed; }

/* Click Area */
#click-area {
  display: flex;
  justify-content: center;
  padding: 8px 0;
}

.click-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 48px;
  border: 2px solid var(--gold);
  border-radius: 16px;
  background: linear-gradient(135deg, #2d1b00, #4a2800);
  color: var(--gold);
  cursor: pointer;
  transition: all 0.1s;
  user-select: none;
}

.click-btn:active { transform: scale(0.95); background: linear-gradient(135deg, #4a2800, #6b3a00); }
.click-icon { font-size: 2rem; }
.click-text { font-size: 1rem; font-weight: 600; }
.click-hint { font-size: 0.8rem; opacity: 0.7; }

/* Responsive */
@media (max-width: 700px) {
  #main-area { grid-template-columns: 1fr; }
  #zone-panel .zone-list { flex-direction: row; flex-wrap: wrap; }
  .adventurer-grid { grid-template-columns: repeat(2, 1fr); }
  .resources { gap: 8px; font-size: 0.8rem; flex-wrap: wrap; }
}
```

---

### Task 8: Build Verification

- [ ] **Step 1: Run dev server**

Run: `cd ruin-echoes && npx vite`
Expected: Dev server starts at `http://localhost:5173`

- [ ] **Step 2: Open in browser**

Open `http://localhost:5173`
Expected: Game UI loads. Top bar shows resources. Zone panel on left with "遺跡入口" unlocked. Click button at bottom. No console errors.

- [ ] **Step 3: Test core loop**

Click "點擊遺跡" — gold increases. Wait a few seconds — gold continues rising (auto-generation). Click upgrades in shop — gold decreases, level increases.

- [ ] **Step 4: Test save/load**

Click around, refresh the page. Resources should restore from localStorage (with offline progress applied).

- [ ] **Step 5: Build for production**

Run: `cd ruin-echoes && npx vite build`
Expected: `dist/` directory created with index.html and bundled JS/CSS.

---

## Self-Review Checklist

- [x] Spec coverage: Game concept, resources, adventurers, bonds, zones, rebirth, UI, tech — all covered
- [x] No placeholders: Every step has complete code
- [x] Type consistency: `state.js` field names match usage in `engine.js` and `main.js`
- [x] File paths: All exact and relative to `ruin-echoes/`
- [x] Commands: Exact shell commands with expected output
