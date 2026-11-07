<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/activity_lib.php';

set_cors_headers();
$payload = get_auth_payload();
$userId = (int) $payload['sub'];
$companyId = isset($payload['company_id']) ? (int) $payload['company_id'] : $userId;
if ($userId !== $companyId || $payload['role'] !== 'admin') {
    http_response_code(403); echo json_encode(['error' => 'Nur der Firmeninhaber kann Rollen verwalten.']); exit;
}
$pdo = get_db();
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->prepare('SELECT id, name, base_role, permissions_json FROM company_roles WHERE company_id = ? ORDER BY name');
    $stmt->execute([$companyId]);
    echo json_encode(array_map(fn($row) => [
        'id' => (int) $row['id'], 'name' => $row['name'], 'baseRole' => $row['base_role'],
        'permissions' => json_decode($row['permissions_json'], true) ?: [],
    ], $stmt->fetchAll()));
    exit;
}

$body = json_decode(file_get_contents('php://input'), true) ?? [];
$method = $_SERVER['REQUEST_METHOD'];
$id = (int) ($body['id'] ?? 0);
if ($method === 'POST' || $method === 'PUT') {
    $name = trim((string) ($body['name'] ?? ''));
    $baseRole = (string) ($body['baseRole'] ?? '');
    $permissions = $body['permissions'] ?? null;
    if ($name === '' || mb_strlen($name) > 100 || !in_array($baseRole, ['buchhalter', 'readonly'], true) ||
        !is_array($permissions) || !array_is_list($permissions) ||
        count(array_filter($permissions, fn($permission) => !is_string($permission) || !in_array($permission, COMPANY_PERMISSION_GROUPS, true))) > 0) {
        http_response_code(400); echo json_encode(['error' => 'Ungültige Rolle oder Funktionsrechte.']); exit;
    }
    $encoded = json_encode(array_values(array_unique($permissions)));
    try {
        $pdo->beginTransaction();
        if ($method === 'POST') {
            $pdo->prepare('INSERT INTO company_roles (company_id, name, base_role, permissions_json) VALUES (?, ?, ?, ?)')
                ->execute([$companyId, $name, $baseRole, $encoded]);
            $id = (int) $pdo->lastInsertId();
        } else {
            $stmt = $pdo->prepare('SELECT id FROM company_roles WHERE id = ? AND company_id = ? FOR UPDATE');
            $stmt->execute([$id, $companyId]);
            if (!$stmt->fetchColumn()) {
                $pdo->rollBack(); http_response_code(404); echo json_encode(['error' => 'Rolle nicht gefunden.']); exit;
            }
            $pdo->prepare('UPDATE company_roles SET name = ?, base_role = ?, permissions_json = ? WHERE id = ? AND company_id = ?')
                ->execute([$name, $baseRole, $encoded, $id, $companyId]);
            $pdo->prepare('UPDATE company_memberships SET role = ? WHERE company_id = ? AND custom_role_id = ?')
                ->execute([$baseRole, $companyId, $id]);
            $pdo->prepare('UPDATE invitations SET role = ? WHERE company_id = ? AND custom_role_id = ? AND used = 0')
                ->execute([$baseRole, $companyId, $id]);
        }
        log_company_activity($pdo, $companyId, $userId, $method === 'POST' ? 'role_created' : 'role_changed', 'role', (string) $id);
        $pdo->commit();
    } catch (PDOException $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        if ($error->getCode() === '23000') {
            http_response_code(409); echo json_encode(['error' => 'Eine Rolle mit diesem Namen existiert bereits.']); exit;
        }
        throw $error;
    }
    echo json_encode(['ok' => true, 'id' => $id]);
    exit;
}

if ($method === 'DELETE') {
    $pdo->beginTransaction();
    $stmt = $pdo->prepare('SELECT id FROM company_roles WHERE id = ? AND company_id = ? FOR UPDATE');
    $stmt->execute([$id, $companyId]);
    if (!$stmt->fetchColumn()) {
        $pdo->rollBack(); http_response_code(404); echo json_encode(['error' => 'Rolle nicht gefunden.']); exit;
    }
    $used = $pdo->prepare('SELECT 1 FROM company_memberships WHERE custom_role_id = ? UNION ALL SELECT 1 FROM invitations WHERE custom_role_id = ? AND used = 0 AND expires_at > NOW() LIMIT 1');
    $used->execute([$id, $id]);
    if ($used->fetchColumn()) {
        $pdo->rollBack(); http_response_code(409); echo json_encode(['error' => 'Rolle wird noch von einem Zugang oder einer Einladung verwendet.']); exit;
    }
    $pdo->prepare('UPDATE invitations SET custom_role_id = NULL WHERE custom_role_id = ?')->execute([$id]);
    $pdo->prepare('DELETE FROM company_roles WHERE id = ? AND company_id = ?')->execute([$id, $companyId]);
    log_company_activity($pdo, $companyId, $userId, 'role_removed', 'role', (string) $id);
    $pdo->commit();
    echo json_encode(['ok' => true]);
    exit;
}
http_response_code(405);
echo json_encode(['error' => 'Method Not Allowed']);