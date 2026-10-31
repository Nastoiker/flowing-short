import { UserModel } from '@prisma/client';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma-service';

@Injectable()
export class JwtStratagy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      passReqToCallback: true,
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }
  async validate(request: Request, { email }: Pick<UserModel, 'email'>) {
    const user = await this.prisma.userModel.findUnique({
      where: { email },
    });
    // if(!user && !user.isActive) {
    //  throw   new UnauthorizedException();
    // }
    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
