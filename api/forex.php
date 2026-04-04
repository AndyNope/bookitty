<?php
/**
 * GET /api/forex.php
 * Returns CHF-based exchange rates for major currencies.
 * Fetches from open.er-api.com, caches in /tmp for 23 hours.
 */
require_once __DIR__ . '/cors.php';

set_cors_headers();
header('Content-Type: application/json; charset=utf-8');

$cacheFile = sys_get_temp_dir() . '/bookitty_forex.json';
$ttl       = 23 * 3600; // 23 hours

// Return cached if fresh
if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < $ttl) {
    $cached = file_get_contents($cacheFile);
    if ($cached) { echo $cached; exit; }
}

// Fallback rates in case the external API is unavailable
$fallback = [
    'base'        => 'CHF',
    'date'        => date('Y-m-d'),
    'rates'       => ['EUR' => 1.04, 'USD' => 1.12, 'GBP' => 0.88, 'JPY' => 170.0, 'CAD' => 1.52, 'AUD' => 1.71],
    'source'      => 'fallback',
];

// Try to fetch live data — CHF as base via open.er-api.com (free, no key)
$url = 'https://open.er-api.com/v6/latest/CHF';
$ctx = stream_context_create(['http' => ['timeout' => 5, 'ignore_errors' => true]]);
$raw = @file_get_contents($url, false, $ctx);

if ($raw) {
    $data = json_decode($raw, true);
    if (!empty($data['rates']) && $data['result'] === 'success') {
        $currencies = ['EUR', 'USD', 'GBP', 'JPY', 'CAD', 'AUD'];
        $rates = [];
        foreach ($currencies as $c) {
            if (isset($data['rates'][$c])) $rates[$c] = round($data['rates'][$c], 6);
        }
        $result = [
            'base'   => 'CHF',
            'date'   => $data['time_last_update_utc'] ?? date('Y-m-d'),
            'rates'  => $rates,
            'source' => 'live',
        ];
        $json = json_encode($result);
        file_put_contents($cacheFile, $json);
        echo $json;
        exit;
    }
}

// Serve fallback
echo json_encode($fallback);
