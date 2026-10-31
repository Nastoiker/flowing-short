const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  mkdtempSync,
  mkdirSync,
  cpSync,
  writeFileSync,
  readFileSync,
} = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { spawnSync } = require('node:child_process');
const { PrismaClient } = require('@prisma/client');

test(
  'upgrade preserves legacy data, archives duplicate likes, and fixes graph/index invariants',
  { timeout: 60000 },
  async () => {
    const directory = mkdtempSync(
      join(tmpdir(), 'flowing-short-test-migration-'),
    );
    const url = 'file:' + join(directory, 'upgrade.db').replaceAll('\\', '/');
    writeFileSync(join(directory, 'upgrade.db'), '');
    writeFileSync(
      join(directory, 'schema.prisma'),
      'datasource db {\n provider = "sqlite"\n url = env("DATABASE_URL")\n}\n',
    );
    mkdirSync(join(directory, 'migrations'));
    cpSync(
      'prisma/migrations/migration_lock.toml',
      join(directory, 'migrations/migration_lock.toml'),
    );
    for (const migration of ['20230620181238_init', '20261031000100_outbox'])
      cpSync(
        'prisma/migrations/' + migration,
        join(directory, 'migrations', migration),
        { recursive: true },
      );
    const migrate = (expected = 0) => {
      const result = spawnSync(
        process.execPath,
        [
          resolve('node_modules/prisma/build/index.js'),
          'migrate',
          'deploy',
          '--schema',
          join(directory, 'schema.prisma'),
        ],
        {
          env: { ...process.env, NODE_ENV: 'test', DATABASE_URL: url },
          encoding: 'utf8',
          timeout: 30000,
        },
      );
      assert.equal(result.status, expected, result.stdout + result.stderr);
    };
    migrate();
    const db = new PrismaClient({ datasources: { db: { url } } });
    try {
      for (const [id, email] of [
        ['a', 'Legacy@Example.test'],
        ['b', 'legacy@example.test'],
        ['c', 'third@example.test'],
      ]) {
        await db.$executeRaw`INSERT INTO UserModel (id,email,login,authorUrl,hashpassword,LikeCount,following_count,subscribers_count) VALUES (${id},${email},${id},${id},'synthetic-old-hash',99,99,99)`;
      }
      await db.firstLevelCategory.create({
        data: { id: 'first', name: 'category', alias: 'category' },
      });
      await db.secondLevelCategory.create({
        data: {
          id: 'second',
          name: 'shorts',
          alias: 'shorts',
          firstLevelId: 'first',
        },
      });
      await db.video.create({
        data: {
          id: 'video',
          name: 'Old title',
          alias: 'old',
          Title: 'Old title',
          Description: 'Preserve me',
          isActive: true,
          duration: 1,
          embed_link: '/old.mp4',
          embed_html: '',
          share_url: '',
          cover_image_url: '',
          Type: 'video',
          width: 100,
          height: 100,
          userId: 'b',
          secondCategoryId: 'second',
          likesCount: 999,
        },
      });
      await db.like.create({
        data: {
          id: 'duplicate-a',
          createdAt: new Date('2026-01-01Z'),
          likeById: 'a',
          videoId: 'video',
          like: false,
        },
      });
      await db.like.create({
        data: {
          id: 'duplicate-b',
          createdAt: new Date('2026-01-02Z'),
          likeById: 'a',
          videoId: 'video',
          like: true,
        },
      });
      await db.folower.create({
        data: { id: 'old-follow', userId: 'a', authorId: 'b' },
      });
      const payload = JSON.stringify({
        eventId: 'legacy-event',
        userId: 'a',
        type: 'user.registered.v1',
      });
      await db.$executeRaw`INSERT INTO OutboxEvent (id, aggregateId, payload) VALUES ('legacy-event', 'a', ${payload})`;
      await db.$disconnect();
      const migration = '20261031000200_domain_events_and_social_integrity';
      cpSync(
        'prisma/migrations/' + migration,
        join(directory, 'migrations', migration),
        { recursive: true },
      );
      const migrationFile = join(
        directory,
        'migrations',
        migration,
        'migration.sql',
      );
      const sql = readFileSync(migrationFile, 'utf8');
      writeFileSync(
        migrationFile,
        sql.replace('COMMIT;', 'THIS IS AN INTENTIONAL TEST FAILURE;\nCOMMIT;'),
      );
      migrate(1);
      assert.equal(
        await db.like.count(),
        2,
        'failed migration must roll back deletion',
      );
      const schema =
        await db.$queryRaw`SELECT name FROM sqlite_master WHERE name='LegacyLikeArchive'`;
      assert.equal(
        schema.length,
        0,
        'failed migration must roll back schema changes',
      );
      await db.$disconnect();
      writeFileSync(migrationFile, sql);
      const resolveFailure = spawnSync(
        process.execPath,
        [
          resolve('node_modules/prisma/build/index.js'),
          'migrate',
          'resolve',
          '--rolled-back',
          migration,
          '--schema',
          join(directory, 'schema.prisma'),
        ],
        {
          env: { ...process.env, NODE_ENV: 'test', DATABASE_URL: url },
          encoding: 'utf8',
          timeout: 30000,
        },
      );
      assert.equal(
        resolveFailure.status,
        0,
        resolveFailure.stdout + resolveFailure.stderr,
      );
      migrate();
      assert.equal(await db.userModel.count(), 3);
      assert.deepEqual(
        (
          await db.userModel.findMany({
            orderBy: { id: 'asc' },
            select: { email: true },
          })
        ).map((u) => u.email),
        ['Legacy@Example.test', 'legacy@example.test', 'third@example.test'],
      );
      assert.equal(
        (await db.video.findUnique({ where: { id: 'video' } })).Description,
        'Preserve me',
      );
      assert.equal(
        (await db.video.findUnique({ where: { id: 'video' } })).likesCount,
        1,
      );
      assert.equal(
        (await db.userModel.findUnique({ where: { id: 'b' } })).LikeCount,
        1,
      );
      assert.equal(await db.like.count(), 1);
      assert.equal(
        (
          await db.legacyLikeArchive.findUnique({
            where: { id: 'duplicate-a' },
          })
        ).like,
        false,
      );
      assert.equal(
        (await db.outboxEvent.findUnique({ where: { id: 'legacy-event' } }))
          .payload,
        payload,
      );
      await assert.rejects(
        db.like.create({
          data: { likeById: 'a', videoId: 'video', like: true },
        }),
        (error) => error.code === 'P2002',
      );
      await db.folower.create({ data: { userId: 'a', authorId: 'c' } });
      await db.folower.create({ data: { userId: 'b', authorId: 'c' } });
      await assert.rejects(
        db.folower.create({ data: { userId: 'a', authorId: 'c' } }),
        (error) => error.code === 'P2002',
      );
      const plan =
        await db.$queryRaw`EXPLAIN QUERY PLAN SELECT id FROM Video WHERE isActive=true ORDER BY createdAt DESC,id DESC LIMIT 12`;
      assert.ok(
        plan.some((row) =>
          String(row.detail).includes('Video_isActive_createdAt_id_idx'),
        ),
      );
      // A repeated deployment is a no-op, not a seed/reset.
      await db.$disconnect();
      migrate();
      assert.equal(await db.legacyLikeArchive.count(), 1);
    } finally {
      await db.$disconnect();
    }
  },
);
