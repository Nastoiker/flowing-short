import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SensitiveFieldsInterceptor } from './security/sensitive-fields.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.disable('x-powered-by');
  app.useGlobalInterceptors(new SensitiveFieldsInterceptor());
  if (process.env.CORS_ORIGIN) {
    app.enableCors({ origin: process.env.CORS_ORIGIN.split(','), credentials: true });
  }
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT || 8000), '0.0.0.0');
}
bootstrap().catch(() => { console.error('Application startup failed'); process.exit(1); });
