<?php
define('TOTP_ENCRYPTION_KEY', base64_encode(str_repeat('x', 32)));
define('IMAP_ENCRYPTION_KEY', base64_encode(str_repeat('y', 32)));
define('IMAP_ALLOWED_SERVERS', ['mail.example.test:993']);
require __DIR__ . '/../api/two_factor_lib.php';
require __DIR__ . '/../api/imap_security.php';

$secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
if (OTPHP\TOTP::createFromSecret($secret)->at(59) !== '287082') {
    throw new RuntimeException('TOTP-Testvektor fehlgeschlagen');
}
$encrypted = two_factor_encrypt($secret);
if (two_factor_decrypt($encrypted) !== $secret || two_factor_encrypt($secret) === $encrypted) {
    throw new RuntimeException('2FA-Verschlüsselung fehlgeschlagen');
}
$tampered = base64_decode($encrypted, true);
$tampered[12] = chr(ord($tampered[12]) ^ 1);
$rejected = false;
try {
    two_factor_decrypt(base64_encode($tampered));
} catch (RuntimeException $error) {
    $rejected = true;
}
if (!$rejected) throw new RuntimeException('Manipuliertes Geheimnis wurde akzeptiert');
if (imap_decrypt_password(imap_encrypt_password('test-password')) !== 'test-password' ||
    !imap_server_allowed('MAIL.EXAMPLE.TEST', 993) || imap_server_allowed('mail.example.test', 143) ||
    imap_server_allowed('localhost', 993)) {
    throw new RuntimeException('IMAP-Sicherheitsprüfung fehlgeschlagen');
}
echo "2FA-Testvektor und Verschlüsselung erfolgreich.\n";