export function createInput() {
  const keys = {};
  const justPressed = {};

  window.addEventListener('keydown', (e) => {
    if (!keys[e.code]) justPressed[e.code] = true;
    keys[e.code] = true;
    if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
      e.preventDefault();
    }
  });

  return {
    isDown(code) { return !!keys[code]; },

    justPressed(code) { return !!justPressed[code]; },

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
      justPressed.KeyR = false;
    },

    getJustPressed() {
      return Object.keys(justPressed).filter(k => justPressed[k]);
    }
  };
}
