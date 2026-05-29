import { ZONES, UPGRADES, ADVENTURERS, RARITIES, BONDS } from './gameData.js';
import { getUpgradeCost, getActiveBonds, calcRebirthReward, calcTickProduction, getLevel, getRarityIndex, getXpForNextLevel } from './engine.js';

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
          <div id="click-area"></div>
          <div id="adventurer-list"></div>
          <div id="log-panel"></div>
          <div id="shop-panel"></div>
        </section>
      </main>
    </div>
  `;
  updateUI(state);
}

export function updateUI(state) {
  updateTopBar(state);
  updateZonePanel(state);
  updateClickArea(state);
  updateAdventurers(state);
  updateLog(state);
  updateShop(state);
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
        const progress = Math.min(state.totalFragmentsEarned / zone.fragmentCost, 1);
        return `
          <div class="zone ${unlocked ? 'unlocked' : ''}" title="${zone.description}">
            <span class="zone-icon">${unlocked ? '🔓' : '🔒'}</span>
            <span class="zone-name">${zone.name}</span>
            ${!unlocked ? `<span class="zone-progress">${Math.floor(progress * 100)}%</span>` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function updateClickArea(state) {
  const el = document.getElementById('click-area');
  if (!el) return;
  const bonus = 1 + state.adventurers.filter(a => a.unlocked).length;
  el.innerHTML = `
    <button id="click-button" class="click-btn">
      <span class="click-icon">🏛️</span>
      <span class="click-text">探索遺跡</span>
      <span class="click-hint">🪙+${formatNumber(bonus)} 💎+${formatNumber(bonus * 0.05)}</span>
    </button>
  `;
  const btn = document.getElementById('click-button');
  if (btn) btn.addEventListener('click', handlers.onClick);
}

function updateAdventurers(state) {
  const el = document.getElementById('adventurer-list');
  if (!el) return;
  el.innerHTML = `
    <h3>冒險者小隊</h3>
    <div class="adventurer-grid">
      ${ADVENTURERS.map(def => {
        const adv = state.adventurers.find(a => a.id === def.id);
        const unlocked = adv && adv.unlocked;
        if (!unlocked) {
          const canHire = state.gold >= def.unlockCost;
          return `
            <div class="adventurer-card locked" style="border-color: ${def.color}44;">
              <div class="adv-icon">${def.icon}</div>
              <div class="adv-name">${def.name}</div>
              <div class="adv-status">${def.unlockCost > 0 ? `${formatNumber(def.unlockCost)} 🪙` : '未解鎖'}</div>
              ${def.unlockCost > 0 ? `<button class="btn-hire ${canHire ? 'can-afford' : ''}" data-adv="${def.id}" ${!canHire ? 'disabled' : ''}>僱用</button>` : ''}
            </div>
          `;
        }
        const level = getLevel(adv.xp);
        const rarityIndex = getRarityIndex(level);
        const rarity = RARITIES[rarityIndex];
        const nextXp = getXpForNextLevel(adv.xp);
        const xpInLevel = adv.xp - (level - 1) * 10;
        const xpProgress = Math.min(xpInLevel / nextXp, 1);
        return `
          <div class="adventurer-card rarity-${rarity.key}">
            <div class="adv-icon">${def.icon}</div>
            <div class="adv-name">${def.name}</div>
            <div class="adv-rarity">${rarity.label}</div>
            <div class="adv-level">Lv.${level}</div>
            <div class="xp-bar">
              <div class="xp-fill" style="width: ${xpProgress * 100}%"></div>
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

  el.querySelectorAll('.btn-hire').forEach(btn => {
    btn.addEventListener('click', () => handlers.onHireAdventurer(btn.dataset.adv));
  });
}

function updateLog(state) {
  const el = document.getElementById('log-panel');
  if (!el) return;
  const tick = calcTickProduction(state);
  const activeBonds = getActiveBonds(state);
  el.innerHTML = `
    <h4>探險日誌</h4>
    <div class="log-entries">
      <div class="log-entry">🪙 每秒金幣：${formatNumber(tick.gold)}</div>
      <div class="log-entry">💎 每秒碎片：${formatNumber(tick.fragments)}</div>
      ${state.unlockedZones.length > 1 ? `<div class="log-entry">🏛️ 已探索 ${state.unlockedZones.length}/${ZONES.length} 個區域</div>` : ''}
      ${activeBonds.length > 0 ? `<div class="log-entry">🔗 羈絆：${activeBonds.map(b => b.name).join('、')}</div>` : ''}
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
