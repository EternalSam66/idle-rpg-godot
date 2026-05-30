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
          if (!word.fixed && !word.floating) {
            const px = state.player.x + 12;
            const py = state.player.y + 16;
            const ww = word.text.length * LETTER_W;
            if (px > word.x - 30 && px < word.x + ww + 30 &&
                py > word.y - 30 && py < word.y + LETTER_H + 30 &&
                !editor.isActive) {
              ctx.fillStyle = 'rgba(255, 204, 0, 0.06)';
              ctx.fillRect(word.x - 4, word.y - 4, ww + 8, LETTER_H + 8);
            }
          }

          ctx.fillStyle = color;
          ctx.fillText(ch, lx, ly);
        });
      });

      // Inventory bar
      if (state.inventory.length > 0) {
        ctx.fillStyle = '#222233';
        ctx.fillRect(0, 0, W, 28);
        ctx.font = '18px monospace';
        state.inventory.forEach((ch, i) => {
          ctx.fillStyle = '#aaccff';
          ctx.fillText(`[${ch}]`, 10 + i * 40, 6);
        });
      }

      // Player
      const p = state.player;
      ctx.font = 'bold 28px monospace';
      ctx.textBaseline = 'top';
      ctx.fillStyle = palette.player;
      ctx.fillText('I', p.x, p.y);

      // Goal indicator
      if (state.completedScenes.has(scene.id)) {
        ctx.fillStyle = '#ffcc00';
        ctx.font = '20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('→', scene.goal.x, scene.goal.y);
        ctx.textAlign = 'start';
      }
    }
  };
}
