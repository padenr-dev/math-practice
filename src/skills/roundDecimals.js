// A.3 Round decimals (CCSS 5.NBT.A.4).
//   Difficulty 1: round tenths to the nearest whole number (6.7 -> 7).
//   Difficulty 2: round hundredths to the nearest tenth (3.42 -> 3.4).
//   Difficulty 3: round thousandths to the nearest tenth or hundredth, often
//                 with a carry through 9s (2.996 -> 3.00).
import { randInt, randPick } from '../core/random.js';
import { makeFraction, simplifyFraction, formatDecimal } from '../core/fractions.js';
import { checkAnswer } from '../core/answers.js';
import { clampDifficulty } from '../core/skill.js';

const ROUND_PLACE_NAMES = ['whole number', 'tenth', 'hundredth'];
const ROUND_DIGIT_NAMES = ['ones', 'tenths', 'hundredths', 'thousandths'];

// The number to round, as an integer `scaled` with `places` decimal places
// (3.42 is { scaled: 342, places: 2 }). The last digit is never 0.
function pickNumberToRound(rng, level, target) {
  const places = level === 3 ? 3 : level;
  const unit = 10 ** places;
  const whole = randInt(rng, level === 1 ? 1 : 0, level === 1 ? 99 : 49);
  let fraction = randInt(rng, 1, unit - 1);
  if (level === 3 && rng() < 0.5) {
    // Force a carry: the last kept digit is 9 and the next digit is 5 or more.
    const digits = [];
    for (let i = 0; i < target; i++) digits.push(i === target - 1 ? 9 : randInt(rng, 0, 9));
    digits.push(randInt(rng, 5, 9));
    while (digits.length < places) digits.push(randInt(rng, 1, 9));
    fraction = parseInt(digits.join(''), 10);
  }
  if (fraction % 10 === 0) fraction += 1;
  return { scaled: whole * unit + fraction, places };
}

export const roundDecimals = {
  id: 'A.3',
  title: 'Round decimals',
  grade: 5,
  category: 'Decimals',

  generate(rng, difficulty) {
    const level = clampDifficulty(difficulty);
    const target = level === 1 ? 0 : level === 2 ? 1 : randPick(rng, [1, 2]);
    const { scaled, places } = pickNumberToRound(rng, level, target);
    const factor = 10 ** (places - target);
    const remainder = scaled % factor;
    const rounded = Math.floor(scaled / factor) + (remainder * 2 >= factor ? 1 : 0);
    const shown = formatDecimal(scaled, places);
    return {
      skillId: 'A.3',
      difficulty: level,
      prompt: `Round ${shown} to the nearest ${ROUND_PLACE_NAMES[target]}.`,
      answerType: 'decimal',
      answer: simplifyFraction(makeFraction(rounded, 10 ** target)),
      answerText: formatDecimal(rounded, target),
      hint: `Look at the ${ROUND_DIGIT_NAMES[target + 1]} digit. If it is 5 or more, round up.`,
      data: { shown, target, nextDigit: Math.floor(remainder / (factor / 10)) },
    };
  },

  check(question, input) {
    const result = checkAnswer(question, input);
    return { ...result, explanation: explainRounding(question, result) };
  },
};

function explainRounding(question, result) {
  if (result.invalid) return result.error;
  const { shown, target, nextDigit } = question.data;
  const direction = nextDigit >= 5 ? '5 or more, so round up' : 'less than 5, so round down';
  return `The ${ROUND_DIGIT_NAMES[target + 1]} digit in ${shown} is ${nextDigit}, which is ${direction}: ${shown} rounds to ${question.answerText}.`;
}
