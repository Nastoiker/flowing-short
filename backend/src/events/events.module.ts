import { DiscoveryModule } from '../discovery/discovery.module';
import { DirectoryConsumer } from './directory-consumer.service';
import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma-service';
import { KafkaService } from './kafka.service';
import { OutboxService } from './outbox.service';

@Module({
  imports: [DiscoveryModule],
  providers: [KafkaService, OutboxService, DirectoryConsumer],
  exports: [KafkaService, OutboxService],
})
export class EventsModule {}
