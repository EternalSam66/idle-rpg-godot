export function createDictionary() {
  let wordSet = null;

  return {
    async load() {
      const url = new URL('./data/words.json', import.meta.url);
      const resp = await fetch(url);
      const words = await resp.json();
      wordSet = new Set(words.map(w => w.toUpperCase()));
    },

    isValid(word) {
      if (!wordSet) return false;
      return wordSet.has(word.toUpperCase());
    },

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
