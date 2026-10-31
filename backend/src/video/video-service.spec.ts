import { Test, TestingModule } from '@nestjs/testing';
import { VideoService } from './video-service';

describe('VideoService', () => {
  let provider: VideoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VideoService],
    }).useMocker(() => ({})).compile();

    provider = module.get<VideoService>(VideoService);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
