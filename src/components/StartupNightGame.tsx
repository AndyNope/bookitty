import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { api } from '../services/api';

const GAME_DURATION = 30;
const TARGET_SCORE = 50;
const challengeQuestions = [
  {
    prompt: 'Eine Lieferantenrechnung beträgt CHF 216.20 inklusive 8,1 % MWST. Wie hoch ist der Nettobetrag?',
    choices: ['CHF 200.00', 'CHF 199.90', 'CHF 216.20'],
    answer: 'CHF 200.00',
    explanation: 'CHF 200.00 netto plus CHF 16.20 Vorsteuer ergeben CHF 216.20 brutto.',
  },
  {
    prompt: 'Du erhältst die Rechnung für Büromaterial, Zahlung später. Welche Buchung passt?',
    choices: ['Soll Büroaufwand, Haben Verbindlichkeiten', 'Soll Bank, Haben Büroaufwand', 'Soll Verbindlichkeiten, Haben Bank'],
    answer: 'Soll Büroaufwand, Haben Verbindlichkeiten',
    explanation: 'Der Aufwand steigt im Soll; die offene Lieferantenverbindlichkeit steigt im Haben.',
  },
  {
    prompt: 'Du bezahlst die offene Lieferantenrechnung per Bank. Welche Konten werden angesprochen?',
    choices: ['Soll Verbindlichkeiten, Haben Bank', 'Soll Bank, Haben Verbindlichkeiten', 'Soll Aufwand, Haben Ertrag'],
    answer: 'Soll Verbindlichkeiten, Haben Bank',
    explanation: 'Mit der Zahlung sinkt die Verbindlichkeit im Soll und das Bankguthaben im Haben.',
  },
];

type GameItem = {
  id: number;
  lane: number;
  y: number;
  kind: 'receipt' | 'ink';
};

type GameState = {
  items: GameItem[];
  score: number;
  lives: number;
  elapsed: number;
  lastTickAt: number;
  lastSpawnAt: number;
  nextId: number;
};

