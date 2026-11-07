<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/auth.php';

set_cors_headers();
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405); echo json_encode(['error' => 'Method Not Allowed']); exit;
}
$payload = get_auth_payload();
$userId = (int) $payload['sub'];
$companyId = isset($payload['company_id']) ? (int) $payload['company_id'] : $userId;
if ($userId !== $companyId || $payload['role'] !== 'admin') {
    http_response_code(403); echo json_encode(['error' => 'Nur der Firmeninhaber kann das Zugriffsprotokoll einsehen.']); exit;
}
$stmt = get_db()->prepare('SELECT a.id, a.action, a.target_type, a.target_id, a.created_at, u.name AS actor_name
    FROM company_activity a LEFT JOIN users u ON u.id = a.actor_id
    WHERE a.company_id = ? ORDER BY a.id DESC LIMIT 100');
$stmt->execute([$companyId]);
echo json_encode(array_map(fn($row) => [
    'id' => (int) $row['id'], 'action' => $row['action'], 'targetType' => $row['target_type'],
    'targetId' => $row['target_id'], 'createdAt' => $row['created_at'], 'actorName' => $row['actor_name'] ?? 'Entferntes Konto',
], $stmt->fetchAll()));