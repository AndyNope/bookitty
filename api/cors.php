<?php
/**
 * cors.php – CORS-Header + globaler Exception-Handler
 *
 * Wird nach config.php eingebunden, deshalb sind alle Konstanten bereits
 * definiert (CORS_ORIGINS, APP_URL, …).
 */

// ─── CORS ────────────────────────────────────────────────────────────────────
function set_cors_headers(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (in_array($origin, CORS_ORIGINS, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Credentials: true');
        header('Vary: Origin');
    }
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Content-Type: application/json; charset=utf-8');

    // Preflight
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

// ─── Global Exception Handler ────────────────────────────────────────────────
set_exception_handler(function (Throwable $e): void {
    http_response_code(500);
    $isProd = defined('APP_URL') && str_contains(APP_URL, 'bookitty.bidebliss.com');
    echo json_encode(
        $isProd
            ? ['error' => 'Internal Server Error']
            : ['error' => $e->getMessage(), 'file' => $e->getFile(), 'line' => $e->getLine()]
    );
});

