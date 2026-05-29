import { ZONES, UPGRADES, ADVENTURERS, RARITIES, BONDS } from './gameData.js';
import { getUpgradeCost, getActiveBonds, calcRebirthReward, calcTotalProduction } from './engine.js';

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
          <div class="adventurer-card rarity-${rarity.key}">
            <div class="adv-icon">${def.icon}</div>
            <div class="adv-name">${def.name}</div>
            <div class="adv-rarity">${rarity.label}</div>
            <div class="adv-level">Lv.${adv.level}</div>
            <div class="adv-buttons">
              <button class="btn-small btn-level" data-adv="${def.id}">⬆ Lv</button>
              <button class="btn-small btn-rarity" data-adv="${def.id}">⬆ ${adv.rarity >= RARITIES.length - 1 ? 'MAX' : RARITIES[adv.rarity + 1]?.label || 'MAX'}</button>
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
  const btn = document.getElementById('click-button');
  if (btn) btn.addEventListener('click', handlers.onClick);
}
