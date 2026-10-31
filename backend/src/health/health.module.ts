import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { PrismaService } from '../prisma/prisma-service';
import { HealthController } from './health.controller';

@Module({ imports: [EventsModule], providers: [PrismaService], controllers: [HealthController] })
export class HealthModule {}
