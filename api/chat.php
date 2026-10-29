<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/db.php';

set_cors_headers();
header('Content-Type: application/json; charset=utf-8');

function kitty_respond(int $status, array $data): never {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

function kitty_uuid(): string {
    $bytes = random_bytes(16);
    $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
    $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
    $hex = bin2hex($bytes);
    return substr($hex, 0, 8) . '-' . substr($hex, 8, 4) . '-' . substr($hex, 12, 4)
        . '-' . substr($hex, 16, 4) . '-' . substr($hex, 20);
}

function kitty_release_reservation(PDO $pdo, string $reservationId): void {
    $pdo->beginTransaction();
    try {
        $reservationQuery = $pdo->prepare('SELECT * FROM ai_token_reservations WHERE id = ? FOR UPDATE');
        $reservationQuery->execute([$reservationId]);
        $reservation = $reservationQuery->fetch();
        if ($reservation && $reservation['status'] === 'pending') {
            $pdo->prepare(
                'UPDATE billing_accounts SET monthly_tokens_remaining = monthly_tokens_remaining + ?,
                 purchased_tokens_remaining = purchased_tokens_remaining + ? WHERE company_id = ?'
            )->execute([$reservation['monthly_reserved'], $reservation['purchased_reserved'], $reservation['company_id']]);
            $pdo->prepare("UPDATE ai_token_reservations SET status = 'released' WHERE id = ?")
                ->execute([$reservationId]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

function kitty_settle_reservation(PDO $pdo, string $reservationId, int $usedTokens): array {
    $pdo->beginTransaction();
    try {
        $reservationQuery = $pdo->prepare('SELECT * FROM ai_token_reservations WHERE id = ? FOR UPDATE');
        $reservationQuery->execute([$reservationId]);
        $reservation = $reservationQuery->fetch();
        if (!$reservation || $reservation['status'] !== 'pending') {
            throw new RuntimeException('Token reservation is not pending');
        }

        $accountQuery = $pdo->prepare('SELECT * FROM billing_accounts WHERE company_id = ? FOR UPDATE');
        $accountQuery->execute([$reservation['company_id']]);
        $account = $accountQuery->fetch();
        if (!$account) throw new RuntimeException('Billing account missing');

        $monthlyReserved = (int) $reservation['monthly_reserved'];
        $purchasedReserved = (int) $reservation['purchased_reserved'];
        $reservedTotal = $monthlyReserved + $purchasedReserved;
        $monthlyUsed = min($usedTokens, $monthlyReserved);
        $purchasedUsed = min(max(0, $usedTokens - $monthlyUsed), $purchasedReserved);
        $extra = max(0, $usedTokens - $monthlyUsed - $purchasedUsed);
        $monthlyAvailable = $account['subscription_status'] === 'active'
            ? (int) $account['monthly_tokens_remaining'] : 0;
        $extraMonthly = min($extra, $monthlyAvailable);
        $extraPurchased = min($extra - $extraMonthly, (int) $account['purchased_tokens_remaining']);
        $charged = $monthlyUsed + $purchasedUsed + $extraMonthly + $extraPurchased;

        $monthlyRefund = $monthlyReserved - $monthlyUsed;
        $purchasedRefund = $purchasedReserved - $purchasedUsed;
        $pdo->prepare(
            'UPDATE billing_accounts SET monthly_tokens_remaining = monthly_tokens_remaining + ? - ?,
             purchased_tokens_remaining = purchased_tokens_remaining + ? - ? WHERE company_id = ?'
        )->execute([
            $monthlyRefund, $extraMonthly, $purchasedRefund, $extraPurchased, $reservation['company_id'],
        ]);
        $pdo->prepare("UPDATE ai_token_reservations SET status = 'settled' WHERE id = ?")
            ->execute([$reservationId]);
        $pdo->prepare(
            "INSERT INTO ai_token_ledger (company_id, entry_type, token_delta, reference_key)
             VALUES (?, 'usage', ?, ?)"
        )->execute([$reservation['company_id'], -$charged, 'ai:' . $reservationId]);

        $remainingQuery = $pdo->prepare(
            'SELECT monthly_tokens_remaining, purchased_tokens_remaining FROM billing_accounts WHERE company_id = ?'
        );
        $remainingQuery->execute([$reservation['company_id']]);
        $remaining = $remainingQuery->fetch();
        $pdo->commit();

        return [
            'usedTokens' => $charged,
            'monthlyTokens' => (int) $remaining['monthly_tokens_remaining'],
            'purchasedTokens' => (int) $remaining['purchased_tokens_remaining'],
        ];
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') kitty_respond(405, ['error' => 'Method Not Allowed']);

$payload = get_auth_payload();
$companyId = isset($payload['company_id']) ? (int) $payload['company_id'] : (int) $payload['sub'];
$body = json_decode(file_get_contents('php://input'), true) ?? [];
$messages = $body['messages'] ?? [];
if (!is_array($messages) || $messages === []) kitty_respond(400, ['error' => 'messages array required']);

$history = [];
$characterCount = 0;
foreach (array_slice($messages, -12) as $message) {
    if (!is_array($message) || !in_array($message['role'] ?? '', ['user', 'model', 'assistant'], true)) continue;
    $text = trim(mb_substr((string) ($message['text'] ?? ''), 0, 2000));
    if ($text === '') continue;
    $characterCount += mb_strlen($text);
    $history[] = [
        'role' => ($message['role'] === 'user') ? 'user' : 'assistant',
        'content' => $text,
    ];
}
if ($history === [] || $characterCount > 8000) {
    kitty_respond(413, ['error' => 'Die Chatnachricht ist zu lang. Bitte kürze den Gesprächsverlauf.']);
}

$apiKey = defined('KITTY_API_KEY') ? KITTY_API_KEY : '';
$productId = defined('KITTY_PRODUCT_ID') ? KITTY_PRODUCT_ID : '';
$model = defined('KITTY_MODEL') ? KITTY_MODEL : '';
if ($apiKey === '' || $productId === '' || $model === '' || !function_exists('curl_init')) {
    kitty_respond(503, ['error' => 'Kitty ist noch nicht vollständig konfiguriert.']);
}

$pdo = get_db();
$pdo->prepare("INSERT IGNORE INTO billing_accounts (company_id, plan_code) VALUES (?, 'starter')")
    ->execute([$companyId]);
$reservationId = kitty_uuid();
$reservationAmount = ($characterCount * 4) + 1024;

try {
    $pdo->beginTransaction();
    $staleQuery = $pdo->prepare(
        "SELECT id, monthly_reserved, purchased_reserved FROM ai_token_reservations
         WHERE company_id = ? AND status = 'pending' AND created_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE)
         FOR UPDATE"
    );
    $staleQuery->execute([$companyId]);
    foreach ($staleQuery->fetchAll() as $stale) {
        $pdo->prepare(
            'UPDATE billing_accounts SET monthly_tokens_remaining = monthly_tokens_remaining + ?,
             purchased_tokens_remaining = purchased_tokens_remaining + ? WHERE company_id = ?'
        )->execute([$stale['monthly_reserved'], $stale['purchased_reserved'], $companyId]);
        $pdo->prepare("UPDATE ai_token_reservations SET status = 'expired' WHERE id = ?")
            ->execute([$stale['id']]);
    }

    $accountQuery = $pdo->prepare('SELECT * FROM billing_accounts WHERE company_id = ? FOR UPDATE');
    $accountQuery->execute([$companyId]);
    $account = $accountQuery->fetch();
    $monthlyAvailable = $account['subscription_status'] === 'active'
        ? (int) $account['monthly_tokens_remaining'] : 0;
    $purchasedAvailable = (int) $account['purchased_tokens_remaining'];
    $rateQuery = $pdo->prepare(
        'SELECT COUNT(*) FROM ai_token_reservations WHERE company_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MINUTE)'
    );
    $rateQuery->execute([$companyId]);
    if ((int) $rateQuery->fetchColumn() >= 10) {
        $pdo->rollBack();
        kitty_respond(429, ['error' => 'Zu viele Kitty-Anfragen. Bitte warte kurz.']);
    }
    if ($monthlyAvailable + $purchasedAvailable < $reservationAmount) {
        $pdo->rollBack();
        kitty_respond(402, ['error' => 'Dein KI-Guthaben reicht für diese Anfrage nicht aus.']);
    }

    $monthlyReserved = min($monthlyAvailable, $reservationAmount);
    $purchasedReserved = $reservationAmount - $monthlyReserved;
    $pdo->prepare(
        'UPDATE billing_accounts SET monthly_tokens_remaining = monthly_tokens_remaining - ?,
         purchased_tokens_remaining = purchased_tokens_remaining - ? WHERE company_id = ?'
    )->execute([$monthlyReserved, $purchasedReserved, $companyId]);
    $pdo->prepare(
        "INSERT INTO ai_token_reservations (id, company_id, monthly_reserved, purchased_reserved, status)
         VALUES (?, ?, ?, ?, 'pending')"
    )->execute([$reservationId, $companyId, $monthlyReserved, $purchasedReserved]);
    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('Kitty token reservation failed: ' . $e->getMessage());
    kitty_respond(503, ['error' => 'Kitty ist momentan nicht verfügbar.']);
}

$systemPrompt = <<<'PROMPT'
Du bist Kitty, der freundliche KI-Assistent von Bookitty – einer Schweizer Buchhaltungssoftware für KMU.
Beantworte Fragen zum Schweizer KMU-Kontenrahmen, zur doppelten Buchführung, zu Schweizer MwSt-Sätzen und zu Bookitty-Funktionen in einfacher Sprache. Antworte auf Deutsch, ausser der Nutzer schreibt in einer anderen Sprache.
Schweizer MwSt-Sätze: Normalsatz 8.1%, Beherbergung 3.8%, reduziert 2.6%. Einnahmen: Haben 3xxx, Soll 1xxx. Ausgaben: Soll 4xxx-8xxx, Haben 1xxx oder 2xxx.
Gib keine Steuer- oder Rechtsberatung. Wenn unsicher, verweise an eine Fachperson. Behaupte nicht, eine Buchung ausgeführt zu haben.
PROMPT;
$requestBody = json_encode([
    'model' => $model,
    'messages' => array_merge([['role' => 'system', 'content' => $systemPrompt]], $history),
    'temperature' => 0.2,
    'max_completion_tokens' => 1024,
    'stream' => false,
]);
$url = 'https://api.infomaniak.com/2/ai/' . rawurlencode($productId) . '/openai/v1/chat/completions';
$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $requestBody,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_CONNECTTIMEOUT => 8,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey,
    ],
]);
$raw = curl_exec($ch);
$httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($raw === false || $httpCode !== 200) {
    try {
        kitty_release_reservation($pdo, $reservationId);
    } catch (Throwable $e) {
        error_log('Kitty token reservation release failed: ' . $e->getMessage());
    }
    error_log('Kitty provider request failed; HTTP ' . $httpCode);
    kitty_respond(502, ['error' => 'Kitty ist gerade nicht erreichbar. Bitte versuche es später erneut.']);
}

$response = json_decode($raw, true);
$text = trim((string) ($response['choices'][0]['message']['content'] ?? ''));
if ($text === '') {
    kitty_release_reservation($pdo, $reservationId);
    kitty_respond(502, ['error' => 'Kitty hat keine Antwort erhalten. Bitte versuche es erneut.']);
}

$usage = $response['usage'] ?? [];
$usedTokens = max(0, (int) ($usage['total_tokens'] ?? 0));
if ($usedTokens === 0) $usedTokens = max(1, (int) ceil($characterCount / 2));
try {
    $tokenBalance = kitty_settle_reservation($pdo, $reservationId, $usedTokens);
} catch (Throwable $e) {
    error_log('Kitty token settlement failed: ' . $e->getMessage());
    kitty_respond(502, ['error' => 'Die Antwort konnte nicht sicher verbucht werden. Bitte versuche es erneut.']);
}

echo json_encode(['text' => $text, 'usage' => $tokenBalance]);
