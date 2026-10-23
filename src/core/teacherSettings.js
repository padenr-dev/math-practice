// Settings a teacher controls for their class. Chunk 4 stores them on the
// Sheet's `Settings` tab and chunk 6 shows them as checkboxes in the teacher
// view. Values from a Sheet checkbox arrive as true/false or "TRUE"/"FALSE".
//
//   requireSimplestForm  "Students must simplify fractions" (default on).
//     On:  an unsimplified fraction (6/8 for 3/4) is not scored. The student
//          gets SIMPLIFY_FRACTION_HINT and tries again.
//     Off: an equal, unsimplified fraction counts as correct.

export const SIMPLIFY_FRACTION_HINT = "So close! Your answer is equal to the right one, but it isn't in simplest form yet. Can you simplify it?";

export function defaultTeacherSettings() {
  return { requireSimplestForm: true };
}

function readSettingCheckbox(value, fallback) {
  if (value === true || value === false) return value;
  const text = String(value ?? '').trim().toUpperCase();
  if (text === 'TRUE') return true;
  if (text === 'FALSE') return false;
  return fallback;
}

// Fills in defaults and ignores anything unknown or unreadable.
export function normalizeTeacherSettings(raw) {
  const defaults = defaultTeacherSettings();
  const given = raw && typeof raw === 'object' ? raw : {};
  return { requireSimplestForm: readSettingCheckbox(given.requireSimplestForm, defaults.requireSimplestForm) };
}
