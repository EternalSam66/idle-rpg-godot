type Handler<T = any> = (payload: T) => void;

export interface EventMap {
  'state:changed': Record<string, any>;
  'run:start': { level: number };
  'run:step': { step: string; data?: any };
  'run:complete': { cleared: boolean; level: number; rewards?: any };
  'combat:resolve': Record<string, any>;
  'loot:found': Record<string, any>;
  'ui:tab': { tab: 'dungeon' | 'guild' };
  'ui:action': { action: string; [key: string]: any };
  'save:done': void;

  'PARTY_MOVED': { newX: number };
  'CHEST_LOOTED': { loot: any };
  'RUN_TERMINATED_DEFEAT': { level: number; coinsGained: number; lootCount: number; survivedLevels: number };
  'RUN_TERMINATED_VICTORY': { level: number; coinsGained: number; lootCount: number };
  'RUN_TERMINATED_MANUAL': { level: number; coinsGained: number; lootCount: number };

  'ITEM_SOLD': { itemName: string; goldEarned: number };
  'AUTO_SOLD': { itemName: string; goldEarned: number };
  'ITEM_ACQUIRED': { item: any };
  'LEVEL_CHANGED': { level: number };
  'UPGRADE_PURCHASED': { upgradeKey: string; newLevel: number };
  'LOG_MESSAGE': { text: string };
  'PARTY_REVIVED': { updatedParty: import('../Models/GameState').AdventurerState[]; currentX: number };
}

export class EventBus {
  private listeners: Map<string, Set<Handler>> = new Map();

  on<K extends keyof EventMap>(event: K, handler: Handler<EventMap[K]>): void {
    if (!this.listeners.has(event as string)) this.listeners.set(event as string, new Set());
    this.listeners.get(event as string)!.add(handler);
  }

  off<K extends keyof EventMap>(event: K, handler: Handler<EventMap[K]>): void {
    this.listeners.get(event as string)?.delete(handler);
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    this.listeners.get(event as string)?.forEach(h => h(payload));
  }

  clear(): void {
    this.listeners.clear();
  }
}
