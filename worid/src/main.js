import { createDictionary } from './dictionary.js';
import { loadScene, parseScene } from './scene.js';
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

let gameState = 'loading'; // loading | title | falling | playing | ending
let fallTimer = 0;
let scene = null;
let engine = null;
let editor = null;

const sceneList = [
  'area1_01', 'area1_02', 'area1_03', 'area1_04', 'area1_05',
];
let sceneIndex = 0;

async function loadSceneById(id) {
  const s = await loadScene(id);
  return s;
}

async function loadNextScene() {
  sceneIndex++;
  if (sceneIndex >= sceneList.length) return null;
  return await loadSceneById(sceneList[sceneIndex]);
}

async function init() {
  ctx.fillStyle = '#fff';
  ctx.font = '20px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Loading...', 400, 300);
  ctx.textAlign = 'start';

  await dictionary.load();
  scene = await loadSceneById(sceneList[0]);
  engine = createEngine(scene, state);
  editor = createEditor(scene, state, dictionary);
  state.currentScene = scene;
  state.player.x = scene.playerStart.x;
  state.player.y = scene.playerStart.y;

  gameState = 'title';

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

function update(dt) {
  if (gameState === 'title') {
    if (input.justPressed('Space')) {
      gameState = 'falling';
      fallTimer = 0;
      state.player.x = 400;
      state.player.y = 0;
      state.player.vy = 200;
    }
  } else if (gameState === 'falling') {
    fallTimer += dt;
    state.player.y += 200 * dt;
    if (state.player.y > scene.playerStart.y) {
      state.player.x = scene.playerStart.x;
      state.player.y = scene.playerStart.y;
      state.player.vy = 0;
      gameState = 'playing';
    }
  } else if (gameState === 'playing') {
    engine.update(dt, input);
    editor.update(input);

    // Check goal
    if (!state.completedScenes.has(scene.id)) {
      const p = state.player;
      if (Math.abs(p.x - scene.goal.x) < 24 && Math.abs(p.y - scene.goal.y) < 32) {
        state.completeScene(scene.id);
      }
    }

    // Scene transition — reach right edge
    if (state.completedScenes.has(scene.id) && state.player.x > 780) {
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
    ctx.fillText('Press SPACE to begin', 400, 450);
    ctx.textAlign = 'start';
    return;
  }

  renderer.draw(scene, state, editor);
  if (editor) editor.renderEditPreview(ctx);

  if (gameState === 'falling') {
    // Player falling is drawn by renderer
  }

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
  }
}

// Expose for scene transitions from engine
export function transitionToScene(nextScene) {
  if (!nextScene) {
    gameState = 'ending';
    return;
  }
  state.completeScene(scene.id);
  scene = nextScene;
  state.currentScene = nextScene;
  state.player.x = nextScene.playerStart.x;
  state.player.y = nextScene.playerStart.y;
  state.player.vy = 0;
  engine = createEngine(scene, state);
  editor = createEditor(scene, state, dictionary);
}

init();
