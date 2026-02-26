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
    // Fallback for Nginx / PHP-FPM setups
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/^Bearer\s+(.+)$/i', trim($auth), $m)) {
        return $m[1];
    }
    return '';
}

/**
 * Requires a valid JWT. Returns the authenticated user_id (int) or exits with 401.
 */
function require_auth(): int {
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
    return (int) $payload['sub'];
}
