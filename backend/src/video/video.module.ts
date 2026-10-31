import { Module } from '@nestjs/common';
import { UserController } from '../user/user.controller';
import { UserService } from '../user/user.service';
import { PrismaService } from '../prisma/prisma-service';
import { VideoController } from './video.controller';
import { VideoService } from './video-service';
import { ServeStaticModule } from '@nestjs/serve-static';
import { path } from 'app-root-path';
import { MusicService } from '../music/music.service';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: `${path}/uploads`,
      serveRoot: '/video',
      serveStaticOptions: { dotfiles: 'deny', index: false },
    }),
  ],
  controllers: [VideoController],
  providers: [VideoService, PrismaService, UserService, MusicService],
})
export class VideoModule {}
