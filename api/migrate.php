<?php
/**
 * Bookitty – DB Migration Script
 * Run once from a trusted local machine with POST and the X-Migrate-Key header.
 * Remove this endpoint from the server after the production migration.
 */

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}
// Keep the migration secret out of URLs, browser history, and referrer headers.
$secret = $_SERVER['HTTP_X_MIGRATE_KEY'] ?? '';
if (!defined('MIGRATE_SECRET') || MIGRATE_SECRET === '' || !hash_equals(MIGRATE_SECRET, $secret)) {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden']);
    exit;
}

try {
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', DB_HOST, DB_PORT, DB_NAME);
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
} catch (Exception $e) {
    echo json_encode(['error' => 'DB connection failed: ' . $e->getMessage()]);
    exit;
}

$done  = [];
$skipped = [];
$errors = [];

if (tableExists($pdo, 'company_profiles') && !columnExists($pdo, 'company_profiles', 'extra_currencies_enabled')) {
    run($pdo, 'ALTER TABLE company_profiles ADD COLUMN extra_currencies_enabled TINYINT(1) NOT NULL DEFAULT 0', 'company_profiles.extra_currencies_enabled added', $done, $skipped);
}

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
    global $errors;
    try {
        $pdo->exec($sql);
        $done[] = $desc;
    } catch (Exception $e) {
        $skipped[] = "$desc: " . $e->getMessage();
        $errors[] = "$desc: " . $e->getMessage();
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

if (!columnExists($pdo, 'users', 'session_version')) {
    run($pdo, 'ALTER TABLE users ADD COLUMN session_version INT UNSIGNED NOT NULL DEFAULT 0',
        'users.session_version added', $done, $skipped);
} else { $skipped[] = 'users.session_version already exists'; }

if (!tableExists($pdo, 'company_roles')) {
    run($pdo, "
        CREATE TABLE company_roles (
            id INT NOT NULL AUTO_INCREMENT,
            company_id INT NOT NULL,
            name VARCHAR(100) NOT NULL,
            base_role VARCHAR(20) NOT NULL,
            permissions_json TEXT NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY uq_company_role_name (company_id, name),
            CONSTRAINT fk_company_roles_company FOREIGN KEY (company_id) REFERENCES users (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ", 'company_roles table created', $done, $skipped);
} else { $skipped[] = 'company_roles already exists'; }

run($pdo, "CREATE TABLE IF NOT EXISTS migration_markers (
    marker VARCHAR(100) NOT NULL,
    completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (marker)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci", 'migration_markers table ready', $done, $skipped);

if (!tableExists($pdo, 'company_memberships')) {
    run($pdo, "
        CREATE TABLE company_memberships (
            company_id        INT         NOT NULL,
            user_id           INT         NOT NULL,
            role              VARCHAR(20) NOT NULL DEFAULT 'buchhalter',
            permissions_json  TEXT        DEFAULT NULL,
            access_expires_at TIMESTAMP   NULL DEFAULT NULL,
            created_at        TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (company_id, user_id),
            KEY idx_memberships_user (user_id),
            CONSTRAINT fk_memberships_company FOREIGN KEY (company_id) REFERENCES users (id) ON DELETE CASCADE,
            CONSTRAINT fk_memberships_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ", 'company_memberships table created', $done, $skipped);
} else { $skipped[] = 'company_memberships already exists'; }

if (tableExists($pdo, 'company_memberships') && tableExists($pdo, 'migration_markers')) {
    $marker = $pdo->prepare('SELECT 1 FROM migration_markers WHERE marker = ?');
    $marker->execute(['company_memberships_v1']);
    if (!$marker->fetchColumn()) {
        try {
            $pdo->beginTransaction();
            $pdo->exec("INSERT INTO company_memberships (company_id, user_id, role, access_expires_at)
                SELECT COALESCE(company_id, id), id, CASE WHEN company_id IS NULL THEN 'admin' ELSE role END, access_expires_at FROM users
                ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)");
            $pdo->prepare('INSERT INTO migration_markers (marker) VALUES (?)')->execute(['company_memberships_v1']);
            $pdo->commit();
            $done[] = 'existing company memberships imported';
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            $message = 'existing company memberships import failed: ' . $error->getMessage();
            $skipped[] = $message;
            $errors[] = $message;
        }
    } else { $skipped[] = 'existing company memberships already imported'; }
}

if (tableExists($pdo, 'company_memberships') && !columnExists($pdo, 'company_memberships', 'custom_role_id')) {
    run($pdo, 'ALTER TABLE company_memberships ADD COLUMN custom_role_id INT DEFAULT NULL, ADD CONSTRAINT fk_memberships_role FOREIGN KEY (custom_role_id) REFERENCES company_roles (id)',
        'company_memberships.custom_role_id added', $done, $skipped);
} else { $skipped[] = 'company_memberships.custom_role_id already handled'; }

if (!tableExists($pdo, 'user_two_factor')) {
    run($pdo, "
        CREATE TABLE user_two_factor (
            user_id           INT NOT NULL,
            encrypted_secret  TEXT NOT NULL,
            enabled           TINYINT(1) NOT NULL DEFAULT 0,
            pending_since     DATETIME DEFAULT NULL,
            failed_attempts   INT NOT NULL DEFAULT 0,
            locked_until      DATETIME DEFAULT NULL,
            last_step         BIGINT NOT NULL DEFAULT -1,
            recovery_hashes   TEXT DEFAULT NULL,
            PRIMARY KEY (user_id),
            CONSTRAINT fk_two_factor_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ", 'user_two_factor table created', $done, $skipped);
} else { $skipped[] = 'user_two_factor already exists'; }

if (!tableExists($pdo, 'auth_attempts')) {
    run($pdo, "
        CREATE TABLE auth_attempts (
            limiter_key CHAR(64) NOT NULL,
            failures INT NOT NULL DEFAULT 0,
            updated_at DATETIME NOT NULL,
            locked_until DATETIME DEFAULT NULL,
            PRIMARY KEY (limiter_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ", 'auth_attempts table created', $done, $skipped);
} else { $skipped[] = 'auth_attempts already exists'; }

if (!tableExists($pdo, 'company_activity')) {
    run($pdo, "
        CREATE TABLE company_activity (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            company_id INT NOT NULL,
            actor_id INT DEFAULT NULL,
            action VARCHAR(48) NOT NULL,
            target_type VARCHAR(32) NOT NULL,
            target_id VARCHAR(64) DEFAULT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_activity_company_created (company_id, created_at, id),
            CONSTRAINT fk_activity_company FOREIGN KEY (company_id) REFERENCES users (id) ON DELETE CASCADE,
            CONSTRAINT fk_activity_actor FOREIGN KEY (actor_id) REFERENCES users (id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ", 'company_activity table created', $done, $skipped);
} else { $skipped[] = 'company_activity already exists'; }

if (tableExists($pdo, 'bookings') && !columnExists($pdo, 'bookings', 'pdf_url')) {
    run($pdo, 'ALTER TABLE bookings ADD COLUMN pdf_url VARCHAR(500) DEFAULT NULL', 'bookings.pdf_url added', $done, $skipped);
} else { $skipped[] = 'bookings.pdf_url already handled'; }
if (tableExists($pdo, 'bookings') && !columnExists($pdo, 'bookings', 'due_date')) {
    run($pdo, 'ALTER TABLE bookings ADD COLUMN due_date VARCHAR(20) DEFAULT NULL', 'bookings.due_date added', $done, $skipped);
} else { $skipped[] = 'bookings.due_date already handled'; }

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

if (tableExists($pdo, 'invitations') && !columnExists($pdo, 'invitations', 'custom_role_id')) {
    run($pdo, 'ALTER TABLE invitations ADD COLUMN custom_role_id INT DEFAULT NULL, ADD CONSTRAINT fk_inv_role FOREIGN KEY (custom_role_id) REFERENCES company_roles (id)',
        'invitations.custom_role_id added', $done, $skipped);
} else { $skipped[] = 'invitations.custom_role_id already handled'; }

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
            vat_included     TINYINT(1)   NOT NULL DEFAULT 0,
            template_id      VARCHAR(36)  DEFAULT NULL,
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

if (tableExists($pdo, 'invoices') && !columnExists($pdo, 'invoices', 'vat_included')) {
    run($pdo,
        "ALTER TABLE invoices ADD COLUMN vat_included TINYINT(1) NOT NULL DEFAULT 0 AFTER currency",
        'invoices.vat_included added', $done, $skipped);
} else { $skipped[] = 'invoices.vat_included already handled'; }

if (tableExists($pdo, 'invoices') && !columnExists($pdo, 'invoices', 'template_id')) {
    run($pdo,
        "ALTER TABLE invoices ADD COLUMN template_id VARCHAR(36) DEFAULT NULL AFTER vat_included",
        'invoices.template_id added', $done, $skipped);
} else { $skipped[] = 'invoices.template_id already handled'; }

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

run($pdo, "
    CREATE TABLE IF NOT EXISTS startup_night_marketing_consents (
        email VARCHAR(254) NOT NULL,
        consented_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        consent_version VARCHAR(30) NOT NULL,
        source VARCHAR(80) NOT NULL DEFAULT 'startup-night-2026',
        PRIMARY KEY (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
", 'startup_night_marketing_consents table ready', $done, $skipped);

// ── Result ────────────────────────────────────────────────────────────────────
echo json_encode([
    'status'  => $errors ? 'partial' : 'done',
    'applied' => $done,
    'skipped' => $skipped,
    'errors'  => $errors,
    'note'    => 'DELETE this file from the server now!',
], JSON_PRETTY_PRINT);
