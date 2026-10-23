// SmartScore: a 0–100 score per student per skill, like IXL's.
//
// The score is never stored on its own. It is rebuilt by replaying the list of
// answer events (one Sheet row each, from chunk 4) through scoreAfterAnswer, so
// the rules can change later and every score is recomputed the same way.
//
// An answer event is plain data:
//
//   { skillId, correct, unsimplified?, invalid?, difficulty?, shownAt, answeredAt }
//
// shownAt / answeredAt are epoch milliseconds. `correct`, `invalid` and
// `unsimplified` come straight from skill.check(). Invalid answers (blank or
// unreadable input) are not scored. Unsimplified answers count as wrong, like
// IXL; the UI can still say "almost".
//
// Rules (score before the answer decides the band):
//
//   score    correct  wrong
//   0–29       +10     -2
//   30–49       +8     -3
//   50–69       +6     -4
//   70–79       +4     -5
//   80–89       +3     -6
//   90–99       +2     -8    <- Challenge Zone
//
// A perfect run from 0 reaches 90 in 15 answers and 100 in 19.

export const MAX_SMART_SCORE = 100;
export const CHALLENGE_ZONE_SCORE = 90;

// Bands from the top down: the first band whose `from` is <= score applies.
const SMART_SCORE_BANDS = [
  { from: 90, gain: 2, loss: 8 },
  { from: 80, gain: 3, loss: 6 },
  { from: 70, gain: 4, loss: 5 },
  { from: 50, gain: 6, loss: 4 },
  { from: 30, gain: 8, loss: 3 },
  { from: 0, gain: 10, loss: 2 },
];

export function clampSmartScore(score) {
  const s = Math.round(Number(score));
  if (!Number.isFinite(s)) return 0;
  return Math.min(MAX_SMART_SCORE, Math.max(0, s));
}

export function smartScoreBand(score) {
  const s = clampSmartScore(score);
  return SMART_SCORE_BANDS.find((band) => band.from <= s);
}

export function isScoredAnswer(event) {
  return !!event && !event.invalid;
}

// True only for a fully correct answer: unsimplified counts as wrong.
export function isCorrectAnswer(event) {
  return isScoredAnswer(event) && event.correct === true && !event.unsimplified;
}

// The new score after one answer event. Invalid events leave it unchanged.
export function scoreAfterAnswer(score, event) {
  const s = clampSmartScore(score);
  if (!isScoredAnswer(event)) return s;
  const band = smartScoreBand(s);
  return clampSmartScore(isCorrectAnswer(event) ? s + band.gain : s - band.loss);
}

// Replays events in order. Returns the final score and the score after each event.
export function replaySmartScore(events, startScore = 0) {
  let score = clampSmartScore(startScore);
  const history = [];
  for (const event of events || []) {
    score = scoreAfterAnswer(score, event);
    history.push(score);
  }
  return { score, history };
}

export function isInChallengeZone(score) {
  const s = clampSmartScore(score);
  return s >= CHALLENGE_ZONE_SCORE && s < MAX_SMART_SCORE;
}

export function isMastered(score) {
  return clampSmartScore(score) >= MAX_SMART_SCORE;
}

// Difficulty steps up with the score: 1 below 40, 2 from 40, 3 from 75.
export function difficultyForScore(score) {
  const s = clampSmartScore(score);
  if (s >= 75) return 3;
  if (s >= 40) return 2;
  return 1;
}
