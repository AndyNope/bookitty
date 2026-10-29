# Bookitty – Monetarisierungsstrategie

> Stand: 26. März 2026

---

## Grundprinzip

**Free machen was alle brauchen. Bezahlen was Profis brauchen.**

Das Free-Tier ist kein Verlust – es ist Marketing.
Jeder KMU-Inhaber der es gratis nutzt, empfiehlt es weiter.
Treuhänder werden zu Multiplikatoren, weil Kitty ihre Arbeit erleichtert.

---

## 1. Abos und KI-Tokens (Arbeitsentwurf)

Die folgenden Stufen sind ein Vorschlag für die Produktdiskussion vor der Startup Night, noch keine freigegebenen Verkaufspreise. KI-Tokens werden serverseitig anhand der vom Modell gemeldeten Ein- und Ausgabe-Tokens verbucht; die Oberfläche zeigt Guthaben und Verbrauch transparent an.

| Tier | Preis | Nutzer | KI-Tokens pro Monat | Enthalten |
|---|---:|---:|---:|---|
| **Starter** | CHF 0 | 1 | Keine Cloud-KI | Buchhaltungskern, lokale Kitty-Wissensbasis, OCR, Bilanz und MwSt-Übersicht |
| **Solo** | CHF 12 / Monat | 1 | 250'000 | Cloud-Kitty, Buchhaltungskern, QR-Rechnung |
| **Team** | CHF 29 / Monat | Bis 3 | 750'000 | Solo plus Rollen, Treuhänder-Zugang und Teamfunktionen |
| **Business** | CHF 59 / Monat | Bis 5 | 2 Mio. | Team plus erweiterte Rollen, Audit-Funktionen und priorisierter Support |

Vorgeschlagene einmalige Tokenpakete: **1 Mio. für CHF 4.90**, **4 Mio. für CHF 14.90** und **10 Mio. für CHF 29.90**. Pakete können jederzeit gekauft werden, auch mit Starter. Monatsguthaben wird zu Beginn der Aboperiode erneuert; gekaufte Tokens werden getrennt geführt. Verfalls- und Rückerstattungsregeln müssen vor dem Verkauf in den AGB festgelegt werden.

**Wichtige Produktentscheidung:** Kunden-Tokens nicht mit Provider-Tokens verwechseln. Anbieterpreise und Modelle können sich ändern; deshalb in der Oberfläche «KI-Tokens» als nutzerfreundliches Kontingent benennen, die tatsächlichen Providerkosten intern separat messen und Limits serverseitig durchsetzen. Der Chatverlauf muss vor jeder Anfrage begrenzt werden, sonst vervielfacht das erneute Mitsenden alter Nachrichten den Verbrauch.

### KI-Anbieter und Datenschutz

- OpenRouter mit wechselnden Gratis-Modellen nicht für produktive Buchhaltungsdaten verwenden.
- Infomaniak AI Services als erste Option evaluieren: OpenAI-kompatible API, Schweizer Rechenzentren und laut Anbieter weder Speicherung von Prompts noch Training mit Kundendaten. Vor Produktivbetrieb AVV/DPA, Subunternehmer, Aufbewahrung, Supportzugriff und aktuelle Modellverfügbarkeit schriftlich prüfen.
- Als Startmodell `mistralai/Mistral-Small-4-119B-2603` mit Testfällen für Schweizer Buchhaltungsfragen evaluieren. Infomaniak listet es als mehrsprachig und für anspruchsvolle Business-Anwendungen. Der veröffentlichte Preis beträgt CHF 0.20 pro 1 Mio. Input-Tokens und CHF 0.75 pro 1 Mio. Output-Tokens (Preise können sich ändern und verstehen sich exkl. MwSt.); vor Start eine Kostenobergrenze festlegen.
- API-Key bleibt ausschliesslich serverseitig. Chat-Endpunkt authentifizieren, Rate-Limits und Tokenbudget pro Unternehmen serverseitig prüfen, Eingaben begrenzen und Logs standardmässig ohne Prompt-Inhalte führen. Demo-Nutzer erhalten nur die lokale Wissensbasis.
- Vor Cloud-Verarbeitung übermitteln wir nur notwendige Daten. Belege, Namen, IBANs und Buchungsdetails nicht automatisch an ein Modell senden; dafür braucht es eine bewusste Nutzeraktion und klare Datenschutzinformation.

### Zahlungssystem

