// C.1 Add fractions with unlike denominators (CCSS 5.NF.A.1).
//   Difficulty 1: one denominator is a multiple of the other (1/3 + 1/6), sum below 1.
//   Difficulty 2: unrelated denominators up to 6 (1/4 + 2/3).
//   Difficulty 3: unrelated denominators up to 12, sums can pass 1 (5/6 + 3/8).
import { randInt, randPick } from '../core/random.js';
import { makeFraction, simplifyFraction, addFractions, lcm, gcd, formatMixed, formatFraction } from '../core/fractions.js';
import { checkAnswer } from '../core/answers.js';
import { clampDifficulty } from '../core/skill.js';

function pickAddFractionDenominators(rng, difficulty) {
  if (difficulty === 1) {
    const small = randInt(rng, 2, 6);
    const big = small * randPick(rng, small <= 4 ? [2, 3] : [2]);
    return rng() < 0.5 ? [small, big] : [big, small];
  }
  const max = difficulty === 2 ? 6 : 12;
  for (;;) {
    const a = randInt(rng, 2, max);
    const b = randInt(rng, 2, max);
    if (a !== b && a % b !== 0 && b % a !== 0) return [a, b];
  }
}

// A proper fraction already in simplest form, like 3/8 (never 2/4).
function pickProperFraction(rng, den) {
  for (;;) {
    const num = randInt(rng, 1, den - 1);
    if (gcd(num, den) === 1) return makeFraction(num, den);
  }
}

export const addFractionsUnlike = {
  id: 'C.1',
  title: 'Add fractions with unlike denominators',
  grade: 5,
  category: 'Fractions',

  generate(rng, difficulty) {
    const level = clampDifficulty(difficulty);
    for (;;) {
      const [d1, d2] = pickAddFractionDenominators(rng, level);
      const a = pickProperFraction(rng, d1);
      const b = pickProperFraction(rng, d2);
      const sum = addFractions(a, b);
      if (level === 1 && sum.num >= sum.den) continue;
      const common = lcm(d1, d2);
      return {
        skillId: 'C.1',
        difficulty: level,
        prompt: `${formatFraction(a)} + ${formatFraction(b)} = ?`,
        answerType: 'fraction',
        answer: sum,
        answerText: formatMixed(sum),
        requireSimplest: true,
        hint: `Find a common denominator for ${d1} and ${d2}. Try ${common}.`,
        data: { a, b, common },
      };
    }
  },

  check(question, input) {
    const result = checkAnswer(question, input);
    return { ...result, explanation: explainAddFractions(question, result) };
  },
};

function explainAddFractions(question, result) {
  if (result.invalid) return result.error;
  const { a, b, common } = question.data;
  const a2 = makeFraction(a.num * (common / a.den), common);
  const b2 = makeFraction(b.num * (common / b.den), common);
  const raw = makeFraction(a2.num + b2.num, common);
  const rename = [[a, a2], [b, b2]]
    .filter(([from]) => from.den !== common)
    .map(([from, to]) => `${formatFraction(from)} = ${formatFraction(to)}`);
  const steps = [
    `Use the common denominator ${common}: ${rename.join(' and ')}.`,
    `Add the numerators: ${formatFraction(a2)} + ${formatFraction(b2)} = ${formatFraction(raw)}.`,
  ];
  const simplified = simplifyFraction(raw);
  if (simplified.den !== raw.den) steps.push(`Simplify: ${formatFraction(raw)} = ${formatFraction(simplified)}.`);
  if (simplified.num > simplified.den) steps.push(`As a mixed number, that is ${question.answerText}.`);
  if (result.unsimplified) {
    return `Your answer is equal to ${question.answerText}, but write it in simplest form. ` + steps.join(' ');
  }
  return steps.join(' ');
}
