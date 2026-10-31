import { Module } from '@nestjs/common';
import { ReadFeed } from './application/read-feed';
import { PrismaFeedReader } from './infrastructure/prisma-feed.reader';
@Module({
  providers: [
    PrismaFeedReader,
    {
      provide: ReadFeed,
      inject: [PrismaFeedReader],
      useFactory: (reader: PrismaFeedReader) => new ReadFeed(reader),
    },
  ],
  exports: [ReadFeed],
})
export class CatalogModule {}
