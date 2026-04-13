# Bookitty – Testerfeedback Phase 3 (Dan)

> Zum Abhaken: `- [x]` = erledigt · `- [-]` = teilweise · `- [ ]` = offen · `- [~]` = zurückgestellt

---

## Dashboard

- [x] **1. Dashboard: Karten verlinken**
  Die fünf StatCards auf dem Dashboard sollen klickbar sein und direkt zur jeweiligen Seite führen
  (z. B. offene Rechnungen → `/app/rechnungen?filter=open`, Bankabgleich → `/app/bankabgleich`).
  `StatCard`-Komponente erhält ein optionales `to`-Prop, das via `react-router-dom` `Link` gerendert wird.
  Mobil: Karten bleiben tappable; `aria-label` für Barrierefreiheit ergänzen.

---

## Buchungen

- [x] **2. Buchungen: Konto-Suche / Autovervollständigung im Buchungsformular**
  Im `BookingForm` sollen die Felder für Soll- und Habenkonto eine Live-Suche (Combobox/Autocomplete)
  anbieten: Eingabe «erlös» filtert sofort alle Konten, bei denen die Bezeichnung oder Nummer den
  Teilstring enthält und zeigt sie als Dropdown (Format: `3400 – Dienstleistungserlöse`).
  Bedienung via Tastatur (Pfeil hoch/runter + Enter).
  Technisch: Debounce 150 ms, Client-seitig gegen `companyStore` / `customAccountStore` filtern;
  für grosse Kontenpläne: Server-Endpoint `/api/accounts?q=` als Fallback.

- [x] **3. Buchungen: Jahresgewinn-Konto vor manueller Buchung schützen**
  Das Abschlusskonto (Jahresgewinn, z. B. 2979) soll im `BookingForm` nicht frei buchbar sein.
  Hintergrund: Wird der Gewinn manuell eingebucht, entsteht ein inkonsistenter Doppeleintrag,
  wenn danach noch der Jahresabschluss-Assistent läuft.
  Lösung: Abschlusskonten mit Flag `isClosingAccount` kennzeichnen und im
  Buchungsformular ausblenden oder mit einer Warn-Modal versehen, die auf den Jahresabschluss verweist.
  Optional: Backend-Validierung in `api/bookings.php` als zweite Sicherheitsebene.

---

## Rechnungen

- [x] **4. Rechnungen: Direktversand per E-Mail implementieren**
  Nutzer sollen eine Ausgangsrechnung ohne externes E-Mail-Programm direkt aus der App versenden können.
  Flow: Rechnung öffnen → «Senden»-Button → PDF wird generiert → Versand via `api/mailer.php`
  (mit Rechnung als Anhang) an die hinterlegte Empfängeradresse.
  Versandstatus (gesendet / fehlgeschlagen) in UI und DB festhalten; erneutes Senden bei Fehler ermöglichen.
  Technisch: `api/mailer.php` um ein Rechnungs-E-Mail-Template erweitern; PHPMailer/SMTP für Production.

- [x] **5. Rechnungen: Statusänderung nach «bezahlt» einschränken**
  Einmal als bezahlt markierte Rechnungen sollen nicht ohne Weiteres zurückgesetzt werden können.
  Begründung: Buchhalterische Integrität; verhindert versehentliche oder missbräuchliche Statusänderungen.
  Lösung: Nach «Als bezahlt markieren» (Bestätigungs-Dialog) ist der Status für Standardnutzer gesperrt.
  Admins / Treuhänder können den Status mit Pflichtangabe eines Grundes ändern;
  jede Änderung erzeugt einen Eintrag in einer `invoice_audit`-Tabelle (user_id, timestamp, old/new Status, Grund).

---

## Navigation & UX

- [x] **6. Navigation: «Bilanz» umbenennen in «Bilanz / Erfolgsrechnung»**
  Der aktuelle Nav-Eintrag «Bilanz» deckt Bilanz und Erfolgsrechnung ab – das sollte im Label sichtbar sein.
  Änderung betrifft: `AppLayout.tsx`, Breadcrumbs, Seitentitel und allfällige Tests.

- [x] **7. Navigation: MWSt als eigener Navigationspunkt auslagern**
  MWSt und Steuern sind aktuell unter «Bilanz» versteckt – viele Nutzer suchen das nicht dort.
  Lösung: Eigener Nav-Eintrag «MWSt» mit der bestehenden MwSt-Übersicht (Vorsteuer,
  geschuldete MwSt, Saldo, ESTV-Formular). Bestehende MwSt-Logik aus `Bilanz.tsx` extrahieren.

