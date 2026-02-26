export type BookingSuggestion = {
 description: string;
 account: string; // Soll-Konto (z. B. "6500 Büroaufwand")
 contraAccount: string; // Haben-Konto (z. B. "1020 Bankkonto")
 type: 'Einnahme' | 'Ausgabe';
 paymentStatus: 'Bezahlt' | 'Offen';
 vatRate: number;
 amount?: number;
};

export type KittyAction =
 | { type: 'highlight'; targetId: string }
 | { type: 'booking'; suggestion: BookingSuggestion };

export type KnowledgeEntry = {
 id: string;
 keywords: string[];
 question: string;
 answers: string[];
 tags: string[];
 followUp?: string[];
 action?: KittyAction;
};

const KNOWLEDGE: KnowledgeEntry[] = [

 // ── Navigation & UI-Hilfe ───────────────────────────────────────────────────
 {
 id: 'navigate-buchungen',
 keywords: ['buchungen', 'navigate', 'navigieren', 'finden', 'öffnen', 'gehen', 'seite', 'menu', 'menü'],
 question: 'Wie navigiere ich zu Buchungen?',
 answers: [
 'Klicke im Menü auf **"Buchungen"** – ich habe es gerade für dich markiert. ',
 ],
 tags: ['navigation'],
 action: { type: 'highlight', targetId: 'nav-buchungen' },
 followUp: ['Neue Buchung erfassen', 'Wie erfasse ich eine Buchung?'],
 },
 {
 id: 'navigate-neue-buchung',
 keywords: ['neue', 'buchung', 'erfassen', 'erstellen', 'button', 'knopf', 'hinzufügen', 'hinzufüg'],
 question: 'Wo ist der Button für neue Buchungen?',
 answers: [
 'Klicke auf **"Neue Buchung"** – ich zeige dir wo. ',
 ],
 tags: ['navigation', 'buchung'],
 action: { type: 'highlight', targetId: 'btn-neue-buchung' },
 followUp: ['Büromaterial buchen', 'Kundenrechnung erfassen'],
 },
 {
 id: 'navigate-bilanz',
 keywords: ['bilanz', 'navigier', 'öffn', 'finden', 'gehen', 'zeig'],
 question: 'Wo finde ich die Bilanz?',
 answers: [
 'Die **Bilanz** findest du im Menü – ich markiere sie für dich. ',
 ],
 tags: ['navigation', 'bilanz'],
 action: { type: 'highlight', targetId: 'nav-bilanz' },
 },

 // ── Buchungsvorschläge ─────────────────────────────────────────────────────
 {
 id: 'suggest-buromaterial',
 keywords: ['büromaterial', 'bürobedarf', 'papier', 'drucker', 'toner', 'stift', 'büro', 'material', 'kaufen', 'einkauf', 'vorschlag', 'suggest'],
 question: 'Büromaterial kaufen – Buchungsvorschlag',
 answers: [
 'Ich habe einen Buchungsvorschlag für Büromaterial vorbereitet. Du kannst ihn direkt anpassen und erfassen:',
 ],
 tags: ['buchung', 'vorschlag', 'aufwand'],
 action: {
 type: 'booking',
 suggestion: {
 description: 'Büromaterial',
 account: '6500 Büroaufwand',
 contraAccount: '1020 Bankkonto',
 type: 'Ausgabe',
 paymentStatus: 'Bezahlt',
 vatRate: 8.1,
 },
 },
 followUp: ['Büromaterial auf Rechnung buchen', 'Wie buche ich eine Ausgabe?'],
 },
 {
 id: 'suggest-buromaterial-rechnung',
 keywords: ['büromaterial', 'auf', 'rechnung', 'kreditor', 'offen', 'noch', 'bezahlen', 'schulden'],
 question: 'Büromaterial auf Rechnung buchen',
 answers: [
 'Büromaterial auf Rechnung (noch nicht bezahlt) – hier der Vorschlag:',
 ],
 tags: ['buchung', 'vorschlag', 'aufwand'],
 action: {
 type: 'booking',
 suggestion: {
 description: 'Büromaterial (Rechnung)',
 account: '6500 Büroaufwand',
 contraAccount: '2000 VLL Kreditoren',
 type: 'Ausgabe',
 paymentStatus: 'Offen',
 vatRate: 8.1,
 },
 },
 },
 {
 id: 'suggest-miete',
 keywords: ['miete', 'mietzins', 'miete', 'buchen', 'zahlen', 'büro', 'lokal', 'raumaufwand', 'vorschlag'],
 question: 'Monatsmiete buchen – Buchungsvorschlag',
 answers: [
 'Hier der Buchungsvorschlag für die Monatsmiete – Betrag bitte anpassen:',
 ],
 tags: ['buchung', 'vorschlag', 'aufwand'],
 action: {
 type: 'booking',
 suggestion: {
 description: 'Monatsmiete',
 account: '6000 Raumaufwand',
 contraAccount: '1020 Bankkonto',
 type: 'Ausgabe',
 paymentStatus: 'Bezahlt',
 vatRate: 0,
 },
 },
 followUp: ['Wie buche ich Nebenkosten?', 'Welches Konto für Versicherungen?'],
 },
 {
 id: 'suggest-kundenrechnung',
 keywords: ['kundenrechnung', 'rechnung', 'stellen', 'ausstellen', 'debitor', 'kunde', 'einnahme', 'erlös', 'faktura', 'vorschlag'],
 question: 'Kundenrechnung stellen – Buchungsvorschlag',
 answers: [
 'Kundenrechnung gestellt (Zahlung noch ausstehend) – hier der Vorschlag:',
 ],
 tags: ['buchung', 'vorschlag', 'einnahme'],
 action: {
 type: 'booking',
 suggestion: {
 description: 'Dienstleistung / Rechnung',
 account: '1100 Debitoren',
 contraAccount: '3000 Erlöse aus Lieferungen',
 type: 'Einnahme',
 paymentStatus: 'Offen',
 vatRate: 8.1,
 },
 },
 followUp: ['Kundenzahlung eingegangen – Buchungsvorschlag', 'Was ist ein Debitor?'],
 },
 {
 id: 'suggest-kundenzahlung',
 keywords: ['kundenzahlung', 'zahlung', 'eingegangen', 'erhalten', 'bankeingang', 'zahlt', 'einnahme', 'direkt', 'sofort', 'bar'],
 question: 'Kundenzahlung eingegangen – Buchungsvorschlag',
 answers: [
 'Zahlung direkt auf Bank eingegangen – hier der Vorschlag:',
 ],
 tags: ['buchung', 'vorschlag', 'einnahme'],
 action: {
 type: 'booking',
 suggestion: {
 description: 'Kundenzahlung',
 account: '1020 Bankkonto',
 contraAccount: '3000 Erlöse aus Lieferungen',
 type: 'Einnahme',
 paymentStatus: 'Bezahlt',
 vatRate: 8.1,
 },
 },
 },
 {
 id: 'suggest-telefon',
 keywords: ['telefon', 'handy', 'mobile', 'swisscom', 'salt', 'sunrise', 'internet', 'telekomrechnung', 'telekommunikation'],
 question: 'Telefonrechnung buchen – Buchungsvorschlag',
 answers: [
 'Telefon-/Internetrechnung – hier der Vorschlag:',
 ],
 tags: ['buchung', 'vorschlag', 'aufwand'],
 action: {
 type: 'booking',
 suggestion: {
 description: 'Telefon / Internet',
 account: '6550 Telekommunikation',
 contraAccount: '1020 Bankkonto',
 type: 'Ausgabe',
 paymentStatus: 'Bezahlt',
 vatRate: 8.1,
 },
 },
 },
 {
 id: 'suggest-reisekosten',
 keywords: ['reise', 'reisekosten', 'benzin', 'zug', 'bahn', 'fahrt', 'fahrtkosten', 'spesen', 'auto'],
 question: 'Reisekosten / Benzin buchen – Buchungsvorschlag',
 answers: [
 'Reisekosten oder Benzin – hier der Vorschlag:',
 ],
 tags: ['buchung', 'vorschlag', 'aufwand'],
 action: {
 type: 'booking',
 suggestion: {
 description: 'Reisekosten',
 account: '6200 Reise- und Fahrzeugaufwand',
 contraAccount: '1000 Kasse',
 type: 'Ausgabe',
 paymentStatus: 'Bezahlt',
 vatRate: 8.1,
 },
 },
 },
 {
 id: 'suggest-privateinlage',
 keywords: ['privateinlage', 'einlage', 'eigenkapital', 'einbring', 'privates', 'kapital', 'startkapital'],
 question: 'Privateinlage buchen – Buchungsvorschlag',
 answers: [
 'Privateinlage ins Unternehmen – hier der Vorschlag:',
 ],
 tags: ['buchung', 'vorschlag', 'eigenkapital'],
 action: {
 type: 'booking',
 suggestion: {
 description: 'Privateinlage',
 account: '1020 Bankkonto',
 contraAccount: '2800 Eigenkapital',
 type: 'Einnahme',
 paymentStatus: 'Bezahlt',
 vatRate: 0,
 },
 },
 },


 {
 id: 'greeting',
 keywords: ['hallo', 'hi', 'hey', 'guten', 'morgen', 'abend', 'servus', 'grüezi', 'bonjour', 'ciao', 'moin', 'salut'],
 question: 'Hallo!',
 answers: [
 'Hallo! Ich bin Kitty, dein Bookitty-Assistent. Frag mich alles zu Buchhaltung, MwSt oder Bookitty-Funktionen.',
 'Hey! Was möchtest du über Bookitty oder Schweizer Buchhaltung wissen?',
 'Grüezi! Wie kann ich dir heute helfen?',
 ],
 tags: ['greeting'],
 followUp: ['Wie erfasse ich eine Einnahme?', 'Was ist doppelte Buchhaltung?', 'Welche MwSt-Sätze gibt es?'],
 },
 {
 id: 'danke',
 keywords: ['danke', 'merci', 'super', 'perfekt', 'toll', 'hilfreich', 'dankeschön', 'top', 'prima'],
 question: 'Danke!',
 answers: [
 'Gerne! Falls du noch weitere Fragen hast, bin ich da.',
 'Kein Problem! Einfach fragen, wenn etwas unklar ist.',
 'Freut mich! Ich helfe jederzeit wieder.',
 ],
 tags: ['greeting'],
 },
 {
 id: 'tschuss',
 keywords: ['tschüss', 'bye', 'ciao', 'aufwiedersehen', 'tschau', 'wiedersehen'],
 question: 'Tschüss!',
 answers: [
 'Tschüss! Bei Fragen bin ich jederzeit wieder da.',
 'Auf Wiedersehen! Viel Erfolg mit der Buchhaltung.',
 ],
 tags: ['greeting'],
 },

 // ── Bookitty allgemein ───────────────────────────────────────────────────────
 {
 id: 'was-ist-bookitty',
 keywords: ['bookitty', 'app', 'software', 'programm', 'tool', 'buchhaltungssoftware'],
 question: 'Was ist Bookitty?',
 answers: [
 'Bookitty ist eine **Buchhaltungssoftware für Schweizer KMU** – einfach, übersichtlich, direkt im Browser.\n\nDu kannst damit:\n- **Buchungen** erfassen und verwalten\n- **Dokumente** (Rechnungen, Belege) hochladen\n- **Bilanz** und **Erfolgsrechnung** automatisch einsehen\n\nAlles nach Schweizer KMU-Kontenrahmen. Tipp: Starte mit dem **Demo-Modus** – ohne Registrierung ausprobieren.',
 ],
 tags: ['bookitty'],
 followUp: ['Wie registriere ich mich?', 'Was kostet Bookitty?', 'Gibt es einen Demo-Modus?'],
 },
 {
 id: 'demo-modus',
 keywords: ['demo', 'test', 'ausprobieren', 'kostenlos', 'gratis', 'ohne', 'registrierung', 'anmeldung', 'beispiel'],
 question: 'Gibt es einen Demo-Modus?',
 answers: [
 'Ja! Du kannst Bookitty **ohne Registrierung** im Demo-Modus testen.\n\nDer Demo enthält Beispieldaten – Buchungen, Bilanz, Erfolgsrechnung sind bereits befüllt, sodass du sofort siehst, wie alles aussieht.\n\nFür eigene Daten brauchst du ein Konto – die Registrierung dauert unter 1 Minute.',
 ],
 tags: ['bookitty', 'demo'],
 followUp: ['Wie registriere ich mich?'],
 },
 {
 id: 'registrierung',
 keywords: ['registrier', 'anmeld', 'konto', 'account', 'erstell', 'signup', 'register', 'neu'],
 question: 'Wie registriere ich mich?',
 answers: [
 'Registrierung bei Bookitty:\n\n1. Klicke auf **"Registrieren"** auf der Startseite\n2. Gib **Name, E-Mail und Passwort** ein\n3. Fertig – du kannst sofort loslegen!\n\nKeine Kreditkarte, keine versteckten Kosten.',
 ],
 tags: ['bookitty', 'account'],
 followUp: ['Was kostet Bookitty?', 'Wie erfasse ich meine erste Buchung?'],
 },
 {
 id: 'kosten',
 keywords: ['kost', 'preis', 'bezahl', 'abo', 'kostenlos', 'plan', 'tarif', 'chf', 'franken', 'zahlen'],
 question: 'Was kostet Bookitty?',
 answers: [
 'Bookitty ist aktuell **kostenlos** nutzbar! \n\nIn Zukunft sind Premium-Funktionen geplant (Lohnbuchhaltung, automatische Mahnungen) – der Basis-Plan für Kleinunternehmen bleibt erschwinglich.\n\nJetzt kostenlos starten und von Anfang an dabei sein.',
 ],
 tags: ['bookitty', 'kosten'],
 },
 {
 id: 'passwort-aendern',
 keywords: ['passwort', 'password', 'kennwort', 'ändern', 'vergessen', 'reset', 'einstellung', 'sicherheit'],
 question: 'Wie ändere ich mein Passwort?',
 answers: [
 'Passwort ändern:\n\n1. Gehe zu **Einstellungen** (Zahnrad-Icon)\n2. Klicke auf **"Passwort ändern"**\n3. Altes und neues Passwort eingeben → Bestätigen\n\nPasswort vergessen? Nutze den **"Passwort vergessen"**-Link auf der Login-Seite.',
 ],
 tags: ['account', 'einstellungen'],
 },

 // ── Buchungen ────────────────────────────────────────────────────────────────
 {
 id: 'buchung-erfassen',
 keywords: ['buchung', 'erfassen', 'neu', 'erstell', 'hinzufüg', 'eintrag', 'buchen', 'neue'],
 question: 'Wie erfasse ich eine Buchung?',
 answers: [
 'Neue Buchung in 4 Schritten:\n\n1. **Buchungen** im Menü → **"Neue Buchung"**\n2. **Datum & Beschreibung** eintragen\n3. **Betrag**, **Soll-Konto** und **Haben-Konto** auswählen\n4. **MwSt-Satz** prüfen (Standard: 8.1 %) → **Speichern**\n\nDu kannst direkt einen Beleg (PDF/Foto) anhängen.',
 'Unter **Buchungen → Neue Buchung** findest du das Formular.\n\nDu brauchst: Datum, Beschreibung, Betrag in CHF, Soll- und Habenkonto sowie den MwSt-Satz. Belege kannst du direkt hochladen. ',
 ],
 tags: ['buchung'],
 followUp: ['Welches Konto für Einnahmen?', 'Wie buche ich die MwSt?', 'Wie lösche ich eine Buchung?'],
 },
 {
 id: 'buchung-bearbeiten',
 keywords: ['bearbeiten', 'ändern', 'korrigier', 'edit', 'anpass', 'falsch', 'fehler', 'korrektur'],
 question: 'Wie ändere ich eine bestehende Buchung?',
 answers: [
 'Buchung bearbeiten:\n\n1. **Buchungen** öffnen\n2. Gewünschte Buchung anklicken\n3. Felder anpassen → **Speichern**\n\nIn der Praxis ist es sauberer, Fehler mit einer **Gegenbuchung** zu korrigieren – besonders nach dem Jahresabschluss.',
 ],
 tags: ['buchung'],
 },
 {
 id: 'buchung-loeschen',
 keywords: ['lösch', 'entfern', 'delete', 'weg', 'rückgängig', 'stornieren', 'löschen'],
 question: 'Wie lösche ich eine Buchung?',
 answers: [
 'Buchung löschen:\n\n1. Buchung öffnen\n2. Auf das **Löschen-Symbol** () klicken\n3. Bestätigen\n\n Gelöschte Buchungen können nicht wiederhergestellt werden. Bei abgeschlossenen Perioden lieber mit einer **Korrekturbuchung** arbeiten.',
 ],
 tags: ['buchung'],
 },
 {
 id: 'dokument-hochladen',
 keywords: ['dokument', 'hochladen', 'datei', 'pdf', 'bild', 'foto', 'beleg', 'anhang', 'upload', 'scan', 'rechnung'],
 question: 'Wie lade ich ein Dokument hoch?',
 answers: [
 'Belege hochladen geht auf zwei Wegen:\n\n**Bei einer Buchung:**\n→ Buchung öffnen → Symbol → Datei auswählen → Speichern\n\n**Im Dokumenten-Bereich:**\n→ Menü **"Dokumente"** → **"Hochladen"** → Datei wählen\n\n Unterstützte Formate: PDF, JPG, PNG, GIF, WebP, TIFF',
 ],
 tags: ['dokument'],
 followUp: ['Wie verknüpfe ich ein Dokument mit einer Buchung?'],
 },
 {
 id: 'bilanz-anzeigen',
 keywords: ['bilanz', 'anzeig', 'öffn', 'finden', 'seite', 'bericht', 'wo', 'navigation'],
 question: 'Wo finde ich die Bilanz?',
 answers: [
 'Die Bilanz findest du im Menü unter **"Bilanz"** – oder direkt auf dem Dashboard.\n\nSie zeigt:\n- **Aktiven** (links): Was das Unternehmen besitzt\n- **Passiven** (rechts): Verbindlichkeiten + Eigenkapital\n\nBookitty berechnet die Bilanz **automatisch** aus allen Buchungen – immer aktuell.',
 ],
 tags: ['bilanz', 'navigation'],
 followUp: ['Was sind Aktiven und Passiven?', 'Was ist der Unterschied zur Erfolgsrechnung?'],
 },

 // ── Buchhaltungsgrundlagen ───────────────────────────────────────────────────
 {
 id: 'erste-schritte',
 keywords: ['anfangen', 'beginnen', 'start', 'erste', 'schritte', 'einstieg', 'neu', 'starten'],
 question: 'Wie fange ich mit der Buchhaltung an?',
 answers: [
 'So startest du mit Bookitty:\n\n1. **Konto erstellen** (falls noch nicht)\n2. **Eröffnungsbilanz** erfassen – was besitzt dein Unternehmen zum Start?\n3. **Laufende Buchungen** erfassen (Einnahmen, Ausgaben mit Belegen)\n4. **Bilanz und Erfolgsrechnung** jederzeit einsehen\n\nWichtig: Fang sofort an und lade alle Belege hoch. Rückwirkend buchen ist mühsam!',
 ],
 tags: ['start', 'bookitty'],
 followUp: ['Wie erfasse ich eine Buchung?', 'Was ist doppelte Buchhaltung?'],
 },
 {
 id: 'doppelte-buchhaltung',
 keywords: ['doppelte', 'buchhaltung', 'prinzip', 'system', 'funktioniert', 'erkläre', 'zweimal'],
 question: 'Was ist doppelte Buchhaltung?',
 answers: [
 'Bei der **doppelten Buchhaltung** wird jede Transaktion **zweimal** erfasst – einmal auf der Soll-Seite und einmal auf der Haben-Seite.\n\n**Beispiel – Büromaterial CHF 100.–:**\n- Soll: **6500 Büroaufwand** CHF 100.–\n- Haben: **1020 Bank** CHF 100.–\n\nBeide Seiten sind immer gleich gross – das Buch bleibt immer "ausgeglichen".\n\nBookitty führt das Doppelprinzip automatisch durch – du gibst einfach Soll- und Habenkonto an.',
 'Jede Buchung berührt **zwei Konten gleichzeitig**:\n1. **Soll-Konto** (wo das Geld hingeht)\n2. **Haben-Konto** (wo es herkommt)\n\nBeide Seiten gleichen sich immer aus – so bleiben Bilanz und Erfolgsrechnung automatisch korrekt.',
 ],
 tags: ['buchhaltung-grundlagen'],
 followUp: ['Was bedeutet Soll und Haben?', 'Wie ist der Kontenrahmen aufgebaut?'],
 },
 {
 id: 'soll-haben',
 keywords: ['soll', 'haben', 'seite', 'unterschied', 'bedeutung', 'links', 'rechts', 'debit', 'kredit'],
 question: 'Was bedeutet Soll und Haben?',
 answers: [
 '**Soll** und **Haben** sind die zwei Seiten jeder Buchung:\n\n| Kontoart | Soll (links) | Haben (rechts) |\n|---|---|---|\n| **Aktiven** (1xxx) | Zunahme ↑ | Abnahme ↓ |\n| **Passiven** (2xxx) | Abnahme ↓ | Zunahme ↑ |\n| **Ertrag** (3xxx) | Abnahme ↓ | Zunahme ↑ |\n| **Aufwand** (4–8xxx) | Zunahme ↑ | Abnahme ↓ |\n\n**Beispiel Einnahme (Bank-Eingang):**\n- Soll 1020 Bank ↑\n- Haben 3000 Erlöse ↑\n\nMerkregel: Aktiven und Aufwand wachsen im **Soll**, Passiven und Ertrag im **Haben**.',
 ],
 tags: ['buchhaltung-grundlagen'],
 followUp: ['Wie buche ich eine Einnahme?', 'Wie ist der Kontenrahmen aufgebaut?'],
 },
 {
 id: 'kontenrahmen',
 keywords: ['kontenrahmen', 'kontenklassen', 'klassen', 'nummer', 'konto', 'kmu', 'plan', 'aufbau'],
 question: 'Wie ist der Schweizer KMU-Kontenrahmen aufgebaut?',
 answers: [
 'Der **Schweizer KMU-Kontenrahmen** hat 8 Hauptklassen:\n\n| Klasse | Bereich | Beispiel |\n|---|---|---|\n| **1xxx** | Aktiven | 1020 Bank, 1100 Debitoren |\n| **2xxx** | Passiven | 2000 Kreditoren, 2100 Darlehen |\n| **3xxx** | Betriebsertrag | 3000 Erlöse |\n| **4xxx** | Material/Waren | 4000 Warenaufwand |\n| **5xxx** | Personalaufwand | 5000 Löhne |\n| **6xxx** | Übriger Aufwand | 6000 Miete, 6500 Büro |\n| **7xxx** | Finanz-/Nebenerfolg | 7000 Finanzertrag |\n| **8xxx** | Betriebsfremd | 8000 Ausserordentliches |\n\nBookitty verwendet diesen Kontenrahmen direkt.',
 ],
 tags: ['buchhaltung-grundlagen', 'konten'],
 followUp: ['Was bedeutet Soll und Haben?', 'Welches Konto für Miete?'],
 },
 {
 id: 'debitor',
 keywords: ['debitor', 'forderung', 'ausstehend', 'kundenschuld', 'kunden', 'offene'],
 question: 'Was ist ein Debitor?',
 answers: [
 'Ein **Debitor** ist ein Kunde, der dir noch Geld schuldet – eine **offene Forderung**.\n\n**Beispiel:** Du stellst eine Rechnung über CHF 500.–.\n- Bei Rechnungsstellung: Soll **1100 Debitoren** / Haben **3000 Erlöse**\n- Bei Zahlungseingang: Soll **1020 Bank** / Haben **1100 Debitoren**\n\nDebitoren sind **Aktiven** (1xxx) – sie erhöhen dein Vermögen.',
 ],
 tags: ['buchhaltung-grundlagen'],
 followUp: ['Was ist ein Kreditor?', 'Wie buche ich eine Einnahme?'],
 },
 {
 id: 'kreditor',
 keywords: ['kreditor', 'lieferant', 'verbindlichkeit', 'schuld', 'schulden', 'offene', 'zahlen'],
 question: 'Was ist ein Kreditor?',
 answers: [
 'Ein **Kreditor** ist ein Lieferant oder Dienstleister, dem du noch Geld schuldest – eine **offene Verbindlichkeit**.\n\n**Beispiel:** Du erhältst eine Rechnung vom Vermieter über CHF 2\'000.–.\n- Bei Rechnungserhalt: Soll **6000 Raumaufwand** / Haben **2000 Kreditoren**\n- Bei Zahlung: Soll **2000 Kreditoren** / Haben **1020 Bank**\n\nKreditoren sind **Passiven** (2xxx) – sie erhöhen deine Verbindlichkeiten.',
 ],
 tags: ['buchhaltung-grundlagen'],
 followUp: ['Was ist ein Debitor?', 'Wie buche ich eine Ausgabe?'],
 },
 {
 id: 'bank-vs-kasse',
 keywords: ['bank', 'kasse', 'unterschied', 'bar', 'bargeld', 'überweisung', 'konto'],
 question: 'Was ist der Unterschied zwischen Kasse und Bank?',
 answers: [
 '**1000 Kasse** = physisches Bargeld\n- Barzahlungen, Bareinnahmen\n\n**1020 Bankkonto** = Geld auf dem Geschäftskonto\n- Überweisungen, Kartenzahlungen, TWINT\n\nTipp: Wenn möglich alles über die Bank – sauberer, leichter kontrollierbar und revisionsfreundlicher.',
 ],
 tags: ['konten', 'buchung'],
 },

 // ── MwSt ────────────────────────────────────────────────────────────────────
 {
 id: 'mwst-saetze',
 keywords: ['mwst', 'mehrwertsteuer', 'satz', 'prozent', 'normal', 'reduziert', 'sonder', 'schweiz', 'sätze'],
 question: 'Welche MwSt-Sätze gibt es in der Schweiz?',
 answers: [
 'Die Schweiz hat **drei MwSt-Sätze** (Stand 2024):\n\n| Satz | Bereich |\n|---|---|\n| **8.1 %** | Normalsatz – die meisten Waren & Dienstleistungen |\n| **3.8 %** | Sondersatz – Beherbergung (Hotels) |\n| **2.6 %** | Reduzierter Satz – Lebensmittel, Bücher, Medikamente |\n\nBookitty verwendet standardmässig **8.1 %** – du kannst den Satz pro Buchung anpassen.',
 ],
 tags: ['mwst'],
 followUp: ['Ab wann bin ich MwSt-pflichtig?', 'Wie buche ich die MwSt?'],
 },
 {
 id: 'mwst-pflichtig',
 keywords: ['pflichtig', 'pflicht', 'anmeld', 'registrier', 'umsatz', 'grenze', 'wann', 'muss', '100000'],
 question: 'Ab wann bin ich MwSt-pflichtig?',
 answers: [
 'MwSt-Pflicht in der Schweiz ab einem **Jahresumsatz von CHF 100\'000.–**.\n\nUnter dieser Grenze ist die Anmeldung freiwillig. Eine freiwillige Anmeldung lohnt sich, wenn du viel **Vorsteuer** (MwSt auf Einkäufe) zurückfordern kannst.\n\n Das ist steuerrechtlich komplex – lass dich von einem **Treuhänder** beraten.',
 ],
 tags: ['mwst'],
 followUp: ['Was ist Vorsteuer?', 'Welche MwSt-Sätze gibt es?'],
 },
 {
 id: 'mwst-buchen',
 keywords: ['mwst', 'buchen', 'wie', 'berechnen', 'inkl', 'exkl', 'brutto', 'netto', 'erfassen'],
 question: 'Wie buche ich die MwSt?',
 answers: [
 'In Bookitty ist die MwSt-Buchung integriert:\n\n1. MwSt-Satz pro Buchung auswählen (8.1 %, 3.8 % oder 2.6 %)\n2. Bookitty berechnet den MwSt-Betrag **automatisch**\n3. Wähle ob Betrag **inkl. oder exkl. MwSt**\n\n**Typische Konten:**\n- Ausgangs-MwSt (Einnahmen): **2200 Mehrwertsteuer**\n- Vorsteuer (Ausgaben): **1170 Vorsteuer**\n\nTipp: Arbeite mit **Nettobeträgen (exkl. MwSt)** – übersichtlicher.',
 ],
 tags: ['mwst', 'buchung'],
 followUp: ['Was ist Vorsteuer?', 'Welche MwSt-Sätze gibt es?'],
 },
 {
 id: 'vorsteuer',
 keywords: ['vorsteuer', 'abzieh', 'rückfordern', 'input', 'zurück', 'abzug'],
 question: 'Was ist Vorsteuer?',
 answers: [
 '**Vorsteuer** ist die MwSt, die du beim Einkaufen selbst bezahlst.\n\n**Beispiel:** Laptop CHF 1\'000.– inkl. 8.1 % MwSt\n- Netto: CHF 924.70\n- Vorsteuer: CHF 75.30 → Konto **1170 Vorsteuer**\n\nBist du MwSt-pflichtig, kannst du diese CHF 75.30 von deiner MwSt-Abrechnung **abziehen**. Du zahlst nur die Differenz zwischen eingenommener und bezahlter MwSt.',
 ],
 tags: ['mwst'],
 },

 // ── Typische Buchungen ───────────────────────────────────────────────────────
 {
 id: 'einnahme-buchen',
 keywords: ['einnahme', 'erlös', 'umsatz', 'verkauf', 'ertrag', 'einnehmen', 'gutschrift', 'eingenommen'],
 question: 'Wie buche ich eine Einnahme?',
 answers: [
 '**Direkte Zahlung (Bar/Bank):**\n- Soll: **1020 Bank** (oder 1000 Kasse)\n- Haben: **3000 Erlöse**\n\n**Auf Rechnung (Debitor):**\n1. Rechnungsstellung: Soll **1100 Debitoren** / Haben **3000 Erlöse**\n2. Zahlungseingang: Soll **1020 Bank** / Haben **1100 Debitoren**\n\nMwSt-pflichtig? Satz wählen (meist 8.1 %) – Bookitty berechnet den Rest automatisch.',
 ],
 tags: ['buchung', 'einnahme'],
 followUp: ['Wie buche ich eine Ausgabe?', 'Was ist ein Debitor?'],
 },
 {
 id: 'ausgabe-buchen',
 keywords: ['ausgabe', 'aufwand', 'kosten', 'bezahl', 'einkauf', 'ausgeben', 'lieferantenrechnung'],
 question: 'Wie buche ich eine Ausgabe?',
 answers: [
 '**Direkte Zahlung:**\n- Soll: Aufwandskonto (z. B. **6000 Miete**, **4000 Warenaufwand**)\n- Haben: **1020 Bank** (oder 1000 Kasse)\n\n**Auf Rechnung (Kreditor):**\n1. Rechnungserhalt: Soll Aufwand / Haben **2000 Kreditoren**\n2. Zahlung: Soll **2000 Kreditoren** / Haben **1020 Bank**\n\nWähle das Aufwandskonto je nach Art der Ausgabe.',
 ],
 tags: ['buchung', 'ausgabe'],
 followUp: ['Welches Konto für Miete?', 'Welches Konto für Büromaterial?'],
 },
 {
 id: 'miete-buchen',
 keywords: ['miete', 'mietzins', 'raumaufwand', 'büro', 'lokal', 'mietkosten', 'vermieter'],
 question: 'Welches Konto für Miete?',
 answers: [
 'Miete kommt auf **Konto 6000 Raumaufwand**:\n\n**Monatliche Miete CHF 2\'000.–:**\n- Soll: **6000 Raumaufwand** CHF 2\'000.–\n- Haben: **1020 Bank** CHF 2\'000.–\n\nAuf Rechnung:\n1. Soll 6000 / Haben **2000 Kreditoren**\n2. Bei Zahlung: Soll 2000 / Haben 1020\n\nNebenkosten (Strom, Heizung) ebenfalls auf 6000 oder **6010 Nebenkosten**.',
 ],
 tags: ['buchung', 'aufwand'],
 followUp: ['Welches Konto für Versicherungen?', 'Wie buche ich eine Ausgabe?'],
 },
 {
 id: 'lohn-buchen',
 keywords: ['lohn', 'gehalt', 'personalaufwand', 'mitarbeiter', 'angestellte', 'ahv', 'löhne', 'personal'],
 question: 'Wie buche ich Löhne?',
 answers: [
 'Löhne auf **Konto 5000 Personalaufwand**:\n\n**Bruttolohn CHF 5\'000.–:**\n- Soll: **5000 Löhne** CHF 5\'000.–\n- Haben: **1020 Bank** (Nettolohn) + **2050 Sozialversicherungen** (AHV/ALV/UVG)\n\n Lohnbuchhaltung ist komplex. Für AHV, UVG, Quellensteuer empfehle ich einen **Treuhänder**.\n\n Lohnbuchhaltung ist als **zukünftiges Feature** in Bookitty geplant.',
 ],
 tags: ['buchung', 'personalaufwand'],
 followUp: ['Wann kommt Lohnbuchhaltung in Bookitty?', 'Wann brauche ich einen Treuhänder?'],
 },
 {
 id: 'privateinlage',
 keywords: ['privateinlage', 'einlage', 'eigenkapital', 'eigenes', 'geld', 'einbringen', 'privat'],
 question: 'Wie buche ich eine Privateinlage?',
 answers: [
 '**Privateinlage** = Geld, das du als Inhaber aus dem Privatvermögen ins Unternehmen einbringst:\n\n- Soll: **1020 Bank** CHF X\n- Haben: **2800 Eigenkapital** CHF X\n\n**Beispiel:** CHF 10\'000.– vom Privatkonto auf das Geschäftskonto überweisen → Soll 1020 / Haben 2800 CHF 10\'000.–',
 ],
 tags: ['buchung', 'eigenkapital'],
 followUp: ['Was ist ein Privatbezug?'],
 },
 {
 id: 'privatbezug',
 keywords: ['privatbezug', 'entnahme', 'privat', 'bezug', 'entnehmen', 'privates'],
 question: 'Wie buche ich einen Privatbezug?',
 answers: [
 '**Privatbezug** = Geld, das du für private Zwecke aus dem Unternehmen nimmst:\n\n- Soll: **2860 Privatkonto** CHF X\n- Haben: **1020 Bank** CHF X\n\nAm Jahresende wird das Privatkonto mit dem Eigenkapital verrechnet.\n\nTrenne Privat- und Geschäftstransaktionen konsequent – sauberere Buchhaltung, weniger Aufwand beim Jahresabschluss.',
 ],
 tags: ['buchung', 'eigenkapital'],
 },
 {
 id: 'abschreibung',
 keywords: ['abschreibung', 'abschreiben', 'wertminderung', 'anlage', 'maschine', 'fahrzeug', 'afa', 'abnutzung'],
 question: 'Wie buche ich eine Abschreibung?',
 answers: [
 '**Abschreibungen** verteilen die Kosten eines Anlageguts über mehrere Jahre:\n\n**Laptop CHF 1\'200.– über 3 Jahre (CHF 400.–/Jahr):**\n- Soll: **6800 Abschreibungen** CHF 400.–\n- Haben: **1530 EDV/IT-Anlagen** CHF 400.–\n\n**Typische Nutzungsdauern:**\n- IT/EDV: 3–5 Jahre\n- Fahrzeuge: 5 Jahre\n- Mobiliar: 8–10 Jahre\n\nDie steuerlich anerkannten Sätze klärst du mit deinem Treuhänder.',
 ],
 tags: ['buchung', 'anlagen'],
 },
 {
 id: 'versicherung-konto',
 keywords: ['versicherung', 'haftpflicht', 'unfall', 'prämie', 'police', 'sachversicherung'],
 question: 'Welches Konto für Versicherungen?',
 answers: [
 'Versicherungsprämien auf **Konto 6300 Versicherungsaufwand**:\n\n- Soll: **6300 Versicherungsaufwand**\n- Haben: **1020 Bank**\n\nAusnahme: **Sozialversicherungen** für Mitarbeiter (AHV, UVG) → **5700–5799 Sozialversicherungsaufwand**.',
 ],
 tags: ['buchung', 'aufwand'],
 },
 {
 id: 'buromaterial-konto',
 keywords: ['büromaterial', 'bürobedarf', 'material', 'papier', 'drucker', 'verbrauch', 'stift', 'büro'],
 question: 'Welches Konto für Büromaterial?',
 answers: [
 'Büromaterial kommt auf **Konto 6500 Büroaufwand**:\n\n- Soll: **6500 Büroaufwand** CHF X\n- Haben: **1000 Kasse** oder **1020 Bank** CHF X\n\nKleine Einkäufe (< CHF 500.–) direkt als Aufwand buchen – keine Aktivierung nötig.',
 ],
 tags: ['buchung', 'aufwand'],
 },
 {
 id: 'computer-konto',
 keywords: ['computer', 'laptop', 'it', 'software', 'lizenz', 'abo', 'hardware', 'telefon', 'edv'],
 question: 'Welches Konto für IT / Computer?',
 answers: [
 'IT-Kosten je nach Art:\n\n| Art | Konto |\n|---|---|\n| Kleingeräte (< CHF 1\'000.–) | 6540 IT-Aufwand |\n| Grosse Geräte (> CHF 1\'000.–) | 1530 EDV-Anlagen (aktivieren) |\n| Software-Abos | 6540 IT-Aufwand |\n| Telefon/Internet | 6550 Telekommunikation |\n\nFaustregel: Unter CHF 1\'000.– direkt als Aufwand, darüber aktivieren und abschreiben.',
 ],
 tags: ['buchung', 'aufwand'],
 },

 // ── Bilanz & Erfolgsrechnung ─────────────────────────────────────────────────
 {
 id: 'was-ist-bilanz',
 keywords: ['bilanz', 'erkläre', 'bedeutung', 'inhalt', 'zeigt', 'was'],
 question: 'Was ist eine Bilanz?',
 answers: [
 'Die **Bilanz** ist eine Momentaufnahme der finanziellen Lage deines Unternehmens an einem Stichtag (meist 31. Dezember).\n\n**Aktiven (links):** Was das Unternehmen besitzt\n- Umlaufvermögen (Bank, Kasse, Debitoren)\n- Anlagevermögen (Maschinen, IT, Fahrzeuge)\n\n**Passiven (rechts):** Wie es finanziert wurde\n- Fremdkapital (Kreditoren, Bankdarlehen)\n- Eigenkapital (Einlagen + Gewinn)\n\nAktiven = Passiven immer – daher "Balance".',
 ],
 tags: ['bilanz', 'berichte'],
 followUp: ['Was sind Aktiven und Passiven?', 'Was ist der Unterschied zur Erfolgsrechnung?'],
 },
 {
 id: 'aktiven-passiven',
 keywords: ['aktiven', 'passiven', 'vermögen', 'kapital', 'unterschied', 'umlaufvermögen', 'anlagevermögen'],
 question: 'Was sind Aktiven und Passiven?',
 answers: [
 '**Aktiven** = Was das Unternehmen **besitzt oder fordert** (Konten 1xxx)\n- Bank, Kasse, Debitoren\n- Waren, Maschinen, Fahrzeuge\n\n**Passiven** = Wie das Vermögen **finanziert wurde** (Konten 2xxx)\n- Fremdkapital: Kreditoren, Bankdarlehen\n- Eigenkapital: Einlagen, Gewinnvortrag\n\n**Merkregel:** Aktiven = Passiven – immer, überall.',
 ],
 tags: ['bilanz', 'buchhaltung-grundlagen'],
 },
 {
 id: 'erfolgsrechnung',
 keywords: ['erfolgsrechnung', 'gewinn', 'verlust', 'ertrag', 'aufwand', 'guv', 'ergebnis', 'pnl'],
 question: 'Was ist die Erfolgsrechnung?',
 answers: [
 'Die **Erfolgsrechnung** zeigt, ob dein Unternehmen in einer Periode **Gewinn oder Verlust** gemacht hat.\n\n**Ertrag** (Konten 3xxx): Einnahmen aus Lieferungen und Leistungen\n\n**Aufwand** (Konten 4xxx–8xxx): Miete, Löhne, Material, etc.\n\n**Ergebnis:** Ertrag − Aufwand = **Gewinn** (oder Verlust)\n\nBookitty berechnet die Erfolgsrechnung automatisch aus deinen Buchungen.',
 ],
 tags: ['erfolgsrechnung', 'berichte'],
 followUp: ['Was ist der Unterschied zur Bilanz?', 'Was ist eine Bilanz?'],
 },
 {
 id: 'bilanz-vs-erfolgsrechnung',
 keywords: ['unterschied', 'bilanz', 'erfolgsrechnung', 'vergleich', 'versus', 'gegensatz'],
 question: 'Was ist der Unterschied zwischen Bilanz und Erfolgsrechnung?',
 answers: [
 'Beide sind wichtige Abschlussdokumente – sie zeigen aber verschiedene Dinge:\n\n**Bilanz (Stichtagsperspektive):**\n- Snapshot am Jahresende\n- Frage: Was hat das Unternehmen? Was schuldet es?\n- Aktiven = Passiven\n\n**Erfolgsrechnung (Periodenperspektive):**\n- Zeitraum (z. B. ganzes Jahr)\n- Frage: Wie viel wurde verdient / ausgegeben?\n- Ertrag − Aufwand = Gewinn/Verlust\n\nDer Gewinn aus der Erfolgsrechnung fliesst als Eigenkapital in die Bilanz.',
 ],
 tags: ['bilanz', 'erfolgsrechnung'],
 },
 {
 id: 'jahresabschluss',
 keywords: ['jahresabschluss', 'abschluss', 'jahresende', 'abschliessen', 'periode', 'abschlusskonto'],
 question: 'Was passiert beim Jahresabschluss?',
 answers: [
 'Beim **Jahresabschluss** (31.12.) werden folgende Schritte gemacht:\n\n1. **Abschlussbuchungen** – Abschreibungen, Rückstellungen\n2. **Ergebnis verbuchen** – Gewinn/Verlust → Eigenkapital (2900)\n3. **Bilanz erstellen** – Stichtagsbilanz per 31.12.\n4. **Erfolgsrechnung** – Jahresergebnis\n5. **Steuern** berechnen lassen (Treuhänder)\n\nBookitty zeigt dir Bilanz und Erfolgsrechnung jederzeit aktuell – der Abschluss ist damit sehr einfach vorbereitet.',
 ],
 tags: ['jahresabschluss'],
 followUp: ['Wann brauche ich einen Treuhänder?'],
 },

 // ── Zukünftige Features ──────────────────────────────────────────────────────
 {
 id: 'lohnbuchhaltung-feature',
 keywords: ['lohnbuchhaltung', 'feature', 'geplant', 'wann', 'lohn', 'hr', 'zukunft'],
 question: 'Kommt Lohnbuchhaltung in Bookitty?',
 answers: [
 '**Lohnbuchhaltung ist in Planung** für eine zukünftige Version! \n\nGeplante Funktionen:\n- Monatliche Lohnabrechnung mit AHV/UVG/ALV\n- Automatische Lohnausweise\n- Direktanbindung an die Buchhaltung\n\nBis dahin: Löhne manuell als Buchung erfassen und einen Treuhänder für die Lohnverarbeitung nutzen.',
 ],
 tags: ['future', 'lohn'],
 followUp: ['Wie buche ich Löhne manuell?'],
 },
 {
 id: 'mahnungen-feature',
 keywords: ['mahnung', 'zahlungserinnerung', 'automatisch', 'reminder', 'überfällig', 'mahnwesen'],
 question: 'Gibt es automatische Mahnungen?',
 answers: [
 '**Automatische Mahnungen sind geplant** für eine kommende Version! \n\nGeplant:\n- Automatische Erkennung überfälliger Rechnungen\n- Mahnungen per E-Mail versenden\n- Mahngebühren automatisch berechnen\n\nAktuell: Offene Debitoren in der Buchungsübersicht sehen und manuell nachfassen.',
 ],
 tags: ['future', 'mahnungen'],
 },
 {
 id: 'steuererklaerung-feature',
 keywords: ['steuer', 'steuererklärung', 'tax', 'finanzamt', 'kanton', 'deklaration', 'steuern'],
 question: 'Hilft Bookitty bei der Steuererklärung?',
 answers: [
 'Bookitty liefert dir alle **nötigen Zahlen**:\n- Jahresgewinn aus der Erfolgsrechnung\n- Eigenkapital aus der Bilanz\n- Alle Buchungen als Nachweis\n\nDie eigentliche **Steuererklärung** ist rechtlich komplex – hier empfehle ich immer einen **Treuhänder**.\n\n Ein direkter Steuerexport ist als zukünftiges Feature geplant.',
 ],
 tags: ['steuer', 'future'],
 followUp: ['Wann brauche ich einen Treuhänder?'],
 },
 {
 id: 'export-feature',
 keywords: ['export', 'exportier', 'csv', 'excel', 'pdf', 'download', 'backup', 'daten', 'datev'],
 question: 'Kann ich meine Daten exportieren?',
 answers: [
 '**Export-Funktionen sind in Planung**! \n\nGeplant:\n- **CSV/Excel-Export** der Buchungsliste\n- **PDF-Export** von Bilanz und Erfolgsrechnung\n- **DATEV/Abacus-kompatible** Exports für Treuhänder\n\nAktuell: Dokumente direkt aus dem Dokumenten-Bereich herunterladen.',
 ],
 tags: ['future', 'export'],
 },

 // ── Hilfe & Support ──────────────────────────────────────────────────────────
 {
 id: 'was-kannst-du',
 keywords: ['kannst', 'themen', 'fähigkeiten', 'hilf', 'fragst', 'womit', 'wobei'],
 question: 'Womit kannst du mir helfen?',
 answers: [
 'Ich helfe dir bei diesen Themen:\n\n **Schweizer Buchhaltung:**\nDoppelte Buchhaltung, Kontenrahmen KMU, Soll/Haben, MwSt, Bilanz, Erfolgsrechnung\n\n **Bookitty-Funktionen:**\nBuchungen erfassen, Dokumente hochladen, Berichte, Navigation, zukünftige Features\n\n**Kontenbeispiele:**\nWelches Konto für Miete, Löhne, Büromaterial, IT, Versicherungen ...\n\n Für Steuer- oder Rechtsfragen: immer **Treuhänder** beiziehen.',
 ],
 tags: ['hilfe'],
 followUp: ['Wie erfasse ich eine Buchung?', 'Was ist doppelte Buchhaltung?'],
 },
 {
 id: 'treuhander',
 keywords: ['treuhänder', 'buchhalter', 'steuerberater', 'fachmann', 'experte', 'berater', 'wann', 'brauche'],
 question: 'Wann brauche ich einen Treuhänder?',
 answers: [
 'Ein **Treuhänder** lohnt sich besonders bei:\n\n- **Jahresabschluss** und Steuererklärung\n- **Lohnbuchhaltung** mit Mitarbeitern\n- **MwSt-Abrechnung** (vierteljährlich bei ESTV)\n- Komplexen Buchungen (Abschreibungen, Rückstellungen)\n- Wenn du dir unsicher bist\n\nBookitty und Treuhänder ergänzen sich ideal: Du buchst laufend, der Treuhänder macht den Abschluss.',
 ],
 tags: ['hilfe', 'treuhander'],
 },
 {
 id: 'fehler-melden',
 keywords: ['fehler', 'bug', 'problem', 'funktioniert', 'kaputt', 'meld', 'support', 'melden'],
 question: 'Wie melde ich einen Fehler?',
 answers: [
 'Fehler oder Verbesserungsvorschläge:\n\n1. **E-Mail** an das Bookitty-Team schreiben\n2. Beschreibe was du erwartet hast und was passiert ist\n3. Screenshot hilfreich\n\nWir freuen uns über jedes Feedback – Bookitty wird laufend verbessert! ',
 ],
 tags: ['hilfe', 'support'],
 },

];

export default KNOWLEDGE;
