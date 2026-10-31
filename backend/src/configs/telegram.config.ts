import { ConfigService } from '@nestjs/config';
import { ITelegramOptions } from 'src/telegram/ITelegram.interface';

export const getTelegramConfig = (
  configService: ConfigService,
): ITelegramOptions => {
  const token: undefined | string = configService.get('TELEGRAM_TOKEN');
  if (!token && process.env.TELEGRAM_ENABLED === 'true' && process.env.NODE_ENV !== 'test') {
    throw new Error('Telegram token not ainit');
  }
  return { token: token || 'disabled', chatId: configService.get('CHAT_ID') ?? '' };
};
