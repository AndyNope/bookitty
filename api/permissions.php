<?php
const COMPANY_PERMISSION_GROUPS = ['buchhaltung', 'verkauf', 'belege', 'personal', 'inventar', 'einstellungen', 'kitty'];

function authorize_company_permissions(?array $permissions): void {
    if ($permissions === null) return;
    $script = basename($_SERVER['SCRIPT_NAME'] ?? '');
    $always = ['me.php', 'companies.php', 'two-factor.php'];
    if (in_array($script, $always, true)) return;
    if ($script === 'confirm_document.php' && in_array('belege', $permissions, true) && in_array('buchhaltung', $permissions, true)) return;
    $groups = [
        'bookings.php' => 'buchhaltung', 'custom_accounts.php' => 'buchhaltung',
        'invoices.php' => 'verkauf', 'invoices_send.php' => 'verkauf', 'invoice_audit.php' => 'verkauf',
        'offers.php' => 'verkauf', 'contacts.php' => 'verkauf', 'portal.php' => 'verkauf', 'mahnung.php' => 'verkauf',
        'documents.php' => 'belege', 'upload.php' => 'belege', 'file.php' => 'belege',
        'templates.php' => 'belege', 'imap.php' => 'belege', 'document-learning.php' => 'belege',
        'expenses.php' => 'personal', 'chat.php' => 'kitty',
        'company.php' => 'einstellungen', 'billing.php' => 'einstellungen', 'team.php' => 'einstellungen', 'roles.php' => 'einstellungen', 'activity.php' => 'einstellungen',
    ];
    $group = $groups[$script] ?? null;
    if ($script === 'company.php' && ($_SERVER['REQUEST_METHOD'] ?? '') === 'GET' &&
        (in_array('verkauf', $permissions, true) || in_array('belege', $permissions, true))) return;
    if ($group === null || !in_array($group, $permissions, true)) {
        http_response_code(403);
        echo json_encode(['error' => 'Für diese Funktion fehlt die Berechtigung.']);
        exit;
    }
}