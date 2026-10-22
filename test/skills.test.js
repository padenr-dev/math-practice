// Contract tests every skill must pass. Content chunks get these for free by
// adding their skill to src/skills/registry.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allSkills, findSkill } from '../src/skills/registry.js';
import { DIFFICULTY_LEVELS, validateSkill, validateQuestion } from '../src/core/skill.js';
import { createRng } from '../src/core/random.js';
import { makeFraction, formatFraction } from '../src/core/fractions.js';

const SEEDS = 300;

function wrongAnswers(question) {
  const { num, den } = question.answer;
  const near = [makeFraction(num + 1, den), makeFraction(num - 1, den), makeFraction(num, den + 1)];
  return near.map((f) => (question.answerType === 'fraction' ? formatFraction(f) : String(f.num / f.den)));
}

for (const skill of allSkills()) {
  test(`${skill.id} ${skill.title}: skill shape`, () => {
    assert.deepEqual(validateSkill(skill), []);
    assert.equal(findSkill(skill.id), skill);
  });

  for (const level of DIFFICULTY_LEVELS) {
    test(`${skill.id} difficulty ${level}: valid questions, own answer checks correct, near misses fail`, () => {
      for (let seed = 1; seed <= SEEDS; seed++) {
        const q = skill.generate(createRng(seed), level);
        assert.deepEqual(validateQuestion(skill, q), [], `seed ${seed}`);
        assert.equal(q.difficulty, level);
        const ok = skill.check(q, q.answerText);
        assert.equal(ok.correct, true, `seed ${seed}: ${q.prompt} answer ${q.answerText}`);
        assert.ok(ok.explanation, 'explains correct answers too');
        for (const wrong of wrongAnswers(q)) {
          const r = skill.check(q, wrong);
          assert.equal(r.correct, false, `seed ${seed}: ${q.prompt} accepted ${wrong}`);
          assert.ok(r.explanation.length > 10);
        }
        assert.equal(skill.check(q, 'banana').invalid, true);
      }
    });
  }

  test(`${skill.id}: same seed, same question; questions vary across seeds`, () => {
    const a = skill.generate(createRng(7), 2);
    assert.deepEqual(skill.generate(createRng(7), 2), a);
    const prompts = new Set(Array.from({ length: 50 }, (_, i) => skill.generate(createRng(i + 1), 2).prompt));
    assert.ok(prompts.size > 20, `only ${prompts.size} distinct prompts`);
  });
}

test('findSkill returns null for unknown ids', () => {
  assert.equal(findSkill('Z.9'), null);
});
