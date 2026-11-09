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
    $servers = array_map(fn($server) => strtolower(trim((string) $server)), array_merge(['merkur.kreativmedia.ch:993'], $servers));
    return in_array($host . ':' . $port, $servers, true);
}

function imap_connection_error_message(array|false $errors): string {
    $details = strtolower(implode(' ', is_array($errors) ? $errors : []));
    if (preg_match('/auth(?:entication)? failed|login failed|invalid credentials|username.*password|password.*(?:invalid|failed)/', $details)) {
        return 'Der Mailserver hat die Anmeldung abgelehnt. Benutzername und Passwort bzw. ein nötiges App-Passwort sowie die IMAP-Freigabe im Postfach prüfen.';
    }
    if (preg_match('/certificate|cert verify|ssl|tls|handshake|peer/', $details)) {
        return 'Das TLS-Zertifikat konnte nicht geprüft werden. Servername und SSL-Port 993 prüfen.';
    }
    if (preg_match('/mailbox|folder|no such|does not exist|select.*(?:fail|error)/', $details)) {
        return 'Der IMAP-Ordner wurde nicht gefunden. Ordnername prüfen; üblich ist INBOX.';
    }
    if (preg_match('/connect|connection|timed? out|refused|network|unreachable|resolve/', $details)) {
        return 'Der IMAP-Server ist nicht erreichbar. Hostname, Port 993 und serverseitige Netzwerkfreigabe prüfen.';
    }
    return 'IMAP-Anmeldung oder Mailbox konnte nicht geöffnet werden. Zugangsdaten, IMAP-Freigabe und Ordner prüfen.';
}

function imap_uid_page(array $uids, ?int $before, int $limit = 50): array {
    $uids = array_values(array_unique(array_filter($uids, static fn($uid) =>
        is_numeric($uid) && (int) $uid > 0 && ($before === null || (int) $uid < $before),
    )));
    rsort($uids, SORT_NUMERIC);
    $page = array_slice($uids, 0, max(1, min($limit, 100)));
    return [
        'uids' => $page,
        'nextCursor' => count($uids) > count($page) ? (int) end($page) : null,
        'remaining' => max(0, count($uids) - count($page)),
    ];
}