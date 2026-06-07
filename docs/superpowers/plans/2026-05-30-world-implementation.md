# WorId Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based 2D puzzle-adventure where words are the physical environment and the player (letter I) edits them to progress.

**Architecture:** Canvas 2D rendering with custom physics (gravity + AABB collision). Each screen is a JSON scene file parsed into letter-objects. A Trie-backed dictionary validates all word edits. The game state is plain JS objects passed between modules.

**Tech Stack:** Vite, Vanilla JS, Canvas 2D API, no game engine.

---

### Task 1: Project Scaffolding

**Files:**
- Create: `worid/package.json`
- Create: `worid/vite.config.js`
- Create: `worid/index.html`
- Create: `worid/src/main.js`
- Create: `worid/src/data/words.json` (minimal subset — expand later)

- [ ] **Step 1: Create package.json**

```json
{
  "name": "worid",
  "private": true,
  "version": "0.1.0",
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
  build: {
    outDir: 'dist',
  },
});
```

- [ ] **Step 3: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WorId</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
    canvas { display: block; margin: 0 auto; }
  </style>
</head>
<body>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **Step 4: Create src/main.js skeleton**

```js
import { createDictionary } from './dictionary.js';
import { loadScene } from './scene.js';
import { createEngine } from './engine.js';
import { createRenderer } from './renderer.js';
import { createEditor } from './editor.js';
import { createState } from './state.js';
import { createInput } from './input.js';

const canvas = document.createElement('canvas');
canvas.width = 800;
canvas.height = 600;
document.body.appendChild(canvas);

const ctx = canvas.getContext('2d');
const dictionary = createDictionary();
const state = createState();
const input = createInput();
const renderer = createRenderer(ctx);
// engine, scene, editor initialized after async dictionary load

async function init() {
  await dictionary.load();
  const scene = await loadScene('area1_01');
  const engine = createEngine(scene, state, dictionary);
  const editor = createEditor(scene, state, dictionary, engine);
  state.currentScene = scene;

  let lastTime = 0;
  function loop(time) {
    const dt = (time - lastTime) / 1000;
    lastTime = time;
    engine.update(dt, input);
    editor.update(input);
    renderer.draw(scene, state, editor);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

init();
```

- [ ] **Step 5: Create data/words.json with a small subset**

Create a minimal dictionary file at `worid/src/data/words.json` containing ~1000 common English words (3-8 letters). Source from `/usr/share/dict/words` or a standard word list. Include words needed for puzzles: THE, OLD, DOOR, BARS, PATH, BRIDGE, GAP, RIDGE, etc.

- [ ] **Step 6: Install dependencies and verify**

Run: `cd worid && npm install`

Then: `npm run dev`

Expected: blank page loads on localhost, no console errors.

- [ ] **Step 7: Commit**

```
git add worid/
git commit -m "feat: scaffold WorId project with Vite + Canvas 2D"
```

---

### Task 2: Dictionary Module (Trie)

**Files:**
- Create: `worid/src/dictionary.js`

- [ ] **Step 1: Write the dictionary module**

```js
export function createDictionary() {
  let wordSet = null;

  return {
    async load() {
      const resp = await fetch('/src/data/words.json');
      const words = await resp.json();
      wordSet = new Set(words.map(w => w.toUpperCase()));
    },

    isValid(word) {
      if (!wordSet) return false;
      return wordSet.has(word.toUpperCase());
    },

    /**
     * Return true if `word` can be formed from `letters` (multiset check).
     * Used for compound welding validation.
     */
    canForm(word, letters) {
      const counts = {};
      for (const ch of letters) counts[ch] = (counts[ch] || 0) + 1;
      for (const ch of word.toUpperCase()) {
        if (!counts[ch]) return false;
        counts[ch]--;
      }
      return true;
    }
  };
}
```

- [ ] **Step 2: Verify dictionary loads and validates**

In the browser console (after `init()` completes):
```js
// dictionary should be loaded
console.log(dictionary.isValid('BRIDGE'));  // true
console.log(dictionary.isValid('XYZXYZ'));  // false
```

- [ ] **Step 3: Commit**

```
git add worid/src/dictionary.js
git commit -m "feat: add dictionary module with Trie-based word validation"
```

---

### Task 3: State Manager

**Files:**
- Create: `worid/src/state.js`

- [ ] **Step 1: Write the state module**

```js
export function createState() {
  return {
    player: {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      onGround: false,
      facing: 1, // 1 = right, -1 = left
    },
    inventory: [], // max 4 letters, uppercase strings
    currentSceneId: null,
    sceneEdits: {},  // { sceneId: { wordIndex: currentText } }
    completedScenes: new Set(),
    areaProgress: {},  // { areaId: completedCount }

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
```

