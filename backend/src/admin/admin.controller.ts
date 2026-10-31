import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { AdminJwtAuthGuard } from '../auth/guards/admin.guard';
import { CreateReportDto } from './dto/create-report.dto';
import { Prisma, UserModel } from '@prisma/client';
import { UserService } from '../user/user.service';
import {
  createFirstCategoryDto,
  createSecondCategoryDto,
} from '../category/dto/create-category.dto';
import { CategoryService } from '../category/category.service';
import {VideoService} from "../video/video-service";

@Controller('admin')
@UseGuards(AdminJwtAuthGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly userService: UserService,
    private readonly categoryService: CategoryService,
    private readonly videoService: VideoService,
  ) {}
  @UseGuards(AdminJwtAuthGuard)
  @Post('addAdmin')
  createAdmin(@Body() { id }: { id: string }) {
    return this.adminService.createAdmin(id);
  }
  @UseGuards(AdminJwtAuthGuard)
  @Post('addAdmin')
  videoWithReport(@Body() { id }: { id: string }) {
    return this.adminService.createAdmin(id);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Get('users')
  getAllUsers() {
    return this.userService.users({});
  }
  @UseGuards(AdminJwtAuthGuard)
  @Get('videoReports')
  videoReports() {
    return this.videoService.videoReports();
  }
  @UseGuards(AdminJwtAuthGuard)
  @Post('banAdmin')
  banAdmin(@Body() { id }: { id: string }) {
    return this.adminService.removeAdminAbility(id);
  }
  @UseGuards(AdminJwtAuthGuard)
  @Post('unBanUser')
  unBanUser(@Body() { id }: { id: string }) {
    return this.adminService.unBanOne(id);
  }
  @UseGuards(AdminJwtAuthGuard)
  @Post('removeAdmin')
  removeAdminAbility(@Body() { id }: { id: string }) {
    return this.adminService.removeAdminAbility(id);
  }

  @Get('banUser:id')
  babOneUser(@Param('id') id: string) {
    return this.adminService.banOne(id);
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateAdminDto: UpdateAdminDto) {
  //   return this.adminService.update(+id, updateAdminDto);
  // }
  @UseGuards(AdminJwtAuthGuard)
  @Post('createFirstCategory')
  createFirstCategory(
    @Req() query,
    @Body() createFirstCategory: createFirstCategoryDto,
  ) {
    return this.categoryService.createFirstCategory(createFirstCategory);
  }
  @UseGuards(AdminJwtAuthGuard)
  @Post('createSecondCategory')
  createSecondCategory(@Body() createSecondCategory: createSecondCategoryDto) {
    return this.categoryService.createSecondCategory(createSecondCategory);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Delete('deleteFirstCategory')
  deleteFirstCategory(@Body() id: { id: string }) {
    return this.categoryService.deleteFirstCategory(id.id);
  }

  @Delete('deleteSecondCategory:id') deleteSecondCategory(
    @Param('id') id: { id: string },
  ) {
    return this.categoryService.deleteFirstCategory(id.id);
  }
  @Delete('Video:id')
  removeVideo(@Param('id') id: string) {
    return this.adminService.removeVideo(id);
  }
}
