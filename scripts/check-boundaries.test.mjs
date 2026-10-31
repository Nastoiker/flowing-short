import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { inspectDependencies } from './check-boundaries.mjs';
const file = fileURLToPath(new URL('../backend/src/identity/application/example.ts', import.meta.url));
test('application may depend on a domain contract without framework coupling', () => {
  assert.deepEqual(inspectDependencies("import type { IdentityEvent } from '../domain/registration';", file, 'application'), []);
});
test('framework, infrastructure re-exports and dynamic IO dependencies fail the boundary check', () => {
  const source = "import { Injectable } from '@nestjs/common'; export * from '../infrastructure/repository'; const fs = require('node:fs'); import(variable);";
  assert.equal(inspectDependencies(source, file, 'application').length, 4);
  assert.equal(inspectDependencies("import { RegisterAccount } from '../application/register-account';", file.replace('application', 'domain'), 'domain').length, 1);
});