- [x] **8. Dokumente: Upload-Bezeichnung für Kreditorenrechnungen intuitiver gestalten**
  Aktuell ist die Sektion unklarer betitelt. Nutzer müssen «raten», dass Lieferantenrechnungen
  unter «Dokumente» hochzuladen sind.
  Vorschlag: Abschnitt «Kreditorenrechnungen (Lieferanten)» mit kurzem Erklärungstext und
  einem Hinweis auf den Workflow (Upload → Erkennung → Buchungsvorschlag).

- [x] **9. Navigation: Reihenfolge und thematische Gruppen überarbeiten**
  Die Navigation soll in logische Abschnitte (Trennlinien / Gruppen) unterteilt werden, z. B.:
  **Buchhaltung:** Dashboard, Buchungen, Import (Eröffnungsbuchhaltung), Bilanz / Erfolgsrechnung, Jahresabschluss
  **Rechnungen & Kontakte:** Rechnungen, Offerten, Kontakte
  **Finanzen:** Bankabgleich, MWSt
  **Personal & Kosten:** Lohn, Spesen, Zeiterfassung
  **Inventar:** Lager, Anlagen
  **Sonstiges:** Archiv, Dokumente, Einstellungen
  Technisch: `navConfig.ts` einführen; `AppLayout.tsx` liest Gruppen + Items konfigurierbar aus JSON.

- [x] **10. Navigation: Subventionen als Spezialthema separat positionieren**
  Subventionen sind ein Nischenthema (v. a. Startups / Förderanträge) und passen nicht
  in die Standard-Navigation unter normale Buchhaltungs-Tools.
  Vorschlag: Unter «Erweiterte Tools» / «Sonstiges» einstufen oder nur bei bestimmten
  Nutzer-Profilen einblenden (vgl. Navigationsprofil-Feature aus Todo2 #26).

---

## Verknüpfungen & Integrationen

- [x] **11. Zeiterfassung: Direkte Fakturierung aus dem Tool**
  Gebuchte Stunden sollen mit einem Klick als Rechnungsposition übernommen werden können.
  Flow: Zeiteinträge filtern (Projekt / Mitarbeiter / Zeitraum) → «In Rechnung übernehmen» →
  `RechnungForm` öffnet sich mit Positionen vorausgefüllt (Beschreibung, Stunden × Stundensatz, MwSt).
  Technisch: `/api/time-entries?projectId=...&unbilled=1` + Mapping auf Invoice-Positionen.

- [x] **12. Lagerbuchhaltung mit Rechnungsstellung verknüpfen**
  Beim Erstellen einer Rechnung sollen Artikel direkt aus dem Lager gewählt werden können.
  Bei Abschluss der Rechnung reduziert das System den Lagerbestand automatisch und erzeugt
  die passende Buchung (z. B. `7000 Wareneinsatz` / `1200 Lagerbestand`).
  Warnung bei ungenügendem Bestand; optionales Backorder-Flag.
  Technisch: DB-Tabellen `products` + `stock_movements`; API `/api/products`, `/api/stock-movements`;
  transaktionales Update beim Rechnungsabschluss.

- [ ] **13. Dokumentenerkennung: Zentrales Server-Training statt LocalStorage**
  Aktuell lernt die automatische Dokumentenerkennung nur lokal im Browser-LocalStorage –
  das Wissen bleibt beim einzelnen Nutzer und geht bei Browser-Reset verloren.
  Lösung: Erkannte Felder + Korrekturen des Nutzers werden an `api/document-learning.php` gesendet
  und in einer DB-Tabelle `document_training_samples` gespeichert (anonymisiert / mit Opt-in).
  Ein Server-seitiger Job (Cron / CLI) trainiert das Modell periodisch neu,
  sodass alle Nutzer von den kumulierten Trainingsdaten profitieren.
  Datenschutz: Sensible Werte anonymisieren; Nutzer muss opt-in geben.

---

## Positives Feedback (kein Handlungsbedarf)

- [x] **Buchungen: Gesamtprozess sehr gut bewertet** — nicht verändern.
- [x] **Jahresabschluss-Assistent: Geführter Prozess ausgezeichnet bewertet** — geführten Flow beibehalten und nicht vereinfachen.
