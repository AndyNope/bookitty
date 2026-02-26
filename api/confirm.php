<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

$token = trim($_GET['token'] ?? '');

if (!$token) {
    header('Location: ' . APP_URL . '/login?error=invalid_token');
    exit;
}

try {
    $pdo  = get_db();
    $stmt = $pdo->prepare('SELECT id, email_confirmed FROM users WHERE confirmation_token = ?');
    $stmt->execute([$token]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        header('Location: ' . APP_URL . '/login?error=invalid_token');
        exit;
    }

    if ($user['email_confirmed']) {
        // Already confirmed – just redirect to login
        header('Location: ' . APP_URL . '/login?confirmed=1');
        exit;
    }

    $pdo->prepare(
        'UPDATE users SET email_confirmed = 1, confirmation_token = NULL WHERE id = ?'
    )->execute([$user['id']]);

    header('Location: ' . APP_URL . '/login?confirmed=1');
} catch (Exception $e) {
    header('Location: ' . APP_URL . '/login?error=server_error');
}
exit;
