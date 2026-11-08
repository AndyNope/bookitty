<?php
$database = getenv('TEST_DB') ?: '';
$base = getenv('TEST_API_URL') ?: '';
if (!preg_match('/^bookitty_subscription_test_[0-9]+$/', $database) || $base !== 'http://127.0.0.1:18765/api') {
    throw new RuntimeException('Dieses Testskript benötigt eine isolierte Testdatenbank und den lokalen Testserver.');
}
require __DIR__ . '/../api/jwt.php';
$pdo = new PDO('mysql:host=db;dbname=' . $database . ';charset=utf8mb4', 'root', 'rootpassword', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$pdo->exec("INSERT INTO users (id, email, name, password_hash) VALUES (1, 'owner@example.test', 'Owner', 'unused'), (2, 'member@example.test', 'Member', 'unused')");
$pdo->exec("INSERT INTO company_memberships (company_id, user_id, role) VALUES (1, 1, 'admin'), (1, 2, 'buchhalter'), (2, 2, 'admin')");
$makeToken = static function (int $user, ?int $company = null): string {
    $claims = ['sub' => $user, 'iat' => time(), 'exp' => time() + 3600, 'session_version' => 0];
    if ($company !== null) $claims['company_id'] = $company;
    return jwt_encode($claims, 'isolated-test-jwt-secret');
};
$request = static function (string $endpoint, string $token = '', ?array $payload = null, ?string $signature = null) use ($base): array {
    $curl = curl_init($base . '/' . $endpoint);
    $headers = ['Content-Type: application/json'];
    if ($token !== '') $headers[] = 'Authorization: Bearer ' . $token;
    if ($signature !== null) $headers[] = 'Stripe-Signature: ' . $signature;
    curl_setopt_array($curl, [CURLOPT_RETURNTRANSFER => true, CURLOPT_HTTPHEADER => $headers, CURLOPT_TIMEOUT => 5]);
    if ($payload !== null) {
        curl_setopt($curl, CURLOPT_POST, true);
        curl_setopt($curl, CURLOPT_POSTFIELDS, json_encode($payload));
    }
    $body = curl_exec($curl);
    $status = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);
    if ($body === false) throw new RuntimeException('Testserver nicht erreichbar');
    return [$status, json_decode($body, true)];
};
$check = static function (bool $condition, string $message): void {
    if (!$condition) throw new RuntimeException($message);
};
$owner = $makeToken(1);
$member = $makeToken(2, 1);
[$status, $me] = $request('me.php', $owner);
$check($status === 200 && $me['subscriptionActive'] === false, 'Inaktives Abo wird nicht erkannt');
[$status] = $request('bookings.php', $owner);
$check($status === 402, 'Buchungen ohne Abo nicht gesperrt');
[$status] = $request('billing.php', $owner);
$check($status === 200, 'Aboverwaltung gesperrt');
$pdo->exec("UPDATE billing_accounts SET plan_code='solo', subscription_status='active', stripe_subscription_id='sub_test', stripe_customer_id='cus_test' WHERE company_id=1");
[$status] = $request('bookings.php', $owner);
$check($status === 200, 'Solo-Zugang gesperrt');
[$status] = $request('bookings.php', $member);
$check($status === 200, 'Firmenmitglied ohne Zugang zum Firmenabo');
[$status] = $request('bookings.php', $makeToken(2));
$check($status === 402, 'Persönliche Firma ohne Abo nicht gesperrt');
$pattern = 'sha256:' . str_repeat('a', 64);
[$status] = $request('templates.php', $owner, ['pattern' => $pattern, 'template' => ['account' => '4400 Aufwand', 'amount' => 999]]);
$check($status === 200, 'Vorlage konnte nicht gespeichert werden');
[$status] = $request('templates.php', $member, ['pattern' => $pattern, 'template' => ['contraAccount' => '1020 Bank']]);
$check($status === 200, 'Firmenmitglied konnte Vorlage nicht ergänzen');
[$status, $rules] = $request('templates.php', $owner);
$check($status === 200 && ($rules[$pattern]['account'] ?? '') === '4400 Aufwand'
    && ($rules[$pattern]['contraAccount'] ?? '') === '1020 Bank' && !isset($rules[$pattern]['amount']), 'Vorlagenkorrekturen nicht zusammengeführt');
$pdo->exec("INSERT INTO billing_accounts (company_id, plan_code, subscription_status) VALUES (2, 'solo', 'active')");
[$status, $otherRules] = $request('templates.php', $makeToken(2));
$check($status === 200 && empty($otherRules), 'Vorlage einer anderen Firma sichtbar');
$pdo->exec("UPDATE company_memberships SET role='readonly' WHERE company_id=1 AND user_id=2");
[$status] = $request('templates.php', $member, ['pattern' => $pattern, 'template' => ['contraAccount' => '2000 Kreditoren']]);
$check($status === 403, 'Nur-Lesen-Mitglied konnte Vorlage ändern');
$pdo->exec("UPDATE company_memberships SET role='buchhalter' WHERE company_id=1 AND user_id=2");
[$status] = $request('templates.php', $owner, ['pattern' => $pattern, 'template' => ['vatRate' => 999]]);
$check($status === 400, 'Ungültiger Steuersatz akzeptiert');
$webhook = static function (string $eventId, string $price) use ($request): int {
    $event = ['id' => $eventId, 'type' => 'customer.subscription.updated', 'data' => ['object' => [
        'id' => 'sub_test', 'status' => 'active', 'current_period_end' => time() + 3600,
        'items' => ['data' => [['price' => ['id' => $price]]]],
    ]]];
    $timestamp = time();
    $body = json_encode($event);
    $signature = 't=' . $timestamp . ',v1=' . hash_hmac('sha256', $timestamp . '.' . $body, 'isolated-test-webhook-secret');
    return $request('stripe-webhook.php', '', $event, $signature)[0];
};
$check($webhook('evt_upgrade', 'price_team') === 200, 'Upgrade-Webhook fehlgeschlagen');
$check($pdo->query('SELECT plan_code FROM billing_accounts WHERE company_id=1')->fetchColumn() === 'team', 'Upgrade nicht übernommen');
$check($webhook('evt_downgrade', 'price_solo') === 200, 'Downgrade-Webhook fehlgeschlagen');
$check($pdo->query('SELECT plan_code FROM billing_accounts WHERE company_id=1')->fetchColumn() === 'solo', 'Downgrade nicht übernommen');
$check($webhook('evt_unknown', 'price_unknown') === 500, 'Unbekannter Preis nicht abgelehnt');
$pdo->exec("UPDATE billing_accounts SET subscription_status='past_due' WHERE company_id=1");
[$status] = $request('bookings.php', $member);
$check($status === 402, 'Zahlungsausfall nicht gesperrt');
echo "Abo-Zugriff, Firmenzuordnung, Vorlagen und Tarifwechsel erfolgreich geprüft.\n";