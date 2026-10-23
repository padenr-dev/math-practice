// The server side of the practice screen, as plain logic over a key/value
// store. gas/Code.js passes CacheService; tests and preview.html pass a Map.
//
// The browser only ever gets a "view" (no answers): the current question's
// prompt and hint, the feedback for the last answer, and the score. The full
// question, with its answer, stays in the store under the run id.
//
//   store: { get(key) -> string|null, put(key, string), remove(key) }
//
// One run = one practice session (see practiceSession.js) plus the question
// on screen: { session, question, number, shownAt, hinted, done, feedback }.
import { startPracticeSession, checkPracticeAnswer, recordPracticeAnswer, nextPracticeQuestion, practiceSessionScore, practiceSessionStats } from './practiceSession.js';
import { isMastered, isInChallengeZone } from './smartScore.js';
import { findSkill, allSkills } from '../skills/registry.js';
import { spokenMath } from './spokenMath.js';

export const PRACTICE_EXPIRED_MESSAGE = 'This practice session has timed out. Reload the page to start again.';
const PRACTICE_INPUT_MAX_LENGTH = 40;

// Data the page needs before the first call: which skill, and who is signed in.
export function practicePageData(skillId, email) {
  const skill = findSkill(skillId) || allSkills()[0];
  return {
    skill: { id: skill.id, title: skill.title, category: skill.category, grade: skill.grade },
    email: String(email || ''),
  };
}

// JSON that is safe to print inside a <script> tag.
export function scriptJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

function practiceKey(id) {
  if (typeof id !== 'string' || !/^[\w-]{8,64}$/.test(id)) throw new Error(PRACTICE_EXPIRED_MESSAGE);
  return 'practice:' + id;
}

function loadPracticeRun(store, id) {
  const raw = store.get(practiceKey(id));
  if (!raw) throw new Error(PRACTICE_EXPIRED_MESSAGE);
  return JSON.parse(raw);
}

function savePracticeRun(store, id, run) {
  store.put(practiceKey(id), JSON.stringify(run));
}

// Only strings, or { whole, num, den } of strings, reach the checker.
export function cleanPracticeInput(input) {
  const clip = (v) => String(v ?? '').slice(0, PRACTICE_INPUT_MAX_LENGTH);
  if (input && typeof input === 'object') return { whole: clip(input.whole), num: clip(input.num), den: clip(input.den) };
  return clip(input);
}

// A new question, trying a few seeds so the same prompt doesn't show twice in a row.
function freshQuestion(skill, session, seed, previous) {
  let question = nextPracticeQuestion(skill, session, seed);
  for (let i = 1; i < 6 && previous && question.prompt === previous.prompt; i++) {
    question = nextPracticeQuestion(skill, session, seed + i * 7919);
  }
  return question;
}

function practiceView(id, run) {
  const { session, question } = run;
  const skill = findSkill(session.skillId);
  const stats = practiceSessionStats(session);
  const score = practiceSessionScore(session);
  return {
    id,
    skill: { id: skill.id, title: skill.title, category: skill.category, grade: skill.grade },
    number: run.number,
    question: {
      prompt: question.prompt,
      answerType: question.answerType,
      difficulty: question.difficulty,
      hint: question.hint || '',
      spoken: spokenMath(question.prompt),
    },
    done: run.done,
    feedback: run.feedback,
    score,
    startScore: session.startScore,
    scoreChange: score - session.startScore,
    inChallengeZone: isInChallengeZone(score),
    mastered: isMastered(score),
    answered: stats.answered,
    correct: stats.correct,
  };
}

// options: { skillId, startScore, settings, now, seed }
export function beginPracticeRun(store, id, options) {
  const skill = findSkill(options.skillId) || allSkills()[0];
  const session = startPracticeSession(skill.id, options.startScore || 0, options.now, options.settings);
  const run = {
    session,
    question: freshQuestion(skill, session, options.seed, null),
    number: 1,
    shownAt: options.now,
    hinted: false,
    done: false,
    feedback: null,
  };
  savePracticeRun(store, id, run);
  return practiceView(id, run);
}

// `spoken` is the whole feedback for read-aloud, including the right answer.
function practiceFeedback(status, result, answerText, scoreChange) {
  const message = result.explanation || result.error || '';
  const spoken = spokenMath((answerText ? `The answer is ${answerText}. ` : '') + message);
  return { status, message, answerText, scoreChange, spoken };
}

// Checks an answer. A retry (blank input, or the simplify hint) keeps the
// question on screen; otherwise the answer is recorded and the run waits for
// "Next question". Answering again after that just returns the same view.
export function answerPracticeRun(store, id, input, now) {
  const run = loadPracticeRun(store, id);
  if (run.done) return practiceView(id, run);
  const skill = findSkill(run.session.skillId);
  const result = checkPracticeAnswer(skill, run.question, cleanPracticeInput(input), { hinted: run.hinted });
  if (result.retry) {
    run.hinted = result.hinted;
    run.feedback = practiceFeedback(result.invalid ? 'invalid' : 'simplify', result, '', 0);
  } else {
    const before = practiceSessionScore(run.session);
    run.session = recordPracticeAnswer(run.session, run.question, result, run.shownAt, now);
    run.done = true;
    const answerText = result.correct ? '' : run.question.answerText;
    run.feedback = practiceFeedback(result.correct ? 'correct' : 'wrong', result, answerText, practiceSessionScore(run.session) - before);
  }
  savePracticeRun(store, id, run);
  return practiceView(id, run);
}

// Moves on to a new question, once the current one is answered and the skill
// isn't mastered yet (IXL ends the session at 100).
export function nextPracticeRun(store, id, now, seed) {
  const run = loadPracticeRun(store, id);
  if (!run.done || isMastered(practiceSessionScore(run.session))) return practiceView(id, run);
  const skill = findSkill(run.session.skillId);
  run.question = freshQuestion(skill, run.session, seed, run.question);
  run.number += 1;
  run.shownAt = now;
  run.hinted = false;
  run.done = false;
  run.feedback = null;
  savePracticeRun(store, id, run);
  return practiceView(id, run);
}

// Ends the run and returns the summary. Chunk 4 writes these stats (and the
// session's events) to the teacher's Sheet here.
export function finishPracticeRun(store, id) {
  const run = loadPracticeRun(store, id);
  store.remove(practiceKey(id));
  return { skillId: run.session.skillId, ...practiceSessionStats(run.session) };
}
