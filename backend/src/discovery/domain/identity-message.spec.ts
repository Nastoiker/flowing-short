import {
  InvalidIdentityMessage,
  parseIdentityMessage,
} from './identity-message';
describe('identity integration contract', () => {
  it('accepts historical outbox events without rewriting them', () => {
    const event = {
      eventId: 'old',
      type: 'user.registered.v1',
      userId: 'user',
    };
    expect(parseIdentityMessage(JSON.stringify(event))).toEqual(event);
  });
  it.each([
    'not JSON',
    '{}',
    JSON.stringify({
      eventId: 'a',
      userId: 'u',
      type: 'user.registered.v1',
      schemaVersion: 999,
    }),
  ])('rejects poison and future schemas %p', (body) => {
    expect(() => parseIdentityMessage(body)).toThrow(InvalidIdentityMessage);
  });
});

it.each([-1, 1.5, 2147483648, Number.MAX_SAFE_INTEGER, 1e100])('rejects non-persistable revision %p', aggregateVersion => {
 expect(() => parseIdentityMessage(JSON.stringify({eventId:'overflow',userId:'user',type:'user.registered.v1',schemaVersion:1,aggregateVersion,occurredAt:'2026-01-01T00:00:00Z',profile:{displayName:'Name',authorUrl:'name'}}))).toThrow(InvalidIdentityMessage);
});
it.each([0,2147483647])('accepts supported int32 revision %p', aggregateVersion => {
 expect(parseIdentityMessage(JSON.stringify({eventId:'valid',userId:'user',type:'user.registered.v1',schemaVersion:1,aggregateVersion,occurredAt:'2026-01-01T00:00:00Z',profile:{displayName:'Name',authorUrl:'name'}})).aggregateVersion).toBe(aggregateVersion);
});
