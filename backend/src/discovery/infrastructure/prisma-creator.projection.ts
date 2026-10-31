import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma-service';
import { CreatorProjection } from '../application/project-creator';
import {
  DirectoryEvent,
  InvalidIdentityMessage,
} from '../domain/identity-message';
@Injectable()
export class PrismaCreatorProjection implements CreatorProjection {
  constructor(private readonly prisma: PrismaService) {}
  applyOnce(event: DirectoryEvent): Promise<boolean> {
    return this.prisma.write(async (tx) => {
      if (await tx.eventInbox.findUnique({ where: { eventId: event.eventId } }))
        return false;
      let profile = event.profile;
      let aggregateVersion = event.aggregateVersion;
      if (!profile) {
        // Compatibility adapter for the old event payload. New events are self-contained.
        const legacy = await tx.userModel.findUnique({
          where: { id: event.userId },
          select: { login: true, authorUrl: true, identityVersion: true },
        });
        if (!legacy) throw new InvalidIdentityMessage('legacy_account_missing');
        profile = { displayName: legacy.login, authorUrl: legacy.authorUrl };
        aggregateVersion = legacy.identityVersion;
      }
      const occurredAt = event.occurredAt
        ? new Date(event.occurredAt)
        : new Date();
      const existing = await tx.creatorDirectory.findUnique({
        where: { userId: event.userId },
      });
      const registeredAt =
        existing &&
        (event.type !== 'user.registered.v1' ||
          existing.registeredAt < occurredAt)
          ? existing.registeredAt
          : occurredAt;
      await tx.creatorDirectory.upsert({
        where: { userId: event.userId },
        create: {
          userId: event.userId,
          ...profile,
          registeredAt,
          updatedAt: occurredAt,
          aggregateVersion,
        },
        update: {
          registeredAt,
          ...(existing && existing.aggregateVersion >= aggregateVersion
            ? {}
            : { ...profile, updatedAt: occurredAt, aggregateVersion }),
        },
      });
      // Offset acknowledgment happens later. A crash after commit is safely deduplicated on replay.
      await tx.eventInbox.create({ data: { eventId: event.eventId } });
      return true;
    });
  }
}
