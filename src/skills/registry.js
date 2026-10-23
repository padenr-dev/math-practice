// Every skill the app offers, in skill-list order. Add new skills here.
// A function (not a top-level const) because Apps Script loads files in name
// order, so the skill objects may not exist yet when this file first runs.
import { roundDecimals } from './roundDecimals.js';
import { addFractionsUnlike } from './addFractionsUnlike.js';

export function allSkills() {
  return [roundDecimals, addFractionsUnlike];
}

export function findSkill(id) {
  return allSkills().find((skill) => skill.id === id) || null;
}
