import { useEffect, useCallback } from 'react';

const SEEN_KEY = 'bookitty.tutorial.seen';

export const hasTutorialBeenSeen = () =>
  typeof localStorage !== 'undefined' && localStorage.getItem(SEEN_KEY) === 'true';

export const markTutorialSeen = () => {
  if (typeof localStorage !== 'undefined') localStorage.setItem(SEEN_KEY, 'true');
};

// ─── Step definitions ──────────────────────────────────────────────────────────

const steps: {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
}[] = [
  {
    badge: 'Willkommen 👋',
    icon: (
      <svg className="h-12 w-12 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
      </svg>
    ),
    title: 'Willkommen bei Bookitty',
    description:
      'Bookitty ist eine einfache Finanzbuchhaltung für Schweizer KMU. Dieses kurze Tutorial zeigt dir die wichtigsten Funktionen in 2 Minuten.',
  },
  {
    badge: 'Dashboard',
    icon: (
      <svg className="h-12 w-12 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    title: 'Dashboard – Überblick',
    description:
      'Das Dashboard zeigt dir auf einen Blick deine Einnahmen, Ausgaben, den aktuellen Saldo und offene Belege. Hier siehst du auch die letzten Buchungen.',
  },
  {
    badge: 'Buchungen',
    icon: (
      <svg className="h-12 w-12 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    title: 'Buchungen erfassen',
    description:
      'Jede Buchung hat ein Soll- und ein Haben-Konto (doppelte Buchhaltung). Klicke auf «Neue Buchung», wähle Typ (Einnahme/Ausgabe) und Zahlungsstatus – die Konten werden automatisch vorgeschlagen.',
  },
  {
    badge: 'Dokumente',
    icon: (
      <svg className="h-12 w-12 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
    title: 'Belege automatisch erkennen',
    description:
      'Lade ein PDF oder Foto einer Rechnung hoch. Bookitty liest Betrag, Datum und Konto per OCR + QR-Code automatisch aus und erstellt einen Buchungsvorschlag. Eigene Rechnungen (mit deinem Firmennamen) werden als Einnahme erkannt.',
  },
  {
    badge: 'Bilanz',
    icon: (
      <svg className="h-12 w-12 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Bilanz & Erfolgsrechnung',
    description:
      'Unter «Bilanz» findest du die vollständige Bilanz (Aktiven/Passiven), die Erfolgsrechnung nach Schweizer KMU-Standard sowie die MwSt-Übersicht. Alle Werte werden in Echtzeit berechnet.',
  },
  {
    badge: 'Kitty KI',
    icon: (
      <svg className="h-12 w-12 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
    title: 'Kitty – dein KI-Assistent',
    description:
      'Öffne den Chat-Button unten rechts und frage Kitty alles zur Buchhaltung: «Wie buche ich eine Reisekostenrechnung?» oder «Was ist der Unterschied zwischen Soll und Haben?». Kitty kann auch direkt Buchungsvorschläge erstellen.',
  },
  {
    badge: 'Stammkonten',
    icon: (
      <svg className="h-12 w-12 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Tipp: Einstellungen & Stammkonten',
    description:
      'Hinterlege deinen Firmennamen in den Einstellungen – dann erkennt Bookitty eigene Ausgangsrechnungen automatisch. Markiere häufig benutzte Konten mit ⭐ als Stammkonten für schnellen Zugriff.',
  },
];

// ─── Component ─────────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  step: number;
  onStepChange: (s: number) => void;
  onClose: () => void;
};

const OnboardingTutorial = ({ open, step, onStepChange, onClose }: Props) => {
  const current = steps[step];
  const isLast = step === steps.length - 1;

  const handleClose = useCallback(() => {
    markTutorialSeen();
    onClose();
  }, [onClose]);

  // Escape key closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
      if (e.key === 'ArrowRight' && !isLast) onStepChange(step + 1);
      if (e.key === 'ArrowLeft' && step > 0) onStepChange(step - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, step, isLast, handleClose, onStepChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Header bar with step badge + close */}
        <div className="flex items-center justify-between rounded-t-3xl border-b border-slate-100 px-6 py-4">
          {current.badge && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {current.badge}
            </span>
          )}
          <button
            type="button"
            onClick={handleClose}
            title="Tutorial schliessen (Esc)"
            className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col items-center px-8 py-8 text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-50">
            {current.icon}
          </div>
          <h2 className="text-xl font-bold text-slate-900">{current.title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">{current.description}</p>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-4 rounded-b-3xl border-t border-slate-100 px-6 py-5">
          {/* Step dots */}
          <div className="flex justify-center gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onStepChange(i)}
                className={`h-2 rounded-full transition-all ${
                  i === step ? 'w-6 bg-slate-900' : 'w-2 bg-slate-200 hover:bg-slate-300'
                }`}
                aria-label={`Schritt ${i + 1}`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => onStepChange(step - 1)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                ← Zurück
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (isLast) {
                  handleClose();
                } else {
                  onStepChange(step + 1);
                }
              }}
              className="flex-1 rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition"
            >
              {isLast ? 'Loslegen 🚀' : 'Weiter →'}
            </button>
          </div>

          {/* Skip link */}
          {!isLast && (
            <button
              type="button"
              onClick={handleClose}
              className="text-center text-xs text-slate-400 hover:text-slate-600 transition"
            >
              Tutorial überspringen
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingTutorial;
