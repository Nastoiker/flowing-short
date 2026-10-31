import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma-service';
import { KafkaService } from './kafka.service';
import { OutboxService } from './outbox.service';

@Module({ providers: [PrismaService, KafkaService, OutboxService], exports: [KafkaService, OutboxService] })
export class EventsModule {}
