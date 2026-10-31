import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma-service';
@Controller('creators')
export class DiscoveryController {
  constructor(private readonly prisma: PrismaService) {}
  @Get()
  async recent(@Query('limit') input = '12') {
    if (!/^\d+$/.test(input) || Number(input) < 1 || Number(input) > 30)
      throw new BadRequestException('limit must be between 1 and 30');
    const limit = Number(input);
    // Compose the discovery projection with current account visibility. A banned or
    // deleted account must never remain publicly discoverable because of event lag.
    return this.prisma.$queryRaw`
      SELECT d.userId, d.displayName, d.authorUrl, u.avatar, d.registeredAt
      FROM CreatorDirectory d JOIN UserModel u ON u.id = d.userId
      WHERE u.isActive = true ORDER BY d.registeredAt DESC, d.userId DESC LIMIT ${limit}`;
  }
}
