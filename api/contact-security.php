<?php
function contact_origin_allowed(): bool {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $isLocalOrigin = preg_match('#^https?://(?:localhost|127\.0\.0\.1)(?::\d+)?$#D', $origin) === 1;
    return $origin === '' || in_array($origin, CORS_ORIGINS, true) || $isLocalOrigin;
}

function contact_rate_limit_allowed(string $ip, ?string $path = null, ?int $now = null): bool {
    $now ??= time();
    $path ??= sys_get_temp_dir() . '/bookitty-contact-rate-' . substr(hash('sha256', APP_URL), 0, 16) . '.json';
    $handle = @fopen($path, 'c+');
    if ($handle === false || !flock($handle, LOCK_EX)) {
        if (is_resource($handle)) fclose($handle);
        return false;
    }

    $stored = json_decode(stream_get_contents($handle), true);
    $state = is_array($stored) ? $stored : [];
    foreach ($state as $key => $timestamps) {
        if (!is_array($timestamps)) {
            unset($state[$key]);
            continue;
        }
        $state[$key] = array_values(array_filter($timestamps, static fn($timestamp) => is_int($timestamp) && $timestamp > $now - 3600 && $timestamp <= $now));
        if (!$state[$key]) unset($state[$key]);
    }

    $ipKey = hash_hmac('sha256', $ip, JWT_SECRET);
    $limited = count($state[$ipKey] ?? []) >= 5;
    if (!$limited) $state[$ipKey][] = $now;
    rewind($handle);
    ftruncate($handle, 0);
    $written = fwrite($handle, json_encode($state));
    $flushed = fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);

    return !$limited && $written !== false && $flushed;
}