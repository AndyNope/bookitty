# Bookitty – Monetarisierungsstrategie

> Stand: 26. März 2026

---

## Grundprinzip

**Free machen was alle brauchen. Bezahlen was Profis brauchen.**

Das Free-Tier ist kein Verlust – es ist Marketing.
Jeder KMU-Inhaber der es gratis nutzt, empfiehlt es weiter.
Treuhänder werden zu Multiplikatoren, weil Kitty ihre Arbeit erleichtert.

---

## 1. Freemium → Pro (Haupteinnahme)

| Tier | Preis | Enthalten |
|---|---|---|
| **Free** | CHF 0 / Monat | Alle Kernfunktionen, 1 Nutzer, unbegrenzte Buchungen, Kitty-Chat, OCR, Lohn, Bilanz, MwSt-Übersicht |
| **Pro** | CHF 12 / Monat | Mehrbenutzer (bis 3), Treuhänder-Zugang, ESTV-Export, SWISSDEC-Lohnausweis, Prioritäts-Support, QR-Rechnung ausgeben |
| **Team** | CHF 29 / Monat | Bis 5 Nutzer, Rollen (Admin / Buchhalter / Read-only), Kommentare auf Buchungen, erweiterte API, White-Label-Option |

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
| 🔴 Sofort | Freemium → Pro | Gering (Stripe einbinden) | Mittel, linear skalierend |
| 🟠 Kurzfristig | Treuhänder-Flatrate | Mittel (Portal + Dashboard) | Hoch, B2B-Recurring |
| 🟡 Mittelfristig | Treuhänder-Marktplatz | Hoch (Vermittlungslogik, Verträge) | Sehr hoch, Netzwerkeffekt |
| 🟡 Mittelfristig | Migrations-Paket | Gering | Gering, einmalig |
| 🔵 Langfristig | Banken-Partnership | Sehr hoch (Sales-Zyklus) | Sehr hoch, Massenmarkt |
| 🔵 Langfristig | White-Label | Mittel (Mandanten-Architektur) | Hoch, stabil |

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
