import { Test, TestingModule } from '@nestjs/testing';
import { ConvertVideoService } from './convert-video.service';

describe('ConvertVideoService', () => {
  let service: ConvertVideoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConvertVideoService],
    }).useMocker(() => ({})).compile();

    service = module.get<ConvertVideoService>(ConvertVideoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
