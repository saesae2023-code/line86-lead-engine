<?php
$configPath = __DIR__ . '/config.php';
if (!file_exists($configPath)) {
    http_response_code(500);
    echo 'Missing config.php';
    exit;
}
$config = require $configPath;
$token = $config['telegram_bot_token'] ?? '';
if (!$token || $token === 'PASTE_BOT_TOKEN_HERE') {
    http_response_code(500);
    echo 'Bot token is not configured';
    exit;
}

function tgCall(string $token, string $method, array $payload): array {
    $ch = curl_init("https://api.telegram.org/bot{$token}/{$method}");
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
        CURLOPT_TIMEOUT => 15,
    ]);
    $raw = curl_exec($ch);
    $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $data = json_decode($raw ?: '{}', true) ?: [];
    if ($http >= 400 || !($data['ok'] ?? false)) {
        throw new RuntimeException($data['description'] ?? 'Telegram API error');
    }
    return $data;
}

$update = json_decode(file_get_contents('php://input') ?: '{}', true) ?: [];
$callback = $update['callback_query'] ?? null;
if (!$callback) {
    http_response_code(200);
    echo 'ok';
    exit;
}

$data = (string)($callback['data'] ?? '');
if (!preg_match('/^lead:(\d+):(take|contact|later|reject)$/', $data, $m)) {
    tgCall($token, 'answerCallbackQuery', [
        'callback_query_id' => $callback['id'],
        'text' => 'Неизвестное действие',
        'show_alert' => false,
    ]);
    http_response_code(200);
    echo 'ok';
    exit;
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

tgCall($token, 'answerCallbackQuery', [
    'callback_query_id' => $callback['id'],
    'text' => $status,
    'show_alert' => false,
]);

http_response_code(200);
echo 'ok';
