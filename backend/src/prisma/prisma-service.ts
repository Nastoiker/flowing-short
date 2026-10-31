import {
  INestApplication,
  Injectable,
  OnModuleInit,
  OnApplicationShutdown,
} from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnApplicationShutdown
{
  private writes: Promise<unknown> = Promise.resolve();
  // SQLite has one writer. This process-local queue prevents read/modify/write
  // transaction deadlocks; it is deliberately not a multi-instance coordination mechanism.
  write<T>(
    operation: (transaction: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    const result = this.writes.then(() => this.$transaction(operation));
    this.writes = result.catch(() => undefined);
    return result;
  }
  async onModuleInit() {
    await this.$connect();
  }

  async onApplicationShutdown() {
    await this.writes;
    await this.$disconnect();
  }

  async enableShutdownHooks(app: INestApplication) {
    this.$on('beforeExit', async () => {
      await app.close();
    });
  }
}
