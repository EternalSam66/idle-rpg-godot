const SAVE_KEY = 'ruin-echoes-save';

const defaultState = () => ({
  gold: 0,
  fragments: 0,
  echoStones: 0,
  totalGoldEarned: 0,
  totalFragmentsEarned: 0,
  adventurers: [
    { id: 'warrior', unlocked: true, xp: 0 },
    { id: 'mage', unlocked: false, xp: 0 },
    { id: 'ranger', unlocked: true, xp: 0 },
    { id: 'priest', unlocked: false, xp: 0 },
  ],
  unlockedZones: ['entrance'],
  upgrades: {},
  lastTimestamp: Date.now(),
  rebirthCount: 0,
});

export function createGameState() {
  const saved = loadFromStorage();
  if (saved) {
    return migrate(saved);
  }
  return defaultState();
}

function migrate(saved) {
  ['warrior', 'ranger'].forEach(id => {
    const adv = saved.adventurers.find(a => a.id === id);
    if (adv) adv.unlocked = true;
  });
  saved.adventurers.forEach(a => {
    if (a.xp === undefined) a.xp = 0;
    if (a.level !== undefined) delete a.level;
    if (a.rarity !== undefined) delete a.rarity;
  });
  if (saved.totalFragmentsEarned === undefined) saved.totalFragmentsEarned = saved.fragments || 0;
  if (saved.energy !== undefined) delete saved.energy;
  if (saved.lastTimestamp === undefined) saved.lastTimestamp = Date.now();
  return saved;
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
