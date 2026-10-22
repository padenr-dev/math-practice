// Apps Script entry points. Keep this layer thin: call into src/core for logic.

function doGet() {
  const template = HtmlService.createTemplateFromFile('index');
  template.greeting = greetingFor(Session.getActiveUser().getEmail());
  return template
    .evaluate()
    .setTitle('Math Practice')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
