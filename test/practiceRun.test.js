import { test } from 'node:test';
import assert from 'node:assert/strict';
import { beginPracticeRun, answerPracticeRun, nextPracticeRun, finishPracticeRun, practicePageData, scriptJson, cleanPracticeInput, PRACTICE_EXPIRED_MESSAGE } from '../src/core/practiceRun.js';

const T0 = Date.UTC(2026, 9, 23, 9, 0, 0);
const ID = 'run-0001-test';

function mapStore() {
  const map = new Map();
  return { map, get: (k) => (map.has(k) ? map.get(k) : null), put: (k, v) => map.set(k, v), remove: (k) => map.delete(k) };
}
// The stored question (with its answer), which the browser never sees.
const storedQuestion = (store) => JSON.parse(store.map.get('practice:' + ID)).question;
const asBoxes = (f) => ({ whole: '', num: String(f.num), den: String(f.den) });

test('the view sent to the browser has no answer in it', () => {
  const store = mapStore();
  const view = beginPracticeRun(store, ID, { skillId: 'C.1', now: T0, seed: 3 });
  const q = storedQuestion(store);
  assert.equal(view.number, 1);
  assert.equal(view.question.prompt, q.prompt);
  assert.match(view.question.spoken, /plus .* equals what\?$/);
  const sent = JSON.stringify(view.question);
  assert.ok(!sent.includes('answer"') && !sent.includes(q.answerText + '"'), sent);
  assert.equal(view.feedback, null);
  assert.equal(view.done, false);
});

test('right, wrong, next: score, feedback and stats follow', () => {
  const store = mapStore();
  beginPracticeRun(store, ID, { skillId: 'C.1', now: T0, seed: 1 });
  let view = answerPracticeRun(store, ID, asBoxes(storedQuestion(store).answer), T0 + 20000);
  assert.equal(view.feedback.status, 'correct');
  assert.equal(view.feedback.scoreChange, 10);
  assert.deepEqual([view.score, view.answered, view.correct, view.done], [10, 1, 1, true]);

  // A second submit of the same question is ignored.
  assert.equal(answerPracticeRun(store, ID, '999/1000', T0 + 21000).score, 10);

  view = nextPracticeRun(store, ID, T0 + 22000, 2);
  assert.deepEqual([view.number, view.done, view.feedback], [2, false, null]);
  const answerText = storedQuestion(store).answerText;
  view = answerPracticeRun(store, ID, '999/1000', T0 + 30000);
  assert.equal(view.feedback.status, 'wrong');
  assert.equal(view.feedback.answerText, answerText);
  assert.match(view.feedback.spoken, /^The answer is /);
  assert.deepEqual([view.score, view.answered, view.correct, view.scoreChange], [8, 2, 1, 8]);

  const stats = finishPracticeRun(store, ID);
  assert.deepEqual([stats.answered, stats.correct, stats.seconds, stats.score], [2, 1, 28, 8]);
  assert.throws(() => answerPracticeRun(store, ID, '1/2', T0), { message: PRACTICE_EXPIRED_MESSAGE });
});

test('the simplify hint keeps the question, then a right answer earns half', () => {
  const store = mapStore();
  beginPracticeRun(store, ID, { skillId: 'C.1', now: T0, seed: 5 });
  const a = storedQuestion(store).answer;
  let view = answerPracticeRun(store, ID, { num: String(a.num * 2), den: String(a.den * 2) }, T0 + 1000);
  assert.equal(view.feedback.status, 'simplify');
  assert.match(view.feedback.message, /simplest form/);
  assert.deepEqual([view.done, view.answered, view.score], [false, 0, 0]);
  assert.equal(nextPracticeRun(store, ID, T0, 9).number, 1, 'cannot skip an unanswered question');
  view = answerPracticeRun(store, ID, asBoxes(a), T0 + 2000);
  assert.deepEqual([view.feedback.status, view.score], ['correct', 5]);
});

test('blank input asks again without scoring; simplify off accepts any equal fraction', () => {
  const store = mapStore();
  beginPracticeRun(store, ID, { skillId: 'C.1', now: T0, seed: 5, settings: { requireSimplestForm: 'FALSE' } });
  let view = answerPracticeRun(store, ID, { whole: '', num: '', den: '' }, T0);
  assert.deepEqual([view.feedback.status, view.feedback.message, view.done], ['invalid', 'Type an answer first.', false]);
  const a = storedQuestion(store).answer;
  view = answerPracticeRun(store, ID, `${a.num * 3}/${a.den * 3}`, T0 + 1000);
  assert.deepEqual([view.feedback.status, view.score], ['correct', 10]);
});

test('a run stops offering questions at mastery', () => {
  const store = mapStore();
  beginPracticeRun(store, ID, { skillId: 'A.3', startScore: 98, now: T0, seed: 1 });
  const view = answerPracticeRun(store, ID, storedQuestion(store).answerText, T0 + 5000);
  assert.deepEqual([view.score, view.mastered, view.scoreChange], [100, true, 2]);
  assert.equal(nextPracticeRun(store, ID, T0 + 6000, 2).number, 1);
  assert.equal(finishPracticeRun(store, ID).mastered, true);
});

test('page data, script-safe JSON and input cleaning', () => {
  assert.equal(practicePageData('A.3', 'a@b.org').skill.title, 'Round decimals');
  assert.equal(practicePageData('nope', '').skill.id, 'A.3');
  assert.equal(scriptJson({ t: '</script><b>' }), '{"t":"\\u003c/script>\\u003cb>"}');
  assert.equal(cleanPracticeInput('x'.repeat(100)).length, 40);
  assert.deepEqual(cleanPracticeInput({ num: 3, den: null, evil: 1 }), { whole: '', num: '3', den: '' });
  assert.throws(() => answerPracticeRun(mapStore(), '../x', '1', T0), { message: PRACTICE_EXPIRED_MESSAGE });
});
