# Bookitty – Feature-Roadmap

> Zum Abhaken: `- [x]` = erledigt · `- [-]` = teilweise · `- [ ]` = offen · `- [~]` = zurückgestellt

---

## Buchhaltungs-Kern

- [x] **1. Vollständige Erfolgsrechnung (Slide 14)**
  Stufenrechnung: Bruttogewinn I → II → EBIT → Nebenerfolg → Ergebnis vor Steuern → Jahresergebnis.
  Alle Kategorien 3–8 (inkl. Steuerkonto 8900) korrekt abgebildet.

- [x] **2. Bilanz nach Kategorie – Einzelkonten (Slide 12)**
  Aufklappbare Gruppen: Umlaufvermögen / Anlagevermögen (Aktiven), FK kurzfristig / FK langfristig / Eigenkapital (Passiven).
  Aktiv- und Passivkonten klar getrennt. Erfolgsrechnung (Aufwand/Ertrag) separat.

- [x] **13. MwSt-Übersicht**
  Eigener Tab in Auswertungen: Vorsteuer, geschuldete MwSt, Saldo. Detailtabelle pro Buchung.

- [x] **9. Konto-Wechsel bei «bezahlt» + automatische Betrag- & MwSt-Erfassung**
  Bei Statuswechsel auf «bezahlt» soll das Gegenkonto automatisch wechseln (z. B. Kreditoren → Bank).
  Betrag und MwSt sollen aus dem Beleg automatisch übernommen werden.

- [x] **10. Buchung löschen**
  Bestehende Buchungen müssen aus der Liste löschbar sein (mit Bestätigungs-Dialog).

- [x] **8. Einnahme vs. Ausgabe – Richtungserkennung**
  Eigene Rechnung wird fälschlicherweise als Kreditorenrechnung erkannt.
  Lösung: Unternehmen hinterlegen → System erkennt «Rechnung von meinem Unternehmen = Einnahme».

- [x] **11. Stammkonten + Belegübersicht mit PDF-Link**
  Häufig verwendete Konten als Favoriten speichern.
  In der Buchungsliste: Klick auf Beleg öffnet direkt das zugehörige PDF.

---

## KI & Assistent

- [x] **6. Kitty – KI-Chatbot**
  Offline-Wissensbasis (60+ Einträge) + OpenRouter-Fallback (9-Modell-Kette).
  Buchungsvorschläge mit Direkterfassung, Nav-Highlight via CustomEvent.

- [x] **14. Onboarding-Tutorial**
  Kurzes interaktives Tutorial für Einsteiger ohne Buchhaltungskenntnisse.
  Wird separat erstellt – erst nach Abschluss der Kernfunktionen sinnvoll.

---

## Landing & Marketing

- [x] **3. Kontakt / FAQ / Kitty-Einstieg auf Landing Page**
  FAQ-Sektion (6 Fragen, Accordion) + Kitty-Showcase mit Chat-Mockup und Demo-Link.

- [ ] **4. Branding / USP – «Einfach, günstig, höchste Qualität»**
  Ggf. alternativer Produktname (z. B. *EasyBook*) und angepasstes Logo prüfen.
  Landing Page stärker auf diese drei Werte ausrichten.

- [-] **5. Automatische Steuererklärung als USP**
  Provisorisch implementiert: «Steuern»-Tab in Auswertungen mit MwSt-Abrechnung (ESTV-Zahllast/Guthaben) und
  geschätzten Direkten Steuern (Bundessteuer ~7.83% + Kantonssatz, alle 26 Kantone wählbar).
  Buchungsvorschläge für 2200/1020 und 8900/2000 eingeblendet. PDF-Export inkl. Steuerzusammenfassung.
  Rechtliche Prüfung / Rücksprache mit Steuerfachperson ausstehend – nicht verbindlich.

- [x] **16. Automatische Mahnungen bei vergessener Zahlung**
  Zahlungsfälligkeit-Feld («dueDate») bei offenen Buchungen (Einnahme + Ausgabe) mit +30/60/90-Tage Quick-Fill.
  Fälligkeit-Spalte in der Buchungsliste mit farbcodierten Badges: «Überfällig NT», «Heute fällig», «In NT fällig».
  Mahnungen-Banner auf der Buchungsseite zeigt Anzahl + Betrag überfälliger Zahlungen.
  Dashboard: StatCard «Überfällige Zahlungen» mit Summe.