**Empfehlung: Stripe Checkout + Billing**, mit TWINT für Abos und Einmalkäufe. Stripe dokumentiert TWINT-Unterstützung für Subscriptions; Checkout hält Kartendaten aus Bookitty heraus. Webhooks sind die einzige Quelle für bezahlte Abos und Token-Gutschriften: Rückleitungsseiten des Browsers dürfen niemals Guthaben vergeben. Webhook-Ereignisse müssen signaturgeprüft, idempotent verarbeitet und mit unveränderbarem Token-Ledger gebucht werden.

Payrexx ist eine gute Schweizer Alternative und unterstützt wiederkehrendes TWINT über Payrexx Pay. Stripe ist für dieses MVP meine erste Wahl wegen der direkten Kombination aus Checkout, Billing und TWINT. Bei beiden Anbietern ausschliesslich notwendige Zahlungs- und Kontodaten verarbeiten; Buchhaltungs- und KI-Inhalte gehören nicht in Zahlungsmetadaten.

### Technische Inbetriebnahme

- Die ignorierte `api/config.php` nicht blind mit der Vorlage überschreiben. Dort Infomaniak-API-Key, AI-Produkt-ID und Modell sowie Stripe-Secret-Key und Webhook-Secret sicher eintragen. `BILLING_ENABLED` bleibt bis zur Preisfreigabe und erfolgreichen Tests `false`.
- Zusätzlich die sechs Stripe-Price-IDs (`STRIPE_PRICE_PLAN_*` und `STRIPE_PRICE_TOKEN_*`) in `api/config.php` hinterlegen. Bookitty referenziert feste Katalogpreise; es werden keine Preise oder Stripe-Produkte pro Checkout dynamisch erstellt.
- Auf dem Server ein starkes zufälliges `MIGRATE_SECRET` setzen. Die Migration einmalig vom lokalen Rechner per HTTPS-POST ausführen; die Eingabeaufforderung verbirgt den Schlüssel:

	```bash
	python3 -c 'import getpass,urllib.request; key=getpass.getpass("MIGRATE_SECRET: "); req=urllib.request.Request("https://bookitty.ch/api/migrate.php", data=b"{}", headers={"X-Migrate-Key": key, "Content-Type": "application/json"}, method="POST"); print(urllib.request.urlopen(req, timeout=30).read().decode())'
	```

	Den Schlüssel weder in die URL noch in den Chat einfügen. Nach erfolgreicher Migration `MIGRATE_SECRET` im Server-Config leeren und den Migrationsendpunkt über den Hosting-Dateimanager entfernen.
- Stripe-Webhook auf `/api/stripe-webhook.php` konfigurieren und mindestens `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated` und `customer.subscription.deleted` zustellen lassen.
- Erst im Stripe-Testmodus TWINT-Kauf, Aboverlängerung, fehlgeschlagene Zahlung, Kündigung, doppelte Webhook-Zustellung und Token-Nachkauf testen. Für Produktivbetrieb TWINT beim Händlerkonto aktivieren und Preise sowie AGB freigeben.

### Vor dem Livegang verbindlich klären

1. Tarifpreise, Tokenkontingente, Nutzerlimits und Token-Verfallsregeln mit Produkt/Finanzen freigeben.
2. KI-Anbieter-Vertrag und Datenschutz-Folgen für die tatsächlich verarbeiteten Daten prüfen.
3. Token-Ledger, Sperr-/Drosselverhalten, signierte Webhooks, Rückerstattungen und Abo-Kündigungen testen.
4. Checkout erst nach aktivierter TWINT-Zahlungsmethode und abgeschlossener Händlerprüfung freischalten.

### Hochrechnungen (konservativ)

| Nutzer Free | Konversionsrate | Pro-Nutzer | MRR |
|---|---|---|---|
| 500 | 5% | 25 | CHF 300 |
| 2'000 | 5% | 100 | CHF 1'200 |
| 10'000 | 5% | 500 | CHF 6'000 |
| 50'000 | 4% | 2'000 | CHF 24'000 |

Ab ~2'000 Pro-Nutzern deckt das Modell Server- und Supportkosten.
Ab ~5'000 Pro-Nutzern ist es profitabel ohne externe Finanzierung.

---

## 2. Treuhänder-Marktplatz (skalierbares Provisionsmodell)

Schweizer Treuhänder registrieren sich auf Bookitty, erhalten Kundenzugang.

### Zwei Modelle parallel:

