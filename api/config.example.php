<?php
// Copy this file to config.php and fill in real values.
// config.php is listed in .gitignore – never commit real credentials.

$host   = $_SERVER['HTTP_HOST'] ?? 'localhost';
$isProd = ($host === 'bookitty.bidebliss.com');

define('DB_HOST', '127.0.0.1');
define('DB_PORT', 3306);
define('DB_NAME', $isProd ? 'bookitty'     : 'dev_bookitty');
define('DB_USER', $isProd ? 'bookitty'     : 'dev_bookitty');
define('DB_PASS', $isProd ? 'PROD_DB_PASS' : 'DEV_DB_PASS');

define('JWT_SECRET', 'REPLACE_WITH_RANDOM_64_CHAR_STRING');
define('JWT_EXPIRY', 60 * 60 * 24 * 30);

define('APP_URL',       'https://bookitty.bidebliss.com');
define('APP_NAME',      'Bookitty');
define('MAIL_FROM',     'noreply@bidebliss.com');
define('MAIL_FROM_NAME','Bookitty');

define('CORS_ORIGINS', [
    'http://localhost:5173',
    'http://localhost:4173',
    'https://bookitty.bidebliss.com',
]);

define('UPLOAD_DIR',  __DIR__ . '/uploads/');
define('UPLOAD_URL',  APP_URL . '/api/uploads/');
define('ALLOWED_MIME_TYPES', [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/tiff',
]);