const StartupNightGame = ({ unlocked }: { unlocked: boolean }) => {
  const [started, setStarted] = useState(false);
  const [result, setResult] = useState<'won' | 'lost' | null>(null);
  const [quizActive, setQuizActive] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizMistakes, setQuizMistakes] = useState(0);
  const [quizFeedback, setQuizFeedback] = useState('');
  const [lane, setLane] = useState(1);
  const [items, setItems] = useState<GameItem[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [gameQrVisible, setGameQrVisible] = useState(false);
  const [gameQrDataUrl, setGameQrDataUrl] = useState('');
  const [rewardEmail, setRewardEmail] = useState('');
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [rewardStatus, setRewardStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [rewardError, setRewardError] = useState('');
  const [marketingConsentSaved, setMarketingConsentSaved] = useState(false);
  const [marketingConsentWarning, setMarketingConsentWarning] = useState('');
  const laneRef = useRef(1);
  const gameRef = useRef<GameState>({
    items: [], score: 0, lives: 3, elapsed: 0, lastTickAt: 0, lastSpawnAt: 0, nextId: 0,
  });
  const gameStatus = !unlocked ? 'locked' : result ?? (quizActive ? 'quiz' : started ? 'playing' : 'ready');

  useEffect(() => {
    const gameUrl = `${window.location.origin}/startup-night?play=1`;
    QRCode.toDataURL(gameUrl, {
      width: 240,
      margin: 1,
      errorCorrectionLevel: 'Q',
      color: { dark: '#12231d', light: '#ffffff' },
    }).then(setGameQrDataUrl).catch(() => setGameQrDataUrl(''));
  }, []);

  const startGame = () => {
    const now = performance.now();
    laneRef.current = 1;
    gameRef.current = {
      items: [], score: 0, lives: 3, elapsed: 0, lastTickAt: now, lastSpawnAt: 0, nextId: 0,
    };
    setLane(1);
    setItems([]);
    setScore(0);
    setLives(3);
    setTimeLeft(GAME_DURATION);
    setResult(null);
    setQuizActive(false);
    setQuizIndex(0);
    setQuizMistakes(0);
    setQuizFeedback('');
    setRewardEmail('');
    setRewardStatus('idle');
    setRewardError('');
    setMarketingConsentSaved(false);
    setMarketingConsentWarning('');
    setStarted(true);
  };

  const moveLane = (direction: number) => {
    const nextLane = Math.max(0, Math.min(2, laneRef.current + direction));
    laneRef.current = nextLane;
    setLane(nextLane);
  };

  useEffect(() => {
    if (gameStatus !== 'playing') return;

    const timer = window.setInterval(() => {
      const game = gameRef.current;
      const now = performance.now();
      const delta = Math.min((now - game.lastTickAt) / 1000, 0.12);
      game.lastTickAt = now;
      const previousSurvivalScore = Math.floor(game.elapsed);
      game.elapsed += delta;
      game.score += Math.floor(game.elapsed) - previousSurvivalScore;

      if (game.elapsed - game.lastSpawnAt >= 0.82) {
        game.items.push({
          id: game.nextId++,
          lane: Math.floor(Math.random() * 3),
          y: 0,
          kind: Math.random() < 0.22 ? 'ink' : 'receipt',
        });
        game.lastSpawnAt = game.elapsed;
      }

      const remainingItems: GameItem[] = [];
      for (const item of game.items) {
        const nextY = item.y + delta * 0.62;
        if (nextY >= 0.82) {
          if (item.lane === laneRef.current) {
            if (item.kind === 'receipt') game.score += 10;
            else game.lives -= 1;
          }
        } else {
          remainingItems.push({ ...item, y: nextY });
        }
      }
      game.items = remainingItems;

      if (game.elapsed >= GAME_DURATION && game.lives > 0) game.score += 20;

      const remainingSeconds = Math.max(0, GAME_DURATION - Math.floor(game.elapsed));
      setItems(remainingItems);
      setScore(game.score);
      setLives(Math.max(0, game.lives));
      setTimeLeft(remainingSeconds);

      if (game.score >= TARGET_SCORE) {
        setStarted(false);
        setQuizIndex(0);
        setQuizMistakes(0);
        setQuizFeedback('');
        setQuizActive(true);
      }
      else if (game.lives <= 0 || game.elapsed >= GAME_DURATION) setResult('lost');
    }, 50);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
        event.preventDefault();
        moveLane(-1);
      } else if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
        event.preventDefault();
        moveLane(1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameStatus]);

  const handleQuizAnswer = (choice: string) => {
    const question = challengeQuestions[quizIndex];
    if (choice === question.answer) {
      setQuizFeedback(question.explanation);
      if (quizIndex === challengeQuestions.length - 1) {
        setQuizActive(false);
        setResult('won');
      } else {
        setQuizIndex((index) => index + 1);
      }
      return;
    }

    const mistakes = quizMistakes + 1;
    setQuizMistakes(mistakes);
    if (mistakes >= 3) {
      setQuizActive(false);
      setResult('lost');
      setQuizFeedback('Zu viele Fehlversuche. Starte eine neue Runde und versuche es erneut.');
    } else {
      setQuizFeedback(`Nicht ganz. Noch ${3 - mistakes} Versuch${mistakes === 1 ? '' : 'e'}.`);
    }
  };

  const handleRewardSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRewardStatus('sending');
    setRewardError('');
    try {
      const response = await api.startupNight.sendRewardCode(rewardEmail, marketingOptIn);
      setMarketingConsentSaved(response.marketing_opt_in_saved);
      setMarketingConsentWarning(response.marketing_opt_in_saved || !marketingOptIn ? '' : response.message);
      setRewardStatus('sent');
    } catch (error) {
      setRewardStatus('error');
      setRewardError(error instanceof Error ? error.message : 'Der Versand ist gerade nicht möglich.');
    }
  };

  return (
    <div>
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-slate-500">Mini-Game</p>
          <h2 id="game-title" className="mt-1 text-xl font-bold text-slate-900">Kitty Cash Dash</h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-600">Sammle Belege für Kitty und weiche Tintenflecken aus. 30 Sekunden, drei Leben. Steuere mit ← → oder A/D.</p>
          <button type="button" onClick={() => setGameQrVisible((visible) => !visible)} aria-expanded={gameQrVisible} className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-emerald-800 underline decoration-emerald-300 underline-offset-4 hover:text-emerald-950">
            {gameQrVisible ? 'Spiel-QR ausblenden' : 'Spiel auf dem Smartphone öffnen'}
          </button>
        </div>
        <div className="flex w-full shrink-0 items-center justify-between gap-3 text-xs sm:w-auto sm:flex-col sm:items-end sm:text-right">
          <p className="font-semibold text-slate-900">{score} / {TARGET_SCORE} Punkte</p>
          <p className="text-slate-500">{timeLeft}s · {lives} Leben</p>
        </div>
      </div>

      {gameQrVisible && gameQrDataUrl && (
        <div className="mt-4 flex items-center gap-4 border border-slate-200 bg-white p-3">
          <img src={gameQrDataUrl} alt="QR-Code zum direkten Start von Kitty Cash Dash auf dem Smartphone" className="h-28 w-28 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-slate-900">Scan & spiel mit</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">Der QR-Code öffnet Kitty Cash Dash direkt und schaltet das Spiel auf dem Smartphone frei.</p>
          </div>
        </div>
      )}

      <div className="relative mt-5 aspect-[4/3] min-h-[280px] w-full overflow-hidden border border-slate-300 bg-[#f7faf7] sm:min-h-[340px]" role="application" aria-label="Kitty Cash Dash Spielbereich">
        {[1, 2].map((divider) => (
          <span key={divider} className="absolute inset-y-0 border-l border-dashed border-slate-300" style={{ left: `${(divider / 3) * 100}%` }} />
        ))}
        <div className="absolute inset-x-0 bottom-[18%] border-t-2 border-dashed border-emerald-500/60" />

        {gameStatus === 'playing' && items.map((item) => (
          <span
            key={item.id}
            className={`absolute z-10 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-[9px] font-black shadow-sm ${item.kind === 'receipt' ? 'border-emerald-700 bg-white text-emerald-800' : 'border-rose-700 bg-rose-600 text-white'}`}
            style={{ left: `${((item.lane + 0.5) / 3) * 100}%`, top: `${item.y * 100}%` }}
            aria-label={item.kind === 'receipt' ? 'Beleg' : 'Tintenfleck'}
          >
            {item.kind === 'receipt' ? 'CHF' : '!'}
          </span>
        ))}

        {gameStatus === 'playing' && (
          <div className="absolute bottom-[10%] z-20 -translate-x-1/2" style={{ left: `${((lane + 0.5) / 3) * 100}%` }}>
            <img src="/logo.svg" alt="Kitty" className="h-12 w-12 sm:h-14 sm:w-14" />
          </div>
        )}

        {gameStatus === 'locked' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 px-5 text-center">
            <img src="/logo.svg" alt="" className="h-14 w-14" />
            <p className="mt-3 text-sm font-semibold text-slate-900">Scanne zuerst die Belegkarte.</p>
          </div>
        )}

        {gameStatus === 'ready' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 px-5 text-center">
            <img src="/logo.svg" alt="" className="h-14 w-14" />
            <p className="mt-3 text-sm font-semibold text-slate-900">Bereit für den Kassensturz?</p>
            <button type="button" onClick={startGame} className="mt-4 rounded-md bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800">Spiel starten</button>
          </div>
        )}

        {gameStatus === 'quiz' && (
          <div className="absolute inset-0 z-30 flex flex-col justify-center overflow-y-auto bg-white/95 p-4 sm:p-6">
            <p className="text-[10px] font-semibold uppercase text-emerald-800">Wissenscheck · {quizIndex + 1}/{challengeQuestions.length}</p>
            <h3 className="mt-2 text-base font-bold leading-snug text-slate-900 sm:text-lg">{challengeQuestions[quizIndex].prompt}</h3>
            <div className="mt-3 grid gap-2">
              {challengeQuestions[quizIndex].choices.map((choice) => (
                <button key={choice} type="button" onClick={() => handleQuizAnswer(choice)} className="border border-slate-300 bg-white px-3 py-2 text-left text-xs font-medium leading-snug text-slate-800 hover:border-emerald-700 hover:bg-emerald-50 sm:px-4 sm:py-2.5 sm:text-sm">
                  {choice}
                </button>
              ))}
            </div>
            {quizFeedback && <p role="status" className={`mt-2 text-xs ${quizFeedback.startsWith('Nicht') || quizFeedback.startsWith('Zu viele') ? 'text-amber-800' : 'text-emerald-800'}`}>{quizFeedback}</p>}
          </div>
        )}

        {(gameStatus === 'won' || gameStatus === 'lost') && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/95 px-5 text-center">
            <img src="/logo.svg" alt="" className="h-14 w-14" />
            <h3 className="mt-3 text-xl font-bold text-slate-900">{gameStatus === 'won' ? 'Starker Lauf!' : 'Fast geschafft!'}</h3>
            <p className="mt-1 text-sm text-slate-600">Dein Score: {score} Punkte</p>
            <button type="button" onClick={startGame} className="mt-4 rounded-md border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Nochmal spielen</button>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-4">
        <p className="min-w-0 flex-1 text-xs leading-relaxed text-slate-500" aria-live="polite">{gameStatus === 'playing' ? 'Beleg +10 · Überleben +1/s · volle Runde +20 · Tintenfleck −1 Leben' : 'Sammle Belege oder überlebe die volle Runde.'}</p>
        <div className="flex gap-2 sm:hidden">
          <button type="button" onClick={() => moveLane(-1)} disabled={gameStatus !== 'playing'} aria-label="Kitty nach links bewegen" className="h-10 w-12 border border-slate-300 bg-white text-lg disabled:opacity-40">←</button>
          <button type="button" onClick={() => moveLane(1)} disabled={gameStatus !== 'playing'} aria-label="Kitty nach rechts bewegen" className="h-10 w-12 border border-slate-300 bg-white text-lg disabled:opacity-40">→</button>
        </div>
      </div>

      {gameStatus === 'won' && (
        <div className="mt-6 border-t border-emerald-200 pt-5">
          <p className="text-xs font-semibold uppercase text-emerald-800">Challenge bestanden · {score} Punkte</p>
          <h3 className="mt-2 text-2xl font-bold text-slate-900">Gewinncode per E-Mail erhalten</h3>
          {rewardStatus === 'sent' ? (
            <div role="status" className="mt-4 border-l-2 border-emerald-700 bg-white p-4">
              <p className="text-sm font-semibold text-emerald-900">Der Code ist unterwegs.</p>
              <p className="mt-1 text-xs text-slate-600">Prüfe dein Postfach{rewardEmail ? ` (${rewardEmail})` : ''}. Für Merch zeigst du denselben Code am Bookitty-Stand.</p>
              {marketingConsentWarning && <p role="alert" className="mt-2 text-xs text-amber-800">{marketingConsentWarning}</p>}
              {marketingConsentSaved && <p className="mt-2 text-xs text-slate-500">Deine Einwilligung für Angebote und Newsletter wurde gespeichert. Widerruf: support@bookitty.ch.</p>}
            </div>
          ) : (
            <>
              <p className="mt-2 max-w-xl text-xs leading-relaxed text-slate-600">Wir senden dir den Stripe-Code für einen kostenlosen Abrechnungszeitraum. Danach wird der gewählte Tarif monatlich verrechnet.</p>
              <form onSubmit={handleRewardSubmit} className="mt-4 max-w-xl space-y-3">
                <label className="block text-xs font-medium text-slate-700">
                  E-Mail-Adresse für deinen Gewinncode
                  <input type="email" required autoComplete="email" value={rewardEmail} onChange={(event) => setRewardEmail(event.target.value)} className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" placeholder="name@beispiel.ch" />
                </label>
                <label className="flex items-start gap-2 text-xs leading-relaxed text-slate-600">
                  <input type="checkbox" checked={marketingOptIn} onChange={(event) => setMarketingOptIn(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-700" />
                  <span>Ja, Bookitty darf meine E-Mail-Adresse für Angebote und Newsletter speichern und verwenden. Diese Einwilligung ist freiwillig und jederzeit widerrufbar.</span>
                </label>
                <p className="text-[10px] leading-relaxed text-slate-500">Ohne Häkchen verwenden wir die Adresse nur zum einmaligen Versand des Gewinncodes und speichern sie nicht für Marketing.</p>
                <button type="submit" disabled={rewardStatus === 'sending'} className="rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">{rewardStatus === 'sending' ? 'Wird gesendet…' : 'Code per E-Mail senden'}</button>
                {rewardError && <p role="alert" className="text-xs text-rose-700">{rewardError}</p>}
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default StartupNightGame;