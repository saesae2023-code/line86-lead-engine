<?php
$config = require __DIR__ . '/config.php';
$token = $config['telegram_bot_token'] ?? '';
if (!$token || $token === 'PASTE_BOT_TOKEN_HERE') {
    fwrite(STDERR, "Bot token is not configured\n");
    exit(1);
}

function tgCall(string $token, string $method, array $payload = []): array {
    $url = "https://api.telegram.org/bot{$token}/{$method}";
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
        CURLOPT_TIMEOUT => 20,
    ]);
    $raw = curl_exec($ch);
    $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($raw === false) throw new RuntimeException($err ?: 'Telegram request failed');
    $data = json_decode($raw, true) ?: [];
    if ($http >= 400 || !($data['ok'] ?? false)) {
        throw new RuntimeException($data['description'] ?? "Telegram API error {$http}");
    }
    return $data;
}

$dataDir = __DIR__ . '/data';
if (!is_dir($dataDir)) mkdir($dataDir, 0755, true);
$offsetFile = $dataDir . '/telegram_offset.txt';
$offset = file_exists($offsetFile) ? (int)trim((string)file_get_contents($offsetFile)) : 0;

$response = tgCall($token, 'getUpdates', [
    'offset' => $offset,
    'timeout' => 0,
    'allowed_updates' => ['callback_query'],
]);

foreach (($response['result'] ?? []) as $update) {
    $updateId = (int)($update['update_id'] ?? 0);
    if ($updateId >= $offset) {
        $offset = $updateId + 1;
        file_put_contents($offsetFile, (string)$offset, LOCK_EX);
    }

    $callback = $update['callback_query'] ?? null;
    if (!$callback) continue;

    $callbackId = $callback['id'] ?? null;
    $data = (string)($callback['data'] ?? '');

    if (!preg_match('/^lead:(\d+):(take|contact|later|reject)$/', $data, $m)) {
        if ($callbackId) tgCall($token, 'answerCallbackQuery', [
            'callback_query_id' => $callbackId,
            'text' => 'Неизвестное действие',
            'show_alert' => false,
        ]);
        continue;
    }

    $leadId = (int)$m[1];
    $action = $m[2];
    $labels = [
        'take' => '✅ В работе',
        'contact' => '📞 Связаться',
        'later' => '⏰ Отложено',
        'reject' => '❌ Отклонено',
    ];
    $status = $labels[$action];

    $user = $callback['from'] ?? [];
    $who = trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? ''));
    if ($who === '') $who = '@' . ($user['username'] ?? 'unknown');

    $message = $callback['message'] ?? [];
    $chatId = $message['chat']['id'] ?? null;
    $messageId = $message['message_id'] ?? null;
    $oldText = (string)($message['text'] ?? '');
    $newText = preg_replace('/\n\nСтатус действия:.*$/su', '', $oldText);
    $newText .= "\n\nСтатус действия: {$status}\nОтветственный: {$who}";

    if ($chatId && $messageId) {
        tgCall($token, 'editMessageText', [
            'chat_id' => $chatId,
            'message_id' => $messageId,
            'text' => $newText,
            'reply_markup' => [
                'inline_keyboard' => [[
                    ['text' => $status . ' · ' . $who, 'callback_data' => "lead:{$leadId}:{$action}"]
                ]]
            ],
        ]);
    }

    if ($callbackId) tgCall($token, 'answerCallbackQuery', [
        'callback_query_id' => $callbackId,
        'text' => $status,
        'show_alert' => false,
    ]);
}

echo "ok\n";
