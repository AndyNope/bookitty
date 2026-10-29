<?php
/**
 * Bookitty – DB Migration Script
 * Run ONCE via browser: https://bookitty.bidebliss.com/api/migrate.php?key=MIGRATE_SECRET
 * Then DELETE this file from the server immediately after.
 */

require_once __DIR__ . '/config.php';

// ── Simple authentication to prevent public access ────────────────────────────
$secret = $_GET['key'] ?? '';
if (!defined('MIGRATE_SECRET') || $secret !== MIGRATE_SECRET) {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden. Provide ?key=MIGRATE_SECRET']);
    exit;
}

header('Content-Type: application/json; charset=utf-8');

try {
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', DB_HOST, DB_PORT, DB_NAME);
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
} catch (Exception $e) {
    echo json_encode(['error' => 'DB connection failed: ' . $e->getMessage()]);
    exit;
}

$done  = [];
$skipped = [];

// ── Helper ────────────────────────────────────────────────────────────────────
function columnExists(PDO $pdo, string $table, string $col): bool {
    $rows = $pdo->query("SHOW COLUMNS FROM `$table` LIKE '$col'")->fetchAll();
    return count($rows) > 0;
}

function tableExists(PDO $pdo, string $table): bool {
    $rows = $pdo->query("SHOW TABLES LIKE '$table'")->fetchAll();
    return count($rows) > 0;
}

function run(PDO $pdo, string $sql, string $desc, array &$done, array &$skipped): void {
    try {
        $pdo->exec($sql);
        $done[] = $desc;
    } catch (Exception $e) {
        $skipped[] = "$desc: " . $e->getMessage();
    }
}

// ── 1. Add missing columns to users ──────────────────────────────────────────
if (!columnExists($pdo, 'users', 'company_id')) {
    run($pdo,
        "ALTER TABLE users ADD COLUMN company_id INT DEFAULT NULL",
        'users.company_id added', $done, $skipped);
} else { $skipped[] = 'users.company_id already exists'; }

if (!columnExists($pdo, 'users', 'access_expires_at')) {
    run($pdo,
        "ALTER TABLE users ADD COLUMN access_expires_at TIMESTAMP NULL DEFAULT NULL",
        'users.access_expires_at added', $done, $skipped);
} else { $skipped[] = 'users.access_expires_at already exists'; }

if (!columnExists($pdo, 'users', 'confirmation_token')) {
    run($pdo,
        "ALTER TABLE users ADD COLUMN confirmation_token VARCHAR(64) DEFAULT NULL",
        'users.confirmation_token added', $done, $skipped);
} else { $skipped[] = 'users.confirmation_token already exists'; }

if (!columnExists($pdo, 'users', 'role')) {
    run($pdo,
        "ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'admin'",
        'users.role added', $done, $skipped);
} else { $skipped[] = 'users.role already exists'; }

