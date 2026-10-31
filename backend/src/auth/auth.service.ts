import {BadRequestException, ConflictException, Injectable, InternalServerErrorException, UnauthorizedException} from '@nestjs/common';
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
import { RegisterAccount } from '../identity/application/register-account';
import { normalizeEmail, RegistrationViolation, AccountAlreadyExists } from '../identity/domain/registration';
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly registerAccount: RegisterAccount,
  ) {}
  async createUser(dto: CreateUserDto) {
    try { return await this.registerAccount.execute(dto); }
    catch (error) {
      if (error?.code === 'P2002' || error instanceof AccountAlreadyExists) throw new ConflictException('Account already exists');
      if (error instanceof RegistrationViolation) throw new BadRequestException(error.message);
      throw new InternalServerErrorException('Registration unavailable');
    }
  }
  async findUser(email: string): Promise<UserModel | null> {
    const exact = await this.prisma.userModel.findFirst({ where: { email: email.trim() } });
    if (exact) return exact;
    // Existing databases may contain case-distinct accounts. Never merge them or
    // authenticate an ambiguous case-folded match; their exact email still works.
    const matches = await this.prisma.$queryRaw<Array<{ id: string }>>`SELECT id FROM UserModel WHERE lower(email) = ${normalizeEmail(email)} LIMIT 2`;
    return matches.length === 1 ? this.prisma.userModel.findUnique({ where: { id: matches[0].id } }) : null;
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
