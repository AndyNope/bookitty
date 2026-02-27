<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

set_cors_headers();

set_exception_handler(function (Throwable $e) {
    if (!headers_sent()) http_response_code(500);
    echo json_encode(['error' => 'Server-Fehler: ' . $e->getMessage()]);
});
set_error_handler(function (int $errno, string $errstr) {
    throw new ErrorException($errstr, $errno);
});

$userId = require_auth();
$pdo    = get_db();
$method = $_SERVER['REQUEST_METHOD'];

// ─── Ensure tables exist ──────────────────────────────────────────────────────
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS imap_settings (
            user_id   INT          NOT NULL,
            host      VARCHAR(255) NOT NULL DEFAULT '',
            port      SMALLINT     NOT NULL DEFAULT 993,
            username  VARCHAR(255) NOT NULL DEFAULT '',
            password  VARCHAR(500) NOT NULL DEFAULT '',
            ssl       TINYINT(1)   NOT NULL DEFAULT 1,
            folder    VARCHAR(100) NOT NULL DEFAULT 'INBOX',
            PRIMARY KEY (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
} catch (Throwable $e) { /* table already exists or FK issue – ignore */ }

try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS email_imports (
            id          INT          NOT NULL AUTO_INCREMENT,
            user_id     INT          NOT NULL,
            message_id  VARCHAR(500) NOT NULL,
            imported_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_email_user (user_id, message_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
} catch (Throwable $e) { /* table already exists – ignore */ }

// ─── GET – return saved settings (password masked) ───────────────────────────
if ($method === 'GET') {
    $stmt = $pdo->prepare('SELECT host, port, username, ssl, folder FROM imap_settings WHERE user_id = ?');
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    echo json_encode($row ?: (object)[]);
    exit;
}

// ─── PUT – save IMAP settings ────────────────────────────────────────────────
if ($method === 'PUT') {
    $d = json_decode(file_get_contents('php://input'), true) ?? [];
    $host     = trim($d['host']     ?? '');
    $port     = (int)($d['port']    ?? 993);
    $username = trim($d['username'] ?? '');
    $password = $d['password']      ?? '';
    $ssl      = (int)(bool)($d['ssl'] ?? true);
    $folder   = trim($d['folder']   ?? 'INBOX');

    // Don't overwrite password if placeholder sent
    if ($password === '••••••••') {
        $stmt = $pdo->prepare('SELECT password FROM imap_settings WHERE user_id = ?');
        $stmt->execute([$userId]);
        $existing = $stmt->fetch();
        $password = $existing['password'] ?? '';
    }

    $pdo->prepare(
        'INSERT INTO imap_settings (user_id, host, port, username, password, ssl, folder)
         VALUES (?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE
             host=VALUES(host), port=VALUES(port), username=VALUES(username),
             password=VALUES(password), ssl=VALUES(ssl), folder=VALUES(folder)'
    )->execute([$userId, $host, $port, $username, $password, $ssl, $folder]);

    echo json_encode(['ok' => true]);
    exit;
}

// ─── POST – fetch emails via IMAP and return new ones ────────────────────────
if ($method === 'POST') {
    if (!function_exists('imap_open')) {
        http_response_code(501);
        echo json_encode(['error' => 'IMAP extension (php-imap) nicht aktiviert auf diesem Server.']);
        exit;
    }

    $stmt = $pdo->prepare('SELECT * FROM imap_settings WHERE user_id = ?');
    $stmt->execute([$userId]);
    $cfg = $stmt->fetch();

    if (!$cfg || !$cfg['host'] || !$cfg['username'] || !$cfg['password']) {
        http_response_code(422);
        echo json_encode(['error' => 'Keine IMAP-Konfiguration hinterlegt.']);
        exit;
    }

    $proto  = $cfg['ssl'] ? 'ssl' : 'notls';
    $mbox   = sprintf('{%s:%d/imap/%s}%s', $cfg['host'], $cfg['port'], $proto, $cfg['folder']);

    $conn = @imap_open($mbox, $cfg['username'], $cfg['password'], 0, 1);
    if (!$conn) {
        http_response_code(502);
        $err = imap_last_error() ?: 'Verbindung fehlgeschlagen';
        echo json_encode(['error' => "IMAP: $err"]);
        exit;
    }

    // Fetch last 50 messages, newest first
    $count = imap_num_msg($conn);
    $start = max(1, $count - 49);
    $uids  = imap_fetch_overview($conn, "$start:$count", 0);

    $results = [];

    foreach (array_reverse($uids) as $msg) {
        $messageId = trim($msg->message_id ?? ('uid-' . $msg->uid));

        // Deduplicate
        $check = $pdo->prepare('SELECT id FROM email_imports WHERE user_id = ? AND message_id = ?');
        $check->execute([$userId, $messageId]);
        if ($check->fetch()) continue; // already imported

        $raw = imap_fetchbody($conn, $msg->msgno, '');
        if (!$raw) continue;

        // Decode the full RFC 822 message
        $subject = imap_utf8($msg->subject ?? '');
        $from    = $msg->from ?? '';
        $date    = $msg->date ?? '';

        // Look for PDF attachments
        $structure = imap_fetchstructure($conn, $msg->msgno);
        $attachments = [];
        _extract_pdf_parts($conn, $msg->msgno, $structure, $attachments);

        if (empty($attachments)) continue; // no PDF → skip

        // Mark as imported
        $pdo->prepare('INSERT IGNORE INTO email_imports (user_id, message_id) VALUES (?,?)')->execute([$userId, $messageId]);

        foreach ($attachments as $att) {
            $results[] = [
                'subject'    => $subject,
                'from'       => $from,
                'date'       => $date,
                'messageId'  => $messageId,
                'filename'   => $att['filename'],
                'data'       => $att['data'], // base64-encoded PDF data
            ];
        }
    }

    imap_close($conn);
    echo json_encode(['ok' => true, 'emails' => $results]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method Not Allowed']);

// ─── Helper: recursively extract PDF parts ───────────────────────────────────
function _extract_pdf_parts($conn, int $msgno, $structure, array &$out, string $prefix = ''): void {
    if (!empty($structure->parts)) {
        foreach ($structure->parts as $i => $part) {
            $section = $prefix === '' ? (string)($i + 1) : "$prefix." . ($i + 1);
            _extract_pdf_parts($conn, $msgno, $part, $out, $section);
        }
        return;
    }

    $isPdf = false;
    if ($structure->type === 3) { // APPLICATION
        $subtype = strtolower($structure->subtype ?? '');
        if ($subtype === 'pdf' || $subtype === 'octet-stream') $isPdf = true;
    }
    if (!$isPdf) return;

    $partNum = $prefix === '' ? '1' : $prefix;
    $raw = imap_fetchbody($conn, $msgno, $partNum);
    if (!$raw) return;

    $enc = $structure->encoding ?? 0;
    if ($enc === 3) { // BASE64
        $decoded = base64_decode($raw);
    } elseif ($enc === 4) { // QUOTED-PRINTABLE
        $decoded = quoted_printable_decode($raw);
    } else {
        $decoded = $raw;
    }

    // Check magic bytes for PDF
    if (substr($decoded, 0, 4) !== '%PDF') return;

    $filename = 'rechnung.pdf';
    if (!empty($structure->dparameters)) {
        foreach ($structure->dparameters as $param) {
            if (strtolower($param->attribute) === 'filename') {
                $filename = imap_utf8($param->value);
                break;
            }
        }
    }
    if (!empty($structure->parameters)) {
        foreach ($structure->parameters as $param) {
            if (strtolower($param->attribute) === 'name') {
                $filename = imap_utf8($param->value);
            }
        }
    }

    $out[] = ['filename' => $filename, 'data' => base64_encode($decoded)];
}
