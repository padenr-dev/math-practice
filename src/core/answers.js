// Answer parsing and checking shared by every skill.
// Answer types: 'integer', 'decimal', 'fraction'. Parsed values are fractions
// (see fractions.js) so "0.50", ".5" and "1/2" compare exactly.
import { makeFraction, isSimplest, fractionsEqual } from './fractions.js';

export const ANSWER_TYPES = ['integer', 'decimal', 'fraction'];

const ANSWER_INTEGER_RE = /^-?(\d+|\d{1,3}(,\d{3})+)$/;
const ANSWER_DECIMAL_RE = /^-?(\d+|\d{1,3}(,\d{3})+)?(\.\d*)?$/;
const ANSWER_FRACTION_RE = /^(-?)(?:(\d+) )?(\d+)\/(\d+)$/;

// Fraction inputs may arrive as separate boxes: { whole, num, den }.
function answerInputToText(input) {
  if (input && typeof input === 'object') {
    const whole = String(input.whole ?? '').trim();
    const num = String(input.num ?? '').trim();
    const den = String(input.den ?? '').trim();
    if (!num && !den) return whole;
    return `${whole} ${num}/${den}`;
  }
  return input == null ? '' : String(input);
}

function normalizeAnswerText(text) {
  return text
    .replace(/[−–]/g, '-') // minus signs pasted from elsewhere
    .replace(/[⁄∕]/g, '/') // fraction slashes
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseIntegerText(text) {
  if (!ANSWER_INTEGER_RE.test(text)) return null;
  return makeFraction(parseInt(text.replace(/,/g, ''), 10), 1);
}

function parseDecimalText(text) {
  if (!ANSWER_DECIMAL_RE.test(text) || !/\d/.test(text)) return null;
  const negative = text.startsWith('-');
  const [intPart, fracPart = ''] = text.replace(/[-,]/g, '').split('.');
  const den = 10 ** fracPart.length;
  const num = parseInt(intPart || '0', 10) * den + parseInt(fracPart || '0', 10);
  return makeFraction(negative ? -num : num, den);
}

// Returns { ok: true, value, simplest } or { ok: false, error }.
// `simplest` is false for "2/4", "4/1", "1 2/4" and "1 5/4".
export function parseAnswer(input, answerType) {
  const text = normalizeAnswerText(answerInputToText(input));
  if (!text) return { ok: false, error: 'Type an answer first.' };

  if (answerType === 'integer') {
    const value = parseIntegerText(text);
    return value ? { ok: true, value, simplest: true } : { ok: false, error: 'Enter a whole number, like 42.' };
  }
  if (answerType === 'decimal') {
    const value = parseDecimalText(text);
    return value ? { ok: true, value, simplest: true } : { ok: false, error: 'Enter a number, like 3.25.' };
  }
  if (answerType === 'fraction') {
    const whole = parseIntegerText(text);
    if (whole) return { ok: true, value: whole, simplest: true };
    const m = ANSWER_FRACTION_RE.exec(text);
    if (!m) return { ok: false, error: 'Enter a fraction, like 3/4 or 1 1/2.' };
    const [, sign, w, n, d] = m;
    const wholePart = w ? parseInt(w, 10) : 0;
    const num = parseInt(n, 10);
    const den = parseInt(d, 10);
    if (den === 0) return { ok: false, error: 'The bottom number of a fraction can’t be 0.' };
    const total = wholePart * den + num;
    const simplest = den !== 1 && isSimplest(makeFraction(num, den)) && (!w || (num > 0 && num < den));
    return { ok: true, value: makeFraction(sign ? -total : total, den), simplest };
  }
  throw new Error(`unknown answer type: ${answerType}`);
}

// Compares a student's input with question.answer.
// Returns { correct, invalid?, unsimplified?, error? }. `invalid` means the
// input couldn't be read (blank or not a number) and shouldn't be scored.
// `unsimplified` means the value is right but question.requireSimplest is set.
export function checkAnswer(question, input) {
  const parsed = parseAnswer(input, question.answerType);
  if (!parsed.ok) return { correct: false, invalid: true, error: parsed.error };
  if (!fractionsEqual(parsed.value, question.answer)) return { correct: false };
  if (question.requireSimplest && !parsed.simplest) return { correct: false, unsimplified: true };
  return { correct: true };
}
