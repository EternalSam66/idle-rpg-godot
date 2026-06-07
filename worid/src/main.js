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

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const my = (e.clientY - rect.top) * (canvas.height / rect.height);
  if (gameState !== 'loading' &&
      mx >= RESTART_BTN.x && mx <= RESTART_BTN.x + RESTART_BTN.w &&
      my >= RESTART_BTN.y && my <= RESTART_BTN.y + RESTART_BTN.h) {
    restartGame();
  }
});

const RESTART_BTN = { x: 740, y: 4, w: 56, h: 22 };

let gameState = 'loading';
let scene = null;
let engine = null;
let editor = null;

const sceneList = [
  'area1_01', 'area1_02', 'area1_03', 'area1_04', 'area1_05',
];
let sceneIndex = 0;

async function loadSceneById(id) {
  const s = await loadScene(id);
  restoreEdits(s);
  return s;
}

async function loadNextScene() {
  sceneIndex++;
  if (sceneIndex >= sceneList.length) return null;
  return await loadSceneById(sceneList[sceneIndex]);
}

function restoreEdits(s) {
  const edits = state.sceneEdits[s.id];
  if (!edits) return;
  for (const [wordIdx, text] of Object.entries(edits)) {
    const wi = parseInt(wordIdx);
    if (s.words[wi]) s.words[wi].text = text;
  }
  s.letters = [];
  s.words.forEach((w, wi) => {
    w.text.split('').forEach((ch, ci) => {
      s.letters.push({
        char: ch, wordIndex: wi,
        x: w.x + ci * 24, y: w.y,
        width: 24, height: 32,
        fixed: w.fixed || false, hazard: w.hazard || false,
        floating: w.floating || false, editable: !w.fixed && !w.floating,
      });
    });
  });
}

function collectNearbyFloating() {
  for (let i = scene.letters.length - 1; i >= 0; i--) {
    const l = scene.letters[i];
    if (!l.floating) continue;
    const p = state.player;
    if (p.x < l.x + l.width &&
        p.x + 24 > l.x &&
        p.y < l.y + l.height &&
        p.y + 32 > l.y) {
      if (state.addToInventory(l.char)) {
        scene.letters.splice(i, 1);
        scene.words = scene.words.filter(w =>
          w.text.length !== 1 || !w.floating || w.text !== l.char
        );
        return;
      }
    }
  }
}

async function init() {
  ctx.fillStyle = '#fff';
  ctx.font = '20px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Loading...', 400, 300);
  ctx.textAlign = 'start';

  await dictionary.load();

  if (state.hasSave) {
    sceneIndex = state.completedScenes.size;
    if (sceneIndex >= sceneList.length) sceneIndex = sceneList.length - 1;
    scene = await loadSceneById(sceneList[sceneIndex]);
    state.player.x = scene.playerStart.x;
    state.player.y = scene.playerStart.y;
  } else {
    scene = await loadSceneById(sceneList[0]);
    state.player.x = scene.playerStart.x;
    state.player.y = scene.playerStart.y;
  }

  engine = createEngine(scene, state);
  editor = createEditor(scene, state, dictionary);
  gameState = state.hasSave ? 'playing' : 'title';

  let lastTime = 0;
  function loop(time) {
    const dt = lastTime ? (time - lastTime) / 1000 : 0.016;
    lastTime = time;
    update(dt);
    draw();
    input.endFrame();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

async function restartGame() {
  state.fullReset();
  sceneIndex = 0;
  scene = await loadSceneById(sceneList[0]);
  engine = createEngine(scene, state);
  editor = createEditor(scene, state, dictionary);
  state.player.x = scene.playerStart.x;
  state.player.y = scene.playerStart.y;
  gameState = 'title';
}

function update(dt) {
  if (gameState === 'title') {
    if (input.justPressed('Space')) {
      state.player.x = scene.playerStart.x;
      state.player.y = scene.playerStart.y;
      gameState = 'playing';
    }
  } else if (gameState === 'playing') {
    engine.update(dt, input, editor.isActive);
    collectNearbyFloating();
    editor.update(input);

    if (!state.completedScenes.has(scene.id)) {
      const p = state.player;
      if (Math.abs(p.x - scene.goal.x) < 24 && Math.abs(p.y - scene.goal.y) < 32) {
        state.completeScene(scene.id);
      }
    }

    if (state.completedScenes.has(scene.id) && state.player.x > 760) {
      loadNextScene().then(transitionToScene);
    }
  }
}

function draw() {
  if (gameState === 'loading') return;

  if (gameState === 'title') {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 800, 600);

    ctx.font = 'bold 96px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText('Wor', 380, 200);
    ctx.fillStyle = '#44ff88';
    ctx.font = 'bold 120px monospace';
    ctx.fillText('I', 530, 190);
    ctx.font = 'bold 96px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText('d', 575, 200);

    ctx.font = '18px monospace';
    ctx.fillStyle = '#666';
    ctx.fillText('Press SPACE to begin', 400, 430);
    ctx.fillText('Click ↺ to restart at any time', 400, 460);

    if (state.hasSave) {
      ctx.fillStyle = '#4488ff';
      ctx.fillText('(Resuming saved game)', 400, 490);
    }

    ctx.textAlign = 'start';
    return;
  }

  renderer.draw(scene, state, editor);
  if (editor) editor.renderEditPreview(ctx);

  if (gameState === 'ending') {
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, 800, 600);
    ctx.fillStyle = '#fff';
    ctx.font = '24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('The world is restored.', 400, 250);
    ctx.fillText('But something stirs in the words...', 400, 300);
    ctx.font = '18px monospace';
    ctx.fillStyle = '#ff4444';
    ctx.fillText('"You were not meant to wake."', 400, 360);
    ctx.fillStyle = '#666';
    ctx.font = '16px monospace';
    ctx.fillText('Thanks for playing WorId', 400, 440);
    ctx.fillText('Click ↺ to restart', 400, 470);
  }
}

function transitionToScene(nextScene) {
  if (!nextScene) {
    gameState = 'ending';
    return;
  }
  state.completeScene(scene.id);
  scene = nextScene;
  state.player.x = nextScene.playerStart.x;
  state.player.y = nextScene.playerStart.y;
  engine = createEngine(scene, state);
  editor = createEditor(scene, state, dictionary);
}

init();
