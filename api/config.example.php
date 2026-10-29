<?php
// ─────────────────────────────────────────────────────────────────────────────
// Bookitty – API Config  (Template)
//
// Copy this file to api/config.php (gitignored) and fill in your credentials.
//
//   Local Docker:  just copy as-is – the default values match docker-compose.yml
//   Production:    replace <<PROD_DB_PASS_HIER>> and the JWT_SECRET
// ─────────────────────────────────────────────────────────────────────────────

// ─── Environment Detection ────────────────────────────────────────────────────
$host    = strtolower(preg_replace('/:\\d+$/', '', $_SERVER['HTTP_HOST'] ?? 'localhost'));
$isProd  = in_array($host, ['bookitty.ch', 'www.bookitty.ch', 'bookitty.bidebliss.com'], true);
$isLocal = !$isProd;   // everything non-prod = local Docker

// ─── Database ─────────────────────────────────────────────────────────────────
// Local:  DB_HOST = 'db'  (Docker Compose service name, see docker-compose.yml)
// Prod:   DB_HOST = '127.0.0.1'  (PHP + DB run on the same server)
define('DB_HOST', $isLocal ? 'db'          : '127.0.0.1');
define('DB_PORT', 3306);
define('DB_NAME', $isProd  ? 'bookitty'    : 'bookitty_local');
define('DB_USER', $isProd  ? 'bookitty'    : 'bookitty');
define('DB_PASS', $isProd  ? '<<PROD_DB_PASS_HIER>>' : 'local_secret');

// ─── JWT ──────────────────────────────────────────────────────────────────────
// IMPORTANT: Replace with a strong random 64-char string before going live!
define('JWT_SECRET', 'bkty_CHANGE_ME_to_a_long_random_string_64chars_XXXXXXXXXXXXXXXXXXXX');
define('JWT_EXPIRY', 60 * 60 * 24 * 30);

// ─── One-time migration endpoint ─────────────────────────────────────────────
define('MIGRATE_SECRET', '<<LONG_RANDOM_MIGRATION_SECRET_HIER>>');

// ─── App ──────────────────────────────────────────────────────────────────────
define('APP_URL',       $isProd ? 'https://bookitty.ch' : 'http://localhost:8080');
define('APP_NAME',      'Bookitty');
define('MAIL_FROM',     'noreply@bidebliss.com');
define('MAIL_FROM_NAME','Bookitty');

// ─── CORS allowed origins ─────────────────────────────────────────────────────
define('CORS_ORIGINS', [
    'http://localhost:5173',
    'http://localhost:4173',
    'https://bookitty.ch',
    'https://www.bookitty.ch',
    'https://bookitty.bidebliss.com',
]);

// ─── Kitty AI (Infomaniak AI Services) ────────────────────────────────────────
// Create an AI product and API token in the Infomaniak Manager.
define('KITTY_API_KEY', '');
define('KITTY_PRODUCT_ID', '');
define('KITTY_MODEL', 'mistralai/Mistral-Small-4-119B-2603');

// ─── Payments (Stripe Checkout + TWINT) ──────────────────────────────────────
// Keep checkout disabled until prices, terms, and the merchant account are approved.
define('BILLING_ENABLED', false);
define('STRIPE_SECRET_KEY', '');
define('STRIPE_WEBHOOK_SECRET', '');
define('STRIPE_PRICE_PLAN_SOLO', '');
define('STRIPE_PRICE_PLAN_TEAM', '');
define('STRIPE_PRICE_PLAN_BUSINESS', '');
define('STRIPE_PRICE_TOKEN_SMALL', '');
define('STRIPE_PRICE_TOKEN_MEDIUM', '');
define('STRIPE_PRICE_TOKEN_LARGE', '');

// ─── File uploads ─────────────────────────────────────────────────────────────
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
