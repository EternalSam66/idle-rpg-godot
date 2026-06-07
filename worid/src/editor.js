const LETTER_W = 24;
const LETTER_H = 32;

export function createEditor(scene, state, dictionary) {
  let active = false;
  let wordIndex = -1;
  let cursorPos = 0;
  let editedText = '';
  let originalText = '';
  let rejectTimeout = null;
  let rejectActive = false;

  return {
    get isActive() { return active; },
    get wordIndex() { return wordIndex; },
    get editedText() { return editedText; },
    get cursorPos() { return cursorPos; },
    isRejectActive() { return rejectActive; },

    update(input) {
      if (input.justPressed('KeyE')) {
        if (!active) {
          const near = findNearestEditable(scene, state.player);
          if (near !== -1) {
            active = true;
            wordIndex = near;
            const word = scene.words[wordIndex];
            editedText = state.getEditedWord(scene.id, wordIndex) || word.text;
            originalText = word.text;
            cursorPos = editedText.length;
            return;
          }
        } else {
          exitEditMode();
        }
      }

      if (!active) return;

      if (input.justPressed('ArrowLeft')) cursorPos = Math.max(0, cursorPos - 1);
      if (input.justPressed('ArrowRight')) cursorPos = Math.min(editedText.length, cursorPos + 1);

      if (input.justPressed('Backspace') && cursorPos > 0) {
        const deleted = editedText[cursorPos - 1];
        editedText = editedText.slice(0, cursorPos - 1) + editedText.slice(cursorPos);
        cursorPos--;
        if (validateAndApply()) {
          state.addToInventory(deleted);
        }
      }

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

      // Red tint if invalid
      if (rejectActive) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.15)';
        ctx.fillRect(word.x - 4, word.y - 4, Math.max(chars.length, 2) * LETTER_W + 8, LETTER_H + 8);
      }

      ctx.font = '24px monospace';
      ctx.textBaseline = 'top';

      chars.forEach((ch, i) => {
        const lx = word.x + i * LETTER_W;
        const ly = word.y;
        if (i === cursorPos) {
          ctx.fillStyle = '#ffcc00';
          ctx.fillRect(lx - 1, ly - 2, 2, LETTER_H + 4);
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillText(ch, lx, ly);
      });

      // Cursor at end
      if (cursorPos === chars.length) {
        const lx = word.x + chars.length * LETTER_W;
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(lx - 1, word.y - 2, 2, LETTER_H + 4);
      }
    }
  };

  function exitEditMode() {
    active = false;
    wordIndex = -1;
    cursorPos = 0;
    rejectActive = false;
    if (rejectTimeout) clearTimeout(rejectTimeout);
  }

  function findNearestEditable(scene, player) {
    for (let i = 0; i < scene.words.length; i++) {
      const w = scene.words[i];
      if (w.fixed || w.floating) continue;
      const px = player.x + 12;
      const py = player.y + 16;
      const ww = w.text.length * LETTER_W;
      if (px > w.x - 20 && px < w.x + ww + 20 &&
          py > w.y - 20 && py < w.y + LETTER_H + 20) {
        return i;
      }
    }
    return -1;
  }

  function findTouchedFloating(scene, player) {
    for (let i = 0; i < scene.letters.length; i++) {
      const l = scene.letters[i];
      if (l.floating && playerCollides(player, l)) return i;
    }
    return -1;
  }

  function playerCollides(player, letter) {
    return player.x + LETTER_W > letter.x &&
           player.x < letter.x + letter.width &&
           player.y + LETTER_H > letter.y &&
           player.y < letter.y + letter.height;
  }

  function validateAndApply() {
    if (rejectTimeout) clearTimeout(rejectTimeout);
    rejectActive = false;

    if (editedText.length < 2) {
      rejectActive = true;
      rejectTimeout = setTimeout(() => {
        editedText = originalText;
        cursorPos = editedText.length;
        rejectActive = false;
        rejectTimeout = null;
      }, 800);
      return false;
    }

    if (dictionary.isValid(editedText)) {
      const word = scene.words[wordIndex];
      word.text = editedText;
      state.recordEdit(scene.id, wordIndex, editedText);
      scene.letters = [];
      scene.words.forEach((w, wi) => {
        w.text.split('').forEach((ch, ci) => {
          scene.letters.push({
            char: ch,
            wordIndex: wi,
            x: w.x + ci * LETTER_W,
            y: w.y,
            width: LETTER_W,
            height: LETTER_H,
            fixed: w.fixed || false,
            hazard: w.hazard || false,
            floating: w.floating || false,
            editable: !w.fixed && !w.floating,
          });
        });
      });
      return true;
    } else {
      rejectActive = true;
      rejectTimeout = setTimeout(() => {
        editedText = originalText;
        cursorPos = editedText.length;
        rejectActive = false;
        rejectTimeout = null;
      }, 800);
      return false;
    }
  }
}
