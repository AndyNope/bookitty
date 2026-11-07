import { useState, useEffect, useRef } from 'react';
import type { Account } from '../data/chAccounts';
import { accountKey, formatAccount } from '../data/chAccounts';

type Props = {
  value: string;
  accounts: Account[];
  onChange: (formatted: string, account?: Account) => void;
  required?: boolean;
  warnIfClosing?: boolean;
};

/** Account codes in category 9 (Abschluss) – warn when selected as regular account */
const isClosingAccount = (a: Account) => a.categoryCode === '9';

const MAX_RESULTS = 60;

const AccountCombobox = ({ value, accounts, onChange, required, warnIfClosing }: Props) => {
  const accountCode = accountKey(value);
  const currentAccount = accounts.find((account) => account.code === accountCode);
  const displayValue = currentAccount ? formatAccount(currentAccount) : value;
  const [query, setQuery] = useState(displayValue);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [filtered, setFiltered] = useState<Account[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Debounced filter — 150 ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const q = query.trim().toLowerCase();
      const results = q.length === 0
        ? accounts.slice(0, MAX_RESULTS)
        : accounts
            .filter(
              (a) =>
                a.code.startsWith(q) ||
                a.name.toLowerCase().includes(q) ||
                formatAccount(a).toLowerCase().includes(q),
            )
            .slice(0, MAX_RESULTS);
      setFiltered(results);
      setActiveIdx(-1);
    }, 150);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, accounts]);

  // Close on outside click; restore value if no valid match
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        const match = accounts.find((a) => formatAccount(a) === query);
        if (!match) setQuery(displayValue);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [accounts, query, displayValue]);

  const selectAccount = (account: Account) => {
    const formatted = formatAccount(account);
    setQuery(formatted);
    setOpen(false);
    onChange(formatted, account);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) { setOpen(true); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      selectAccount(filtered[activeIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery(displayValue);
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (activeIdx >= 0 && listRef.current) {
      const el = listRef.current.children[activeIdx] as HTMLElement | undefined;
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIdx]);

  const selectedAccount = currentAccount ?? accounts.find((a) => formatAccount(a) === value);
  const showClosingWarning = warnIfClosing && selectedAccount && isClosingAccount(selectedAccount);

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
        required={required}
        value={open ? query : displayValue}
        placeholder="Konto suchen…"
        onFocus={() => { setQuery(''); setOpen(true); }}
        onBlur={(event) => {
          if (!containerRef.current?.contains(event.relatedTarget)) {
            setOpen(false);
            setQuery(displayValue);
          }
        }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onKeyDown={handleKeyDown}
        className={`w-full rounded-lg border px-3 py-2 pr-9 text-sm ${
          showClosingWarning ? 'border-amber-400 bg-amber-50' : 'border-slate-200'
        }`}
      />
      <button
        type="button"
        aria-label="Konten auswählen"
        title="Konten auswählen"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          if (open) { setOpen(false); setQuery(displayValue); }
          else { inputRef.current?.focus(); setQuery(''); setOpen(true); }
        }}
        className="absolute right-2 top-5 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-100"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {showClosingWarning && (
        <p className="mt-0.5 text-[11px] text-amber-600">
          Abschlusskonto — nur für Jahresabschluss verwenden
        </p>
      )}
      {open && filtered.length > 0 && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg text-sm"
        >
          {filtered.map((account, i) => (
            <li
              key={account.code}
              role="option"
              aria-selected={i === activeIdx}
              onMouseDown={(e) => { e.preventDefault(); selectAccount(account); }}
              className={`flex cursor-pointer items-center gap-2 px-3 py-2 ${
                i === activeIdx ? 'bg-slate-100' : 'hover:bg-slate-50'
              } ${isClosingAccount(account) ? 'text-amber-600' : ''}`}
            >
              <span className="w-12 shrink-0 font-mono text-xs text-slate-400">{account.code}</span>
              <span className="truncate">{account.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AccountCombobox;
