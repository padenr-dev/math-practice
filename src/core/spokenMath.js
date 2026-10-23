// Turns question and feedback text into words for read-aloud (browser
// speechSynthesis), so "1/4 + 2/3 = ?" is read as "1 fourth plus 2 thirds
// equals what?" instead of "1 slash 4". Decimals are left to the voice.

const SPOKEN_DENOMINATORS = {
  2: ['half', 'halves'],
  3: ['third', 'thirds'],
  4: ['fourth', 'fourths'],
  5: ['fifth', 'fifths'],
  6: ['sixth', 'sixths'],
  7: ['seventh', 'sevenths'],
  8: ['eighth', 'eighths'],
  9: ['ninth', 'ninths'],
  10: ['tenth', 'tenths'],
  11: ['eleventh', 'elevenths'],
  12: ['twelfth', 'twelfths'],
};

export function spokenFraction(num, den) {
  const words = SPOKEN_DENOMINATORS[den];
  if (!words) return `${num} over ${den}`;
  return `${num} ${num === 1 ? words[0] : words[1]}`;
}

export function spokenMath(text) {
  return String(text ?? '')
    .replace(/(\d+) (\d+)\/(\d+)/g, (_, w, n, d) => `${w} and ${spokenFraction(Number(n), Number(d))}`)
    .replace(/(\d+)\/(\d+)/g, (_, n, d) => spokenFraction(Number(n), Number(d)))
    .replace(/=\s*\?/g, 'equals what?')
    .replace(/\s\+\s/g, ' plus ')
    .replace(/\s[-−]\s/g, ' minus ')
    .replace(/\s[×x]\s/g, ' times ')
    .replace(/\s÷\s/g, ' divided by ')
    .replace(/\s=\s/g, ' equals ');
}
