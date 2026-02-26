-- ============================================================
-- Bookitty – MariaDB schema
-- Run once: mysql -u dev_bookitty -p dev_bookitty < schema.sql
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ─── users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id                  INT            NOT NULL AUTO_INCREMENT,
    email               VARCHAR(255)   NOT NULL,
    name                VARCHAR(255)   NOT NULL DEFAULT '',
    password_hash       VARCHAR(255)   NOT NULL,
    email_confirmed     TINYINT(1)     NOT NULL DEFAULT 0,
    confirmation_token  VARCHAR(64)    DEFAULT NULL,
    created_at          TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── bookings ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
    id              VARCHAR(36)    NOT NULL,
    user_id         INT            NOT NULL,
    date            VARCHAR(20)    NOT NULL DEFAULT '',
    description     VARCHAR(500)   NOT NULL DEFAULT '',
    account         VARCHAR(200)   NOT NULL DEFAULT '',
    contra_account  VARCHAR(200)   NOT NULL DEFAULT '',
    category        VARCHAR(100)   NOT NULL DEFAULT '',
    amount          DECIMAL(15,2)  NOT NULL DEFAULT 0.00,
    vat_amount      DECIMAL(15,2)  DEFAULT NULL,
    vat_rate        DECIMAL(5,2)   NOT NULL DEFAULT 0.00,
    currency        VARCHAR(10)    NOT NULL DEFAULT 'CHF',
    payment_status  VARCHAR(20)    NOT NULL DEFAULT 'Offen',
    type            VARCHAR(20)    NOT NULL DEFAULT 'Ausgabe',
    created_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_bookings_user   (user_id),
    KEY idx_bookings_date   (date),
    CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── documents ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
    id                  VARCHAR(36)    NOT NULL,
    user_id             INT            NOT NULL,
    file_name           VARCHAR(255)   NOT NULL DEFAULT '',
    uploaded_at         VARCHAR(20)    NOT NULL DEFAULT '',
    status              VARCHAR(20)    NOT NULL DEFAULT 'In Prüfung',
    draft_json          TEXT           DEFAULT NULL,
    original_draft_json TEXT           DEFAULT NULL,
    preview_url         VARCHAR(500)   DEFAULT NULL,
    detection           VARCHAR(50)    DEFAULT NULL,
    template_applied    TINYINT(1)     NOT NULL DEFAULT 0,
    vendor_pattern      VARCHAR(255)   DEFAULT NULL,
    created_at          TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_documents_user   (user_id),
    CONSTRAINT fk_documents_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── templates ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS templates (
    id              INT            NOT NULL AUTO_INCREMENT,
    user_id         INT            NOT NULL,
    pattern         VARCHAR(255)   NOT NULL,
    template_json   TEXT           NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_templates_user_pattern (user_id, pattern),
    CONSTRAINT fk_templates_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── company_profiles ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS company_profiles (
    user_id     INT            NOT NULL,
    name        VARCHAR(255)   NOT NULL DEFAULT '',
    street      VARCHAR(255)   NOT NULL DEFAULT '',
    city        VARCHAR(255)   NOT NULL DEFAULT '',
    vat_id      VARCHAR(100)   NOT NULL DEFAULT '',
    email       VARCHAR(255)   NOT NULL DEFAULT '',
    phone       VARCHAR(100)   NOT NULL DEFAULT '',
    iban        VARCHAR(50)    NOT NULL DEFAULT '',
    PRIMARY KEY (user_id),
    CONSTRAINT fk_company_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
