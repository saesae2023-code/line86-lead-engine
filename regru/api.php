<?php
header('Content-Type: application/json; charset=utf-8');
$config = require __DIR__ . '/config.php';
$token = $config['telegram_bot_token'] ?? '';
$dataDir = __DIR__ . '/data';
if (!is_dir($dataDir)) mkdir($dataDir, 0755, true);
$dataFile = $dataDir . '/leads.json';

function out($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}
function loadLeads($file) {
    if (!file_exists($file)) {
        $seed = [[
            'id' => 1,
            'companyName' => 'Shenzhen Prime Supply',
            'industry' => 'B2B поставки из Китая',
            'city' => 'Shenzhen',
            'score' => 99,
            'status' => 'NEW',
            'source' => 'Lead Engine Test',
            'qualificationReason' => 'Регулярные поставки из Китая; высокий B2B-потенциал',
            'owner' => ''
        ]];
        file_put_contents($file, json_encode($seed, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX);
        return $seed;
    }
    $raw = file_get_contents($file);
    $data = json_decode($raw ?: '[]', true);
    return is_array($data) ? $data : [];
}
function saveLeads($file, $leads) {
    file_put_contents($file, json_encode(array_values($leads), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX);
}
function verifyTelegram($initData, $botToken) {
    if (!$initData || !$botToken) return null;
    parse_str($initData, $params);
    $hash = $params['hash'] ?? '';
    if (!$hash) return null;
    unset($params['hash'], $params['signature']);
    ksort($params);
    $parts = [];
    foreach ($params as $k => $v) $parts[] = $k . '=' . $v;
    $check = implode("\n", $parts);
    $secret = hash_hmac('sha256', $botToken, 'WebAppData', true);
    $calc = hash_hmac('sha256', $check, $secret);
    if (!hash_equals($calc, $hash)) return null;
    $authDate = (int)($params['auth_date'] ?? 0);
    if (!$authDate || time() - $authDate > 86400) return null;
    $user = json_decode($params['user'] ?? '{}', true);
    return is_array($user) ? $user : null;
}

$action = $_GET['action'] ?? 'list';
$initData = $_SERVER['HTTP_X_TELEGRAM_INIT_DATA'] ?? '';
$user = verifyTelegram($initData, $token);

// For initial browser testing outside Telegram, allow GET list only.
if (!$user && $action !== 'list') out(['error' => 'Откройте Mini App через Telegram'], 401);

$leads = loadLeads($dataFile);

if ($action === 'list') {
    usort($leads, fn($a,$b) => ($b['score'] ?? 0) <=> ($a['score'] ?? 0));
    out(['leads' => $leads]);
}

if ($action === 'status' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_decode(file_get_contents('php://input') ?: '{}', true) ?: [];
    $id = (int)($body['id'] ?? 0);
    $status = (string)($body['status'] ?? '');
    $allowed = ['NEW','TAKEN','CONTACT','LATER','REJECTED'];
    if (!$id || !in_array($status, $allowed, true)) out(['error' => 'Некорректные данные'], 400);
    foreach ($leads as &$lead) {
        if ((int)($lead['id'] ?? 0) === $id) {
            $lead['status'] = $status;
            if ($status === 'TAKEN') {
                $name = trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? ''));
                $lead['owner'] = $name ?: ('@' . ($user['username'] ?? 'unknown'));
            }
            saveLeads($dataFile, $leads);
            out(['ok' => true, 'lead' => $lead]);
        }
    }
    out(['error' => 'Лид не найден'], 404);
}

out(['error' => 'Неизвестное действие'], 404);
