import {
  identityEvent,
  IdentityEvent,
  RegisteredAccount,
  RegistrationInput,
  validateRegistration,
} from '../domain/registration';

export interface RegistrationPorts {
  newId(): string;
  now(): Date;
  hashPassword(password: string): Promise<string>;
  prepareMedia(userId: string): Promise<void>;
  commit(account: RegisteredAccount, event: IdentityEvent): Promise<unknown>;
}

// The use case knows no HTTP, ORM, filesystem, or broker. The adapter commits both
// account and event, so a broker outage cannot roll back a successful registration.
export class RegisterAccount {
  constructor(private readonly ports: RegistrationPorts) {}
  async execute(input: RegistrationInput) {
    const validated = validateRegistration(input);
    const account: RegisteredAccount = {
      ...validated,
      id: this.ports.newId(),
      authorUrl: validated.login,
      role: 'user',
      identityVersion: 1,
      hashpassword: await this.ports.hashPassword(validated.hashpassword),
    };
    await this.ports.prepareMedia(account.id);
    return this.ports.commit(
      account,
      identityEvent(
        'user.registered.v1',
        this.ports.newId(),
        account,
        this.ports.now(),
      ),
    );
  }
}
