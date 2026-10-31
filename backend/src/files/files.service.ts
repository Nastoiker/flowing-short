import { Injectable, BadRequestException } from '@nestjs/common';
import { path } from 'app-root-path';
import { format } from 'date-fns';
import { ensureDir, writeFile } from 'fs-extra';
import { FileElementResponse } from './dto/fileElement.response';
import * as sharp from 'sharp';
import { MFile } from './mfile.class';
import { randomUUID } from 'crypto';
import { extname } from 'path';
@Injectable()
export class FilesService {
  async saveFiles(files: MFile[]): Promise<FileElementResponse[]> {
    const dateFolder = format(new Date(), 'yyyy-MM-dd');
    const UploadFolder = `${path}/uploads/${dateFolder}`;
    await ensureDir(UploadFolder);
    const res: FileElementResponse[] = [];
    for (const file of files) {
      const extension = extname(file.originalname).toLowerCase();
      if (!['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.mp3'].includes(extension)) throw new BadRequestException('Unsupported file type');
      file.originalname = randomUUID() + extension;
      await writeFile(`${UploadFolder}/${file.originalname}`, file.buffer);
      res.push({
        url: `${dateFolder}/${file.originalname}`,
        name: file.originalname,
      });
    }
    return res;
  }
  async convertToWebp(file: Buffer): Promise<Buffer> {
    return sharp(file).webp().toBuffer();
  }
}
