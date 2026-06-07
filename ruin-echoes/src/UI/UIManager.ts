import { GameState } from '../Models/GameState';
import { EventBus } from '../Core/EventBus';
import { DungeonView } from './ViewComponents/DungeonView';
import { GuildView } from './ViewComponents/GuildView';
import { GridSystem } from '../Dungeon/GridSystem';
import { EquipmentManager } from '../Components/EquipmentManager';
import { formatNumber } from '../Core/format';

export class UIManager {
  private app: HTMLElement;
  private topBar: HTMLDivElement;
  private leftPanel: HTMLDivElement;
  private rightPanel: HTMLDivElement;
  private dungeonView: DungeonView;
  private guildView: GuildView;
  private runButton: HTMLButtonElement;
  private cancelBtn: HTMLButtonElement;
  private autoRetryBtn: HTMLButtonElement;
  private autoAdvanceBtn: HTMLButtonElement;
  private logContainer: HTMLDivElement;

  constructor(private eventBus: EventBus) {
    this.app = document.getElementById('app')!;
    this.app.innerHTML = '';

    this.topBar = document.createElement('div');
    this.topBar.className = 'top-bar flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700 text-sm';
    this.app.appendChild(this.topBar);

    const main = document.createElement('div');
    main.className = 'flex flex-1 overflow-hidden min-h-0';

    this.leftPanel = document.createElement('div');
    this.leftPanel.className = 'w-3/5 border-r border-gray-700 flex flex-col min-h-0';

    this.rightPanel = document.createElement('div');
    this.rightPanel.className = 'w-2/5 overflow-y-auto min-h-0';

    main.appendChild(this.leftPanel);
    main.appendChild(this.rightPanel);
    this.app.appendChild(main);

    const header = document.createElement('div');
    header.className = 'flex items-center justify-between px-4 py-2 border-b border-gray-800 gap-2';
    this.runButton = document.createElement('button');
    this.runButton.className = 'px-4 py-1 rounded bg-gray-600 text-gray-400 font-bold text-sm opacity-50 pointer-events-none cursor-not-allowed';
    this.runButton.textContent = 'Hire First!';
    header.appendChild(this.runButton);

    this.cancelBtn = document.createElement('button');
    this.cancelBtn.className = 'px-4 py-1 rounded bg-yellow-700 hover:bg-yellow-600 text-white font-bold text-sm hidden';
    this.cancelBtn.textContent = 'Cancel Run';
    header.appendChild(this.cancelBtn);

    this.autoRetryBtn = document.createElement('button');
    this.autoRetryBtn.className = 'px-2 py-1 rounded text-xs font-bold bg-slate-700 text-slate-400';
    this.autoRetryBtn.textContent = 'Auto-Retry';
    header.appendChild(this.autoRetryBtn);
    this.autoRetryBtn.addEventListener('click', () => {
      this.eventBus.emit('ui:action', { action: 'toggleAutoRetry' });
    });

    this.autoAdvanceBtn = document.createElement('button');
    this.autoAdvanceBtn.className = 'px-2 py-1 rounded text-xs font-bold bg-slate-700 text-slate-400';
    this.autoAdvanceBtn.textContent = 'Auto-Advance: OFF';
    header.appendChild(this.autoAdvanceBtn);
    this.autoAdvanceBtn.addEventListener('click', () => {
      this.eventBus.emit('ui:action', { action: 'toggleAutoAdvance' });
    });

    this.leftPanel.appendChild(header);

    const dungeonContainer = document.createElement('div');
    dungeonContainer.className = 'flex-1 flex flex-col min-h-0';

    const gridArea = document.createElement('div');
    gridArea.className = 'flex-1 flex items-center justify-center p-4 min-h-0';
    dungeonContainer.appendChild(gridArea);

    this.logContainer = document.createElement('div');
    this.logContainer.className = 'max-h-32 overflow-y-auto px-4 py-2 border-t border-gray-800 text-xs font-mono hidden';
    dungeonContainer.appendChild(this.logContainer);

    this.leftPanel.appendChild(dungeonContainer);
    this.dungeonView = new DungeonView(gridArea, this.eventBus);

    this.guildView = new GuildView(this.rightPanel, this.eventBus);

    const levelSelector = document.createElement('div');
    levelSelector.className = 'px-4 py-2 border-t border-gray-800 flex items-center gap-2';
    levelSelector.innerHTML = `
      <label class="text-xs text-gray-400">Level:</label>
      <input type="number" id="level-input" min="1" max="100"
        class="w-16 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs text-center" value="1" />
    `;
    this.leftPanel.appendChild(levelSelector);

    const levelBtns = document.createElement('div');
    levelBtns.className = 'px-4 py-2 flex gap-2';
    levelBtns.innerHTML = `
      <button id="btn-lv-prev" class="px-2 py-1 bg-gray-700 rounded text-xs hover:bg-gray-600">-1</button>
      <button id="btn-lv-next" class="px-2 py-1 bg-gray-700 rounded text-xs hover:bg-gray-600">+1</button>
      <button id="btn-lv-max" class="px-2 py-1 bg-gray-700 rounded text-xs hover:bg-gray-600">Max</button>
    `;
    this.leftPanel.appendChild(levelBtns);

    const devResetContainer = document.createElement('div');
    devResetContainer.className = 'px-4 py-2 border-t border-gray-800 flex justify-center';
    devResetContainer.innerHTML = `
      <button id="dev-hard-reset-btn"
        class="bg-red-700 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition-colors text-xs uppercase tracking-wider">
        Hard Reset Save
      </button>
    `;
    this.leftPanel.appendChild(devResetContainer);

    const resetBtn = document.getElementById('dev-hard-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to permanently delete all progression, levels, items, and upgrade data?')) {
          localStorage.removeItem('ruin-echoes-save');
          localStorage.clear();
          window.location.reload();
        }
      });
    }

    this.runButton.addEventListener('click', () => {
      this.dungeonView.setResult(null);
      this.eventBus.emit('ui:action', { action: 'startRun' });
    });

    this.cancelBtn.addEventListener('click', () => {
      this.eventBus.emit('ui:action', { action: 'cancelRun' });
    });

    levelBtns.querySelector('#btn-lv-prev')!.addEventListener('click', () => {
      this.eventBus.emit('ui:action', { action: 'levelChange', delta: -1 });
    });
    levelBtns.querySelector('#btn-lv-next')!.addEventListener('click', () => {
      this.eventBus.emit('ui:action', { action: 'levelChange', delta: 1 });
    });
    levelBtns.querySelector('#btn-lv-max')!.addEventListener('click', () => {
      this.eventBus.emit('ui:action', { action: 'levelChange', delta: 0, setMax: true });
    });

    eventBus.on('run:start', () => this.dungeonView.setResult(null));

    eventBus.on('run:complete', (payload: any) => {
      this.dungeonView.setResult({
        cleared: payload.cleared,
        level: payload.level ?? 0,
      });
    });
  }

  render(state: GameState, grid: GridSystem | null, partyX: number, logs: string[]): void {
    const rates = EquipmentManager.getDropRates(
      state.currentLevel,
      state.upgrades.luckyStar,
    );

    this.topBar.innerHTML = `
      <span class="neon-gold">Echoes of the Ruin</span>
      <span class="flex gap-4 items-center">
        <span class="text-gray-500 text-xs font-mono">
          C:${rates.Common.toFixed(1)}% U:${rates.Uncommon.toFixed(1)}% R:${rates.Rare.toFixed(1)}% E:${rates.Epic.toFixed(1)}% L:${rates.Legendary.toFixed(1)}%
        </span>
        <span class="text-gray-400">|</span>
        <span>\uD83D\uDCB0 ${formatNumber(state.coins)}</span>
        <span>Lv.${state.currentLevel}</span>
        <span>Run #${state.runCount}</span>
        <span>Max: ${state.maxClearedLevel ?? 0}</span>
      </span>
    `;

    const levelInput = document.getElementById('level-input') as HTMLInputElement;
    if (levelInput) levelInput.value = String(state.currentLevel);

    if (state.adventurers.length === 0) {
      this.runButton.className = 'px-4 py-1 rounded bg-gray-600 text-gray-400 font-bold text-sm opacity-50 pointer-events-none cursor-not-allowed';
      this.runButton.textContent = 'Hire First!';
    } else {
      this.runButton.className = 'px-4 py-1 rounded bg-accent hover:bg-red-600 text-white font-bold text-sm transition-colors';
      this.runButton.textContent = 'Send Party!';
    }

    const isRunActive = grid !== null;
    this.runButton.classList.toggle('hidden', isRunActive);
    this.cancelBtn.classList.toggle('hidden', !isRunActive);

    this.autoRetryBtn.className = `px-2 py-1 rounded text-xs font-bold ${
      state.settings.autoRetry
        ? 'bg-green-600 text-white'
        : 'bg-slate-700 text-slate-400'
    }`;

    this.autoAdvanceBtn.className = `px-2 py-1 rounded text-xs font-bold ${
      state.settings.autoAdvance
        ? 'bg-blue-600 text-white'
        : 'bg-slate-700 text-slate-400'
    }`;
    this.autoAdvanceBtn.textContent = state.settings.autoAdvance ? 'Auto-Advance: ON' : 'Auto-Advance: OFF';

    this.logContainer.classList.toggle('hidden', logs.length === 0);
    this.logContainer.innerHTML = logs.map(l =>
      `<div class="${l.startsWith('[Wipe]') || l.startsWith('[Death]') ? 'text-red-400' : l.startsWith('[Victory]') || l.startsWith('[Spec]') ? 'text-yellow-400' : l.startsWith('[Combat]') || l.startsWith('[Sunder]') || l.startsWith('[Speed]') || l.startsWith('[Outcome]') ? 'text-cyan-300' : 'text-gray-400'}">${l}</div>`
    ).join('');

    this.dungeonView.render(state, grid, partyX);
  }
}
