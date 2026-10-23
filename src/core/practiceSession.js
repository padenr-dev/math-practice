// A practice session: one student working on one skill in one sitting.
// Sessions are plain data and every function returns a new session, so the UI
// (chunk 3) and the server (chunk 4) can pass them around freely.
//
//   { skillId, startScore, startedAt, events: [answer events, see smartScore.js] }
//
// The current score is always replayed from startScore + events, never stored.
import { replaySmartScore, isScoredAnswer, isCorrectAnswer, isMastered, isInChallengeZone, difficultyForScore } from './smartScore.js';
import { createRng } from './random.js';

// Time on one question is capped so a tab left open over lunch doesn't count.
export const MAX_SECONDS_PER_QUESTION = 300;

// startScore carries over from earlier sessions (replay that skill's past rows).
export function startPracticeSession(skillId, startScore, now) {
  return { skillId, startScore: replaySmartScore([], startScore).score, startedAt: now, events: [] };
}

// Builds the answer event for a check() result and adds it to the session.
// Invalid input is not recorded at all: the student just tries again.
export function recordPracticeAnswer(session, question, result, shownAt, answeredAt) {
  if (!result || result.invalid) return session;
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
export function nextPracticeQuestion(skill, session, seed) {
  return skill.generate(createRng(seed), difficultyForScore(practiceSessionScore(session)));
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
