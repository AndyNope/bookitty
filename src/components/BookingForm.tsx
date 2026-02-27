import { useState } from 'react';
import type { BookingDraft, BookingType } from '../types';
import {
  accounts,
  accountCategories,
  formatAccount,
  getCategoryLabel,
} from '../data/chAccounts';
import { suggestContraAccount, suggestAccount } from '../utils/documentParser';
import { getFavorites, toggleFavorite } from '../utils/favoriteStore';

const initialDraft: BookingDraft = {
  date: new Date().toISOString().split('T')[0],
  description: '',
  account: formatAccount(accounts[0]),
  contraAccount: '2000 VLL Kreditoren',
  category: getCategoryLabel(accounts[0].categoryCode),
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
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const round1 = (n: number) => Math.round(n * 10) / 10;

const BookingForm = ({ onSubmit, onCancel, initialValues }: BookingFormProps) => {
  const merged: BookingDraft = { ...initialDraft, ...initialValues };
  const [draft, setDraft] = useState<BookingDraft>(merged);
  const [rawAmount, setRawAmount] = useState(String(merged.amount ?? 0));
  const [favorites, setFavorites] = useState<string[]>(getFavorites);

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
    onSubmit(draft);
    setDraft(initialDraft);
    setRawAmount('0');
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
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h3 className="text-lg font-semibold text-slate-900">
        Neue Buchung erfassen
      </h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
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
              onClick={() => setFavorites(toggleFavorite(draft.account))}
              title={favorites.includes(draft.account) ? 'Aus Stammkonten entfernen' : 'Als Stammkonto merken'}
              className="text-base leading-none text-amber-400 hover:text-amber-500 transition"
            >
              {favorites.includes(draft.account) ? '★' : '☆'}
            </button>
          </div>
          {favorites.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {favorites.map((fav) => (
                <button
                  key={fav}
                  type="button"
                  title={fav}
                  onClick={() => {
                    const sel = accounts.find((a) => formatAccount(a) === fav);
                    updateField('account', fav);
                    if (sel) updateField('category', getCategoryLabel(sel.categoryCode));
                  }}
                  className={`rounded-full border px-2 py-0.5 text-xs transition ${
                    draft.account === fav
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 text-slate-600 hover:border-slate-400'
                  }`}
                >
                  {fav.slice(0, 20)}
                </button>
              ))}
            </div>
          )}
          <select
            value={draft.account}
            onChange={(event) => {
              const selected = accounts.find(
                (account) => formatAccount(account) === event.target.value,
              );
              updateField('account', event.target.value);
              if (selected) {
                updateField('category', getCategoryLabel(selected.categoryCode));
              }
            }}
            className="w-full rounded-lg border border-slate-200 px-3 py-2"
            required
          >
            {accounts.map((account) => (
              <option key={account.code} value={formatAccount(account)}>
                {formatAccount(account)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1 text-sm text-slate-600">
          <div className="flex items-center justify-between">
            <span>Gegenkonto (Haben)</span>
            <button
              type="button"
              onClick={() => setFavorites(toggleFavorite(draft.contraAccount))}
              title={favorites.includes(draft.contraAccount) ? 'Aus Stammkonten entfernen' : 'Als Stammkonto merken'}
              className="text-base leading-none text-amber-400 hover:text-amber-500 transition"
            >
              {favorites.includes(draft.contraAccount) ? '★' : '☆'}
            </button>
          </div>
          {favorites.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {favorites.map((fav) => (
                <button
                  key={fav}
                  type="button"
                  title={fav}
                  onClick={() => updateField('contraAccount', fav)}
                  className={`rounded-full border px-2 py-0.5 text-xs transition ${
                    draft.contraAccount === fav
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 text-slate-600 hover:border-slate-400'
                  }`}
                >
                  {fav.slice(0, 20)}
                </button>
              ))}
            </div>
          )}
          <select
            value={draft.contraAccount}
            onChange={(event) => updateField('contraAccount', event.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2"
          >
            {accounts.map((account) => (
              <option key={account.code} value={formatAccount(account)}>
                {formatAccount(account)}
              </option>
            ))}
          </select>
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
        </label>
        <label className="text-sm text-slate-600">
          {vatLabel} (%)
          <div className="mt-1 flex items-center rounded-lg border border-slate-200 px-3 py-2">
            <input
              type="number"
              step="0.1"
              min="0"
              value={draft.vatRate}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const rate = parseFloat(e.target.value) || 0;
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
              if (draft.vatRate === 0) {
                updateField('vatRate', nextCurrency === 'CHF' ? 7.7 : nextCurrency === 'EUR' ? 19 : 0);
              }
            }}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          >
            <option value="EUR">EUR</option>
            <option value="CHF">CHF</option>
            <option value="USD">USD</option>
            <option value="GBP">GBP</option>
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
      <div className="mt-6 flex justify-end gap-3">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Abbrechen
          </button>
        ) : null}
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Buchung speichern
        </button>
      </div>
    </form>
  );
};

export default BookingForm;
