<?php
/**
 * document-learning.php
 *
 * Accepts anonymised import-mapping corrections from opted-in users and
 * stores them in `document_training_samples` for server-side aggregation.
 *
 * POST  /api/document-learning.php
 * Body: { samples: Array<{ type: 'col_mapping'|'account', fingerprint: string, payload: object, use_count: number }> }
 *
 * Auth: optional JWT (user_id stored when present, NULL when anonymous).
 * Opt-in flag is enforced on the client; the server stores what it receives.
 */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/jwt.php';

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Auth is optional – try to extract user_id from JWT if present
$userId = null;
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (str_starts_with($authHeader, 'Bearer ')) {
    $token = substr($authHeader, 7);
    try {
        $payload = jwt_decode($token);
        $userId  = (int)($payload['sub'] ?? 0) ?: null;
    } catch (\Exception $e) {
        // invalid token – continue as anonymous
    }
}

$body    = json_decode(file_get_contents('php://input'), true) ?? [];
$samples = $body['samples'] ?? [];

if (!is_array($samples) || count($samples) === 0) {
    http_response_code(400);
    echo json_encode(['error' => 'samples array required']);
    exit;
}

if (count($samples) > 500) {
    http_response_code(400);
    echo json_encode(['error' => 'Too many samples (max 500)']);
    exit;
}

$pdo = get_db();

$sql = '
    INSERT INTO document_training_samples (user_id, sample_type, fingerprint, payload, use_count)
    VALUES (:user_id, :type, :fingerprint, :payload, :use_count)
    ON DUPLICATE KEY UPDATE
        payload    = VALUES(payload),
        use_count  = use_count + VALUES(use_count),
        updated_at = CURRENT_TIMESTAMP
';
$stmt = $pdo->prepare($sql);

$inserted = 0;
foreach ($samples as $s) {
    $type        = (string)($s['type']        ?? '');
    $fingerprint = (string)($s['fingerprint'] ?? '');
    $payload     = $s['payload']     ?? null;
    $useCount    = (int)($s['use_count'] ?? 1);

    // Validate
    if (!in_array($type, ['col_mapping', 'account'], true)) continue;
    if ($fingerprint === '' || $payload === null) continue;
    if ($useCount < 1 || $useCount > 10000) continue;

    $stmt->execute([
        ':user_id'     => $userId,
        ':type'        => $type,
        ':fingerprint' => mb_substr($fingerprint, 0, 500),
        ':payload'     => json_encode($payload),
        ':use_count'   => $useCount,
    ]);
    $inserted++;
}

echo json_encode(['ok' => true, 'stored' => $inserted]);
