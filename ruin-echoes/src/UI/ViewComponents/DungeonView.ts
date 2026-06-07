import { GameState, AdventurerState } from '../../Models/GameState';
import { GridSystem } from '../../Dungeon/GridSystem';
import { EventBus } from '../../Core/EventBus';

export interface RunResult {
  cleared: boolean;
  level: number;
}

const CLASS_EMOJIS: Record<string, string> = {
  Warrior: '\u2694\uFE0F',
  Mage: '\uD83D\uDD2E',
  Ranger: '\uD83C\uDFF9',
  Priest: '\u2728',
};

export class DungeonView {
  private container: HTMLDivElement;
  private result: RunResult | null = null;
  private originalParty: AdventurerState[] = [];
  private partyContainer: HTMLDivElement;
  private eventBus: EventBus | null = null;

  constructor(parent: HTMLElement, eventBus?: EventBus) {
    this.container = document.createElement('div');
    this.container.className = 'dungeon-view relative overflow-hidden flex items-center justify-center w-full h-full';
    parent.appendChild(this.container);

    this.partyContainer = document.createElement('div');
    this.partyContainer.className = 'party-sprites absolute inset-0 pointer-events-none z-20';
    this.partyContainer.style.display = 'none';
    document.body.appendChild(this.partyContainer);

    if (eventBus) {
      this.eventBus = eventBus;
      eventBus.on('PARTY_REVIVED', (data) => {
        this.originalParty = data.updatedParty;
        this.clearPartySprites();
        this.createPartySprites(data.updatedParty);
        this.updateSpritePositions(data.currentX);
      });
    }
  }

  setResult(result: RunResult | null): void {
    this.result = result;
  }

  setParty(adventurers: AdventurerState[]): void {
    this.originalParty = [...adventurers];
  }

  clearPartySprites(): void {
    this.partyContainer.innerHTML = '';
    this.partyContainer.style.display = 'none';
  }

  createPartySprites(party: AdventurerState[]): void {
    this.partyContainer.innerHTML = '';
    party.forEach((adv, i) => {
      const sprite = document.createElement('span');
      sprite.className = 'party-sprite text-lg transition-opacity duration-300';
      sprite.textContent = CLASS_EMOJIS[adv.classType] || '\uD83E\uDDD9';
      sprite.dataset.adventurerId = adv.id;
      sprite.dataset.classType = adv.classType;
      this.partyContainer.appendChild(sprite);
    });
    this.partyContainer.style.display = '';
  }

  updateSpritePositions(partyX: number): void {
    const gridWrapper = this.container.querySelector('.grid-wrapper') as HTMLElement;
    if (!gridWrapper) {
      this.partyContainer.style.display = 'none';
      return;
    }

    const gridRect = gridWrapper.getBoundingClientRect();
    const containerRect = this.partyContainer.parentElement?.getBoundingClientRect() || { left: 0, top: 0 };
    const offsetLeft = gridRect.left - containerRect.left;
    const offsetTop = gridRect.top - containerRect.top;
    const cellW = gridRect.width / 14;
    const cellH = gridRect.height / 10;
    const cols = 14;

    const cameraX = Math.max(0, Math.min(partyX - Math.floor(cols / 3), 14));
    const partyVisibleX = partyX - cameraX;

    const partyY = 5;
    const sprites = this.partyContainer.querySelectorAll('.party-sprite');
    const startX = offsetLeft + partyVisibleX * cellW + cellW * 0.1;
    const startY = offsetTop + partyY * cellH + cellH * 0.1;

    sprites.forEach((sprite, i) => {
      (sprite as HTMLElement).style.position = 'absolute';
      (sprite as HTMLElement).style.left = `${startX + i * (cellW * 0.28)}px`;
      (sprite as HTMLElement).style.top = `${startY}px`;
    });
  }

  render(state: GameState, grid: GridSystem | null, partyX: number): void {
    this.originalParty = state.adventurers;

    if (!grid && !this.result) {
      this.clearPartySprites();
      this.partyContainer.style.display = 'none';
      this.container.innerHTML = `
        <div class="flex items-center justify-center h-full text-gray-500 text-sm">
          Select a level and send your party into the dungeon
        </div>
      `;
      return;
    }

    if (!grid && this.result) {
      this.clearPartySprites();
      this.partyContainer.style.display = 'none';
      this.container.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full text-sm space-y-2">
          ${this.result.cleared
            ? '<span class="neon-gold text-lg font-bold">DUNGEON CLEARED!</span>'
            : '<span class="text-red-400 text-lg font-bold">PARTY WIPED!</span>'}
          <span class="text-gray-400">Level ${this.result.level}</span>
          <span class="text-gray-500 text-xs">Send the party again when ready</span>
        </div>
      `;
      return;
    }

    const COLS = 14;
    const ROWS = 10;

    const biomeIndex = Math.min(Math.floor((state.currentLevel - 1) / 20), 4);
    const biomes = ['biome-grass', 'biome-dirt', 'biome-water', 'biome-stone', 'biome-crypt'];
    const biomeClass = biomes[biomeIndex];

    const partyY = Math.floor(grid!.height / 2);
    const cameraX = Math.max(0, Math.min(partyX - Math.floor(COLS / 3), grid!.width - COLS));

    let cells = '';
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const gx = cameraX + x;
        const cell = grid!.getCell(gx, y);

        let content = '';
        let extraClass = '';
        const partyHere = (gx === partyX && y === partyY);
        const isRunActive = !this.result;

        if (cell) {
          if (partyHere) {
            const partySprites = state.adventurers.map(adv => {
              const dead = adv.currentHP <= 0;
              const emoji = CLASS_EMOJIS[adv.classType] || '\uD83E\uDDD9';
              return `<span class="inline-block transition-opacity duration-300 ${dead ? 'opacity-30' : ''}">${emoji}</span>`;
            }).join('');
            content = `<span class="flex gap-0.5 ${isRunActive ? 'walking' : ''}">${partySprites}</span>`;
            extraClass = ' party-cell';
          } else if (cell.occupant === 'Monster') {
            content = '\uD83D\uDC79';
          } else if (cell.occupant === 'Boss') {
            content = '\uD83D\uDC7E';
          } else if (cell.occupant === 'Chest') {
            content = '\uD83D\uDCE6';
          }
        }

        cells += `<div class="grid-cell${extraClass}">${content}</div>`;
      }
    }

    this.container.innerHTML = `
      <div class="grid-wrapper w-full aspect-[14/10] max-h-[70vh] flex items-center justify-center p-1">
        <div class="w-full h-full grid grid-cols-14 grid-rows-10 ${biomeClass} rounded border border-gray-700 relative">
          ${cells}
          ${this.result ? `
            <div class="absolute inset-0 flex items-center justify-center bg-black/40 rounded z-10">
              <span class="${this.result.cleared ? 'neon-gold' : 'text-red-400'} text-lg font-bold px-4 py-2 rounded bg-black/60">
                ${this.result.cleared ? 'CLEARED' : 'WIPED'}
              </span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
}
