# Bookitty – Roadmap (Phase 2)

> Priorisiert nach Impact/Aufwand auf Basis der Wettbewerbsanalyse (analyse.md)
> `- [x]` = erledigt · `- [-]` = teilweise · `- [ ]` = offen · `- [~]` = zurückgestellt

---

## 🔴 Kritisch – Kern-Workflow-Lücken gegenüber Bexio & Infinity

- [x] **1. Kontaktverwaltung (Mini-CRM)**
  Kunden- und Lieferantenstamm: Name, Adresse, UID/MWST-Nr., IBAN, Kontaktperson.
  Basis für Auto-Fill in Rechnungen und Bankabgleich.

- [x] **2. Ausgangsrechnung erstellen**
  Professionelle Rechnungen mit Briefkopf, Logo, Artikelpositionen, Nummernkreis (z. B. RE-2026-001).
  PDF-Export mit Firmenlogo und Kontaktdaten.

- [x] **3. QR-Rechnung ausgeben (Swiss QR-Code)**
  Swiss QR-Code (SPC-Format) auf eigener Rechnung einbetten – nicht nur einlesen.
  IBAN + Referenznummer + Betrag kodiert, druckbar und digital versendbar.

- [x] **4. Bankabgleich – CSV/MT940/camt.054 Import**
  Kontoauszug-Datei hochladen (PostFinance, Raiffeisen, ZAK, etc.).
  Zeilen automatisch auf offene Buchungen matchen (Betrag + Datum + Referenz).
  Manuelles Zuordnen für ungematchte Positionen.

- [x] **5. Offizielle MwSt-Abrechnung (ESTV-Formular)**
  Formular 533 (effektive Methode) oder 583 (Saldosteuersatz) befüllen.
  Auf Basis der vorhandenen MwSt-Übersicht automatisch berechnen.
  PDF-Export für Einreichung bei der ESTV.

---

## 🟠 Wichtig – oft nachgefragt, klarer Mehrwert

- [x] **6. Offerten / Angebote**
  Angebotsstellung mit eigenem Nummernkreis (AN-2026-001).
  1-Klick-Umwandlung Angebot → Rechnung.

- [x] **7. Mahnungen versenden**
  Zahlungserinnerungs-E-Mail direkt aus App versenden (1. / 2. / 3. Mahnung).
  Auf Basis der bestehenden Fälligkeits-Badges und IMAP-Konfiguration aufbauen.

- [x] **8. Mehrbenutzer + Rollen**
  Admin / Buchhalter / Mitarbeiter (Read-only) pro Firma.
  JWT-basiertes Rollen-System im Backend (api/auth.php erweitern).

- [x] **9. Treuhänder-Zugang**
  Externer Steuerberater erhält zeitlich begrenzten Read-only-Zugriff per Einladungslink.

- [x] **10. Spesenabrechnungen**
  Mitarbeiter erfasst Spesen (Betrag, Kategorie, Beleg-Foto).
  Vorgesetzter genehmigt oder lehnt ab → automatische Lohnbuchung.

- [x] **11. Mehrwährung (CHF / EUR / USD)**
  Tagesaktueller Wechselkurs (z. B. via SNB-API).
  Kursdifferenz-Buchung automatisch beim Ausgleich offener Fremdwährungsposten.

- [x] **12. ELM-zertifizierter Lohnausweis (SWISSDEC)**
  Lohnausweis elektronisch via ELM Unified übermitteln.
  Aktuell: nur PDF-Export. Ziel: SWISSDEC-Schnittstelle.

- [x] **13. Jahresabschluss-Assistent**
  Geführter Assistent für Abschlussbuchungen:
  Rückstellungen, Abschreibungen (linear/degressiv), transitorische Posten, Gewinnverwendung.

---

## 🟡 Nice-to-have – mittelfristig

- [x] **14. 10-Jahres-Archivierung (GeBüV-konform)**
  ZIP-Download aller Belege + JSON-Export aller Buchungen.
  Optional: verschlüsselte Cloud-Ablage (S3 o. ä.).
  Gesetzliche Pflicht – muss vor erstem echten Kundeneinsatz gelöst sein.

- [x] **15. Mobile App / PWA**
  Progressive Web App: Belegscan mit Kamera, Offline-Fähigkeit.
  Oder: React Native App für iOS/Android.

- [x] **16. Anlagenbuchhaltung**
  Sachanlagen erfassen: Kaufdatum, Nutzungsdauer, Abschreibungssatz.
  Automatische Abschreibungsbuchungen (monatlich/jährlich), Anlagenspiegel-Export.

- [x] **17. Lagerverwaltung (minimal)**
  Produkte / Artikel-Stamm für Rechnungspositionen.
  Lagerbestand bei Ausgangsrechnung reduzieren, Wareneinkauf erhöhen.

- [x] **18. Mehrsprachigkeit DE / FR / IT / EN**
  i18n-Framework (z. B. i18next) einbauen.
  Priorität: Französisch für Westschweizer KMU.

- [ ] **19. Kundenkonto-Portal**
  Kunde erhält Link, um eigene Rechnungen online einzusehen und Zahlungsstatus zu prüfen.

- [ ] **20. Integriertes Zahlungssystem**
  TWINT / Stripe / Kreditkarte als Zahlungslink direkt in Ausgangsrechnung einbetten.

---

## 🔵 Strategisch – Wachstum & Differenzierung

- [ ] **21. Direkte Bankverbindung (Open Banking)**
  Kontoauszüge per API automatisch einlesen (PostFinance Connect, Raiffeisen API, ZAK).
  Vollautomatisches Matching ohne manuellen CSV-Import.

- [ ] **22. Vollautomatische Belegkategorisierung**
  Belege ohne Klick kategorisieren – nur noch Einzel-Klick-Bestätigung nötig.
  Aufbau auf templateStore + kittySuggester mit höherer Konfidenz-Schwelle.

- [ ] **23. Zeiterfassung**
  Stunden auf Projekte / Kunden buchen.
  Direktes Umrechnen Stunden × Stundensatz → Rechnungsposition.

- [ ] **24. Swiss GAAP FER (mittlere/grosse Unternehmen)**
  Swiss GAAP FER-konformes Reporting als optionales Modul.
  Würde System auch für mittlere Unternehmen attraktiv machen.

- [ ] **25. Staatliche Subventionen / HSG-Startup-Programm**
  Förderantrag oder Kooperation prüfen (erst relevant nach MVP + Team).
  HSG-Startup-Programm: Mentoring, Infrastruktur, Netzwerk.
