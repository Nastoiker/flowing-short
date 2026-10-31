import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateMusicDto } from './dto/create-music.dto';
import { UpdateMusicDto } from './dto/update-music.dto';
import { PrismaService } from '../prisma/prisma-service';
import { path } from 'app-root-path';
import { unlink, writeFile, ensureDir } from 'fs-extra';
import { randomUUID } from 'crypto';
@Injectable()
export class MusicService {
  constructor(private readonly prismaService: PrismaService) {}
  async create(
    file: Express.Multer.File,
    img: Express.Multer.File,
    createMusicDto: CreateMusicDto,
  ) {
    if (!file || !img || !['audio/mpeg','audio/mp3'].includes(file.mimetype) || !['image/jpeg','image/png','image/webp'].includes(img.mimetype)) throw new BadRequestException('MP3 audio and image required');
    createMusicDto.alias = randomUUID();
    file.originalname = createMusicDto.alias + '.mp3';
    img.originalname = createMusicDto.alias + '.' + ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[img.mimetype]);
    const uploadFolder = 'uploads/users/' + createMusicDto.userId;
    await ensureDir(uploadFolder + '/music');
    const extensionImg = img.originalname.split('.');
    createMusicDto.img =
      uploadFolder +
      '/music/' +
      createMusicDto.alias +
      '.' +
      extensionImg[extensionImg.length - 1];
    const extension = file.originalname.split('.');
    await writeFile(
      uploadFolder +
        '/music/' +
        createMusicDto.alias +
        '.' +
        extensionImg[extensionImg.length - 1],
      img.buffer,
    );
    createMusicDto.music_url =
      uploadFolder +
      '/music/' +
      createMusicDto.alias +
      '.' +
      extension[extension.length - 1];
    await writeFile(
      uploadFolder +
        '/music/' +
        createMusicDto.alias +
        '.' +
        extension[extension.length - 1],
      file.buffer,
    );
    return this.prismaService.music.create({
      data: createMusicDto,
    });
  }

  async findAll() {
    return this.prismaService.music.findMany({
      where: {},
      include: {
        videos: true,
      },
    });
  }

  findOne(id: string) {
    return this.prismaService.music.findFirst({
      where: { id },
    });
  }
  update(id: number, updateMusicDto: UpdateMusicDto) {
    return `This action updates a #${id} music`;
  }
  async foundMusic(search: string) {
    return this.prismaService.music.findMany({
      where: {
        name: {
          startsWith: search,
        },
      },
      include: {
        videos: true,
        user: true,
      },
    });
  }
  async remove(id: string, ownerId: string) {
    const remove = await this.prismaService.music.findFirst({
      where: { id },
      select: { music_url: true, userId: true },
    });
    if (!remove) throw new NotFoundException();
    if (remove.userId !== ownerId) throw new ForbiddenException();
    return this.prismaService.music.delete({
      where: { id },
    });
  }
}
