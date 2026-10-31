import { Injectable } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { randomUUID } from 'crypto';
import { mkdir } from 'fs/promises';
import { PrismaService } from '../../prisma/prisma-service';
import { RegistrationPorts } from '../application/register-account';
import {
  AccountAlreadyExists,
  IdentityEvent,
  RegisteredAccount,
} from '../domain/registration';

@Injectable()
export class PrismaRegistrationAdapter implements RegistrationPorts {
  constructor(private readonly prisma: PrismaService) {}
  newId() {
    return randomUUID();
  }
  now() {
    return new Date();
  }
  hashPassword(password: string) {
    return hash(password, 10);
  }
  async prepareMedia(userId: string) {
    await Promise.all(
      ['video', 'music', 'avatar'].map((folder) =>
        mkdir(`uploads/users/${userId}/${folder}`, { recursive: true }),
      ),
    );
  }
  commit(account: RegisteredAccount, event: IdentityEvent) {
    return this.prisma.write(async (tx) => {
      const existing = await tx.$queryRaw<
        Array<{ id: string }>
      >`SELECT id FROM UserModel WHERE lower(email) = ${account.email} LIMIT 1`;
      if (existing.length)
        throw new AccountAlreadyExists('Account already exists');
      const user = await tx.userModel.create({ data: account });
      await tx.outboxEvent.create({
        data: {
          id: event.eventId,
          aggregateId: user.id,
          payload: JSON.stringify(event),
          createdAt: new Date(event.occurredAt),
        },
      });
      const { hashpassword: _password, ...safe } = user;
      return safe;
    });
  }
}
