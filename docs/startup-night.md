# Startup-Night-Minispiel und Gratis-Monat

## Stripe vorbereiten

Der Code `KITTY-2026` wird im Stripe-Checkout als Promotion-Code eingelöst. `api/billing.php` erlaubt Promotion-Codes bei Subscription-Checkouts. Der Coupon muss in Stripe separat angelegt werden:

1. Zuerst im Stripe-Testmodus einen Coupon mit 100 % Rabatt und Laufzeit „einmalig“ erstellen. „Einmalig“ deckt bei einem monatlichen Abo den ersten Abrechnungszeitraum ab.
2. Einen Promotion-Code `KITTY-2026` für diesen Coupon anlegen. Den Code auf die gewünschten Monatspläne beschränken und ein Einlöselimit sowie ein Ablaufdatum setzen.
3. Mit einem Testkunden den vollständigen Ablauf prüfen: Tarif wählen, `KITTY-2026` im Checkout eingeben, Abo abschliessen und kontrollieren, dass die erste Rechnung 100 % rabattiert ist und ab dem nächsten Monat der gewählte Tarifpreis gilt.
4. Coupon und Promotion-Code anschliessend im Live-Modus anlegen. Test- und Live-Promotion-Codes sind getrennt.

Der Checkout erfasst das Zahlungsmittel für die wiederkehrende Subscription. Der Gewinner sieht vor dem Registrieren, dass nach dem kostenlosen ersten Monat der gewählte Tarif monatlich abgerechnet wird und vor der Verlängerung gekündigt werden muss, falls kein Abo gewünscht ist.

## Minispiel

Der QR-Code auf der Belegkarte schaltet „Kitty Cash Dash“ frei. Das Spiel dauert 30 Sekunden: Belege bringen Punkte, Tintenflecken kosten Leben. Ab 50 Punkten werden `KITTY-2026` und der Merch-Code angezeigt. Antworten oder persönliche Daten werden nicht gespeichert.

Die Startup-Night-Seite wird am 1. Dezember 2026 automatisch ausgeblendet. Das Promotion-Code-Ablaufdatum in Stripe sollte dazu passend gesetzt werden.