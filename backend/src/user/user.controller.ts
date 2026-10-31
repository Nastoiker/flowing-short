import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UploadedFile,
  ParseFilePipeBuilder,
  HttpStatus,
  UseInterceptors,
  UseGuards,
  Query,
  Req,
  BadRequestException,
  ForbiddenException,
  UsePipes,
  ValidationPipe,
  NotFoundException,
  UploadedFiles,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  AnyFilesInterceptor,
  FileInterceptor,
  FilesInterceptor,
} from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { CreateCommentDto } from './dto/createComment-dto';
import { LikeCommentDto } from './dto/likeComment-dto';
import { VideoService } from '../video/video-service';
import { CreateCommentOnUserDto } from '../comment/dto/create-comment.dto';
import { CommentService } from '../comment/comment.service';
import { IdValidationpipe } from '../pipes/idValidation.pipe';
import {VideoByIdNotFount, VideoIdNotFoundForUpd} from '../video/video.constants';
import { MusicService } from '../music/music.service';
import { CreateMusicDto } from '../music/dto/create-music.dto';
import { createVideoDto } from '../video/dto/create-video.dto';
import { path } from 'app-root-path';
import { writeFile, ensureDir } from 'fs-extra';
import { randomUUID } from 'crypto';
import * as ffmpeg from 'fluent-ffmpeg';
import multer from 'multer';
import {VideoReportDto} from "../video/dto/report-video.dto";

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly videoService: VideoService,
    private readonly commentService: CommentService,
    private readonly musicService: MusicService,
  ) {}

  // @Post('/createComment')
  // @UseGuards(JwtAuthGuard)
  // createComment(@Body() commentDto: CreateCommentDto) {
  //   return this.userService.createComment(commentDto);
  // }
  @UseGuards(JwtAuthGuard)
  @Post('createMusic')
  @UseInterceptors(AnyFilesInterceptor({ limits: { fileSize: 20 * 1024 * 1024, files: 2 } }))
  createMusic(
    @Req() query,
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Body() createMusicDto: CreateMusicDto,
  ) {
    createMusicDto.userId = query.user.id;
    return this.musicService.create(files[0], files[1], createMusicDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('createComment')
  createComment(@Req() request, @Body() createCommentDto: CreateCommentDto) {
    createCommentDto.writtenById = request.user.id;
    return this.commentService.createCommentDto(createCommentDto);
  }
  // @Get('follows:id')
  // async getFollowing(@Param('id') id: string) {
  //
  //   const userId = id.slice(1,id.length);
  //   const folows = await this.userService.getFolows(userId);
  //   if(!folows) {
  //     return new BadRequestException('failed');
  //   }
  //   return folows;
  // }
  @UseGuards(JwtAuthGuard)
  @Get('recomendation')
  async videosRecom(@Req() request) {
    const user = request.user.id;
    const product = await this.videoService.videosRecom(user);
    if (!product) {
      throw new NotFoundException(VideoByIdNotFount);
    }

    return product;
  }

  @Get('follows')
  @UseGuards(JwtAuthGuard)
  async getFollowing(@Req() req) {
    const userId = req.user.id;
    const folows = await this.userService.getFolows(userId);
    if (!folows) {
      return new BadRequestException('failed');
    }
    return folows;
  }
  @Post('/likeComment')
  @UseGuards(JwtAuthGuard)
  likeComment(@Body() likeCommentDto: LikeCommentDto) {
    return this.userService.likeComment(likeCommentDto);
  }
  @UseGuards(JwtAuthGuard)
  @Post('videoWatch')
  async WatchVideo(@Req() request, @Body() { videoId }: { videoId: string }) {
    const user = request.user?.id;
    const product = await this.videoService.watchVideo(user, videoId);
    if (!product) {
      throw new NotFoundException(VideoByIdNotFount);
    }

    return product;
  }
  @Post('createTag')
  @UseGuards(JwtAuthGuard)
  createTag(@Body() dto: { name: string }) {
    return this.userService.createTag(dto.name);
  }
  @Post('updateAvatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async updateAvatar(
    @Req() query,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 5242880 })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    avatar: Express.Multer.File,
  ) {
    return this.userService.updateAvatar(query.user, avatar);
  }
  @Patch('updateProfile')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async updateProfile(
    @Req() query,
    @UploadedFile()
    avatar: Express.Multer.File,
    @Body() body: UpdateUserDto,
  ) {
    return this.userService.updateProfile(query.user, avatar, body);
  }
  @Get()
  findAll() {
    return this.userService.users({});
  }
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.user({ id });
  }
  @Post('likeVideo')
  @UseGuards(JwtAuthGuard)
  likeVideo(@Req() query, @Body() { videoId }: { videoId: string }) {
    const userId = query.user.id;
    return this.userService.like(userId, videoId);
  }

  @Post('followChannel')
  @UseGuards(JwtAuthGuard)
  followChannel(@Req() query, @Body() { authorId }: { authorId: string }) {
    const userId = query.user.id;
    return this.userService.followChannel(userId, authorId);
  }
  @UseGuards(JwtAuthGuard)
  @Post('ReportOnVideo')
  async reportOnVideo(@Req() request, @Body() dto: VideoReportDto) {
    dto.userId = request.user.id;
    const reportVideo = await this.videoService.reportVideo(dto);
    if (!reportVideo) {
      throw new NotFoundException(VideoIdNotFoundForUpd);
    }
    return reportVideo;
  }
  @Post('unfollowChannel')
  @UseGuards(JwtAuthGuard)
  unfollowChannel(
    @Req() query,
    @Body() { id, authorId }: { id: string; authorId: string },
  ) {
    const userId = query.user.id;
    if (!userId) return;
    return this.userService.unfollowChannel(id, userId, authorId);
  }
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  update(@Req() request, @Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    if (request.user.id !== id) throw new ForbiddenException();
    return this.userService.updateProfile(request.user, undefined, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Req() request, @Param('id') id: string) {
    if (request.user.id !== id) throw new ForbiddenException();
    return this.userService.deleteUser({ id });
  }
  @Delete('/deleteVideo/:id')
  @UseGuards(JwtAuthGuard)
  DeleteVideo(@Req() request, @Param('id') id: string) {
    const videoId = id.replace(/^:/, '');
    return this.videoService.deleteVideo(videoId, request.user.id);
  }
  @Delete('/deleteMusic/:id')
  @UseGuards(JwtAuthGuard)
  DeleteMusic(@Req() request, @Param('id') id: string) {
    const musicId = id.replace(/^:/, '');
    return this.videoService.deleteMusic(musicId, request.user.id);
  }
  @UseGuards(JwtAuthGuard)
  @Post('createCommentOnUser')
  createUserComment(
    @Req() request,
    @Body() createCommentOnUserDto: CreateCommentOnUserDto,
  ) {
    createCommentOnUserDto.userId = request.user.id;
    return this.commentService.createCommentOnUserDto(createCommentOnUserDto);
  }

  @Get('/search/:search')
  async getSearch(@Param('search', IdValidationpipe) search: string) {
    const searchValue = search.slice(1, search.length);
    const product = await this.userService.getSearch(searchValue);
    if (!product) {
      throw new NotFoundException(VideoByIdNotFount);
    }
    return product;
  }
  @UseGuards(JwtAuthGuard)
  @Post('createVideo')
  @UseInterceptors(FileInterceptor('files', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async createVideo(
    @Req() request,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: 'mp4',
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    video: Express.Multer.File,
    @Body() dto: createVideoDto,
  ) {
    if (!video) {
      throw new BadRequestException('Please upload a video file.');
    }
    if (video.mimetype !== 'video/mp4') {
      throw new BadRequestException('Only MP4 videos are allowed.');
    }
    dto.userId = request.user.id;
    const inputPath = video.path;
    const outputPath = `${inputPath}.mp4`;
    const UploadFolder = `${path}/uploads/videos`;
    await ensureDir(`${UploadFolder}/converted`);
    video.originalname = `${randomUUID()}.mp4`;
    await writeFile(`${UploadFolder}/${video.originalname}`, video.buffer);
    const videopath = `${UploadFolder}/${video.originalname}`;
    await new Promise((resolve, reject) => {
      ffmpeg(videopath)
        .output(UploadFolder + '/converted/' + video.originalname)
        .audioCodec('copy')
        .audioChannels(2)
        .size('1080x1920')
        .aspect('9:16')
        .autopad(true, 'black')
        .videoCodec('libx264')
        .on('end', () => {
                resolve('');
        })
        .on('error', (err) => {
                reject(`an error happened: ${err.message}`);
        })
        .run();
    });

    dto.embed_link = UploadFolder + '/converted/' + video.originalname;
    // возвращаем URL конвертированного файла
    return this.videoService.createVideo(video, dto, videopath);
  }
}
