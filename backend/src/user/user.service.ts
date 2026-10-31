import { SocialGraph } from '../social/application/social-graph';
import { SocialViolation } from '../social/domain/relationships';
import { identityEvent, validatePassword, normalizeDisplayName } from '../identity/domain/registration';
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
  constructor(private prisma: PrismaService, private readonly social: SocialGraph) {}
  private async socialAction(action: () => Promise<unknown>): Promise<any> {
    try { return await action(); } catch(error) {
      if (error instanceof SocialViolation) {
        if(error.code === 'missing') throw new NotFoundException(error.message);
        if(error.code === 'forbidden') throw new ForbiddenException(error.message);
        throw new BadRequestException(error.message);
      } throw error;
    }
  }
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
    return this.socialAction(() => this.social.toggleLike(likeById, videoId));
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
    if (update.login !== undefined) {
      try { data.login = normalizeDisplayName(update.login); }
      catch (error) { throw new BadRequestException(error.message); }
    }
    if (update.password) {
      try { validatePassword(update.password); } catch (error) { throw new BadRequestException(error.message); }
      if (!update.oldpassword || !(await compare(update.oldpassword, user.hashpassword))) {
        throw new UnauthorizedException('Current password is incorrect');
      }
      data.hashpassword = await hash(update.password, 10);
    }
    if (file) await this.updateAvatar(user, file);
    return this.prisma.write(async tx => {
      const updated = await tx.userModel.update({ where: { id: user.id }, data: {
        ...data, ...(data.login !== undefined ? { identityVersion: { increment: 1 } } : {}),
      } });
      if (data.login !== undefined) {
        const event = identityEvent('user.profile.updated.v1', randomUUID(), updated, new Date());
        await tx.outboxEvent.create({ data: { id: event.eventId, aggregateId: updated.id, payload: JSON.stringify(event) } });
      }
      return updated;
    });
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
    return this.socialAction(() => this.social.unfollow(id, userId, authorId));
  }
  async followChannel(userId: string, authorId: string) {
    return this.socialAction(() => this.social.follow(userId, authorId));
  }
  async deleteUser(
    where: Prisma.UserModelWhereUniqueInput,
  ): Promise<UserModel> {
    return this.prisma.userModel.delete({
      where,
    });
  }
}
