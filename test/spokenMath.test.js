import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spokenMath, spokenFraction } from '../src/core/spokenMath.js';

test('reads fractions as words', () => {
  assert.equal(spokenFraction(1, 2), '1 half');
  assert.equal(spokenFraction(3, 4), '3 fourths');
  assert.equal(spokenFraction(5, 24), '5 over 24');
});

test('reads question prompts aloud naturally', () => {
  assert.equal(spokenMath('1/4 + 2/3 = ?'), '1 fourth plus 2 thirds equals what?');
  assert.equal(spokenMath('So 1 5/12 = 17/12.'), 'So 1 and 5 twelfths equals 17 twelfths.');
  assert.equal(spokenMath('Round 3.42 to the nearest tenth.'), 'Round 3.42 to the nearest tenth.');
});
