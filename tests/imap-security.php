<?php
define('IMAP_ALLOWED_SERVERS', []);
require __DIR__ . '/../api/imap_security.php';

$check = static function (bool $condition, string $message): void {
    if (!$condition) throw new RuntimeException($message);
};

$check(imap_server_allowed('merkur.kreativmedia.ch', 993), 'Freigegebener IMAPS-Host wurde abgelehnt');
$check(!imap_server_allowed('merkur.kreativmedia.ch', 143), 'Unverschlüsselter IMAP-Port wurde freigegeben');
$check(!imap_server_allowed('example.invalid', 993), 'Nicht freigegebener IMAP-Host wurde akzeptiert');
$check(!imap_server_allowed('shopping@andynope.com', 993), 'E-Mail-Adresse wurde als IMAP-Hostname akzeptiert');
echo "IMAP-Hostfreigabe und Portbegrenzung erfolgreich.\n";