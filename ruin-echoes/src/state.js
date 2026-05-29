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
