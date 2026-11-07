<?php
function invoice_gross_total(array $items, bool $vatIncluded): float {
    $total = 0.0;
    foreach ($items as $item) {
        $amount = (float) ($item['quantity'] ?? 1) * (float) ($item['unitPrice'] ?? 0);
        $total += $amount * ($vatIncluded ? 1 : 1 + (float) ($item['vatRate'] ?? 0) / 100);
    }
    return $total;
}