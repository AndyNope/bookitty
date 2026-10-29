import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const SEEN_KEY = 'bookitty.tutorial.seen';

// eslint-disable-next-line react-refresh/only-export-components
export const hasTutorialBeenSeen = () =>
  typeof localStorage !== 'undefined' && localStorage.getItem(SEEN_KEY) === 'true';

// eslint-disable-next-line react-refresh/only-export-components
export const markTutorialSeen = () => {
  if (typeof localStorage !== 'undefined') localStorage.setItem(SEEN_KEY, 'true');
};

// ─── Step definitions ──────────────────────────────────────────────────────────

const steps: {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  action?: {
    highlightId?: string;
    navigateTo?: string;
    cta?: string;
  };
}[] = [
  {
    badge: 'Willkommen',
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
    action: { highlightId: 'nav-dashboard', navigateTo: '/dashboard', cta: 'Zum Dashboard' },
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
    action: { highlightId: 'nav-buchungen', navigateTo: '/buchungen', cta: 'Zu den Buchungen' },
  },
  {
    badge: 'Buchungsliste',
    icon: (
      <svg className="h-12 w-12 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
      </svg>
    ),
    title: 'Buchungen verwalten',
    description:
      'In der Tabelle siehst du nur das Wichtigste. Über das «…»-Menü findest du Details, Bearbeiten und Löschen. Lange Texte sind gekürzt – beim Hover siehst du alles.',
    action: { highlightId: 'nav-buchungen', navigateTo: '/buchungen', cta: 'Buchungsliste öffnen' },
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
    action: { highlightId: 'nav-dokumente', navigateTo: '/dokumente', cta: 'Zu den Dokumenten' },
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
    action: { highlightId: 'nav-bilanz', navigateTo: '/bilanz', cta: 'Zur Bilanz' },
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
      'Unter Einstellungen kannst du eigene Konten anlegen oder Bezeichnungen anpassen. Hinterlege deinen Firmennamen – dann erkennt Bookitty eigene Ausgangsrechnungen automatisch. Markiere häufig benutzte Konten mit dem Stern-Symbol als Stammkonten für schnellen Zugriff.',
    action: { navigateTo: '/einstellungen', cta: 'Zu den Einstellungen' },
  },
];

// ─── Component ─────────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  step: number;
  onStepChange: (s: number) => void;
  onClose: () => void;
  basePath?: string;
};

const OnboardingTutorial = ({ open, step, onStepChange, onClose, basePath = '' }: Props) => {
  const current = steps[step];
  const isLast = step === steps.length - 1;
  const navigate = useNavigate();

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

  useEffect(() => {
    if (!open) return;
    if (current?.action?.navigateTo) {
      navigate(`${basePath}${current.action.navigateTo}`);
    }
    if (current?.action?.highlightId) {
      window.dispatchEvent(new CustomEvent('kitty:highlight', {
        detail: { id: current.action.highlightId },
      }));
    }
  }, [open, step, current, basePath, navigate]);

  if (!open) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 px-3 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[360px] sm:px-0">
      <section
        aria-labelledby="tutorial-title"
        className="pointer-events-auto max-h-[min(65dvh,520px)] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          {current.badge && (
            <div>
              <p className="text-[10px] font-semibold uppercase text-slate-500">Geführte Einführung</p>
              <span className="text-xs font-semibold text-slate-800">{current.badge}</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleClose}
            title="Einführung schliessen (Esc)"
            aria-label="Einführung schliessen"
            className="ml-auto rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex items-start gap-3 px-4 py-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
            {current.icon}
          </div>
          <div className="min-w-0">
            <h2 id="tutorial-title" className="text-sm font-bold text-slate-900">{current.title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{current.description}</p>
            {current.action?.cta && (
              <button
                type="button"
                onClick={() => navigate(`${basePath}${current.action!.navigateTo}`)}
                className="mt-2 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
              >
                {current.action.cta} →
              </button>
            )}
          </div>
        </div>

        <div className="border-t border-slate-100 px-4 py-3">
          <div className="mb-3 flex items-center gap-3">
            <span className="shrink-0 text-[10px] font-medium text-slate-500">Schritt {step + 1} von {steps.length}</span>
            <div
              role="progressbar"
              aria-label="Fortschritt der Einführung"
              aria-valuenow={step + 1}
              aria-valuemin={1}
              aria-valuemax={steps.length}
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"
            >
              <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => onStepChange(step - 1)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Zurück
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
              className="ml-auto rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
            >
              {isLast ? 'Fertig' : 'Weiter'}
            </button>
          </div>

          {!isLast && (
            <button
              type="button"
              onClick={handleClose}
              className="mt-2 text-[10px] text-slate-400 hover:text-slate-600 transition"
            >
              Einführung beenden
            </button>
          )}
        </div>
      </section>
    </div>
  );
};

export default OnboardingTutorial;
