# Bookitty

Bookitty ist eine moderne WebApp für die Finanzbuchhaltung. Sie ermöglicht das Erfassen von Buchungen, die automatische Erstellung einer Bilanz sowie den Dokumenten-Import von PDF- oder Bildbelegen mit automatischer Erkennung und manueller Prüfung.

## Funktionen

- Dashboard mit Kennzahlen und letzten Buchungen
- Buchungen erfassen, prüfen und verwalten
- Bilanzübersicht inklusive PDF-Download
- Dokumenten-Import mit automatischer Belegerkennung und Bestätigung

## Lokale Entwicklung

### Voraussetzungen

- Node.js (aktuelle LTS empfohlen)
- npm

### Setup

```bash
npm install
```

### Entwicklung starten

```bash
npm run dev
```

### Build erstellen

```bash
npm run build
```

### Vorschau des Builds

```bash
npm run preview
```

## Hinweise

- Die PDF-Ausgabe wird aktuell als einfache Bilanzübersicht erzeugt. Bei Bedarf können weitere Layouts ergänzt werden.
- Die automatische Belegerkennung ist ein Mock und dient als Platzhalter für ein OCR-Backend.
