import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { PrismaService } from '../prisma/prisma-service';
import { UserService } from '../user/user.service';
import { CategoryService } from '../category/category.service';
import {VideoService} from "../video/video-service";

@Module({
  controllers: [AdminController],
  providers: [AdminService, UserService, CategoryService, VideoService],
})
export class AdminModule {}
