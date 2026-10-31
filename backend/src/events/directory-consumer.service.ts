import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Consumer, Kafka, logLevel } from 'kafkajs';
import { PrismaService } from '../prisma/prisma-service';
import { ProjectCreator } from '../discovery/application/project-creator';
import { InvalidIdentityMessage } from '../discovery/domain/identity-message';

@Injectable()
export class DirectoryConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DirectoryConsumer.name);
  private readonly consumer: Consumer;
  private stopped = false;
  private starting?: Promise<void>;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private retryCount = 0;
  private connected = false;
  constructor(
    private readonly prisma: PrismaService,
    private readonly projection: ProjectCreator,
  ) {
    const kafka = new Kafka({
      clientId: 'flowing-discovery',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      ssl: process.env.KAFKA_SSL === 'true',
      ...(process.env.KAFKA_SASL_USERNAME
        ? {
            sasl: {
              mechanism: 'plain' as const,
              username: process.env.KAFKA_SASL_USERNAME,
              password: process.env.KAFKA_SASL_PASSWORD || '',
            },
          }
        : {}),
      connectionTimeout: 1000,
      requestTimeout: 2000,
      retry: { retries: 2 },
      logLevel: logLevel.NOTHING,
    });
    this.consumer = kafka.consumer({
      groupId:
        process.env.KAFKA_CONSUMER_GROUP || 'flowing-creator-directory-v1',
      allowAutoTopicCreation: false,
      sessionTimeout: 10000,
      heartbeatInterval: 2000,
    });
    this.consumer.on(this.consumer.events.GROUP_JOIN, () => {
      this.connected = true;
      this.retryCount = 0;
    });
    this.consumer.on(this.consumer.events.DISCONNECT, () => {
      this.connected = false;
    });
    this.consumer.on(this.consumer.events.CRASH, ({ payload }) => {
      this.connected = false;
      if (!payload.restart) this.scheduleRetry();
    });
  }
  isConnected() {
    return this.connected;
  }
  onModuleInit() {
    if (
      process.env.NODE_ENV === 'test' &&
      process.env.EVENTS_WORKER_ENABLED === 'false'
    )
      return;
    void this.start();
  }
  private scheduleRetry() {
    if (this.stopped || this.retryTimer) return;
    const delay = Math.min(30000, 1000 * 2 ** Math.min(this.retryCount++, 5));
    this.retryTimer = setTimeout(() => {
      this.retryTimer = undefined;
      void this.start();
    }, delay);
    this.retryTimer.unref();
  }
  private start(): Promise<void> {
    if (this.starting || this.stopped)
      return this.starting || Promise.resolve();
    this.starting = (async () => {
      try {
        await this.consumer.connect();
        await this.consumer.subscribe({
          topic: process.env.KAFKA_TOPIC || 'flowing.user.registered.v1',
          fromBeginning: true,
        });
        if (this.stopped) return;
        await this.consumer.run({
          eachMessage: async ({ topic, partition, message }) => {
            try {
              await this.projection.execute(
                message.value?.toString('utf8') || '',
              );
            } catch (error) {
              if (!(error instanceof InvalidIdentityMessage)) throw error;
              // Store only sanitized reason and broker coordinates, never raw untrusted payload/PII.
              await this.prisma.write((tx) =>
                tx.rejectedEvent.upsert({
                  where: {
                    topic_partition_offset: {
                      topic,
                      partition,
                      offset: message.offset,
                    },
                  },
                  create: {
                    topic,
                    partition,
                    offset: message.offset,
                    reason: error.message,
                  },
                  update: {},
                }),
              );
              this.logger.warn(
                'Invalid identity event quarantined; consumer continues',
              );
            }
          },
        });
      } catch {
        this.connected = false;
        this.logger.warn('Creator projection unavailable; retry scheduled');
        this.scheduleRetry();
      }
    })().finally(() => {
      this.starting = undefined;
    });
    return this.starting;
  }
  async onModuleDestroy() {
    this.stopped = true;
    clearTimeout(this.retryTimer);
    await this.starting;
    await this.consumer.disconnect();
  }
}
