import { IdentityModule } from '../identity/identity.module';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { getJwtConfig } from '../configs/jwt.config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStratagy } from './strategies/jwt.stratagy';
import { PrismaService } from '../prisma/prisma-service';
import { EmailModule } from '../email/email.module';

@Module({
  controllers: [AuthController],
  imports: [
    IdentityModule,
    EmailModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getJwtConfig,
    }),
    PassportModule,
  ],
  providers: [AuthService, JwtStratagy, ConfigService],
})
export class AuthModule {}
