import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';

const GAME_DURATION = 30;
const TARGET_SCORE = 50;
const REWARD_CODE = 'KITTY-2026';

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
  const [lane, setLane] = useState(1);
  const [items, setItems] = useState<GameItem[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [copied, setCopied] = useState(false);
  const [gameQrVisible, setGameQrVisible] = useState(false);
  const [gameQrDataUrl, setGameQrDataUrl] = useState('');
  const laneRef = useRef(1);
  const gameRef = useRef<GameState>({
    items: [], score: 0, lives: 3, elapsed: 0, lastTickAt: 0, lastSpawnAt: 0, nextId: 0,
  });
  const gameStatus = !unlocked ? 'locked' : result ?? (started ? 'playing' : 'ready');

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
    setCopied(false);
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
      game.elapsed += delta;

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

      const remainingSeconds = Math.max(0, GAME_DURATION - Math.floor(game.elapsed));
      setItems(remainingItems);
      setScore(game.score);
      setLives(Math.max(0, game.lives));
      setTimeLeft(remainingSeconds);

      if (game.score >= TARGET_SCORE) setResult('won');
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

  const copyRewardCode = async () => {
    try {
      await navigator.clipboard.writeText(REWARD_CODE);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Mini-Game</p>
          <h2 id="game-title" className="mt-1 text-xl font-bold text-slate-900">Kitty Cash Dash</h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-600">Sammle Belege für Kitty und weiche Tintenflecken aus. 30 Sekunden, drei Leben. Steuere mit ← → oder A/D.</p>
          <button type="button" onClick={() => setGameQrVisible((visible) => !visible)} aria-expanded={gameQrVisible} className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-emerald-800 underline decoration-emerald-300 underline-offset-4 hover:text-emerald-950">
            {gameQrVisible ? 'Spiel-QR ausblenden' : 'Spiel auf dem Smartphone öffnen'}
          </button>
        </div>
        <div className="shrink-0 text-right text-xs">
          <p className="font-semibold text-slate-900">{score} / {TARGET_SCORE} CHF</p>
          <p className="mt-1 text-slate-500">{timeLeft}s · {lives} Leben</p>
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

      <div className="relative mt-5 aspect-[4/3] min-h-[280px] overflow-hidden border border-slate-300 bg-[#f7faf7] sm:min-h-[340px]" role="application" aria-label="Kitty Cash Dash Spielbereich">
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

        {(gameStatus === 'won' || gameStatus === 'lost') && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/95 px-5 text-center">
            <img src="/logo.svg" alt="" className="h-14 w-14" />
            <h3 className="mt-3 text-xl font-bold text-slate-900">{gameStatus === 'won' ? 'Starker Lauf!' : 'Fast geschafft!'}</h3>
            <p className="mt-1 text-sm text-slate-600">Dein Score: {score} CHF</p>
            <button type="button" onClick={startGame} className="mt-4 rounded-md border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Nochmal spielen</button>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-4">
        <p className="text-xs text-slate-500" aria-live="polite">{gameStatus === 'playing' ? 'Belege +10 · Tintenfleck kostet ein Leben' : 'Sammle CHF-Belege, weiche roten Tintenflecken aus.'}</p>
        <div className="flex gap-2 sm:hidden">
          <button type="button" onClick={() => moveLane(-1)} disabled={gameStatus !== 'playing'} aria-label="Kitty nach links bewegen" className="h-10 w-12 border border-slate-300 bg-white text-lg disabled:opacity-40">←</button>
          <button type="button" onClick={() => moveLane(1)} disabled={gameStatus !== 'playing'} aria-label="Kitty nach rechts bewegen" className="h-10 w-12 border border-slate-300 bg-white text-lg disabled:opacity-40">→</button>
        </div>
      </div>

      {gameStatus === 'won' && (
        <div className="mt-6 border-t border-emerald-200 pt-5">
          <p className="text-xs font-semibold uppercase text-emerald-800">Gewonnen · {score} Punkte</p>
          <h3 className="mt-2 text-2xl font-bold text-slate-900">Dein Code für Merch und den Gratis-Monat</h3>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <code className="bg-emerald-50 px-4 py-3 font-mono text-lg font-bold text-emerald-900">{REWARD_CODE}</code>
            <button type="button" onClick={copyRewardCode} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white">{copied ? 'Kopiert' : 'Code kopieren'}</button>
          </div>
          <p className="mt-4 max-w-xl text-xs leading-relaxed text-slate-600">Gib bei der Registrierung im Stripe-Checkout den Code KITTY-2026 ein: ein Monat kostenlos, danach wird dein gewählter Tarif monatlich abgerechnet (Solo ab CHF 12/Monat). Stripe fragt vor dem Start nach einem Zahlungsmittel. Kündige vor Ende des Gratis-Monats, wenn du keine Verlängerung möchtest.</p>
          <Link to="/register" className="mt-4 inline-flex rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Registrieren und Code einlösen</Link>
          <p className="mt-2 text-[10px] text-slate-500">Für die Merch-Abholung zeigst du denselben Code am Bookitty-Stand.</p>
        </div>
      )}
    </div>
  );
};

export default StartupNightGame;