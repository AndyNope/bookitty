<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

if (!defined('STRIPE_WEBHOOK_SECRET') || STRIPE_WEBHOOK_SECRET === '') {
    http_response_code(503);
    echo json_encode(['error' => 'Webhook nicht konfiguriert.']);
    exit;
}

$raw = file_get_contents('php://input');
$signatureHeader = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';
$signatureParts = [];
foreach (explode(',', $signatureHeader) as $part) {
    [$key, $value] = array_pad(explode('=', trim($part), 2), 2, '');
    if ($key !== '' && $value !== '') $signatureParts[$key][] = $value;
}
$timestamp = (int) ($signatureParts['t'][0] ?? 0);
$expected = hash_hmac('sha256', $timestamp . '.' . $raw, STRIPE_WEBHOOK_SECRET);
$validTimestamp = $timestamp > 0 && abs(time() - $timestamp) <= 300;
$hasMatchingSignature = false;
foreach ($signatureParts['v1'] ?? [] as $candidate) {
    if (hash_equals($expected, $candidate)) $hasMatchingSignature = true;
}
if (!$validTimestamp || !$hasMatchingSignature) {
    http_response_code(400);
    echo json_encode(['error' => 'Ungültige Webhook-Signatur.']);
    exit;
}

$event = json_decode($raw, true);
if (!is_array($event) || empty($event['id']) || empty($event['type'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Ungültiges Webhook-Ereignis.']);
    exit;
}

$plans = ['solo' => 250000, 'team' => 750000, 'business' => 2000000];
$packs = ['small' => 1000000, 'medium' => 4000000, 'large' => 10000000];
$pdo = get_db();

try {
    $pdo->beginTransaction();
    $eventInsert = $pdo->prepare('INSERT IGNORE INTO stripe_events (event_id) VALUES (?)');
    $eventInsert->execute([$event['id']]);
    if ($eventInsert->rowCount() === 0) {
        $pdo->commit();
        http_response_code(200);
        echo json_encode(['received' => true, 'duplicate' => true]);
        exit;
    }

    $object = $event['data']['object'] ?? [];
    $type = $event['type'];

    if ($type === 'checkout.session.completed' || $type === 'checkout.session.async_payment_succeeded') {
        $metadata = $object['metadata'] ?? [];
        $purchaseType = $metadata['purchase_type'] ?? '';
        $companyId = (int) ($metadata['company_id'] ?? 0);
        $customerId = is_string($object['customer'] ?? null) ? $object['customer'] : null;

        if ($purchaseType === 'subscription' && $companyId > 0 && isset($plans[$metadata['plan_code'] ?? ''])) {
            $subscriptionId = is_string($object['subscription'] ?? null) ? $object['subscription'] : null;
            $planCode = $metadata['plan_code'];
            $pdo->prepare(
                "UPDATE billing_accounts
                 SET plan_code = ?, subscription_status = CASE WHEN subscription_status = 'active' THEN 'active' ELSE 'pending' END,
                     stripe_customer_id = COALESCE(?, stripe_customer_id),
                     stripe_subscription_id = COALESCE(?, stripe_subscription_id)
                 WHERE company_id = ?"
            )->execute([$planCode, $customerId, $subscriptionId, $companyId]);
        }

        if ($purchaseType === 'tokens' && ($object['payment_status'] ?? '') === 'paid'
            && $companyId > 0 && isset($packs[$metadata['pack_code'] ?? ''])) {
            $reference = 'stripe-checkout:' . ($object['id'] ?? '');
            $exists = $pdo->prepare('SELECT id FROM ai_token_ledger WHERE reference_key = ?');
            $exists->execute([$reference]);
            if (!$exists->fetchColumn()) {
                $tokens = $packs[$metadata['pack_code']];
                $pdo->prepare(
                    'UPDATE billing_accounts SET purchased_tokens_remaining = purchased_tokens_remaining + ?,
                     stripe_customer_id = COALESCE(?, stripe_customer_id) WHERE company_id = ?'
                )->execute([$tokens, $customerId, $companyId]);
                $pdo->prepare(
                    "INSERT INTO ai_token_ledger (company_id, entry_type, token_delta, reference_key)
                     VALUES (?, 'token_purchase', ?, ?)"
                )->execute([$companyId, $tokens, $reference]);
            }
        }
    }

    if ($type === 'invoice.paid') {
        $subscriptionId = $object['subscription']
            ?? $object['parent']['subscription_details']['subscription']
            ?? null;
        if (is_array($subscriptionId)) $subscriptionId = $subscriptionId['id'] ?? null;

        if (is_string($subscriptionId) && $subscriptionId !== '') {
            $accountQuery = $pdo->prepare(
                'SELECT company_id, plan_code, monthly_tokens_remaining FROM billing_accounts
                 WHERE stripe_subscription_id = ? FOR UPDATE'
            );
            $accountQuery->execute([$subscriptionId]);
            $account = $accountQuery->fetch();
            if (!$account) throw new RuntimeException('Subscription account not linked yet');
            $tokens = $plans[$account['plan_code']] ?? 0;
            if ($tokens > 0) {
                $reference = 'stripe-invoice:' . ($object['id'] ?? '');
                $exists = $pdo->prepare('SELECT id FROM ai_token_ledger WHERE reference_key = ?');
                $exists->execute([$reference]);
                if (!$exists->fetchColumn()) {
                    $delta = $tokens - (int) $account['monthly_tokens_remaining'];
                    $pdo->prepare(
                        "UPDATE billing_accounts SET monthly_tokens_remaining = ?, subscription_status = 'active'
                         WHERE company_id = ?"
                    )->execute([$tokens, $account['company_id']]);
                    $pdo->prepare(
                        "INSERT INTO ai_token_ledger (company_id, entry_type, token_delta, reference_key)
                         VALUES (?, 'monthly_grant', ?, ?)"
                    )->execute([$account['company_id'], $delta, $reference]);
                }
            }
        }
    }

    if ($type === 'invoice.payment_failed') {
        $subscriptionId = $object['subscription']
            ?? $object['parent']['subscription_details']['subscription']
            ?? null;
        if (is_array($subscriptionId)) $subscriptionId = $subscriptionId['id'] ?? null;
        if (is_string($subscriptionId)) {
            $pdo->prepare("UPDATE billing_accounts SET subscription_status = 'past_due' WHERE stripe_subscription_id = ?")
                ->execute([$subscriptionId]);
        }
    }

    if ($type === 'customer.subscription.updated' || $type === 'customer.subscription.deleted') {
        $subscriptionId = $object['id'] ?? '';
        if ($type === 'customer.subscription.deleted') {
            $pdo->prepare(
                "UPDATE billing_accounts SET plan_code = 'starter', subscription_status = 'inactive',
                 monthly_tokens_remaining = 0, stripe_subscription_id = NULL, current_period_end = NULL
                 WHERE stripe_subscription_id = ?"
            )->execute([$subscriptionId]);
        } elseif (is_string($subscriptionId) && $subscriptionId !== '') {
            $status = in_array($object['status'] ?? '', ['active', 'trialing', 'past_due', 'unpaid', 'paused'], true)
                ? $object['status'] : 'inactive';
            $periodEnd = isset($object['current_period_end'])
                ? gmdate('Y-m-d H:i:s', (int) $object['current_period_end']) : null;
            $pdo->prepare('UPDATE billing_accounts SET subscription_status = ?, current_period_end = ? WHERE stripe_subscription_id = ?')
                ->execute([$status, $periodEnd, $subscriptionId]);
        }
    }

    $pdo->commit();
    echo json_encode(['received' => true]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('Stripe webhook processing failed: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Webhook-Verarbeitung fehlgeschlagen.']);
}