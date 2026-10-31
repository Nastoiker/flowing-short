import * as request from 'supertest';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { INestApplication } from '@nestjs/common';
import { SensitiveFieldsInterceptor } from '../src/security/sensitive-fields.interceptor';
import { PrismaService } from '../src/prisma/prisma-service';
import { sign } from 'jsonwebtoken';
import { mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { path } from 'app-root-path';

describe('API with isolated SQLite database', () => {
  let app: INestApplication, db: PrismaService, token: string, userId: string;
  const input = { email: 'integration@example.test', login: 'Integration user', hashpassword: 'IntegrationPassword123!' };
  beforeAll(async () => {
    if (process.env.NODE_ENV !== 'test' || !process.env.DATABASE_URL?.includes('flowing-short-test-')) throw new Error('Refusing non-isolated database');
    app = await NestFactory.create(AppModule, { logger: false });
    app.useGlobalInterceptors(new SensitiveFieldsInterceptor());
    await app.init();
    db = app.get(PrismaService);
  });
  afterAll(async () => { await app?.close(); });
  it('validates registration fields', async () => {
    await request(app.getHttpServer()).post('/auth/register').send({ ...input, email: 'bad', hashpassword: 'short' }).expect(400);
    expect(await db.userModel.count()).toBe(0);
  });
  it('registers a normal user with an outbox event and safely rejects duplicates', async () => {
    const response = await request(app.getHttpServer()).post('/auth/register').send({ ...input, role: 'admin' }).expect(200);
    userId = response.body.id;
    expect(response.body.role).toBe('user');
    expect(response.body).not.toHaveProperty('hashpassword');
    expect(await db.outboxEvent.count()).toBe(1);
    await request(app.getHttpServer()).post('/auth/register').send(input).expect(400);
    expect(await db.userModel.count()).toBe(1);
  });
  it('logs in and protects admin routes, mutations, and expired tokens', async () => {
    await request(app.getHttpServer()).post('/auth/login').send({ email: input.email, password: 'wrong' }).expect(401);
    const response = await request(app.getHttpServer()).post('/auth/login').send({ email: input.email, password: input.hashpassword }).expect(200);
    token = response.body.accesToken;
    expect(token).toBeTruthy();
    await request(app.getHttpServer()).get('/auth/authByJwt').set('Authorization', 'Bearer ' + token).expect(200);
    await request(app.getHttpServer()).get('/admin/users').set('Authorization', 'Bearer ' + token).expect(403);
    await request(app.getHttpServer()).get('/admin/banUser:other').expect(401);
    await request(app.getHttpServer()).delete('/user/' + userId).expect(401);
    await request(app.getHttpServer()).patch('/user/other').set('Authorization', 'Bearer ' + token).send({ login: 'changed' }).expect(403);
    const expired = sign({ email: input.email }, process.env.JWT_SECRET!, { expiresIn: -1 });
    await request(app.getHttpServer()).get('/auth/authByJwt').set('Authorization', 'Bearer ' + expired).expect(401);
  });
  it('prevents users from deleting another author media and rejects oversized avatars', async () => {
    await db.userModel.create({ data: { id: 'other-author', email: 'other@example.test', login: 'other', authorUrl: 'other', hashpassword: 'not-a-login' } });
    await db.firstLevelCategory.create({ data: { id: 'integration-category', name: 'Demo', alias: 'demo' } });
    await db.secondLevelCategory.create({ data: { id: 'integration-shorts', name: 'Shorts', alias: 'shorts', firstLevelId: 'integration-category' } });
    await db.video.create({ data: { id: 'other-video', name: 'Other video', alias: 'other-video', Title: 'Other', Description: '', isActive: true, duration: 1, embed_link: '/other.mp4', embed_html: '', share_url: '', cover_image_url: '', Type: 'video', width: 180, height: 320, userId: 'other-author', secondCategoryId: 'integration-shorts' } });
    await request(app.getHttpServer()).delete('/user/deleteVideo/other-video').set('Authorization','Bearer '+token).expect(403);
    await request(app.getHttpServer()).delete('/Video/other-video').set('Authorization','Bearer '+token).expect(403);
    await request(app.getHttpServer()).patch('/Video/other-video').set('Authorization','Bearer '+token).send({ name: 'hijack' }).expect(403);
    expect(await db.video.count()).toBe(1);
    await request(app.getHttpServer()).post('/user/updateAvatar').set('Authorization','Bearer '+token).attach('file', Buffer.alloc(5 * 1024 * 1024 + 1), { filename: 'large.png', contentType: 'image/png' }).expect(413);
  });
  it('accepts a bounded image upload through the updated multipart parser', async () => {
    const response = await request(app.getHttpServer()).post('/user/updateAvatar').set('Authorization', 'Bearer '+token)
      .attach('file', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+kGoYAAAAASUVORK5CYII=', 'base64'), { filename: 'avatar.png', contentType: 'image/png' }).expect(201);
    expect(response.body.avatar).toMatch(/^\/uploads\/users\//);
    const saved = await db.userModel.findUniqueOrThrow({ where: { id: userId } });
    expect(saved.avatar).toBe(response.body.avatar);
    unlinkSync(join(path, saved.avatar));
  });
  it('serves public media without authentication and keeps missing media private', async () => {
    const filename = 'test-media-' + randomUUID() + '.mp4';
    const folder = join(path, 'uploads');
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, filename), Buffer.from('synthetic media fixture'));
    try {
      const response = await request(app.getHttpServer()).get('/media/' + filename);
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/video\/mp4/);
      expect(Buffer.from(response.body).toString()).toBe('synthetic media fixture');
      await request(app.getHttpServer()).get('/media/' + filename).set('Range', 'bytes=0-8').expect(206);
      const missing = await request(app.getHttpServer()).get('/media/missing-' + filename).expect(404);
      expect(missing.text).not.toContain('node_modules');
      expect(missing.text).not.toContain(path);
    } finally { unlinkSync(join(folder, filename)); }
  });
  it('never exposes password hashes or repository source files', async () => {
    const response = await request(app.getHttpServer()).get('/user').expect(200);
    expect(JSON.stringify(response.body)).not.toContain('hashpassword');
    const packageFile = await request(app.getHttpServer()).get('/user/package.json');
    expect(packageFile.text).not.toContain('dependencies');
    const source = await request(app.getHttpServer()).get('/user/src/main.ts');
    expect(source.status).not.toBe(200);
  });
  it('updates a password only after verifying the current password and hashes the replacement', async () => {
    await request(app.getHttpServer()).patch('/user/' + userId).set('Authorization','Bearer '+token).send({ password: 'UpdatedPassword123!', oldpassword: 'wrong' }).expect(401);
    await request(app.getHttpServer()).patch('/user/' + userId).set('Authorization','Bearer '+token).send({ password: 'UpdatedPassword123!', oldpassword: input.hashpassword }).expect(200);
    await request(app.getHttpServer()).post('/auth/login').send({ email: input.email, password: 'UpdatedPassword123!' }).expect(200);
  });
  it('rejects existing tokens after an account is disabled', async () => {
    await db.userModel.update({ where: { id: userId }, data: { isActive: false } });
    await request(app.getHttpServer()).get('/auth/authByJwt').set('Authorization','Bearer '+token).expect(401);
  });
});
