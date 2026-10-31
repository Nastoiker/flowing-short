import { Module } from '@nestjs/common';
import { PrismaRegistrationAdapter } from './infrastructure/prisma-registration.adapter';
import { RegisterAccount } from './application/register-account';

@Module({
  providers: [
    PrismaRegistrationAdapter,
    {
      provide: RegisterAccount,
      inject: [PrismaRegistrationAdapter],
      useFactory: (adapter: PrismaRegistrationAdapter) =>
        new RegisterAccount(adapter),
    },
  ],
  exports: [RegisterAccount],
})
export class IdentityModule {}
