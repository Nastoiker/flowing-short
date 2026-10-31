import {
  identityEvent,
  RegistrationViolation,
  validateRegistration,
} from './registration';
describe('identity registration invariants', () => {
  const input = {
    email: ' User@Example.test ',
    login: ' Public name ',
    hashpassword: 'Password123!',
  };
  it('normalizes new email and whitelists untrusted attributes', () => {
    expect(validateRegistration({ ...input, role: 'admin' } as any)).toEqual({
      email: 'user@example.test',
      login: 'Public name',
      hashpassword: 'Password123!',
      phone: undefined,
    });
  });
  it.each([undefined, '', 'short', 'x'.repeat(73), '🙂'.repeat(19), 123])(
    'rejects invalid password boundary %p',
    (hashpassword) => {
      expect(() =>
        validateRegistration({ ...input, hashpassword } as any),
      ).toThrow(RegistrationViolation);
    },
  );
  it('emits a versioned public event without credentials or contact details', () => {
    const event = identityEvent(
      'user.registered.v1',
      'event',
      { id: 'user', login: 'Public', authorUrl: 'public' },
      new Date('2026-01-01Z'),
    );
    expect(event.schemaVersion).toBe(1);
    expect(event.profile.displayName).toBe('Public');
    expect(Object.keys(event).sort()).toEqual([
      'aggregateVersion',
      'eventId',
      'occurredAt',
      'profile',
      'schemaVersion',
      'type',
      'userId',
    ]);
  });
});
