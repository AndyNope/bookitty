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
$check(str_contains(imap_connection_error_message(['Authentication failed']), 'App-Passwort'), 'Loginfehler ist nicht hilfreich erklärt');
$check(str_contains(imap_connection_error_message(['certificate verify failed']), 'TLS-Zertifikat'), 'TLS-Fehler ist nicht getrennt erklärt');
$check(str_contains(imap_connection_error_message(['Mailbox does not exist']), 'Ordner'), 'Mailboxfehler ist nicht getrennt erklärt');
$check(str_contains(imap_connection_error_message(['Connection timed out']), 'nicht erreichbar'), 'Netzwerkfehler ist nicht getrennt erklärt');
echo "IMAP-Hostfreigabe und Portbegrenzung erfolgreich.\n";