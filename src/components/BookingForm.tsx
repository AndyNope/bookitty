import { useState } from 'react';
import type { BookingDraft, BookingType } from '../types';
import {
  accounts,
  accountCategories,
  formatAccount,
  getCategoryLabel,
} from '../data/chAccounts';

const initialDraft: BookingDraft = {
  date: new Date().toISOString().split('T')[0],
  description: '',
  account: formatAccount(accounts[0]),
  category: getCategoryLabel(accounts[0].categoryCode),
  amount: 0,
  vatAmount: undefined,
  vatRate: 19,
  currency: 'CHF',
  paymentStatus: 'Offen',
  type: 'Ausgabe',
};

type BookingFormProps = {
  onSubmit: (draft: BookingDraft) => void;
  onCancel?: () => void;
};

const BookingForm = ({ onSubmit, onCancel }: BookingFormProps) => {
  const [draft, setDraft] = useState<BookingDraft>(initialDraft);

  const updateField = <K extends keyof BookingDraft>(
    key: K,
    value: BookingDraft[K],
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(draft);
    setDraft(initialDraft);
  };

  const vatLabel = draft.currency === 'CHF' ? 'MwSt.' : 'USt.';

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
        <label className="text-sm text-slate-600">
          Konto
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
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            required
          >
            {accounts.map((account) => (
              <option key={account.code} value={formatAccount(account)}>
                {formatAccount(account)}
              </option>
            ))}
          </select>
        </label>
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
          Betrag (EUR)
          <input
            type="number"
            step="0.01"
            value={draft.amount}
            onChange={(event) =>
              updateField('amount', Number(event.target.value))
            }
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            required
          />
        </label>
        <label className="text-sm text-slate-600">
          {vatLabel} (%)
          <div className="mt-1 flex items-center rounded-lg border border-slate-200 px-3 py-2">
            <input
              type="number"
              step="0.1"
              value={draft.vatRate}
              onChange={(event) =>
                updateField('vatRate', Number(event.target.value))
              }
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
              updateField('paymentStatus', event.target.value as BookingDraft['paymentStatus'])
            }
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          >
            <option value="Offen">Offen</option>
            <option value="Bezahlt">Bezahlt</option>
          </select>
        </label>
        <label className="text-sm text-slate-600">
          USt Betrag (EUR)
          <input
            type="number"
            step="0.01"
            value={draft.vatAmount ?? ''}
            onChange={(event) =>
              updateField(
                'vatAmount',
                event.target.value ? Number(event.target.value) : undefined,
              )
            }
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            placeholder="z.B. 35,53"
          />
        </label>
        <label className="text-sm text-slate-600">
          Typ
          <select
            value={draft.type}
            onChange={(event) =>
              updateField('type', event.target.value as BookingType)
            }
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          >
            <option value="Einnahme">Einnahme</option>
            <option value="Ausgabe">Ausgabe</option>
          </select>
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
