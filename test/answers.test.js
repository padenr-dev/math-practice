import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAnswer, checkAnswer } from '../src/core/answers.js';
import { makeFraction, simplifyFraction, formatMixed, formatDecimal } from '../src/core/fractions.js';
import { createRng, randInt } from '../src/core/random.js';

const value = (input, type) => {
  const r = parseAnswer(input, type);
  assert.ok(r.ok, `${JSON.stringify(input)} should parse as ${type}`);
  return r.value;
};

test('same seed gives the same numbers', () => {
  const a = createRng(42);
  const b = createRng(42);
  const seqA = Array.from({ length: 20 }, () => randInt(a, 1, 100));
  assert.deepEqual(seqA, Array.from({ length: 20 }, () => randInt(b, 1, 100)));
  assert.ok(seqA.every((n) => n >= 1 && n <= 100));
});

test('integers: plain, negative and with thousands commas', () => {
  assert.deepEqual(value('42', 'integer'), { num: 42, den: 1 });
  assert.deepEqual(value(' -7 ', 'integer'), { num: -7, den: 1 });
  assert.deepEqual(value('1,234', 'integer'), { num: 1234, den: 1 });
  for (const bad of ['', '4.5', '1,23', 'abc', '3/4']) assert.equal(parseAnswer(bad, 'integer').ok, false, bad);
});

test('decimals are exact: 0.1 + 0.2 trouble cannot happen', () => {
  assert.deepEqual(simplifyFraction(value('3.70', 'decimal')), { num: 37, den: 10 });
  assert.deepEqual(simplifyFraction(value('.5', 'decimal')), { num: 1, den: 2 });
  assert.deepEqual(simplifyFraction(value('5.', 'decimal')), { num: 5, den: 1 });
  assert.deepEqual(simplifyFraction(value('-0.25', 'decimal')), { num: -1, den: 4 });
  for (const bad of ['', '.', '-', '1.2.3', '1/2', 'five']) assert.equal(parseAnswer(bad, 'decimal').ok, false, bad);
});

test('fractions: simple, mixed, improper, whole, and from separate boxes', () => {
  assert.deepEqual(value('3/4', 'fraction'), { num: 3, den: 4 });
  assert.deepEqual(value('1 1/2', 'fraction'), { num: 3, den: 2 });
  assert.deepEqual(value('3 / 2', 'fraction'), { num: 3, den: 2 });
  assert.deepEqual(value('3⁄2', 'fraction'), { num: 3, den: 2 });
  assert.deepEqual(value('2', 'fraction'), { num: 2, den: 1 });
  assert.deepEqual(value({ whole: '1', num: '1', den: '2' }, 'fraction'), { num: 3, den: 2 });
  assert.deepEqual(value({ whole: '', num: '5', den: '6' }, 'fraction'), { num: 5, den: 6 });
  assert.deepEqual(value({ whole: '3', num: '', den: '' }, 'fraction'), { num: 3, den: 1 });
  for (const bad of ['', '3/0', '0.75', '1/2/3', '1 1', '/4', { num: '1', den: '' }]) {
    assert.equal(parseAnswer(bad, 'fraction').ok, false, JSON.stringify(bad));
  }
});

test('simplest form is tracked for fractions', () => {
  const simplest = (s) => parseAnswer(s, 'fraction').simplest;
  assert.equal(simplest('3/4'), true);
  assert.equal(simplest('7/4'), true); // improper but reduced counts
  assert.equal(simplest('1 3/4'), true);
  assert.equal(simplest('2'), true);
  assert.equal(simplest('2/4'), false);
  assert.equal(simplest('4/1'), false);
  assert.equal(simplest('1 2/4'), false);
  assert.equal(simplest('1 5/4'), false);
});

test('checkAnswer separates wrong, unreadable and unsimplified answers', () => {
  const q = { answerType: 'fraction', answer: makeFraction(3, 4), requireSimplest: true };
  assert.deepEqual(checkAnswer(q, '3/4'), { correct: true });
  assert.deepEqual(checkAnswer(q, '6/8'), { correct: false, unsimplified: true });
  assert.deepEqual(checkAnswer(q, '2/3'), { correct: false });
  assert.equal(checkAnswer(q, '').invalid, true);
  assert.deepEqual(checkAnswer({ ...q, requireSimplest: false }, '6/8'), { correct: true });
});

test('formatting helpers', () => {
  assert.equal(formatMixed(makeFraction(7, 4)), '1 3/4');
  assert.equal(formatMixed(makeFraction(3, 4)), '3/4');
  assert.equal(formatMixed(makeFraction(2, 1)), '2');
  assert.equal(formatDecimal(367, 2), '3.67');
  assert.equal(formatDecimal(40, 1), '4.0');
  assert.equal(formatDecimal(5, 2), '0.05');
  assert.equal(formatDecimal(7, 0), '7');
});
