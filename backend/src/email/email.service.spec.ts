import { EmailService } from './email.service';
import * as nodemailer from 'nodemailer';
describe('EmailService transport isolation', () => {
  const original = { ...process.env };
  afterEach(() => { process.env = { ...original }; jest.restoreAllMocks(); });
  it('never creates a transport in tests even if outbound email was enabled', async () => {
    process.env.NODE_ENV = 'test';
    process.env.EMAIL_ENABLED = 'true';
    process.env.SMTP_URL = 'smtp://production.invalid';
    const spy = jest.spyOn(nodemailer, 'createTransport');
    await new EmailService().sendEmailIsExist({ email: 'demo@example.test' } as any, 'test-token');
    expect(spy).not.toHaveBeenCalled();
  });
  it('does not enable outbound email by default', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.EMAIL_ENABLED;
    const spy = jest.spyOn(nodemailer, 'createTransport');
    await new EmailService().sendEmailIsExist({ email: 'demo@example.test' } as any, 'test-token');
    expect(spy).not.toHaveBeenCalled();
  });
  it('supports the current nodemailer API with an in-memory transport', async () => {
    const result = await nodemailer.createTransport({ jsonTransport: true }).sendMail({
      from: 'noreply@example.test', to: 'demo@example.test', subject: 'Synthetic', text: 'test',
    });
    expect(JSON.parse(result.message.toString()).subject).toBe('Synthetic');
  });
});
