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

// ── Call OpenRouter API – Fallback-Kette bei Rate-Limit ──────────────────────
$apiKey = defined('KITTY_API_KEY') ? KITTY_API_KEY : '';
if (empty($apiKey)) {
    http_response_code(503);
    echo json_encode(['error' => 'Kitty ist momentan nicht verfügbar (kein API-Key konfiguriert).']);
    exit;
}

$models = [
    'upstage/solar-pro-3:free',
    'openai/gpt-oss-20b:free',
    'openai/gpt-oss-120b:free',
    'mistralai/mistral-small-3.1-24b-instruct:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'google/gemma-3-27b-it:free',
    'nousresearch/hermes-3-llama-3.1-405b:free',
    'nvidia/nemotron-nano-9b-v2:free',
    'qwen/qwen3-4b:free',
];

$raw = null; $httpCode = 0;
foreach ($models as $model) {
    $payload = json_encode([
        'model'    => $model,
        'messages' => array_merge(
            [['role' => 'system', 'content' => $systemPrompt]],
            $history
        ),
        'temperature' => 0.4,
        'max_tokens'  => 2048,
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

    if ($httpCode === 200) break; // Erfolg → kein weiterer Versuch nötig
}

if ($raw === false || $httpCode !== 200) {
    $detail = json_decode($raw ?? '{}', true)['error']['message'] ?? '';
    // Rate-limit auf allen Modellen → freundliche Meldung
    if (empty($detail) || str_contains($detail, 'rate') || str_contains($detail, 'quota') || $httpCode === 429) {
        $detail = 'Kitty ist gerade sehr gefragt. Bitte versuche es in 30 Sekunden nochmal.';
    }
    http_response_code(502);
    echo json_encode(['error' => $detail]);
    exit;
}

$response = json_decode($raw, true);
$message  = $response['choices'][0]['message'] ?? [];
$text     = $message['content'] ?? '';

// Reasoning-Modelle (z.B. solar-pro-3) liefern Antwort manchmal nur in reasoning_details
if (empty($text)) {
    $details = $message['reasoning_details'] ?? [];
    foreach ($details as $d) {
        if (!empty($d['text'])) { $text = $d['text']; break; }
    }
}

if (empty($text)) {
    http_response_code(502);
    echo json_encode(['error' => 'Leere Antwort vom KI-Modell.']);
    exit;
}

echo json_encode(['text' => $text]);
