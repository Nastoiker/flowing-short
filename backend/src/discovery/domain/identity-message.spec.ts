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
