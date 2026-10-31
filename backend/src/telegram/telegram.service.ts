import { Inject, Injectable } from '@nestjs/common';
import { getTelegramConfig } from 'src/configs/telegram.config';
import { Telegraf } from 'telegraf';
import { ITelegramOptions } from './ITelegram.interface';
import { TELEGRAM_MODULE_OPTIONS } from './telegram.constants';

@Injectable()
export class TelegramService {
  bot: Telegraf;
  options: ITelegramOptions;
  constructor(@Inject(TELEGRAM_MODULE_OPTIONS) _options: ITelegramOptions) {
    this.options = _options;
    if (process.env.TELEGRAM_ENABLED === 'true' && process.env.NODE_ENV !== 'test') this.bot = new Telegraf(_options.token);
  }
  async sendMessage(message: string, chatId: string = this.options.chatId) {
    if (!this.bot) return;
    await this.bot.telegram.sendMessage(chatId, message);
  }
}
