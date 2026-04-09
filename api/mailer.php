<?php
require_once __DIR__ . '/config.php';

/**
 * Sends the e-mail confirmation mail via PHP mail().
 * For SMTP, replace the mail() call with PHPMailer or similar.
 */
function send_confirmation_email(string $toEmail, string $toName, string $token): bool {
    $confirmUrl = rtrim(APP_URL, '/') . '/confirm?token=' . urlencode($token);
    $subject    = APP_NAME . ' – E-Mail-Adresse bestätigen';

    $html = '<!DOCTYPE html>
<html lang="de"><body style="font-family:system-ui,sans-serif;color:#1e293b;max-width:540px;margin:0 auto;padding:40px 24px;background:#f8fafc">
<div style="background:#fff;border-radius:16px;padding:40px 32px;border:1px solid #e2e8f0">
  <h1 style="font-size:22px;margin:0 0 8px">Willkommen bei ' . APP_NAME . '</h1>
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

/**
 * Sends an invoice summary e-mail to the customer.
 *
 * @param string $toEmail     Recipient e-mail address
 * @param string $toName      Recipient display name
 * @param array  $invoice     Associative array with invoice fields
 * @param string $issuerName  Company / sender name
 */
function send_invoice_email(string $toEmail, string $toName, array $invoice, string $issuerName): bool {
    $number  = htmlspecialchars($invoice['number']  ?? '', ENT_QUOTES, 'UTF-8');
    $date    = htmlspecialchars($invoice['date']    ?? '', ENT_QUOTES, 'UTF-8');
    $dueDate = htmlspecialchars($invoice['dueDate'] ?? '', ENT_QUOTES, 'UTF-8');
    $notes   = htmlspecialchars($invoice['notes']   ?? '', ENT_QUOTES, 'UTF-8');
    $iban    = htmlspecialchars($invoice['iban']    ?? '', ENT_QUOTES, 'UTF-8');
    $currency = htmlspecialchars($invoice['currency'] ?? 'CHF', ENT_QUOTES, 'UTF-8');
    $issuerSafe = htmlspecialchars($issuerName, ENT_QUOTES, 'UTF-8');
    $toNameSafe = htmlspecialchars($toName,     ENT_QUOTES, 'UTF-8');

    // Build positions table rows
    $rows = '';
    $subtotal = 0.0;
    foreach (($invoice['items'] ?? []) as $item) {
        $desc    = htmlspecialchars($item['description'] ?? '', ENT_QUOTES, 'UTF-8');
        $qty     = (float)($item['quantity']  ?? 1);
        $unit    = htmlspecialchars($item['unit'] ?? 'Stk.', ENT_QUOTES, 'UTF-8');
        $price   = (float)($item['unitPrice'] ?? 0);
        $lineNet = $qty * $price;
        $subtotal += $lineNet;
        $rows .= '<tr style="border-bottom:1px solid #f1f5f9">'
               . '<td style="padding:8px 0">' . $desc . '</td>'
               . '<td style="padding:8px;text-align:right;white-space:nowrap">' . rtrim(rtrim(number_format($qty, 2, '.', ''), '0'), '.') . ' ' . $unit . '</td>'
               . '<td style="padding:8px;text-align:right;white-space:nowrap">' . number_format($price, 2, '.', "'") . '</td>'
               . '<td style="padding:8px;text-align:right;font-weight:600;white-space:nowrap">' . number_format($lineNet, 2, '.', "'") . '</td>'
               . '</tr>';
    }

    $totalFormatted = $currency . ' ' . number_format($subtotal, 2, '.', "'");

    $notesHtml = $notes ? '<p style="color:#64748b;font-size:13px;margin-top:16px">' . nl2br($notes) . '</p>' : '';
    $ibanHtml  = $iban  ? '<p style="font-size:13px;color:#475569;margin-top:12px">IBAN: <strong>' . $iban . '</strong></p>' : '';

    $subject = APP_NAME . ' – Rechnung ' . $number;

    $html = '<!DOCTYPE html>
<html lang="de"><body style="font-family:system-ui,sans-serif;color:#1e293b;max-width:600px;margin:0 auto;padding:40px 24px;background:#f8fafc">
<div style="background:#fff;border-radius:16px;padding:40px 32px;border:1px solid #e2e8f0">
  <h1 style="font-size:20px;margin:0 0 4px">Rechnung ' . $number . '</h1>
  <p style="color:#64748b;margin:0 0 24px;font-size:13px">Von ' . $issuerSafe . ' · Datum: ' . $date . ' · Zahlbar bis: ' . $dueDate . '</p>
  <p style="margin:0 0 16px">Hallo ' . $toNameSafe . ',<br><br>anbei finden Sie unsere Rechnung. Bitte überweisen Sie den Betrag bis zum angegebenen Datum.</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    <thead>
      <tr style="border-bottom:2px solid #e2e8f0;color:#64748b;font-size:12px">
        <th style="text-align:left;padding-bottom:8px">Beschreibung</th>
        <th style="text-align:right;padding-bottom:8px;padding-right:8px">Menge</th>
        <th style="text-align:right;padding-bottom:8px;padding-right:8px">Preis</th>
        <th style="text-align:right;padding-bottom:8px">Betrag</th>
      </tr>
    </thead>
    <tbody>' . $rows . '</tbody>
  </table>
  <div style="text-align:right;margin-top:16px;font-size:18px;font-weight:700">' . $totalFormatted . '</div>
  ' . $ibanHtml . '
  ' . $notesHtml . '
  <p style="font-size:11px;color:#94a3b8;margin-top:32px">Diese E-Mail wurde automatisch von ' . APP_NAME . ' versendet.</p>
</div>
</body></html>';

    $headers  = 'MIME-Version: 1.0' . "\r\n";
    $headers .= 'Content-type: text/html; charset=UTF-8' . "\r\n";
    $headers .= 'From: ' . MAIL_FROM_NAME . ' <' . MAIL_FROM . '>' . "\r\n";
    $headers .= 'Reply-To: ' . MAIL_FROM . "\r\n";

    return mail($toEmail, '=?UTF-8?B?' . base64_encode($subject) . '?=', $html, $headers);
}
