<?php
function log_company_activity(PDO $pdo, int $companyId, int $actorId, string $action, string $targetType, ?string $targetId = null): void {
    $pdo->prepare('INSERT INTO company_activity (company_id, actor_id, action, target_type, target_id) VALUES (?, ?, ?, ?, ?)')
        ->execute([$companyId, $actorId, $action, $targetType, $targetId]);
}