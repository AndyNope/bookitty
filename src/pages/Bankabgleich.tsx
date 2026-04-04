import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import SectionHeader from '../components/SectionHeader';
import NotificationModal from '../components/NotificationModal';
import { useBookkeeping } from '../store/BookkeepingContext';
import type { Booking } from '../types';
import {
  parseBankFile,
  autoMatch,
  type BankTransaction,
  type MatchResult,
  type MatchConfidence,
} from '../utils/bankParser';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}
function fmtCHF(n: number) {
  return new Intl.NumberFormat('de-CH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

const CONF_LABEL: Record<MatchConfidence, string> = {
  high:   'Hohe Übereinstimmung',
  medium: 'Mögliche Übereinstimmung',
  none:   'Kein Treffer',
};

const CONF_STYLE: Record<MatchConfidence, string> = {
  high:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  none:   'bg-slate-50 text-slate-500 border-slate-200',
};

// ─── Upload zone ──────────────────────────────────────────────────────────────
const UploadZone = ({ onFile }: { onFile: (f: File) => void }) => {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div
      onClick={() => ref.current?.click()}
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
      className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center cursor-pointer hover:border-slate-400 transition-colors"
    >
      <svg className="h-12 w-12 text-slate-300" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h4a1 1 0 001-1V5m0 0l3-3m-3 3l3 3M21 14h-4a1 1 0 00-1 1v4m0 0l-3 3m3-3l-3-3M3 14l4 4M3 14l4-4M21 10l-4-4M21 10l-4 4" />
      </svg>
      <div>
        <p className="text-sm font-semibold text-slate-700">Kontoauszug hier ablegen</p>
        <p className="mt-1 text-xs text-slate-400">CSV · camt.054 XML · MT940</p>
      </div>
      <div className="max-w-xs space-y-1 text-xs text-slate-400">
        <p>Unterstützte Banken: PostFinance, Raiffeisen, ZKB, UBS, Neon, ZAK, BCGE u.v.m.</p>
      </div>
      <input ref={ref} type="file" accept=".csv,.tsv,.txt,.xml,.sta,.mt940" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
    </div>
  );
};

// ─── Status per transaction ───────────────────────────────────────────────────
type TxDecision = 'accept' | 'ignore' | 'new' | null;
type TxState = Record<string, {
  decision: TxDecision;
  manualBookingId?: string; // for manual override
}>;

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Bankabgleich() {
  const location = useLocation();
  const isDemo   = location.pathname.startsWith('/demo');
  const { bookings, updateBooking, addBooking } = useBookkeeping();

  const [transactions, setTransactions]   = useState<BankTransaction[]>([]);
  const [matches,      setMatches]        = useState<MatchResult[]>([]);
  const [txState,      setTxState]        = useState<TxState>({});
  const [loading,      setLoading]        = useState(false);
  const [notification, setNotification]   = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);
  const [filterMode,   setFilterMode]     = useState<'Alle' | 'Offen' | 'Bezahlt' | 'Ignoriert'>('Alle');
  const [fileName,     setFileName]       = useState('');
  const [obSyncing,    setObSyncing]      = useState(false);
  const [obDone,       setObDone]         = useState(false);

  // Derive matches whenever transactions or bookings change
  useEffect(() => {
    if (!transactions.length) return;
    const m = autoMatch(transactions, bookings.map(b => ({
      id:            b.id,
      date:          b.date,
      amount:        b.amount,
      description:   b.description,
      paymentStatus: b.paymentStatus,
    })));
    setMatches(m);
    // Pre-accept high-confidence matches
    setTxState(prev => {
      const next = { ...prev };
      for (const match of m) {
        if (!next[match.transactionId]) {
          next[match.transactionId] = {
            decision: match.confidence === 'high' ? 'accept' : null,
            manualBookingId: match.bookingId,
          };
        }
      }
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions]);

  const matchMap = useMemo(
    () => Object.fromEntries(matches.map(m => [m.transactionId, m])),
    [matches]
  );

  const getDecision = (txId: string): TxDecision => txState[txId]?.decision ?? null;
  const setDecision = (txId: string, decision: TxDecision, manualBookingId?: string) =>
    setTxState(prev => ({
      ...prev,
      [txId]: { decision, manualBookingId: manualBookingId ?? prev[txId]?.manualBookingId },
    }));

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const accepted = transactions.filter(t => txState[t.id]?.decision === 'accept');
    const ignored  = transactions.filter(t => txState[t.id]?.decision === 'ignore');
    const newBk    = transactions.filter(t => txState[t.id]?.decision === 'new');
    const pending  = transactions.filter(t => !txState[t.id]?.decision);
    return { accepted: accepted.length, ignored: ignored.length, newBk: newBk.length, pending: pending.length };
  }, [transactions, txState]);

  // ── Filtered list ──────────────────────────────────────────────────────────
  const visible = useMemo(() => {
    if (filterMode === 'Alle') return transactions;
    if (filterMode === 'Offen') return transactions.filter(t => !txState[t.id]?.decision);
    if (filterMode === 'Bezahlt') return transactions.filter(t => txState[t.id]?.decision === 'accept');
    if (filterMode === 'Ignoriert') return transactions.filter(t => txState[t.id]?.decision === 'ignore');
    return transactions;
  }, [transactions, txState, filterMode]);

  // ── File handling ──────────────────────────────────────────────────────────
  const handleFile = async (file: File) => {
    setLoading(true);
    setFileName(file.name);
    try {
      const txs = await parseBankFile(file);
      if (!txs.length) {
        setNotification({ type: 'error', title: 'Keine Transaktionen', message: 'In dieser Datei wurden keine Transaktionen erkannt. CSV, camt.054 XML oder MT940 unterstützt.' });
        return;
      }
      // Sort by date descending
      txs.sort((a, b) => b.date.localeCompare(a.date));
      setTransactions(txs);
      setTxState({});
    } catch {
      setNotification({ type: 'error', title: 'Fehler', message: 'Die Datei konnte nicht gelesen werden.' });
    } finally {
      setLoading(false);
    }
  };

  // ── Apply decisions ────────────────────────────────────────────────────────
  const handleApply = async () => {
    let applied = 0;
    let created = 0;

    for (const tx of transactions) {
      const state = txState[tx.id];
      if (!state) continue;

      if (state.decision === 'accept') {
        const bookingId = state.manualBookingId ?? matchMap[tx.id]?.bookingId;
        if (bookingId) {
          const booking = bookings.find(b => b.id === bookingId);
          if (booking && booking.paymentStatus !== 'Bezahlt') {
            updateBooking(booking.id, { ...booking, paymentStatus: 'Bezahlt' });
            applied++;
          }
        }
      }

      if (state.decision === 'new') {
        const draft: Booking = {
          id:            `bk-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          date:          tx.date,
          description:   tx.description,
          account:       tx.amount > 0 ? '1020 Postcheck' : '2000 Kreditoren',
          contraAccount: tx.amount > 0 ? '3000 Betriebsertrag' : '4000 Betriebsaufwand',
          category:      tx.amount > 0 ? 'Ertrag' : 'Aufwand',
          amount:        Math.abs(tx.amount),
          vatRate:       0,
          currency:      tx.currency,
          paymentStatus: 'Bezahlt',
          type:          tx.amount > 0 ? 'Einnahme' : 'Ausgabe',
        };
        addBooking(draft);
        created++;
      }
    }

    setNotification({
      type: 'success',
      title: 'Abgleich abgeschlossen',
      message: `${applied} Buchung${applied !== 1 ? 'en' : ''} als Bezahlt markiert · ${created} neue Buchung${created !== 1 ? 'en' : ''} erstellt.`,
    });
    setTransactions([]);
    setTxState({});
    setFileName('');
  };

  const canApply = Object.values(txState).some(s => s.decision === 'accept' || s.decision === 'new');

  // ── Open Banking demo sync ────────────────────────────────────────────────
  const handleObSync = () => {
    setObSyncing(true);
    setObDone(false);
    setTimeout(() => {
      const today = new Date().toISOString().slice(0, 10);
      const mockTxs: BankTransaction[] = [
        { id: `ob-${Date.now()}-1`, date: today, description: 'TWINT Zahlung Max Müller AG', amount: 2450.00, currency: 'CHF' },
        { id: `ob-${Date.now()}-2`, date: today, description: 'Miete Juli 2025 UBS Hypothek', amount: -2800.00, currency: 'CHF' },
        { id: `ob-${Date.now()}-3`, date: today, description: 'SBB Abonnement', amount: -399.00, currency: 'CHF' },
      ];
      mockTxs.sort((a, b) => b.date.localeCompare(a.date));
      setTransactions(mockTxs);
      setTxState({});
      setFileName('PostFinance Connect (Demo)');
      setObSyncing(false);
      setObDone(true);
    }, 1800);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  const openBookings = useMemo(
    () => bookings.filter(b => b.paymentStatus !== 'Bezahlt'),
    [bookings]
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <SectionHeader
        title="Bankabgleich"
        subtitle="Kontoauszug importieren und Buchungen automatisch zuordnen"
        action={
          transactions.length > 0 ? (
            <div className="flex items-center gap-2">
              <button onClick={() => { setTransactions([]); setTxState({}); setFileName(''); }}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50">
                Neue Datei
              </button>
              <button onClick={handleApply} disabled={!canApply}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40">
                Abgleich übernehmen
              </button>
            </div>
          ) : undefined
        }
      />

      {/* ── Upload or list ─────────────────────────────────────────────── */}
      {transactions.length === 0 ? (
        <div>
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 py-16 text-center">
              <svg className="h-8 w-8 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <p className="text-sm text-slate-500">Datei wird analysiert…</p>
            </div>
          ) : (
            <UploadZone onFile={handleFile} />
          )}

          {/* Tips */}
          <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Wie exportiere ich meinen Kontoauszug?</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {[
                { bank: 'PostFinance', format: 'CSV', path: 'E-Finance → Konto → Transaktionen → Exportieren → CSV' },
                { bank: 'Raiffeisen', format: 'CSV', path: 'E-Banking → Konto → Kontobewegungen → Exportieren → CSV' },
                { bank: 'ZKB', format: 'CSV · camt.054', path: 'ZKB Online → Konto → Transaktionen → Exportieren' },
                { bank: 'UBS', format: 'CSV', path: 'UBS e-banking → Konto → Transaktionen → Export' },
                { bank: 'Neon', format: 'CSV', path: 'App → Konto → Transaktionen → Exportieren' },
                { bank: 'ZAK (Bank Cler)', format: 'CSV', path: 'App → Transaktionen → CSV-Export' },
              ].map(tip => (
                <div key={tip.bank} className="rounded-lg bg-white border border-slate-200 p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">{tip.bank}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-500">{tip.format}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{tip.path}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ── File info + stats ─────────────────────────────────────── */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm font-medium text-slate-700">{fileName}</span>
              <span className="text-xs text-slate-400">{transactions.length} Transaktionen</span>
            </div>
            <div className="flex gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                {stats.accepted} akzeptiert
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" />
                {stats.pending} offen
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-400 inline-block" />
                {stats.newBk} neue Buchungen
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-slate-300 inline-block" />
                {stats.ignored} ignoriert
              </span>
            </div>
          </div>

          {/* ── Filter tabs ───────────────────────────────────────────── */}
          <div className="flex gap-2">
            {(['Alle', 'Offen', 'Bezahlt', 'Ignoriert'] as const).map(f => (
              <button key={f} onClick={() => setFilterMode(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  filterMode === f ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}>
                {f}
                {f === 'Offen' && stats.pending > 0 && (
                  <span className="ml-1.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {stats.pending}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Accept all high-confidence ───────────────────────────── */}
          {matches.filter(m => m.confidence === 'high' && getDecision(m.transactionId) === null).length > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-sm font-medium text-emerald-800">
                {matches.filter(m => m.confidence === 'high').length} Transaktionen mit hoher Übereinstimmung gefunden
              </p>
              <button
                onClick={() => {
                  const next = { ...txState };
                  for (const m of matches.filter(m2 => m2.confidence === 'high')) {
                    next[m.transactionId] = { decision: 'accept', manualBookingId: m.bookingId };
                  }
                  setTxState(next);
                }}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                Alle akzeptieren
              </button>
            </div>
          )}

          {/* ── Transaction table ─────────────────────────────────────── */}
          <div className="space-y-2">
            {visible.map(tx => {
              const match  = matchMap[tx.id];
              const state  = txState[tx.id];
              const dec    = state?.decision ?? null;
              const bookingId = state?.manualBookingId ?? match?.bookingId;
              const booking   = bookingId ? bookings.find(b => b.id === bookingId) : undefined;
              const conf      = match?.confidence ?? 'none';

              return (
                <div key={tx.id}
                  className={`rounded-xl border p-4 transition-all ${
                    dec === 'accept'  ? 'border-emerald-200 bg-emerald-50/60' :
                    dec === 'ignore'  ? 'border-slate-200 bg-slate-50/60 opacity-60' :
                    dec === 'new'     ? 'border-blue-200 bg-blue-50/60' :
                    'border-slate-200 bg-white'
                  }`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    {/* Transaction info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-slate-400 tabular-nums">{fmtDate(tx.date)}</span>
                        <span className={`text-base font-bold tabular-nums ${tx.amount >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                          {tx.amount >= 0 ? '+' : ''}{fmtCHF(tx.amount)} {tx.currency}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-sm text-slate-700">{tx.description}</p>
                      {tx.reference && (
                        <p className="mt-0.5 font-mono text-[10px] text-slate-400 truncate">Ref: {tx.reference}</p>
                      )}
                    </div>

                    {/* Confidence badge + actions */}
                    <div className="flex flex-wrap items-center gap-2">
                      {match && (
                        <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${CONF_STYLE[conf]}`}>
                          {CONF_LABEL[conf]}
                        </span>
                      )}

                      {/* Decision buttons */}
                      <div className="flex items-center gap-1">
                        {(match || state?.manualBookingId) && (
                          <button
                            onClick={() => setDecision(tx.id, dec === 'accept' ? null : 'accept')}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                              dec === 'accept'
                                ? 'bg-emerald-600 text-white'
                                : 'border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                            }`}>
                            Bezahlt markieren
                          </button>
                        )}
                        <button
                          onClick={() => setDecision(tx.id, dec === 'new' ? null : 'new')}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                            dec === 'new'
                              ? 'bg-blue-600 text-white'
                              : 'border border-blue-200 text-blue-700 hover:bg-blue-50'
                          }`}>
                          + Neue Buchung
                        </button>
                        <button
                          onClick={() => setDecision(tx.id, dec === 'ignore' ? null : 'ignore')}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                            dec === 'ignore'
                              ? 'bg-slate-600 text-white'
                              : 'border border-slate-200 text-slate-500 hover:bg-slate-50'
                          }`}>
                          Ignorieren
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Matched booking info */}
                  {booking && (
                    <div className="mt-3 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Zugeordnete Buchung</p>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400 tabular-nums">{fmtDate(booking.date)}</span>
                          <span className="text-sm font-medium text-slate-700 truncate">{booking.description}</span>
                          <span className="text-sm font-bold tabular-nums text-slate-800">{fmtCHF(booking.amount)}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            booking.paymentStatus === 'Bezahlt' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>{booking.paymentStatus}</span>
                        </div>
                      </div>
                      {/* Manual override */}
                      <select
                        value={state?.manualBookingId ?? match?.bookingId ?? ''}
                        onChange={e => {
                          const id = e.target.value;
                          setTxState(prev => ({
                            ...prev,
                            [tx.id]: { ...prev[tx.id], decision: id ? 'accept' : null, manualBookingId: id || undefined },
                          }));
                        }}
                        className="ml-3 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 outline-none focus:border-slate-400"
                      >
                        <option value="">— Buchung ändern —</option>
                        {openBookings.map(b => (
                          <option key={b.id} value={b.id}>
                            {fmtDate(b.date)} · {b.description.slice(0, 30)} · {fmtCHF(b.amount)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* No match: manual select */}
                  {!booking && dec !== 'new' && dec !== 'ignore' && openBookings.length > 0 && (
                    <div className="mt-3">
                      <select
                        value=""
                        onChange={e => {
                          const id = e.target.value;
                          if (id) setDecision(tx.id, 'accept', id);
                        }}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 outline-none focus:border-slate-400"
                      >
                        <option value="">Manuell zuordnen – offene Buchung wählen …</option>
                        {openBookings.map(b => (
                          <option key={b.id} value={b.id}>
                            {fmtDate(b.date)} · {b.description.slice(0, 40)} · {fmtCHF(b.amount)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Bottom action bar ─────────────────────────────────────── */}
          {canApply && (
            <div className="sticky bottom-4 z-20">
              <div className="flex items-center justify-between rounded-2xl bg-slate-900 px-6 py-4 shadow-2xl text-white">
                <div className="text-sm">
                  <span className="font-bold">{stats.accepted}</span> als bezahlt markieren ·{' '}
                  <span className="font-bold">{stats.newBk}</span> neue Buchungen erstellen
                </div>
                <button onClick={handleApply}
                  className="rounded-xl bg-white px-5 py-2 text-sm font-bold text-slate-900 hover:bg-slate-100">
                  Abgleich übernehmen
                </button>
              </div>
            </div>
          )}

          {/* Demo notice */}
          {isDemo && (
            <p className="text-center text-xs text-slate-400">
              Demo-Modus: Änderungen werden im Browser-Speicher gespeichert.
            </p>
          )}
        </>
      )}

      {notification && (
        <NotificationModal
          open
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      {/* ── Open Banking / Direct Connect ──────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Open Banking – Direkte Verbindung</h3>
            <p className="text-xs text-slate-400 mt-0.5">Kontoauszüge automatisch einlesen ohne manuellen Export</p>
          </div>
          <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700">Beta</span>
        </div>
        <div className="p-5 space-y-4">
          {/* Supported banks */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { name: 'PostFinance',     status: isDemo ? 'Verbunden (Demo)' : 'Konfigurieren', connected: isDemo },
              { name: 'Raiffeisen',      status: 'Konfigurieren', connected: false },
              { name: 'ZKB',             status: 'Konfigurieren', connected: false },
              { name: 'UBS',             status: 'In Planung',    connected: false, planned: true },
              { name: 'ZAK (Bank Cler)', status: 'Konfigurieren', connected: false },
              { name: 'Neon',            status: 'In Planung',    connected: false, planned: true },
            ].map(b => (
              <div key={b.name} className={`rounded-xl border p-3 ${b.connected ? 'border-emerald-200 bg-emerald-50' : b.planned ? 'border-slate-100 bg-slate-50' : 'border-slate-200 bg-white'}`}>
                <p className="text-sm font-medium text-slate-800">{b.name}</p>
                <p className={`mt-0.5 text-xs ${b.connected ? 'text-emerald-600' : b.planned ? 'text-slate-400 italic' : 'text-slate-400'}`}>{b.status}</p>
              </div>
            ))}
          </div>

          {/* Sync button (demo) or info (app) */}
          {isDemo ? (
            <div className="flex items-center gap-3">
              <button
                onClick={handleObSync}
                disabled={obSyncing}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                {obSyncing ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Verbinde…
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Jetzt synchronisieren
                  </>
                )}
              </button>
              {obDone && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                Synchronisierung abgeschlossen
              </span>)}
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Konfiguriere deine Bank-API-Verbindung in den <strong>Einstellungen → Integrationen</strong>, um die automatische Synchronisierung zu aktivieren.
            </div>
          )}

          <p className="text-[11px] text-slate-400">
            Open Banking nutzt die offiziellen Bank-APIs (ISO 20022 / PSD2-kompatibel). Deine Zugangsdaten werden verschlüsselt gespeichert und niemals an Dritte weitergegeben.
          </p>
        </div>
      </div>
    </div>
  );
}
