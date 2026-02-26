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
// We allow unauthenticated access so the demo mode can also use the chatbot.
// Abuse protection is handled by the Gemini API key limits.

// ── Input ─────────────────────────────────────────────────────────────────────
$body     = json_decode(file_get_contents('php://input'), true) ?? [];
$messages = $body['messages'] ?? [];

if (empty($messages) || !is_array($messages)) {
    http_response_code(400);
    echo json_encode(['error' => 'messages array required']);
    exit;
}

// Sanitize: only keep role + text
$history = array_map(fn($m) => [
    'role'  => $m['role'] === 'model' ? 'model' : 'user',
    'parts' => [['text' => mb_substr((string)($m['text'] ?? ''), 0, 4000)]],
], array_slice($messages, -20)); // max 20 turns to keep tokens low

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

// ── Call Gemini API ───────────────────────────────────────────────────────────
$apiKey  = defined('GEMINI_API_KEY') ? GEMINI_API_KEY : '';
if (empty($apiKey)) {
    http_response_code(503);
    echo json_encode(['error' => 'Kitty ist momentan nicht verfügbar (kein API-Key konfiguriert).']);
    exit;
}

$endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' . urlencode($apiKey);

$payload = json_encode([
    'system_instruction' => ['parts' => [['text' => $systemPrompt]]],
    'contents'           => $history,
    'generationConfig'   => [
        'temperature'     => 0.4,
        'maxOutputTokens' => 1024,
    ],
    'safetySettings' => [
        ['category' => 'HARM_CATEGORY_HARASSMENT',        'threshold' => 'BLOCK_ONLY_HIGH'],
        ['category' => 'HARM_CATEGORY_HATE_SPEECH',       'threshold' => 'BLOCK_ONLY_HIGH'],
        ['category' => 'HARM_CATEGORY_SEXUALLY_EXPLICIT', 'threshold' => 'BLOCK_ONLY_HIGH'],
        ['category' => 'HARM_CATEGORY_DANGEROUS_CONTENT', 'threshold' => 'BLOCK_ONLY_HIGH'],
    ],
]);

$ch = curl_init($endpoint);
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
]);

$raw      = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($raw === false || $httpCode !== 200) {
    $detail = json_decode($raw ?? '{}', true)['error']['message'] ?? 'Gemini API-Fehler';
    http_response_code(502);
    echo json_encode(['error' => $detail]);
    exit;
}

$response = json_decode($raw, true);
$text     = $response['candidates'][0]['content']['parts'][0]['text'] ?? '';

if (empty($text)) {
    http_response_code(502);
    echo json_encode(['error' => 'Leere Antwort von Gemini.']);
    exit;
}

echo json_encode(['text' => $text]);
