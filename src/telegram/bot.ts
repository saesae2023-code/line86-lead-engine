type TelegramApiResponse<T> = { ok: boolean; result?: T; description?: string };

const token = () => process.env.TELEGRAM_BOT_TOKEN;
const miniAppUrl = () => process.env.MINI_APP_URL;

async function telegramCall<T>(method: string, payload: Record<string, unknown>): Promise<T> {
  const botToken = token();
  if (!botToken) throw new Error('TELEGRAM_BOT_TOKEN is not configured');

  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as TelegramApiResponse<T>;
  if (!response.ok || !data.ok) {
    throw new Error(data.description ?? `Telegram API error ${response.status}`);
  }

  return data.result as T;
}

export async function sendLeadNotification(params: {
  chatId: number | string;
  leadId?: number;
  companyName: string;
  score: number;
  status: string;
  reason?: string;
}): Promise<void> {
  const url = miniAppUrl();
  const text = [
    `🔥 Новый лид Line 86`,
    `Компания: ${params.companyName}`,
    `Score: ${params.score}/100`,
    `Статус: ${params.status}`,
    params.reason ? `Почему подходит: ${params.reason}` : undefined,
  ].filter(Boolean).join('\n');

  const replyMarkup = url
    ? {
        inline_keyboard: [[
          {
            text: 'Открыть лид',
            web_app: {
              url: params.leadId ? `${url}?lead=${params.leadId}` : url,
            },
          },
        ]],
      }
    : undefined;

  await telegramCall('sendMessage', {
    chat_id: params.chatId,
    text,
    reply_markup: replyMarkup,
  });
}

export async function sendWelcome(chatId: number | string): Promise<void> {
  const url = miniAppUrl();
  await telegramCall('sendMessage', {
    chat_id: chatId,
    text: 'Line 86 Lead Desk\n\nЗдесь приходят новые лиды, а в Mini App можно открыть общую воронку команды.',
    reply_markup: url
      ? {
          inline_keyboard: [[
            { text: 'Открыть Lead Desk', web_app: { url } },
          ]],
        }
      : undefined,
  });
}
