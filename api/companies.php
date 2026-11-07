<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/activity_lib.php';

set_cors_headers();
$payload = get_auth_payload();
$userId = (int) $payload['sub'];
$pdo = get_db();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->prepare("SELECT m.company_id, m.role, COALESCE(NULLIF(p.name, ''), owner.name) AS name
        FROM company_memberships m
        JOIN users owner ON owner.id = m.company_id
        LEFT JOIN company_profiles p ON p.user_id = m.company_id
        WHERE m.user_id = ? AND (m.access_expires_at IS NULL OR m.access_expires_at > NOW())
        ORDER BY name, m.company_id");
    $stmt->execute([$userId]);
    echo json_encode(array_map(fn($row) => [
        'id' => (int) $row['company_id'], 'name' => $row['name'], 'role' => $row['role'],
    ], $stmt->fetchAll()));
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $companyId = (int) ($body['company_id'] ?? 0);
    $stmt = $pdo->prepare('SELECT role, access_expires_at FROM company_memberships
        WHERE user_id = ? AND company_id = ? AND (access_expires_at IS NULL OR access_expires_at > NOW())');
    $stmt->execute([$userId, $companyId]);
    $membership = $stmt->fetch();
    if (!$membership) {
        http_response_code(403); echo json_encode(['error' => 'Kein Zugang zu dieser Firma.']); exit;
    }
    $jwtPayload = [
        'sub' => $userId,
        'email' => $payload['email'] ?? '',
        'role' => $membership['role'],
        'session_version' => (int) ($payload['session_version'] ?? 0),
        'iat' => (int) $payload['iat'],
        'exp' => (int) $payload['exp'],
    ];
    if ($companyId !== $userId) $jwtPayload['company_id'] = $companyId;
    if ($membership['access_expires_at']) {
        $jwtPayload['access_expires_at'] = $membership['access_expires_at'];
        $jwtPayload['exp'] = min($jwtPayload['exp'], strtotime($membership['access_expires_at']));
    }
    log_company_activity($pdo, $companyId, $userId, 'company_switched', 'company', (string) $companyId);
    echo json_encode(['token' => jwt_encode($jwtPayload, JWT_SECRET)]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method Not Allowed']);