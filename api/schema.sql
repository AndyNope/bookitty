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
    role                VARCHAR(20)    NOT NULL DEFAULT 'admin',
    company_id          INT            DEFAULT NULL,
    access_expires_at   TIMESTAMP      NULL DEFAULT NULL,
    created_at          TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email),
    CONSTRAINT fk_users_company FOREIGN KEY (company_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── invitations ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invitations (
    id          INT            NOT NULL AUTO_INCREMENT,
    token       VARCHAR(64)    NOT NULL,
    email       VARCHAR(255)   NOT NULL,
    role        VARCHAR(20)    NOT NULL DEFAULT 'buchhalter',
    invited_by  INT            NOT NULL,
    company_id  INT            NOT NULL,
    access_expires_at TIMESTAMP  NULL DEFAULT NULL,
    used        TINYINT(1)     NOT NULL DEFAULT 0,
    expires_at  TIMESTAMP      NOT NULL,
    created_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_inv_token (token),
    KEY idx_inv_email (email),
    CONSTRAINT fk_inv_inviter FOREIGN KEY (invited_by) REFERENCES users (id) ON DELETE CASCADE
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

-- ─── invoices ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
    id               VARCHAR(36)    NOT NULL,
    user_id          INT            NOT NULL,
    number           VARCHAR(50)    NOT NULL DEFAULT '',
    date             VARCHAR(20)    NOT NULL DEFAULT '',
    due_date         VARCHAR(20)    NOT NULL DEFAULT '',
    status           VARCHAR(20)    NOT NULL DEFAULT 'Entwurf',
    contact_id       VARCHAR(36)    DEFAULT NULL,
    contact_name     VARCHAR(255)   NOT NULL DEFAULT '',
    contact_company  VARCHAR(255)   DEFAULT NULL,
    contact_street   VARCHAR(255)   DEFAULT NULL,
    contact_zip      VARCHAR(20)    DEFAULT NULL,
    contact_city     VARCHAR(100)   DEFAULT NULL,
    contact_country  VARCHAR(10)    NOT NULL DEFAULT 'CH',
    contact_email    VARCHAR(255)   DEFAULT NULL,
    iban             VARCHAR(50)    DEFAULT NULL,
    reference        VARCHAR(100)   DEFAULT NULL,
    items_json       TEXT           NOT NULL DEFAULT '[]',
    currency         VARCHAR(10)    NOT NULL DEFAULT 'CHF',
    notes            TEXT           DEFAULT NULL,
    mahnung_level    TINYINT UNSIGNED DEFAULT NULL,
    mahnung_date     VARCHAR(20)    DEFAULT NULL,
    created_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_invoices_user   (user_id),
    KEY idx_invoices_number (number),
    CONSTRAINT fk_invoices_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── offers ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offers (
    id                      VARCHAR(36)    NOT NULL,
    user_id                 INT            NOT NULL,
    number                  VARCHAR(50)    NOT NULL,
    date                    DATE           NOT NULL,
    valid_until             DATE           NOT NULL,
    status                  VARCHAR(20)    NOT NULL DEFAULT 'Entwurf',
    contact_id              VARCHAR(36)    DEFAULT NULL,
    contact_name            VARCHAR(255)   NOT NULL DEFAULT '',
    contact_company         VARCHAR(255)   DEFAULT NULL,
    contact_street          VARCHAR(255)   DEFAULT NULL,
    contact_zip             VARCHAR(20)    DEFAULT NULL,
    contact_city            VARCHAR(100)   DEFAULT NULL,
    contact_country         VARCHAR(10)    NOT NULL DEFAULT 'CH',
    contact_email           VARCHAR(255)   DEFAULT NULL,
    items_json              JSON           DEFAULT NULL,
    currency                VARCHAR(10)    NOT NULL DEFAULT 'CHF',
    notes                   TEXT           DEFAULT NULL,
    converted_to_invoice_id VARCHAR(36)    DEFAULT NULL,
    created_at              TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_offers_user   (user_id),
    KEY idx_offers_number (number),
    CONSTRAINT fk_offers_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── contacts ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
    id          VARCHAR(36)    NOT NULL,
    user_id     INT            NOT NULL,
    type        VARCHAR(20)    NOT NULL DEFAULT 'Lieferant',
    name        VARCHAR(255)   NOT NULL DEFAULT '',
    company     VARCHAR(255)   DEFAULT NULL,
    email       VARCHAR(255)   DEFAULT NULL,
    phone       VARCHAR(100)   DEFAULT NULL,
    street      VARCHAR(255)   DEFAULT NULL,
    zip         VARCHAR(20)    DEFAULT NULL,
    city        VARCHAR(100)   DEFAULT NULL,
    country     VARCHAR(10)    NOT NULL DEFAULT 'CH',
    uid         VARCHAR(100)   DEFAULT NULL,
    iban        VARCHAR(50)    DEFAULT NULL,
    notes       TEXT           DEFAULT NULL,
    created_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_contacts_user (user_id),
    KEY idx_contacts_name (name),
    CONSTRAINT fk_contacts_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
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
