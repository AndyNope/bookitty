# Startup-Night-Minispiel und Gratis-Monat

## Stripe vorbereiten

Der Code `KITTY-2026` wird im Stripe-Checkout als Promotion-Code eingelöst. `api/billing.php` erlaubt Promotion-Codes bei Subscription-Checkouts. Der Coupon muss in Stripe separat angelegt werden:

1. Zuerst im Stripe-Testmodus einen Coupon mit 100 % Rabatt und Laufzeit „einmalig“ erstellen. „Einmalig“ deckt bei einem monatlichen Abo den ersten Abrechnungszeitraum ab.
2. Einen Promotion-Code `KITTY-2026` für diesen Coupon anlegen. Den Code auf die gewünschten Monatspläne beschränken und ein Einlöselimit sowie ein Ablaufdatum setzen.
3. Mit einem Testkunden den vollständigen Ablauf prüfen: Tarif wählen, `KITTY-2026` im Checkout eingeben, Abo abschliessen und kontrollieren, dass die erste Rechnung 100 % rabattiert ist und ab dem nächsten Monat der gewählte Tarifpreis gilt.
4. Coupon und Promotion-Code anschliessend im Live-Modus anlegen. Test- und Live-Promotion-Codes sind getrennt.

Der Checkout erfasst das Zahlungsmittel für die wiederkehrende Subscription. Der Gewinner sieht vor dem Registrieren, dass nach dem kostenlosen ersten Monat der gewählte Tarif monatlich abgerechnet wird und vor der Verlängerung gekündigt werden muss, falls kein Abo gewünscht ist.

## Minispiel und Daten

Der QR-Code auf der Belegkarte schaltet „Kitty Cash Dash“ frei. Nach dem 30-Sekunden-Lauf folgt ein Wissenscheck mit drei Fragen. Erst nach bestandener Challenge kann der Gewinncode per E-Mail angefordert werden; der Code wird nicht im Browser angezeigt. Bei drei falschen Antworten ist ein neuer Lauf nötig.

Die E-Mail-Adresse wird für den Versand benötigt. Ohne gesetztes Marketing-Häkchen wird sie nicht in der Datenbank gespeichert. Nur bei ausdrücklichem Opt-in wird die Adresse samt Einwilligungszeitpunkt und Textversion in `startup_night_marketing_consents` gespeichert. Der Einwilligungstext ist nicht vorangekreuzt. Reward-E-Mails werden nur an die angegebene Adresse verschickt; das Opt-in dient der späteren Kontaktaufnahme und ist getrennt davon.

Vor dem Livegang muss die Datenbanktabelle über den geschützten `api/migrate.php`-Ablauf angelegt werden. Eine Einwilligung kann jederzeit über `support@bookitty.ch` widerrufen werden.

Die Startup-Night-Seite wird am 1. Dezember 2026 automatisch ausgeblendet. Das Promotion-Code-Ablaufdatum in Stripe sollte dazu passend gesetzt werden.