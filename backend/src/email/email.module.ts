import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { EmailService } from './email.service';
@Module({
  imports: [MailerModule.forRoot({
    transport: process.env.EMAIL_ENABLED === 'true' && process.env.NODE_ENV !== 'test'
      ? process.env.SMTP_URL
      : { jsonTransport: true },
    defaults: { from: process.env.SMTP_FROM || 'noreply@example.test' },
  })],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
