<?php
function auth_rate_keys(string $email): array {
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    return [
        hash_hmac('sha256', 'login:' . strtolower(trim($email)) . ':' . $ip, JWT_SECRET),
        hash_hmac('sha256', 'ip:' . $ip, JWT_SECRET),
    ];
}

function auth_rate_check(PDO $pdo, string $email): void {
    $keys = auth_rate_keys($email);
    $stmt = $pdo->prepare('SELECT 1 FROM auth_attempts WHERE limiter_key IN (?, ?) AND locked_until > NOW() LIMIT 1');
    $stmt->execute($keys);
    if ($stmt->fetchColumn()) {
        http_response_code(429);
        header('Retry-After: 900');
        echo json_encode(['error' => 'Zu viele Anmeldeversuche. Bitte später erneut versuchen.']);
        exit;
    }
}

function auth_rate_failure(PDO $pdo, string $email): void {
    $keys = auth_rate_keys($email);
    $stmt = $pdo->prepare('INSERT INTO auth_attempts (limiter_key, failures, updated_at) VALUES (?, 1, NOW())
        ON DUPLICATE KEY UPDATE failures = IF(updated_at < DATE_SUB(NOW(), INTERVAL 15 MINUTE), 1, failures + 1),
        locked_until = IF(failures >= ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE), NULL), updated_at = NOW()');
    $stmt->execute([$keys[0], 10]);
    $stmt->execute([$keys[1], 50]);
    if (random_int(1, 100) === 1) $pdo->exec('DELETE FROM auth_attempts WHERE updated_at < DATE_SUB(NOW(), INTERVAL 1 DAY)');
}

function auth_rate_success(PDO $pdo, string $email): void {
    $keys = auth_rate_keys($email);
    $pdo->prepare('DELETE FROM auth_attempts WHERE limiter_key = ?')->execute([$keys[0]]);
}