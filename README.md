# Bookitty

Moderne Finanzbuchhaltungs-WebApp für Schweizer KMU — mit KI-Chatbot, automatischer Belegerkennung und intuitiver Buchungserfassung.

## Funktionen

### Buchhaltung
- **Dashboard** – Kennzahlen, Kontostand, letzte Buchungen auf einen Blick
- **Buchungen** – Einnahmen/Ausgaben erfassen, bearbeiten, nach Zeitraum/Kategorie filtern
- **Bilanz** – Aktiven/Passiven nach Schweizer KMU-Kontenrahmen, PDF-Export
- **Erfolgsrechnung** – Ertrag/Aufwand-Übersicht mit Jahresvergleich
- **Dokumente** – PDF- und Bildbelegs-Import mit automatischer OCR-Erkennung

### Kitty – KI-Chatbot
- **Offline-First Knowledge Base** – 60+ Q&A-Einträge zu Bookitty-Funktionen, Schweizer Buchhaltung, MwSt und mehr
- **Agentic UI**: Kitty kann direkt im Interface agieren:
  - **Nav-Highlight** – blinkt das relevante Menü-Element grün auf
  - **Buchungsvorschläge** – zeigt vorausgefüllte Buchungskarte mit Soll/Haben/MwSt
  - **Direkt erfassen** – ein Klick öffnet das Buchungsformular mit allen Werten vorausgefüllt
- **OpenRouter-Fallback** – 9-Modell-Kette (kostenlose Modelle) für Fragen ausserhalb der Knowledge Base

### Authentifizierung
- Registrierung / Login mit JWT
- Optionale Zwei-Faktor-Authentifizierung mit Authenticator-App und einmaligen Wiederherstellungscodes
- Firmenmitgliedschaften, Firmenwechsel und benannte Rollen mit Funktionsgruppen
- Demo-Modus ohne Account (Daten nur lokal)

## Architektur

![Systemarchitektur](docs/architecture.svg)

## Tech Stack

| Frontend | Backend |
|---|---|
| React 18 + Vite 7 | PHP 8.1 |
| TypeScript | MariaDB 10.11 |
| Tailwind CSS 4 | JWT Auth |
| React Router 7 | Docker (lokal) |

## Lokale Entwicklung

### Voraussetzungen

