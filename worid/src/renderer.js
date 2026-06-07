const LETTER_W = 24;
const LETTER_H = 32;

const PALETTES = {
  ruined_keep: { bg: '#0a0a0f', word: '#d4d4d4', fixed: '#666666', hazard: '#ff3333', floating: '#4488ff', player: '#44ff88' },
  overgrown_wood: { bg: '#0a1008', word: '#aacc88', fixed: '#556644', hazard: '#cc3333', floating: '#66ccff', player: '#44ff88' },
  sunken_hall: { bg: '#080a12', word: '#8899cc', fixed: '#445566', hazard: '#ff4444', floating: '#44aaff', player: '#44ff88' },
  sky_ramparts: { bg: '#0c080f', word: '#ccbbdd', fixed: '#665577', hazard: '#ff3333', floating: '#aa88ff', player: '#44ff88' },
  default: { bg: '#0a0a0f', word: '#d4d4d4', fixed: '#666666', hazard: '#ff3333', floating: '#4488ff', player: '#44ff88' },
};

export function createRenderer(ctx) {
  let palette = PALETTES.default;

  return {
    draw(scene, state, editor) {
      const W = ctx.canvas.width;
      const H = ctx.canvas.height;

      palette = PALETTES[scene.atmosphere] || PALETTES.default;

      ctx.fillStyle = palette.bg;
      ctx.fillRect(0, 0, W, H);

      ctx.font = '24px monospace';
      ctx.textBaseline = 'top';

      scene.words.forEach((word, wi) => {
        const chars = word.text.split('');
        chars.forEach((ch, ci) => {
          const lx = word.x + ci * LETTER_W;
          const ly = word.y;

          let color = palette.word;
          if (word.fixed) color = palette.fixed;
          if (word.hazard) color = palette.hazard;
          if (word.floating) color = palette.floating;

          // Glow for editable word near player
          if (!word.fixed && !word.floating && !editor.isActive) {
            const px = state.player.x + 12;
            const py = state.player.y + 16;
            const ww = word.text.length * LETTER_W;
            if (px > word.x - 30 && px < word.x + ww + 30 &&
                py > word.y - 30 && py < word.y + LETTER_H + 30) {
              ctx.fillStyle = 'rgba(255, 204, 0, 0.08)';
              ctx.fillRect(word.x - 4, word.y - 4, ww + 8, LETTER_H + 8);
            }
          }

          ctx.fillStyle = color;
          ctx.fillText(ch, lx, ly);
        });
      });

      // Inventory bar (always visible)
      ctx.fillStyle = '#222233';
      ctx.fillRect(0, 0, W, 28);
      ctx.font = '18px monospace';
      for (let i = 0; i < 4; i++) {
        const ch = state.inventory[i];
        ctx.fillStyle = ch ? '#aaccff' : '#333344';
        ctx.fillText(ch ? `[${ch}]` : `[ ]`, 10 + i * 40, 6);
      }

      // Restart button
      ctx.fillStyle = '#443333';
      ctx.fillRect(740, 4, 56, 22);
      ctx.fillStyle = '#ff6666';
      ctx.font = '14px monospace';
      ctx.textBaseline = 'middle';
      ctx.fillText('↺', 754, 14);

      // Edit mode hints
      if (editor.isActive) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, H - 28, W, 28);
        ctx.font = '14px monospace';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffcc00';
        ctx.fillText('EDIT: ← → move cursor  |  1-4 place letter from inventory  |  BACKSPACE delete  |  E exit', 10, H - 14);
      } else {
        // Hint near editable words
        const near = scene.words.some(w =>
          !w.fixed && !w.floating &&
          state.player.x + 12 > w.x - 40 &&
          state.player.x + 12 < w.x + w.text.length * LETTER_W + 40 &&
          state.player.y + 16 > w.y - 40 &&
          state.player.y + 16 < w.y + LETTER_H + 40
        );
        if (near) {
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillRect(0, H - 28, W, 28);
          ctx.font = '14px monospace';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#aaccff';
          ctx.fillText('Press E to edit word | BACKSPACE delete (to inventory) | 1-4 place letter', 10, H - 14);
        }
      }

      // Player
      const p = state.player;
      ctx.font = 'bold 28px monospace';
      ctx.textBaseline = 'top';
      ctx.fillStyle = palette.player;
      ctx.fillText('I', p.x, p.y);

      // Goal indicator
      {
        ctx.fillStyle = state.completedScenes.has(scene.id) ? '#ffcc00' : 'rgba(255,204,0,0.15)';
        ctx.font = '20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('→', scene.goal.x, scene.goal.y);
        ctx.textAlign = 'start';
      }
    }
  };
}
