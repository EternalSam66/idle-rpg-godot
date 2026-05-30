const GRAVITY = 1200;
const JUMP_VEL = -480;
const MOVE_SPEED = 220;
const LETTER_W = 24;
const LETTER_H = 32;

export function createEngine(scene, state) {
  function getSolidLetters() {
    return scene.letters.filter(l => !l.floating && !l.hazard);
  }

  return {
    update(dt, input) {
      const p = state.player;

      p.vx = 0;
      if (input.isDown('ArrowLeft')) p.vx = -MOVE_SPEED;
      if (input.isDown('ArrowRight')) p.vx = MOVE_SPEED;

      if (input.justPressed('Space') && p.onGround) {
        p.vy = JUMP_VEL;
        p.onGround = false;
      }

      p.vy += GRAVITY * dt;

      p.x += p.vx * dt;
      resolveCollisionX(p, getSolidLetters());

      p.y += p.vy * dt;
      p.onGround = false;
      resolveCollisionY(p, getSolidLetters());

      if (p.y > 700) {
        const start = scene.playerStart;
        p.x = start.x;
        p.y = start.y;
        p.vy = 0;
      }

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
