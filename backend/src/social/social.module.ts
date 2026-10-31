import { Global, Module } from '@nestjs/common';
import { SocialGraph } from './application/social-graph';
import { PrismaSocialRepository } from './infrastructure/prisma-social.repository';
@Global()
@Module({
  providers: [
    PrismaSocialRepository,
    {
      provide: SocialGraph,
      inject: [PrismaSocialRepository],
      useFactory: (repository: PrismaSocialRepository) =>
        new SocialGraph(repository),
    },
  ],
  exports: [SocialGraph],
})
export class SocialModule {}
