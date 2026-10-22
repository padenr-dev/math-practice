import { test } from 'node:test';
import assert from 'node:assert/strict';
import { greetingFor } from '../src/core/greeting.js';

test('greets the signed-in email', () => {
  assert.equal(greetingFor('teacher@school.org'), 'Hello, teacher@school.org');
});

test('falls back when the email is hidden or missing', () => {
  assert.equal(greetingFor(''), 'Hello there');
  assert.equal(greetingFor(undefined), 'Hello there');
});
