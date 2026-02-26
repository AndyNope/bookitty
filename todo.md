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

- [ ] **11. Stammkonten + Belegübersicht mit PDF-Link**
  Häufig verwendete Konten als Favoriten speichern.
  In der Buchungsliste: Klick auf Beleg öffnet direkt das zugehörige PDF.

---

## KI & Assistent

- [x] **6. Kitty – KI-Chatbot**
  Offline-Wissensbasis (60+ Einträge) + OpenRouter-Fallback (9-Modell-Kette).
  Buchungsvorschläge mit Direkterfassung, Nav-Highlight via CustomEvent.

- [ ] **14. Onboarding-Tutorial**
  Kurzes interaktives Tutorial für Einsteiger ohne Buchhaltungskenntnisse.
  Wird separat erstellt – erst nach Abschluss der Kernfunktionen sinnvoll.

---

## Landing & Marketing

- [x] **3. Kontakt / FAQ / Kitty-Einstieg auf Landing Page**
  FAQ-Sektion (6 Fragen, Accordion) + Kitty-Showcase mit Chat-Mockup und Demo-Link.

- [ ] **4. Branding / USP – «Einfach, günstig, höchste Qualität»**
  Ggf. alternativer Produktname (z. B. *EasyBook*) und angepasstes Logo prüfen.
  Landing Page stärker auf diese drei Werte ausrichten.

- [~] **5. Automatische Steuererklärung als USP**
  Erst nach Rücksprache mit den Onkeln und Klärung der rechtlichen Details umsetzen.

- [ ] **16. Automatische Mahnungen bei vergessener Zahlung**
  Offene Debitoren automatisch erkennen und Mahnungen versenden.
  Guter USP – nach Steuerfunktion als nächster Premium-Baustein.

---

## Integrationen & Erweiterungen

- [ ] **12. Mailverkehr verbinden**
  E-Mails mit Rechnungsanhängen automatisch importieren und als Buchungsvorschlag verarbeiten.

- [ ] **7. Lohnbuchhaltung**
  Lohnabrechnungen, Sozialversicherungen (AHV/IV/EO/ALV), Lohnausweise.
  Grösserer Scope – separates Modul, nach Kern-MVP.

---

## Referenzen

- **Slide 7** – Kontenrahmen KMU (Basis für alle Kontonummern)
- **Slide 12** – Bilanzstruktur (Aktiven / Passiven)
- **Slide 14** – Erfolgsrechnung (vollständige Stufenrechnung)
- **Slide 16** – Mitbewerber (Bexio, Banana Buchhaltung u. a.)
- **Banana Buchhaltung** – Funktionsreferenz (gleicher Kern, aber ohne KI)
- **Bexio** – UI/UX-Referenz für Gesamtlösung
