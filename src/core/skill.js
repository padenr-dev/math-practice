// The skill interface. Each file in src/skills/ exports one skill object:
//
//   {
//     id: 'C.1',                      // code shown in the skill list
//     title: 'Add fractions with unlike denominators',
//     grade: 5,
//     category: 'Fractions',
//     generate(rng, difficulty) -> question
//     check(question, input) -> { correct, explanation, invalid?, unsimplified?, error? }
//   }
//
// A question is plain data (it travels through google.script.run and into
// Sheet rows, so no functions or class instances):
//
//   {
//     skillId, difficulty,
//     prompt: '1/4 + 1/3 = ?',        // text for display and read-aloud
//     answerType: 'fraction',         // one of ANSWER_TYPES
//     answer: { num: 7, den: 12 },    // exact value, as a fraction
//     answerText: '7/12',             // how the answer is shown to students
//     requireSimplest: true,          // fraction skills only
//     hint: '...',
//     data: { ... }                   // skill-specific numbers for the explanation
//   }
//
// Difficulty is 1 (easier), 2 or 3 (harder). Chunk 2 picks it from the score.
import { ANSWER_TYPES } from './answers.js';

export const DIFFICULTY_LEVELS = [1, 2, 3];

export function clampDifficulty(difficulty) {
  const d = Math.round(Number(difficulty));
  if (!Number.isFinite(d)) return 1;
  return Math.min(3, Math.max(1, d));
}

// Returns a list of problems with a skill or one of its questions; empty means OK.
// Content chunks use this in tests so every new skill meets the same contract.
export function validateSkill(skill) {
  const problems = [];
  for (const key of ['id', 'title', 'category']) {
    if (typeof skill[key] !== 'string' || !skill[key]) problems.push(`missing ${key}`);
  }
  if (!Number.isInteger(skill.grade)) problems.push('missing grade');
  if (typeof skill.generate !== 'function') problems.push('missing generate()');
  if (typeof skill.check !== 'function') problems.push('missing check()');
  return problems;
}

export function validateQuestion(skill, question) {
  const problems = [];
  if (question.skillId !== skill.id) problems.push('skillId does not match');
  if (!DIFFICULTY_LEVELS.includes(question.difficulty)) problems.push('bad difficulty');
  if (typeof question.prompt !== 'string' || !question.prompt) problems.push('missing prompt');
  if (!ANSWER_TYPES.includes(question.answerType)) problems.push('bad answerType');
  const a = question.answer;
  if (!a || !Number.isInteger(a.num) || !Number.isInteger(a.den) || a.den <= 0) problems.push('bad answer');
  if (typeof question.answerText !== 'string' || !question.answerText) problems.push('missing answerText');
  if (!isPlainData(question)) problems.push('question is not plain data');
  return problems;
}

function isPlainData(value) {
  if (value === null || ['string', 'boolean'].includes(typeof value)) return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isPlainData);
  if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.values(value).every(isPlainData);
  }
  return false;
}
