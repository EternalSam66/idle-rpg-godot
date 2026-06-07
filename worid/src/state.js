const SAVE_KEY = 'worid_progress';

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    data.completedScenes = new Set(data.completedScenes || []);
    return data;
  } catch {
    return null;
  }
}

function writeSave(data) {
  try {
    const toStore = {
      inventory: data.inventory,
      sceneEdits: data.sceneEdits,
      completedScenes: [...data.completedScenes],
      currentSceneId: data.currentSceneId,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(toStore));
  } catch {}
}

export function createState() {
  const saved = loadSave();
  const state = {
    player: {
      x: 0, y: 0, vx: 0, vy: 0,
    },
    inventory: saved?.inventory ?? [],
    currentSceneId: saved?.currentSceneId ?? null,
    sceneEdits: saved?.sceneEdits ?? {},
    completedScenes: saved?.completedScenes ?? new Set(),
    areaProgress: {},
    hasSave: saved !== null,

    addToInventory(letter) {
      if (this.inventory.length >= 4) return false;
      this.inventory.push(letter.toUpperCase());
      writeSave(this);
      return true;
    },

    removeFromInventory(index) {
      if (index < 0 || index >= this.inventory.length) return null;
      const result = this.inventory.splice(index, 1)[0];
      writeSave(this);
      return result;
    },

    recordEdit(sceneId, wordIndex, newText) {
      if (!this.sceneEdits[sceneId]) this.sceneEdits[sceneId] = {};
      this.sceneEdits[sceneId][wordIndex] = newText;
      writeSave(this);
    },

    getEditedWord(sceneId, wordIndex) {
      return this.sceneEdits[sceneId]?.[wordIndex] ?? null;
    },

    completeScene(sceneId) {
      this.completedScenes.add(sceneId);
      writeSave(this);
    },

    reset() {
      this.player.x = 0;
      this.player.y = 0;
      this.player.vx = 0;
      this.player.vy = 0;
    },

    fullReset() {
      this.player.x = 0;
      this.player.y = 0;
      this.player.vx = 0;
      this.player.vy = 0;
      this.inventory.length = 0;
      this.sceneEdits = {};
      this.completedScenes.clear();
      this.currentSceneId = null;
      this.hasSave = false;
      localStorage.removeItem(SAVE_KEY);
    }
  };

  return state;
}
