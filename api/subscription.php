<?php
function subscription_has_access(?string $plan, ?string $status): bool {
    return in_array($plan, ['solo', 'team', 'business'], true)
        && in_array($status, ['active', 'trialing'], true);
}