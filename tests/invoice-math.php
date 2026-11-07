<?php
require __DIR__ . '/../api/invoice_math.php';
$items = [['quantity' => 1, 'unitPrice' => 1000, 'vatRate' => 8.1]];
if (abs(invoice_gross_total($items, true) - 1000) > 0.001 || abs(invoice_gross_total($items, false) - 1081) > 0.001) {
    throw new RuntimeException('MwSt-Rechnung fehlgeschlagen');
}
echo "Inklusive und exklusive MwSt-Totale erfolgreich.\n";