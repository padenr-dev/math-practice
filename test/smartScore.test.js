import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  scoreAfterAnswer,
  replaySmartScore,
  isInChallengeZone,
  isMastered,
  difficultyForScore,
  clampSmartScore,
} from '../src/core/smartScore.js';

const right = { correct: true };
const wrong = { correct: false };
const run = (pattern, start = 0) =>
  replaySmartScore([...pattern].map((c) => ({ R: right, W: wrong, U: { correct: false, unsimplified: true }, I: { invalid: true, correct: false } })[c]), start);

test('perfect run: big early gains, smaller near mastery, 100 = mastered', () => {
  const { score, history } = run('R'.repeat(19));
  assert.deepEqual(history, [10, 20, 30, 38, 46, 54, 60, 66, 72, 76, 80, 83, 86, 89, 92, 94, 96, 98, 100]);
  assert.equal(score, 100);
  assert.ok(isMastered(score));
  assert.ok(!isMastered(98));
  const gains = history.map((s, i) => s - (i ? history[i - 1] : 0));
  for (let i = 1; i < gains.length; i++) assert.ok(gains[i] <= gains[i - 1], `gain ${i} grew`);
});

test('score never goes past 100 or below 0', () => {
  assert.equal(run('R'.repeat(40)).score, 100);
  assert.equal(run('WWWW').score, 0);
  assert.equal(scoreAfterAnswer(99, right), 100);
  assert.equal(scoreAfterAnswer(1, wrong), 0);
});

test('wrong answers cost points, more in the Challenge Zone', () => {
  assert.equal(scoreAfterAnswer(20, wrong), 18);
  assert.equal(scoreAfterAnswer(60, wrong), 56);
  assert.equal(scoreAfterAnswer(85, wrong), 79);
  assert.equal(scoreAfterAnswer(92, wrong), 84);
  const loss = (s) => s - scoreAfterAnswer(s, wrong);
  assert.ok(loss(92) > loss(85) && loss(85) > loss(60) && loss(60) > loss(20));
  // One slip in the Challenge Zone costs more than one right answer earns back.
  assert.ok(loss(92) > scoreAfterAnswer(92, right) - 92);
});

test('scripted sequences', () => {
  assert.equal(run('RRRW').score, 27);          // 10,20,30 -> 27
  assert.equal(run('RRRRRRRRRRRRRRRW').score, 84); // 92, then -8
  assert.equal(run('RWRWRWRW').score, 31);      // 10,8,18,16,26,24,34,31
});

test('unsimplified counts as wrong; invalid is not scored', () => {
  assert.equal(scoreAfterAnswer(50, { correct: false, unsimplified: true }), 46);
  assert.equal(scoreAfterAnswer(50, { correct: true, unsimplified: true }), 46);
  assert.equal(scoreAfterAnswer(50, { invalid: true }), 50);
  assert.deepEqual(run('RIR').history, [10, 10, 20]);
  assert.equal(scoreAfterAnswer(50, null), 50);
});

test('replay continues from a starting score', () => {
  assert.equal(run('RR', 88).score, 93); // 88+3=91, then +2 in the Challenge Zone
});

test('Challenge Zone is 90–99', () => {
  assert.ok(!isInChallengeZone(89));
  assert.ok(isInChallengeZone(90));
  assert.ok(isInChallengeZone(99));
  assert.ok(!isInChallengeZone(100));
});

test('difficulty steps up with score', () => {
  assert.deepEqual([0, 39, 40, 74, 75, 100].map(difficultyForScore), [1, 1, 2, 2, 3, 3]);
});

test('clampSmartScore handles junk', () => {
  assert.deepEqual([NaN, undefined, 'x', -5, 150, 42.6].map(clampSmartScore), [0, 0, 0, 0, 100, 43]);
});
