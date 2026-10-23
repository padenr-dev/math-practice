import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findSkill } from '../src/skills/registry.js';
import { replaySmartScore } from '../src/core/smartScore.js';
import { SIMPLIFY_FRACTION_HINT, normalizeTeacherSettings } from '../src/core/teacherSettings.js';
import {
  startPracticeSession,
  recordPracticeAnswer,
  practiceSessionScore,
  practiceSessionStats,
  nextPracticeQuestion,
  practiceAnswerSeconds,
  checkPracticeAnswer,
} from '../src/core/practiceSession.js';

const skill = findSkill('C.1');
const T0 = Date.UTC(2026, 9, 23, 9, 0, 0);

// Plays a session against real C.1 questions. `plan` is a string: R right,
// W wrong, I invalid ("banana"). Each question takes `secs` seconds.
function play(plan, { startScore = 0, secs = 20 } = {}) {
  let session = startPracticeSession('C.1', startScore, T0);
  let t = T0;
  const difficulties = [];
  [...plan].forEach((step, i) => {
    const q = nextPracticeQuestion(skill, session, i + 1);
    difficulties.push(q.difficulty);
    const input = step === 'R' ? q.answerText : step === 'W' ? '999/1000' : 'banana';
    const result = checkPracticeAnswer(skill, q, input);
    session = recordPracticeAnswer(session, q, result, t, t + secs * 1000);
    t += secs * 1000;
  });
  return { session, difficulties };
}

test('a perfect session on C.1 reaches mastery, stepping difficulty up', () => {
  const { session, difficulties } = play('R'.repeat(19));
  const stats = practiceSessionStats(session);
  assert.equal(stats.score, 100);
  assert.equal(stats.mastered, true);
  assert.equal(stats.answered, 19);
  assert.equal(stats.correct, 19);
  assert.equal(stats.accuracy, 100);
  assert.equal(stats.seconds, 19 * 20);
  assert.equal(difficulties[0], 1);
  assert.equal(difficulties.at(-1), 3);
  for (let i = 1; i < difficulties.length; i++) assert.ok(difficulties[i] >= difficulties[i - 1]);
});

test('invalid input is not recorded or scored', () => {
  const { session } = play('RIIR');
  const stats = practiceSessionStats(session);
  assert.equal(session.events.length, 2);
  assert.equal(stats.answered, 2);
  assert.equal(stats.score, 20);
});

// An unsimplified answer to a fraction question, like 14/24 for 7/12.
const unsimplifiedInput = (q) => `${q.answer.num * 2}/${q.answer.den * 2}`;

test('simplest form required (default): unsimplified gets a mild hint and a retry, not scored', () => {
  let session = startPracticeSession('C.1', 50, T0);
  const q = nextPracticeQuestion(skill, session, 7);
  assert.equal(q.requireSimplest, true);
  const result = checkPracticeAnswer(skill, q, unsimplifiedInput(q));
  assert.equal(result.correct, false);
  assert.equal(result.retry, true);
  assert.equal(result.explanation, SIMPLIFY_FRACTION_HINT);
  assert.ok(!result.explanation.includes(q.answerText), 'hint does not give the answer away');
  session = recordPracticeAnswer(session, q, result, T0, T0 + 5000);
  assert.equal(session.events.length, 0);
  assert.equal(practiceSessionScore(session), 50);
  // The retry, simplified, earns half the usual +6.
  const retry = checkPracticeAnswer(skill, q, q.answerText, { hinted: result.hinted });
  assert.equal(retry.correct, true);
  session = recordPracticeAnswer(session, q, retry, T0, T0 + 9000);
  assert.equal(session.events[0].hinted, true);
  assert.equal(practiceSessionScore(session), 53);
});

