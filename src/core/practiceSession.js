// A practice session: one student working on one skill in one sitting.
// Sessions are plain data and every function returns a new session, so the UI
// (chunk 3) and the server (chunk 4) can pass them around freely.
//
//   { skillId, startScore, startedAt, settings, events: [answer events, see smartScore.js] }
//
// The current score is always replayed from startScore + events, never stored.
// `settings` are the teacher's (see teacherSettings.js).
//
// Flow for the UI: q = nextPracticeQuestion(...); result = checkPracticeAnswer(...);
// if result.retry, show result.explanation and let the student answer again;
// otherwise session = recordPracticeAnswer(...).
import { replaySmartScore, isScoredAnswer, isCorrectAnswer, isMastered, isInChallengeZone, difficultyForScore } from './smartScore.js';
import { createRng } from './random.js';
import { normalizeTeacherSettings, SIMPLIFY_FRACTION_HINT } from './teacherSettings.js';

// Time on one question is capped so a tab left open over lunch doesn't count.
export const MAX_SECONDS_PER_QUESTION = 300;

// startScore carries over from earlier sessions (replay that skill's past rows).
export function startPracticeSession(skillId, startScore, now, settings) {
  return {
    skillId,
    startScore: replaySmartScore([], startScore).score,
    startedAt: now,
    settings: normalizeTeacherSettings(settings),
    events: [],
  };
}

// skill.check() plus the teacher's simplest-form rule (nextPracticeQuestion
// already set question.requireSimplest from it). `retry: true` means the
// answer is not scored and the student should try again (blank or unreadable
// input, or an unsimplified fraction when simplest form is required).
export function checkPracticeAnswer(skill, question, input) {
  const result = skill.check(question, input);
  if (result.invalid) return { ...result, retry: true };
  if (result.unsimplified) return { ...result, retry: true, explanation: SIMPLIFY_FRACTION_HINT };
  return result;
}

// Builds the answer event for a check result and adds it to the session.
// Answers the student is asked to retry are not recorded.
export function recordPracticeAnswer(session, question, result, shownAt, answeredAt) {
  if (!result || result.invalid || result.retry) return session;
  const event = {
    skillId: session.skillId,
    correct: result.correct === true,
    unsimplified: !!result.unsimplified,
    difficulty: question.difficulty,
    shownAt,
    answeredAt,
  };
  return { ...session, events: session.events.concat([event]) };
}

export function practiceSessionScore(session) {
  return replaySmartScore(session.events, session.startScore).score;
}

// Generates the next question at the difficulty the current score calls for.
// `seed` makes it repeatable in tests; pass a random integer in real use.
// With requireSimplestForm off, any equal fraction is accepted.
export function nextPracticeQuestion(skill, session, seed) {
  const question = skill.generate(createRng(seed), difficultyForScore(practiceSessionScore(session)));
  const settings = normalizeTeacherSettings(session.settings);
  if (question.requireSimplest && !settings.requireSimplestForm) return { ...question, requireSimplest: false };
  return question;
}

export function practiceAnswerSeconds(event) {
  const ms = Number(event.answeredAt) - Number(event.shownAt);
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.min(MAX_SECONDS_PER_QUESTION, Math.round(ms / 1000));
}

// Stats for the end-of-session summary and the teacher view.
export function practiceSessionStats(session) {
  const scored = session.events.filter(isScoredAnswer);
  const correct = scored.filter(isCorrectAnswer).length;
  const score = practiceSessionScore(session);
  return {
    answered: scored.length,
    correct,
    wrong: scored.length - correct,
    accuracy: scored.length ? Math.round((100 * correct) / scored.length) : 0,
    seconds: scored.reduce((sum, e) => sum + practiceAnswerSeconds(e), 0),
    startScore: session.startScore,
    score,
    scoreChange: score - session.startScore,
    inChallengeZone: isInChallengeZone(score),
    mastered: isMastered(score),
  };
}