- [Node.js](https://nodejs.org/) (LTS)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Composer](https://getcomposer.org/) und PHP 8.1 oder neuer

### Setup

```bash
# 1. Abhängigkeiten installieren
npm install
composer install --working-dir=api --no-dev

# 2. Docker-Stack starten (PHP + MariaDB)
docker compose up -d

# 3. API-Config kopieren und anpassen
cp api/config.example.php api/config.php

# 4. Frontend starten
npm run dev
```

Frontend läuft auf **http://localhost:5173**, Backend auf **http://localhost:8080**.

### Build erstellen

```bash
npm run build
npm run preview   # Vorschau des Builds
```

## Projektstruktur

```
src/
├── components/     # UI-Komponenten (BookingForm, KittyChat, …)
├── data/           # kittyKnowledge.ts – Offline Knowledge Base
├── hooks/          # useKittyHighlight, useAuth, …
├── layout/         # AppLayout (Sidebar, Mobile Nav)
├── pages/          # Dashboard, Buchungen, Bilanz, Dokumente, …
└── utils/          # kittySearch (TF-IDF), documentParser, …
api/
├── auth/           # Login, Register, Me
├── bookings/       # CRUD Buchungen
├── documents/      # Upload, OCR-Erkennung
└── chat.php        # Kitty / OpenRouter-Proxy
```

## Umgebungsvariablen (api/config.php)

| Konstante | Beschreibung |
|---|---|
| `DB_HOST` / `DB_NAME` | MariaDB-Verbindung |
| `JWT_SECRET` | 64-Zeichen Zufalls-String |
| `KITTY_API_KEY` | OpenRouter API Key ([openrouter.ai/keys](https://openrouter.ai/keys)) |

> **Hinweis:** `api/config.php` ist gitignored. Vorlage: `api/config.example.php`

### Zwei-Faktor-Authentifizierung

Vor der Bereitstellung müssen die neuen Tabellen und Spalten aus `api/migrate.php` angelegt und alle Migrationsergebnisse auf Fehler geprüft werden. Der Login benötigt unter anderem `user_two_factor`, `auth_attempts`, `company_memberships`, `company_roles` und `users.session_version`; die Migration muss daher vor dem neuen Anwendungscode abgeschlossen sein. Bestehende Daten vor der Migration sichern.

Für ein bestehendes System zunächst nur die neue Migrationsdatei auf den Server übertragen, ohne `api/config.php` oder `api/uploads/` zu überschreiben. Die Migration mit dem bereits serverseitig konfigurierten Schlüssel über den Header `X-Migrate-Key` aufrufen und die Resultate auf Fehler prüfen. Erst danach Anwendungscode und Composer-Abhängigkeiten veröffentlichen; anschliessend den Migrationsendpunkt vom Server entfernen. Die automatische Deployment-Pipeline führt diese Migration nicht aus.

Für 2FA benötigt PHP einen unabhängigen, base64-kodierten 32-Byte-Schlüssel als serverseitige Umgebungsvariable `BOOKITTY_2FA_KEY` oder als Konstante `TOTP_ENCRYPTION_KEY` in der nicht versionierten Serverkonfiguration. Ein Schlüssel kann mit `openssl rand -base64 32` erzeugt werden. Geheim halten und sicher sichern: Sein Verlust oder Austausch macht bestehende 2FA-Geheimnisse unlesbar. Den Schlüssel nicht in Git, Builds, Chats oder Logs ablegen.

Danach kann jede Person 2FA unter Einstellungen aktivieren. Die Wiederherstellungscodes werden nur einmal angezeigt und sollten getrennt und sicher aufbewahrt werden.

### Firmenzugänge und Protokoll

Der Firmeninhaber kann Personen einladen, Zugänge widerrufen und benannte Rollen mit Funktionsgruppen und Lese- oder Schreibrechten vergeben. Bestehende Konten bestätigen Einladungen mit ihrem Passwort und gegebenenfalls ihrem zweiten Faktor. Die Firmenauswahl zeigt nur aktive Mitgliedschaften. Vorhandene browserlokale Daten werden einmalig der ersten angemeldeten Firma zugeordnet; die ursprünglichen Browserdaten bleiben als Rückfallkopie erhalten.

Lohn, Anlagen, Lager und Zeiterfassung werden weiterhin nur im Browser gespeichert und sind für fremde Firmenzugänge nicht freigegeben. Browser-Speicher ist keine Sicherheitsgrenze zwischen Personen mit Zugriff auf dasselbe Browserprofil; sensible Daten und alte Rückfallkopien müssen dort entsprechend geschützt werden. Diese Module werden nicht zwischen Geräten oder Teammitgliedern synchronisiert.

Das Zugriffsprotokoll zeigt die letzten 100 erfassten Ereignisse zu Einladungen, Firmenwechseln, Rollen, Zugängen, 2FA, Buchungen und Kundenrechnungen. Es umfasst nicht alle Module, enthält keine vollständigen Änderungswerte und ist kein manipulationssicheres oder zertifiziertes Revisionsarchiv. E-Mail-Versand und Datenbanktransaktion können nicht gemeinsam zurückgerollt werden.

Direkte Zugriffe auf `api/uploads/` müssen auf dem Webserver vollständig gesperrt sein. Die mitgelieferte `.htaccess` gilt nur bei aktivierter Apache-Override-Konfiguration; bei Nginx oder anderen Setups ist eine entsprechende Serverregel erforderlich. Vor der Freigabe mit einer bestehenden Beleg-URL prüfen, dass ein direkter Aufruf abgewiesen wird und der authentifizierte Belegzugriff funktioniert.

### IMAP-Sicherheit

Der optionale IMAP-Import benötigt einen separaten base64-kodierten 32-Byte-Schlüssel in `BOOKITTY_IMAP_KEY` oder `IMAP_ENCRYPTION_KEY` sowie eine explizite Serverfreigabe in `BOOKITTY_IMAP_ALLOWED_SERVERS` als kommagetrennte `host:port`-Liste oder im Array `IMAP_ALLOWED_SERVERS`. Ohne beide Einstellungen ist der Import gesperrt. Nur vertrauenswürdige Mailserver freigeben; die Verbindung benötigt TLS mit gültigem Zertifikat.

Bestehende Klartextpasswörter werden beim nächsten Speichern oder Abrufen der jeweiligen IMAP-Konfiguration verschlüsselt übernommen. Bis dahin und in bestehenden Backups bleiben sie unverschlüsselt; diese Daten und Backups entsprechend schützen. Den IMAP-Schlüssel unabhängig vom 2FA-Schlüssel sicher aufbewahren und sichern.

Die Deployment-Pipeline verlangt FTPS mit gültigem Zertifikat auf Port 21. Vor der ersten Bereitstellung prüfen, ob der Hostinganbieter explizites FTPS auf diesem Port unterstützt; andernfalls schlägt das Deployment fehl und muss passend konfiguriert werden.

## Deployment

Die App läuft produktiv auf **https://bookitty.bidebliss.com**.

Frontend: statisches Build via `npm run build` → `dist/`  
Backend: PHP auf demselben Server, Nginx als Reverse Proxy

