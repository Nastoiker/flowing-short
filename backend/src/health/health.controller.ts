import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma-service';
import { KafkaService } from '../events/kafka.service';

export async function boundedCheck(check: () => Promise<unknown>, timeoutMs = 2000): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    await Promise.race([
      Promise.resolve().then(check),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), timeoutMs); }),
    ]);
    return true;
  } catch { return false; }
  finally { clearTimeout(timer); }
}

@Controller('health')
export class HealthController {
  private databaseCheck?: Promise<unknown>;
  constructor(private readonly prisma: PrismaService, private readonly kafka: KafkaService) {}

  @Get('live')
  live() { return { status: 'ok' }; }

  @Get('ready')
  async ready() {
    const [database, kafka] = await Promise.all([
      boundedCheck(() => {
        if (!this.databaseCheck) this.databaseCheck = this.prisma.$queryRaw`SELECT 1`
          .then(result => result).finally(() => { this.databaseCheck = undefined; });
        return this.databaseCheck;
      }),
      boundedCheck(() => this.kafka.check()),
    ]);
    const checks = { database: database ? 'up' : 'down', kafka: kafka ? 'up' : 'down' };
    if (!database || !kafka) throw new ServiceUnavailableException({ status: 'unavailable', checks });
    return { status: 'ok', checks };
  }
}
