<?php
require_once __DIR__ . '/jwt.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/permissions.php';
require_once __DIR__ . '/subscription.php';

/**
 * Extracts the Bearer token from the Authorization header.
 * Works on both Apache (getallheaders) and Nginx/PHP-FPM (HTTP_AUTHORIZATION).
 */
function _get_bearer_token(): string {
    if (function_exists('getallheaders')) {
        foreach (getallheaders() as $key => $value) {
            if (strtolower($key) === 'authorization') {
                if (preg_match('/^Bearer\s+(.+)$/i', trim($value), $m)) {
                    return $m[1];
                }
            }
        }
    }
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if ($auth && preg_match('/^Bearer\s+(.+)$/i', trim($auth), $m)) return $m[1];
    $auth = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($auth && preg_match('/^Bearer\s+(.+)$/i', trim($auth), $m)) return $m[1];
    return '';
}

/**
 * Decodes and validates the JWT, exits with 401 on failure.
 * Returns the full payload array.
 */
function get_auth_payload(): array {
    $token = _get_bearer_token();
    if (!$token) {
        http_response_code(401);
        echo json_encode(['error' => 'Nicht authentifiziert']);
        exit;
    }
    $payload = jwt_decode($token, JWT_SECRET);
    if (!$payload || !isset($payload['sub'], $payload['iat'], $payload['exp']) ||
        !is_numeric($payload['iat']) || (int) $payload['iat'] > time() + 60 ||
        (int) $payload['iat'] < time() - JWT_MAX_SESSION_SECONDS) {
        http_response_code(401);
        echo json_encode(['error' => 'Token ungültig oder abgelaufen']);
        exit;
    }
    $userId = (int) $payload['sub'];
    $tokenCompany = isset($payload['company_id']) ? (int) $payload['company_id'] : $userId;
    $stmt = get_db()->prepare('SELECT m.role, m.access_expires_at, m.custom_role_id, r.base_role, r.permissions_json, u.session_version
        FROM company_memberships m JOIN users u ON u.id = m.user_id
        LEFT JOIN company_roles r ON r.id = m.custom_role_id AND r.company_id = m.company_id
        WHERE m.user_id = ? AND m.company_id = ?');
    $stmt->execute([$userId, $tokenCompany]);
    $membership = $stmt->fetch();
    if (!$membership || (int) ($payload['session_version'] ?? 0) !== (int) $membership['session_version']) {
        http_response_code(401);
        echo json_encode(['error' => 'Zugang geändert oder entzogen. Bitte erneut anmelden.']);
        exit;
    }
    if (!empty($membership['access_expires_at']) && strtotime($membership['access_expires_at']) <= time()) {
        http_response_code(403);
        echo json_encode(['error' => 'Treuhänder-Zugang abgelaufen. Bitte erneut einladen.']);
        exit;
    }
    $permissions = null;
    if ($membership['custom_role_id'] !== null) {
        $permissions = json_decode($membership['permissions_json'] ?? '', true);
        if (!is_array($permissions) || !in_array($membership['base_role'], ['buchhalter', 'readonly'], true) ||
            count(array_diff($permissions, COMPANY_PERMISSION_GROUPS)) > 0) {
            http_response_code(403); echo json_encode(['error' => 'Ungültige Firmenrolle.']); exit;
        }
    }
    $payload['role'] = $membership['custom_role_id'] !== null ? $membership['base_role'] : $membership['role'];
    $payload['permissions'] = $permissions;
    if ($membership['access_expires_at'] !== null) {
        $payload['access_expires_at'] = $membership['access_expires_at'];
    } else {
        unset($payload['access_expires_at']);
    }
    authorize_company_permissions($permissions);
    $billing = get_db()->prepare('SELECT plan_code, subscription_status FROM billing_accounts WHERE company_id = ?');
    $billing->execute([$tokenCompany]);
    $subscription = $billing->fetch();
    $payload['subscription_active'] = subscription_has_access($subscription['plan_code'] ?? null, $subscription['subscription_status'] ?? null);
    $allowedWithoutSubscription = ['me.php', 'billing.php', 'companies.php', 'two-factor.php'];
    if (!$payload['subscription_active'] && !in_array(basename($_SERVER['SCRIPT_NAME'] ?? ''), $allowedWithoutSubscription, true)) {
        http_response_code(402);
        echo json_encode(['error' => 'Für diese Firma ist ein aktives Abo ab Solo erforderlich.', 'code' => 'subscription_required']);
        exit;
    }
    return $payload;
}

/**
 * Returns the authenticated user's own id.
 * Use for user-specific operations (e.g. read own profile).
 */
function require_auth(): int {
    return (int) get_auth_payload()['sub'];
}

/**
 * Returns the effective "data owner" user_id.
 * - Team members: returns their company_id (= admin's user id)
 * - Owners / standalone users: returns own id
 * Also enforces write-protection for 'readonly' role on mutating requests.
 */
function effective_uid(): int {
    $payload = get_auth_payload();
    if (in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT', 'PATCH', 'DELETE'])) {
        if (($payload['role'] ?? 'admin') === 'readonly') {
            http_response_code(403);
            echo json_encode(['error' => 'Nur-Lesen: keine Schreibberechtigung']);
            exit;
        }
    }
    // Check time-limited trustee access
    if (!empty($payload['access_expires_at'])) {
        if (strtotime($payload['access_expires_at']) < time()) {
            http_response_code(403);
            echo json_encode(['error' => 'Treuhänder-Zugang abgelaufen. Bitte erneut einladen.']);
            exit;
        }
    }
    return isset($payload['company_id']) ? (int) $payload['company_id'] : (int) $payload['sub'];
}

/**
 * Returns the authenticated user's role (defaults to 'admin' for existing tokens).
 */
function get_auth_role(): string {
    return get_auth_payload()['role'] ?? 'admin';
}

