const MOVE_SPEED = 220;
const LETTER_W = 24;
const LETTER_H = 32;

export function createEngine(scene, state) {
  function getSolidLetters() {
    return scene.letters.filter(l => !l.floating && !l.hazard);
  }

  return {
    update(dt, input, editorActive) {
      const p = state.player;

      p.vx = 0;
      p.vy = 0;
      if (!editorActive) {
        if (input.isDown('ArrowLeft')) p.vx = -MOVE_SPEED;
        if (input.isDown('ArrowRight')) p.vx = MOVE_SPEED;
        if (input.isDown('ArrowUp')) p.vy = -MOVE_SPEED;
        if (input.isDown('ArrowDown')) p.vy = MOVE_SPEED;
      }

      const solids = getSolidLetters();

      p.x += p.vx * dt;
      resolveCollisionX(p, solids);

      p.y += p.vy * dt;
      resolveCollisionY(p, solids);

      // Clamp to canvas
      if (p.x < 0) p.x = 0;
      if (p.y < 0) p.y = 0;
      if (p.x > 800 - LETTER_W) p.x = 800 - LETTER_W;
      if (p.y > 600 - LETTER_H) p.y = 600 - LETTER_H;

      // Hazard check
      for (const l of scene.letters) {
        if (l.hazard && collides(p, l)) {
          p.x = scene.playerStart.x;
          p.y = scene.playerStart.y;
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
      if (p.vy > 0) p.y = s.y - LETTER_H;
      else if (p.vy < 0) p.y = s.y + s.height;
      p.vy = 0;
    }
  }
}
