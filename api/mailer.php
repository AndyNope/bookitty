<?php
require_once __DIR__ . '/config.php';

/**
 * Sends the e-mail confirmation mail via PHP mail().
 * For SMTP, replace the mail() call with PHPMailer or similar.
 */
function send_confirmation_email(string $toEmail, string $toName, string $token): bool {
    $confirmUrl = APP_URL . '/api/confirm.php?token=' . urlencode($token);
    $subject    = APP_NAME . ' – E-Mail-Adresse bestätigen';

    $html = '<!DOCTYPE html>
<html lang="de"><body style="font-family:system-ui,sans-serif;color:#1e293b;max-width:540px;margin:0 auto;padding:40px 24px;background:#f8fafc">
<div style="background:#fff;border-radius:16px;padding:40px 32px;border:1px solid #e2e8f0">
  <h1 style="font-size:22px;margin:0 0 8px">Willkommen bei ' . APP_NAME . ' 🎉</h1>
  <p style="color:#64748b;margin:0 0 24px">Hallo ' . htmlspecialchars($toName, ENT_QUOTES, 'UTF-8') . ',<br><br>
  bitte bestätige deine E-Mail-Adresse, um dein Konto zu aktivieren.</p>
  <a href="' . htmlspecialchars($confirmUrl, ENT_QUOTES, 'UTF-8') . '"
     style="display:inline-block;padding:14px 28px;background:#0f172a;color:#fff;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px">
    E-Mail bestätigen
  </a>
  <p style="font-size:12px;color:#94a3b8;margin-top:32px">
    Falls du dich nicht bei ' . APP_NAME . ' registriert hast, kannst du diese E-Mail ignorieren.<br>
    Der Link ist 48 Stunden gültig.
  </p>
</div>
</body></html>';

    $headers  = 'MIME-Version: 1.0' . "\r\n";
    $headers .= 'Content-type: text/html; charset=UTF-8' . "\r\n";
    $headers .= 'From: ' . MAIL_FROM_NAME . ' <' . MAIL_FROM . '>' . "\r\n";
    $headers .= 'Reply-To: ' . MAIL_FROM . "\r\n";

    return mail($toEmail, '=?UTF-8?B?' . base64_encode($subject) . '?=', $html, $headers);
}
