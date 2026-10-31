import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ALREADY_REGISTER_ERROR } from './auth.constants';
import { AuthService } from './auth.service';
import { AuthDto } from './dto/auth.dto';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { JwtAuthGuard } from './guards/jwt.guard';

@Controller('auth')
export class AuthController {
  userService: any;
  constructor(private readonly authService: AuthService) {}
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @HttpCode(200)
  @Post('register')
  async register(@Body() dto: CreateUserDto) {
    const oldUser = await this.authService.findUser(dto.email);
    if (oldUser) {
      throw new BadRequestException(ALREADY_REGISTER_ERROR);
    }
    dto.authorUrl = dto.login;
    return this.authService.createUser(dto);
  }
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @HttpCode(200)
  @Post('login')
  async login(@Body() { email, password }: AuthDto) {
    const some = await this.authService.validateUser(email, password);
    return this.authService.login(some.email);
  }
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @HttpCode(200)
  @Get('authByJwt')
  @UseGuards(JwtAuthGuard)
  async authByJwt(@Req() query) {
    const user = await this.authService.authByJwt(query.user.id);

    return user;
  }
}
