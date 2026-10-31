import { Injectable, BadRequestException, UnauthorizedException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  Comment,
  Folower,
  Like,
  Prisma,
  UserModel,
  Video,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma-service';
import { ensureDir, writeFile } from 'fs-extra';
import { compare, hash } from 'bcryptjs';
import { randomUUID } from 'crypto';
import { path } from 'app-root-path';
import { Tag } from '../video/entities/video.entity';
import { CreateCommentDto } from './dto/createComment-dto';
import { LikeCommentDto } from './dto/likeComment-dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}
  async user(
    userWhereUniqueInput: Prisma.UserModelWhereUniqueInput,
  ): Promise<UserModel | null> {
    return this.prisma.userModel.findUnique({
      where: userWhereUniqueInput,
      include: {
        Comment: true,
        folowers: true,
        folowing: true,
        Like: true,
        videos: {
          include: {
            music: true,
            watchers: true,
            tag: { include: { tag: true } },
            authorVideo: { include: { folowers: true } },
            secondCategory: true,
            likes: { include: { videos: true } },
            Comment: true,
          },
        },
        music: {
          include: {
            videos: true,
            user: true,
          },
        },
      },
    });
  }
  async createComment(createVideoDto: CreateCommentDto): Promise<Comment> {
    return await this.prisma.comment.create({
      data: { ...createVideoDto },
    });
  }
  async getSearch(value: string): Promise<UserModel[]> {
    return this.prisma.userModel.findMany({
      where: { login: { startsWith: value } },
      include: {
        Comment: true,
        folowers: true,
        folowing: true,
        videos: {
          include: {
            music: true,
            tag: { include: { tag: true } },
            authorVideo: true,
            secondCategory: true,
            likes: { include: { videos: true } },
            Comment: {
              include: {
                writtenBy: true,
                userComments: { include: { user: true } },
              },
            },
          },
        },
        music: true,
      },
    });
  }
  async likeComment(likeComment: LikeCommentDto): Promise<Comment> {
    const checkExist = await this.prisma.comment.findUnique({
      where: {
        id: likeComment.commentId,
      },
      select: {
        likeCount: true,
      },
    });
    return await this.prisma.comment.update({
      where: {
        id: likeComment.commentId,
      },
      data: {
        likeCount: checkExist.likeCount + 1,
      },
    });
  }
  async getFolows(userId: string): Promise<Folower[] | null> {
    return this.prisma.folower.findMany({
      where: {
        userId,
      },
      include: {
        author: {
          include: {
            Like: {
              include: {
                videos: {
                  include: {
                    watchers: true,
                    music: true,
                    tag: { include: { tag: true } },
                    authorVideo: true,
                    secondCategory: true,
                    Comment: {
                      include: {
                        writtenBy: true,
                        userComments: { include: { user: true } },
                      },
                    },
                  },
                },
              },
            },
            videos: {
              include: {
                watchers: true,
                music: true,
                tag: { include: { tag: true } },
                authorVideo: true,
                secondCategory: true,
                Comment: {
                  include: {
                    writtenBy: true,
                    userComments: { include: { user: true } },
                  },
                },
              },
            },
            folowing: true,
            folowers: true,
            music: true,
          },
        },
      },
    });
  }
  async like(likeById: string, videoId: string): Promise<Like> {
    const checkExist = await this.prisma.like.findMany({
      where: {
        likeById,
      },
      select: { videoId: true, id: true },
    });
    let checkExistVideo = { videoId: null, likeId: null, exist: false };
    checkExist.forEach((c) => {
      if (videoId === c.videoId) {
        return (checkExistVideo = {
          videoId: c.videoId,
          likeId: c.id,
          exist: true,
        });
      }
    });

    if (checkExistVideo.exist) {
      const likesCountVideo = await this.prisma.video.findUnique({
        where: {
          id: checkExistVideo.videoId,
        },
        select: { likesCount: true, authorVideo: true },
      });
      await this.prisma.video.update({
        where: {
          id: checkExistVideo.videoId,
        },
        data: {
          likesCount: likesCountVideo.likesCount - 1,
        },
      });
      await this.prisma.userModel.update({
        where: {
          id: likesCountVideo.authorVideo.id,
        },
        data: {
          LikeCount: likesCountVideo.authorVideo.LikeCount - 1,
        },
      });
      return await this.prisma.like.delete({
        where: {
          id: checkExistVideo.likeId,
        },
      });
    }
    const likesCountVideo = await this.prisma.video.findUnique({
      where: {
        id: videoId,
      },
      select: { likesCount: true, authorVideo: true },
    });
    await this.prisma.video.update({
      where: {
        id: videoId,
      },
      data: {
        likesCount: likesCountVideo.likesCount + 1,
      },
    });
    console.log(checkExistVideo);
    await this.prisma.userModel.update({
      where: {
        id: likesCountVideo.authorVideo.id,
      },
      data: {
        LikeCount: likesCountVideo.authorVideo.LikeCount + 1,
      },
    });
    return this.prisma.like.create({
      data: {
        likeById,
        videoId,
        like: true,
      },
    });
  }

  async updateAvatar(user: UserModel, file: Express.Multer.File) {
    if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      throw new BadRequestException('Upload a JPEG, PNG or WebP image');
    }
    const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.mimetype];
    const folder = '/uploads/users/' + user.id + '/avatar';
    await ensureDir(path + folder);
    const avatar = folder + '/' + randomUUID() + '.' + extension;
    await writeFile(path + avatar, file.buffer);
    return this.prisma.userModel.update({ where: { id: user.id }, data: { avatar } });
  }
  async foundUser(login: string): Promise<UserModel[]> {
    return this.prisma.userModel.findMany({
      where: {
        login: { startsWith: login },
      },
    });
  }
  async users(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.UserModelWhereUniqueInput;
    where?: Prisma.UserModelWhereInput;
    orderBy?: Prisma.UserModelOrderByWithRelationInput;
  }): Promise<UserModel[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.userModel.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }
  async updateProfile(user: UserModel, file: Express.Multer.File | undefined, update: UpdateUserDto) {
    const data: Prisma.UserModelUpdateInput = { login: update.login, phone: update.phone };
    if (update.password) {
      if (!update.oldpassword || !(await compare(update.oldpassword, user.hashpassword))) {
        throw new UnauthorizedException('Current password is incorrect');
      }
      data.hashpassword = await hash(update.password, 10);
    }
    if (file) await this.updateAvatar(user, file);
    return this.prisma.userModel.update({ where: { id: user.id }, data });
  }
  async createUser(data: Prisma.UserModelCreateInput): Promise<UserModel> {
    return this.prisma.userModel.create({
      data,
    });
  }
  async updateUser(params: {
    where: Prisma.UserModelWhereUniqueInput;
    data: Prisma.UserModelUpdateInput;
  }): Promise<UserModel> {
    const { where, data } = params;
    return this.prisma.userModel.update({
      data,
      where,
    });
  }
  async createTag(name: string): Promise<Tag> {
    const checkExist = await this.prisma.tag.findFirst({ where: { name } });
    if (checkExist) throw Error('tag is Exist');
    return this.prisma.tag.create({ data: { name } });
  }
  async unfollowChannel(id: string, userId: string, authorId: string) {
    const existing = await this.prisma.folower.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException();
    if (existing.userId !== userId || existing.authorId !== authorId) throw new ForbiddenException();
    const folow = await this.prisma.folower.delete({
      where: {
        id,
      },
    });
    const user = await this.prisma.userModel.findUnique({
      where: {
        id: userId,
      },
      select: { following_count: true },
    });
    const author = await this.prisma.userModel.findUnique({
      where: {
        id: authorId,
      },
      select: { subscribers_count: true },
    });
    await this.prisma.userModel.update({
      where: {
        id: userId,
      },
      data: {
        following_count: user.following_count - 1,
      },
    });
    await this.prisma.userModel.update({
      where: {
        id: authorId,
      },
      data: {
        subscribers_count: author.subscribers_count - 1,
      },
    });
    return folow;
  }
  async followChannel(userId: string, authorId: string) {
    const folow = await this.prisma.folower.create({
      data: {
        userId,
        authorId,
      },
    });
    const user = await this.prisma.userModel.findUnique({
      where: {
        id: userId,
      },
      select: { following_count: true },
    });
    const author = await this.prisma.userModel.findUnique({
      where: {
        id: authorId,
      },
      select: { subscribers_count: true },
    });
    await this.prisma.userModel.update({
      where: {
        id: userId,
      },
      data: {
        following_count: user.following_count + 1,
      },
    });
    await this.prisma.userModel.update({
      where: {
        id: authorId,
      },
      data: {
        subscribers_count: author.subscribers_count + 1,
      },
    });
    return folow;
  }
  async deleteUser(
    where: Prisma.UserModelWhereUniqueInput,
  ): Promise<UserModel> {
    return this.prisma.userModel.delete({
      where,
    });
  }
}
