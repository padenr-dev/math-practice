import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addFractionsUnlike as skill } from '../src/skills/addFractionsUnlike.js';
import { createRng } from '../src/core/random.js';
import { makeFraction, addFractions } from '../src/core/fractions.js';

const questions = (level, n = 300) => Array.from({ length: n }, (_, i) => skill.generate(createRng(i + 1), level));

test('difficulty 1: related denominators, sum below 1', () => {
  for (const q of questions(1)) {
    const { a, b } = q.data;
    assert.notEqual(a.den, b.den);
    assert.ok(a.den % b.den === 0 || b.den % a.den === 0, q.prompt);
    assert.ok(q.answer.num < q.answer.den, q.prompt);
  }
});

test('difficulty 2 and 3: unrelated denominators within range; 3 sometimes passes 1', () => {
  for (const [level, max] of [[2, 6], [3, 12]]) {
    for (const q of questions(level)) {
      const { a, b } = q.data;
      assert.ok(a.den % b.den !== 0 && b.den % a.den !== 0, q.prompt);
      assert.ok(a.den <= max && b.den <= max, q.prompt);
      assert.ok(q.data.common <= 36, q.prompt);
    }
  }
  assert.ok(questions(3).some((q) => q.answer.num > q.answer.den));
});

test('answer is the true sum, already simplified', () => {
  for (const q of questions(3)) {
    assert.deepEqual(q.answer, addFractions(q.data.a, q.data.b));
  }
});

// 5/6 + 3/4 = 19/12 = 1 7/12
const q = {
  skillId: 'C.1', difficulty: 3, prompt: '5/6 + 3/4 = ?', answerType: 'fraction',
  answer: makeFraction(19, 12), answerText: '1 7/12', requireSimplest: true,
  hint: '', data: { a: makeFraction(5, 6), b: makeFraction(3, 4), common: 12 },
};

test('accepts every correct form', () => {
  for (const input of ['1 7/12', '19/12', ' 19 / 12 ', { whole: '1', num: '7', den: '12' }, { whole: '', num: '19', den: '12' }]) {
    assert.equal(skill.check(q, input).correct, true, JSON.stringify(input));
  }
});

test('rejects wrong answers, including the classic add-the-bottoms mistake', () => {
  for (const input of ['8/10', '4/5', '8/24', '1 5/12', '7/12', '2']) {
    assert.equal(skill.check(q, input).correct, false, input);
  }
});

test('flags an equivalent but unsimplified answer', () => {
  const r = skill.check(q, '38/24');
  assert.equal(r.correct, false);
  assert.equal(r.unsimplified, true);
  assert.match(r.explanation, /simplest form/);
});

test('explanation walks through the common denominator', () => {
  const r = skill.check(q, '8/10');
  assert.match(r.explanation, /common denominator 12/);
  assert.match(r.explanation, /5\/6 = 10\/12 and 3\/4 = 9\/12/);
  assert.match(r.explanation, /= 19\/12/);
  assert.match(r.explanation, /mixed number, that is 1 7\/12/);
});

test('blank input is invalid, not wrong', () => {
  const r = skill.check(q, '');
  assert.equal(r.invalid, true);
  assert.equal(r.explanation, 'Type an answer first.');
});

test('explanation skips a fraction already over the common denominator and shows simplifying', () => {
  // 1/2 + 1/6 = 4/6 = 2/3
  const easy = {
    ...q, prompt: '1/2 + 1/6 = ?', answer: makeFraction(2, 3), answerText: '2/3',
    data: { a: makeFraction(1, 2), b: makeFraction(1, 6), common: 6 },
  };
  assert.equal(
    skill.check(easy, '2/8').explanation,
    'Use the common denominator 6: 1/2 = 3/6. Add the numerators: 3/6 + 1/6 = 4/6. Simplify: 4/6 = 2/3.',
  );
});
