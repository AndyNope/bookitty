<?php
/**
 * GET    /api/expenses.php          – List expenses (all for admin, own for others)
 * POST   /api/expenses.php          – Create a new expense
 * PUT    /api/expenses.php          – Update status (approve/reject) or edit expense
 * DELETE /api/expenses.php          – Delete expense
 */
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/db.php';

set_cors_headers();
header('Content-Type: application/json; charset=utf-8');

$companyId = effective_uid();   // reads + enforces role / readonly
$role      = get_auth_role();
$payload   = get_auth_payload();
$ownId     = (int) $payload['sub'];
$pdo       = get_pdo();

// ─── GET ──────────────────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Admins see all company expenses; others see only their own
    if ($role === 'admin') {
        $stmt = $pdo->prepare(
            'SELECT e.*, u.name AS submitter_name
             FROM expenses e
             JOIN users u ON u.id = e.user_id
             WHERE e.user_id = :uid
                OR (u.company_id = :cid AND :cid IS NOT NULL)
             ORDER BY e.date DESC, e.created_at DESC'
        );
        $stmt->execute([':uid' => $companyId, ':cid' => $companyId === $ownId ? null : $companyId]);
    } else {
        $stmt = $pdo->prepare(
            'SELECT e.*, u.name AS submitter_name
             FROM expenses e
             JOIN users u ON u.id = e.user_id
             WHERE e.user_id = :uid
             ORDER BY e.date DESC, e.created_at DESC'
        );
        $stmt->execute([':uid' => $ownId]);
    }
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    exit;
}

// ─── POST – create ────────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $id   = bin2hex(random_bytes(16));

    $stmt = $pdo->prepare(
        'INSERT INTO expenses (id, user_id, date, amount, currency, category, description, receipt_url)
         VALUES (:id, :uid, :date, :amount, :currency, :category, :description, :receipt_url)'
    );
    $stmt->execute([
        ':id'          => $id,
        ':uid'         => $ownId,
        ':date'        => $body['date']        ?? date('Y-m-d'),
        ':amount'      => (float)($body['amount'] ?? 0),
        ':currency'    => $body['currency']    ?? 'CHF',
        ':category'    => $body['category']    ?? 'Diverses',
        ':description' => $body['description'] ?? '',
        ':receipt_url' => $body['receipt_url'] ?? null,
    ]);
    echo json_encode(['id' => $id]);
    exit;
}

// ─── PUT – approve / reject / edit ───────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $id   = $body['id'] ?? '';
    if (!$id) { http_response_code(400); echo json_encode(['error' => 'id required']); exit; }

    $action = $body['action'] ?? 'edit';

    if ($action === 'approve' || $action === 'reject') {
        if ($role !== 'admin') {
            http_response_code(403);
            echo json_encode(['error' => 'Nur Admins können Spesen genehmigen']);
            exit;
        }
        $newStatus = $action === 'approve' ? 'Genehmigt' : 'Abgelehnt';

        // verify it belongs to this company
        $check = $pdo->prepare('SELECT e.id, e.amount, e.currency, e.description, e.date FROM expenses e
            JOIN users u ON u.id = e.user_id
            WHERE e.id = :eid AND (e.user_id = :co OR u.company_id = :co)');
        $check->execute([':eid' => $id, ':co' => $companyId]);
        $exp = $check->fetch(PDO::FETCH_ASSOC);
        if (!$exp) { http_response_code(404); echo json_encode(['error' => 'Not found']); exit; }

        // update status
        $upd = $pdo->prepare('UPDATE expenses SET status = :s, approved_by = :ab, approved_at = NOW() WHERE id = :id');
        $upd->execute([':s' => $newStatus, ':ab' => $ownId, ':id' => $id]);

        // auto-create booking on approval
        if ($action === 'approve') {
            $bookingId = bin2hex(random_bytes(16));
            $bstmt = $pdo->prepare(
                'INSERT INTO bookings (id, user_id, date, description, account, contra_account, category, amount, currency, payment_status, type)
                 VALUES (:id, :uid, :date, :desc, :acc, :contra, :cat, :amt, :cur, "Bezahlt", "Ausgabe")'
            );
            $bstmt->execute([
                ':id'     => $bookingId,
                ':uid'    => $companyId,
                ':date'   => $exp['date'],
                ':desc'   => 'Spese: ' . $exp['description'],
                ':acc'    => '5800 Reise- und Spesenvergütungen',
                ':contra' => '1000 Kasse',
                ':cat'    => 'Spesen',
                ':amt'    => $exp['amount'],
                ':cur'    => $exp['currency'],
            ]);
            $pdo->prepare('UPDATE expenses SET booking_id = :bid WHERE id = :id')
                ->execute([':bid' => $bookingId, ':id' => $id]);
        }

        echo json_encode(['ok' => true, 'status' => $newStatus]);
        exit;
    }

    // plain edit (own expense, only if still Ausstehend)
    $stmt = $pdo->prepare('SELECT id, user_id, status FROM expenses WHERE id = :id');
    $stmt->execute([':id' => $id]);
    $exp = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$exp || (int)$exp['user_id'] !== $ownId || $exp['status'] !== 'Ausstehend') {
        http_response_code(403); echo json_encode(['error' => 'Nicht bearbeitbar']); exit;
    }
    $upd = $pdo->prepare(
        'UPDATE expenses SET date=:date, amount=:amount, currency=:currency, category=:category,
         description=:description, receipt_url=:receipt_url WHERE id=:id'
    );
    $upd->execute([
        ':date'        => $body['date']        ?? $exp['date'],
        ':amount'      => (float)($body['amount'] ?? 0),
        ':currency'    => $body['currency']    ?? 'CHF',
        ':category'    => $body['category']    ?? 'Diverses',
        ':description' => $body['description'] ?? '',
        ':receipt_url' => $body['receipt_url'] ?? null,
        ':id'          => $id,
    ]);
    echo json_encode(['ok' => true]);
    exit;
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $id   = $body['id'] ?? '';
    // Allow own user, or admin of company
    $stmt = $pdo->prepare(
        'DELETE FROM expenses WHERE id = :id AND (user_id = :own OR user_id IN
         (SELECT id FROM users WHERE company_id = :co))'
    );
    $stmt->execute([':id' => $id, ':own' => $ownId, ':co' => $companyId]);
    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method Not Allowed']);
