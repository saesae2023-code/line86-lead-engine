import crypto from 'node:crypto';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export function validateTelegramInitData(initData: string, botToken: string): TelegramUser {
  if (!initData) throw new Error('Telegram initData is missing');
  if (!botToken) throw new Error('TELEGRAM_BOT_TOKEN is not configured');

  const params = new URLSearchParams(initData);
  const receivedHash = params.get('hash');
  if (!receivedHash) throw new Error('Telegram hash is missing');

  params.delete('hash');
  params.delete('signature');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  const a = Buffer.from(calculatedHash, 'hex');
  const b = Buffer.from(receivedHash, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error('Invalid Telegram initData signature');
  }

  const authDate = Number(params.get('auth_date') ?? 0);
  const maxAgeSeconds = 60 * 60 * 24;
  if (!authDate || Math.floor(Date.now() / 1000) - authDate > maxAgeSeconds) {
    throw new Error('Telegram initData expired');
  }

  const rawUser = params.get('user');
  if (!rawUser) throw new Error('Telegram user is missing');

  return JSON.parse(rawUser) as TelegramUser;
}
