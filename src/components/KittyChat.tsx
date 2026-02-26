import { useState, useRef, useEffect } from 'react';
import { searchKittyKnowledge, pickAnswer } from '../utils/kittySearch';

type Message = {
  role: 'user' | 'model';
  text: string;
  followUp?: string[];
  isLocal?: boolean;
};

const SUGGESTIONS = [
  'Wie erfasse ich eine Einnahme?',
  'Was ist der Unterschied zwischen Soll und Haben?',
  'Welcher MwSt-Satz gilt in der Schweiz?',
  'Wie buche ich eine Kreditoren-Rechnung?',
];

const KittyChat = () => {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const bottomRef             = useRef<HTMLDivElement>(null);
  const inputRef              = useRef<HTMLInputElement>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input when chat opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    setError('');
    const userMsg: Message = { role: 'user', text: text.trim() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    // ── 1. Lokale Knowledge Base (offline, sofort) ────────────────────────────
    const localMatch = searchKittyKnowledge(text.trim());
    if (localMatch) {
      await new Promise(r => setTimeout(r, 300 + Math.random() * 400));
      setMessages(prev => [...prev, {
        role: 'model',
        text: pickAnswer(localMatch),
        followUp: localMatch.followUp,
        isLocal: true,
      }]);
      setLoading(false);
      return;
    }

    // ── 2. Fallback: OpenRouter API ───────────────────────────────────────────
    try {
      const res = await fetch('/api/chat.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? 'Fehler beim Laden der Antwort.');
      } else {
        setMessages((prev) => [...prev, { role: 'model', text: data.text }]);
      }
    } catch {
      setError('Verbindungsfehler. Bitte versuche es nochmal.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  // Simple markdown-ish: bold **text**, newlines
  const renderText = (text: string) => {
    return text.split('\n').map((line, i) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <span key={i}>
          {parts.map((part, j) =>
            part.startsWith('**') && part.endsWith('**')
              ? <strong key={j}>{part.slice(2, -2)}</strong>
              : part
          )}
          {i < text.split('\n').length - 1 && <br />}
        </span>
      );
    });
  };

  return (
    <>
      {/* ── Floating button ── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Kitty öffnen"
        className={`fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all lg:bottom-6 lg:right-6 ${
          open ? 'bg-slate-700 rotate-0' : 'bg-slate-900 hover:bg-slate-700'
        }`}
      >
        {open ? (
          <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          /* Cat face icon */
          <svg className="h-7 w-7 text-white" viewBox="0 0 32 32" fill="currentColor">
            <path d="M6 4 L2 12 L6 11 Q8 18 16 18 Q24 18 26 11 L30 12 L26 4 L22 8 Q19 6 16 6 Q13 6 10 8 Z"/>
            <circle cx="11" cy="13" r="1.5" fill="#0f172a"/>
            <circle cx="21" cy="13" r="1.5" fill="#0f172a"/>
            <path d="M13 15.5 Q16 17.5 19 15.5" stroke="#0f172a" strokeWidth="1" fill="none" strokeLinecap="round"/>
          </svg>
        )}
        {/* Unread dot when closed and has messages */}
        {!open && messages.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white" />
        )}
      </button>

      {/* ── Chat window ── */}
      {open && (
        <div className="fixed bottom-36 right-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl lg:bottom-24 lg:right-6">

          {/* Header */}
          <div className="flex items-center gap-3 rounded-t-2xl bg-slate-900 px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
              <svg className="h-5 w-5 text-white" viewBox="0 0 32 32" fill="currentColor">
                <path d="M6 4 L2 12 L6 11 Q8 18 16 18 Q24 18 26 11 L30 12 L26 4 L22 8 Q19 6 16 6 Q13 6 10 8 Z"/>
                <circle cx="11" cy="13" r="1.5" fill="#0f172a"/>
                <circle cx="21" cy="13" r="1.5" fill="#0f172a"/>
                <path d="M13 15.5 Q16 17.5 19 15.5" stroke="#0f172a" strokeWidth="1" fill="none" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Kitty</p>
              <p className="text-[10px] text-slate-400">Bookitty KI-Assistent</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ml-auto rounded-lg p-1 text-slate-400 hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex flex-col gap-3 overflow-y-auto p-4 h-80">
            {messages.length === 0 ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-slate-500 text-center mt-4">
                  Hallo! Ich bin <strong>Kitty</strong>, dein Bookitty-Assistent.<br />
                  Wie kann ich dir helfen?
                </p>
                <div className="mt-2 flex flex-col gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-left text-xs text-slate-600 hover:bg-slate-50 transition"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i}>
                  <div
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-slate-900 text-white rounded-br-sm'
                          : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                      }`}
                    >
                      {renderText(msg.text)}
                    </div>
                  </div>
                  {/* Follow-up Vorschläge nach lokalen Antworten */}
                  {msg.role === 'model' && msg.followUp && msg.followUp.length > 0 && i === messages.length - 1 && (
                    <div className="mt-2 flex flex-col gap-1 pl-1">
                      {msg.followUp.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => send(q)}
                          disabled={loading}
                          className="rounded-xl border border-slate-200 px-3 py-1.5 text-left text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition disabled:opacity-40"
                        >
                          ↳ {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" />
                </div>
              </div>
            )}
            {error && (
              <p className="text-center text-xs text-rose-500">{error}</p>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-slate-100 p-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Frage stellen…"
              disabled={loading}
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-400 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white transition hover:bg-slate-700 disabled:opacity-40"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
              </svg>
            </button>
          </form>

        </div>
      )}
    </>
  );
};

export default KittyChat;
