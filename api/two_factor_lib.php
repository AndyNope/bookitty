<?php
require_once __DIR__ . '/vendor/autoload.php';

function two_factor_key(): string {
    $value = defined('TOTP_ENCRYPTION_KEY') ? TOTP_ENCRYPTION_KEY : (getenv('BOOKITTY_2FA_KEY') ?: '');
    $key = base64_decode($value, true);
    if ($key === false || strlen($key) !== 32) {
        throw new RuntimeException('Zwei-Faktor-Authentifizierung ist nicht konfiguriert.');
    }
    return $key;
}

function two_factor_encrypt(string $secret): string {
    $nonce = random_bytes(12);
    $tag = '';
    $ciphertext = openssl_encrypt($secret, 'aes-256-gcm', two_factor_key(), OPENSSL_RAW_DATA, $nonce, $tag);
    if ($ciphertext === false || strlen($tag) !== 16) throw new RuntimeException('Verschlüsselung fehlgeschlagen.');
    return base64_encode($nonce . $tag . $ciphertext);
}

function two_factor_decrypt(string $encrypted): string {
    $data = base64_decode($encrypted, true);
    if ($data === false || strlen($data) < 29) throw new RuntimeException('Ungültiges 2FA-Geheimnis.');
    $secret = openssl_decrypt(substr($data, 28), 'aes-256-gcm', two_factor_key(), OPENSSL_RAW_DATA, substr($data, 0, 12), substr($data, 12, 16));
    if ($secret === false) throw new RuntimeException('2FA-Geheimnis konnte nicht entschlüsselt werden.');
    return $secret;
}

function two_factor_verify(PDO $pdo, int $userId, string $code, bool $enabled): bool {
    $ownsTransaction = !$pdo->inTransaction();
    if ($ownsTransaction) $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('SELECT * FROM user_two_factor WHERE user_id = ? FOR UPDATE');
        $stmt->execute([$userId]);
        $record = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$record || (bool) $record['enabled'] !== $enabled ||
            (!empty($record['locked_until']) && strtotime($record['locked_until']) > time()) ||
            (!$enabled && (empty($record['pending_since']) || strtotime($record['pending_since']) < time() - 600))) {
            if ($ownsTransaction) $pdo->commit();
            return false;
        }

        $step = null;
        $hashes = json_decode($record['recovery_hashes'] ?? '[]', true) ?: [];
        if (preg_match('/^\d{6}$/', $code)) {
            $totp = OTPHP\TOTP::createFromSecret(two_factor_decrypt($record['encrypted_secret']));
            $currentStep = intdiv(time(), 30);
            foreach ([$currentStep - 1, $currentStep, $currentStep + 1] as $candidate) {
                if ($candidate > (int) $record['last_step'] && hash_equals($totp->at($candidate * 30), $code)) {
                    $step = $candidate;
                    break;
                }
            }
        }
        $recoveryIndex = false;
        if ($enabled && preg_match('/^[a-f0-9]{32}$/i', $code)) {
            $recoveryIndex = array_search(hash('sha256', strtolower($code)), $hashes, true);
        }

        if ($step === null && $recoveryIndex === false) {
            $attempts = (int) $record['failed_attempts'] + 1;
            $pdo->prepare('UPDATE user_two_factor SET failed_attempts = ?, locked_until = ? WHERE user_id = ?')
                ->execute([$attempts >= 5 ? 0 : $attempts, $attempts >= 5 ? date('Y-m-d H:i:s', time() + 900) : null, $userId]);
            if ($ownsTransaction) $pdo->commit();
            return false;
        }
        if ($recoveryIndex !== false) unset($hashes[$recoveryIndex]);
        $pdo->prepare('UPDATE user_two_factor SET failed_attempts = 0, locked_until = NULL, last_step = ?, recovery_hashes = ? WHERE user_id = ?')
            ->execute([$step ?? (int) $record['last_step'], json_encode(array_values($hashes)), $userId]);
        if ($ownsTransaction) $pdo->commit();
        return true;
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $error;
    }
}