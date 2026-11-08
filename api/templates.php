<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

set_cors_headers();

$userId = effective_uid();
$pdo    = get_db();
$method = $_SERVER['REQUEST_METHOD'];

// ─── GET – return all templates as { pattern: template } ─────────────────────
if ($method === 'GET') {
    $stmt = $pdo->prepare('SELECT pattern, template_json FROM templates WHERE user_id = ?');
    $stmt->execute([$userId]);
    $result = [];
    foreach ($stmt->fetchAll() as $row) {
        $result[$row['pattern']] = json_decode($row['template_json'], true);
    }
    echo json_encode($result);

// ─── POST – upsert a template ─────────────────────────────────────────────────
} elseif ($method === 'POST') {
    $d       = json_decode(file_get_contents('php://input'), true) ?? [];
    $pattern = is_string($d['pattern'] ?? null) ? trim($d['pattern']) : '';
    $tpl     = $d['template'] ?? [];
    if (!$pattern || mb_strlen($pattern) > 255 || !is_array($tpl)) { http_response_code(400); echo json_encode(['error' => 'Ungültige Vorlage']); exit; }
    $allowed = ['account', 'contraAccount', 'category', 'type', 'vatRate'];
    $tpl = array_intersect_key($tpl, array_flip($allowed));
    if (!$tpl) { http_response_code(400); echo json_encode(['error' => 'Keine lernbaren Felder']); exit; }
    foreach ($tpl as $key => $value) {
        if ($key === 'vatRate' ? (!is_numeric($value) || $value < 0 || $value > 100) : (!is_string($value) || mb_strlen($value) > 255)) {
            http_response_code(400); echo json_encode(['error' => 'Ungültiges Vorlagenfeld']); exit;
        }
        if ($key === 'vatRate') $tpl[$key] = (float) $value;
    }
    if (isset($tpl['type']) && !in_array($tpl['type'], ['Einnahme', 'Ausgabe'], true)) {
        http_response_code(400); echo json_encode(['error' => 'Ungültiger Buchungstyp']); exit;
    }

    $pdo->prepare(
        'INSERT INTO templates (user_id, pattern, template_json)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE template_json = JSON_MERGE_PATCH(template_json, VALUES(template_json))'
    )->execute([$userId, $pattern, json_encode($tpl)]);

    echo json_encode(['ok' => true]);

// ─── DELETE – remove a template ───────────────────────────────────────────────
} elseif ($method === 'DELETE') {
    $d       = json_decode(file_get_contents('php://input'), true) ?? [];
    $pattern = trim($d['pattern'] ?? '');
    if (!$pattern) { http_response_code(400); echo json_encode(['error' => 'pattern fehlt']); exit; }

    $pdo->prepare('DELETE FROM templates WHERE user_id = ? AND pattern = ?')->execute([$userId, $pattern]);
    echo json_encode(['ok' => true]);

} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
}
