// Apps Script entry points. Keep this layer thin: call into src/core for logic.

// Practice runs live in the script cache (6 hours, the most it allows), keyed
// by a random run id. Not the user cache: with "Execute as me" every student
// would share Paden's.
const PRACTICE_CACHE_SECONDS = 6 * 60 * 60;

// ?skill=A.3 picks the skill; the skill list (chunk 5) links here.
function doGet(e) {
  const skillId = (e && e.parameter && e.parameter.skill) || 'C.1';
  const template = HtmlService.createTemplateFromFile('practice');
  template.pageJson = scriptJson(practicePageData(skillId, Session.getActiveUser().getEmail()));
  return template
    .evaluate()
    .setTitle('Math Practice')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// For the include('practice_js') scriptlets in the HTML templates.
function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

function practiceStore() {
  const cache = CacheService.getScriptCache();
  return {
    get: (key) => cache.get(key),
    put: (key, value) => cache.put(key, value, PRACTICE_CACHE_SECONDS),
    remove: (key) => cache.remove(key),
  };
}

function practiceSeed() {
  return Math.floor(Math.random() * 2147483647);
}

// Called from the page with google.script.run. Chunk 4 replaces startScore 0
// and the default settings with the student's Sheet rows and the Settings tab.
function practiceStart(skillId) {
  return beginPracticeRun(practiceStore(), Utilities.getUuid(), {
    skillId: String(skillId),
    startScore: 0,
    settings: defaultTeacherSettings(),
    now: Date.now(),
    seed: practiceSeed(),
  });
}

function practiceAnswer(runId, input) {
  return answerPracticeRun(practiceStore(), runId, input, Date.now());
}

function practiceNext(runId) {
  return nextPracticeRun(practiceStore(), runId, Date.now(), practiceSeed());
}

function practiceFinish(runId) {
  return finishPracticeRun(practiceStore(), runId);
}
