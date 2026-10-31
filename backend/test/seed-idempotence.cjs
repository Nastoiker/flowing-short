const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { PrismaClient } = require('@prisma/client');
async function main() {
  assert.equal(process.env.NODE_ENV, 'test');
  assert.equal(process.env.ALLOW_DEMO_SEED, 'true');
  assert.equal(process.env.DATABASE_URL, 'file:/app/backend/data/test.db');
  const db = new PrismaClient();
  const seed = () => {
    const result = spawnSync(process.execPath, ['node_modules/ts-node/dist/bin.js', 'prisma/seed.ts'], { stdio: 'inherit', timeout: 60000 });
    assert.equal(result.status, 0);
  };
  const snapshot = async () => JSON.stringify(await Promise.all([
    db.userModel.findMany({ orderBy: { id: 'asc' } }),
    db.video.findMany({ orderBy: { id: 'asc' } }),
    db.firstLevelCategory.findMany({ orderBy: { id: 'asc' } }),
    db.secondLevelCategory.findMany({ orderBy: { id: 'asc' } }),
    db.tag.findMany({ orderBy: { id: 'asc' } }),
    db.tagOnVideo.findMany({ orderBy: { videoId: 'asc' } }),
  ]));
  try {
    seed();
    const before = await snapshot();
    seed();
    assert.equal(await snapshot(), before, 'Repeated seed must not duplicate or overwrite records');
    console.log('Synthetic seed is idempotent.');
  } finally { await db.$disconnect(); }
}
main().catch(() => { console.error('Seed idempotence check failed'); process.exitCode = 1; });