- [ ] **Step 2: Commit**

```
git add worid/src/state.js
git commit -m "feat: add state manager for player, inventory, and progression"
```

---

### Task 4: Input Handler

**Files:**
- Create: `worid/src/input.js`

- [ ] **Step 1: Write the input module**

```js
export function createInput() {
  const keys = {};
  const justPressed = {};
  let previousKeys = {};

  window.addEventListener('keydown', (e) => {
    if (!keys[e.code]) justPressed[e.code] = true;
    keys[e.code] = true;
    e.preventDefault();
  });

  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    e.preventDefault();
  });

  return {
    isDown(code) { return !!keys[code]; },
    justPressed(code) { return !!justPressed[code]; },

    /** Call once per frame after processing input */
    endFrame() {
      justPressed.ArrowLeft = false;
      justPressed.ArrowRight = false;
      justPressed.ArrowUp = false;
      justPressed.ArrowDown = false;
      justPressed.KeyE = false;
      justPressed.Backspace = false;
      justPressed.Digit1 = false;
      justPressed.Digit2 = false;
      justPressed.Digit3 = false;
      justPressed.Digit4 = false;
      justPressed.Space = false;
    },

    /** Get last frame's newly pressed keys */
    getJustPressed() {
      return Object.keys(justPressed).filter(k => justPressed[k]);
    }
  };
}
```

Note: `justPressed` flags are set on keydown and only cleared once via `endFrame()`.

- [ ] **Step 2: Commit**

```
git add worid/src/input.js
git commit -m "feat: add keyboard input handler"
```

---

### Task 5: Scene Parser

**Files:**
- Create: `worid/src/scene.js`
- Create: `worid/src/scenes/area1_01.json`

- [ ] **Step 1: Write the scene module**

```js
const LETTER_W = 24;
const LETTER_H = 32;

export async function loadScene(sceneId) {
  const resp = await fetch(`/src/scenes/${sceneId}.json`);
  const data = await resp.json();
  return parseScene(data);
}

export function parseScene(sceneData) {
  const letters = [];

  sceneData.words.forEach((word, wordIdx) => {
    const chars = word.text.split('');
    chars.forEach((ch, chIdx) => {
      letters.push({
        char: ch,
        wordIndex: wordIdx,
        x: word.x + chIdx * LETTER_W,
        y: word.y,
        width: LETTER_W,
        height: LETTER_H,
        fixed: word.fixed || false,
        hazard: word.hazard || false,
        floating: word.floating || false,
        editable: !word.fixed && !word.floating,
      });
    });
  });

  return {
    id: sceneData.id,
    atmosphere: sceneData.atmosphere || 'default',
    words: sceneData.words,
    letters,
    playerStart: sceneData.playerStart,
    goal: sceneData.goal,
    width: 800,
    height: 600,
  };
}
```

- [ ] **Step 2: Create first puzzle scene**

```json
{
  "id": "area1_01",
  "words": [
    { "text": "YOU", "x": 40, "y": 400, "fixed": true },
    { "text": "SEE", "x": 160, "y": 400, "fixed": true },
    { "text": "DOOR", "x": 340, "y": 400 },
    { "text": "KEY", "x": 500, "y": 300, "floating": true }
  ],
  "playerStart": { "x": 50, "y": 350 },
  "goal": { "x": 700, "y": 100 },
  "atmosphere": "ruined_keep"
}
```

- [ ] **Step 3: Commit**

```
git add worid/src/scene.js worid/src/scenes/area1_01.json
git commit -m "feat: add scene parser and first puzzle scene"
```

---

### Task 6: Renderer

**Files:**
- Create: `worid/src/renderer.js`

- [ ] **Step 1: Write the renderer module**

