<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/auth.php';

set_cors_headers();
set_exception_handler(function (Throwable $e): void {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
});

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

// ── Auth (optional – auch Demo-User können chatten) ──────────────────────────

// ── Input ─────────────────────────────────────────────────────────────────────
$body     = json_decode(file_get_contents('php://input'), true) ?? [];
$messages = $body['messages'] ?? [];

if (empty($messages) || !is_array($messages)) {
    http_response_code(400);
    echo json_encode(['error' => 'messages array required']);
    exit;
}

// Sanitize + convert to OpenAI format (role: user/assistant, content: string)
$history = array_map(fn($m) => [
    'role'    => $m['role'] === 'model' ? 'assistant' : 'user',
    'content' => mb_substr((string)($m['text'] ?? ''), 0, 4000),
], array_slice($messages, -20));

// ── System prompt ─────────────────────────────────────────────────────────────
$systemPrompt = <<<'PROMPT'
Du bist Kitty, der freundliche KI-Assistent von Bookitty – einer Schweizer Buchhaltungssoftware für KMU.

Deine Aufgaben:
- Buchhaltungsfragen für Schweizer KMU beantworten (Schweizer Kontenrahmen KMU, doppelte Buchhaltung, MwSt-Sätze CH)
- Bookitty-Funktionen erklären (Buchungen erfassen, Bilanz, Erfolgsrechnung, Dokumente hochladen)
- Einfache, verständliche Sprache – die Nutzer sind Unternehmer, keine Buchhalter
- Auf Deutsch antworten (ausser der Nutzer schreibt in einer anderen Sprache)

Wichtige Fakten über Bookitty:
- Buchungssystem nach Schweizer KMU-Kontenrahmen (1xxx=Aktiven, 2xxx=Passiven, 3xxx=Ertrag, 4xxx-8xxx=Aufwand)
- Doppelte Buchführung: jede Buchung hat ein Soll- und ein Habenkonto
- MwSt Schweiz: Normalsatz 8.1%, Sondersatz Beherbergung 3.8%, reduzierter Satz 2.6%
- Einnahmen: Habenkonto = 3xxx (Erlöse), Sollkonto = 1xxx (Bank/Kasse/Debitoren)
- Ausgaben: Sollkonto = 4xxx-8xxx (Aufwand), Habenkonto = 2xxx (Kreditoren/Bank)

Grenzen:
- Keine Steuerberatung (verweise an Treuhänder)
- Keine Rechtsberatung
- Wenn unsicher: ehrlich sagen und an Fachperson verweisen

Ton: freundlich, professionell, kurz und präzise. Keine langen Einleitungen.
PROMPT;

// ── Call OpenRouter API (kostenlose Modelle via :free Suffix) ─────────────────
$apiKey = defined('KITTY_API_KEY') ? KITTY_API_KEY : '';
if (empty($apiKey)) {
    http_response_code(503);
    echo json_encode(['error' => 'Kitty ist momentan nicht verfügbar (kein API-Key konfiguriert).']);
    exit;
}

$payload = json_encode([
    'model'    => 'meta-llama/llama-4-maverick:free',
    'messages' => array_merge(
        [['role' => 'system', 'content' => $systemPrompt]],
        $history
    ),
    'temperature' => 0.4,
    'max_tokens'  => 1024,
]);

$ch = curl_init('https://openrouter.ai/api/v1/chat/completions');
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey,
        'HTTP-Referer: https://bookitty.bidebliss.com',
        'X-Title: Bookitty',
    ],
]);

$raw      = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($raw === false || $httpCode !== 200) {
    $detail = json_decode($raw ?? '{}', true)['error']['message'] ?? 'OpenRouter API-Fehler';
    http_response_code(502);
    echo json_encode(['error' => $detail]);
    exit;
}

$response = json_decode($raw, true);
$text     = $response['choices'][0]['message']['content'] ?? '';

if (empty($text)) {
    http_response_code(502);
    echo json_encode(['error' => 'Leere Antwort vom KI-Modell.']);
    exit;
}

echo json_encode(['text' => $text]);
