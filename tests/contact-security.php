<?php
define('JWT_SECRET', 'contact-rate-limit-test-secret');
define('CORS_ORIGINS', ['https://bookitty.bidebliss.com']);
require __DIR__ . '/../api/contact-security.php';

$assert = static function (bool $condition, string $message): void {
    if (!$condition) throw new RuntimeException($message);
};

$_SERVER['HTTP_ORIGIN'] = 'https://bookitty.bidebliss.com';
$assert(contact_origin_allowed(), 'Produktions-Origin wurde abgelehnt');
$_SERVER['HTTP_ORIGIN'] = 'http://127.0.0.1:5174';
$assert(contact_origin_allowed(), 'Lokaler Vite-Origin wurde abgelehnt');
$_SERVER['HTTP_ORIGIN'] = 'https://example.invalid';
$assert(!contact_origin_allowed(), 'Fremder Origin wurde akzeptiert');
unset($_SERVER['HTTP_ORIGIN']);

$path = tempnam(sys_get_temp_dir(), 'bookitty-contact-test-');
if ($path === false) throw new RuntimeException('Temporäre Testdatei konnte nicht erstellt werden');
try {
    for ($attempt = 0; $attempt < 5; $attempt++) {
        $assert(contact_rate_limit_allowed('198.51.100.10', $path, 1000 + $attempt), 'Nachrichtenlimit wurde zu früh ausgelöst');
    }
    $assert(!contact_rate_limit_allowed('198.51.100.10', $path, 1005), 'Mehr als fünf Nachrichten pro Stunde wurden zugelassen');
    $assert(contact_rate_limit_allowed('198.51.100.11', $path, 1005), 'Getrennte IP-Adressen wurden nicht getrennt limitiert');
    $assert(contact_rate_limit_allowed('198.51.100.10', $path, 4600), 'Abgelaufene Limits wurden nicht zurückgesetzt');
} finally {
    unlink($path);
}

echo "Kontakt-Origin und Versandlimit erfolgreich geprüft.\n";