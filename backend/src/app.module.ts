import { SocialModule } from './social/social.module';
import { PrismaModule } from './prisma/prisma.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VideoService } from './video/video-service';
import { PrismaService } from './prisma/prisma-service';
import { VideoModule } from './video/video.module';
import { ConvertVideoModule } from './convert-video/convert-video.module';
import { EmailModule } from './email/email.module';
import { UserModule } from './user/user.module';
import { MusicModule } from './music/music.module';
import { CategoryModule } from './category/category.module';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { CommentModule } from './comment/comment.module';

@Module({
  imports: [
    PrismaModule,
    SocialModule,
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: process.env.NODE_ENV === 'test' }),
    HealthModule,
    VideoModule,
    ConvertVideoModule,
    EmailModule,
    UserModule,
    MusicModule,
    CategoryModule,
    AdminModule,
    AuthModule,
    CommentModule,
  ],
  controllers: [AppController],
  providers: [AppService, VideoService],
})
export class AppModule {}
