import { Injectable } from '@nestjs/common';
import { CreateEmailDto } from './dto/create-email.dto';
import { UpdateEmailDto } from './dto/update-email.dto';
import { UserModel } from '@prisma/client';
import { createTransport } from 'nodemailer';
import { EMAILWELCOMEMESSAGE } from './email.constants';

@Injectable()
export class EmailService {

  async create(createEmailDto: CreateEmailDto) {
    return 'This action adds a new email';
  }
  async sendEmailIsExist(user: UserModel, token: string) {
    if (process.env.NODE_ENV === 'test' || process.env.EMAIL_ENABLED !== 'true') return;
    if (!process.env.SMTP_URL) throw new Error('SMTP_URL is required when email is enabled');
    await createTransport(process.env.SMTP_URL).sendMail({
      from: process.env.SMTP_FROM || 'noreply@example.test',
      to: user.email,
      // from: '"Support Team" <support@example.com>', // override default from
      subject: 'Welcome to Nice App! Confirm your Email',
      text: EMAILWELCOMEMESSAGE,
      html: `<code>${token}</code>`,
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
