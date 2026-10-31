import { Module } from '@nestjs/common';
import { PrismaCreatorProjection } from './infrastructure/prisma-creator.projection';
import { ProjectCreator } from './application/project-creator';
import { DiscoveryController } from './discovery.controller';
@Module({
  controllers: [DiscoveryController],
  providers: [
    PrismaCreatorProjection,
    {
      provide: ProjectCreator,
      inject: [PrismaCreatorProjection],
      useFactory: (projection: PrismaCreatorProjection) =>
        new ProjectCreator(projection),
    },
  ],
  exports: [ProjectCreator],
})
export class DiscoveryModule {}
