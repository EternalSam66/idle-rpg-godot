export function createState() {
  return {
    player: {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      onGround: false,
      facing: 1,
    },
    inventory: [],
    currentSceneId: null,
    sceneEdits: {},
    completedScenes: new Set(),
    areaProgress: {},

    addToInventory(letter) {
      if (this.inventory.length >= 4) return false;
      this.inventory.push(letter.toUpperCase());
      return true;
    },

    removeFromInventory(index) {
      if (index < 0 || index >= this.inventory.length) return null;
      return this.inventory.splice(index, 1)[0];
    },

    recordEdit(sceneId, wordIndex, newText) {
      if (!this.sceneEdits[sceneId]) this.sceneEdits[sceneId] = {};
      this.sceneEdits[sceneId][wordIndex] = newText;
    },

    getEditedWord(sceneId, wordIndex) {
      return this.sceneEdits[sceneId]?.[wordIndex] ?? null;
    },

    completeScene(sceneId) {
      this.completedScenes.add(sceneId);
    },

    reset() {
      this.player.x = 0;
      this.player.y = 0;
      this.player.vx = 0;
      this.player.vy = 0;
      this.player.onGround = false;
    }
  };
}
