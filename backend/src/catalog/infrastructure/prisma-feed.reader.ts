import { Injectable } from '@nestjs/common';
import { FeedQuery, FeedReader } from '../application/read-feed';
import { PrismaService } from '../../prisma/prisma-service';
@Injectable()
export class PrismaFeedReader implements FeedReader {
  constructor(private readonly prisma: PrismaService) {}
  fetch(query: FeedQuery) {
    return this.prisma.video.findMany({
      where: { isActive: true, authorVideo: { isActive: true } },
      take: query.limit,
      skip: query.offset,
      orderBy:
        query.sort === 'popular'
          ? [{ likesCount: 'desc' }, { id: 'desc' }]
          : [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        name: true,
        alias: true,
        Title: true,
        Description: true,
        embed_link: true,
        cover_image_url: true,
        createdAt: true,
        updated_at: true,
        duration: true,
        view_count: true,
        comment_count: true,
        likesCount: true,
        width: true,
        height: true,
        userId: true,
        authorVideo: {
          select: {
            id: true,
            login: true,
            avatar: true,
            authorUrl: true,
            subscribers_count: true,
          },
        },
        tag: { select: { tag: { select: { id: true, name: true } } } },
        music: { select: { music_url: true } },
        secondCategory: { select: { name: true, alias: true } },
      },
    });
  }
}
