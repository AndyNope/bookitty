<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/forex-lib.php';

set_cors_headers();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

$date = $_GET['date'] ?? gmdate('Y-m-d');
if (!is_string($date) || !valid_forex_date($date) || $date < '1999-01-04') {
    http_response_code(400);
    echo json_encode(['error' => 'Ungültiges Kursdatum.']);
    exit;
}

$cacheFile = sys_get_temp_dir() . '/bookitty_forex_ecb_' . hash('sha256', $date) . '.json';
$ttl = $date === gmdate('Y-m-d') ? 3600 : 7 * 86400;
if (is_file($cacheFile) && time() - filemtime($cacheFile) < $ttl) {
    $cached = json_decode((string) file_get_contents($cacheFile), true);
    if (is_array($cached) && ($cached['requestedDate'] ?? '') === $date && !empty($cached['rates'])) {
        echo json_encode($cached);
        exit;
    }
}

$url = 'https://api.frankfurter.dev/v2/rates?' . http_build_query(['base' => 'CHF', 'providers' => 'ecb', 'date' => $date]);
$raw = false;
$status = 0;
if (function_exists('curl_init')) {
    $curl = curl_init($url);
    curl_setopt_array($curl, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10, CURLOPT_CONNECTTIMEOUT => 5]);
    $raw = curl_exec($curl);
    $status = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);
} else {
    $context = stream_context_create([
        'http' => ['method' => 'GET', 'timeout' => 10, 'ignore_errors' => true, 'header' => "Accept: application/json\r\n"],
        'ssl' => ['verify_peer' => true, 'verify_peer_name' => true],
    ]);
    $raw = @file_get_contents($url, false, $context);
    foreach ($http_response_header ?? [] as $header) {
        if (preg_match('/^HTTP\/\S+\s+(\d{3})/', $header, $match)) $status = (int) $match[1];
    }
}
$rows = is_string($raw) ? json_decode($raw, true) : null;
if ($status !== 200 || !is_array($rows) || !forex_is_list($rows)) {
    http_response_code(503);
    echo json_encode(['error' => 'Referenzkurse sind derzeit nicht verfügbar.']);
    exit;
}
$normalized = normalize_forex_rows($rows, $date);
if (!$normalized['rates']) {
    http_response_code(503);
    echo json_encode(['error' => 'Für dieses Datum sind keine Referenzkurse verfügbar.']);
    exit;
}
$result = [
    'base' => 'CHF', 'date' => max($normalized['rateDates']), 'requestedDate' => $date,
    'rates' => $normalized['rates'], 'rateDates' => $normalized['rateDates'],
    'source' => 'ECB via Frankfurter', 'retrievedAt' => gmdate('c'),
];
$encoded = json_encode($result);
@file_put_contents($cacheFile, $encoded, LOCK_EX);
echo $encoded;
