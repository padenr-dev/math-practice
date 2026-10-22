// Pure logic: no Apps Script globals here, so it runs under `node --test`.

export function greetingFor(email) {
  const name = typeof email === 'string' ? email.trim() : '';
  return name ? `Hello, ${name}` : 'Hello there';
}
