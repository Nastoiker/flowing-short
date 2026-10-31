import { Test, TestingModule } from '@nestjs/testing';
import { ConvertVideoController } from './convert-video.controller';
import { ConvertVideoService } from './convert-video.service';

describe('ConvertVideoController', () => {
  let controller: ConvertVideoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConvertVideoController],
      providers: [ConvertVideoService],
    }).useMocker(() => ({})).compile();

    controller = module.get<ConvertVideoController>(ConvertVideoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
