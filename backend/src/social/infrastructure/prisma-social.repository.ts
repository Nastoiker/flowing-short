import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma-service';
import { SocialRepository } from '../application/social-graph';
import {
  SocialViolation,
  followTransition,
  unfollowTransition,
  likeTransition,
} from '../domain/relationships';

@Injectable()
export class PrismaSocialRepository implements SocialRepository {
  constructor(private readonly prisma: PrismaService) {}
  follow(userId: string, authorId: string) {
    return this.prisma.write(async (tx) => {
      if (
        !(await tx.userModel.findFirst({
          where: { id: authorId, isActive: true },
        }))
      )
        throw new SocialViolation('missing', 'Channel not found');
      const existing = await tx.folower.findUnique({
        where: { userId_authorId: { userId, authorId } },
      });
      const decision = followTransition(existing?.folow || false);
      if (!decision.delta) return existing;
      const follow = await tx.folower.upsert({
        where: { userId_authorId: { userId, authorId } },
        create: { userId, authorId },
        update: { folow: true },
      });
      await tx.userModel.update({
        where: { id: userId },
        data: { following_count: { increment: decision.delta } },
      });
      await tx.userModel.update({
        where: { id: authorId },
        data: { subscribers_count: { increment: decision.delta } },
      });
      return follow;
    });
  }
  unfollow(id: string, userId: string, authorId: string) {
    return this.prisma.write(async (tx) => {
      const existing = await tx.folower.findUnique({ where: { id } });
      if (!existing) return { id, removed: true };
      if (existing.userId !== userId || existing.authorId !== authorId)
        throw new SocialViolation(
          'forbidden',
          'Relationship belongs to another account',
        );
      await tx.folower.delete({ where: { id } });
      const decision = unfollowTransition(existing.folow);
      if (decision.delta) {
        await tx.userModel.update({
          where: { id: userId },
          data: { following_count: { increment: decision.delta } },
        });
        await tx.userModel.update({
          where: { id: authorId },
          data: { subscribers_count: { increment: decision.delta } },
        });
      }
      return existing;
    });
  }
  toggleLike(userId: string, videoId: string) {
    return this.prisma.write(async (tx) => {
      const video = await tx.video.findFirst({
        where: { id: videoId, isActive: true },
        select: { userId: true },
      });
      if (!video) throw new SocialViolation('missing', 'Video not found');
      const existing = await tx.like.findUnique({
        where: { likeById_videoId: { likeById: userId, videoId } },
      });
      let result;
      const { active, delta } = likeTransition(existing?.like || false);
      if (!active) {
        result = await tx.like.delete({ where: { id: existing.id } });
      } else
        result = await tx.like.upsert({
          where: { likeById_videoId: { likeById: userId, videoId } },
          create: { likeById: userId, videoId, like: true },
          update: { like: true },
        });
      const updatedVideo = await tx.video.update({
        where: { id: videoId },
        data: { likesCount: { increment: delta } },
      });
      await tx.userModel.update({
        where: { id: video.userId },
        data: { LikeCount: { increment: delta } },
      });
      await tx.userModel.update({
        where: { id: userId },
        data: { hisLikes: { increment: delta } },
      });
      return { ...result, like: active, likesCount: updatedVideo.likesCount };
    });
  }
}
