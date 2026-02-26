<?php
/**
 * Sets CORS headers and handles OPTIONS preflight.
 * Must be called at the top of every public endpoint BEFORE any output.
 */

// Global error handler – turns any uncaught exception/error into a JSON 500
// instead of an empty HTTP 500 that is impossible to debug.
set_exception_handler(function (Throwable $e): void {
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
    }
    $isProd = ($_SERVER['HTTP_HOST'] ?? '') === 'bookitty.bidebliss.com';
    echo json_encode([
        'error'   => 'Server-Fehler',
        'detail'  => $isProd ? 'Bitte kontaktiere den Support.' : $e->getMessage(),
        'file'    => $isProd ? null : $e->getFile() . ':' . $e->getLine(),
    ]);
    exit;
});

function set_cors_headers(): void {
    $origin  = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowed = defined('CORS_ORIGINS') ? CORS_ORIGINS : [];

    if (in_array($origin, $allowed, true)) {
        header("Access-Control-Allow-Origin: $origin");
    }
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Vary: Origin');

    // Handle preflight and exit immediately
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }

    // All responses from these endpoints are JSON
    header('Content-Type: application/json; charset=utf-8');
}
