<?php
function imap_secret_key(): string {
    $value = defined('IMAP_ENCRYPTION_KEY') ? IMAP_ENCRYPTION_KEY : (getenv('BOOKITTY_IMAP_KEY') ?: '');
    $key = base64_decode($value, true);
    if ($key === false || strlen($key) !== 32) throw new RuntimeException('IMAP-Verschlüsselung ist nicht konfiguriert.');
    return $key;
}

function imap_encrypt_password(string $password): string {
    $nonce = random_bytes(12);
    $tag = '';
    $ciphertext = openssl_encrypt($password, 'aes-256-gcm', imap_secret_key(), OPENSSL_RAW_DATA, $nonce, $tag);
    if ($ciphertext === false || strlen($tag) !== 16) throw new RuntimeException('IMAP-Verschlüsselung fehlgeschlagen.');
    return 'v1:' . base64_encode($nonce . $tag . $ciphertext);
}

function imap_decrypt_password(string $value): string {
    if (!str_starts_with($value, 'v1:')) return $value;
    $data = base64_decode(substr($value, 3), true);
    if ($data === false || strlen($data) < 28) throw new RuntimeException('Ungültiges IMAP-Passwort.');
    $password = openssl_decrypt(substr($data, 28), 'aes-256-gcm', imap_secret_key(), OPENSSL_RAW_DATA, substr($data, 0, 12), substr($data, 12, 16));
    if ($password === false) throw new RuntimeException('IMAP-Passwort konnte nicht entschlüsselt werden.');
    return $password;
}

function imap_server_allowed(string $host, int $port): bool {
    $host = strtolower(trim($host));
    if (!preg_match('/^(?=.{1,253}$)[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/', $host) || $port < 1 || $port > 65535) return false;
    $servers = defined('IMAP_ALLOWED_SERVERS') ? IMAP_ALLOWED_SERVERS : explode(',', getenv('BOOKITTY_IMAP_ALLOWED_SERVERS') ?: '');
    if (!is_array($servers)) return false;
    $servers = array_map(fn($server) => strtolower(trim((string) $server)), $servers);
    return in_array($host . ':' . $port, $servers, true);
}