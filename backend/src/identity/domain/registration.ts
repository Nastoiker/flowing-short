export class RegistrationViolation extends Error {}
export class AccountAlreadyExists extends Error {}

export interface RegistrationInput {
  email: string;
  login: string;
  hashpassword: string;
  phone?: string;
}
export interface RegisteredAccount {
  id: string;
  email: string;
  login: string;
  authorUrl: string;
  hashpassword: string;
  phone?: string;
  role: 'user';
  identityVersion: number;
}
export interface IdentityEvent {
  eventId: string;
  schemaVersion: 1;
  type: 'user.registered.v1' | 'user.profile.updated.v1';
  userId: string;
  occurredAt: string;
  aggregateVersion: number;
  profile: { displayName: string; authorUrl: string };
}

export function normalizeEmail(email: string): string {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}
export function validatePassword(password: string): void {
  if (
    typeof password !== 'string' ||
    password.length < 8 ||
    new TextEncoder().encode(password).byteLength > 72
  ) {
    throw new RegistrationViolation(
      'Password must contain at least 8 characters and at most 72 UTF-8 bytes',
    );
  }
}
export function validateRegistration(
  input: RegistrationInput,
): RegistrationInput {
  const email = normalizeEmail(input.email || '');
  const login = typeof input.login === 'string' ? input.login.trim() : '';
  validatePassword(input.hashpassword);
  if (!/^\S+@\S+\.\S+$/.test(email) || !login || login.length > 100) {
    throw new RegistrationViolation('Invalid account details');
  }
  return { email, login, hashpassword: input.hashpassword, phone: input.phone };
}
export function identityEvent(
  type: IdentityEvent['type'],
  eventId: string,
  user: {
    id: string;
    login: string;
    authorUrl: string;
    identityVersion?: number;
  },
  now: Date,
): IdentityEvent {
  return {
    eventId,
    schemaVersion: 1,
    type,
    userId: user.id,
    occurredAt: now.toISOString(),
    aggregateVersion: user.identityVersion ?? 1,
    profile: { displayName: user.login, authorUrl: user.authorUrl },
  };
}
