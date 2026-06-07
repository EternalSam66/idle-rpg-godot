const LETTER_W = 24;
const LETTER_H = 32;

export async function loadScene(sceneId) {
  const resp = await fetch(`/scenes/${sceneId}.json`);
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
    words: sceneData.words.map(w => ({ ...w })),
    letters,
    playerStart: sceneData.playerStart,
    goal: sceneData.goal,
    width: 800,
    height: 600,
  };
}
