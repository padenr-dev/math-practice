import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roundDecimals as skill } from '../src/skills/roundDecimals.js';
import { createRng } from '../src/core/random.js';
import { makeFraction } from '../src/core/fractions.js';

const questions = (level, n = 300) => Array.from({ length: n }, (_, i) => skill.generate(createRng(i + 1), level));
const decimalsIn = (q) => (q.data.shown.split('.')[1] || '').length;

test('difficulty sets the place value', () => {
  for (const q of questions(1)) {
    assert.match(q.prompt, /nearest whole number/);
    assert.equal(decimalsIn(q), 1);
    assert.doesNotMatch(q.answerText, /\./);
  }
  for (const q of questions(2)) {
    assert.match(q.prompt, /nearest tenth/);
    assert.equal(decimalsIn(q), 2);
  }
  for (const q of questions(3)) {
    assert.match(q.prompt, /nearest (tenth|hundredth)/);
    assert.equal(decimalsIn(q), 3);
  }
});

test('the number to round never ends in 0', () => {
  for (const level of [1, 2, 3]) for (const q of questions(level)) assert.doesNotMatch(q.data.shown, /0$/, q.prompt);
});

test('answers match rounding by hand (half rounds up)', () => {
  for (const level of [1, 2, 3]) {
    for (const q of questions(level)) {
      const places = q.data.target;
      const [whole, frac = ''] = q.data.shown.split('.');
      const digits = BigInt(whole + frac.slice(0, places));
      const up = Number(frac[places]) >= 5 ? 1n : 0n;
      const expected = (digits + up).toString().padStart(places + 1, '0');
      const expectedText = places ? `${expected.slice(0, -places)}.${expected.slice(-places)}` : expected;
      assert.equal(q.answerText, expectedText, q.prompt);
    }
  }
});

test('difficulty 3 includes carries through 9s', () => {
  assert.ok(questions(3).some((q) => /\.9[5-9]\d?$|\.\d9[5-9]$/.test(q.data.shown) && q.answerText.endsWith('0')));
});

// Round 2.996 to the nearest hundredth -> 3.00
const q = {
  skillId: 'A.3', difficulty: 3, prompt: 'Round 2.996 to the nearest hundredth.', answerType: 'decimal',
  answer: makeFraction(3, 1), answerText: '3.00', hint: '',
  data: { shown: '2.996', target: 2, nextDigit: 6 },
};

test('accepts every correct form', () => {
  for (const input of ['3.00', '3.0', '3', '3.', ' 3.00 ']) assert.equal(skill.check(q, input).correct, true, input);
});

test('rejects wrong answers', () => {
  for (const input of ['2.99', '2.9', '3.01', '2.996', '30']) assert.equal(skill.check(q, input).correct, false, input);
});

test('explanation names the deciding digit', () => {
  assert.equal(
    skill.check(q, '2.99').explanation,
    'The thousandths digit in 2.996 is 6, which is 5 or more, so round up: 2.996 rounds to 3.00.',
  );
  const down = { ...q, prompt: 'Round 4.23 to the nearest tenth.', answer: makeFraction(21, 5), answerText: '4.2', data: { shown: '4.23', target: 1, nextDigit: 3 } };
  assert.match(skill.check(down, '4.3').explanation, /hundredths digit in 4.23 is 3, which is less than 5, so round down/);
});
