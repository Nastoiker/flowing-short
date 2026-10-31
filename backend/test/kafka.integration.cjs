// Explicitly isolated synthetic stack only; proves the producer AND real app consumer.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Kafka, logLevel } = require('kafkajs');
const { PrismaClient } = require('@prisma/client');
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function eventually(check) {
  const deadline = Date.now() + 30000;
  let last;
  while (Date.now() < deadline) {
    try {
      return await check();
    } catch (error) {
      last = error;
      await delay(250);
    }
  }
  throw last;
}
test(
  'identity events deliver, deduplicate, survive poison and update a useful creator projection',
  { timeout: 90000 },
  async () => {
    assert.equal(process.env.ALLOW_SYNTHETIC_TESTS, 'true');
    assert.match(
      process.env.DATABASE_URL || '',
      /^file:.*(?:demo|test).*\.db$/i,
    );
    const api = process.env.API_URL || 'http://127.0.0.1:8000';
    assert.ok(['127.0.0.1', 'localhost'].includes(new URL(api).hostname));
    const topic = process.env.KAFKA_TOPIC || 'flowing.user.registered.v1';
    const suffix = randomUUID();
    const kafka = new Kafka({
      clientId: 'flowing-integration',
      brokers: (process.env.KAFKA_BROKERS || '127.0.0.1:9092').split(','),
      connectionTimeout: 2000,
      requestTimeout: 5000,
      retry: { retries: 2 },
      logLevel: logLevel.NOTHING,
    });
    const consumer = kafka.consumer({ groupId: `flowing-test-${suffix}` });
    const producer = kafka.producer();
    const db = new PrismaClient();
    const messages = [];
    const email = `kafka-${suffix}@example.invalid`,
      password = 'Synthetic-only-password-123!';
    async function post(path, body, token, method = 'POST') {
      return fetch(api + path, {
        method,
        headers: {
          'content-type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      });
    }
    async function directory(userId) {
      const response = await fetch(api + '/creators?limit=30', {
        signal: AbortSignal.timeout(5000),
      });
      assert.equal(response.status, 200);
      return (await response.json()).find((item) => item.userId === userId);
    }
    try {
      await consumer.connect();
      await producer.connect();
      await consumer.subscribe({ topic, fromBeginning: true });
      await consumer.run({
        eachMessage: async ({ message }) => {
          try {
            messages.push({
              payload: JSON.parse(message.value.toString()),
              eventId: message.headers?.eventId?.toString(),
              key: message.key?.toString(),
            });
          } catch {
            /* Intentional poison from a previous/current synthetic run. */
          }
        },
      });
      const response = await post('/auth/register', {
        email,
        login: `kafka-${suffix}`,
        hashpassword: password,
      });
      assert.equal(response.status, 200);
      const user = await response.json();
      assert.equal(typeof user.id, 'string');
      assert.equal(user.hashpassword, undefined);
      const delivered = await eventually(() => {
        const value = messages.find((m) => m.payload.userId === user.id);
        assert.ok(value);
        return value;
      });
      assert.equal(delivered.payload.type, 'user.registered.v1');
      assert.equal(delivered.payload.eventId, delivered.eventId);
      assert.equal(delivered.key, user.id);
      assert.equal(delivered.payload.schemaVersion, 1);
      assert.equal(delivered.payload.aggregateVersion, 1);
      assert.deepEqual(Object.keys(delivered.payload).sort(), [
        'aggregateVersion',
        'eventId',
        'occurredAt',
        'profile',
        'schemaVersion',
        'type',
        'userId',
      ]);
      await eventually(async () =>
        assert.equal(
          (
            await directory(user.id)
          )?.displayName,
          `kafka-${suffix}`,
        ),
      );
      const login = await post('/auth/login', { email, password });
      assert.equal(login.status, 200);
      const token = (await login.json()).accesToken;
      const renamed = 'Renamed creator ' + suffix.slice(0, 8);
      const update = await post(
        '/user/' + user.id,
        { login: renamed },
        token,
        'PATCH',
      );
      assert.equal(update.status, 200);
      await eventually(async () =>
        assert.equal((await directory(user.id))?.displayName, renamed),
      );
      // Redeliver the old registration twice AFTER the profile update. It must neither
      // duplicate the inbox/projection nor undo the monotonic profile revision.
      const duplicate = JSON.stringify(delivered.payload);
      await producer.send({
        topic,
        messages: [
          { key: user.id, value: duplicate },
          { key: user.id, value: duplicate },
        ],
      });
      const poison = await producer.send({
        topic,
        messages: [{ key: user.id, value: 'not valid JSON' }],
      });
      const legacyId = 'legacy-' + suffix;
      await producer.send({
        topic,
        messages: [
          {
            key: user.id,
            value: JSON.stringify({
              eventId: legacyId,
              type: 'user.registered.v1',
              userId: user.id,
            }),
          },
        ],
      });
      await eventually(async () =>
        assert.ok(
          await db.eventInbox.findUnique({ where: { eventId: legacyId } }),
        ),
      );
      assert.equal(
        await db.eventInbox.count({ where: { eventId: delivered.eventId } }),
        1,
      );
      assert.equal(
        await db.creatorDirectory.count({ where: { userId: user.id } }),
        1,
      );
      assert.equal((await directory(user.id)).displayName, renamed);
      assert.ok(
        (await db.creatorDirectory.findUnique({ where: { userId: user.id } }))
          .aggregateVersion >= 2,
      );
      const rejected = await db.rejectedEvent.findUnique({
        where: {
          topic_partition_offset: {
            topic,
            partition: poison[0].partition,
            offset: poison[0].baseOffset,
          },
        },
      });
      assert.equal(rejected?.reason, 'invalid_json');
      assert.equal((await fetch(api + '/health/ready')).status, 200);
    } finally {
      await consumer.disconnect();
      await producer.disconnect();
      await db.$disconnect();
    }
  },
);
