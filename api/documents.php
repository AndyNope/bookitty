<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

set_cors_headers();

$userId = require_auth();
$pdo    = get_db();
$method = $_SERVER['REQUEST_METHOD'];

function row_to_document(array $row): array {
    return [
        'id'              => $row['id'],
        'fileName'        => $row['file_name'],
        'uploadedAt'      => $row['uploaded_at'],
        'status'          => $row['status'],
        'draft'           => json_decode($row['draft_json'] ?? '{}', true) ?? [],
        'originalDraft'   => $row['original_draft_json']
                                ? (json_decode($row['original_draft_json'], true) ?? null)
                                : null,
        'previewUrl'      => $row['preview_url']   ?: null,
        'detection'       => $row['detection']     ?: null,
        'templateApplied' => (bool) $row['template_applied'],
        'vendorPattern'   => $row['vendor_pattern'] ?: null,
    ];
}

// ─── GET ──────────────────────────────────────────────────────────────────────
if ($method === 'GET') {
    $stmt = $pdo->prepare(
        'SELECT * FROM documents WHERE user_id = ? ORDER BY uploaded_at DESC, created_at DESC'
    );
    $stmt->execute([$userId]);
    echo json_encode(array_map('row_to_document', $stmt->fetchAll()));

// ─── POST – create ────────────────────────────────────────────────────────────
} elseif ($method === 'POST') {
    $d  = json_decode(file_get_contents('php://input'), true) ?? [];
    $id = $d['id'] ?? bin2hex(random_bytes(16));

    $pdo->prepare(
        'INSERT INTO documents
             (id, user_id, file_name, uploaded_at, status,
              draft_json, original_draft_json, preview_url,
              detection, template_applied, vendor_pattern)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)'
    )->execute([
        $id, $userId,
        $d['fileName']      ?? '',
        $d['uploadedAt']    ?? date('Y-m-d'),
        $d['status']        ?? 'In Prüfung',
        json_encode($d['draft']         ?? []),
        json_encode($d['originalDraft'] ?? null),
        $d['previewUrl']    ?? null,
        $d['detection']     ?? null,
        empty($d['templateApplied']) ? 0 : 1,
        $d['vendorPattern'] ?? null,
    ]);
    echo json_encode(['ok' => true, 'id' => $id]);

// ─── PUT – partial update ─────────────────────────────────────────────────────
} elseif ($method === 'PUT') {
    $d  = json_decode(file_get_contents('php://input'), true) ?? [];
    $id = $d['id'] ?? '';
    if (!$id) { http_response_code(400); echo json_encode(['error' => 'id fehlt']); exit; }

    $sets = []; $params = [];
    if (array_key_exists('status',          $d)) { $sets[] = 'status = ?';           $params[] = $d['status']; }
    if (array_key_exists('draft',           $d)) { $sets[] = 'draft_json = ?';       $params[] = json_encode($d['draft']); }
    if (array_key_exists('templateApplied', $d)) { $sets[] = 'template_applied = ?'; $params[] = $d['templateApplied'] ? 1 : 0; }
    if (array_key_exists('vendorPattern',   $d)) { $sets[] = 'vendor_pattern = ?';   $params[] = $d['vendorPattern']; }
    if (array_key_exists('previewUrl',      $d)) { $sets[] = 'preview_url = ?';      $params[] = $d['previewUrl']; }

    if (empty($sets)) { echo json_encode(['ok' => true]); exit; }

    $params[] = $id;
    $params[] = $userId;
    $pdo->prepare('UPDATE documents SET ' . implode(', ', $sets) . ' WHERE id = ? AND user_id = ?')
        ->execute($params);
    echo json_encode(['ok' => true]);

// ─── DELETE ───────────────────────────────────────────────────────────────────
} elseif ($method === 'DELETE') {
    $d  = json_decode(file_get_contents('php://input'), true) ?? [];
    $id = $d['id'] ?? '';
    if (!$id) { http_response_code(400); echo json_encode(['error' => 'id fehlt']); exit; }

    // Remove uploaded file if stored in our uploads folder
    $stmt = $pdo->prepare('SELECT preview_url FROM documents WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $userId]);
    $doc = $stmt->fetch();
    if ($doc && $doc['preview_url'] && str_contains((string)$doc['preview_url'], '/api/uploads/')) {
        $filePath = UPLOAD_DIR . $userId . '/' . basename($doc['preview_url']);
        if (file_exists($filePath)) @unlink($filePath);
    }

    $pdo->prepare('DELETE FROM documents WHERE id = ? AND user_id = ?')->execute([$id, $userId]);
    echo json_encode(['ok' => true]);

} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
}
