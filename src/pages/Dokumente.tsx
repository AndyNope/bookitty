import { useState } from 'react';
import SectionHeader from '../components/SectionHeader';
import { useBookkeeping } from '../store/BookkeepingContext';
import type { BookingDraft } from '../types';
import { processDocument } from '../utils/documentProcessing';
import { addTemplate } from '../utils/templateStore';
import {
  accounts,
  accountCategories,
  formatAccount,
  getCategoryLabel,
} from '../data/chAccounts';

const Dokumente = () => {
  const {
    documents,
    addDocument,
    updateDocumentDraft,
    confirmDocument,
    removeDocument,
  } = useBookkeeping();
  const [selectedId, setSelectedId] = useState<string | null>(
    documents[0]?.id ?? null,
  );
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedDocument = documents.find((doc) => doc.id === selectedId);
  const pendingDeleteDocument = documents.find(
    (doc) => doc.id === pendingDeleteId,
  );

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      const { draft, detection, templateApplied } = await processDocument(file);
      addDocument(file, draft, detection, templateApplied);
    } catch {
      addDocument(file);
    } finally {
      setIsProcessing(false);
    }

    event.target.value = '';
  };

  const updateDraft = (patch: Partial<BookingDraft>) => {
    if (!selectedDocument) return;
    updateDocumentDraft(selectedDocument.id, {
      ...selectedDocument.draft,
      ...patch,
    });
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Dokumenten-Import"
        subtitle={`PDF- oder Bildbelege automatisch erkennen und als Buchung vorbereiten (OCR & QR-Scan).${
          isProcessing ? ' Erkennung läuft…' : ''
        }`}
        action={
          <label className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold text-white ${
            isProcessing ? 'bg-slate-400' : 'bg-slate-900 hover:bg-slate-800'
          }`}>
            {isProcessing ? 'Erkennung…' : 'Beleg hochladen'}
            <input
              type="file"
              className="hidden"
              accept="application/pdf,image/*"
              onChange={handleFileChange}
              disabled={isProcessing}
            />
          </label>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Eingehende Belege</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className={`cursor-pointer rounded-xl border px-4 py-3 transition ${
                  doc.id === selectedId
                    ? 'border-slate-900 bg-slate-50'
                    : 'border-slate-100 hover:bg-slate-50'
                }`}
                onClick={() => setSelectedId(doc.id)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-900">{doc.fileName}</p>
                    <p className="text-xs text-slate-500">
                      {doc.uploadedAt} · Erkennung {doc.detection ?? (doc.fileName.endsWith('.pdf') ? 'PDF' : 'Standard')}
                      {doc.templateApplied ? ' · Vorlage' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        doc.status === 'Gebucht'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {doc.status}
                    </span>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (doc.status === 'Gebucht') {
                          setPendingDeleteId(doc.id);
                        } else {
                          removeDocument(doc.id);
                          if (selectedId === doc.id) {
                            setSelectedId(documents[0]?.id ?? null);
                          }
                        }
                      }}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                    >
                      Entfernen
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            Automatisch erkannte Buchung
          </h3>
          {selectedDocument ? (
            <div className="mt-4 space-y-4 text-sm text-slate-600">
              <div className="grid gap-4 md:grid-cols-2">
                <label>
                  Datum
                  <input
                    type="date"
                    value={selectedDocument.draft.date}
                    onChange={(event) =>
                      updateDraft({ date: event.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  />
                </label>
                <label>
                  Beschreibung
                  <input
                    type="text"
                    value={selectedDocument.draft.description}
                    onChange={(event) =>
                      updateDraft({ description: event.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  />
                </label>
                <label>
                  Konto
                  <select
                    value={selectedDocument.draft.account}
                    onChange={(event) => {
                      const selected = accounts.find(
                        (account) => formatAccount(account) === event.target.value,
                      );
                      updateDraft({ account: event.target.value });
                      if (selected) {
                        updateDraft({
                          category: getCategoryLabel(selected.categoryCode),
                        });
                      }
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  >
                    {accounts.map((account) => (
                      <option key={account.code} value={formatAccount(account)}>
                        {formatAccount(account)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Kategorie
                  <select
                    value={selectedDocument.draft.category}
                    onChange={(event) => updateDraft({ category: event.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  >
                    {accountCategories.map((category) => (
                      <option key={category.code} value={category.name}>
                        {category.code} {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Betrag
                  <input
                    type="number"
                    step="0.01"
                    value={selectedDocument.draft.amount}
                    onChange={(event) =>
                      updateDraft({ amount: Number(event.target.value) })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  />
                </label>
                <label>
                  {selectedDocument.draft.currency === 'CHF'
                    ? 'MwSt.'
                    : 'USt.'}
                  <div className="mt-1 flex items-center rounded-lg border border-slate-200 px-3 py-2">
                    <input
                      type="number"
                      step="0.1"
                      value={selectedDocument.draft.vatRate}
                      onChange={(event) =>
                        updateDraft({ vatRate: Number(event.target.value) })
                      }
                      className="w-full bg-transparent outline-none"
                    />
                    <span className="text-sm text-slate-400">%</span>
                  </div>
                </label>
                <label>
                  USt Betrag
                  <input
                    type="number"
                    step="0.01"
                    value={selectedDocument.draft.vatAmount ?? ''}
                    onChange={(event) =>
                      updateDraft({
                        vatAmount: event.target.value
                          ? Number(event.target.value)
                          : undefined,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  />
                </label>
                <label>
                  Typ
                  <select
                    value={selectedDocument.draft.type}
                    onChange={(event) =>
                      updateDraft({
                        type: event.target.value as BookingDraft['type'],
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  >
                    <option value="Einnahme">Einnahme</option>
                    <option value="Ausgabe">Ausgabe</option>
                  </select>
                </label>
                <label>
                  Währung
                  <select
                    value={selectedDocument.draft.currency}
                    onChange={(event) =>
                      updateDraft({
                        currency: event.target.value,
                        vatRate:
                          selectedDocument.draft.vatRate === 0
                            ? event.target.value === 'CHF'
                              ? 7.7
                              : event.target.value === 'EUR'
                                ? 19
                                : 0
                            : selectedDocument.draft.vatRate,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  >
                    <option value="EUR">EUR</option>
                    <option value="CHF">CHF</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                  </select>
                </label>
                <label>
                  Zahlungsstatus
                  <select
                    value={selectedDocument.draft.paymentStatus}
                    onChange={(event) =>
                      updateDraft({
                        paymentStatus: event.target.value as BookingDraft['paymentStatus'],
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  >
                    <option value="Offen">Offen</option>
                    <option value="Bezahlt">Bezahlt</option>
                  </select>
                </label>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-xs text-slate-500">Belegvorschau</p>
                  <p className="text-sm text-slate-700">
                    {selectedDocument.fileName}
                  </p>
                </div>
                {selectedDocument.previewUrl ? (
                  <a
                    href={selectedDocument.previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-slate-900"
                  >
                    Öffnen
                  </a>
                ) : null}
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const pattern = selectedDocument.fileName
                      .replace(/\.[^/.]+$/, '')
                      .slice(0, 24)
                      .toLowerCase();
                    addTemplate(pattern, selectedDocument.draft);
                  }}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Als Vorlage speichern
                </button>
                <button
                  type="button"
                  onClick={() => confirmDocument(selectedDocument.id)}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Buchung bestätigen
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              Noch keine Belege hochgeladen.
            </p>
          )}
        </div>
      </div>

      {pendingDeleteDocument ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-900">
              Gebuchte Buchung entfernen?
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Dieser Beleg ist bereits als "Gebucht" markiert. Das Entfernen
              löscht den Beleg aus der Liste. Bitte bestätigen Sie, wenn Sie
              fortfahren möchten.
            </p>
            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p className="font-medium text-slate-900">
                {pendingDeleteDocument.fileName}
              </p>
              <p>{pendingDeleteDocument.uploadedAt}</p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingDeleteId(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => {
                  removeDocument(pendingDeleteDocument.id);
                  if (selectedId === pendingDeleteDocument.id) {
                    setSelectedId(documents[0]?.id ?? null);
                  }
                  setPendingDeleteId(null);
                }}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
              >
                Entfernen bestätigen
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Dokumente;