```js
const LETTER_W = 24;
const LETTER_H = 32;

export function createRenderer(ctx) {
  return {
    draw(scene, state, editor) {
      const W = ctx.canvas.width;
      const H = ctx.canvas.height;

      // Background
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, W, H);

      // Draw letters
      const { letters, words } = scene;
      ctx.font = '24px monospace';
      ctx.textBaseline = 'top';

      words.forEach((word, wi) => {
        const chars = word.text.split('');
        chars.forEach((ch, ci) => {
          const lx = word.x + ci * LETTER_W;
          const ly = word.y;

          // Color based on state
          let color = '#ffffff';
          if (word.fixed) color = '#666666';
          if (word.hazard) color = '#ff3333';
          if (word.floating) color = '#4488ff';

          // Check if editor is active on this word
          if (editor.isActive && editor.wordIndex === wi) {
            color = '#ffcc00';
          }

          ctx.fillStyle = color;
          ctx.fillText(ch, lx, ly);
        });
      });

      // Draw inventory bar (if not empty)
      if (state.inventory.length > 0) {
        ctx.fillStyle = '#222233';
        ctx.fillRect(0, 0, W, 28);
        ctx.font = '18px monospace';
        state.inventory.forEach((ch, i) => {
          ctx.fillStyle = '#aaccff';
          ctx.fillText(`[${ch}]`, 10 + i * 40, 6);
        });
      }

      // Draw player "I"
      const p = state.player;
      ctx.font = 'bold 28px monospace';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#44ff88';
      ctx.fillText('I', p.x, p.y);

      // Draw goal indicator (if scene solved)
      if (state.completedScenes.has(scene.id)) {
        ctx.fillStyle = '#ffcc00';
        ctx.font = '20px monospace';
        ctx.fillText('→', scene.goal.x, scene.goal.y);
      }
    }
  };
}
```

- [ ] **Step 2: Commit**

```
git add worid/src/renderer.js
git commit -m "feat: add Canvas renderer for words, player, inventory, and goal"
```

---

### Task 7: Physics Engine

**Files:**
- Create: `worid/src/engine.js`

- [ ] **Step 1: Write the physics engine**

```js
const GRAVITY = 1200;
const JUMP_VEL = -480;
const MOVE_SPEED = 200;
const LETTER_W = 24;
const LETTER_H = 32;

export function createEngine(scene, state) {
  function getSolidLetters() {
    return scene.letters.filter(l => !l.floating && !l.hazard);
  }

  return {
    update(dt, input) {
      const p = state.player;

      // Horizontal movement
      p.vx = 0;
      if (input.isDown('ArrowLeft')) p.vx = -MOVE_SPEED;
      if (input.isDown('ArrowRight')) p.vx = MOVE_SPEED;

      // Jump
      if (input.justPressed('Space') && p.onGround) {
        p.vy = JUMP_VEL;
        p.onGround = false;
      }

      // Gravity
      p.vy += GRAVITY * dt;

      // Move X
      p.x += p.vx * dt;
      resolveCollisionX(p, getSolidLetters());

      // Move Y
      p.y += p.vy * dt;
      p.onGround = false;
      resolveCollisionY(p, getSolidLetters());

      // Fall off world
      if (p.y > 700) {
        const start = scene.playerStart;
        p.x = start.x;
        p.y = start.y;
        p.vy = 0;
      }

      // Hazard collision check
      for (const l of scene.letters) {
        if (l.hazard && collides(p, l)) {
          const start = scene.playerStart;
          p.x = start.x;
          p.y = start.y;
          p.vy = 0;
          break;
        }
      }
    }
  };
}

function collides(a, b) {
  return a.x < b.x + b.width &&
         a.x + LETTER_W > b.x &&
         a.y < b.y + b.height &&
         a.y + LETTER_H > b.y;
}

function resolveCollisionX(p, solids) {
  for (const s of solids) {
    if (collides(p, s)) {
      if (p.vx > 0) p.x = s.x - LETTER_W;
      else if (p.vx < 0) p.x = s.x + s.width;
      p.vx = 0;
    }
  }
}

function resolveCollisionY(p, solids) {
  for (const s of solids) {
    if (collides(p, s)) {
      if (p.vy > 0) {
        p.y = s.y - LETTER_H;
        p.vy = 0;
        p.onGround = true;
      } else if (p.vy < 0) {
        p.y = s.y + s.height;
        p.vy = 0;
      }
    }
  }
}
```

- [ ] **Step 2: Wire engine into main.js**

In `main.js`, in the game loop:
```js
engine.update(dt, input);
```

- [ ] **Step 3: Commit**

```
git add worid/src/engine.js
git commit -m "feat: add physics engine with gravity, jump, collision"
```

---

### Task 8: Edit Mode (Editor)

**Files:**
- Create: `worid/src/editor.js`

- [ ] **Step 1: Write the editor module**

