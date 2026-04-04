<?php
require_once __DIR__ . '/jwt.php';
require_once __DIR__ . '/config.php';

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
    if (!$payload || !isset($payload['sub'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Token ungültig oder abgelaufen']);
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

