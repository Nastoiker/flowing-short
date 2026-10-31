import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const project = process.env.COMPOSE_PROJECT_NAME;
assert.equal(process.env.ALLOW_SYNTHETIC_TESTS, 'true', 'Only run against an isolated synthetic stack');
assert.match(project || '', /^flowing-short-test(?:-[a-z0-9-]+)?$/, 'COMPOSE_PROJECT_NAME must be flowing-short-test or a test-prefixed project');
const api = new URL(process.env.API_URL || 'http://127.0.0.1:18000');
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(api.hostname), 'Health fault injection requires a loopback API_URL');
assert.equal(api.protocol, 'http:');
assert.equal(api.username + api.password + api.search + api.hash, '');
const root = fileURLToPath(new URL('../', import.meta.url));
const composeArgs = ['compose', '-p', project, '-f', 'compose.yaml', '-f', 'compose.test.yaml'];

function docker(args, input) {
  const result = spawnSync('docker', args, {
    cwd: root, encoding: 'utf8', input, timeout: 45000, maxBuffer: 1024 * 1024,
    windowsHide: true,
  });
  if (result.status !== 0) {
    // Do not emit environment or connection details from Docker/Prisma error output.
    throw new Error(`Docker test command failed (${args[0]}); check isolated stack logs`);
  }
  return result.stdout.trim();
}

function compose(...args) { return docker([...composeArgs, ...args]); }

const verifyIsolation = `
  if (process.env.NODE_ENV !== 'test' || process.env.ALLOW_SYNTHETIC_TESTS !== 'true' ||
      process.env.DATABASE_URL !== 'file:/app/backend/data/test.db') {
    throw new Error('Refusing non-test database');
  }
`;

// Verify actual container ownership and database, before any mutation or service interruption.
for (const service of ['backend', 'kafka']) {
  const id = compose('ps', '-q', service);
  assert.ok(id && !id.includes('\n'), `Expected one running ${service} test container`);
  const label = docker(['inspect', '--format', '{{index .Config.Labels "com.docker.compose.project"}}', id]);
  assert.equal(label, project);
}
docker([...composeArgs, 'exec', '-T', 'backend', 'node'], `${verifyIsolation}\nconsole.log('isolated');`);

async function probe(path, expected, failedDependency = 'kafka') {
  const start = performance.now();
  const response = await fetch(new URL(path, api), { signal: AbortSignal.timeout(3500) });
  const body = await response.json();
  assert.ok(performance.now() - start < 3000, `${path} must respond within 3 seconds`);
  assert.equal(response.status, expected);
  if (path.endsWith('/live')) assert.deepEqual(body, { status: 'ok' });
  else assert.deepEqual(body, expected === 200
    ? { status: 'ok', checks: { database: 'up', kafka: 'up' } }
    : { status: 'unavailable', checks: {
      database: failedDependency === 'database' ? 'down' : 'up',
      kafka: failedDependency === 'kafka' ? 'down' : 'up',
    } });
}

async function eventually(check, timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try { return await check(); } catch (error) { lastError = error; }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw lastError;
}

function outboxState(userId) {
  const source = `${verifyIsolation}
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    (async () => {
      const rows = await prisma.outboxEvent.findMany({
        where: { aggregateId: ${JSON.stringify(userId)} },
        select: { id: true, publishedAt: true }
      });
      console.log(JSON.stringify(rows.map(row => ({ id: row.id, published: row.publishedAt !== null }))));
    })().catch(() => { process.exitCode = 1; }).finally(() => prisma.$disconnect());
  `;
  return JSON.parse(docker([...composeArgs, 'exec', '-T', 'backend', 'node'], source));
}

await probe('/health/live', 200);
await probe('/health/ready', 200);

function renameUserTable(restore = false) {
  const sql = restore
    ? 'ALTER TABLE "_HealthProbeUserModel" RENAME TO "UserModel"'
    : 'ALTER TABLE "UserModel" RENAME TO "_HealthProbeUserModel"';
  const source = `${verifyIsolation}
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    prisma.$executeRawUnsafe(${JSON.stringify(sql)})
      .then(() => console.log('ok'))
      .catch(() => { process.exitCode = 1; })
      .finally(() => prisma.$disconnect());
  `;
  docker([...composeArgs, 'exec', '-T', 'backend', 'node'], source);
}

// Rename instead of deleting/corrupting the isolated SQLite file: table data is preserved.
let tableRenamed = false;
try {
  renameUserTable();
  tableRenamed = true;
  await probe('/health/live', 200);
  await probe('/health/ready', 503, 'database');
} finally {
  if (tableRenamed) renameUserTable(true);
}
await probe('/health/ready', 200);
console.log('PASS: unavailable database schema returns bounded 503; table and readiness recover');

let mustRestore = false;
try {
  mustRestore = true;
  compose('stop', '-t', '10', 'kafka');
  await probe('/health/live', 200);
  await probe('/health/ready', 503);
  const suffix = randomUUID();
  const response = await fetch(new URL('/auth/register', api), {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ login: `outage-${suffix}`, email: `outage-${suffix}@example.invalid`,
      hashpassword: 'Synthetic-only-password-123!' }), signal: AbortSignal.timeout(10000),
  });
  assert.equal(response.status, 200, 'Registration remains durable while Kafka is down');
  const user = await response.json();
  assert.equal(typeof user.id, 'string');
  assert.equal(user.hashpassword, undefined);
  const pending = outboxState(user.id);
  assert.equal(pending.length, 1);
  assert.equal(pending[0].published, false, 'Failed delivery must remain pending in SQLite');
  console.log('PASS: Kafka outage returns bounded 503; liveness and durable registration remain available');

  compose('start', 'kafka');
  await eventually(() => probe('/health/ready', 200));
  await probe('/health/live', 200);
  await eventually(() => {
    assert.deepEqual(outboxState(user.id), [{ id: pending[0].id, published: true }]);
  }, 45000);
  mustRestore = false;
  console.log('PASS: readiness recovers and the same pending event is acknowledged by Kafka');
} finally {
  if (mustRestore) compose('start', 'kafka');
}