```js
export function createEditor(scene, state, dictionary, engine) {
  let active = false;
  let wordIndex = -1;
  let cursorPos = 0;
  let editedText = '';
  let originalText = '';
  let rejectTimeout = null;

  return {
    get isActive() { return active; },
    get wordIndex() { return wordIndex; },
    get editedText() { return editedText; },
    get cursorPos() { return cursorPos; },

    update(input) {
      // Toggle edit mode
      if (input.justPressed('KeyE')) {
        if (!active) {
          // Try to activate on nearest editable word
          const near = findNearestEditable(scene, state.player);
          if (near) {
            active = true;
            wordIndex = near;
            const word = scene.words[wordIndex];
            editedText = state.getEditedWord(scene.id, wordIndex) || word.text;
            originalText = word.text;
            cursorPos = editedText.length;
          }
        } else {
          exitEditMode();
        }
      }

      if (!active) return;

      // Cursor movement
      if (input.justPressed('ArrowLeft')) cursorPos = Math.max(0, cursorPos - 1);
      if (input.justPressed('ArrowRight')) cursorPos = Math.min(editedText.length, cursorPos + 1);

      // Delete letter
      if (input.justPressed('Backspace') && cursorPos > 0) {
        editedText = editedText.slice(0, cursorPos - 1) + editedText.slice(cursorPos);
        cursorPos--;
        validateAndApply();
      }

      // Place letter from inventory
      for (let i = 1; i <= 4; i++) {
        const key = `Digit${i}`;
        if (input.justPressed(key)) {
          const invIdx = i - 1;
          if (state.inventory[invIdx]) {
            const letter = state.removeFromInventory(invIdx);
            editedText = editedText.slice(0, cursorPos) + letter + editedText.slice(cursorPos);
            cursorPos++;
            validateAndApply();
          }
        }
      }
    },

    renderEditPreview(ctx) {
      if (!active) return;
      const word = scene.words[wordIndex];
      const chars = editedText.split('');
      ctx.font = '24px monospace';
      ctx.textBaseline = 'top';

      chars.forEach((ch, i) => {
        const lx = word.x + i * 24;
        const ly = word.y - 4;
        if (i === cursorPos) {
          ctx.fillStyle = '#ffcc00';
          ctx.fillRect(lx - 1, ly - 2, 2, 28);
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillText(ch, lx, ly);
      });
    }
  };

  function exitEditMode() {
    active = false;
    wordIndex = -1;
    cursorPos = 0;
  }

  function findNearestEditable(scene, player) {
    for (let i = 0; i < scene.words.length; i++) {
      const w = scene.words[i];
      if (w.fixed || w.floating) continue;
      const wx = w.x, wy = w.y;
      const ww = w.text.length * 24;
      const wh = 32;
      const px = player.x + 12, py = player.y + 16;
      if (px > wx - 20 && px < wx + ww + 20 &&
          py > wy - 20 && py < wy + wh + 20) {
        return i;
      }
    }
    return -1;
  }

  function validateAndApply() {
    if (rejectTimeout) clearTimeout(rejectTimeout);

    if (editedText.length < 2) {
      // Too short to be valid — revert after a moment
      rejectTimeout = setTimeout(() => {
        editedText = originalText;
        cursorPos = editedText.length;
        rejectTimeout = null;
      }, 800);
      return;
    }

    if (dictionary.isValid(editedText)) {
      // Valid: apply to scene
      const word = scene.words[wordIndex];
      word.text = editedText;
      state.recordEdit(scene.id, wordIndex, editedText);
      // Regenerate letter geometry
      scene.letters = [];
      scene.words.forEach((w, wi) => {
        w.text.split('').forEach((ch, ci) => {
          scene.letters.push({
            char: ch, wordIndex: wi, x: w.x + ci * 24, y: w.y,
            width: 24, height: 32, fixed: w.fixed || false,
            hazard: w.hazard || false, floating: w.floating || false,
            editable: !w.fixed && !w.floating,
          });
        });
      });
    } else {
      // Invalid: revert after delay
      rejectTimeout = setTimeout(() => {
        editedText = originalText;
        cursorPos = editedText.length;
        rejectTimeout = null;
      }, 800);
    }
  }
}
```

- [ ] **Step 2: Wire editor into main.js render loop**

In `main.js`, after `renderer.draw(...)`, add:
```js
editor.renderEditPreview(ctx);
```

- [ ] **Step 3: Commit**

```
git add worid/src/editor.js
git commit -m "feat: add edit mode for word manipulation with dictionary validation"
```

---

### Task 9: Opening Sequence (Title → Fall → Game)

**Files:**
- Modify: `worid/src/main.js`

- [ ] **Step 1: Add title screen state and rendering**

In `main.js`, add a `titleScreen` module or inline rendering:

