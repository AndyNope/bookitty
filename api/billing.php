<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

set_cors_headers();
header('Content-Type: application/json; charset=utf-8');

$payload = get_auth_payload();
$companyId = isset($payload['company_id']) ? (int) $payload['company_id'] : (int) $payload['sub'];
$plans = [
    'starter' => ['name' => 'Starter', 'price' => 0, 'monthly_tokens' => 0],
    'solo' => ['name' => 'Solo', 'price' => 1200, 'monthly_tokens' => 250000],
    'team' => ['name' => 'Team', 'price' => 2900, 'monthly_tokens' => 750000],
    'business' => ['name' => 'Business', 'price' => 5900, 'monthly_tokens' => 2000000],
];
$tokenPacks = [
    'small' => ['name' => '1 Mio. KI-Tokens', 'price' => 490, 'tokens' => 1000000],
    'medium' => ['name' => '4 Mio. KI-Tokens', 'price' => 1490, 'tokens' => 4000000],
    'large' => ['name' => '10 Mio. KI-Tokens', 'price' => 2990, 'tokens' => 10000000],
];

$pdo = get_db();
$pdo->prepare("INSERT IGNORE INTO billing_accounts (company_id, plan_code) VALUES (?, 'starter')")
    ->execute([$companyId]);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->prepare(
        'SELECT plan_code, subscription_status, monthly_tokens_remaining,
            purchased_tokens_remaining, current_period_end, stripe_customer_id
         FROM billing_accounts WHERE company_id = ?'
    );
    $stmt->execute([$companyId]);
    $account = $stmt->fetch();
    $billingEnabled = defined('BILLING_ENABLED') && BILLING_ENABLED
        && defined('STRIPE_SECRET_KEY') && STRIPE_SECRET_KEY !== ''
        && defined('STRIPE_WEBHOOK_SECRET') && STRIPE_WEBHOOK_SECRET !== ''
        && defined('STRIPE_PRICE_PLAN_SOLO') && STRIPE_PRICE_PLAN_SOLO !== ''
        && defined('STRIPE_PRICE_PLAN_TEAM') && STRIPE_PRICE_PLAN_TEAM !== ''
        && defined('STRIPE_PRICE_PLAN_BUSINESS') && STRIPE_PRICE_PLAN_BUSINESS !== ''
        && defined('STRIPE_PRICE_TOKEN_SMALL') && STRIPE_PRICE_TOKEN_SMALL !== ''
        && defined('STRIPE_PRICE_TOKEN_MEDIUM') && STRIPE_PRICE_TOKEN_MEDIUM !== ''
        && defined('STRIPE_PRICE_TOKEN_LARGE') && STRIPE_PRICE_TOKEN_LARGE !== '';

    echo json_encode([
        'plan' => $account['plan_code'],
        'status' => $account['subscription_status'],
        'monthlyTokens' => (int) $account['monthly_tokens_remaining'],
        'purchasedTokens' => (int) $account['purchased_tokens_remaining'],
        'periodEnd' => $account['current_period_end'],
        'billingEnabled' => $billingEnabled,
        'portalEnabled' => $billingEnabled && !empty($account['stripe_customer_id']),
        'plans' => $plans,
        'tokenPacks' => $tokenPacks,
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

if (($payload['role'] ?? 'admin') !== 'admin') {
    http_response_code(403);
    echo json_encode(['error' => 'Nur Admins können das Abo verwalten.']);
    exit;
}

if (!defined('BILLING_ENABLED') || !BILLING_ENABLED
    || !defined('STRIPE_SECRET_KEY') || STRIPE_SECRET_KEY === ''
    || !defined('STRIPE_WEBHOOK_SECRET') || STRIPE_WEBHOOK_SECRET === '') {
    http_response_code(503);
    echo json_encode(['error' => 'Online-Zahlungen sind noch nicht freigeschaltet.']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true) ?? [];
$purchaseType = $body['type'] ?? '';
$accountQuery = $pdo->prepare(
    'SELECT subscription_status, stripe_subscription_id, stripe_customer_id FROM billing_accounts WHERE company_id = ?'
);
$accountQuery->execute([$companyId]);
$currentAccount = $accountQuery->fetch();
$subscriptionInProgress = $currentAccount && $currentAccount['stripe_subscription_id']
    && in_array($currentAccount['subscription_status'], ['active', 'trialing', 'past_due', 'pending', 'unpaid', 'paused'], true);
if ($purchaseType === 'subscription' && $subscriptionInProgress) {
    http_response_code(409);
    echo json_encode(['error' => 'Es besteht bereits ein Abo. Ein weiteres Abo kann nicht gestartet werden.']);
    exit;
}

$form = [];
if ($purchaseType === 'portal') {
    if (empty($currentAccount['stripe_customer_id'])) {
        http_response_code(404);
        echo json_encode(['error' => 'Für dieses Konto gibt es noch kein Stripe-Kundenprofil.']);
        exit;
    }
    $form = [
        'customer' => $currentAccount['stripe_customer_id'],
        'return_url' => rtrim(APP_URL, '/') . '/app/einstellungen',
    ];
} else {
    $form = [
        'mode' => '',
        'success_url' => rtrim(APP_URL, '/') . '/app/einstellungen?checkout=success&session_id={CHECKOUT_SESSION_ID}',
        'cancel_url' => rtrim(APP_URL, '/') . '/app/einstellungen?checkout=cancelled',
        'payment_method_types[0]' => 'card',
        'payment_method_types[1]' => 'twint',
        'client_reference_id' => (string) $companyId,
        'metadata[company_id]' => (string) $companyId,
    ];
}

if ($purchaseType === 'portal') {
    // The hosted portal handles cancellation and payment-method management.
} elseif ($purchaseType === 'subscription' && isset($plans[$body['plan'] ?? '']) && $body['plan'] !== 'starter') {
    $planCode = $body['plan'];
    $item = $plans[$planCode];
    $priceConstants = [
        'solo' => 'STRIPE_PRICE_PLAN_SOLO',
        'team' => 'STRIPE_PRICE_PLAN_TEAM',
        'business' => 'STRIPE_PRICE_PLAN_BUSINESS',
    ];
    $priceConstant = $priceConstants[$planCode];
    if (!defined($priceConstant) || constant($priceConstant) === '') {
        http_response_code(503);
        echo json_encode(['error' => 'Dieser Tarif ist noch nicht für Zahlungen konfiguriert.']);
        exit;
    }
    $form['mode'] = 'subscription';
    $form['line_items[0][price]'] = constant($priceConstant);
    $form['line_items[0][quantity]'] = '1';
    $form['metadata[purchase_type]'] = 'subscription';
    $form['metadata[plan_code]'] = $planCode;
    $form['subscription_data[metadata][company_id]'] = (string) $companyId;
    $form['subscription_data[metadata][plan_code]'] = $planCode;
} elseif ($purchaseType === 'tokens' && isset($tokenPacks[$body['pack'] ?? ''])) {
    $packCode = $body['pack'];
    $item = $tokenPacks[$packCode];
    $priceConstants = [
        'small' => 'STRIPE_PRICE_TOKEN_SMALL',
        'medium' => 'STRIPE_PRICE_TOKEN_MEDIUM',
        'large' => 'STRIPE_PRICE_TOKEN_LARGE',
    ];
    $priceConstant = $priceConstants[$packCode];
    if (!defined($priceConstant) || constant($priceConstant) === '') {
        http_response_code(503);
        echo json_encode(['error' => 'Dieses Tokenpaket ist noch nicht für Zahlungen konfiguriert.']);
        exit;
    }
    $form['mode'] = 'payment';
    $form['line_items[0][price]'] = constant($priceConstant);
    $form['line_items[0][quantity]'] = '1';
    $form['metadata[purchase_type]'] = 'tokens';
    $form['metadata[pack_code]'] = $packCode;
    $form['metadata[token_amount]'] = (string) $item['tokens'];
} elseif ($purchaseType !== 'portal') {
    http_response_code(400);
    echo json_encode(['error' => 'Ungültige Tarif- oder Tokenpaket-Auswahl.']);
    exit;
}

$stripePath = $purchaseType === 'portal'
    ? '/v1/billing_portal/sessions'
    : '/v1/checkout/sessions';
if ($purchaseType !== 'portal') {
    $owner = $pdo->prepare('SELECT email FROM users WHERE id = ?');
    $owner->execute([$companyId]);
    $email = $owner->fetchColumn();
    if (!$email) {
        http_response_code(404);
        echo json_encode(['error' => 'Unternehmen nicht gefunden.']);
        exit;
    }

    $form['customer_email'] = $email;
    if (!empty($currentAccount['stripe_customer_id'])) {
        unset($form['customer_email']);
        $form['customer'] = $currentAccount['stripe_customer_id'];
    }
}

$ch = curl_init('https://api.stripe.com' . $stripePath);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => http_build_query($form),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 20,
    CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
    CURLOPT_USERPWD => STRIPE_SECRET_KEY . ':',
]);
$raw = curl_exec($ch);
$httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($raw === false || $httpCode < 200 || $httpCode >= 300) {
    error_log('Stripe Checkout session creation failed; HTTP ' . $httpCode . ($curlError ? ': transport error' : ''));
    http_response_code(502);
    echo json_encode(['error' => 'Der Bezahlvorgang konnte nicht gestartet werden.']);
    exit;
}

$session = json_decode($raw, true);
if (empty($session['url'])) {
    http_response_code(502);
    echo json_encode(['error' => 'Stripe hat keine Checkout-URL zurückgegeben.']);
    exit;
}

echo json_encode(['url' => $session['url']]);