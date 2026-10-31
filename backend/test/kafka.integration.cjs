// Run only against the isolated synthetic stack: node --test test/kafka.integration.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Kafka, logLevel } = require('kafkajs');

test('registration commits an outbox event and delivers it to a real Kafka consumer', { timeout: 60000 }, async () => {
  assert.equal(process.env.ALLOW_SYNTHETIC_TESTS, 'true', 'Set ALLOW_SYNTHETIC_TESTS=true only for an isolated test stack');
  const api = process.env.API_URL || 'http://127.0.0.1:8000';
  const topic = process.env.KAFKA_TOPIC || 'flowing.user.registered.v1';
  const suffix = randomUUID();
  const kafka = new Kafka({ clientId: 'flowing-integration',
    brokers: (process.env.KAFKA_BROKERS || '127.0.0.1:9092').split(','),
    connectionTimeout: 2000, requestTimeout: 5000, retry: { retries: 2 }, logLevel: logLevel.NOTHING });
  const consumer = kafka.consumer({ groupId: `flowing-test-${suffix}` });
  const messages = [];
  try {
    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: true });
    await consumer.run({ eachMessage: async ({ message }) => {
      messages.push({ payload: JSON.parse(message.value.toString()),
        eventId: message.headers.eventId.toString(), key: message.key.toString() });
    } });
    const response = await fetch(`${api}/auth/register`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: `kafka-${suffix}@example.invalid`, login: `kafka-${suffix}`,
        hashpassword: 'Synthetic-only-password-123!' }), signal: AbortSignal.timeout(10000),
    });
    assert.equal(response.status, 200);
    const user = await response.json();
    assert.equal(typeof user.id, 'string');
    assert.equal(user.hashpassword, undefined);
    const deadline = Date.now() + 30000;
    let delivered;
    while (Date.now() < deadline) {
      delivered = messages.find(message => message.payload.userId === user.id);
      if (delivered) break;
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    assert.ok(delivered, 'Committed registration event should reach Kafka within 30s');
    assert.equal(delivered.payload.type, 'user.registered.v1');
    assert.equal(delivered.payload.eventId, delivered.eventId);
    assert.equal(delivered.key, user.id);
    assert.deepEqual(Object.keys(delivered.payload).sort(), ['eventId', 'type', 'userId']);
  } finally {
    await consumer.disconnect();
  }
});