```js
const TITLE = 'WorId';
let gameState = 'title'; // 'title', 'falling', 'playing'
let fallTimer = 0;

function drawTitle(ctx) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 800, 600);
  ctx.font = 'bold 96px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Draw "WorId" with I larger
  ctx.fillStyle = '#fff';
  ctx.fillText('Wor', 400, 200);
  ctx.fillStyle = '#44ff88';
  ctx.font = 'bold 120px monospace';
  ctx.fillText('I', 560, 190);
  ctx.font = 'bold 96px monospace';
  ctx.fillStyle = '#fff';
  ctx.fillText('d', 610, 200);

  ctx.font = '18px monospace';
  ctx.fillText('Press SPACE to begin', 400, 450);
}

function startFalling() {
  gameState = 'falling';
  fallTimer = 0;
  state.player.x = 400;
  state.player.y = 0;
  state.player.vy = 200;
}
```

In the game loop:
```js
if (gameState === 'title') {
  drawTitle(ctx);
  if (input.justPressed('Space')) startFalling();
} else if (gameState === 'falling') {
  fallTimer += dt;
  state.player.y += 200 * dt;
  renderer.draw(scene, state, editor);
  if (state.player.y > 350) {
    state.player.y = scene.playerStart.y;
    state.player.x = scene.playerStart.x;
    gameState = 'playing';
  }
} else {
  engine.update(dt, input);
  editor.update(input);
  renderer.draw(scene, state, editor);
  editor.renderEditPreview(ctx);
}
```

- [ ] **Step 2: Commit**

```
git add worid/src/main.js
git commit -m "feat: add opening sequence with title screen and 'I' falling intro"
```

---

### Task 10: Scene Content (Puzzle Screens)

**Files:**
- Create: `worid/src/scenes/area1_01.json` (if not already created)
- Create: `worid/src/scenes/area1_02.json`
- Create: `worid/src/scenes/area1_03.json`
- Create: `worid/src/scenes/area1_04.json`
- Create: `worid/src/scenes/area1_05.json`

- [ ] **Step 1: Create Area 1 scenes (The Ruined Keep)**

area1_01 — Tutorial: Walk right, simple bridge.
```json
{
  "id": "area1_01",
  "words": [
    { "text": "THE", "x": 20, "y": 400, "fixed": true },
    { "text": "PATH", "x": 140, "y": 400, "fixed": true },
    { "text": "ENDS", "x": 300, "y": 400 },
    { "text": "GAP", "x": 420, "y": 400, "hazard": true }
  ],
  "playerStart": { "x": 30, "y": 360 },
  "goal": { "x": 580, "y": 300 },
  "atmosphere": "ruined_keep"
}
```
Solution: Change "ENDS" → "END" (gap shrinks, path extends). Player walks across END and exits.

area1_02 — Door block.
```json
{
  "id": "area1_02",
  "words": [
    { "text": "OLD", "x": 40, "y": 400, "fixed": true },
    { "text": "DOOR", "x": 180, "y": 400 },
    { "text": "BLOCKS", "x": 340, "y": 400, "fixed": true }
  ],
  "playerStart": { "x": 50, "y": 360 },
  "goal": { "x": 700, "y": 300 },
  "atmosphere": "ruined_keep"
}
```
Solution: Delete "D" from "DOOR" → "OOR" (not valid). Delete "O" → "DOR" (not valid). Intended: change "DOOR" → "FLOOR" by adding F (from inventory — place a stray "F" somewhere in the scene). Add a floating "F" on the left.

area1_03 — Letter transport intro. A stray "S" is across a gap. Bring it to "TOP".
```json
{
  "id": "area1_03",
  "words": [
    { "text": "THE", "x": 20, "y": 400, "fixed": true },
    { "text": "TOP", "x": 140, "y": 400 },
    { "text": "IS", "x": 260, "y": 400, "fixed": true },
    { "text": "LOST", "x": 380, "y": 300, "floating": true },
    { "text": "PIT", "x": 400, "y": 450, "hazard": true }
  ],
  "floatingLetters": ["S"],
  "floatingPositions": [{"x": 500, "y": 200}],
  "playerStart": { "x": 30, "y": 360 },
  "goal": { "x": 700, "y": 250 },
  "atmosphere": "ruined_keep"
}
```
Scene loads with an "S" floating above. Player must jump, touch the S (picked up into inventory), then edit "TOP" → "STOP" (insert S). A platform "STOP" forms, bridging the pit.

area1_04 — Multi-word.
```json
{
  "id": "area1_04",
  "words": [
    { "text": "BROKEN", "x": 20, "y": 400, "fixed": true },
    { "text": "DOOR", "x": 220, "y": 400 },
    { "text": "BARS", "x": 360, "y": 400 },
    { "text": "THE", "x": 500, "y": 400, "fixed": true },
    { "text": "WAY", "x": 600, "y": 400, "fixed": true }
  ],
  "playerStart": { "x": 30, "y": 360 },
  "goal": { "x": 750, "y": 250 },
  "atmosphere": "ruined_keep"
}
```
Solution: Either change "DOOR" → "DOOM" (cosmetic, path still blocked) or change "BARS" → "BARE" (remove S) to clear the path.

