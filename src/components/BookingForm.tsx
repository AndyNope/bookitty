import { useState, useEffect, useRef } from 'react';
import type { BookingDraft, BookingType } from '../types';
import {
  accountCategories,
  accountKey,
  formatAccount,
  getCategoryLabel,
  resolveAccount,
  type Account,
} from '../data/chAccounts';
import AccountCombobox from './AccountCombobox';
import { LoadingIndicator, LoadingLogo } from './LogoLoader';
import NumberInput from './NumberInput';
import { suggestContraAccount, suggestAccount } from '../utils/documentParser';
import { getFavorites, toggleFavorite } from '../utils/favoriteStore';
import { useAccounts } from '../hooks/useAccounts';
import { suggestForDraft, type KittySuggestion } from '../utils/kittySuggester';
import { useForex, toCHF } from '../hooks/useForex';
import { useCurrencySettings } from '../hooks/useCurrencySettings';
import { availableCurrencies } from '../utils/currencies';

const initialDraft: BookingDraft = {
  date: new Date().toISOString().split('T')[0],
  description: '',
  account: '1020 Bankguthaben',
  contraAccount: '2000 VLL Kreditoren',
  category: 'Aktiven',
  amount: 0,
  vatAmount: undefined,
  vatRate: 8.1,
  currency: 'CHF',
  paymentStatus: 'Offen',
  type: 'Ausgabe',
  dueDate: undefined,
};

