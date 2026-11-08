<?php
require __DIR__ . '/../api/forex-lib.php';

$assert = static function (bool $condition, string $message): void {
    if (!$condition) throw new RuntimeException($message);
};

$assert(valid_forex_date('2026-01-04'), 'Gültiges historisches Datum wurde abgelehnt');
$assert(!valid_forex_date('2026-02-30'), 'Ungültiges Kalenderdatum wurde akzeptiert');
$assert(!valid_forex_date('2099-01-01'), 'Zukünftiges Kursdatum wurde akzeptiert');
$assert(forex_is_list([]), 'Leere Liste wurde abgelehnt');
$assert(forex_is_list([['quote' => 'EUR'], ['quote' => 'USD']]), 'JSON-Liste wurde abgelehnt');
$assert(!forex_is_list(['rate' => 1.2]), 'JSON-Objekt wurde als Liste akzeptiert');

$normalized = normalize_forex_rows([
    ['base' => 'CHF', 'quote' => 'EUR', 'date' => '2026-01-02', 'rate' => 1.05],
    ['base' => 'EUR', 'quote' => 'USD', 'date' => '2026-01-02', 'rate' => 1.1],
    ['base' => 'CHF', 'quote' => 'BAD', 'date' => '2026-01-02', 'rate' => 0],
    ['base' => 'CHF', 'quote' => 'USD', 'date' => '2026-01-03', 'rate' => 0.9],
], '2026-01-02');
$assert($normalized['rates'] === ['EUR' => 1.05], 'Kurse wurden nicht streng validiert');
echo "FX-API Validierung und Normalisierung erfolgreich.\n";