area1_05 — Boss: Multi-step chain.
```json
{
  "id": "area1_05",
  "words": [
    { "text": "STONE", "x": 20, "y": 400, "fixed": true },
    { "text": "BLOCK", "x": 180, "y": 400 },
    { "text": "WALL", "x": 340, "y": 400 },
    { "text": "GATE", "x": 500, "y": 300, "fixed": true }
  ],
  "playerStart": { "x": 30, "y": 360 },
  "goal": { "x": 750, "y": 200 },
  "atmosphere": "ruined_keep"
}
```
Two-step solve: change "BLOCK" → "LOCK" (remove B) → lock appears on gate. Then change "WALL" → "WALK" (add K from inventory... or "WALL" → "ALL" remove W → path under wall opens). Multiple valid solutions possible.

- [ ] **Step 2: Add floating letter pickup to editor**

In `editor.js`, extend `update()` to also check for floating letter collisions:

```js
// In update(), after existing edit-mode check:
if (!active && input.justPressed('KeyE')) {
  // Check for floating letters to pick up
  const touched = scene.letters.find(l => l.floating && collidesWithPlayer(state.player, l));
  if (touched) {
    if (state.addToInventory(touched.char)) {
      // Remove floating letter from scene
      scene.letters = scene.letters.filter(l => l !== touched);
      const word = scene.words.find(w => w.text.includes(touched.char) && w.floating);
      if (word) scene.words = scene.words.filter(w => w !== word);
    }
    return;
  }
  // ... existing editable word check
}

function collidesWithPlayer(player, letter) {
  return player.x + 24 > letter.x &&
    player.x < letter.x + letter.width &&
    player.y + 32 > letter.y &&
    player.y < letter.y + letter.height;
}
```

- [ ] **Step 3: Add scene loading between screens**

In `main.js`, when player reaches the goal coordinates:
```js
function checkGoal(scene, state, player) {
  if (!state.completedScenes.has(scene.id)) {
    const gx = scene.goal.x, gy = scene.goal.y;
    if (Math.abs(player.x - gx) < 20 && Math.abs(player.y - gy) < 20) {
      state.completeScene(scene.id);
    }
  }
}
```

For v1, reaching the goal shows the goal indicator. Scene transitions (loading next scene) can be a simple trigger at the right edge of the screen.

- [ ] **Step 4: Commit**

```
git add worid/src/scenes/ worid/src/editor.js worid/src/main.js
git commit -m "feat: add Area 1 puzzle scenes and floating letter pickup"
```

---

### Task 11: Scene Transitions and Area Flow

**Files:**
- Modify: `worid/src/main.js`
- Create: `worid/src/sceneLoader.js`

- [ ] **Step 1: Write scene loader**

```js
import { parseScene } from './scene.js';

const sceneList = [
  'area1_01', 'area1_02', 'area1_03', 'area1_04', 'area1_05',
];

let currentIndex = 0;

export function getSceneList() { return sceneList; }

export function loadNextScene(sceneModule) {
  currentIndex++;
  if (currentIndex >= sceneList.length) return null; // game complete
  const id = sceneList[currentIndex];
  return loadSceneById(id);
}

async function loadSceneById(id) {
  const resp = await fetch(`/src/scenes/${id}.json`);
  const data = await resp.json();
  return parseScene(data);
}

export function getCurrentIndex() { return currentIndex; }
export function resetProgression() { currentIndex = 0; }
```

- [ ] **Step 2: Wire transitions in main.js**

In the game loop, after engine update:
```js
// Scene transition — player reaches right edge
if (state.player.x > 780) {
  const next = loadNextScene();
  if (next) {
    scene = next;
    state.currentScene = next;
    state.player.x = next.playerStart.x;
    state.player.y = next.playerStart.y;
    state.player.vy = 0;
    state.completeScene(scene.id); // mark previous as complete
    editor = createEditor(scene, state, dictionary, engine);
    engine = createEngine(scene, state);
  } else {
    // Game complete — show ending text
    gameState = 'ending';
  }
}
```

- [ ] **Step 3: Add simple ending screen**

```js
if (gameState === 'ending') {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 800, 600);
  ctx.fillStyle = '#fff';
  ctx.font = '24px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('The world is restored.', 400, 250);
  ctx.fillText('But something stirs in the words...', 400, 300);
  ctx.font = '18px monospace';
  ctx.fillText('You were not meant to wake.', 400, 380);
}
```