// ── 2. invitations ────────────────────────────────────────────────────────────
if (!tableExists($pdo, 'invitations')) {
    run($pdo, "
        CREATE TABLE invitations (
            id                INT         NOT NULL AUTO_INCREMENT,
            token             VARCHAR(64) NOT NULL,
            email             VARCHAR(255) NOT NULL,
            role              VARCHAR(20)  NOT NULL DEFAULT 'buchhalter',
            invited_by        INT          NOT NULL,
            company_id        INT          NOT NULL,
            access_expires_at TIMESTAMP    NULL DEFAULT NULL,
            used              TINYINT(1)   NOT NULL DEFAULT 0,
            expires_at        TIMESTAMP    NOT NULL,
            created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_inv_token (token),
            KEY idx_inv_email (email),
            CONSTRAINT fk_inv_inviter FOREIGN KEY (invited_by) REFERENCES users (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ", 'invitations table created', $done, $skipped);
} else { $skipped[] = 'invitations already exists'; }

// ── 3. invoices ───────────────────────────────────────────────────────────────
if (!tableExists($pdo, 'invoices')) {
    run($pdo, "
        CREATE TABLE invoices (
            id               VARCHAR(36)  NOT NULL,
            user_id          INT          NOT NULL,
            number           VARCHAR(50)  NOT NULL DEFAULT '',
            date             VARCHAR(20)  NOT NULL DEFAULT '',
            due_date         VARCHAR(20)  NOT NULL DEFAULT '',
            status           VARCHAR(20)  NOT NULL DEFAULT 'Entwurf',
            contact_id       VARCHAR(36)  DEFAULT NULL,
            contact_name     VARCHAR(255) NOT NULL DEFAULT '',
            contact_company  VARCHAR(255) DEFAULT NULL,
            contact_street   VARCHAR(255) DEFAULT NULL,
            contact_zip      VARCHAR(20)  DEFAULT NULL,
            contact_city     VARCHAR(100) DEFAULT NULL,
            contact_country  VARCHAR(10)  NOT NULL DEFAULT 'CH',
            contact_email    VARCHAR(255) DEFAULT NULL,
            iban             VARCHAR(50)  DEFAULT NULL,
            reference        VARCHAR(100) DEFAULT NULL,
            items_json       TEXT         NOT NULL DEFAULT '[]',
            currency         VARCHAR(10)  NOT NULL DEFAULT 'CHF',
            notes            TEXT         DEFAULT NULL,
            mahnung_level    TINYINT UNSIGNED DEFAULT NULL,
            mahnung_date     VARCHAR(20)  DEFAULT NULL,
            portal_token     VARCHAR(64)  DEFAULT NULL,
            payment_link     VARCHAR(500) DEFAULT NULL,
            created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_invoices_user   (user_id),
            KEY idx_invoices_number (number),
            KEY idx_invoices_token  (portal_token),
            CONSTRAINT fk_invoices_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ", 'invoices table created', $done, $skipped);
} else { $skipped[] = 'invoices already exists'; }

// ── 4. offers ─────────────────────────────────────────────────────────────────
if (!tableExists($pdo, 'offers')) {
    run($pdo, "
        CREATE TABLE offers (
            id                      VARCHAR(36)  NOT NULL,
            user_id                 INT          NOT NULL,
            number                  VARCHAR(50)  NOT NULL,
            date                    DATE         NOT NULL,
            valid_until             DATE         NOT NULL,
            status                  VARCHAR(20)  NOT NULL DEFAULT 'Entwurf',
            contact_id              VARCHAR(36)  DEFAULT NULL,
            contact_name            VARCHAR(255) NOT NULL DEFAULT '',
            contact_company         VARCHAR(255) DEFAULT NULL,
            contact_street          VARCHAR(255) DEFAULT NULL,
            contact_zip             VARCHAR(20)  DEFAULT NULL,
            contact_city            VARCHAR(100) DEFAULT NULL,
            contact_country         VARCHAR(10)  NOT NULL DEFAULT 'CH',
            contact_email           VARCHAR(255) DEFAULT NULL,
            items_json              JSON         DEFAULT NULL,
            currency                VARCHAR(10)  NOT NULL DEFAULT 'CHF',
            notes                   TEXT         DEFAULT NULL,
            converted_to_invoice_id VARCHAR(36)  DEFAULT NULL,
            created_at              TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_offers_user   (user_id),
            KEY idx_offers_number (number),
            CONSTRAINT fk_offers_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ", 'offers table created', $done, $skipped);
} else { $skipped[] = 'offers already exists'; }

// ── 5. contacts ───────────────────────────────────────────────────────────────
if (!tableExists($pdo, 'contacts')) {
    run($pdo, "
        CREATE TABLE contacts (
            id          VARCHAR(36)  NOT NULL,
            user_id     INT          NOT NULL,
            type        VARCHAR(20)  NOT NULL DEFAULT 'Lieferant',
            name        VARCHAR(255) NOT NULL DEFAULT '',
            company     VARCHAR(255) DEFAULT NULL,
            email       VARCHAR(255) DEFAULT NULL,
            phone       VARCHAR(100) DEFAULT NULL,
            street      VARCHAR(255) DEFAULT NULL,
            zip         VARCHAR(20)  DEFAULT NULL,
            city        VARCHAR(100) DEFAULT NULL,
            country     VARCHAR(10)  NOT NULL DEFAULT 'CH',
            uid         VARCHAR(100) DEFAULT NULL,
            iban        VARCHAR(50)  DEFAULT NULL,
            notes       TEXT         DEFAULT NULL,
            created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_contacts_user (user_id),
            KEY idx_contacts_name (name),
            CONSTRAINT fk_contacts_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ", 'contacts table created', $done, $skipped);
} else { $skipped[] = 'contacts already exists'; }

// ── 6. expenses ───────────────────────────────────────────────────────────────
if (!tableExists($pdo, 'expenses')) {
    run($pdo, "
        CREATE TABLE expenses (
            id          VARCHAR(36)  NOT NULL,
            user_id     INT          NOT NULL,
            date        VARCHAR(20)  NOT NULL DEFAULT '',
            amount      DECIMAL(15,2) NOT NULL DEFAULT 0.00,
            currency    VARCHAR(10)  NOT NULL DEFAULT 'CHF',
            category    VARCHAR(100) NOT NULL DEFAULT 'Diverses',
            description VARCHAR(500) NOT NULL DEFAULT '',
            status      VARCHAR(20)  NOT NULL DEFAULT 'Ausstehend',
            receipt_url VARCHAR(500) DEFAULT NULL,
            approved_by INT          DEFAULT NULL,
            approved_at TIMESTAMP    NULL DEFAULT NULL,
            booking_id  VARCHAR(36)  DEFAULT NULL,
            created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_expenses_user   (user_id),
            KEY idx_expenses_status (status),
            CONSTRAINT fk_expenses_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ", 'expenses table created', $done, $skipped);
} else { $skipped[] = 'expenses already exists'; }

// ── 7. invoices.payment_link column (if invoices existed before) ──────────────
if (tableExists($pdo, 'invoices') && !columnExists($pdo, 'invoices', 'payment_link')) {
    run($pdo,
        "ALTER TABLE invoices ADD COLUMN payment_link VARCHAR(500) DEFAULT NULL AFTER portal_token",
        'invoices.payment_link added', $done, $skipped);
} else { $skipped[] = 'invoices.payment_link already handled'; }

// ── 8. Billing, AI token ledger and Stripe event idempotency ─────────────────
run($pdo, "
    CREATE TABLE IF NOT EXISTS billing_accounts (
        company_id INT NOT NULL,
        plan_code VARCHAR(20) NOT NULL DEFAULT 'starter',
        subscription_status VARCHAR(30) NOT NULL DEFAULT 'inactive',
        monthly_tokens_remaining BIGINT UNSIGNED NOT NULL DEFAULT 0,
        purchased_tokens_remaining BIGINT UNSIGNED NOT NULL DEFAULT 0,
        stripe_customer_id VARCHAR(100) DEFAULT NULL,
        stripe_subscription_id VARCHAR(100) DEFAULT NULL,
        current_period_end DATETIME DEFAULT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (company_id),
        UNIQUE KEY uq_billing_stripe_customer (stripe_customer_id),
        UNIQUE KEY uq_billing_stripe_subscription (stripe_subscription_id),
        CONSTRAINT fk_billing_company FOREIGN KEY (company_id) REFERENCES users (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
", 'billing_accounts table ready', $done, $skipped);

run($pdo, "
    CREATE TABLE IF NOT EXISTS ai_token_ledger (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        company_id INT NOT NULL,
        entry_type VARCHAR(24) NOT NULL,
        token_delta BIGINT NOT NULL,
        reference_key VARCHAR(160) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_ai_ledger_reference (reference_key),
        KEY idx_ai_ledger_company_created (company_id, created_at),
        CONSTRAINT fk_ai_ledger_company FOREIGN KEY (company_id) REFERENCES users (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
", 'ai_token_ledger table ready', $done, $skipped);

run($pdo, "
    CREATE TABLE IF NOT EXISTS ai_token_reservations (
        id CHAR(36) NOT NULL,
        company_id INT NOT NULL,
        monthly_reserved BIGINT UNSIGNED NOT NULL DEFAULT 0,
        purchased_reserved BIGINT UNSIGNED NOT NULL DEFAULT 0,
        status VARCHAR(12) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_ai_reservation_pending (status, created_at),
        CONSTRAINT fk_ai_reservation_company FOREIGN KEY (company_id) REFERENCES users (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
", 'ai_token_reservations table ready', $done, $skipped);

run($pdo, "
    CREATE TABLE IF NOT EXISTS stripe_events (
        event_id VARCHAR(100) NOT NULL,
        processed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (event_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
", 'stripe_events table ready', $done, $skipped);

$pdo->exec("INSERT IGNORE INTO billing_accounts (company_id, plan_code) SELECT id, 'starter' FROM users WHERE company_id IS NULL");
$done[] = 'existing company owners initialized on Starter';

// ── Result ────────────────────────────────────────────────────────────────────
echo json_encode([
    'status'  => 'done',
    'applied' => $done,
    'skipped' => $skipped,
    'note'    => 'DELETE this file from the server now!',
], JSON_PRETTY_PRINT);
