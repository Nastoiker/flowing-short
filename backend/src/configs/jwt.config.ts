import { JwtModuleOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
export const getJwtConfig = async (
  configService: ConfigService,
): Promise<JwtModuleOptions> => {
  const secret = configService.get<string>('JWT_SECRET');
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');
  return {
    secret,
    signOptions: { expiresIn: '1h' },
  };
};