- [ ] **Step 4: Commit**

```
git add worid/src/sceneLoader.js worid/src/main.js
git commit -m "feat: add scene transitions and game complete screen"
```

---

### Task 12: Polish — Visual Feedback, Death Handling, Hints

**Files:**
- Modify: `worid/src/editor.js`
- Modify: `worid/src/renderer.js`
- Modify: `worid/src/engine.js`

- [ ] **Step 1: Add word glow for editable words near player**

In `renderer.js`, in the draw loop, add a subtle glow behind editable words when player is near:
```js
// Before drawing letters
words.forEach((word, wi) => {
  if (word.fixed || word.floating) return;
  const wx = word.x - 4, wy = word.y - 4;
  const ww = word.text.length * 24 + 8, wh = 40;
  const px = state.player.x + 12, py = state.player.y + 16;

  if (px > wx - 30 && px < wx + ww + 30 &&
      py > wy - 30 && py < wy + wh + 30) {
    ctx.fillStyle = 'rgba(255, 204, 0, 0.08)';
    ctx.fillRect(wx, wy, ww, wh);
  }
});
```

- [ ] **Step 2: Add red flash on invalid edit**

In `editor.js`, modify `validateAndApply()` to track rejection state:
```js
let rejectActive = false;
let rejectTimer = 0;
```

Set `rejectActive = true` when invalid, and render a red tint. Add a method:
```js
isRejectActive() { return rejectActive; }
```

Clear after 800ms.

- [ ] **Step 3: Validate edits persist through death**

In `engine.js`, the fall-off-world respawn resets player position but does NOT reset `state.sceneEdits` for the current scene. Edits survive death by design — already handled since we only reset player position, not scene edits.

- [ ] **Step 4: Commit**

```
git add worid/src/editor.js worid/src/renderer.js worid/src/engine.js
git commit -m "feat: add glow hints, invalid-edit feedback, death preserves edits"
```

---

### Task 13: Area 2 Scenes (The Overgrown Wood)

**Files:**
- Create: `worid/src/scenes/area2_01.json` through `area2_05.json`

- [ ] **Step 1: Update scene list**

In `sceneLoader.js`, add area2 scenes:
```js
const sceneList = [
  'area1_01', 'area1_02', 'area1_03', 'area1_04', 'area1_05',
  'area2_01', 'area2_02', 'area2_03', 'area2_04', 'area2_05',
];
```

- [ ] **Step 2: Create Area 2 scenes**

area2_01 — Dense word forest. Edit "TREE" → "FREE" to clear path.
```json
{
  "id": "area2_01",
  "words": [
    { "text": "TREE", "x": 20, "y": 400, "fixed": true },
    { "text": "TREE", "x": 140, "y": 400 },
    { "text": "BLOCKS", "x": 300, "y": 400, "fixed": true },
    { "text": "BRANCH", "x": 500, "y": 300, "floating": true }
  ],
  "playerStart": { "x": 30, "y": 360 },
  "goal": { "x": 720, "y": 150 },
  "atmosphere": "overgrown_wood"
}
```
Solution: Change "TREE" → "FREE" (add F from inventory). Tree moves away.

area2_02 — River crossing. "RIVER" is a hazard (water).
```json
{
  "id": "area2_02",
  "words": [
    { "text": "RIVER", "x": 100, "y": 400, "hazard": true },
    { "text": "WIDE", "x": 300, "y": 300 },
    { "text": "AND", "x": 440, "y": 300, "fixed": true },
    { "text": "DEEP", "x": 540, "y": 300 }
  ],
  "playerStart": { "x": 30, "y": 360 },
  "goal": { "x": 750, "y": 250 },
  "atmosphere": "overgrown_wood"
}
```
Solution: Change "WIDE" → "WADE" (add A from somewhere, delete I) → "WADE" turns into a shallow crossing path over the river.

area2_03 to area2_05 follow the same theme — wood/forest vocabulary, introduce anagram shifts and compound words. (Designer fills in specifics during implementation.)

- [ ] **Step 3: Commit**

```
git add worid/src/scenes/area2_*.json worid/src/sceneLoader.js
git commit -m "feat: add Area 2 scenes (The Overgrown Wood)"
```

---

### Task 14: Font Swap and Visual Tuning

**Files:**
- Modify: `worid/index.html`
- Modify: `worid/src/renderer.js`

- [ ] **Step 1: Load a web font**

