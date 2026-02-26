FROM php:8.1-apache

# ── System deps ──────────────────────────────────────────────────────────────
# msmtp: lightweight sendmail-compatible SMTP forwarder → routes mail() to MailHog
RUN apt-get update \
    && apt-get install -y --no-install-recommends msmtp \
    && rm -rf /var/lib/apt/lists/*

# ── PHP extensions ───────────────────────────────────────────────────────────
RUN docker-php-ext-install pdo pdo_mysql fileinfo

# ── Apache modules ───────────────────────────────────────────────────────────
RUN a2enmod rewrite headers

# ── Apache vhost ─────────────────────────────────────────────────────────────
COPY docker/apache.conf /etc/apache2/sites-available/000-default.conf

# ── PHP ini (display_errors + mail via MailHog) ──────────────────────────────
COPY docker/php.ini /usr/local/etc/php/conf.d/local.ini