**A) Provisions-Modell** (für kleinere Treuhänder)
- Bookitty vermittelt KMU-Nutzer an registrierte Treuhänder
- Provision: **10–15%** auf vermittelte Jahresmandate
- Jahresmandat CHF 800–3'000 → CHF 80–450 pro Vermittlung
- Kitty bereitet die Buchführung vor → Treuhänder spart 2–4h Aufräumarbeit → gibt gerne Provision

**B) Flatrate** (für mittlere/grosse Treuhandbüros)
- Treuhänder zahlt **CHF 49/Monat** für unlimitierte Kundenzugänge
- Eigenes Treuhänder-Dashboard: alle Kunden auf einen Blick
- Direkte Kommentarfunktion auf Buchungen (Rückfragen ohne E-Mail)

### Warum Treuhänder mitmachen:

- Sie müssen nicht mehr Excel-Dateien per E-Mail annehmen
- Kitty hat bereits kategorisiert, MwSt berechnet, Fehler markiert
- Jahresabschluss dauert Stunden statt Tage
- Bookitty als empfohlenes Tool stärkt ihre eigene Positionierung

---

## 3. Banken-Partnership (mittelfristig)

Wenn Bookitty PostFinance-, Raiffeisen- oder ZAK-Kontoauszüge nativ besser einliest als alle anderen:

- Banken empfehlen Bookitty aktiv als **bevorzugtes Accounting-Tool** für ihre KMU-Kunden
- **B2B-Lead-Deal**: Bank zahlt CHF 15–50 pro aktiviertem Bookitty-Kunden
- **Co-Branding**: «PostFinance × Bookitty» mit Revenue-Share auf Pro-Upgrades
- Bankdaten-Integration schafft Lock-in auf beiden Seiten (Nutzer + Bank)

### Potenzial:
PostFinance hat ~600'000 Geschäftskunden. Selbst 1% davon sind 6'000 potenzielle Nutzer
mit einem Lead-Value von CHF 90'000–300'000.

---

## 4. White-Label für Treuhandbüros (mittelfristig)

Grössere Treuhandbüros (10+ Mitarbeitende) wollen ihren Kunden ein eigenes Tool anbieten:

- «Mustermann Treuhand – powered by Bookitty»
- Eigenes Logo, Farbschema, Domain (`buchhaltung.mustermann-treuhand.ch`)
- Flatrate: **CHF 199–499/Monat** pro Treuhandbüro, unlimitierte End-Kunden
- Wir liefern Infrastruktur + Updates, sie liefern Kundenbeziehung + Support

**Zielmarkt:** ~5'000 Treuhandbüros in der Schweiz. Selbst 50 White-Label-Kunden = CHF 10'000–25'000 MRR.

---

## 5. Migrations-Paket (einmalig)

Jedes KMU das von Bexio oder Banana wechselt, hat historische Daten die importiert werden müssen:

- **Self-Service** (gratis): CSV/XLSX-Import-Assistent bereits vorhanden – senkt Wechsel-Hürde
- **Managed Migration** CHF 149 einmalig: Wir importieren, bereinigen, richten Konten ein
- Könnte auch als Kitty-gestützter Premium-Service CHF 49 angeboten werden

---

## Priorisierung nach Umsetzbarkeit

| Priorität | Kanal | Aufwand | Potenzial |
|---|---|---|---|
| Sofort | Freemium → Pro | Gering (Stripe einbinden) | Mittel, linear skalierend |
| Kurzfristig | Treuhänder-Flatrate | Mittel (Portal + Dashboard) | Hoch, B2B-Recurring |
| Mittelfristig | Treuhänder-Marktplatz | Hoch (Vermittlungslogik, Verträge) | Sehr hoch, Netzwerkeffekt |
| Mittelfristig | Migrations-Paket | Gering | Gering, einmalig |
| Langfristig | Banken-Partnership | Sehr hoch (Sales-Zyklus) | Sehr hoch, Massenmarkt |
| Langfristig | White-Label | Mittel (Mandanten-Architektur) | Hoch, stabil |

---

## Zusammenfassung

```
Kurzfristig:   CHF 12–29/Monat Pro-Abo          → stabil, vorhersehbar
Mittelfristig: CHF 49/Monat Treuhänder-Flatrate  → B2B, hoher LTV
Langfristig:   Banken + White-Label              → Massenmarkt, Partnerschaft
```

> Der klarste Erste Schritt: Stripe-Integration für Pro-Upgrade,
> danach ein einfaches Treuhänder-Registrierungsformular.
> Beides ist innerhalb weniger Wochen umsetzbar.