test('the hint carries through an invalid try; a wrong answer after it costs the usual amount', () => {
  let session = startPracticeSession('C.1', 50, T0);
  const q = nextPracticeQuestion(skill, session, 7);
  const first = checkPracticeAnswer(skill, q, unsimplifiedInput(q));
  const blank = checkPracticeAnswer(skill, q, '', { hinted: first.hinted });
  assert.equal(blank.retry, true);
  assert.equal(blank.hinted, true);
  const wrongTry = checkPracticeAnswer(skill, q, '999/1000', { hinted: blank.hinted });
  session = recordPracticeAnswer(session, q, wrongTry, T0, T0 + 9000);
  assert.equal(practiceSessionScore(session), 46);
});

test('simplest form not required: an equal fraction counts as correct', () => {
  let session = startPracticeSession('C.1', 50, T0, { requireSimplestForm: false });
  const q = nextPracticeQuestion(skill, session, 7);
  assert.equal(q.requireSimplest, false);
  const result = checkPracticeAnswer(skill, q, unsimplifiedInput(q));
  assert.equal(result.correct, true);
  assert.ok(!result.retry);
  session = recordPracticeAnswer(session, q, result, T0, T0 + 5000);
  assert.equal(practiceSessionScore(session), 56);
});

test('skills without fractions ignore the setting', () => {
  const round = findSkill('A.3');
  const session = startPracticeSession('A.3', 0, T0, { requireSimplestForm: false });
  const q = nextPracticeQuestion(round, session, 3);
  assert.equal(checkPracticeAnswer(round, q, q.answerText).correct, true);
});

test('teacher settings: defaults, Sheet checkbox values, junk', () => {
  assert.deepEqual(normalizeTeacherSettings(undefined), { requireSimplestForm: true });
  assert.deepEqual(normalizeTeacherSettings({ requireSimplestForm: 'FALSE' }), { requireSimplestForm: false });
  assert.deepEqual(normalizeTeacherSettings({ requireSimplestForm: 'true' }), { requireSimplestForm: true });
  assert.deepEqual(normalizeTeacherSettings({ requireSimplestForm: 'maybe', other: 1 }), { requireSimplestForm: true });
});

test('mixed session stats', () => {
  const { session } = play('RRWRW', { startScore: 85, secs: 30 });
  const stats = practiceSessionStats(session);
  // 85 -> 88 -> 91 -> 83 -> 86 -> 80
  assert.deepEqual(replaySmartScore(session.events, 85).history, [88, 91, 83, 86, 80]);
  assert.equal(stats.score, 80);
  assert.equal(stats.scoreChange, -5);
  assert.equal(stats.correct, 3);
  assert.equal(stats.wrong, 2);
  assert.equal(stats.accuracy, 60);
  assert.equal(stats.seconds, 150);
  assert.equal(stats.inChallengeZone, false);
});

test('score can be rebuilt from stored rows (JSON round trip)', () => {
  const { session } = play('RRRWRRRRWRR');
  const rows = JSON.parse(JSON.stringify(session.events));
  assert.equal(replaySmartScore(rows).score, practiceSessionScore(session));
});

test('a later session carries the score over', () => {
  const first = play('RRRRRRRR').session;
  const second = startPracticeSession('C.1', practiceSessionScore(first), T0);
  assert.equal(practiceSessionScore(second), 66);
  assert.equal(practiceSessionStats(second).answered, 0);
});

test('time per question is capped and never negative', () => {
  assert.equal(practiceAnswerSeconds({ shownAt: 0, answeredAt: 12_400 }), 12);
  assert.equal(practiceAnswerSeconds({ shownAt: 0, answeredAt: 3_600_000 }), 300);
  assert.equal(practiceAnswerSeconds({ shownAt: 5000, answeredAt: 1000 }), 0);
  assert.equal(practiceAnswerSeconds({}), 0);
});

test('recording does not change the old session', () => {
  const s0 = startPracticeSession('C.1', 0, T0);
  const q = nextPracticeQuestion(skill, s0, 1);
  const s1 = recordPracticeAnswer(s0, q, skill.check(q, q.answerText), T0, T0 + 1000);
  assert.equal(s0.events.length, 0);
  assert.equal(s1.events.length, 1);
});
