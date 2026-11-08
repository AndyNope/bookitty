<?php
function valid_forex_date(string $value): bool {
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
    return $date !== false && $date->format('Y-m-d') === $value && $value <= gmdate('Y-m-d');
}

function forex_is_list(array $values): bool {
    $expected = 0;
    foreach (array_keys($values) as $key) {
        if ($key !== $expected++) return false;
    }
    return true;
}

function normalize_forex_rows(array $rows, string $requestedDate): array {
    $rates = [];
    $dates = [];
    foreach ($rows as $row) {
        if (!is_array($row) || ($row['base'] ?? '') !== 'CHF') continue;
        $code = $row['quote'] ?? null;
        $date = $row['date'] ?? null;
        $rate = $row['rate'] ?? null;
        if (!is_string($code) || !preg_match('/^[A-Z]{3}$/', $code) || !is_string($date) || !valid_forex_date($date) || $date > $requestedDate) continue;
        if (!is_numeric($rate) || !is_finite((float) $rate) || (float) $rate <= 0) continue;
        if (!isset($dates[$code]) || $date > $dates[$code]) {
            $rates[$code] = (float) $rate;
            $dates[$code] = $date;
        }
    }
    return ['rates' => $rates, 'rateDates' => $dates];
}