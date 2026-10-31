import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma-service';
import {
  Prisma,
  UserModel,
  Video,
  Comment,
  Tag,
  HistoryWatching,
} from '@prisma/client';
import { createVideoDto } from './dto/create-video.dto';
import { unlink, writeFile } from 'fs-extra';
import { path } from 'app-root-path';
import { VideoReportDto } from './dto/report-video.dto';
import { mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { SecondLevelCategory } from '../category/entities/category.entity';
import * as ffmpeg from 'fluent-ffmpeg';
import {ReportOnVideo, TagOnVideo} from './entities/video.entity';
interface tagsOnVideo {
  tag: { connect: { id: string } };
}

@Injectable()
export class VideoService {
  constructor(private prisma: PrismaService) {}
  async video(
    userWhereUniqueInput: Prisma.VideoWhereUniqueInput,
  ): Promise<Video | null> {
    return this.prisma.video.findUnique({
      where: userWhereUniqueInput,
    });
  }
  async getSimilarUsers(userId: string) {
    const userViewed = await this.prisma.historyWatching.findMany({
      where: { userId },
      select: { videoId: true },
    });
    const users = await this.prisma.userModel.findMany({
      where: { NOT: { id: userId } },
      include: { watching: true },
    });
    // const video = await this.prisma.video.findMany({where: { id: { in: user.map( v => v.videoId)}} })
    const usersWithMatchingVideos = users
      .filter((user) => user.id !== userId)
      .filter((user) =>
        this.some(user.watching, (v) => userViewed.includes(v)),
      );
    return usersWithMatchingVideos;
  }
  some<T>(arr: T[], callback: (item: T) => boolean): boolean {
    for (let i = 0; i < arr.length; i++) {
      if (callback(arr[i])) {
        return true;
      }
    }
    return false;
  }
  async watchVideo(
    userId: string | null,
    videoId: string,
  ): Promise<HistoryWatching> {
    if (typeof videoId !== 'string' || !videoId || videoId.length > 128) throw new BadRequestException('Invalid video identifier');
    return this.prisma.write(async tx => {
      if (!(await tx.video.findFirst({ where: { id: videoId, isActive: true }, select: { id: true } }))) throw new NotFoundException('Video not found');
      const history = await tx.historyWatching.create({ data: { userId: userId || null, videoId } });
      await tx.video.update({ where: { id: videoId }, data: { view_count: { increment: 1 } } });
      return history;
    });
  }

  async getVideoByTag(tagName) {
    const tag = await this.prisma.tag.findUnique({
      where: {
        name: `#${tagName}`,
      },
      select: {
        id: true,
      },
    });
    if (!tag) return [];
    const tags = await this.prisma.tagOnVideo.findMany({
      where: {
        tagId: tag.id,
      },
      include: {
        video: {
          include: {
            music: true,
            tag: { include: { tag: true } },
            authorVideo: { include: { folowers: true } },
            secondCategory: true,
            likes: true,
            Comment: true,
            watchers: true,
          },
        },
      },
    });
    return tags.map((t) => t.video);
  }
  async videosRecom(userId: string): Promise<Video[]> {
    const user = await this.prisma.historyWatching.findMany({
      where: { userId },
      select: { videoId: true },
    });
    // return this.getSimilarUsers(userId);
    const video = await this.prisma.video.findMany({
      where: { id: { in: user.map((v) => v.videoId) } },
    });
    return this.prisma.video.findMany({
      include: {
        music: true,
        tag: { include: { tag: true } },
        authorVideo: { include: { folowers: true } },
        secondCategory: true,
        likes: true,
        Comment: true,
        watchers: true,
      },
    });
  }
  async reportVideo(report: VideoReportDto) {
    return this.prisma.reportOnVideo.create({
      data: {
        ...report,
      },
    });
  }
  async reports() {
    return this.prisma.reportVideo.findMany({
     where: {}
    });
  }
  async videos(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.VideoWhereUniqueInput;
    where?: Prisma.VideoWhereInput;
    orderBy?: Prisma.VideoOrderByWithRelationInput;
  }): Promise<Video[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.video.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      include: {
        music: true,
        tag: { include: { tag: true } },
        authorVideo: { include: { folowers: true } },
        secondCategory: true,
        likes: true,
        Comment: true,
        watchers: true,
      },
    });
  }
  async tags(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.VideoWhereUniqueInput;
    where?: Prisma.VideoWhereInput;
    orderBy?: Prisma.VideoOrderByWithRelationInput;
  }): Promise<Tag[]> {
    const { skip, take, cursor, where, orderBy } = params;
    const tags = await this.prisma.tag.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      include: { videos: true },
    });
    return tags.sort((a, b) => b.videos.length - a.videos.length);
  }
  async GetSearchTags(name) {
    const tags = await this.prisma.tag.findMany({
      where: {
        name: {
          startsWith: `#${name}`,
        },
      },
      select: { id: true },
    });
    const videos = await this.prisma.tagOnVideo.findMany({
      where: {
        tagId: {
          in: tags.map((t) => t.id),
        },
      },
      include: {
        video: {
          include: {
            music: true,
            tag: { include: { tag: true } },
            authorVideo: { include: { folowers: true } },
            secondCategory: true,
            likes: true,
            Comment: true,
            watchers: true,
          },
        },
      },
    });
    return videos.map((v) => v.video);
  }
  async videosByCategory(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.SecondLevelCategoryWhereUniqueInput;
    where?: Prisma.SecondLevelCategoryWhereInput;
    orderBy?: Prisma.SecondLevelCategoryOrderByWithRelationInput;
  }) {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.secondLevelCategory.findFirst({
      where,
      include: {
        videos: {
          include: {
            music: true,
            tag: { include: { tag: true } },
            authorVideo: { include: { folowers: true } },
            secondCategory: true,
            likes: true,
            Comment: true,
            watchers: true,
          },
        },
      },
    });
  }
  async createVideo(
    file: Express.Multer.File,
    data: createVideoDto,
    videopath: string,
  ): Promise<Video> {
    data.alias = randomUUID();
    const UploadFolder = `${path}/uploads/users/${data.userId}/video/${data.alias}`;
    setTimeout(() => {}, 100);
    mkdirSync(`${UploadFolder}`, { recursive: true });
    let { tagId, ...videoDto } = data;
    tagId = tagId.replace(' ', '');
    const strArr = tagId.split(',');
    console.log('lenght ' + strArr);
    const tagIdArr: Tag[] = [];
    const setTags: tagsOnVideo[] = [];
    for (const id of strArr) {
      const checkExistTag = await this.prisma.tag.findUnique({
        where: { name: id },
        select: { id: true, name: true },
      });
      if (!checkExistTag) {
        console.log(checkExistTag);
        const tag = await this.prisma.tag.create({
          data: { name: id },
          select: { id: true, name: true },
        });
        tagIdArr.push(tag);
      } else {
        tagIdArr.push(checkExistTag);
      }
    }

    for (const { id } of tagIdArr) {
      setTags.push({ tag: { connect: { id: id } } });
    }
    videoDto.duration = 0;
    videoDto.isActive = true;
    videoDto.cover_image_url = '';
    videoDto.width = 1080;
    videoDto.height = 1920;
    const extension = file.originalname.split('.');
    await new Promise((resolve, reject) => {
      ffmpeg(videopath)
        .output(
          `${UploadFolder}/${videoDto.alias}.${
            extension[extension.length - 1]
          }`,
        )
          .noAudio()
        .size('720x1280')
        .aspect('9:16')
        .autopad(true, 'black')
        .videoCodec('libx264')
        .on('end', () => {
          console.log('file has been converted successfully');
          resolve('');
        })
        .on('error', (err) => {
          console.log(`an error happened: ${err.message}`);
          reject(`an error happened: ${err.message}`);
        })
        .run();
    });
    unlink(videopath);
    videoDto.embed_link = `/users/${data.userId}/video/${data.alias}/${
      data.alias
    }.${extension[extension.length - 1]}`;
    console.log(videoDto);
    const {
      name,
      alias,
      embed_link,
      userId,
      share_count,
      Type,
      embed_html,
      duration,
      musicId,
      isActive,
      cover_image_url,
      Description,
      height,
      width,
      Title,
      share_url,
      secondCategoryId,
    } = videoDto;
    return this.prisma.video.create({
      data: {
        name,
        share_count,
        embed_html,
        duration,
        musicId,
        alias,
        embed_link,
        userId,
        isActive,
        Description,
        cover_image_url,
        height,
        Type,
        width,
        secondCategoryId,
        Title,
        share_url,
        tag: { create: [...setTags] },
      },
    });
  }
  async getSearch(value: string): Promise<Video[]> {
    return this.prisma.video.findMany({
      where: {
        OR: [
          {
            name: {
              startsWith: value,
            },
          },
          { alias: { startsWith: value } },
        ],
      },
      include: {
        music: true,
        tag: { include: { tag: true } },
        authorVideo: { include: { folowers: true } },
        secondCategory: true,
        likes: true,
        Comment: true,
        watchers: true,
      },
    });
  }
  async videoReports() {
    const arr = await  this.prisma.reportOnVideo.findMany({
      include: {
        report: true,
        video: {
          include: {
            music: true,
            tag: { include: { tag: true } },
            authorVideo: { include: { folowers: true } },
            secondCategory: true,
            likes: true,
            Comment: true,
            watchers: true,
          }
        },
        user: true,
      },
    });
    return arr.reduce((acc, cur) => {
      const hasDuplicate = acc.find((item) => item.video && item.video.name === cur.video.name);
      if (!hasDuplicate) {
        acc.push(cur);
      }
      return acc;
    }, []);
  }

  async updateVideo(params: {
    where: Prisma.VideoWhereUniqueInput;
    data: Prisma.VideoUpdateInput;
  }): Promise<Video> {
    const { where, data } = params;
    return this.prisma.video.update({
      data,
      where,
    });
  }

  async commentsVideo(videoId: string): Promise<Comment[] | null> {
    return this.prisma.comment.findMany({
      where: {
        videoId,
      },
      include: { writtenBy: true, userComments: { include: { user: true } } },
    });
  }
  async deleteMusic(id: string, ownerId?: string) {
    const music = await this.prisma.music.findUnique({ where: { id } });
    if (!music) throw new NotFoundException();
    if (ownerId && music.userId !== ownerId) throw new ForbiddenException();
    //  const deletePath = pathDelete.split('/')
    //  deletePath.pop();
    // const finishPath = deletePath.join('/');
    //   unlink( path +  '/'+  pathDelete);
    if (!music) return null;
    return await this.prisma.music.delete({
      where: { id },
    });
  }
  async deleteVideo(id: string, ownerId?: string) {
    const video = await this.prisma.video.findUnique({ where: { id } });
    if (!video) throw new NotFoundException();
    if (ownerId && video.userId !== ownerId) throw new ForbiddenException();
    //  const deletePath = pathDelete.split('/')
    //  deletePath.pop();
    // const finishPath = deletePath.join('/');
    //   unlink( path +  '/'+  pathDelete);
    if (!video) return null;
    return await this.prisma.video.delete({
      where: { id },
    });
  }
}
