import {
  Controller,
  BadRequestException,
  HttpCode,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { FileElementResponse } from './dto/fileElement.response';
import { FilesService } from './files.service';
import { MFile } from './mfile.class';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}
  @Post('upload')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('files', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<FileElementResponse[]> {
    if (!file) throw new BadRequestException('File required');
    const saveArray: MFile[] = [new MFile(file)];
    if (['image/jpeg','image/png','image/webp'].includes(file.mimetype)) {
      const buffer = await this.filesService.convertToWebp(file.buffer);
      saveArray.push(
        new MFile({
          originalname: `${file.originalname.split('.')[0]}.webp`,
          buffer,
        }),
      );
    }
    return this.filesService.saveFiles(saveArray);
  }
}
