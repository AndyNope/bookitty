import KNOWLEDGE, { type KnowledgeEntry } from '../data/kittyKnowledge';

// ── Deutsche Stop-Wörter ──────────────────────────────────────────────────────
const STOP_WORDS = new Set([
  'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'die', 'der', 'das',
  'ein', 'eine', 'einer', 'einem', 'einen', 'und', 'oder', 'aber', 'auch',
  'noch', 'schon', 'mal', 'doch', 'nur', 'mir', 'dir', 'mich', 'dich',
  'sich', 'was', 'wie', 'wo', 'wann', 'warum', 'welche', 'welcher',
  'kann', 'muss', 'soll', 'will', 'ist', 'sind', 'war', 'waren',
  'hat', 'haben', 'hatte', 'hatten', 'für', 'mit', 'bei', 'von',
  'zu', 'in', 'an', 'auf', 'aus', 'bitte', 'danke', 'ja', 'nein',
  'gibt', 'gibt', 'man', 'kann', 'immer', 'dann', 'wenn', 'nicht',
  'mehr', 'alle', 'dem', 'den', 'des', 'als', 'dass', 'nach', 'über',
  'unter', 'vor', 'zwischen', 'ohne', 'durch', 'gegen', 'per',
]);

// ── Tokenizer ─────────────────────────────────────────────────────────────────
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')                          // Umlaute erhalten (ä→a handled below)
    .replace(/[?!.,;:()[\]{}"'«»\-–—]/g, ' ')
    .split(/\s+/)
    .map(t => t.replace(/[\u0300-\u036f]/g, ''))  // Diakritika entfernen (é→e)
    .filter(t => t.length > 2 && !STOP_WORDS.has(t));
}

// ── Hauptsuche ────────────────────────────────────────────────────────────────
// Normalisierung: score / sqrt(|tokens|)  → unabhängig von Anfragelänge
// Schwellenwert: 2.0
export function searchKittyKnowledge(query: string): KnowledgeEntry | null {
  const tokens = tokenize(query);
  if (tokens.length === 0) return null;

  let bestEntry: KnowledgeEntry | null = null;
  let bestScore = 0;

  for (const entry of KNOWLEDGE) {
    let raw = 0;

    for (const token of tokens) {
      for (const kw of entry.keywords) {
        if (kw === token) {
          raw += 3;              // exakter Treffer
        } else if (kw.startsWith(token) || token.startsWith(kw)) {
          raw += 1.5;            // Präfix-Treffer (z. B. "buche" ~ "buchen")
        } else if (kw.includes(token) || token.includes(kw)) {
          raw += 0.8;            // Teil-Treffer
        }
      }
    }

    // Normalisierung über Tokenanzahl der Anfrage
    const normalized = raw / Math.sqrt(tokens.length);

    if (normalized > bestScore) {
      bestScore = normalized;
      bestEntry = entry;
    }
  }

  return bestScore >= 2.0 ? bestEntry : null;
}

// ── Zufällige Antwort aus den Varianten ──────────────────────────────────────
export function pickAnswer(entry: KnowledgeEntry): string {
  const idx = Math.floor(Math.random() * entry.answers.length);
  return entry.answers[idx];
}