- [ ] **20. Buchungen bearbeiten**
  Bestehende Buchungen nachträglich editieren können (Beleg, Beträge, Konten, Status, Fälligkeit).
  Edit-Button in der Buchungsliste öffnet das bestehende `BookingForm` im Bearbeitungs-Modus.

---

## Integrationen & Erweiterungen

- [ ] **17. Eigene Kontenbezeichnungen**
  Nutzer können eigene Konten anlegen und Standard-Kontobezeichnungen überschreiben
  (z. B. «3400 Dienstleistungserlöse» → «Beratungshonorar XY»).
  Onboarding-Schritt auf der Startseite: Unternehmen legt seine Stammkonten fest.
  System speichert customized Konten (localStorage / DB) und bevorzugt diese bei Vorschlägen + Auswertungen.

- [ ] **18. Datenimport aus Altsystemen**
  Vorjahresbilanz hochladen (CSV/Excel/PDF), damit Kunden einfach von einem bestehenden System migrieren können.
  Import-Assistent: erkennt Spalten (Konto, Soll, Haben, Betrag), mappt auf CH-KMU-Kontenrahmen, erstellt Eröffnungsbuchungen.
  Minimallösung: manuelle Eingabe der Eröffnungssalden pro Konto.

- [ ] **19. Bookitty als Buchungsbegleiter (KI-Assistent)**
  KI gibt proaktiv Feedback während der Buchungserfassung:
  «Bist du sicher? Ich hätte eher Konto X gewählt, weil …» mit Begründung + 1-Klick-Übernahme.
  19.2: Buchung im Chat markieren – Nutzer kann eine Buchung aus der Liste auswählen und zusammen mit
  weiterem Kontext (Ablage-Text, Notiz) direkt an Kitty senden, um gezielt nachzufragen.

- [x] **12. Mailverkehr verbinden**
  E-Mails mit Rechnungsanhängen automatisch importieren und als Buchungsvorschlag verarbeiten.

- [x] **7. Lohnbuchhaltung**
  Separates Modul «Lohn» mit eigenem Nav-Eintrag und localStorage-Persistenz.
  Mitarbeiter-Verwaltung (Name, Funktion, Bruttolohn, AHV-Nr., NBUV/BVG/KK konfigurierbar).
  Monatsabrechnung: Abzugstabelle AN (AHV/IV/EO 5.3%, ALV 1.1%, NBUV, BVG/PK, KK) + Arbeitgeberbeiträge (AG-AHV, ALV, FAK ~2%, BUV ~0.5%, BVG/PK).
  Lohnausweis-Tab: pro Mitarbeiter/Monat mit Nettolohnberechnung.
  PDF-Export Lohnliste via jsPDF. Sätze 2025 – provisorisch.

---

## Strategische Überlegungen (noch offen)

**Ausrichtung auf Grossunternehmen & Swiss GAAP FER**
Langfristig: Steuererklärungsvorlage einer AG vollständig abbilden + Swiss GAAP FER-Konformität prüfen
→ würde System auch für mittlere/grosse Unternehmen attraktiv machen.

**Datensicherheit & 10-Jahres-Archivierung**
Belege müssen gesetzlich 10 Jahre aufbewahrt werden.
Option A: lokaler Export (ZIP-Download aller PDFs + JSON-Export).
Option B: verschlüsselter Cloud-Speicher (S3 o. ä.). Noch zu entscheiden.

**Staatliche Subventionen**
Bookitty könnte dem Kanton/Bund helfen, unstrukturierte Steuererklärungen zu reduzieren.
Eventuell Förderantrag oder Kooperation prüfen → erst relevant ab marktreifer Version.

**Gründung über die HSG (Universität St. Gallen)**
HSG-Startup-Programm bietet Mentoring, Infrastruktur und Netzwerk-Vorteile.
→ Prüfen sobald MVP steht und Team vollständig.

---

## Referenzen

- **Slide 7** – Kontenrahmen KMU (Basis für alle Kontonummern)
- **Slide 12** – Bilanzstruktur (Aktiven / Passiven)
- **Slide 14** – Erfolgsrechnung (vollständige Stufenrechnung)
- **Slide 16** – Mitbewerber (Bexio, Banana Buchhaltung u. a.)
- **Banana Buchhaltung** – Funktionsreferenz (gleicher Kern, aber ohne KI)
- **Bexio** – UI/UX-Referenz für Gesamtlösung
