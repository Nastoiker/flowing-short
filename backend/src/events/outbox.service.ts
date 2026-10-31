import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma-service';
import { KafkaService } from './kafka.service';

@Injectable()
export class OutboxService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running?: Promise<void>;
  private failed = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly kafka: KafkaService,
  ) {}

  onModuleInit() {
    // Explicit opt-out for isolated API tests; production always starts the worker.
    if (
      process.env.NODE_ENV === 'test' &&
      process.env.EVENTS_WORKER_ENABLED === 'false'
    )
      return;
    this.timer = setInterval(() => {
      void this.flush();
    }, 1000);
    this.timer.unref();
  }

  flush(): Promise<void> {
    if (!this.running)
      this.running = this.deliver().finally(() => {
        this.running = undefined;
      });
    return this.running;
  }

  private async deliver() {
    try {
      const events = await this.prisma.outboxEvent.findMany({
        where: {
          publishedAt: null,
          OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }],
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: 20,
      });
      let batchFailed = false;
      for (const event of events) {
        try {
          await this.kafka.publish(event);
          // A crash between send and update can redeliver: inbox deduplicates eventId.
          await this.prisma.write((tx) =>
            tx.outboxEvent.update({
              where: { id: event.id },
              data: {
                publishedAt: new Date(),
                lastError: null,
                nextAttemptAt: null,
              },
            }),
          );
        } catch {
          batchFailed = true;
          const attempts = event.attempts + 1;
          await this.prisma.write((tx) =>
            tx.outboxEvent.update({
              where: { id: event.id },
              data: {
                attempts,
                nextAttemptAt: new Date(
                  Date.now() +
                    Math.min(30000, 1000 * 2 ** Math.min(attempts, 5)),
                ),
                lastError: 'delivery_unavailable',
              },
            }),
          );
          // Continue the bounded batch: one failed event must not starve other aggregates.
          if (!this.failed)
            this.logger.warn(
              'Event delivery unavailable; pending events retained for retry',
            );
          this.failed = true;
        }
      }
      if (this.failed && events.length && !batchFailed) {
        this.logger.log('Event delivery recovered');
        this.failed = false;
      }
    } catch {
      if (!this.failed)
        this.logger.warn(
          'Event delivery unavailable; pending events retained for retry',
        );
      this.failed = true;
    }
  }

  async onModuleDestroy() {
    clearInterval(this.timer);
    await this.running;
  }
}