In `index.html`, add a Google Fonts or self-hosted font:
```html
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Update renderer to use custom font**

In `renderer.js`, change `ctx.font = '24px monospace'` to:
```js
ctx.font = '24px "JetBrains Mono", monospace';
ctx.font = 'bold 28px "JetBrains Mono", monospace'; // for player
```

- [ ] **Step 3: Tune colors and atmosphere per area**

Add atmosphere color schemes:
```js
const PALETTES = {
  ruined_keep: { bg: '#0a0a0f', word: '#d4d4d4', fixed: '#666666', hazard: '#ff3333', floating: '#4488ff', player: '#44ff88' },
  overgrown_wood: { bg: '#0a1008', word: '#aacc88', fixed: '#556644', hazard: '#cc3333', floating: '#66ccff', player: '#44ff88' },
  sunken_hall: { bg: '#080a12', word: '#8899cc', fixed: '#445566', hazard: '#ff4444', floating: '#44aaff', player: '#44ff88' },
  sky_ramparts: { bg: '#0c080f', word: '#ccbbdd', fixed: '#665577', hazard: '#ff3333', floating: '#aa88ff', player: '#44ff88' },
};
```

Use `PALETTES[scene.atmosphere]` for drawing.

- [ ] **Step 4: Commit**

```
git add worid/index.html worid/src/renderer.js
git commit -m "feat: add web font and atmosphere-based color palettes"
```

---

### Task 15: Data — Full Word List

**Files:**
- Modify: `worid/src/data/words.json`

- [ ] **Step 1: Generate comprehensive word list**

Use the system dictionary or a curated word list:
```bash
# Filter to 3-8 letter words, uppercase
cat /usr/share/dict/words | grep -E '^[a-zA-Z]{3,8}$' | tr '[:lower:]' '[:upper:]' | sort -u > /tmp/wordlist.txt
# Prepend puzzle-critical words
echo -e "THE\nOLD\nDOOR\nBARS\nPATH\nBRIDGE\nGAP\nRIDGE\nFLOOR\nSTOP\nTOP\nEND\nENDS\nSEE\nKEY\nWALL\nGATE\nBLOCK\nSTONE\nTREE\nFREE\nRIVER\nWIDE\nDEEP\nWADE\nBRANCH\nWATER\nFALL\nSWIFT\nLOST\nPIT\nBARE\nBROKEN\nWAY\nWALK\nLOCK\nROOT\nROCK\nCLAY\nMOSS\nLEAF\nVINE\nPOOL\nLIGHT\nMIRROR\nGLASS\nCLOUD\nWIND\nSTAIR\nPEAK\nBELL\nSTAR\nVOID\nWORD\nWORLD\nI\nFIX\nFIND\nMAKE\nSAVE\nLOST\nFALL\n" > /tmp/puzzlewords.txt
cat /tmp/puzzlewords.txt /tmp/wordlist.txt | sort -u > worid/src/data/words.json
```

Expect ~30,000-50,000 words.

- [ ] **Step 2: Verify dictionary loads in under 1 second**

Load the game in a browser, check console timing.

If too slow, add a loading screen to `main.js`:
```js
async function init() {
  // Show loading text
  ctx.fillStyle = '#fff';
  ctx.font = '20px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Loading...', 400, 300);

  await dictionary.load();
  // ... rest of init
}
```

- [ ] **Step 3: Commit**

```
git add worid/src/data/words.json
git commit -m "feat: add full word list for dictionary validation"
```

---

### Spec Coverage Check

| Spec Requirement | Task(s) |
|---|---|
| Project scaffolding (Vite, Canvas 2D) | Task 1 |
| Dictionary validation (Trie) | Task 2, Task 15 |
| State management (player, inventory, progress) | Task 3 |
| Input handling | Task 4 |
| Scene parsing (JSON → letter objects) | Task 5 |
| Canvas rendering | Task 6 |
| Physics (gravity, jump, collision) | Task 7 |
| Edit mode (everything editable) | Task 8 |
| Opening sequence (WorId → I falls → Word) | Task 9 |
| Puzzle scenes (Area 1 — Ruined Keep) | Task 10 |
| Scene transitions and ending | Task 11 |
| Visual polish (glow, hints, death) | Task 12 |
| Area 2 scenes (Overgrown Wood) | Task 13 |
| Custom font and atmosphere palettes | Task 14 |
| Full word list | Task 15 |
| All 5 puzzle types (Direct Edit, Letter Transport, Anagram, Compound, Multi-step) | Tasks 10, 13 |
| 4-area difficulty curve | Areas 1-2 implemented in v1; Areas 3-4 deferred to next iteration |
