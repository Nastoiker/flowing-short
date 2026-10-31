import {ConflictException, Injectable, InternalServerErrorException, UnauthorizedException} from '@nestjs/common';
import { AuthDto } from './dto/auth.dto';
import { UserModel } from '@prisma/client';
import { genSalt, hash, compare } from 'bcryptjs';
import {
  USER_NOT_FOUND_ERROR,
  USER_WAS_BANNED,
  WRONG_PASSWORD_ERROR,
} from './auth.constants';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma-service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import * as fs from 'fs';
import { randomUUID } from 'crypto';
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}
  async createUser(dto: CreateUserDto) {
    try {
      const id = randomUUID();
      const hashpassword = await hash(dto.hashpassword, await genSalt(10));
      // Prepare storage before committing the account; a filesystem failure cannot leave an account
      // created behind a failed registration response.
      await Promise.all(['video', 'music', 'avatar'].map(directory =>
        fs.promises.mkdir(`uploads/users/${id}/${directory}`, { recursive: true })));
      const createdUser = await this.prisma.$transaction(async transaction => {
        const user = await transaction.userModel.create({ data: {
          id, email: dto.email, login: dto.login, authorUrl: dto.login,
          phone: dto.phone, hashpassword, role: 'user',
        } });
        const eventId = randomUUID();
        await transaction.outboxEvent.create({ data: {
          id: eventId, aggregateId: user.id,
          payload: JSON.stringify({ eventId, type: 'user.registered.v1', userId: user.id }),
        } });
        return user;
      });
      const { hashpassword: _password, ...safeUser } = createdUser;
      return safeUser;
    } catch (error) {
      if (error?.code === 'P2002') throw new ConflictException('Account already exists');
      throw new InternalServerErrorException('Registration unavailable');
    }
  }
  async findUser(email: string): Promise<UserModel | null> {
    return this.prisma.userModel.findFirst({ where: { email } });
  }
  async validateUser(
    email: string,
    password: string,
  ): Promise<Pick<UserModel, 'email'>> {
    const User = await this.findUser(email);
    if (!User) {
      throw new UnauthorizedException(USER_NOT_FOUND_ERROR);
    }
    const isCorrectUser = await compare(password, User.hashpassword);
    if (User.isActive === false) {
      throw new UnauthorizedException(USER_WAS_BANNED);
    }
    if (!isCorrectUser) {
      throw new UnauthorizedException(WRONG_PASSWORD_ERROR);
    }
    return { email: User.email };
  }
  async authByJwt(id: string) {
    const checkBanned = await this.prisma.userModel.findUnique({
      where: { id },
      select: {
        isActive: true,
      },
    });
    if (checkBanned && checkBanned.isActive === false) {
      throw new UnauthorizedException(USER_WAS_BANNED);
    }
    return this.prisma.userModel.findUnique({
      where: { id },
      include: {
        Like: {
          include: {
            videos: {
              include: {
                music: true,
                watchers: true,
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
            music: true,
            watchers: true,
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
        userComment: true,
        music: {
          include: {
            videos: true,
            user: true,
          },
        },
        watching: true,
      },
    });
  }
  async login(email: string) {
    const payLoad = { email, role: 'user' };
    return {
      accesToken: await this.jwtService.signAsync(payLoad),
    };
  }
}
