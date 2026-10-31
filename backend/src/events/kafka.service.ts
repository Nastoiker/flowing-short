import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Kafka, logLevel, Producer, Admin } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleDestroy {
  readonly topic = process.env.KAFKA_TOPIC || 'flowing.user.registered.v1';
  private readonly producer: Producer;
  private readonly admin: Admin;
  private readiness?: Promise<void>;

  constructor() {
    const username = process.env.KAFKA_SASL_USERNAME;
    const kafka = new Kafka({
      clientId: 'flowing-short',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      ssl: process.env.KAFKA_SSL === 'true',
      ...(username ? { sasl: { mechanism: 'plain' as const, username,
        password: process.env.KAFKA_SASL_PASSWORD || '' } } : {}),
      connectionTimeout: 800,
      requestTimeout: 1000,
      enforceRequestTimeout: true,
      retry: { retries: 0 },
      // Broker exceptions can contain addresses or credentials. Log only sanitized state below.
      logLevel: logLevel.NOTHING,
    });
    this.producer = kafka.producer({ allowAutoTopicCreation: false });
    this.admin = kafka.admin();
  }

  check(): Promise<void> {
    if (!this.readiness) {
      this.readiness = (async () => {
        await this.admin.connect();
        const metadata = await this.admin.fetchTopicMetadata({ topics: [this.topic] });
        const partitions = metadata.topics[0]?.partitions;
        if (!partitions?.length || partitions.some(p => p.partitionErrorCode !== 0 || p.leader < 0)) {
          throw new Error('Kafka topic unavailable');
        }
      })().finally(() => { this.readiness = undefined; });
    }
    return this.readiness;
  }

  async publish(event: { id: string; aggregateId: string; payload: string; createdAt: Date }) {
    await this.producer.connect();
    await this.producer.send({
      topic: this.topic,
      acks: -1,
      timeout: 1000,
      messages: [{ key: event.aggregateId, value: event.payload,
        headers: { eventId: event.id, eventType: 'user.registered.v1' },
        timestamp: event.createdAt.getTime().toString() }],
    });
  }

  async onModuleDestroy() {
    await Promise.allSettled([this.producer.disconnect(), this.admin.disconnect()]);
  }
}
