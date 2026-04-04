<?php
/**
 * portal.php – Public customer portal (no authentication required)
 *
 * GET  /api/portal.php?token=xxx  → public invoice view
 * POST /api/portal.php            → generate portal token (requires auth)
 */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';

set_cors_headers();

$pdo    = get_db();
$method = $_SERVER['REQUEST_METHOD'];

// ─── GET – public invoice by token ───────────────────────────────────────────
if ($method === 'GET') {
    $token = trim($_GET['token'] ?? '');
    if (!$token) {
        http_response_code(400);
        echo json_encode(['error' => 'Token fehlt']);
        exit;
    }

    $stmt = $pdo->prepare(
        'SELECT i.*, u.company_name, u.name AS owner_name
         FROM invoices i
         JOIN users u ON u.id = i.user_id
         WHERE i.portal_token = ?'
    );
    $stmt->execute([$token]);
    $inv = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$inv) {
        http_response_code(404);
        echo json_encode(['error' => 'Rechnung nicht gefunden']);
        exit;
    }

    // Return only safe public fields
    echo json_encode([
        'number'        => $inv['number'],
        'date'          => $inv['date'],
        'dueDate'       => $inv['due_date'],
        'status'        => $inv['status'],
        'contactName'   => $inv['contact_name'],
        'items'         => json_decode($inv['items_json'] ?? '[]', true),
        'currency'      => $inv['currency'],
        'notes'         => $inv['notes'],
        'iban'          => $inv['iban'],
        'reference'     => $inv['reference'],
        'issuerCompany' => $inv['company_name'] ?: $inv['owner_name'],
    ]);
    exit;
}

// ─── POST – generate portal token (auth required) ────────────────────────────
if ($method === 'POST') {
    require_once __DIR__ . '/auth.php';
    $userId = effective_uid();

    $d   = json_decode(file_get_contents('php://input'), true) ?? [];
    $id  = $d['id'] ?? '';
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'id fehlt']);
        exit;
    }

    // Verify ownership
    $stmt = $pdo->prepare('SELECT id, portal_token FROM invoices WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $userId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        http_response_code(403);
        echo json_encode(['error' => 'Nicht berechtigt']);
        exit;
    }

    // Reuse existing token or create new
    $token = $row['portal_token'] ?: bin2hex(random_bytes(24));
    $pdo->prepare('UPDATE invoices SET portal_token = ? WHERE id = ?')->execute([$token, $id]);

    $base = rtrim(defined('BASE_URL') ? BASE_URL : ($_SERVER['HTTP_ORIGIN'] ?? ''), '/');
    echo json_encode(['token' => $token, 'url' => "{$base}/portal/{$token}"]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Methode nicht erlaubt']);