const addDays = (baseDate: string, days: number) => {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

type BookingFormProps = {
  onSubmit: (draft: BookingDraft) => void;
  onCancel?: () => void;
  initialValues?: Partial<BookingDraft>;
  editMode?: boolean;
  isSaving?: boolean;
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const round1 = (n: number) => Math.round(n * 10) / 10;

const BookingForm = ({ onSubmit, onCancel, initialValues, editMode, isSaving = false }: BookingFormProps) => {
  const merged: BookingDraft = { ...initialDraft, ...initialValues };
  const [draft, setDraft] = useState<BookingDraft>(merged);
  const [rawAmount, setRawAmount] = useState(String(merged.amount ?? 0));
  const [favorites, setFavorites] = useState<string[]>(getFavorites);
  const { accounts, loadError, loading: accountsLoading } = useAccounts();
  const [kittySuggestion, setKittySuggestion] = useState<KittySuggestion | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { rates, rateDates } = useForex();
  const currencySettings = useCurrencySettings();
  const indicativeCHF = toCHF(draft.amount, draft.currency, rates);
  const favoriteFor = (value: string) => favorites.find((favorite) => accountKey(favorite) === accountKey(value));

  // Proactive Kitty feedback – debounced 700 ms after user stops typing
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setKittySuggestion(suggestForDraft(draft));
    }, 700);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.description, draft.account, draft.contraAccount, draft.type, draft.paymentStatus]);

  const updateField = <K extends keyof BookingDraft>(
    key: K,
    value: BookingDraft[K],
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  /** Update type or paymentStatus and re-suggest both Soll and Haben accounts automatically */
  const updateWithContra = (patch: Partial<BookingDraft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      const suggestedAcct = suggestAccount(next.type, next.paymentStatus);
      return {
        ...next,
        account: suggestedAcct ?? next.account,
        contraAccount: suggestContraAccount(next.type, next.paymentStatus),
      };
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isSaving && !accountsLoading) onSubmit({
      ...draft,
      account: resolveAccount(draft.account, accounts),
      contraAccount: resolveAccount(draft.contraAccount, accounts),
    });
  };

  const vatLabel = draft.currency === 'CHF' ? 'MwSt.' : 'USt.';

  // Contra account helper text shown beneath the field
  const contraHint =
    draft.type === 'Ausgabe'
      ? draft.paymentStatus === 'Bezahlt'
        ? 'Soll: Aufwandskonto / Haben: Bank'
        : 'Soll: Aufwandskonto / Haben: Kreditoren'
      : draft.paymentStatus === 'Bezahlt'
        ? 'Soll: Bank / Haben: Erlöskonto'
        : 'Soll: Debitoren / Haben: Erlöskonto';

  return (
    <form
      onSubmit={handleSubmit}
      className="flex max-h-[85dvh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <h3 className="text-lg font-semibold text-slate-900">
          {editMode ? 'Buchung bearbeiten' : 'Neue Buchung erfassen'}
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-4">
      {accountsLoading && <div className="mb-4"><LoadingIndicator text="Konten werden geladen…" size="small" /></div>}
      {currencySettings.error && <p role="alert" className="mb-4 text-sm text-rose-700">{currencySettings.error}</p>}
      {loadError && <p role="alert" className="mb-4 text-sm text-rose-700">{loadError}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm text-slate-600">
          Datum
          <input
            type="date"
            value={draft.date}
            onChange={(event) => updateField('date', event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            required
          />
        </label>
        <label className="text-sm text-slate-600">
          Beschreibung
          <input
            type="text"
            value={draft.description}
            onChange={(event) => updateField('description', event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            placeholder="z.B. Beratung Februar"
            required
          />
        </label>
        <div className="flex flex-col gap-1 text-sm text-slate-600">
          <div className="flex items-center justify-between">
            <span>Konto (Soll)</span>
            <button
              type="button"
              onClick={() => setFavorites(toggleFavorite(favoriteFor(draft.account) ?? resolveAccount(draft.account, accounts)))}
              title={favoriteFor(draft.account) ? 'Aus Stammkonten entfernen' : 'Als Stammkonto merken'}
              className="text-amber-400 hover:text-amber-500 transition"
            >
              {favoriteFor(draft.account) ? (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd"/></svg>
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"/></svg>
              )}
            </button>
          </div>
          {favorites.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {favorites.map((fav) => (
                <button
                  key={fav}
                  type="button"
                  title={resolveAccount(fav, accounts)}
                  onClick={() => {
                    const sel = accounts.find((a) => a.code === accountKey(fav));
                    updateField('account', resolveAccount(fav, accounts));
                    if (sel) updateField('category', getCategoryLabel(sel.categoryCode));
                  }}
                  className={`rounded-full border px-2 py-0.5 text-xs transition ${
                    accountKey(draft.account) === accountKey(fav)
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 text-slate-600 hover:border-slate-400'
                  }`}
                >
                  {resolveAccount(fav, accounts).slice(0, 20)}
                </button>
              ))}
            </div>
          )}
          <AccountCombobox
            value={draft.account}
            accounts={accounts}
            required
            warnIfClosing
            onChange={(formatted, selected?: Account) => {
              updateField('account', formatted);
              if (selected) updateField('category', getCategoryLabel(selected.categoryCode));
            }}
          />
        </div>
        <div className="flex flex-col gap-1 text-sm text-slate-600">
          <div className="flex items-center justify-between">
            <span>Gegenkonto (Haben)</span>
            <button
              type="button"
              onClick={() => setFavorites(toggleFavorite(favoriteFor(draft.contraAccount) ?? resolveAccount(draft.contraAccount, accounts)))}
              title={favoriteFor(draft.contraAccount) ? 'Aus Stammkonten entfernen' : 'Als Stammkonto merken'}
              className="text-amber-400 hover:text-amber-500 transition"
            >
              {favoriteFor(draft.contraAccount) ? (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd"/></svg>
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"/></svg>
              )}
            </button>
          </div>
          {favorites.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {favorites.map((fav) => (
                <button
                  key={fav}
                  type="button"
                  title={resolveAccount(fav, accounts)}
                  onClick={() => updateField('contraAccount', resolveAccount(fav, accounts))}
                  className={`rounded-full border px-2 py-0.5 text-xs transition ${
                    accountKey(draft.contraAccount) === accountKey(fav)
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 text-slate-600 hover:border-slate-400'
                  }`}
                >
                  {resolveAccount(fav, accounts).slice(0, 20)}
                </button>
              ))}
            </div>
          )}
          <AccountCombobox
            value={draft.contraAccount}
            accounts={accounts}
            warnIfClosing
            onChange={(formatted) => updateField('contraAccount', formatted)}
          />
          <span className="text-xs text-slate-400">{contraHint}</span>
        </div>
        <label className="text-sm text-slate-600">
          Kategorie
          <select
            value={draft.category}
            onChange={(event) => updateField('category', event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            required
          >
            {accountCategories.map((category) => (
              <option key={category.code} value={category.name}>
                {category.code} {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-600">
          Typ
          <select
            value={draft.type}
            onChange={(event) =>
              updateWithContra({ type: event.target.value as BookingType })
            }
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          >
            <option value="Einnahme">Einnahme</option>
            <option value="Ausgabe">Ausgabe</option>
          </select>
        </label>
        <label className="text-sm text-slate-600">
          Betrag
          <input
            type="text"
            inputMode="decimal"
            value={rawAmount}
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              const raw = e.target.value;
              // Allow digits, decimal separators, empty string
              if (!/^[0-9]*[.,]?[0-9]*$/.test(raw) && raw !== '') return;
              setRawAmount(raw);
              const num = parseFloat(raw.replace(',', '.')) || 0;
              setDraft((prev) => ({
                ...prev,
                amount: num,
                vatAmount: prev.vatRate > 0 ? round2(num * prev.vatRate / 100) : prev.vatAmount,
              }));
            }}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            placeholder="0.00"
            required
          />
          {draft.currency !== 'CHF' && draft.amount > 0 && (
            <span className="mt-1 block text-xs text-slate-400">
              {indicativeCHF === null ? 'Kein Referenzkurs verfügbar.' : `≈ CHF ${indicativeCHF.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · Referenzkurs ${rateDates[draft.currency] ?? ''}`}
            </span>
          )}
        </label>
        <label className="text-sm text-slate-600">
          {vatLabel} (%)
          <div className="mt-1 flex items-center rounded-lg border border-slate-200 px-3 py-2">
            <NumberInput
              step="0.1"
              min="0"
              value={draft.vatRate}
              onFocus={(e) => e.target.select()}
              onValueChange={(rate) => {
                setDraft((prev) => ({
                  ...prev,
                  vatRate: rate,
                  vatAmount: prev.amount > 0 ? round2(prev.amount * rate / 100) : prev.vatAmount,
                }));
              }}
              className="w-full bg-transparent outline-none"
            />
            <span className="text-sm text-slate-400">%</span>
          </div>
        </label>
        <label className="text-sm text-slate-600">
          Währung
          <select
            value={draft.currency}
            onChange={(event) => {
              const nextCurrency = event.target.value;
              updateField('currency', nextCurrency);
            }}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          >
            {availableCurrencies(currencySettings.enabled, draft.currency).map((currency) => <option key={currency} value={currency}>{currency}</option>)}
          </select>
        </label>
        <label className="text-sm text-slate-600">
          Zahlungsstatus
          <select
            value={draft.paymentStatus}
            onChange={(event) =>
              updateWithContra({ paymentStatus: event.target.value as BookingDraft['paymentStatus'] })
            }
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          >
            <option value="Offen">Offen</option>
            <option value="Bezahlt">Bezahlt</option>
          </select>
        </label>
        {draft.paymentStatus === 'Offen' && (
          <div className="flex flex-col gap-1 text-sm text-slate-600 md:col-span-2">
            <span>Zahlungsfälligkeit</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={draft.dueDate ?? ''}
                onChange={(e) => updateField('dueDate', e.target.value || undefined)}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2"
              />
              {([30, 60, 90] as const).map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => updateField('dueDate', addDays(draft.date, days))}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50 whitespace-nowrap"
                >
                  +{days}T
                </button>
              ))}
            </div>
            <span className="text-xs text-slate-400">Frist für Zahlung (z.B. netto 30 Tage)</span>
          </div>
        )}
        <label className="text-sm text-slate-600">
          {vatLabel} Betrag
          <input
            type="number"
            step="0.01"
            min="0"
            value={draft.vatAmount ?? ''}
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              const vatAmt = e.target.value ? parseFloat(e.target.value) : undefined;
              setDraft((prev) => ({
                ...prev,
                vatAmount: vatAmt,
                vatRate: vatAmt !== undefined && prev.amount > 0
                  ? round1(vatAmt / prev.amount * 100)
                  : prev.vatRate,
              }));
            }}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            placeholder="z.B. 13.40"
          />
        </label>
      </div>
      {/* ── Kitty-Hinweis ────────────────────────────────────────────────── */}
      {kittySuggestion && (
        <div className={`mt-4 flex flex-col gap-2 rounded-xl border px-4 py-3 text-sm ${
          kittySuggestion.confidence === 'high'
            ? 'border-amber-200 bg-amber-50'
            : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-start gap-2">
              <p className="leading-snug text-slate-700">
              {kittySuggestion.message.split(/\*\*([^*]+)\*\*/g).map((part, i) =>
                i % 2 === 1 ? <strong key={i}>{part}</strong> : part
              )}
            </p>
          </div>
          {(kittySuggestion.suggestedAccount || kittySuggestion.suggestedContraAccount) && (
            <div className="flex flex-wrap gap-2">
              {kittySuggestion.suggestedAccount && (
                <button
                  type="button"
                  onClick={() => {
                    const acct = accounts.find((a) => formatAccount(a).startsWith(kittySuggestion.suggestedAccount!.split(' ')[0]));
                    setDraft((prev) => ({
                      ...prev,
                      account: kittySuggestion.suggestedAccount!,
                      ...(acct ? { category: getCategoryLabel(acct.categoryCode) } : {}),
                    }));
                    setKittySuggestion(null);
                  }}
                  className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
                >
                  Soll → {kittySuggestion.suggestedAccount} übernehmen
                </button>
              )}
              {kittySuggestion.suggestedContraAccount && (
                <button
                  type="button"
                  onClick={() => {
                    setDraft((prev) => ({ ...prev, contraAccount: kittySuggestion.suggestedContraAccount! }));
                    setKittySuggestion(null);
                  }}
                  className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
                >
                  Haben → {kittySuggestion.suggestedContraAccount} übernehmen
                </button>
              )}
              <button
                type="button"
                onClick={() => setKittySuggestion(null)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100"
              >
                Ignorieren
              </button>
            </div>
          )}
        </div>
      )}
      </div>{/* end overflow-y-auto */}
      <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Abbrechen
          </button>
        ) : null}
        <button
          type="submit"
          disabled={isSaving || accountsLoading}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
        >
          {isSaving && <LoadingLogo />}
          {editMode ? 'Änderungen speichern' : 'Buchung speichern'}
        </button>
      </div>
    </form>
  );
};

export default BookingForm;
