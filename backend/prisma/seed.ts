import { identityEvent } from '../src/identity/domain/registration';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { mkdir, writeFile } from 'fs/promises';
import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
const prisma = new PrismaClient();
export async function seed() {
  if (process.env.ALLOW_DEMO_SEED !== 'true' || process.env.NODE_ENV === 'production' || !/demo|test/i.test(process.env.DATABASE_URL || '')) {
    throw new Error('Synthetic seed requires ALLOW_DEMO_SEED=true, a demo/test database, and non-production NODE_ENV');
  }
  await prisma.userModel.upsert({ where: { email: 'demo@example.test' }, update: {}, create: {
    id: 'demo-user', email: 'demo@example.test', login: 'Demo creator', authorUrl: 'demo',
    hashpassword: await hash('DemoPassword123!',10), avatar: '/uploads/demo.svg', role: 'user',
  } });
  const user = await prisma.userModel.findUniqueOrThrow({ where: { email: 'demo@example.test' } });
  const event = identityEvent('user.registered.v1', 'demo-registration-v1', user, new Date('2026-01-01T00:00:00Z'));
  await prisma.outboxEvent.upsert({ where: { id: event.eventId }, update: {}, create: {
    id: event.eventId, aggregateId: user.id, payload: JSON.stringify(event), createdAt: new Date(event.occurredAt),
  } });
  await prisma.firstLevelCategory.upsert({ where: { id: 'demo-category' }, update: {}, create: {
    id: 'demo-category', name: 'Demo', alias: 'demo',
  } });
  await prisma.secondLevelCategory.upsert({ where: { id: 'demo-shorts' }, update: {}, create: {
    id: 'demo-shorts', name: 'Shorts', alias: 'shorts', firstLevelId: 'demo-category',
  } });
  await prisma.video.upsert({ where: { id: 'demo-video' }, update: {}, create: {
    id: 'demo-video', name: 'Synthetic demo', alias: 'demo-video', Title: 'Synthetic demo',
    Description: 'Synthetic local test video', isActive: true, duration: 2,
    embed_link: '/demo.mp4', embed_html: '', share_url: '', cover_image_url: '/media/demo.svg',
    Type: 'video', width: 180, height: 320, userId: user.id, secondCategoryId: 'demo-shorts',
  } });
  await prisma.tag.upsert({ where: { name: '#demo' }, update: {}, create: { id: 'demo-tag', name: '#demo' } });
  const tag = await prisma.tag.findUniqueOrThrow({ where: { name: '#demo' } });
  await prisma.tagOnVideo.upsert({ where: { tagId_videoId: { tagId: tag.id, videoId: 'demo-video' } }, update: {}, create: { tagId: tag.id, videoId: 'demo-video' } });
  await mkdir('uploads', { recursive: true });
  if (!existsSync('uploads/demo.svg')) await writeFile('uploads/demo.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="320"><rect width="180" height="320" fill="#254e70"/><text x="30" y="160" fill="white">Synthetic demo</text></svg>');
  if (!existsSync('uploads/demo.mp4')) execFileSync('ffmpeg', ['-hide_banner','-loglevel','error','-f','lavfi','-i','color=c=blue:s=180x320:d=2','-c:v','libx264','-pix_fmt','yuv420p','uploads/demo.mp4'], { timeout: 30000 });
}
if (require.main === module) seed().finally(() => prisma.$disconnect()).catch(() => {
  console.error('Synthetic seed failed. Check demo/test database configuration and ffmpeg installation.'); process.exitCode = 1;
});
