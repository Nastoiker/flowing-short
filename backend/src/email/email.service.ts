import { Injectable } from '@nestjs/common';
import { CreateEmailDto } from './dto/create-email.dto';
import { UpdateEmailDto } from './dto/update-email.dto';
import { UserModel } from '@prisma/client';
import { MailerService } from '@nestjs-modules/mailer';
import Mail from 'nodemailer/lib/mailer';
import { EMAILWELCOMEMESSAGE } from './email.constants';
import { code } from 'telegraf/format';

@Injectable()
export class EmailService {
  constructor(private readonly mailerService: MailerService) {}
  async create(createEmailDto: CreateEmailDto) {
    return 'This action adds a new email';
  }
  async sendEmailIsExist(user: UserModel, token: string) {
    if (process.env.NODE_ENV === 'test' || process.env.EMAIL_ENABLED !== 'true') return;
    await this.mailerService.sendMail({
      to: user.email,
      // from: '"Support Team" <support@example.com>', // override default from
      subject: 'Welcome to Nice App! Confirm your Email',
      text: EMAILWELCOMEMESSAGE,
      html: `<code>${token}</code>`,
      context: {
        // ✏️ filling curly brackets with content
        name: user.login,
      },
    });
  }
  findAll() {
    return `This action returns all email`;
  }

  findOne(id: number) {
    return `This action returns a #${id} email`;
  }

  update(id: number, updateEmailDto: UpdateEmailDto) {
    return `This action updates a #${id} email`;
  }

  remove(id: number) {
    return `This action removes a #${id} email`;
  }
}
