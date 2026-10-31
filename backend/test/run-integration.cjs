const { mkdtempSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { spawnSync } = require('node:child_process');
const directory = mkdtempSync(join(tmpdir(), 'flowing-short-test-'));
require('node:fs').writeFileSync(join(directory, 'integration.db'), '');
const env = { ...process.env, NODE_ENV: 'test', DATABASE_URL: 'file:' + join(directory,'integration.db').replaceAll('\\','/'), JWT_SECRET: 'isolated-test-secret-at-least-32-characters', EMAIL_ENABLED: 'false', TELEGRAM_ENABLED: 'false', EVENTS_WORKER_ENABLED: 'false' };
function run(script,args) {
  const result = spawnSync(process.execPath,[resolve(script),...args],{env,stdio:'inherit'});
  if (result.status !== 0) process.exit(result.status || 1);
}
run('node_modules/prisma/build/index.js',['migrate','deploy']);
run('node_modules/jest/bin/jest.js',['--config','test/jest-e2e.json','--runInBand',...process.argv.slice(2)]);
